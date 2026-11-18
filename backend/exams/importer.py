from .models import Question, Subject


def import_rows(rows):
    """rows: iterable of dicts with columns subject,question,a,b,c,d,correct,explanation"""
    created, errors = 0, []
    for i, raw in enumerate(rows, start=2):
        r = {(k or "").strip().lower(): (v or "").strip() for k, v in raw.items()}
        try:
            subject, text = r["subject"], r["question"]
            opts = [r["a"], r["b"], r["c"], r["d"]]
            ans = r["correct"].upper()
        except KeyError as e:
            errors.append(f"Row {i}: missing column {e}")
            continue
        if not (subject and text and all(opts) and ans in ("A", "B", "C", "D")):
            errors.append(f"Row {i}: empty field or 'correct' is not A/B/C/D")
            continue
        s, _ = Subject.objects.get_or_create(name=subject)
        _, new = Question.objects.get_or_create(
            subject=s, text=text,
            defaults=dict(option_a=opts[0], option_b=opts[1], option_c=opts[2], option_d=opts[3],
                          correct=ans, explanation=r.get("explanation", "")))
        created += 1 if new else 0
    return created, errors
