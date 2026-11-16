// Checks the marking rules in data/questions.json against the expected answers.
//
//   node scripts/test_rules.js            summary of problems
//   node scripts/test_rules.js 113        show the full marking for one question
//
// Every expected answer should mark as Correct, and obviously wrong answers
// should mark as Incorrect.
const fs = require("fs");
const path = require("path");
const M = require("../js/marker.js");

const rows = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "questions.json"), "utf8"));
const only = process.argv[2] ? Number(process.argv[2]) : null;
const WRONG = [
  "I don't know.",
  "Bananas are yellow and the weather today is lovely, so I would rather talk about football and holidays instead of this.",
];

let problems = 0;
for (const q of rows) {
  if (only && q.number !== only) continue;
  const own = M.mark(q, q.expected_answer);
  const issues = [];
  const template = /\[Use your final result here\]/.test(q.expected_answer);
  if (own.verdict !== "correct" && !template) {
    const missing = own.points.filter((p) => !p.covered && p.type !== "B").map((p) => p.label);
    issues.push(`expected answer marked ${own.verdict}; missing: ${missing.join(" | ") || "-"}; flags: ${own.where_you_went_wrong.filter((w) => w.type === "misunderstanding").map((w) => w.detail).join(" | ") || "-"}`);
  }
  for (const w of WRONG) {
    const r = M.mark(q, w);
    if (r.verdict !== "incorrect") issues.push(`wrong answer "${w.slice(0, 25)}..." marked ${r.verdict}`);
  }
  const bonus = q.marking_rules.points.filter((p) => p.type === "B");
  const bonusMissed = own.points.filter((p) => p.type === "B" && !p.covered).map((p) => p.label);
  if (only) {
    console.log(JSON.stringify({ verdict: own.verdict, scores: [own.accuracy_score, own.completeness_score, own.communication_score], points: own.points, wrong: own.where_you_went_wrong }, null, 1));
  }
  if (template && own.verdict !== "correct") console.log(`Q${q.number}: note - results template, cannot self-test (marked ${own.verdict})`);
  if (issues.length) {
    problems++;
    console.log(`Q${q.number}: ${issues.join("\n      ")}`);
  } else if (bonusMissed.length && bonus.length) {
    console.log(`Q${q.number}: note - expected answer misses bonus: ${bonusMissed.join(" | ")}`);
  }
}
console.log(problems ? `\n${problems} question(s) need attention.` : "\nAll questions pass.");
process.exitCode = problems ? 1 : 0;
