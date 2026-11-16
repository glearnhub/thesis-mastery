# Thesis Mastery

A web app for practising the 200 defence questions with AI feedback. You type an answer. Claude marks it against the stored expected answer and explains what you got right, what you missed, and how to say it better. Every question then climbs from Good Start to Good Progress to Mastered.

| Part | Where |
|---|---|
| Frontend (HTML, Tailwind, JavaScript) | `index.html`, `css/`, `js/` |
| Database schema, Row Level Security, functions | `supabase/migrations/001_schema.sql` |
| The 200 questions | `supabase/seed/002_questions.sql` (also `data/questions.csv` and `data/questions.json`) |
| AI evaluation (Supabase Edge Function) | `supabase/functions/evaluate-answer/index.ts` |
| Seed generator | `scripts/build_seed.py` |

## Try it now (demo mode)

The app works before any setup. While `js/config.js` still holds the placeholder keys, it runs in **demo mode**:

- Accounts and progress are saved in your browser only.
- Answers are marked by a simple offline keyword checker, not the AI. The feedback is labelled "Demo checker, not AI".
- The first account you create is made an administrator, so you can try the Admin screens.

Serve the folder and open it in a browser:

```bash
cd thesis-mastery
```

```bash
python -m http.server 8080
```

Then open http://localhost:8080. Opening `index.html` straight from disk will not work, because the browser blocks loading `data/questions.json` from a `file://` page.

## Going live

### 1. Create the Supabase project

1. Sign up at https://supabase.com and create a new project. Note the database password.
2. Open **SQL Editor** and run the whole of `supabase/migrations/001_schema.sql`. This creates:
   - the tables;
   - the security policies;
   - the `record_attempt` function, which updates progress counts atomically;
   - the three categories.
3. In the SQL Editor, run `supabase/seed/002_questions.sql`. This loads the 200 questions with their expected answers, tone and "if you do not know" guidance. Running it again is safe: it updates existing questions in place.

### 2. Configure authentication

In **Authentication -> URL Configuration**:

- Set **Site URL** to where the app will live, for example `https://thesis-mastery.netlify.app`.
- Under **Redirect URLs**, add that address and `http://localhost:8080` for local testing.

Password-reset and confirmation emails return to these addresses. Email confirmation is on by default (**Authentication -> Providers -> Email**). Turn it off if you want accounts to work straight away.

### 3. Deploy the AI evaluation function

Install the Supabase CLI (https://supabase.com/docs/guides/cli), then from the `thesis-mastery` folder:

```bash
supabase login
```

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

```bash
supabase secrets set ANTHROPIC_API_KEY=your-anthropic-api-key
```

```bash
supabase functions deploy evaluate-answer
```

Get an Anthropic API key at https://console.anthropic.com. The key only ever lives in Supabase's secret store and is never sent to the browser.

The function uses Claude Opus 5.5 (`claude-opus-5-5`) at medium effort. To use a different model, set it as a secret, for example:

```bash
supabase secrets set CLAUDE_MODEL=claude-sonnet-5-5
```

Server-side refusal fallback is switched on (`fallbacks: "default"`). If Claude declines a request, the API retries it on a fallback model automatically, so a refusal rarely reaches the user.

### 4. Point the frontend at your project

In **Project Settings -> API**, copy the **Project URL** and the **anon public** key into `js/config.js`:

```js
window.THESIS_MASTERY_CONFIG = {
  SUPABASE_URL: "https://abcd1234.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi...",
};
```

The anon key is safe in frontend code, because Row Level Security decides what it can do. Never put the service-role key or the Anthropic key in this file.

### 5. Make yourself an administrator

Register in the app, then run this in the SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Sign out and back in. An **Admin** item appears in the menu.

### 6. Host it

The frontend is static files, so any static host works:

- **Netlify:** drag the `thesis-mastery` folder onto https://app.netlify.com/drop.
- **Vercel:** import the `glearnhub/thesis-mastery` repository, set **Framework Preset** to **Other**, and leave the root directory, build command and output directory at their defaults. Or run `vercel` inside the folder.
- **GitHub Pages:** publish the folder from a repository.

Add the hosted address to Supabase's redirect URLs (step 2).

## How it works

**Marking.** The browser sends your answer to the `evaluate-answer` function, together with your login token. The function:

1. checks the token;
2. reads the question and its expected answer;
3. asks Claude for structured feedback against that answer;
4. saves the attempt through `record_attempt`.

Users cannot write to their progress tables directly, so nobody can mark their own answer correct from the browser.

**Repeated clicks.** Each answer carries a request id. If the same answer is submitted twice, through a double click or a retry after a network drop, the second request returns the first result and does not count again.

**Mastery.** Only answers marked **Correct** add to a question's correct count:

| Correct answers | Status |
|---|---|
| 0 | Not Started |
| 1–4 | Good Start |
| 5–9 | Good Progress |
| 10 or more | Mastered |

The count never goes down, so a mastered question stays mastered. Category progress counts only mastered questions.

**Teach Me.** This shows the expected answer and a simple lesson. It is never recorded as an attempt.

**Drafts.** The answer box saves a draft as you type. If the AI call fails, your answer stays in the box.

## Editing the questions

You can change questions in two ways:

- **In the app.** Go to **Admin -> Questions** to add, edit or delete a question. Go to **Admin -> Import & export** to upload a CSV or Excel file in the format of `data/questions.csv`, or to download the current bank.
- **From the source files.** Edit `scripts/source/qa_*.py`, then rebuild the seed files:

```bash
python scripts/build_seed.py
```

Then run `supabase/seed/002_questions.sql` again in the SQL Editor.

## Costs

Each Check My Response or Teach Me click is one Claude API call. With Opus 5.5 at medium effort, a typical evaluation reads about 2,000–3,000 tokens and writes a few thousand, including thinking. That comes to roughly 3 to 8 US cents per click; check the usage page in the Anthropic Console for real figures. Switching `CLAUDE_MODEL` to `claude-sonnet-5-5` halves the cost.
