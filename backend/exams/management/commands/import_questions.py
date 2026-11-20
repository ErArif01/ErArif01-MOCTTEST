import csv
from exams.models import Exam
from django.core.management.base import BaseCommand
from exams.importer import import_rows


class Command(BaseCommand):
    help = "Import questions from CSV: subject,question,a,b,c,d,correct,explanation"

    def add_arguments(self, parser):
        parser.add_argument("csv_file")
        parser.add_argument("--exam", type=int, required=True, help="Exam id the questions belong to")

    def handle(self, *args, **o):
        with open(o["csv_file"], encoding="utf-8-sig", newline="") as f:
            res = import_rows(csv.DictReader(f), Exam.objects.get(pk=o["exam"]))
        self.stdout.write(f"Imported {len(res['created'])} new, {len(res['duplicates'])} duplicates, {len(res['failed'])} failed")
        for r in res["failed"]:
            self.stdout.write(f"FAILED: {r['question'][:50]} -> {r['error']}")
