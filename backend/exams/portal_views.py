"""Public site: home, exam cards, news, vacancies, hourly/featured quizzes, Razorpay payments."""
import base64
import hashlib
import hmac
import json
import logging
import os
import random
import re
import uuid
import time
from datetime import timedelta
import urllib.error
import urllib.request

from django.db import IntegrityError
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .admin_api import paginate
from .models import (Attempt, Category, Exam, NewsCategory, NewsPost, Order, Question, Quiz, QuizAttempt,
                     SiteConfig, Test, TestType, Vacancy)
from .views import err, has_access, test_json, type_map

log = logging.getLogger(__name__)
public = permission_classes([AllowAny])
LETTERS = ("A", "B", "C", "D")


def opt_user(request):
    return request.user if request.user.is_authenticated else None


def media(f):
    return f.url if f else ""


# ------------------------------------------------------------------ cards
def exam_card(e, counts, color):
    c = counts.get(e.id, {})
    return {"id": e.id, "name": e.name, "icon": e.icon, "color": e.color or color, "description": e.description,
            "n_tests": c.get("n", 0), "n_free": c.get("free", 0), "n_paid": c.get("paid", 0)}


def categories_payload():
    counts = {r["exam_id"]: r for r in Test.objects.filter(is_active=True, exam__isnull=False).values("exam_id")
              .annotate(n=Count("id"), free=Count("id", filter=Q(is_paid=False)), paid=Count("id", filter=Q(is_paid=True)))}
    out = []
    for c in Category.objects.filter(is_active=True).prefetch_related("exams"):
        exams = [exam_card(e, counts, c.color) for e in c.exams.all() if e.is_active]
        out.append({"id": c.id, "name": c.name, "icon": c.icon, "color": c.color, "description": c.description,
                    "exams": exams, "n_exams": len(exams), "n_tests": sum(x["n_tests"] for x in exams)})
    return out


def news_cats():
    return dict(NewsCategory.objects.values_list("key", "name"))


def news_json(n, cmap, full=False):
    d = {"id": n.id, "title": n.title, "category": n.category, "category_label": cmap.get(n.category, n.category),
         "summary": n.summary, "image": media(n.image), "has_video": bool(n.video or n.video_url),
         "is_pinned": n.is_pinned, "created_at": n.created_at, "exam_id": n.exam_id,
         "exam": n.exam.name if n.exam_id else ""}
    if full:
        d.update(body=n.body, video=media(n.video), video_url=n.video_url)
    return d


def vac_status(v):
    t = timezone.localdate()
    if v.start_date and t < v.start_date:
        return "upcoming"
    if v.last_date and t > v.last_date:
        return "closed"
    if v.last_date and (v.last_date - t).days <= 5:
        return "closing"
    return "open"


def vac_json(v, full=False):
    t = timezone.localdate()
    d = {"id": v.id, "title": v.title, "organization": v.organization, "total_posts": v.total_posts,
         "start_date": v.start_date, "last_date": v.last_date, "status": vac_status(v),
         "days_left": (v.last_date - t).days if v.last_date and v.last_date >= t else None,
         "qualification": v.qualification[:140], "exam_id": v.exam_id}
    if full:
        d.update(qualification=v.qualification, age_limit=v.age_limit, fee=v.fee, description=v.description,
                 posts=v.posts, notification_url=v.notification_url, apply_url=v.apply_url,
                 exam=v.exam.name if v.exam_id else "")
    return d


# ------------------------------------------------------------------ quizzes
def current_hourly():
    cfg = SiteConfig.get()
    if not cfg.hourly_enabled:
        return None
    hs = timezone.now().replace(minute=0, second=0, microsecond=0)
    q = Quiz.objects.filter(kind="hourly", hour_start=hs).first()
    if q:
        return q
    pool = Question.objects.filter(is_active=True)
    if cfg.hourly_exam_id:
        pool = pool.filter(exam_id=cfg.hourly_exam_id)
    if cfg.hourly_subject_id:
        pool = pool.filter(subject_id=cfg.hourly_subject_id)
    ids = list(pool.values_list("id", flat=True))
    if not ids:
        return None
    local = timezone.localtime(hs)
    nxt = local + timedelta(hours=1)
    try:
        return Quiz.objects.create(kind="hourly", hour_start=hs, exam_id=cfg.hourly_exam_id,
                                   title=f"Hourly Quiz {local:%I:%M %p} - {nxt:%I:%M %p}",
                                   description="10 fresh questions every hour. Same quiz for everyone.",
                                   question_ids=random.sample(ids, min(cfg.hourly_count, len(ids))))
    except IntegrityError:
        return Quiz.objects.filter(kind="hourly", hour_start=hs).first()


def quiz_json(q, mine):
    a = mine.get(q.id)
    return {"id": q.id, "title": q.title, "description": q.description, "kind": q.kind, "is_featured": q.is_featured,
            "question_count": len(q.question_ids), "exam": q.exam.name if q.exam_id else "",
            "attempted": bool(a), "correct": a.correct if a else None, "total": a.total if a else None,
            "hour_start": q.hour_start}


def quiz_overview(user):
    hourly = current_hourly()
    featured = list(Quiz.objects.filter(kind="manual", is_active=True, is_featured=True).select_related("exam").order_by("-created_at")[:6])
    more = list(Quiz.objects.filter(kind="manual", is_active=True, is_featured=False).select_related("exam").order_by("-created_at")[:20])
    past = list(Quiz.objects.filter(kind="hourly").exclude(pk=hourly.pk if hourly else 0).order_by("-hour_start")[:10])
    allq = ([hourly] if hourly else []) + featured + more + past
    mine = {a.quiz_id: a for a in QuizAttempt.objects.filter(user=user, quiz__in=allq)} if user else {}
    return {"hourly": quiz_json(hourly, mine) if hourly else None,
            "featured": [quiz_json(q, mine) for q in featured],
            "more": [quiz_json(q, mine) for q in more], "past": [quiz_json(q, mine) for q in past]}


def quiz_review(quiz, attempt):
    qs = Question.objects.in_bulk(quiz.question_ids)
    review, correct = [], 0
    for qid in quiz.question_ids:
        q = qs.get(qid)
        if not q:
            continue
        sel = attempt.answers.get(str(qid)) if attempt else None
        status = "skipped" if not sel else ("correct" if sel == q.correct else "incorrect")
        correct += status == "correct"
        review.append({"id": q.id, "text": q.text, "options": [q.option_a, q.option_b, q.option_c, q.option_d],
                       "selected": sel, "correct": q.correct, "status": status, "explanation": q.explanation})
    return review


def quiz_result(quiz, attempt):
    review = quiz_review(quiz, attempt)
    total = attempt.total
    top = QuizAttempt.objects.filter(quiz=quiz).select_related("user").order_by("-correct", "created_at")[:10]
    return {"quiz": {"id": quiz.id, "title": quiz.title}, "correct": attempt.correct,
            "incorrect": sum(r["status"] == "incorrect" for r in review),
            "skipped": sum(r["status"] == "skipped" for r in review), "total": total,
            "percentage": round(attempt.correct / total * 100, 1) if total else 0,
            "rank": QuizAttempt.objects.filter(quiz=quiz, correct__gt=attempt.correct).count() + 1,
            "participants": QuizAttempt.objects.filter(quiz=quiz).count(), "review": review,
            "leaderboard": [{"name": (a.user.first_name or a.user.username).split(" ")[0], "correct": a.correct,
                             "total": a.total} for a in top]}


@api_view(["GET"])
@public
def quiz_list(request):
    return Response(quiz_overview(opt_user(request)))


@api_view(["GET"])
def quiz_detail(request, pk):
    quiz = get_object_or_404(Quiz, pk=pk, is_active=True)
    att = QuizAttempt.objects.filter(user=request.user, quiz=quiz).first()
    if att:
        return Response({"attempted": True, "result": quiz_result(quiz, att)})
    qs = Question.objects.select_related("subject").in_bulk(quiz.question_ids)
    items = [{"id": q.id, "text": q.text, "subject": q.subject.name,
              "options": [q.option_a, q.option_b, q.option_c, q.option_d]}
             for q in (qs.get(i) for i in quiz.question_ids) if q]
    return Response({"attempted": False, "quiz": {"id": quiz.id, "title": quiz.title, "description": quiz.description},
                     "questions": items})


@api_view(["POST"])
def quiz_submit(request, pk):
    quiz = get_object_or_404(Quiz, pk=pk, is_active=True)
    if QuizAttempt.objects.filter(user=request.user, quiz=quiz).exists():
        return err("You have already attempted this quiz.")
    qs = Question.objects.in_bulk(quiz.question_ids)
    given = dict(request.data.get("answers") or {})
    answers = {str(k): v for k, v in given.items() if int(k) in qs and v in LETTERS} if all(str(k).isdigit() for k in given) else {}
    correct = sum(1 for k, v in answers.items() if qs[int(k)].correct == v)
    try:
        att = QuizAttempt.objects.create(user=request.user, quiz=quiz, answers=answers, correct=correct, total=len(qs))
    except IntegrityError:
        return err("You have already attempted this quiz.")
    return Response({"attempted": True, "result": quiz_result(quiz, att)})


# ------------------------------------------------------------------ public pages
@api_view(["GET"])
@public
def home(request):
    user = opt_user(request)
    ov = quiz_overview(user)
    return Response({
        "categories": categories_payload(),
        "news": [news_json(n, news_cats()) for n in NewsPost.objects.filter(is_published=True).select_related("exam")
                 .order_by("-is_pinned", "-created_at")[:6]],
        "vacancies": [vac_json(v) for v in Vacancy.objects.filter(is_active=True).order_by("-created_at")[:6]],
        "quizzes": {"hourly": ov["hourly"], "featured": ov["featured"]},
        "stats": {"tests": Test.objects.filter(is_active=True).count(), "questions": Question.objects.filter(is_active=True).count(),
                  "exams": Exam.objects.filter(is_active=True).count()},
    })


@api_view(["GET"])
@public
def categories(request):
    return Response(categories_payload())


@api_view(["GET"])
@public
def exam_detail(request, pk):
    e = get_object_or_404(Exam.objects.select_related("category"), pk=pk, is_active=True)
    tests = list(Test.objects.filter(exam=e, is_active=True).prefetch_related("sections__subject").order_by("test_type", "-created_at"))
    user = opt_user(request)
    paid, best, tries = set(), {}, {}
    if user:
        paid = set(Order.objects.filter(user=user, status="paid", test__in=tests).values_list("test_id", flat=True))
        for a in Attempt.objects.filter(user=user, test__in=tests, submitted_at__isnull=False):
            tq = (a.correct + a.incorrect + a.unattempted) * a.marks_per_question
            p = round(a.score / tq * 100, 1) if tq else 0
            tries[a.test_id] = tries.get(a.test_id, 0) + 1
            if a.test_id not in best or p > best[a.test_id][0]:
                best[a.test_id] = (p, a.id)
    manual = {}
    if user:
        for o in Order.objects.filter(user=user, test__in=tests, method="manual", status__in=("pending", "rejected")).order_by("created_at"):
            manual[o.test_id] = (o.status, o.note)
    tm = type_map()
    rows = []
    for t in tests:
        d = test_json(t, tm)
        d["purchased"] = (not t.is_paid) or t.id in paid or bool(user and user.is_staff)
        d["pay_status"], d["pay_note"] = (None, "") if d["purchased"] else manual.get(t.id, (None, ""))
        d["attempts"] = tries.get(t.id, 0)
        d["best_percentage"], d["best_attempt"] = best.get(t.id, (None, None))
        rows.append(d)
    return Response({"exam": {"id": e.id, "name": e.name, "icon": e.icon, "color": e.color or e.category.color,
                              "description": e.description, "syllabus": e.syllabus,
                              "category": {"id": e.category_id, "name": e.category.name}}, "tests": rows,
                     "test_types": [{"key": k, "name": n} for k, n in tm.items() if any(t.test_type == k for t in tests)]})


@api_view(["GET"])
@public
def news_list(request):
    qs = NewsPost.objects.filter(is_published=True).select_related("exam").order_by("-is_pinned", "-created_at")
    if request.GET.get("category"):
        qs = qs.filter(category=request.GET["category"])
    rows, meta = paginate(qs, request, 12)
    cm = news_cats()
    used = set(NewsPost.objects.filter(is_published=True).values_list("category", flat=True))
    return Response({**meta, "results": [news_json(n, cm) for n in rows],
                     "categories": [{"value": k, "label": v} for k, v in cm.items() if k in used]})


@api_view(["GET"])
@public
def news_detail(request, pk):
    return Response(news_json(get_object_or_404(NewsPost.objects.select_related("exam"), pk=pk, is_published=True), news_cats(), True))


@api_view(["GET"])
@public
def vacancy_list(request):
    qs = Vacancy.objects.filter(is_active=True).order_by("-created_at")
    rows, meta = paginate(qs, request, 12)
    return Response({**meta, "results": [vac_json(v) for v in rows]})


@api_view(["GET"])
@public
def vacancy_detail(request, pk):
    return Response(vac_json(get_object_or_404(Vacancy.objects.select_related("exam"), pk=pk, is_active=True), True))


# ------------------------------------------------------------------ Razorpay
def rzp_keys():
    return os.environ.get("RAZORPAY_KEY_ID", "").strip(), os.environ.get("RAZORPAY_KEY_SECRET", "").strip()


@api_view(["GET"])
@public
def site_config(request):
    kid, sec = rzp_keys()
    c = SiteConfig.get()
    manual = {"enabled": bool(c.manual_enabled and (c.upi_id or c.upi_qr)), "upi_id": c.upi_id, "payee_name": c.payee_name,
              "qr_url": c.upi_qr.url if c.upi_qr else "", "note": c.manual_note}
    return Response({"payments_enabled": bool(kid and sec), "razorpay_key_id": kid if sec else "", "manual": manual})


def razorpay_create_order(amount_paise, receipt, notes):
    kid, sec = rzp_keys()
    body = json.dumps({"amount": amount_paise, "currency": "INR", "receipt": receipt, "notes": notes}).encode()
    req = urllib.request.Request("https://api.razorpay.com/v1/orders", data=body, method="POST", headers={
        "Content-Type": "application/json",
        "Authorization": "Basic " + base64.b64encode(f"{kid}:{sec}".encode()).decode()})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())


def mark_paid(order, payment_id):
    if order.status != "paid":
        order.status, order.razorpay_payment_id, order.paid_at = "paid", payment_id, timezone.now()
        order.save(update_fields=["status", "razorpay_payment_id", "paid_at"])


@api_view(["POST"])
def create_order(request):
    test = get_object_or_404(Test, pk=request.data.get("test_id") or 0, is_active=True, is_paid=True)
    if has_access(request.user, test):
        return err("You already have access to this test.")
    kid, sec = rzp_keys()
    if not (kid and sec):
        return err("Online payments are not enabled yet.", 503)
    try:
        o = razorpay_create_order(test.price * 100, f"t{test.id}u{request.user.id}-{int(time.time())}",
                                  {"test_id": str(test.id), "user_id": str(request.user.id)})
    except (urllib.error.URLError, ValueError):
        log.exception("Razorpay order creation failed")
        return err("Could not start the payment. Please try again.", 502)
    Order.objects.create(user=request.user, test=test, amount=test.price, razorpay_order_id=o["id"])
    return Response({"order_id": o["id"], "amount": test.price * 100, "currency": "INR", "key_id": kid,
                     "test_name": test.name, "user": {"name": request.user.first_name, "email": request.user.email}})


@api_view(["POST"])
def verify_payment(request):
    oid = str(request.data.get("razorpay_order_id", ""))
    pid = str(request.data.get("razorpay_payment_id", ""))
    sig = str(request.data.get("razorpay_signature", ""))
    order = get_object_or_404(Order, razorpay_order_id=oid, user=request.user)
    expected = hmac.new(rzp_keys()[1].encode(), f"{oid}|{pid}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        return err("Payment verification failed. If money was deducted it will be reflected shortly or refunded.", 400)
    mark_paid(order, pid)
    return Response({"ok": True, "test_id": order.test_id})


@api_view(["POST"])
@public
def razorpay_webhook(request):
    """Safety net: marks the order paid even if the user closed the tab before verification."""
    secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "").strip()
    if not secret:
        return err("Webhook not configured.", 503)
    raw = request.body
    sent = request.META.get("HTTP_X_RAZORPAY_SIGNATURE", "")
    if not hmac.compare_digest(hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest(), sent):
        return err("Bad signature.", 400)
    try:
        ev = json.loads(raw.decode())
        if ev.get("event") in ("payment.captured", "order.paid"):
            pay = ev["payload"]["payment"]["entity"]
            order = Order.objects.filter(razorpay_order_id=pay.get("order_id")).first()
            if order:
                mark_paid(order, pay.get("id", ""))
    except (ValueError, KeyError):
        return err("Bad payload.", 400)
    return Response({"ok": True})


@api_view(["POST"])
def manual_payment(request):
    """User paid by UPI / QR code and submits the transaction id. The admin verifies and approves."""
    c = SiteConfig.get()
    if not (c.manual_enabled and (c.upi_id or c.upi_qr)):
        return err("QR / UPI payment is not enabled.", 503)
    test = get_object_or_404(Test, pk=request.data.get("test_id") or 0, is_active=True, is_paid=True)
    if has_access(request.user, test):
        return err("You already have access to this test.")
    utr = str(request.data.get("utr", "")).strip()
    if not re.fullmatch(r"[A-Za-z0-9\-]{6,40}", utr):
        return err("Enter the UPI transaction / UTR number (6 to 40 letters or digits).")
    if Order.objects.filter(utr__iexact=utr).exists():
        return err("This transaction ID was already submitted.")
    if Order.objects.filter(user=request.user, test=test, status="pending").exists():
        return err("Your previous payment for this test is still being verified.")
    shot = request.FILES.get("screenshot")
    if shot:
        if os.path.splitext(shot.name)[1].lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            return err("Screenshot must be a jpg, png or webp image.")
        if shot.size > 5 * 1024 * 1024:
            return err("Screenshot must be under 5 MB.")
    Order.objects.create(user=request.user, test=test, amount=test.price, razorpay_order_id="manual-" + uuid.uuid4().hex,
                         method="manual", status="pending", utr=utr, screenshot=shot or "")
    return Response({"ok": True, "message": "Payment submitted. The admin will verify it and unlock the test shortly."})
