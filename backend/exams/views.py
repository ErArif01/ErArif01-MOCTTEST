import csv, io, logging, random, secrets
from datetime import timedelta

from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from .emailer import send_otp_email
from .importer import import_rows
from .models import Attempt, EmailOTP, Question, Subject, Test

LETTERS = ("A", "B", "C", "D")
log = logging.getLogger(__name__)


def err(msg, code=400):
    return Response({"error": msg}, status=code)


def user_json(u):
    return {"id": u.id, "email": u.email, "name": u.first_name, "is_staff": u.is_staff}


def clean_email(request):
    email = str(request.data.get("email", "")).strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        return None
    return email


# ------------------------------------------------------------------ auth
@api_view(["POST"])
@permission_classes([AllowAny])
def send_otp(request):
    email = clean_email(request)
    if not email:
        return err("Enter a valid email address.")
    if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
        return err("This email is already registered. Please log in.")
    last = EmailOTP.objects.filter(email=email).order_by("-created_at").first()
    if last and timezone.now() - last.created_at < timedelta(seconds=60):
        return err("Please wait 60 seconds before requesting another OTP.", 429)
    code = f"{secrets.randbelow(10**6):06d}"
    otp = EmailOTP.objects.create(email=email, code_hash=make_password(code))
    try:
        send_otp_email(email, code)
    except Exception:
        log.exception("OTP email could not be sent")
        otp.delete()
        return err("Could not send the OTP email right now. Please try again later.", 500)
    return Response({"message": "OTP sent to your email."})


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    email = clean_email(request)
    name = str(request.data.get("name", "")).strip()
    password = str(request.data.get("password", ""))
    code = str(request.data.get("otp", "")).strip()
    if not email or not name:
        return err("Name and a valid email are required.")
    if len(password) < 8:
        return err("Password must be at least 8 characters.")
    if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
        return err("This email is already registered.")
    otp = EmailOTP.objects.filter(email=email, used=False).order_by("-created_at").first()
    if not otp or timezone.now() - otp.created_at > timedelta(minutes=10):
        return err("OTP expired. Request a new one.")
    if otp.attempts >= 5:
        return err("Too many wrong attempts. Request a new OTP.")
    if not check_password(code, otp.code_hash):
        otp.attempts += 1
        otp.save()
        return err("Wrong OTP.")
    otp.used = True
    otp.save()
    user = User.objects.create_user(username=email, email=email, password=password, first_name=name)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": user_json(user)})


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    ident = str(request.data.get("email", "")).strip()
    password = str(request.data.get("password", ""))
    user = authenticate(username=ident.lower(), password=password) or authenticate(username=ident, password=password)
    if not user:
        for u in User.objects.filter(email__iexact=ident):
            user = authenticate(username=u.username, password=password)
            if user:
                break
    if not user:
        return err("Wrong email/username or password.", 401)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": user_json(user)})

@api_view(["GET"])
def me(request):
    return Response(user_json(request.user))


# ------------------------------------------------------------------ tests
def test_json(t):
    return {"id": t.id, "name": t.name, "description": t.description, "duration_minutes": t.duration_minutes,
            "total_questions": t.total_questions, "total_marks": t.total_marks,
            "marks_per_question": t.marks_per_question, "negative_marks": t.negative_marks,
            "instructions": t.instructions,
            "sections": [{"subject": s.subject.name, "count": s.num_questions} for s in t.sections.all()]}


@api_view(["GET"])
def tests(request):
    qs = Test.objects.filter(is_active=True).order_by("-created_at")
    return Response([test_json(t) for t in qs])


@api_view(["GET"])
def test_detail(request, pk):
    return Response(test_json(get_object_or_404(Test, pk=pk, is_active=True)))


def attempt_payload(att):
    qs = Question.objects.select_related("subject").in_bulk(att.question_ids)
    items = []
    for qid in att.question_ids:
        q = qs[qid]
        items.append({"id": q.id, "text": q.text, "section": q.subject.name,
                      "options": [q.option_a, q.option_b, q.option_c, q.option_d]})
    left = max(0, int((att.ends_at - timezone.now()).total_seconds()))
    return {"attempt_id": att.id, "test": test_json(att.test), "questions": items,
            "answers": att.answers, "remaining_seconds": left}


def finalize(att, answers=None):
    if att.submitted_at:
        return att
    now = timezone.now()
    if answers is not None and now <= att.ends_at + timedelta(seconds=20):
        valid = {str(i) for i in att.question_ids}
        att.answers = {str(k): v for k, v in dict(answers).items() if str(k) in valid and v in LETTERS}
    qs = Question.objects.in_bulk(att.question_ids)
    c = w = 0
    for qid in att.question_ids:
        a = att.answers.get(str(qid))
        if not a:
            continue
        if a == qs[qid].correct:
            c += 1
        else:
            w += 1
    att.correct, att.incorrect = c, w
    att.unattempted = len(att.question_ids) - c - w
    att.score = round(c * att.marks_per_question - w * att.negative_marks, 2)
    att.submitted_at = min(now, att.ends_at)
    att.save()
    return att


@api_view(["POST"])
def start(request, pk):
    test = get_object_or_404(Test, pk=pk, is_active=True)
    att = Attempt.objects.filter(user=request.user, test=test, submitted_at__isnull=True).first()
    if att and timezone.now() >= att.ends_at:
        finalize(att)
        att = None
    if not att:
        ids = []
        for s in test.sections.select_related("subject"):
            pool = list(Question.objects.filter(subject=s.subject).values_list("id", flat=True))
            if len(pool) < s.num_questions:
                return err(f"Not enough '{s.subject.name}' questions in the bank "
                           f"(need {s.num_questions}, have {len(pool)}). Contact the admin.")
            ids += random.sample(pool, s.num_questions)
        if not ids:
            return err("This test has no sections configured yet.")
        att = Attempt.objects.create(user=request.user, test=test, duration_minutes=test.duration_minutes,
                                     marks_per_question=test.marks_per_question,
                                     negative_marks=test.negative_marks, question_ids=ids)
    return Response(attempt_payload(att))


@api_view(["POST"])
def save(request, pk):
    att = get_object_or_404(Attempt, pk=pk, user=request.user)
    if att.submitted_at or timezone.now() > att.ends_at + timedelta(seconds=20):
        return err("Attempt is closed.")
    valid = {str(i) for i in att.question_ids}
    att.answers = {str(k): v for k, v in dict(request.data.get("answers", {})).items()
                   if str(k) in valid and v in LETTERS}
    att.save(update_fields=["answers"])
    return Response({"ok": True})


@api_view(["POST"])
def submit(request, pk):
    att = get_object_or_404(Attempt, pk=pk, user=request.user)
    finalize(att, request.data.get("answers"))
    return Response({"attempt_id": att.id})


@api_view(["GET"])
def history(request):
    out = []
    for a in Attempt.objects.filter(user=request.user).select_related("test").order_by("-started_at")[:50]:
        if not a.submitted_at and timezone.now() >= a.ends_at:
            finalize(a)
        total = len(a.question_ids) * a.marks_per_question
        out.append({"id": a.id, "test": a.test.name, "started_at": a.started_at, "submitted": bool(a.submitted_at),
                    "score": a.score, "total_marks": round(total, 2),
                    "percentage": round((a.score or 0) / total * 100, 2) if a.submitted_at and total else None,
                    "test_id": a.test_id})
    return Response(out)


@api_view(["GET"])
def result(request, pk):
    att = get_object_or_404(Attempt, pk=pk, user=request.user)
    if not att.submitted_at:
        if timezone.now() >= att.ends_at:
            finalize(att)
        else:
            return err("This test is still in progress.")
    qs = Question.objects.select_related("subject").in_bulk(att.question_ids)
    n = len(att.question_ids)
    total = round(n * att.marks_per_question, 2)
    attempted = att.correct + att.incorrect
    secs, review = {}, []
    for qid in att.question_ids:
        q = qs[qid]
        sel = att.answers.get(str(qid))
        status = "skipped" if not sel else ("correct" if sel == q.correct else "incorrect")
        s = secs.setdefault(q.subject.name, {"section": q.subject.name, "total": 0, "correct": 0,
                                             "incorrect": 0, "skipped": 0, "score": 0.0})
        s["total"] += 1
        s[status] += 1
        s["score"] = round(s["score"] + (att.marks_per_question if status == "correct"
                           else -att.negative_marks if status == "incorrect" else 0), 2)
        review.append({"id": q.id, "section": q.subject.name, "text": q.text,
                       "options": [q.option_a, q.option_b, q.option_c, q.option_d],
                       "selected": sel, "correct": q.correct, "status": status, "explanation": q.explanation})
    return Response({
        "test": att.test.name, "total_questions": n, "attempted": attempted, "correct": att.correct,
        "incorrect": att.incorrect, "unattempted": att.unattempted, "score": att.score, "total_marks": total,
        "percentage": round(att.score / total * 100, 2) if total else 0,
        "accuracy": round(att.correct / attempted * 100, 2) if attempted else 0,
        "marks_per_question": att.marks_per_question, "negative_marks": att.negative_marks,
        "marks_lost": round(att.incorrect * att.negative_marks, 2),
        "time_taken_seconds": int((att.submitted_at - att.started_at).total_seconds()),
        "duration_minutes": att.duration_minutes, "sections": list(secs.values()), "review": review})


# ------------------------------------------------------------------ admin helpers
@api_view(["GET"])
@permission_classes([IsAdminUser])
def stats(request):
    rows = Subject.objects.annotate(n=Count("questions")).values("name", "n").order_by("name")
    return Response(list(rows))


@api_view(["POST"])
@permission_classes([IsAdminUser])
def upload_questions(request):
    f = request.FILES.get("file")
    if not f:
        return err("Choose a CSV file.")
    try:
        text = f.read().decode("utf-8-sig")
    except UnicodeDecodeError:
        return err("Save the CSV as UTF-8 and try again.")
    created, errors = import_rows(csv.DictReader(io.StringIO(text)))
    return Response({"created": created, "errors": errors[:50]})
