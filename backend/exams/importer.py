from .models import Question, Subject

REQUIRED = ["subject", "question", "a", "b", "c", "d", "correct"]
COLS = REQUIRED + ["explanation"]


def _s(v):
    return v.strip() if isinstance(v, str) else ""


def import_rows(rows, exam):
    """Returns {"created": [...], "duplicates": [...], "failed": [...], "samples": n}.
    Every list holds dicts with the CSV columns; failed rows also carry an "error" text so the admin can fix and re-upload."""
    out = {"created": [], "duplicates": [], "failed": [], "samples": 0}
    for raw in rows:
        r = {_s(k).lower(): _s(v) for k, v in raw.items() if isinstance(k, str)}
        rec = {c: r.get(c, "") for c in COLS}
        if rec["question"].lower().startswith("sample"):
            out["samples"] += 1                      # example rows from the sample file are ignored
            continue
        missing = [c for c in REQUIRED if c not in r]
        if missing:
            out["failed"].append({**rec, "error": "CSV is missing column(s): " + ", ".join(missing)})
            continue
        rec["correct"] = rec["correct"].upper()
        problem = None
        for c, label in (("subject", "Subject"), ("question", "Question"), ("a", "Option A"), ("b", "Option B"),
                         ("c", "Option C"), ("d", "Option D")):
            if not rec[c]:
                problem = f"{label} is empty"
                break
        if not problem and rec["correct"] not in ("A", "B", "C", "D"):
            problem = f"'correct' must be A, B, C or D (got '{rec['correct'] or 'empty'}')"
        if not problem and len(rec["subject"]) > 100:
            problem = "Subject name is longer than 100 characters"
        if not problem and max(len(rec[c]) for c in "abcd") > 500:
            problem = "An option is longer than 500 characters"
        if problem:
            out["failed"].append({**rec, "error": problem})
            continue
        subj, _ = Subject.objects.get_or_create(name=rec["subject"])
        q, new = Question.objects.get_or_create(
            exam=exam, subject=subj, text=rec["question"],
            defaults=dict(option_a=rec["a"], option_b=rec["b"], option_c=rec["c"], option_d=rec["d"],
                          correct=rec["correct"], explanation=rec["explanation"]))
        if new:
            out["created"].append(rec)
        elif not q.is_active:
            q.is_active = True
            q.save(update_fields=["is_active"])
            out["created"].append(rec)
        else:
            out["duplicates"].append(rec)
    return out
