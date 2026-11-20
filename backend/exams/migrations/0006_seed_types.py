from django.db import migrations

TYPES = [("mock", "Full mock test"), ("sectional", "Sectional test"), ("pyp", "Previous year paper"), ("topic", "Topic test")]
NEWS = [("news", "Latest news"), ("result", "Result"), ("admit_card", "Admit card"), ("answer_key", "Answer key"),
        ("form_guide", "How to fill form"), ("solution", "Test solution"), ("syllabus", "Syllabus"), ("job", "Job alert")]


def seed(apps, schema_editor):
    T, N = apps.get_model("exams", "TestType"), apps.get_model("exams", "NewsCategory")
    for i, (k, n) in enumerate(TYPES):
        T.objects.get_or_create(key=k, defaults={"name": n, "order": i})
    for i, (k, n) in enumerate(NEWS):
        N.objects.get_or_create(key=k, defaults={"name": n, "order": i})


class Migration(migrations.Migration):
    dependencies = [("exams", "0005_types_manual_payments")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
