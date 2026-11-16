// Leniency check: marks every question against the other questions'
// expected answers. A rule set that accepts many unrelated answers as
// Correct is too generic and should use more specific phrases.
//
//   node scripts/cross_check.js [threshold]   (default 4)
const M = require("../js/marker.js");
const rows = require("../data/questions.json");
const threshold = Number(process.argv[2] || 4);
let total = 0;
const flagged = [];
for (const q of rows) {
  const accepted = rows.filter((o) => o !== q && M.mark(q, o.expected_answer).verdict === "correct").map((o) => o.number);
  total += accepted.length;
  if (accepted.length >= threshold) flagged.push([q.number, accepted]);
}
console.log(`Cross-accepts in total: ${total} (out of ${rows.length * (rows.length - 1)} pairs)`);
flagged.sort((a, b) => b[1].length - a[1].length).forEach(([n, a]) => console.log(`Q${n}: accepts ${a.length} other answers (${a.join(", ")})`));
