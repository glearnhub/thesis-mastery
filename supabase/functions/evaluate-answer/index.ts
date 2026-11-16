// Thesis Mastery: AI evaluation and teaching, run as a Supabase Edge Function.
//
// POST /functions/v1/evaluate-answer
//   { mode: "evaluate", question_id, answer, client_request_id }  -> marks the answer and records the attempt
//   { mode: "teach",    question_id }                              -> explains the expected answer (no attempt recorded)
//
// Secrets (set with `supabase secrets set`):
//   ANTHROPIC_API_KEY   required
//   CLAUDE_MODEL        optional, defaults to claude-opus-5-5
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import Anthropic from "npm:@anthropic-ai/sdk@1.4.0";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const MODEL = Deno.env.get("CLAUDE_MODEL") ?? "claude-opus-5-5";
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ---------------------------------------------------------------- output schemas

const str = { type: "string" };
const strList = { type: "array", items: str };

const EVALUATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "verdict", "accuracy_score", "completeness_score", "communication_score",
    "overall_assessment", "what_you_got_right", "effective_phrases", "where_you_went_wrong",
    "missing_points", "how_to_improve", "recommended_tone", "key_vocabulary",
    "structure_tips", "learning_explanation",
  ],
  properties: {
    verdict: { type: "string", enum: ["correct", "partially_correct", "incorrect"] },
    accuracy_score: { type: "integer", description: "0 to 100: factual and conceptual accuracy" },
    completeness_score: { type: "integer", description: "0 to 100: coverage of the expected answer's key points" },
    communication_score: { type: "integer", description: "0 to 100: clarity, organisation, vocabulary, grammar and tone" },
    overall_assessment: { type: "string", description: "Two or three sentences explaining the verdict" },
    what_you_got_right: { ...strList, description: "Specific correct points and good techniques actually present in the answer" },
    effective_phrases: { ...strList, description: "Short quotes from the user's answer that worked well" },
    where_you_went_wrong: {
      type: "array",
      description: "Only weaknesses genuinely present in the answer",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "detail"],
        properties: {
          type: { type: "string", enum: ["incorrect", "missing", "misunderstanding", "structure", "wording_or_tone"] },
          detail: str,
        },
      },
    },
    missing_points: { ...strList, description: "Key points from the expected answer the user left out" },
    how_to_improve: { type: "string", description: "How to communicate the answer more effectively, with reference to the expected answer" },
    recommended_tone: { type: "string", description: "The tone to use and why" },
    key_vocabulary: { ...strList, description: "Important words and phrases to use" },
    structure_tips: { ...strList, description: "How to organise the answer, in order" },
    learning_explanation: { type: "string", description: "Why the recommended answer is better and what to understand from the question" },
  },
};

const TEACH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["simple_explanation", "key_points", "structure", "recommended_tone", "key_vocabulary", "example_delivery", "common_mistakes"],
  properties: {
    simple_explanation: { type: "string", description: "The answer explained in plain language" },
    key_points: { ...strList, description: "The most important points, broken into small pieces" },
    structure: { ...strList, description: "Step-by-step order in which to give the answer" },
    recommended_tone: str,
    key_vocabulary: { ...strList, description: "Words and phrases worth using" },
    example_delivery: { type: "string", description: "A short example of how to say the answer aloud in the defence room" },
    common_mistakes: { ...strList, description: "Mistakes candidates often make on this question" },
  },
};

// ---------------------------------------------------------------- prompts

const SYSTEM = `You are a senior research professor and a patient tutor helping an MSc candidate prepare for a thesis defence.
The thesis is "Machine Learning Survival Prediction for ICU Patients with Non-Communicable Diseases" (MIMIC-IV, Cox / random survival forest / XGBoost, general vs disease-specific vs transfer learning approaches).

Rules:
- The EXPECTED ANSWER supplied with each question is the authoritative reference. Never replace it, contradict it, or invent a different model answer.
- Judge meaning, not wording. A spoken answer in the candidate's own words that covers the same key points is correct.
- Some expected answers contain coaching in square brackets such as "[Use your final result here]" or "[state which]". These mark places where the candidate must supply their own results. Do not mark the candidate down for giving specific numbers you cannot check; do mark them down if they skip the point entirely.
- Use the TONE guidance when it is supplied. If it is missing, recommend a tone suited to a formal defence.
- Write feedback in British English, addressed to the candidate as "you". Be specific, constructive and educational. Quote the candidate's own words when praising or correcting them.
- Only list weaknesses that are really present.

Verdict rules:
- "correct": the main points of the expected answer are present and accurate, nothing important is wrong, and the answer would satisfy an examiner. Minor omissions or style issues are allowed.
- "partially_correct": some key points are right, but important points are missing or a secondary point is wrong.
- "incorrect": the answer is fundamentally wrong, irrelevant, empty of substance, or shows the concept was not understood.`;

function questionBlock(q: Record<string, unknown>) {
  return [
    `CATEGORY: ${q.category_name ?? ""}`,
    `QUESTION ${q.number}${q.level ? ` (${q.level})` : ""}: ${q.question_text}`,
    `EXPECTED ANSWER:\n${q.expected_answer}`,
    q.tone ? `TONE GUIDANCE: ${q.tone}` : "TONE GUIDANCE: none supplied",
    q.fallback_response ? `IF THE CANDIDATE DOES NOT KNOW (guidance): ${q.fallback_response}` : "",
    q.evaluation_criteria ? `EXTRA MARKING CRITERIA: ${q.evaluation_criteria}` : "",
  ].filter(Boolean).join("\n\n");
}

async function callClaude(userText: string, schema: Record<string, unknown>) {
  const response = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: userText }],
  });
  if (response.stop_reason === "refusal") {
    throw new Error("The AI declined to evaluate this answer. Please rephrase and try again.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("The feedback was cut off. Please try again.");
  }
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text);
}

const clampScore = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

// ---------------------------------------------------------------- handler

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Please sign in again." }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const { mode, question_id, answer, client_request_id } = body ?? {};
    if (!question_id || !["evaluate", "teach"].includes(mode)) return json({ error: "Invalid request." }, 400);

    const { data: q, error: qError } = await admin
      .from("questions")
      .select("id, number, level, question_text, expected_answer, tone, fallback_response, evaluation_criteria, categories(name)")
      .eq("id", question_id)
      .single();
    if (qError || !q) return json({ error: "Question not found." }, 404);
    const question = { ...q, category_name: (q as any).categories?.name };
    const reference = {
      expected_answer: q.expected_answer,
      tone: q.tone,
      fallback_response: q.fallback_response,
    };

    // ---- Teach me: explain the expected answer, record nothing.
    if (mode === "teach") {
      const lesson = await callClaude(
        `${questionBlock(question)}\n\nThe candidate pressed "I don't know - teach me". Teach them this answer from the expected answer above: explain it simply, break it into small points, show how to structure it, the tone, the key vocabulary, and give a short example of how to say it aloud. Stay faithful to the expected answer.`,
        TEACH_SCHEMA,
      );
      return json({ lesson, reference });
    }

    // ---- Evaluate.
    const trimmed = typeof answer === "string" ? answer.trim() : "";
    if (!trimmed) return json({ error: "Please write an answer before checking it." }, 400);
    if (trimmed.length > 20000) return json({ error: "That answer is too long to evaluate (20,000 characters maximum)." }, 400);
    if (typeof client_request_id !== "string" || !/^[0-9a-f-]{36}$/i.test(client_request_id)) {
      return json({ error: "Invalid request id." }, 400);
    }

    // Already evaluated (double click or retry after a network drop): return the stored result.
    const { data: prior } = await admin
      .from("practice_attempts")
      .select("*")
      .eq("user_id", user.id)
      .eq("client_request_id", client_request_id)
      .maybeSingle();
    if (prior) return json({ attempt: prior, reference });

    const evaluation = await callClaude(
      `${questionBlock(question)}\n\nCANDIDATE'S ANSWER:\n"""\n${trimmed}\n"""\n\nEvaluate the candidate's answer against the expected answer and return the structured feedback.`,
      EVALUATION_SCHEMA,
    );
    if (!["correct", "partially_correct", "incorrect"].includes(evaluation.verdict)) {
      throw new Error("The evaluation came back incomplete. Please try again.");
    }

    const { data: attempt, error: rpcError } = await admin.rpc("record_attempt", {
      p_user_id: user.id,
      p_question_id: q.id,
      p_client_request_id: client_request_id,
      p_answer: trimmed,
      p_verdict: evaluation.verdict,
      p_accuracy: clampScore(evaluation.accuracy_score),
      p_completeness: clampScore(evaluation.completeness_score),
      p_communication: clampScore(evaluation.communication_score),
      p_tone_feedback: evaluation.recommended_tone ?? null,
      p_mistakes: evaluation.where_you_went_wrong ?? [],
      p_improvements: evaluation.missing_points ?? [],
      p_feedback: evaluation,
    });
    if (rpcError) throw new Error(`Could not save your attempt: ${rpcError.message}`);

    return json({ attempt, reference });
  } catch (err) {
    console.error(err);
    const status = err instanceof Anthropic.RateLimitError ? 429 : 502;
    const message = err instanceof Anthropic.RateLimitError
      ? "The AI service is busy. Wait a moment and try again; your answer is still in the box."
      : err instanceof Anthropic.APIError
      ? "The AI service could not be reached. Your answer has not been lost; please try again."
      : (err as Error).message || "Something went wrong.";
    return json({ error: message }, status);
  }
});
