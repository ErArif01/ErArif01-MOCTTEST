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
