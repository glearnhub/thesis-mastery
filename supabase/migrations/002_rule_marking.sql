-- =====================================================================
-- Thesis Mastery: rule-based marking
-- Run after 001_schema.sql, then run supabase/seed/questions.sql.
-- Safe to run more than once.
-- =====================================================================

-- Key points, red flags and minimum length used by the rule-based marker.
alter table public.questions add column if not exists marking_rules jsonb;

-- Which marker produced each attempt, and whether the user overrode it.
alter table public.practice_attempts add column if not exists marker text not null default 'ai'
  check (marker in ('ai', 'rules', 'keywords'));
alter table public.practice_attempts add column if not exists overridden boolean not null default false;

-- ---------------------------------------------------------------------
-- Record an attempt marked in the browser by the rule-based marker.
-- Runs as the signed-in user (auth.uid()), so users can only add attempts
-- to their own record. Same locking and idempotency as record_attempt.
-- ---------------------------------------------------------------------
create or replace function public.record_rule_attempt(
  p_question_id bigint,
  p_client_request_id uuid,
  p_answer text,
  p_verdict text,
  p_accuracy int,
  p_completeness int,
  p_communication int,
  p_tone_feedback text,
  p_mistakes jsonb,
  p_improvements jsonb,
  p_feedback jsonb,
  p_marker text default 'rules'
)
returns public.practice_attempts
language plpgsql security definer set search_path = public
as $$
declare
  uid      uuid := auth.uid();
  existing public.practice_attempts;
  prog     public.user_question_progress;
  result   public.practice_attempts;
begin
  if uid is null then raise exception 'Please sign in again.'; end if;
  if p_verdict not in ('correct', 'partially_correct', 'incorrect') then raise exception 'Invalid verdict'; end if;
  if coalesce(length(trim(p_answer)), 0) = 0 then raise exception 'Please write an answer before checking it.'; end if;
  if length(p_answer) > 20000 then raise exception 'That answer is too long (20,000 characters maximum).'; end if;
  if not exists (select 1 from public.questions where id = p_question_id) then raise exception 'Question not found.'; end if;

  select * into existing from public.practice_attempts
   where user_id = uid and client_request_id = p_client_request_id;
  if found then return existing; end if;

  insert into public.user_question_progress (user_id, question_id)
  values (uid, p_question_id)
  on conflict (user_id, question_id) do nothing;

  update public.user_question_progress
     set total_attempts    = total_attempts + 1,
         correct_attempts  = correct_attempts + case when p_verdict = 'correct' then 1 else 0 end,
         last_attempted_at = now()
   where user_id = uid and question_id = p_question_id
  returning * into prog;

  insert into public.practice_attempts (
    user_id, question_id, client_request_id, submitted_answer, verdict,
    accuracy_score, completeness_score, communication_score, tone_feedback,
    mistakes, improvements, feedback, marker,
    correct_count_after, total_count_after, status_after)
  values (
    uid, p_question_id, p_client_request_id, trim(p_answer), p_verdict,
    least(greatest(p_accuracy, 0), 100), least(greatest(p_completeness, 0), 100), least(greatest(p_communication, 0), 100),
    p_tone_feedback, coalesce(p_mistakes, '[]'::jsonb), coalesce(p_improvements, '[]'::jsonb), coalesce(p_feedback, '{}'::jsonb),
    case when p_marker in ('rules', 'keywords') then p_marker else 'rules' end,
    prog.correct_attempts, prog.total_attempts, prog.status)
  returning * into result;

  return result;
exception when unique_violation then
  select * into existing from public.practice_attempts
   where user_id = uid and client_request_id = p_client_request_id;
  return existing;
end $$;

revoke all on function public.record_rule_attempt(bigint, uuid, text, text, int, int, int, text, jsonb, jsonb, jsonb, text) from public, anon;
grant execute on function public.record_rule_attempt(bigint, uuid, text, text, int, int, int, text, jsonb, jsonb, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------
-- "Mark as correct": the user says the marker missed a correct answer.
-- Allowed once per attempt, only on the user's own attempts that are not
-- already correct. Adds one to the correct count.
-- ---------------------------------------------------------------------
create or replace function public.override_attempt(p_attempt_id bigint)
returns public.practice_attempts
language plpgsql security definer set search_path = public
as $$
declare
  uid  uuid := auth.uid();
  att  public.practice_attempts;
  prog public.user_question_progress;
begin
  if uid is null then raise exception 'Please sign in again.'; end if;

  select * into att from public.practice_attempts
   where id = p_attempt_id and user_id = uid
   for update;
  if not found then raise exception 'Attempt not found.'; end if;
  if att.verdict = 'correct' then return att; end if;

  update public.user_question_progress
     set correct_attempts = correct_attempts + 1
   where user_id = uid and question_id = att.question_id
  returning * into prog;

  update public.practice_attempts
     set verdict = 'correct',
         overridden = true,
         correct_count_after = prog.correct_attempts,
         status_after = prog.status,
         feedback = jsonb_set(feedback, '{verdict}', '"correct"')
   where id = att.id
  returning * into att;

  return att;
end $$;

revoke all on function public.override_attempt(bigint) from public, anon;
grant execute on function public.override_attempt(bigint) to authenticated;
