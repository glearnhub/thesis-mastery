// Thesis Mastery rule-based marker.
//
// Each question can carry marking rules, written one per line:
//
//   E   | label | phrase; phrase; ...    essential point (all must be covered for Correct)
//   B   | label | phrase; phrase; ...    bonus point (raises completeness, not required)
//   NUM | label                          essential: the answer must contain a number
//   X   | explanation | phrase; ...      red flag: a misconception that makes the answer Incorrect
//   MIN | 20                             minimum words for a Correct answer
//   # comment
//
// A phrase matches when its words appear in the answer in the same order,
// allowing a couple of extra words in between. Matching ignores case, small
// filler words (the, a, of ...), simple word endings (-s, -ing, -ed ...),
// British/American spelling (analyse/analyze) and number words (one -> 1).
// A red flag is ignored when "not", "no", "never" or "without" comes just
// before it.
//
// Works in the browser (window.TMMarker) and in Node (module.exports).
(function (root) {
  "use strict";

  const FILLER = new Set(["the", "a", "an", "of", "to", "is", "are", "was", "were", "be", "been", "and", "in", "on",
    "for", "that", "this", "it", "its", "as", "with", "by", "at", "from", "or", "so", "i", "we", "my", "our", "you",
    "your", "they", "their", "them", "there", "which", "what", "do", "does", "did", "has", "have", "had", "will",
    "would", "can", "could", "should", "very", "just", "also", "then", "than", "into", "about"]);
  const NEGATORS = new Set(["not", "no", "never", "without", "nor", "neither"]);
  const NUMBER_WORDS = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
    first: "1st", second: "2nd", third: "3rd", once: "1", twice: "2" };
  const HEDGES = ["i guess", "i suppose", "maybe", "kind of", "sort of", "i am not sure", "i'm not sure", "not really sure", "basically", "you know", "stuff like that", "and so on"];
  const COURTESY = /^\s*(thank you|thanks|that is a (good|fair|sharp|great|important)|yes[,.]|good question|that's a (good|fair))/i;

  // ---------------------------------------------------------------- text handling
  function normalise(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[‘’‛]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, " ")
      .replace(/n't\b/g, " not").replace(/'re\b/g, " are").replace(/'s\b/g, "").replace(/'ve\b/g, " have").replace(/'m\b/g, " am").replace(/'ll\b/g, " will")
      .replace(/(\d),(\d{3})\b/g, "$1$2").replace(/(\d),(\d{3})\b/g, "$1$2")
      .replace(/%/g, " percent ")
      .replace(/[^a-z0-9.\s]/g, " ")
      .replace(/(^|\s)\.+|\.+(\s|$)/g, " ");
  }
  function stem(w) {
    if (/^\d/.test(w)) return w.replace(/\.0+$/, "");
    if (NUMBER_WORDS[w]) return NUMBER_WORDS[w];
    w = w.replace(/yse(s|d)?$/, "yze$1").replace(/ys(ing|er|ers)$/, "yz$1")             // analyse -> analyze
      .replace(/is(e|es|ed|ing|ation|ations)$/, "iz$1")                                // organise -> organize
      .replace(/our$/, "or").replace(/ours$/, "ors")                                   // colour -> color
      .replace(/tre$/, "ter").replace(/tres$/, "ters")                                 // centre -> center
      .replace(/ll(ed|ing)$/, "l$1");                                                  // modelled -> modeled
    if (w.length <= 3) return w;
    const rules = [["ational", "ate"], ["ization", "ize"], ["izations", "ize"], ["ations", "ate"], ["ation", "ate"], ["ness", ""], ["ments", ""], ["ment", ""],
      ["ingly", ""], ["edly", ""], ["ing", ""], ["ies", "y"], ["ied", "y"], ["ed", ""], ["es", ""], ["ly", ""], ["s", ""], ["e", ""]];
    for (const [suf, rep] of rules) {
      if (w.endsWith(suf) && w.length - suf.length >= 3) { w = w.slice(0, -suf.length) + rep; break; }
    }
    if (/([b-df-hj-np-tv-z])\1$/.test(w) && !/(ll|ss|zz)$/.test(w)) w = w.slice(0, -1); // running -> run
    return w;
  }
  function tokens(text) {
    return normalise(text).split(/\s+/).filter(Boolean).flatMap((t) => (NUMBER_WORDS[t] && t.length > 3 ? [NUMBER_WORDS[t]] : [t]));
  }
  // Content tokens with their stems; negators kept so red flags can check them.
  function analyse(text) {
    const toks = tokens(text).filter((t) => !FILLER.has(t));
    return toks.map((t) => ({ raw: t, stem: stem(t) }));
  }
  const phraseStems = (phrase) => tokens(phrase).filter((t) => !FILLER.has(t)).map(stem);

  // Find a phrase: its stems in order, with up to 2 extra tokens in between.
  function findPhrase(seq, ph) {
    if (!ph.length) return -1;
    const maxSpan = ph.length + 2;
    for (let i = 0; i < seq.length; i++) {
      if (!matchStem(seq[i].stem, ph[0])) continue;
      let k = 1, j = i + 1;
      while (k < ph.length && j < seq.length && j - i < maxSpan) {
        if (matchStem(seq[j].stem, ph[k])) k++;
        j++;
      }
      if (k === ph.length) { lastSpanEnd = j; return i; }
    }
    return -1;
  }
  let lastSpanEnd = -1;
  function matchStem(a, b) {
    if (a === b) return true;
    if (b.endsWith("*")) return a.startsWith(b.slice(0, -1));
    return false;
  }
  function sentences(text) {
    return String(text || "").replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim()
      .split(/(?<=[.?!])\s+(?=["'A-Z0-9(])/).map((s) => s.replace(/^["']|["']$/g, "").trim()).filter((s) => s.length > 2);
  }
  const wordCount = (text) => (String(text || "").trim().match(/[A-Za-z0-9][A-Za-z0-9'.,%-]*/g) || []).length;

  // ---------------------------------------------------------------- rules
  function splitPhrases(s) { return String(s || "").split(";").map((p) => p.trim()).filter(Boolean); }

  function parseRules(text) {
    const rules = { points: [], flags: [], min_words: null };
    const errors = [];
    String(text || "").split(/\r?\n/).forEach((line, i) => {
      const l = line.trim();
      if (!l || l.startsWith("#")) return;
      const parts = l.split("|").map((p) => p.trim());
      const kind = parts[0].toUpperCase();
      if (kind === "E" || kind === "B") {
        if (!parts[1] || !parts[2]) return errors.push(`Line ${i + 1}: needs a label and at least one phrase`);
        rules.points.push({ type: kind, label: parts[1], phrases: splitPhrases(parts.slice(2).join("|")) });
      } else if (kind === "NUM") {
        rules.points.push({ type: "NUM", label: parts[1] || "A specific number from your study", phrases: [] });
      } else if (kind === "X") {
        if (!parts[1] || !parts[2]) return errors.push(`Line ${i + 1}: a red flag needs an explanation and phrases`);
        rules.flags.push({ explanation: parts[1], phrases: splitPhrases(parts.slice(2).join("|")) });
      } else if (kind === "MIN") {
        const n = parseInt(parts[1], 10);
        if (!n) return errors.push(`Line ${i + 1}: MIN needs a number`);
        rules.min_words = n;
      } else {
        errors.push(`Line ${i + 1}: start the line with E, B, NUM, X or MIN`);
      }
    });
    if (!errors.length && rules.points.length && !rules.points.some((p) => p.type !== "B")) errors.push("Add at least one essential point (E or NUM).");
    return { rules, errors };
  }

  function serializeRules(rules) {
    if (!rules) return "";
    const out = [];
    (rules.points || []).forEach((p) => out.push(p.type === "NUM" ? `NUM | ${p.label}` : `${p.type} | ${p.label} | ${(p.phrases || []).join("; ")}`));
    (rules.flags || []).forEach((f) => out.push(`X | ${f.explanation} | ${(f.phrases || []).join("; ")}`));
    if (rules.min_words) out.push(`MIN | ${rules.min_words}`);
    return out.join("\n");
  }

  function coerceRules(r) {
    if (!r) return null;
    if (typeof r === "string") { try { r = JSON.parse(r); } catch (_) { r = parseRules(r).rules; } }
    if (!r.points || !r.points.length) return null;
    return r;
  }

  // ---------------------------------------------------------------- marking
  function mark(question, answer) {
    const rules = coerceRules(question.marking_rules);
    const text = String(answer || "").trim();
    const seq = analyse(text);
    const words = wordCount(text);
    const expWords = wordCount(question.expected_answer);
    const minWords = (rules && rules.min_words) || Math.max(8, Math.min(25, Math.round(expWords * 0.2)));
    const answerSentences = sentences(text);
    const hasNumber = /\d/.test(normalise(text));

    let points = rules ? rules.points : autoPoints(question.expected_answer);
    const results = points.map((p) => {
      if (p.type === "NUM") return { ...p, covered: hasNumber, hit: null };
      let hit = null;
      for (const ph of p.phrases) { const st = phraseStems(ph); const at = findPhrase(seq, st); if (at >= 0) { hit = ph; break; } }
      return { ...p, covered: !!hit, hit };
    });
    const flagsHit = [];
    (rules ? rules.flags : []).forEach((f) => {
      for (const ph of f.phrases) {
        const st = phraseStems(ph);
        let at = findPhrase(seq, st);
        if (at >= 0) {
          const before = seq.slice(Math.max(0, at - 3), lastSpanEnd).map((t) => t.raw);
          if (before.some((w) => NEGATORS.has(w))) continue;
          flagsHit.push({ ...f, hit: ph });
          break;
        }
      }
    });

    const essentials = results.filter((r) => r.type !== "B");
    const bonus = results.filter((r) => r.type === "B");
    const essHit = essentials.filter((r) => r.covered).length;
    const bonusHit = bonus.filter((r) => r.covered).length;
    const tooShort = words < minWords;

    let verdict;
    const tooThin = words < Math.max(5, Math.round(minWords * 0.4));
    if (!text || tooThin || flagsHit.length || essHit === 0) verdict = "incorrect";
    else if (essHit === essentials.length && !tooShort) verdict = "correct";
    else verdict = "partially_correct";

    // Communication checks
    const lower = " " + normalise(text).replace(/\s+/g, " ") + " ";
    const rawLower = text.toLowerCase();
    const hedges = HEDGES.filter((h) => rawLower.includes(h) || lower.includes(" " + h + " "));
    const longest = answerSentences.reduce((m, s) => Math.max(m, wordCount(s)), 0);
    const opensWithCourtesy = COURTESY.test(text);
    const firstSeq = analyse(answerSentences.find((s) => !COURTESY.test(s) || wordCount(s) > 6) || "");
    const leadsWithAnswer = results.some((r) => r.type !== "NUM" && r.phrases.some((ph) => findPhrase(firstSeq, phraseStems(ph)) >= 0));
    const tooLong = expWords && words > expWords * 2.5 && words > 120;

    let communication = 60;
    if (answerSentences.length >= 2) communication += 10;
    if (opensWithCourtesy) communication += 10;
    if (leadsWithAnswer) communication += 10;
    if (longest <= 40) communication += 10; else communication -= 10;
    communication -= Math.min(20, hedges.length * 10);
    if (tooShort) communication -= 15;
    if (tooLong) communication -= 10;
    communication = Math.max(0, Math.min(100, text ? communication : 0));

    const accuracy = essentials.length ? Math.round((essHit / essentials.length) * 100) - flagsHit.length * 40 : 0;
    const completeness = results.length ? Math.round(((essHit + bonusHit) / results.length) * 100) : 0;

    // Feedback text
    const coveredLabels = results.filter((r) => r.covered).map((r) => r.label + (r.hit ? ` (you said "${r.hit}")` : ""));
    const missingEss = essentials.filter((r) => !r.covered);
    const missingBonus = bonus.filter((r) => !r.covered);
    const effective = answerSentences.filter((s) => {
      const sq = analyse(s);
      return results.some((r) => r.type !== "NUM" && r.phrases.some((ph) => findPhrase(sq, phraseStems(ph)) >= 0));
    }).slice(0, 3).map((s) => (s.length > 160 ? s.slice(0, 157) + "..." : s));

    const wrong = [];
    flagsHit.forEach((f) => wrong.push({ type: "misunderstanding", detail: `${f.explanation} (you wrote something like "${f.hit}").` }));
    missingEss.forEach((r) => wrong.push({ type: "missing", detail: `Essential point missing: ${r.label}.` }));
    if (tooShort && text) wrong.push({ type: "structure", detail: `Your answer has ${words} words. Aim for at least ${minWords} so the examiner hears the reason as well as the point.` });
    if (longest > 40) wrong.push({ type: "structure", detail: `One sentence runs to ${longest} words. Break long sentences up so the examiner can follow you.` });
    if (hedges.length) wrong.push({ type: "wording_or_tone", detail: `Avoid hedging words such as "${hedges.slice(0, 3).map((h) => h.replace(/\bi\b/g, "I")).join('", "')}". They make a correct answer sound unsure.` });
    if (tooLong) wrong.push({ type: "structure", detail: "Your answer is much longer than it needs to be. Give the direct answer and the key reason, then stop and let the examiner follow up." });
    if (text && !leadsWithAnswer && answerSentences.length > 1) wrong.push({ type: "structure", detail: "Your first sentence does not answer the question. Lead with the answer, then explain." });

    let assessment;
    if (verdict === "correct") assessment = `You covered all ${essentials.length} essential point${essentials.length === 1 ? "" : "s"}${bonus.length ? ` and ${bonusHit} of ${bonus.length} supporting point${bonus.length === 1 ? "" : "s"}` : ""}. That would satisfy an examiner.`;
    else if (!text) assessment = "No answer was given.";
    else if (flagsHit.length) assessment = "Your answer contains a statement that is wrong for this question, so it cannot count as correct. See \"Where you went wrong\".";
    else if (essHit === 0) assessment = "None of the essential points for this question appear in your answer.";
    else assessment = `You covered ${essHit} of ${essentials.length} essential points${tooShort && essHit === essentials.length ? ", but the answer is too short to show full understanding" : ""}. Add what is missing to make it a full answer.`;

    const improve = [];
    if (missingEss.length) improve.push(`Make sure you say: ${missingEss.map((r) => r.label.charAt(0).toLowerCase() + r.label.slice(1)).join("; ")}.`);
    if (missingBonus.length) improve.push(`To strengthen it, add: ${missingBonus.slice(0, 3).map((r) => r.label.charAt(0).toLowerCase() + r.label.slice(1)).join("; ")}.`);
    if (!opensWithCourtesy) improve.push('Open with a short courtesy such as "Thank you for the question." and then go straight to the answer.');
    improve.push("Compare your wording with the expected answer below and borrow its order: answer, reason, evidence.");

    return {
      marker: rules ? "rules" : "keywords",
      verdict,
      accuracy_score: Math.max(0, Math.min(100, accuracy)),
      completeness_score: Math.max(0, Math.min(100, completeness)),
      communication_score: communication,
      overall_assessment: assessment,
      what_you_got_right: coveredLabels.concat(opensWithCourtesy ? ["You opened with a courteous line before answering."] : [], leadsWithAnswer && answerSentences.length > 1 ? ["You led with the answer instead of background."] : []),
      effective_phrases: effective,
      where_you_went_wrong: wrong,
      missing_points: missingEss.map((r) => `${r.label} (essential)`).concat(missingBonus.map((r) => r.label)),
      how_to_improve: improve.join(" "),
      recommended_tone: question.tone || "Calm, confident and formal.",
      key_vocabulary: [...new Set(results.filter((r) => r.type !== "NUM" && r.phrases.length).map((r) => r.phrases[0]))].slice(0, 12),
      structure_tips: ["Courtesy line, one phrase only.", "Direct answer in one sentence.", "The reason, then evidence or a number from your study.", "Stop and let the examiner follow up."],
      learning_explanation: essentials.length
        ? `For this question an examiner listens for ${essentials.length} essential point${essentials.length === 1 ? "" : "s"}: ${essentials.map((r) => r.label.charAt(0).toLowerCase() + r.label.slice(1)).join("; ")}. ${bonus.length ? `Strong answers also mention: ${bonus.map((r) => r.label.charAt(0).toLowerCase() + r.label.slice(1)).join("; ")}.` : ""}`.trim()
        : "Compare your answer with the expected answer and make sure each of its main points appears in yours.",
      points: results.map((r) => ({ type: r.type, label: r.label, covered: r.covered })),
    };
  }

  // Fallback when a question has no rules: each sentence of the expected answer
  // becomes a bonus point and its two longest content words the phrase.
  function autoPoints(expected) {
    const ss = sentences(expected).slice(0, 6);
    const pts = ss.map((s) => {
      const words = tokens(s).filter((t) => !FILLER.has(t) && t.length > 4).sort((a, b) => b.length - a.length).slice(0, 2);
      return { type: "B", label: s.length > 90 ? s.slice(0, 87) + "..." : s, phrases: words };
    }).filter((p) => p.phrases.length);
    if (pts.length) pts[0].type = "E";
    return pts;
  }

  function lesson(question) {
    const rules = coerceRules(question.marking_rules);
    const ss = sentences(question.expected_answer);
    const points = rules ? rules.points.filter((p) => p.type !== "NUM") : [];
    return {
      marker: "rules",
      simple_explanation: points.length
        ? `An examiner wants to hear ${rules.points.filter((p) => p.type !== "B").length} essential point${rules.points.filter((p) => p.type !== "B").length === 1 ? "" : "s"} in this answer. They are listed below, followed by the order to say them in.`
        : "Read the expected answer once, then work through its points below in order.",
      key_points: points.length ? points.map((p) => (p.type === "E" ? "Essential: " : "Supporting: ") + p.label).concat(rules.points.filter((p) => p.type === "NUM").map((p) => "Essential: " + p.label)) : ss.slice(0, 6),
      structure: ['Open with a short courtesy, such as "Thank you for the question."', ss[0] ? `Give the direct answer first, for example: ${ss[0].replace(/^Thank you[^.]*\.\s*/i, "")}` : "Give the direct answer first.", "Add the reason and one piece of evidence from your study.", "Finish in one sentence and stop."],
      recommended_tone: question.tone || "Calm, confident and formal.",
      key_vocabulary: points.length ? [...new Set(points.map((p) => p.phrases[0]))].slice(0, 12) : [],
      example_delivery: question.expected_answer,
      common_mistakes: rules && rules.flags.length ? rules.flags.map((f) => f.explanation) : ["Starting with background instead of the answer.", "Reciting from memory word for word.", "Leaving out the number or example that proves the point."],
    };
  }

  const api = { mark, lesson, parseRules, serializeRules, coerceRules, _internal: { normalise, stem, analyse, phraseStems, findPhrase } };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TMMarker = api;
})(typeof window !== "undefined" ? window : globalThis);
