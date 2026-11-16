"""Turn the defence question bank into seed files for Thesis Mastery.

Reads scripts/source/qa_*.py (the same source used to build
thesis/Defence_Question_Bank.docx) and writes:

    data/questions.json            used by the offline demo mode
    data/questions.csv             for the admin bulk import screen
    supabase/seed/002_questions.sql  run after 001_schema.sql

Usage:  python scripts/build_seed.py
"""
import csv
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE / "source"))
from qa_nontech import NONTECH  # noqa: E402
from qa_tech import TECH  # noqa: E402
from qa_survival import SURV  # noqa: E402

CATEGORIES = [("General non-tech", NONTECH), ("General tech", TECH), ("Survival", SURV)]

rows, n = [], 0
for cat, items in CATEGORIES:
    for level, q, ans, tone, idk in items:
        n += 1
        rows.append({"number": n, "category": cat, "level": level, "question_text": q,
                     "expected_answer": ans, "tone": tone, "fallback_response": idk,
                     "evaluation_criteria": ""})
assert n == 200

(ROOT / "data").mkdir(exist_ok=True)
(ROOT / "data" / "questions.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")

with open(ROOT / "data" / "questions.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0]))
    w.writeheader()
    w.writerows(rows)


def lit(s):
    return "$q$" + s + "$q$" if s else "null"


lines = ["-- Seed: 200 defence questions. Run after 001_schema.sql.",
         "-- Re-running is safe: existing question numbers are updated in place.",
         "insert into public.questions (category_id, number, level, question_text, expected_answer, tone, fallback_response)",
         "select c.id, v.number, v.level, v.question_text, v.expected_answer, v.tone, v.fallback_response",
         "from (values"]
vals = [f"  ({lit(r['category'])}, {r['number']}, {lit(r['level'])}, {lit(r['question_text'])}, "
        f"{lit(r['expected_answer'])}, {lit(r['tone'])}, {lit(r['fallback_response'])})" for r in rows]
lines.append(",\n".join(vals))
lines += [") as v(category, number, level, question_text, expected_answer, tone, fallback_response)",
          "join public.categories c on c.name = v.category",
          "on conflict (number) do update set",
          "  category_id = excluded.category_id, level = excluded.level,",
          "  question_text = excluded.question_text, expected_answer = excluded.expected_answer,",
          "  tone = excluded.tone, fallback_response = excluded.fallback_response;", ""]
assert all("$q$" not in v for r in rows for v in r.values() if isinstance(v, str))
(ROOT / "supabase" / "seed").mkdir(exist_ok=True)
(ROOT / "supabase" / "seed" / "002_questions.sql").write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {n} questions")
