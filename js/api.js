// Thesis Mastery data layer backed by Supabase.
// app.js talks to this object or to the demo layer (demo-api.js) can
// stand in for this one with the same interface.
(function () {
  const cfg = window.THESIS_MASTERY_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.startsWith("YOUR_") && !cfg.SUPABASE_ANON_KEY.startsWith("YOUR_");
  const forceDemo = new URLSearchParams(location.search).has("demo");
  if (!configured || forceDemo || !window.supabase) {
    window.TMSupabaseApi = null;
    return;
  }

  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const must = ({ data, error }) => {
    if (error) throw new Error(error.message || "Request failed");
    return data;
  };

  async function invoke(body) {
    const { data, error } = await sb.functions.invoke("evaluate-answer", { body });
    if (error) {
      let message = error.message || "The evaluation service could not be reached.";
      try {
        const res = error.context;
        if (res && typeof res.json === "function") {
          const payload = await res.json();
          if (payload && payload.error) message = payload.error;
        }
      } catch (_) { /* keep the default message */ }
      const err = new Error(message);
      err.retryable = true;
      throw err;
    }
    if (data && data.error) throw new Error(data.error);
    return data;
  }

  const QUESTION_LIST_COLUMNS = "id, category_id, number, level, question_text";
  const useAI = String(cfg.MARKING || "rules").toLowerCase() === "ai";

  // Full question for marking: fetched only when an answer is checked or
  // Teach Me is pressed, so lists never carry expected answers.
  async function questionForMarking(id) {
    const q = must(await sb.from("questions")
      .select("id, number, expected_answer, tone, fallback_response, evaluation_criteria, marking_rules")
      .eq("id", id).maybeSingle());
    if (!q) throw new Error("Question not found.");
    return q;
  }
  const referenceOf = (q) => ({ expected_answer: q.expected_answer, tone: q.tone, fallback_response: q.fallback_response });

  window.TMSupabaseApi = {
    mode: "supabase",
    marking: useAI ? "ai" : "rules",

    // ---------------- auth
    async getSession() {
      const { data } = await sb.auth.getSession();
      return data.session;
    },
    onAuthChange(cb) {
      sb.auth.onAuthStateChange((event, session) => cb(event, session));
    },
    async signIn(email, password) {
      must(await sb.auth.signInWithPassword({ email, password }));
    },
    async signUp(fullName, email, password) {
      const data = must(await sb.auth.signUp({
        email, password,
        options: { data: { full_name: fullName }, emailRedirectTo: location.origin + location.pathname },
      }));
      return { needsConfirmation: !data.session };
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async sendReset(email) {
      must(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }));
    },
    async updatePassword(password) {
      must(await sb.auth.updateUser({ password }));
    },

    // ---------------- profile
    async getProfile() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return null;
      const profile = must(await sb.from("profiles").select("*").eq("id", user.id).maybeSingle());
      return profile || { id: user.id, email: user.email, full_name: "", role: "user", created_at: user.created_at };
    },
    async updateProfile(fields) {
      const { data: { user } } = await sb.auth.getUser();
      must(await sb.from("profiles").update({ full_name: fields.full_name }).eq("id", user.id));
    },

    // ---------------- question bank (expected answers are never fetched for lists)
    async listCategories() {
      return must(await sb.from("categories").select("id, name, description, sort_order").order("sort_order").order("id"));
    },
    async listQuestions() {
      const rows = [];
      const page = 1000;
      for (let from = 0; ; from += page) {
        const batch = must(await sb.from("questions").select(QUESTION_LIST_COLUMNS).order("number").range(from, from + page - 1));
        rows.push(...batch);
        if (batch.length < page) break;
      }
      return rows;
    },
    async listProgress() {
      return must(await sb.from("user_question_progress").select("question_id, total_attempts, correct_attempts, status, last_attempted_at"));
    },
    async listAttempts({ questionId = null, limit = 20, offset = 0 } = {}) {
      let q = sb.from("practice_attempts").select("*").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      if (questionId) q = q.eq("question_id", questionId);
      return must(await q);
    },
    async getAttempt(id) {
      const attempt = must(await sb.from("practice_attempts").select("*").eq("id", id).maybeSingle());
      if (!attempt) return null;
      const q = must(await sb.from("questions").select("expected_answer, tone, fallback_response").eq("id", attempt.question_id).maybeSingle());
      return { attempt, reference: q || {} };
    },

    // ---------------- marking (rule-based by default, Claude when MARKING is "ai")
    async evaluate(questionId, answer, clientRequestId) {
      if (useAI) return invoke({ mode: "evaluate", question_id: questionId, answer, client_request_id: clientRequestId });
      const q = await questionForMarking(questionId);
      const fb = window.TMMarker.mark(q, answer);
      const attempt = must(await sb.rpc("record_rule_attempt", {
        p_question_id: questionId,
        p_client_request_id: clientRequestId,
        p_answer: answer,
        p_verdict: fb.verdict,
        p_accuracy: fb.accuracy_score,
        p_completeness: fb.completeness_score,
        p_communication: fb.communication_score,
        p_tone_feedback: fb.recommended_tone,
        p_mistakes: fb.where_you_went_wrong,
        p_improvements: fb.missing_points,
        p_feedback: fb,
        p_marker: fb.marker,
      }));
      return { attempt, reference: referenceOf(q) };
    },
    async teach(questionId) {
      if (useAI) return invoke({ mode: "teach", question_id: questionId });
      const q = await questionForMarking(questionId);
      return { lesson: window.TMMarker.lesson(q), reference: referenceOf(q) };
    },
    async overrideAttempt(attemptId) {
      return must(await sb.rpc("override_attempt", { p_attempt_id: attemptId }));
    },

    // ---------------- admin (RLS rejects these for non-admins)
    async listQuestionsFull() {
      const rows = [];
      for (let from = 0; ; from += 1000) {
        const batch = must(await sb.from("questions").select("*").order("number").range(from, from + 999));
        rows.push(...batch);
        if (batch.length < 1000) break;
      }
      return rows;
    },
    async saveCategory(cat) {
      const fields = { name: cat.name, description: cat.description || null, sort_order: Number(cat.sort_order) || 0 };
      if (cat.id) return must(await sb.from("categories").update(fields).eq("id", cat.id).select().single());
      return must(await sb.from("categories").insert(fields).select().single());
    },
    async saveQuestion(q) {
      const fields = {
        category_id: Number(q.category_id), number: Number(q.number), level: q.level || null,
        question_text: q.question_text, expected_answer: q.expected_answer, tone: q.tone || null,
        fallback_response: q.fallback_response || null, evaluation_criteria: q.evaluation_criteria || null,
        marking_rules: q.marking_rules || null,
      };
      if (q.id) return must(await sb.from("questions").update(fields).eq("id", q.id).select().single());
      return must(await sb.from("questions").insert(fields).select().single());
    },
    async deleteQuestion(id) {
      must(await sb.from("questions").delete().eq("id", id));
    },
    // rows: [{number, category_id, level, question_text, expected_answer, tone, fallback_response, evaluation_criteria, marking_rules}]
    async importQuestions(rows) {
      const chunk = 200;
      let count = 0;
      for (let i = 0; i < rows.length; i += chunk) {
        const part = rows.slice(i, i + chunk);
        must(await sb.from("questions").upsert(part, { onConflict: "number" }));
        count += part.length;
      }
      return count;
    },
  };
})();
