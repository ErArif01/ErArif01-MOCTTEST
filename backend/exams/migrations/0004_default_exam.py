from django.db import migrations


def assign_default(apps, schema_editor):
    Category, Exam = apps.get_model("exams", "Category"), apps.get_model("exams", "Exam")
    Question, Test = apps.get_model("exams", "Question"), apps.get_model("exams", "Test")
    if not (Question.objects.filter(exam__isnull=True).exists() or Test.objects.filter(exam__isnull=True).exists()):
        return
    cat, _ = Category.objects.get_or_create(name="General", defaults={"icon": "\U0001F4DA", "description": "General practice tests"})
    exam, _ = Exam.objects.get_or_create(category=cat, name="General Practice", defaults={"description": "Older questions and tests"})
    Question.objects.filter(exam__isnull=True).update(exam=exam)
    Test.objects.filter(exam__isnull=True).update(exam=exam)


class Migration(migrations.Migration):
    dependencies = [("exams", "0003_category_test_is_paid_test_price_test_test_type_exam_and_more")]
    operations = [migrations.RunPython(assign_default, migrations.RunPython.noop)]
