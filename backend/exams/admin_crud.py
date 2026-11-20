"""Generic admin CRUD (categories, exams, vacancies, news, quizzes) built on DRF viewsets."""
import os
import random

from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.routers import SimpleRouter

from django.utils.text import slugify

from .models import (Category, Exam, NewsCategory, NewsPost, Question, Quiz, QuizAttempt, Subject, Test, TestType,
                     Vacancy)

IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
VID_EXT = {".mp4", ".webm", ".mov"}


def check_file(f, exts, max_mb, label):
    if not f:
        return f
    if os.path.splitext(f.name)[1].lower() not in exts:
        raise serializers.ValidationError(f"{label}: allowed types are {', '.join(sorted(exts))}.")
    if f.size > max_mb * 1024 * 1024:
        raise serializers.ValidationError(f"{label} must be under {max_mb} MB (for larger videos paste a YouTube link).")
    return f


class CategorySerializer(serializers.ModelSerializer):
    n_exams = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "icon", "color", "description", "order", "is_active", "n_exams"]

    def get_n_exams(self, o):
        return o.exams.count()


class ExamSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    n_tests = serializers.SerializerMethodField()
    n_questions = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = ["id", "category", "category_name", "name", "icon", "color", "description", "syllabus",
                  "order", "is_active", "n_tests", "n_questions"]

    def get_n_tests(self, o):
        return o.tests.count()

    def get_n_questions(self, o):
        return o.questions.filter(is_active=True).count()


class VacancySerializer(serializers.ModelSerializer):
    class Meta:
        model = Vacancy
        fields = "__all__"
        read_only_fields = ["created_at"]

    def validate_posts(self, value):
        out = []
        for r in value or []:
            name = str(r.get("name", "")).strip()
            if name:
                out.append({"name": name, "count": str(r.get("count", "")).strip(),
                            "qualification": str(r.get("qualification", "")).strip()})
        return out


class NewsSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    video_file_url = serializers.SerializerMethodField()

    class Meta:
        model = NewsPost
        fields = ["id", "title", "category", "summary", "body", "image", "video", "video_url", "exam",
                  "is_pinned", "is_published", "created_at", "image_url", "video_file_url"]
        read_only_fields = ["created_at"]
        extra_kwargs = {"image": {"write_only": True, "required": False, "allow_null": True},
                        "video": {"write_only": True, "required": False, "allow_null": True}}

    def get_image_url(self, o):
        return o.image.url if o.image else ""

    def get_video_file_url(self, o):
        return o.video.url if o.video else ""

    def validate_category(self, v):
        if not NewsCategory.objects.filter(key=v).exists():
            raise serializers.ValidationError("Unknown news type. Add it first.")
        return v

    def validate_image(self, f):
        return check_file(f, IMG_EXT, 5, "Image")

    def validate_video(self, f):
        return check_file(f, VID_EXT, 30, "Video")


def unique_key(model, name):
    base = slugify(name)[:30] or "item"
    key, n = base, 2
    while model.objects.filter(key=key).exists():
        key, n = f"{base}-{n}", n + 1
    return key


class TypeSerializer(serializers.ModelSerializer):
    """Shared by TestType and NewsCategory."""
    n_used = serializers.SerializerMethodField()

    class Meta:
        fields = ["id", "key", "name", "order", "n_used"]
        read_only_fields = ["key"]

    def validate_name(self, v):
        v = v.strip()
        qs = self.Meta.model.objects.filter(name__iexact=v)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if not v or qs.exists():
            raise serializers.ValidationError("This name already exists." if v else "Name is required.")
        return v


class TestTypeSerializer(TypeSerializer):
    class Meta(TypeSerializer.Meta):
        model = TestType

    def get_n_used(self, o):
        return Test.objects.filter(test_type=o.key).count()


class NewsCategorySerializer(TypeSerializer):
    class Meta(TypeSerializer.Meta):
        model = NewsCategory

    def get_n_used(self, o):
        return NewsPost.objects.filter(category=o.key).count()


class QuizAdminSerializer(serializers.ModelSerializer):
    exam_name = serializers.CharField(source="exam.name", read_only=True, default="")
    question_count = serializers.SerializerMethodField()
    n_attempts = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ["id", "title", "description", "kind", "exam", "exam_name", "is_featured", "is_active",
                  "created_at", "hour_start", "question_count", "n_attempts"]
        read_only_fields = ["kind", "hour_start", "created_at", "exam"]

    def get_question_count(self, o):
        return len(o.question_ids)

    def get_n_attempts(self, o):
        return o.attempts.count()


class AdminCrud(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    pagination_class = None


class CategoryViewSet(AdminCrud):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ExamViewSet(AdminCrud):
    serializer_class = ExamSerializer

    def get_queryset(self):
        qs = Exam.objects.select_related("category")
        if self.request.GET.get("category"):
            qs = qs.filter(category_id=self.request.GET["category"])
        return qs


class VacancyViewSet(AdminCrud):
    queryset = Vacancy.objects.order_by("-created_at")
    serializer_class = VacancySerializer


class NewsViewSet(AdminCrud):
    queryset = NewsPost.objects.order_by("-created_at")
    serializer_class = NewsSerializer

    def _clear_flags(self):
        out = {}
        for f in ("image", "video"):
            if str(self.request.data.get("clear_" + f, "")).lower() in ("1", "true"):
                out[f] = ""
        return out

    def perform_update(self, serializer):
        serializer.save(**self._clear_flags())


class TypeViewSet(AdminCrud):
    def perform_create(self, serializer):
        serializer.save(key=unique_key(serializer.Meta.model, serializer.validated_data["name"]))

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if self.get_serializer(obj).data["n_used"]:
            return Response({"error": "This type is in use, so it cannot be deleted. Rename it instead."}, status=400)
        obj.delete()
        return Response(status=204)


class TestTypeViewSet(TypeViewSet):
    queryset = TestType.objects.all()
    serializer_class = TestTypeSerializer


class NewsCategoryViewSet(TypeViewSet):
    queryset = NewsCategory.objects.all()
    serializer_class = NewsCategorySerializer


class QuizViewSet(AdminCrud):
    serializer_class = QuizAdminSerializer

    def get_queryset(self):
        return Quiz.objects.order_by("-created_at")

    def create(self, request):
        d = request.data
        title = str(d.get("title", "")).strip()
        if not title:
            return Response({"error": "Quiz title is required."}, status=400)
        pool = Question.objects.filter(is_active=True)
        exam = Exam.objects.filter(pk=d.get("exam") or 0).first()
        if exam:
            pool = pool.filter(exam=exam)
        subj = Subject.objects.filter(pk=d.get("subject") or 0).first()
        if subj:
            pool = pool.filter(subject=subj)
        ids = list(pool.values_list("id", flat=True))
        try:
            count = max(1, min(100, int(d.get("count") or 10)))
        except (TypeError, ValueError):
            return Response({"error": "Question count must be a number."}, status=400)
        if not ids:
            return Response({"error": "No questions match this exam/subject. Upload questions first."}, status=400)
        quiz = Quiz.objects.create(title=title, description=str(d.get("description", "")).strip()[:300],
                                   exam=exam, question_ids=random.sample(ids, min(count, len(ids))),
                                   is_featured=bool(d.get("is_featured")), is_active=True)
        return Response(self.get_serializer(quiz).data, status=201)

    @action(detail=True, methods=["get"])
    def attempts(self, request, pk=None):
        quiz = self.get_object()
        rows = QuizAttempt.objects.filter(quiz=quiz).select_related("user").order_by("-correct", "created_at")[:300]
        return Response([{"user": a.user.first_name or a.user.username, "email": a.user.email, "correct": a.correct,
                          "total": a.total, "percentage": round(a.correct / a.total * 100, 1) if a.total else 0,
                          "at": a.created_at} for a in rows])


router = SimpleRouter()
router.register("categories", CategoryViewSet, basename="admin-category")
router.register("exams", ExamViewSet, basename="admin-exam")
router.register("vacancies", VacancyViewSet, basename="admin-vacancy")
router.register("news", NewsViewSet, basename="admin-news")
router.register("quizzes", QuizViewSet, basename="admin-quiz")
router.register("test-types", TestTypeViewSet, basename="admin-test-type")
router.register("news-categories", NewsCategoryViewSet, basename="admin-news-category")
