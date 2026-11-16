-- =====================================================================
-- Thesis Mastery: database schema, security policies and functions
-- Run this once in the Supabase SQL editor (or with `supabase db push`).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

create table if not exists public.categories (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  description text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.questions (
  id                  bigint generated always as identity primary key,
  category_id         bigint not null references public.categories(id) on delete restrict,
  number              int    not null,               -- display number, e.g. Q101
  level               text,                          -- Basic / Intermediate / Advanced
  question_text       text   not null,
  expected_answer     text   not null,               -- authoritative reference answer
  tone                text,                          -- required tone, if provided
  fallback_response   text,                          -- what to say if you do not know
  evaluation_criteria text,                          -- extra marking points, if provided
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (number)
);
create index if not exists questions_category_idx on public.questions(category_id);

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  role       text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_question_progress (
  user_id          uuid   not null references auth.users(id) on delete cascade,
  question_id      bigint not null references public.questions(id) on delete cascade,
  total_attempts   int    not null default 0,
  correct_attempts int    not null default 0,
  -- Status follows the correct-answer count. The count never goes down, so a
  -- mastered question stays mastered however many attempts follow.
  status text generated always as (
    case
      when correct_attempts >= 10 then 'mastered'
      when correct_attempts >= 5  then 'good_progress'
      when correct_attempts >= 1  then 'good_start'
      else 'not_started'
    end
  ) stored,
  last_attempted_at timestamptz,
  primary key (user_id, question_id)
);

create table if not exists public.practice_attempts (
  id                  bigint generated always as identity primary key,
  user_id             uuid   not null references auth.users(id) on delete cascade,
  question_id         bigint not null references public.questions(id) on delete cascade,
  client_request_id   uuid   not null,                -- makes repeated submissions idempotent
  submitted_answer    text   not null,
  verdict             text   not null check (verdict in ('correct', 'partially_correct', 'incorrect')),
  accuracy_score      int,
  completeness_score  int,
  communication_score int,
  tone_feedback       text,
  mistakes            jsonb  not null default '[]'::jsonb,
  improvements        jsonb  not null default '[]'::jsonb,
  feedback            jsonb  not null,                -- the full structured feedback
  correct_count_after int    not null,
  total_count_after   int    not null,
  status_after        text   not null,
  created_at          timestamptz not null default now(),
  unique (user_id, client_request_id)
);
create index if not exists attempts_user_time_idx on public.practice_attempts(user_id, created_at desc);
create index if not exists attempts_user_question_idx on public.practice_attempts(user_id, question_id, created_at desc);

-- ---------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists questions_touch on public.questions;
create trigger questions_touch before update on public.questions
  for each row execute function public.touch_updated_at();

-- Create a profile row for every new account.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Stop ordinary users from promoting themselves to admin.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  -- auth.uid() is null for the SQL editor and the service role, which may
  -- change roles; signed-in app users may not unless they are admins.
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an administrator can change roles';
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------
-- 3. Recording an attempt (atomic)
-- Called only by the evaluate-answer Edge Function with the service-role
-- key, after the AI has marked the answer. The row lock on the progress
-- record and the unique client_request_id stop double counting when the
-- same answer is submitted twice.
-- ---------------------------------------------------------------------

create or replace function public.record_attempt(
  p_user_id uuid,
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
  p_feedback jsonb
)
returns public.practice_attempts
language plpgsql security definer set search_path = public
as $$
declare
  existing public.practice_attempts;
  prog     public.user_question_progress;
  result   public.practice_attempts;
begin
  -- Same submission sent twice: return the first result unchanged.
  select * into existing from public.practice_attempts
   where user_id = p_user_id and client_request_id = p_client_request_id;
  if found then
    return existing;
  end if;

  insert into public.user_question_progress (user_id, question_id)
  values (p_user_id, p_question_id)
  on conflict (user_id, question_id) do nothing;

  update public.user_question_progress
     set total_attempts    = total_attempts + 1,
         correct_attempts  = correct_attempts + case when p_verdict = 'correct' then 1 else 0 end,
         last_attempted_at = now()
   where user_id = p_user_id and question_id = p_question_id
  returning * into prog;

  insert into public.practice_attempts (
    user_id, question_id, client_request_id, submitted_answer, verdict,
    accuracy_score, completeness_score, communication_score, tone_feedback,
    mistakes, improvements, feedback,
    correct_count_after, total_count_after, status_after)
  values (
    p_user_id, p_question_id, p_client_request_id, p_answer, p_verdict,
    p_accuracy, p_completeness, p_communication, p_tone_feedback,
    coalesce(p_mistakes, '[]'::jsonb), coalesce(p_improvements, '[]'::jsonb), p_feedback,
    prog.correct_attempts, prog.total_attempts, prog.status)
  returning * into result;

  return result;
exception when unique_violation then
  -- A parallel request with the same client_request_id won the race.
  select * into existing from public.practice_attempts
   where user_id = p_user_id and client_request_id = p_client_request_id;
  return existing;
end $$;

revoke all on function public.record_attempt(uuid, bigint, uuid, text, text, int, int, int, text, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.record_attempt(uuid, bigint, uuid, text, text, int, int, int, text, jsonb, jsonb, jsonb) to service_role;

-- Category statistics for the signed-in user, computed in the database.
create or replace function public.category_stats()
returns table (category_id bigint, name text, description text, total bigint, attempted bigint, mastered bigint)
language sql stable security invoker set search_path = public
as $$
  select c.id, c.name, c.description,
         count(q.id),
         count(p.question_id) filter (where p.total_attempts > 0),
         count(p.question_id) filter (where p.status = 'mastered')
    from public.categories c
    left join public.questions q on q.category_id = c.id
    left join public.user_question_progress p
           on p.question_id = q.id and p.user_id = auth.uid()
   group by c.id
   order by c.sort_order, c.id;
$$;

-- ---------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------

alter table public.categories             enable row level security;
alter table public.questions              enable row level security;
alter table public.profiles               enable row level security;
alter table public.user_question_progress enable row level security;
alter table public.practice_attempts      enable row level security;

-- Categories and questions: everyone signed in can read; only admins write.
drop policy if exists categories_read  on public.categories;
drop policy if exists categories_write on public.categories;
create policy categories_read  on public.categories for select to authenticated using (true);
create policy categories_write on public.categories for all    to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists questions_read  on public.questions;
drop policy if exists questions_write on public.questions;
create policy questions_read  on public.questions for select to authenticated using (true);
create policy questions_write on public.questions for all    to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Profiles: users see and edit their own; admins can see all.
drop policy if exists profiles_self_read   on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_read   on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Progress and attempts: users read only their own rows. Writes go through
-- record_attempt (service role), so a user cannot mark their own answer
-- correct from the browser.
drop policy if exists progress_self_read on public.user_question_progress;
create policy progress_self_read on public.user_question_progress for select to authenticated
  using (user_id = auth.uid());

drop policy if exists attempts_self_read on public.practice_attempts;
create policy attempts_self_read on public.practice_attempts for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 5. Default categories (the three parts of the defence question bank)
-- ---------------------------------------------------------------------

insert into public.categories (name, description, sort_order) values
  ('General non-tech', 'General questions any examiner could ask about any study.', 1),
  ('General tech',     'General questions for technical and machine learning research.', 2),
  ('Survival',         'Questions on survival prediction for ICU patients with NCDs.', 3)
on conflict (name) do nothing;

-- To make yourself an administrator, sign up in the app first, then run:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
