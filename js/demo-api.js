// Thesis Mastery DEMO data layer.
// Same interface as api.js, but everything lives in this browser's
// localStorage and answers are marked by a simple offline keyword checker,
// not by the AI. Used when js/config.js has no Supabase keys, or with ?demo=1.
(function () {
  const KEY = "tm_demo_v1";
  const STOP = new Set(("about above after again against because been before being below between both could " +
    "does doing down during each from further have having here into itself just more most other ought ourselves " +
    "over same should some such than that their them themselves then there these they this those through under " +
    "until very were what when where which while whom with would your yours yourself also only will shall said " +
    "thank question professor answer think state study using used make made many much well like").split(" "));

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; } };
  const save = (db) => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (_) { /* storage full or blocked */ } };
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const nowIso = () => new Date().toISOString();
  const statusFor = (c) => (c >= 10 ? "mastered" : c >= 5 ? "good_progress" : c >= 1 ? "good_start" : "not_started");

  async function hash(text) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (_) { return "plain:" + text.length; }
  }

  let listeners = [];
  const emit = (event) => { const s = currentSession(); listeners.forEach((cb) => cb(event, s)); };

  function currentSession() {
    const db = load();
    if (!db.session) return null;
    const u = (db.users || {})[db.session];
    return u ? { user: { id: u.id, email: u.email } } : null;
  }
  function me() {
    const db = load();
    const u = db.session && (db.users || {})[db.session];
    if (!u) throw new Error("Please sign in again.");
    return u;
  }

  async function ensureBank() {
    const db = load();
    if (db.questions && db.categories) return db;
    const res = await fetch("data/questions.json");
    if (!res.ok) throw new Error("Could not load the question bank (data/questions.json).");
    const rows = await res.json();
    const names = [...new Set(rows.map((r) => r.category))];
    const descriptions = {
      "General non-tech": "General questions any examiner could ask about any study.",
      "General tech": "General questions for technical and machine learning research.",
      "Survival": "Questions on survival prediction for ICU patients with NCDs.",
    };
    db.categories = names.map((n, i) => ({ id: i + 1, name: n, description: descriptions[n] || "", sort_order: i + 1 }));
    db.questions = rows.map((r, i) => ({
      id: i + 1, category_id: names.indexOf(r.category) + 1, number: r.number, level: r.level,
      question_text: r.question_text, expected_answer: r.expected_answer, tone: r.tone,
      fallback_response: r.fallback_response, evaluation_criteria: r.evaluation_criteria || "",
    }));
    db.nextQuestionId = db.questions.length + 1;
    db.nextCategoryId = db.categories.length + 1;
    db.progress = db.progress || {};
    db.attempts = db.attempts || [];
    db.nextAttemptId = db.nextAttemptId || 1;
    save(db);
    return db;
  }

  // ---------------- offline checker
  const words = (t) => (t || "").toLowerCase().replace(/[^a-z0-9%.,\-\s]/g, " ").split(/\s+/)
    .map((w) => w.replace(/^[.,\-]+|[.,\-]+$/g, "")).filter(Boolean);
  const keywords = (t) => [...new Set(words(t).filter((w) => (w.length >= 5 && !STOP.has(w)) || /\d/.test(w)))];
  const sentences = (t) => (t || "").replace(/^"|"$/g, "").replace(/\[[^\]]*\]/g, "").split(/(?<=[.?!])\s+/)
    .map((s) => s.replace(/^"|"$/g, "").trim()).filter((s) => s.length > 12);
  const stem = (w) => w.replace(/(ing|ed|es|s)$/, "");

  function check(question, answer) {
    const expectedKw = keywords(question.expected_answer);
    const answerKw = new Set(keywords(answer).map(stem));
    const matched = expectedKw.filter((k) => answerKw.has(stem(k)));
    const coverage = expectedKw.length ? matched.length / expectedKw.length : 0;
    const answerWords = words(answer).length;
    const answerSentences = sentences(answer);

    let verdict = "incorrect";
    if (answerWords >= 8 && coverage >= 0.4) verdict = "correct";
    else if (answerWords >= 5 && coverage >= 0.18) verdict = "partially_correct";

    const avgLen = answerSentences.length ? answerWords / answerSentences.length : answerWords;
    let communication = 55;
    if (answerSentences.length >= 2) communication += 15;
    if (avgLen >= 8 && avgLen <= 30) communication += 15;
    if (/^(thank|that is|yes|good question)/i.test(answer.trim())) communication += 10;
    communication = Math.min(100, communication);

    const effective = answerSentences
      .filter((s) => keywords(s).filter((k) => expectedKw.map(stem).includes(stem(k))).length >= 2)
      .slice(0, 3).map((s) => (s.length > 140 ? s.slice(0, 137) + "..." : s));
    const missing = sentences(question.expected_answer)
      .filter((s) => keywords(s).filter((k) => answerKw.has(stem(k))).length === 0)
      .slice(0, 4);
    const wrong = [];
    if (missing.length) wrong.push({ type: "missing", detail: `You left out ${missing.length} point(s) that the expected answer makes; see "Missing points".` });
    if (answerSentences.length < 2 && answerWords > 0) wrong.push({ type: "structure", detail: "Your answer is a single sentence. Lead with the answer, then give the reason and the evidence." });
    if (answerWords < 8) wrong.push({ type: "incorrect", detail: "The answer is too short to show the examiner that you understand the point." });

    const pct = Math.round(coverage * 100);
    const feedback = {
      demo: true,
      verdict,
      accuracy_score: Math.min(100, Math.round(pct * 1.6)),
      completeness_score: Math.min(100, Math.round(pct * 1.8)),
      communication_score: communication,
      overall_assessment:
        `Demo checker (not AI): your answer used ${matched.length} of the ${expectedKw.length} key terms from the expected answer (${pct}%). ` +
        (verdict === "correct" ? "That is enough coverage to count as correct in demo mode."
          : verdict === "partially_correct" ? "Some key ideas are there, but important points are missing."
          : "Too few of the key ideas are present."),
      what_you_got_right: matched.length ? [`You used these key terms: ${matched.slice(0, 12).join(", ")}.`] : [],
      effective_phrases: effective,
      where_you_went_wrong: wrong,
      missing_points: missing,
      how_to_improve: "Compare your answer with the expected answer below. Open with a short courtesy, give the direct answer first, then the reason and one piece of evidence from your study.",
      recommended_tone: question.tone || "Calm, confident and formal.",
      key_vocabulary: expectedKw.filter((k) => !answerKw.has(stem(k))).slice(0, 10),
      structure_tips: ["Courtesy line, one phrase only.", "Direct answer in one sentence.", "Reason, then evidence or a number from your study.", "Stop and let the examiner follow up."],
      learning_explanation: "In demo mode the checker only counts key terms. Connect Supabase and the AI evaluator to get feedback on meaning, accuracy and tone.",
    };
    return feedback;
  }

  function lessonFor(q) {
    const s = sentences(q.expected_answer);
    return {
      demo: true,
      simple_explanation: "Demo mode (not AI): the expected answer is shown above. Read it once, then work through the points below in order.",
      key_points: s.slice(0, 6),
      structure: ["Start with a short courtesy such as \"Thank you for the question.\"", s[0] ? `Give the direct answer: ${s[0]}` : "Give the direct answer first.", "Add the reason and one piece of evidence.", "Finish in one sentence and stop."],
      recommended_tone: q.tone || "Calm, confident and formal.",
      key_vocabulary: keywords(q.expected_answer).slice(0, 12),
      example_delivery: q.expected_answer,
      common_mistakes: ["Starting with background instead of the answer.", "Reciting from memory word for word.", "Leaving out the number or example that proves the point."],
    };
  }

  const strip = (q) => ({ id: q.id, category_id: q.category_id, number: q.number, level: q.level, question_text: q.question_text });

  window.TMDemoApi = {
    mode: "demo",

    async getSession() { await ensureBank(); return currentSession(); },
    onAuthChange(cb) { listeners.push(cb); },
    async signIn(email, password) {
      await delay(300);
      const db = load();
      const u = (db.users || {})[email.toLowerCase()];
      if (!u || u.pw !== (await hash(password))) throw new Error("Invalid login credentials");
      db.session = u.email; save(db); emit("SIGNED_IN");
    },
    async signUp(fullName, email, password) {
      await delay(300);
      const db = load();
      db.users = db.users || {};
      const key = email.toLowerCase();
      if (db.users[key]) throw new Error("User already registered");
      const isFirst = Object.keys(db.users).length === 0;
      db.users[key] = { id: "demo-" + Date.now(), email: key, full_name: fullName, pw: await hash(password),
                        role: isFirst ? "admin" : "user", created_at: nowIso() };
      db.session = key; save(db); emit("SIGNED_IN");
      return { needsConfirmation: false };
    },
    async signOut() { const db = load(); delete db.session; save(db); emit("SIGNED_OUT"); },
    async sendReset() { await delay(300); /* nothing to send in demo mode */ },
    async updatePassword(password) {
      const db = load(); const u = db.users[me().email]; u.pw = await hash(password); save(db);
    },

    async getProfile() { const u = me(); return { id: u.id, email: u.email, full_name: u.full_name, role: u.role, created_at: u.created_at }; },
    async updateProfile(fields) { const db = load(); db.users[me().email].full_name = fields.full_name; save(db); },

    async listCategories() { const db = await ensureBank(); return db.categories.slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id); },
    async listQuestions() { const db = await ensureBank(); return db.questions.map(strip).sort((a, b) => a.number - b.number); },
    async listProgress() {
      const db = await ensureBank(); const uid = me().id;
      return Object.values(db.progress[uid] || {});
    },
    async listAttempts({ questionId = null, limit = 20, offset = 0 } = {}) {
      const db = await ensureBank(); const uid = me().id;
      return db.attempts.filter((a) => a.user_id === uid && (!questionId || a.question_id === questionId))
        .sort((a, b) => b.id - a.id).slice(offset, offset + limit);
    },
    async getAttempt(id) {
      const db = await ensureBank(); const uid = me().id;
      const attempt = db.attempts.find((a) => a.id === Number(id) && a.user_id === uid);
      if (!attempt) return null;
      const q = db.questions.find((x) => x.id === attempt.question_id) || {};
      return { attempt, reference: { expected_answer: q.expected_answer, tone: q.tone, fallback_response: q.fallback_response } };
    },

    async evaluate(questionId, answer, clientRequestId) {
      await delay(700);
      const trimmed = (answer || "").trim();
      if (!trimmed) throw new Error("Please write an answer before checking it.");
      const db = await ensureBank(); const uid = me().id;
      const q = db.questions.find((x) => x.id === questionId);
      if (!q) throw new Error("Question not found.");
      const reference = { expected_answer: q.expected_answer, tone: q.tone, fallback_response: q.fallback_response };
      const prior = db.attempts.find((a) => a.user_id === uid && a.client_request_id === clientRequestId);
      if (prior) return { attempt: prior, reference };

      const fb = check(q, trimmed);
      db.progress[uid] = db.progress[uid] || {};
      const p = db.progress[uid][questionId] || { question_id: questionId, total_attempts: 0, correct_attempts: 0 };
      p.total_attempts += 1;
      if (fb.verdict === "correct") p.correct_attempts += 1;
      p.status = statusFor(p.correct_attempts);
      p.last_attempted_at = nowIso();
      db.progress[uid][questionId] = p;
      const attempt = {
        id: db.nextAttemptId++, user_id: uid, question_id: questionId, client_request_id: clientRequestId,
        submitted_answer: trimmed, verdict: fb.verdict, accuracy_score: fb.accuracy_score,
        completeness_score: fb.completeness_score, communication_score: fb.communication_score,
        tone_feedback: fb.recommended_tone, mistakes: fb.where_you_went_wrong, improvements: fb.missing_points,
        feedback: fb, correct_count_after: p.correct_attempts, total_count_after: p.total_attempts,
        status_after: p.status, created_at: nowIso(),
      };
      db.attempts.push(attempt);
      save(db);
      return { attempt, reference };
    },
    async teach(questionId) {
      await delay(500);
      const db = await ensureBank();
      const q = db.questions.find((x) => x.id === questionId);
      if (!q) throw new Error("Question not found.");
      return { lesson: lessonFor(q), reference: { expected_answer: q.expected_answer, tone: q.tone, fallback_response: q.fallback_response } };
    },

    // ---------------- admin
    async listQuestionsFull() { const db = await ensureBank(); return db.questions.slice().sort((a, b) => a.number - b.number); },
    async saveCategory(cat) {
      const db = await ensureBank();
      if (db.categories.some((c) => c.name.toLowerCase() === cat.name.toLowerCase() && c.id !== cat.id)) throw new Error("A category with that name already exists.");
      if (cat.id) Object.assign(db.categories.find((c) => c.id === cat.id), { name: cat.name, description: cat.description, sort_order: Number(cat.sort_order) || 0 });
      else db.categories.push({ id: db.nextCategoryId++, name: cat.name, description: cat.description || "", sort_order: Number(cat.sort_order) || db.categories.length + 1 });
      save(db);
    },
    async saveQuestion(q) {
      const db = await ensureBank();
      const number = Number(q.number);
      if (db.questions.some((x) => x.number === number && x.id !== q.id)) throw new Error(`Question number ${number} is already used.`);
      const fields = { category_id: Number(q.category_id), number, level: q.level, question_text: q.question_text,
        expected_answer: q.expected_answer, tone: q.tone, fallback_response: q.fallback_response, evaluation_criteria: q.evaluation_criteria };
      if (q.id) Object.assign(db.questions.find((x) => x.id === q.id), fields);
      else db.questions.push({ id: db.nextQuestionId++, ...fields });
      save(db);
    },
    async deleteQuestion(id) {
      const db = await ensureBank();
      db.questions = db.questions.filter((x) => x.id !== id);
      db.attempts = db.attempts.filter((a) => a.question_id !== id);
      Object.values(db.progress).forEach((m) => delete m[id]);
      save(db);
    },
    async importQuestions(rows) {
      const db = await ensureBank();
      rows.forEach((r) => {
        const existing = db.questions.find((x) => x.number === Number(r.number));
        if (existing) Object.assign(existing, r, { id: existing.id });
        else db.questions.push({ id: db.nextQuestionId++, ...r });
      });
      save(db);
      return rows.length;
    },
  };
})();
