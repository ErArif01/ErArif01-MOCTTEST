import csv, io, logging, random, secrets
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from .emailer import send_otp_email
from .importer import import_rows
from .models import Attempt, EmailOTP, Exam, Order, Question, Subject, Test, TestType

LETTERS = ("A", "B", "C", "D")
log = logging.getLogger(__name__)


def err(msg, code=400):
    return Response({"error": msg}, status=code)


def user_json(u):
    return {"id": u.id, "email": u.email, "name": u.first_name, "username": u.username, "is_staff": u.is_staff}


def clean_email(request):
    email = str(request.data.get("email", "")).strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        return None
    return email


def email_taken(email):
    return User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists()


# ------------------------------------------------------------------ OTP helpers
def too_soon(email, purpose):
    last = EmailOTP.objects.filter(email=email, purpose=purpose).order_by("-created_at").first()
    return bool(last and timezone.now() - last.created_at < timedelta(seconds=60))


def new_otp(email, purpose):
    code = f"{secrets.randbelow(10**6):06d}"
    return code, EmailOTP.objects.create(email=email, purpose=purpose, code_hash=make_password(code))


def check_otp(email, code, purpose):
    """Returns (otp, error_message)."""
    otp = EmailOTP.objects.filter(email=email, purpose=purpose, used=False).order_by("-created_at").first()
    if not otp or timezone.now() - otp.created_at > timedelta(minutes=10):
        return None, "OTP expired. Request a new one."
    if otp.attempts >= 5:
        return None, "Too many wrong attempts. Request a new OTP."
    if not check_password(code, otp.code_hash):
        otp.attempts += 1
        otp.save(update_fields=["attempts"])
        return None, "Wrong OTP."
    return otp, None


def issue_token(user):
    Token.objects.filter(user=user).delete()
    return Token.objects.create(user=user)


# ------------------------------------------------------------------ auth
@api_view(["POST"])
@permission_classes([AllowAny])
def send_otp(request):
    """Registration OTP."""
    email = clean_email(request)
    if not email:
        return err("Enter a valid email address.")
    if email_taken(email):
        return err("This email is already registered. Please log in.")
    if too_soon(email, "register"):
        return err("Please wait 60 seconds before requesting another OTP.", 429)
    code, otp = new_otp(email, "register")
    try:
        send_otp_email(email, code, "register")
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
    if email_taken(email):
        return err("This email is already registered.")
    otp, problem = check_otp(email, code, "register")
    if problem:
        return err(problem)
    otp.used = True
    otp.save(update_fields=["used"])
    user = User.objects.create_user(username=email, email=email, password=password, first_name=name)
    return Response({"token": issue_token(user).key, "user": user_json(user)})


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    ident = str(request.data.get("email") or request.data.get("identifier") or "").strip()
    password = str(request.data.get("password", ""))
    users = list(User.objects.filter(username__iexact=ident)) + list(User.objects.filter(email__iexact=ident))
    for u in users:
        if u.check_password(password):
            if not u.is_active:
                return err("Your account has been blocked. Please contact the administrator.", 403)
            token, _ = Token.objects.get_or_create(user=u)
            return Response({"token": token.key, "user": user_json(u)})
    return err("Wrong email/username or password.", 401)


@api_view(["GET"])
def me(request):
    return Response(user_json(request.user))


@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    """Password-reset OTP. The reply is the same whether or not the email is registered."""
    email = clean_email(request)
    if not email:
        return err("Enter a valid email address.")
    if too_soon(email, "reset"):
        return err("Please wait 60 seconds before requesting another OTP.", 429)
    code, otp = new_otp(email, "reset")        # row is created for any email so the rate limit leaks nothing
    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user:
        try:
            send_otp_email(email, code, "reset")
        except Exception:
            log.exception("Reset OTP email could not be sent")
            otp.delete()
            return err("Could not send the OTP email right now. Please try again later.", 500)
    return Response({"message": "If this email is registered, an OTP has been sent to it."})


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    email = clean_email(request)
    code = str(request.data.get("otp", "")).strip()
    new_pw = str(request.data.get("new_password", ""))
    if not email:
        return err("Enter a valid email address.")
    if len(new_pw) < 8:
        return err("Password must be at least 8 characters.")
    otp, problem = check_otp(email, code, "reset")
    if problem:
        return err(problem)
    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if not user:
        return err("Wrong OTP.")
    otp.used = True
    otp.save(update_fields=["used"])
    user.set_password(new_pw)
    user.save()
    Token.objects.filter(user=user).delete()     # log out everywhere
    return Response({"message": "Password updated. Please log in with your new password."})


@api_view(["POST"])
def change_password(request):
    """Logged-in users: no OTP, but the current password is required."""
    cur = str(request.data.get("current_password", ""))
    new_pw = str(request.data.get("new_password", ""))
    if not request.user.check_password(cur):
        return err("Current password is wrong.")
    if len(new_pw) < 8:
        return err("New password must be at least 8 characters.")
    if new_pw == cur:
        return err("New password must be different from the current one.")
    request.user.set_password(new_pw)
    request.user.save()
    return Response({"message": "Password changed.", "token": issue_token(request.user).key})


# ------------------------------------------------------------------ tests
def type_map():
    return dict(TestType.objects.values_list("key", "name"))


def test_json(t, tmap=None):
    tmap = tmap if tmap is not None else type_map()
    return {"test_type_name": tmap.get(t.test_type, t.test_type), "id": t.id, "name": t.name, "description": t.description, "duration_minutes": t.duration_minutes,
            "total_questions": t.total_questions, "total_marks": t.total_marks,
            "marks_per_question": t.marks_per_question, "negative_marks": t.negative_marks,
            "instructions": t.instructions, "exam_id": t.exam_id, "exam": t.exam.name if t.exam_id else "",
            "test_type": t.test_type, "is_paid": t.is_paid, "price": t.price,
            "sections": [{"subject": s.subject.name, "count": s.num_questions} for s in t.sections.all()]}


@api_view(["GET"])
def tests(request):
    qs = Test.objects.filter(is_active=True).order_by("-created_at")
    tm = type_map()
    return Response([test_json(t, tm) for t in qs])


@api_view(["GET"])
def test_detail(request, pk):
    t = get_object_or_404(Test, pk=pk, is_active=True)
    d = test_json(t)
    d["purchased"] = has_access(request.user, t)
    return Response(d)


def has_access(user, test):
    """Free tests are open to everyone; paid tests need a paid order (staff always have access)."""
    if not test.is_paid or user.is_staff:
        return True
    return Order.objects.filter(user=user, test=test, status="paid").exists()


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
        if not a or qid not in qs:
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
    if not has_access(request.user, test):
        return err("This is a paid test. Please purchase it to start.", 402)
    att = Attempt.objects.filter(user=request.user, test=test, submitted_at__isnull=True).first()
    if att and timezone.now() >= att.ends_at:
        finalize(att)
        att = None
    if not att:
        ids = []
        for s in test.sections.select_related("subject"):
            pool = list(Question.objects.filter(exam_id=test.exam_id, subject=s.subject, is_active=True).values_list("id", flat=True))
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


def build_result(att):
    qs = Question.objects.select_related("subject").in_bulk(att.question_ids)
    n = len(att.question_ids)
    total = round(n * att.marks_per_question, 2)
    attempted = att.correct + att.incorrect
    secs, review = {}, []
    for qid in att.question_ids:
        q = qs.get(qid)
        if q is None:
            continue
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
    return {
        "test": att.test.name, "total_questions": n, "attempted": attempted, "correct": att.correct,
        "incorrect": att.incorrect, "unattempted": att.unattempted, "score": att.score, "total_marks": total,
        "percentage": round(att.score / total * 100, 2) if total else 0,
        "accuracy": round(att.correct / attempted * 100, 2) if attempted else 0,
        "marks_per_question": att.marks_per_question, "negative_marks": att.negative_marks,
        "marks_lost": round(att.incorrect * att.negative_marks, 2),
        "time_taken_seconds": int((att.submitted_at - att.started_at).total_seconds()),
        "duration_minutes": att.duration_minutes, "sections": list(secs.values()), "review": review}


@api_view(["GET"])
def result(request, pk):
    att = get_object_or_404(Attempt, pk=pk, user=request.user)
    if not att.submitted_at:
        if timezone.now() >= att.ends_at:
            finalize(att)
        else:
            return err("This test is still in progress.")
    return Response(build_result(att))


# ------------------------------------------------------------------ question bank (admin)
@api_view(["GET"])
@permission_classes([IsAdminUser])
def stats(request):
    cond = Q(questions__is_active=True)
    if request.GET.get("exam"):
        cond &= Q(questions__exam_id=request.GET["exam"])
    rows = Subject.objects.annotate(n=Count("questions", filter=cond)).values("name", "n").order_by("name")
    if request.GET.get("exam"):
        rows = [r for r in rows if r["n"] > 0]
    return Response(list(rows))


@api_view(["POST"])
@permission_classes([IsAdminUser])
def upload_questions(request):
    exam = Exam.objects.filter(pk=request.data.get("exam") or 0).first()
    if not exam:
        return err("Choose the exam these questions belong to.")
    f = request.FILES.get("file")
    if not f:
        return err("Choose a CSV file.")
    try:
        text = f.read().decode("utf-8-sig")
    except UnicodeDecodeError:
        return err("Save the CSV as UTF-8 and try again.")
    res = import_rows(csv.DictReader(io.StringIO(text)), exam)
    cap = lambda rows: rows[:5000]
    return Response({"created": len(res["created"]), "duplicates": len(res["duplicates"]), "failed": len(res["failed"]),
                     "samples": res["samples"], "created_rows": cap(res["created"]),
                     "duplicate_rows": cap(res["duplicates"]), "failed_rows": cap(res["failed"])})
