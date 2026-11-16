"""Turn the defence question bank into seed files for Thesis Mastery.

Reads scripts/source/qa_*.py (questions, expected answers, tone, fallback)
and scripts/source/rules_*.py (marking rules), and writes:

    data/questions.json            used by the offline demo mode
    data/questions.csv             for the admin bulk import screen
    supabase/seed/questions.sql    run after the migrations

Usage:  python scripts/build_seed.py
Then check the rules:  node scripts/test_rules.js
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
from rules_nontech import RULES as R1  # noqa: E402
from rules_tech import RULES as R2  # noqa: E402
from rules_survival import RULES as R3  # noqa: E402

CATEGORIES = [("General non-tech", NONTECH), ("General tech", TECH), ("Survival", SURV)]
RULES = {**R1, **R2, **R3}


def parse_rules(text, number):
    """Same format and output as parseRules() in js/marker.js."""
    rules = {"points": [], "flags": [], "min_words": None}
    for line in text.strip().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split("|")]
        kind = parts[0].upper()
        phrases = [p.strip() for p in "|".join(parts[2:]).split(";") if p.strip()]
        if kind in ("E", "B"):
            assert parts[1] and phrases, f"Q{number}: {line}"
            rules["points"].append({"type": kind, "label": parts[1], "phrases": phrases})
        elif kind == "NUM":
            rules["points"].append({"type": "NUM", "label": parts[1] if len(parts) > 1 else "A specific number from your study", "phrases": []})
        elif kind == "X":
            assert parts[1] and phrases, f"Q{number}: {line}"
            rules["flags"].append({"explanation": parts[1], "phrases": phrases})
        elif kind == "MIN":
            rules["min_words"] = int(parts[1])
        else:
            raise ValueError(f"Q{number}: unknown rule line {line!r}")
    assert any(p["type"] != "B" for p in rules["points"]), f"Q{number}: no essential point"
    return rules


rows, n = [], 0
for cat, items in CATEGORIES:
    for level, q, ans, tone, idk in items:
        n += 1
        assert n in RULES, f"Q{n} has no marking rules"
        rows.append({"number": n, "category": cat, "level": level, "question_text": q,
                     "expected_answer": ans, "tone": tone, "fallback_response": idk,
                     "evaluation_criteria": "", "marking_rules": parse_rules(RULES[n], n),
                     "_rules_text": RULES[n].strip()})
assert n == 200 and len(RULES) == 200

(ROOT / "data").mkdir(exist_ok=True)
json_rows = [{k: v for k, v in r.items() if k != "_rules_text"} for r in rows]
(ROOT / "data" / "questions.json").write_text(json.dumps(json_rows, ensure_ascii=False, indent=1), encoding="utf-8")

fields = ["number", "category", "level", "question_text", "expected_answer", "tone", "fallback_response", "evaluation_criteria", "marking_rules"]
with open(ROOT / "data" / "questions.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    for r in rows:
        w.writerow({**{k: r[k] for k in fields[:-1]}, "marking_rules": r["_rules_text"]})


def lit(s):
    return "$q$" + s + "$q$" if s else "null"


cols = "category_id, number, level, question_text, expected_answer, tone, fallback_response, marking_rules"
lines = ["-- Seed: 200 defence questions with marking rules.",
         "-- Run after supabase/migrations/001_schema.sql and 002_rule_marking.sql.",
         "-- Re-running is safe: existing question numbers are updated in place.",
         f"insert into public.questions ({cols})",
         "select c.id, v.number, v.level, v.question_text, v.expected_answer, v.tone, v.fallback_response, v.marking_rules::jsonb",
         "from (values"]
vals = [f"  ({lit(r['category'])}, {r['number']}, {lit(r['level'])}, {lit(r['question_text'])}, "
        f"{lit(r['expected_answer'])}, {lit(r['tone'])}, {lit(r['fallback_response'])}, "
        f"{lit(json.dumps(r['marking_rules'], ensure_ascii=False))})" for r in rows]
lines.append(",\n".join(vals))
lines += [") as v(category, number, level, question_text, expected_answer, tone, fallback_response, marking_rules)",
          "join public.categories c on c.name = v.category",
          "on conflict (number) do update set",
          "  category_id = excluded.category_id, level = excluded.level,",
          "  question_text = excluded.question_text, expected_answer = excluded.expected_answer,",
          "  tone = excluded.tone, fallback_response = excluded.fallback_response,",
          "  marking_rules = excluded.marking_rules;", ""]
assert all("$q$" not in v for r in rows for v in r.values() if isinstance(v, str))
(ROOT / "supabase" / "seed").mkdir(exist_ok=True)
old = ROOT / "supabase" / "seed" / "002_questions.sql"
if old.exists():
    old.unlink()
(ROOT / "supabase" / "seed" / "questions.sql").write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {n} questions with marking rules")
