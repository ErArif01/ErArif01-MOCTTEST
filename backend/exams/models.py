from datetime import timedelta
from django.conf import settings
from django.db import models


class EmailOTP(models.Model):
    email = models.EmailField(db_index=True)
    code_hash = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    used = models.BooleanField(default=False)
    purpose = models.CharField(max_length=10, default="register", db_index=True)  # register | reset


class Category(models.Model):
    """Top-level card on the home page: Railways, SSC, Banking, UPSSSC ..."""
    name = models.CharField(max_length=120)
    icon = models.CharField(max_length=8, default="\U0001F4DA", blank=True)
    color = models.CharField(max_length=9, default="#0b4f8a")
    description = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.name


class Exam(models.Model):
    """A vacancy / post inside a category: RRB ALP, RRB Group D, SSC CGL ... Each exam has its own question bank."""
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="exams")
    name = models.CharField(max_length=150)
    icon = models.CharField(max_length=8, default="\U0001F3AF", blank=True)
    color = models.CharField(max_length=9, blank=True)
    description = models.CharField(max_length=250, blank=True)
    syllabus = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.category} / {self.name}"


class Subject(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Question(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()
    option_a = models.CharField(max_length=500)
    option_b = models.CharField(max_length=500)
    option_c = models.CharField(max_length=500)
    option_d = models.CharField(max_length=500)
    correct = models.CharField(max_length=1, choices=[(c, c) for c in "ABCD"])
    explanation = models.TextField(blank=True)
    exam = models.ForeignKey(Exam, null=True, blank=True, on_delete=models.CASCADE, related_name="questions")
    is_active = models.BooleanField(default=True)  # "deleted" questions are only deactivated so old results keep working

    def __str__(self):
        return f"[{self.subject}] {self.text[:60]}"


DEFAULT_INSTRUCTIONS = ""


class Test(models.Model):
    name = models.CharField(max_length=200)
    description = models.CharField(max_length=300, blank=True)
    duration_minutes = models.PositiveIntegerField(default=90)
    marks_per_question = models.FloatField(default=1)
    negative_marks = models.FloatField(default=0.25, help_text="Marks cut for each wrong answer (0 for none)")
    instructions = models.TextField(blank=True, help_text="Extra instructions (one per line). General instructions are always shown.")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    exam = models.ForeignKey(Exam, null=True, blank=True, on_delete=models.CASCADE, related_name="tests")
    test_type = models.CharField(max_length=40, default="mock")   # key of a TestType
    is_paid = models.BooleanField(default=False)
    price = models.PositiveIntegerField(default=0, help_text="Price in rupees (paid tests only)")

    @property
    def total_questions(self):
        return sum(s.num_questions for s in self.sections.all())

    @property
    def total_marks(self):
        return round(self.total_questions * self.marks_per_question, 2)

    def __str__(self):
        return self.name


class TestSection(models.Model):
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name="sections")
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT)
    num_questions = models.PositiveIntegerField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]


class Attempt(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    test = models.ForeignKey(Test, on_delete=models.CASCADE)
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    # snapshot so later edits to the test never change a running/finished attempt
    duration_minutes = models.PositiveIntegerField()
    marks_per_question = models.FloatField()
    negative_marks = models.FloatField()
    question_ids = models.JSONField(default=list)
    answers = models.JSONField(default=dict)
    correct = models.PositiveIntegerField(default=0)
    incorrect = models.PositiveIntegerField(default=0)
    unattempted = models.PositiveIntegerField(default=0)
    score = models.FloatField(null=True, blank=True)

    @property
    def ends_at(self):
        return self.started_at + timedelta(minutes=self.duration_minutes)


class Order(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    test = models.ForeignKey(Test, on_delete=models.CASCADE)
    amount = models.PositiveIntegerField()                       # rupees
    razorpay_order_id = models.CharField(max_length=60, unique=True)
    razorpay_payment_id = models.CharField(max_length=60, blank=True)
    status = models.CharField(max_length=10, default="created", db_index=True)   # created | pending | paid | rejected
    method = models.CharField(max_length=10, default="razorpay")                # razorpay | manual
    utr = models.CharField(max_length=100, blank=True, db_index=True)           # UPI transaction id (manual)
    screenshot = models.FileField(upload_to="payments/proofs/", blank=True)
    note = models.CharField(max_length=300, blank=True)                         # rejection reason / admin note
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)


class Quiz(models.Model):
    """Small quiz shown on the home page. kind=hourly is generated automatically every hour."""
    title = models.CharField(max_length=200)
    description = models.CharField(max_length=300, blank=True)
    kind = models.CharField(max_length=10, default="manual")     # manual | hourly
    exam = models.ForeignKey(Exam, null=True, blank=True, on_delete=models.SET_NULL)
    question_ids = models.JSONField(default=list)
    hour_start = models.DateTimeField(null=True, blank=True, unique=True)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class QuizAttempt(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    answers = models.JSONField(default=dict)
    correct = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "quiz")


class SiteConfig(models.Model):
    """Single row: settings for the automatic hourly quiz."""
    hourly_enabled = models.BooleanField(default=True)
    hourly_exam = models.ForeignKey(Exam, null=True, blank=True, on_delete=models.SET_NULL)
    hourly_subject = models.ForeignKey(Subject, null=True, blank=True, on_delete=models.SET_NULL)
    hourly_count = models.PositiveIntegerField(default=10)
    # manual payment by UPI / QR code
    manual_enabled = models.BooleanField(default=False)
    upi_id = models.CharField(max_length=100, blank=True)
    payee_name = models.CharField(max_length=100, blank=True)
    upi_qr = models.FileField(upload_to="payments/qr/", blank=True)
    manual_note = models.TextField(blank=True)

    @classmethod
    def get(cls):
        return cls.objects.get_or_create(pk=1)[0]


class TestType(models.Model):
    """Admin-managed kinds of tests (Full mock, Sectional, Previous year ...). Shown as tabs on the exam page."""
    key = models.SlugField(max_length=40, unique=True)
    name = models.CharField(max_length=80)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]


class NewsCategory(models.Model):
    """Admin-managed kinds of news (Result, Admit card, Form guide ...)."""
    key = models.SlugField(max_length=40, unique=True)
    name = models.CharField(max_length=80)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]


class NewsPost(models.Model):
    title = models.CharField(max_length=250)
    category = models.CharField(max_length=40, default="news")    # key of a NewsCategory
    summary = models.CharField(max_length=300, blank=True)
    body = models.TextField(blank=True)
    image = models.FileField(upload_to="news/images/", blank=True)
    video = models.FileField(upload_to="news/videos/", blank=True)
    video_url = models.URLField(blank=True, help_text="YouTube or any video link")
    exam = models.ForeignKey(Exam, null=True, blank=True, on_delete=models.SET_NULL)
    is_pinned = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Vacancy(models.Model):
    title = models.CharField(max_length=250)
    organization = models.CharField(max_length=200, blank=True)
    total_posts = models.PositiveIntegerField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    last_date = models.DateField(null=True, blank=True)
    qualification = models.TextField(blank=True)
    age_limit = models.CharField(max_length=150, blank=True)
    fee = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    posts = models.JSONField(default=list, blank=True)           # [{"name","count","qualification"}]
    notification_url = models.URLField(blank=True)
    apply_url = models.URLField(blank=True)
    exam = models.ForeignKey(Exam, null=True, blank=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
