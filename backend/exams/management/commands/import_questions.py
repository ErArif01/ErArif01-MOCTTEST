import csv
from django.core.management.base import BaseCommand
from exams.importer import import_rows


class Command(BaseCommand):
    help = "Import questions from CSV: subject,question,a,b,c,d,correct,explanation"

    def add_arguments(self, parser):
        parser.add_argument("csv_file")

    def handle(self, *args, **o):
        with open(o["csv_file"], encoding="utf-8-sig", newline="") as f:
            n, errs = import_rows(csv.DictReader(f))
        self.stdout.write(f"Imported {n} new questions")
        for e in errs:
            self.stdout.write(e)
