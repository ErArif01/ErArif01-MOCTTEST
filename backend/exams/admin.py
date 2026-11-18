from django.contrib import admin
from .models import Attempt, Question, Subject, Test, TestSection


class SectionInline(admin.TabularInline):
    model = TestSection
    extra = 3


@admin.register(Test)
class TestAdmin(admin.ModelAdmin):
    list_display = ("name", "duration_minutes", "negative_marks", "marks_per_question", "is_active")
    inlines = [SectionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("text", "subject", "correct")
    list_filter = ("subject",)
    search_fields = ("text",)


admin.site.register(Subject)


@admin.register(Attempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = ("user", "test", "score", "correct", "incorrect", "started_at", "submitted_at")
    list_filter = ("test",)
