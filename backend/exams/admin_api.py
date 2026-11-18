"""Admin panel API (staff only): users, attempts, tests, questions, overview."""
from datetime import timedelta

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .models import Attempt, Question, Subject, Test, TestSection
from .views import build_result, err, finalize, test_json

PAGE = 20
admin_only = permission_classes([IsAdminUser])


def paginate(qs, request, size=PAGE):
    try:
        page = max(1, int(request.GET.get("page", 1)))
    except ValueError:
        page = 1
    total = qs.count() if hasattr(qs, "count") and not isinstance(qs, list) else len(qs)
    start = (page - 1) * size
    return list(qs[start:start + size]), {"total": total, "page": page, "pages": max(1, -(-total // size))}


def pct(a):
    total = (a.correct + a.incorrect + a.unattempted) * a.marks_per_question
    return round(a.score / total * 100, 2) if a.submitted_at and total else None


def att_row(a):
    now = timezone.now()
    tq = (a.correct + a.incorrect + a.unattempted) if a.submitted_at else len(a.question_ids)
    return {"id": a.id, "user_id": a.user_id, "user": a.user.first_name or a.user.username, "email": a.user.email,
            "test": a.test.name, "test_id": a.test_id, "started_at": a.started_at, "submitted_at": a.submitted_at,
            "status": "submitted" if a.submitted_at else ("expired" if now >= a.ends_at else "in_progress"),
            "score": a.score, "total_marks": round(tq * a.marks_per_question, 2), "percentage": pct(a),
            "correct": a.correct, "incorrect": a.incorrect, "unattempted": a.unattempted}


def close_expired(attempts):
    now = timezone.now()
    for a in attempts:
        if not a.submitted_at and now >= a.ends_at:
            finalize(a)


# ------------------------------------------------------------------ overview
@api_view(["GET"])
@admin_only
def overview(request):
    now = timezone.now()
    done = list(Attempt.objects.filter(submitted_at__isnull=False).order_by("-submitted_at")[:2000])
    pcts = [p for p in (pct(a) for a in done) if p is not None]
    recent = list(Attempt.objects.select_related("user", "test").order_by("-started_at")[:8])
    close_expired(recent)
    return Response({
        "users": {"total": User.objects.count(), "active": User.objects.filter(is_active=True).count(),
                  "blocked": User.objects.filter(is_active=False).count(),
                  "new_7d": User.objects.filter(date_joined__gte=now - timedelta(days=7)).count()},
        "tests": {"total": Test.objects.count(), "active": Test.objects.filter(is_active=True).count()},
        "questions": Question.objects.filter(is_active=True).count(),
        "attempts": {"total": Attempt.objects.count(), "submitted": Attempt.objects.filter(submitted_at__isnull=False).count(),
                     "today": Attempt.objects.filter(started_at__gte=now - timedelta(days=1)).count()},
        "avg_percentage": round(sum(pcts) / len(pcts), 2) if pcts else None,
        "recent": [att_row(a) for a in recent],
        "subjects": list(Subject.objects.annotate(n=Count("questions", filter=Q(questions__is_active=True)))
                         .values("name", "n").order_by("name")),
    })


# ------------------------------------------------------------------ users
def user_row(u, st=None):
    st = st or {"n": 0, "pcts": []}
    p = st["pcts"]
    return {"id": u.id, "name": u.first_name, "username": u.username, "email": u.email, "is_active": u.is_active,
            "is_staff": u.is_staff, "is_superuser": u.is_superuser, "date_joined": u.date_joined,
            "last_login": u.last_login, "attempts": st["n"],
            "avg_percentage": round(sum(p) / len(p), 2) if p else None, "best_percentage": max(p) if p else None}


def stats_for(ids):
    out = {i: {"n": 0, "pcts": []} for i in ids}
    for a in Attempt.objects.filter(user_id__in=ids, submitted_at__isnull=False):
        out[a.user_id]["n"] += 1
        p = pct(a)
        if p is not None:
            out[a.user_id]["pcts"].append(p)
    return out


@api_view(["GET"])
@admin_only
def users(request):
    qs = User.objects.all().order_by("-date_joined")
    q = request.GET.get("q", "").strip()
    if q:
        qs = qs.filter(Q(username__icontains=q) | Q(email__icontains=q) | Q(first_name__icontains=q))
    status = request.GET.get("status", "")
    if status == "blocked":
        qs = qs.filter(is_active=False)
    elif status == "active":
        qs = qs.filter(is_active=True)
    elif status == "staff":
        qs = qs.filter(is_staff=True)
    rows, meta = paginate(qs, request)
    st = stats_for([u.id for u in rows])
    return Response({**meta, "results": [user_row(u, st[u.id]) for u in rows]})


@api_view(["GET", "DELETE"])
@admin_only
def user_detail(request, pk):
    u = get_object_or_404(User, pk=pk)
    if request.method == "DELETE":
        if u.id == request.user.id:
            return err("You cannot delete your own account.")
        u.delete()
        return Response({"ok": True})
    atts = list(Attempt.objects.filter(user=u).select_related("user", "test").order_by("-started_at"))
    close_expired(atts)
    return Response({"user": user_row(u, stats_for([u.id])[u.id]), "attempts": [att_row(a) for a in atts]})


def _set_active(request, pk, active):
    u = get_object_or_404(User, pk=pk)
    if u.id == request.user.id:
        return err("You cannot block your own account.")
    u.is_active = active
    u.save(update_fields=["is_active"])
    if not active:
        Token.objects.filter(user=u).delete()     # kicks the user out immediately
    return Response({"ok": True, "is_active": active})


@api_view(["POST"])
@admin_only
def block_user(request, pk):
    return _set_active(request, pk, False)


@api_view(["POST"])
@admin_only
def unblock_user(request, pk):
    return _set_active(request, pk, True)


@api_view(["POST"])
@admin_only
def set_user_password(request, pk):
    u = get_object_or_404(User, pk=pk)
    pw = str(request.data.get("password", ""))
    if len(pw) < 8:
        return err("Password must be at least 8 characters.")
    u.set_password(pw)
    u.save()
    Token.objects.filter(user=u).delete()
    return Response({"ok": True})


@api_view(["POST"])
@admin_only
def set_user_staff(request, pk):
    u = get_object_or_404(User, pk=pk)
    if u.id == request.user.id:
        return err("You cannot change your own admin status.")
    u.is_staff = bool(request.data.get("is_staff"))
    u.save(update_fields=["is_staff"])
    return Response({"ok": True, "is_staff": u.is_staff})


# ------------------------------------------------------------------ attempts / results
@api_view(["GET"])
@admin_only
def attempts(request):
    qs = Attempt.objects.select_related("user", "test").order_by("-started_at")
    if request.GET.get("test"):
        qs = qs.filter(test_id=request.GET["test"])
    if request.GET.get("user"):
        qs = qs.filter(user_id=request.GET["user"])
    q = request.GET.get("q", "").strip()
    if q:
        qs = qs.filter(Q(user__email__icontains=q) | Q(user__first_name__icontains=q) | Q(user__username__icontains=q))
    status = request.GET.get("status", "")
    if status == "submitted":
        qs = qs.filter(submitted_at__isnull=False)
    elif status == "in_progress":
        qs = qs.filter(submitted_at__isnull=True)
    rows, meta = paginate(qs, request)
    close_expired(rows)
    return Response({**meta, "results": [att_row(a) for a in rows]})


@api_view(["GET"])
@admin_only
def attempt_result(request, pk):
    att = get_object_or_404(Attempt.objects.select_related("user", "test"), pk=pk)
    if not att.submitted_at:
        if timezone.now() >= att.ends_at:
            finalize(att)
        else:
            return err("This test is still in progress.")
    data = build_result(att)
    data["user"] = {"id": att.user_id, "name": att.user.first_name or att.user.username, "email": att.user.email}
    return Response(data)


# ------------------------------------------------------------------ tests CRUD
def test_admin_json(t):
    d = test_json(t)
    d.update(is_active=t.is_active, created_at=t.created_at, n_attempts=t.attempt_set.count(),
             n_submitted=t.attempt_set.filter(submitted_at__isnull=False).count())
    return d


def parse_test(data):
    name = str(data.get("name", "")).strip()
    if not name:
        raise ValueError("Test name is required.")
    try:
        duration = int(data.get("duration_minutes"))
        marks = float(data.get("marks_per_question"))
        neg = float(data.get("negative_marks", 0))
    except (TypeError, ValueError):
        raise ValueError("Duration, marks and negative marks must be numbers.")
    if not (1 <= duration <= 600):
        raise ValueError("Duration must be between 1 and 600 minutes.")
    if marks <= 0 or neg < 0:
        raise ValueError("Marks must be above 0 and negative marks cannot be below 0.")
    secs, seen = [], set()
    for s in data.get("sections") or []:
        subj = Subject.objects.filter(name=str(s.get("subject", "")).strip()).first()
        if not subj:
            raise ValueError(f"Subject '{s.get('subject')}' does not exist. Upload questions for it first.")
        try:
            n = int(s.get("num_questions"))
        except (TypeError, ValueError):
            raise ValueError("Question counts must be whole numbers.")
        if n < 1:
            raise ValueError("Each section needs at least 1 question.")
        if subj.id in seen:
            raise ValueError(f"Subject '{subj.name}' is added twice.")
        seen.add(subj.id)
        secs.append((subj, n))
    if not secs:
        raise ValueError("Add at least one section.")
    fields = dict(name=name, description=str(data.get("description", "")).strip()[:300],
                  duration_minutes=duration, marks_per_question=marks, negative_marks=neg,
                  instructions=str(data.get("instructions", "")).strip(), is_active=bool(data.get("is_active", True)))
    return fields, secs


def _save_sections(t, secs):
    t.sections.all().delete()
    for i, (subj, n) in enumerate(secs):
        TestSection.objects.create(test=t, subject=subj, num_questions=n, order=i)


@api_view(["GET", "POST"])
@admin_only
def admin_tests(request):
    if request.method == "GET":
        qs = Test.objects.order_by("-created_at").prefetch_related("sections__subject")
        return Response([test_admin_json(t) for t in qs])
    try:
        fields, secs = parse_test(request.data)
    except ValueError as e:
        return err(str(e))
    with transaction.atomic():
        t = Test.objects.create(**fields)
        _save_sections(t, secs)
    return Response(test_admin_json(t), status=201)


@api_view(["GET", "PUT", "DELETE"])
@admin_only
def admin_test_detail(request, pk):
    t = get_object_or_404(Test, pk=pk)
    if request.method == "GET":
        return Response(test_admin_json(t))
    if request.method == "DELETE":
        if t.attempt_set.exists():
            return err("This test already has attempts. Deactivate it instead of deleting.")
        t.delete()
        return Response({"ok": True})
    try:
        fields, secs = parse_test(request.data)
    except ValueError as e:
        return err(str(e))
    with transaction.atomic():
        for k, v in fields.items():
            setattr(t, k, v)
        t.save()
        _save_sections(t, secs)
    return Response(test_admin_json(t))


@api_view(["POST"])
@admin_only
def toggle_test(request, pk):
    t = get_object_or_404(Test, pk=pk)
    t.is_active = not t.is_active
    t.save(update_fields=["is_active"])
    return Response({"is_active": t.is_active})


# ------------------------------------------------------------------ question bank CRUD
def q_json(q):
    return {"id": q.id, "subject": q.subject.name, "text": q.text,
            "options": [q.option_a, q.option_b, q.option_c, q.option_d], "correct": q.correct,
            "explanation": q.explanation}


def parse_question(d):
    subject = str(d.get("subject", "")).strip()
    text = str(d.get("text", "")).strip()
    opts = [str(d.get(k, "")).strip() for k in "abcd"]
    correct = str(d.get("correct", "")).strip().upper()
    if not (subject and text and all(opts) and correct in ("A", "B", "C", "D")):
        raise ValueError("Subject, question, all four options and the correct option (A-D) are required.")
    return subject, text, opts, correct, str(d.get("explanation", "")).strip()


@api_view(["GET", "POST"])
@admin_only
def admin_questions(request):
    if request.method == "POST":
        try:
            subject, text, o, c, exp = parse_question(request.data)
        except ValueError as e:
            return err(str(e))
        s, _ = Subject.objects.get_or_create(name=subject)
        q = Question.objects.create(subject=s, text=text, option_a=o[0], option_b=o[1], option_c=o[2],
                                    option_d=o[3], correct=c, explanation=exp)
        return Response(q_json(q), status=201)
    qs = Question.objects.filter(is_active=True).select_related("subject").order_by("-id")
    if request.GET.get("subject"):
        qs = qs.filter(subject__name=request.GET["subject"])
    if request.GET.get("q", "").strip():
        qs = qs.filter(text__icontains=request.GET["q"].strip())
    rows, meta = paginate(qs, request)
    return Response({**meta, "results": [q_json(q) for q in rows]})


@api_view(["PUT", "DELETE"])
@admin_only
def admin_question_detail(request, pk):
    q = get_object_or_404(Question, pk=pk, is_active=True)
    if request.method == "DELETE":
        q.is_active = False          # kept in DB so old results still show it
        q.save(update_fields=["is_active"])
        return Response({"ok": True})
    try:
        subject, text, o, c, exp = parse_question(request.data)
    except ValueError as e:
        return err(str(e))
    q.subject, _ = Subject.objects.get_or_create(name=subject)
    q.text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct, q.explanation = text, *o, c, exp
    q.save()
    return Response(q_json(q))
