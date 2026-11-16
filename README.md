# Thesis Mastery

A web app for practising the 200 defence questions. You type an answer, and the app marks it against the key points of the stored expected answer. It tells you what you covered, what you missed and how to say it better. Every question then climbs from Good Start to Good Progress to Mastered.

Marking is **rule-based by default**: free, instant, and no API key needed. AI marking with Claude is an optional extra.

| Part | Where |
|---|---|
| Frontend (HTML, Tailwind, JavaScript) | `index.html`, `css/`, `js/` |
| Rule-based marker | `js/marker.js` |
| Database schema, Row Level Security, functions | `supabase/migrations/001_schema.sql`, `002_rule_marking.sql` |
| The 200 questions with their marking rules | `supabase/seed/questions.sql` (also `data/questions.csv` and `data/questions.json`) |
| Optional AI marking (Supabase Edge Function) | `supabase/functions/evaluate-answer/index.ts` |
| Question and rule sources, seed generator, rule tests | `scripts/` |

## Try it now (demo mode)

The app works before any setup. While `js/config.js` still holds the placeholder keys, it runs in **demo mode**:

- Accounts and progress are saved in your browser only.
- Answers are marked by the same rule-based marker as the live app.
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

1. Sign up at https://supabase.com and create a new project.
2. Open **SQL Editor** and run these three files in this order, each as its own query:
   1. `supabase/migrations/001_schema.sql`: the tables, security policies, progress functions and the three categories.
   2. `supabase/migrations/002_rule_marking.sql`: the marking-rules column and the functions that save rule-marked attempts and "mark as correct".
   3. `supabase/seed/questions.sql`: the 200 questions with expected answers, tone, "if you do not know" guidance and marking rules.

Running any of them again is safe.

**If you already ran an older setup:** if you loaded `001_schema.sql` and the old `002_questions.sql` before, just run `002_rule_marking.sql` and then `questions.sql`. Your existing progress is kept.

### 2. Configure authentication

In **Authentication -> URL Configuration**:

- Set **Site URL** to where the app will live, for example `https://thesis-mastery.vercel.app`.
- Under **Redirect URLs**, add that address followed by `/**`, and also `http://localhost:8080/**` for local testing.

Password-reset and confirmation emails return to these addresses. Email confirmation is on by default (**Authentication -> Providers -> Email**). Turn it off if you want accounts to work straight away.

### 3. Point the frontend at your project

In **Project Settings -> API**, copy the **Project URL** and the **anon public** key into `js/config.js`:

```js
window.THESIS_MASTERY_CONFIG = {
  SUPABASE_URL: "https://abcd1234.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi...",
  MARKING: "rules",
};
```

The anon key is safe in frontend code, because Row Level Security decides what it can do. Never put the service-role key or an Anthropic key in this file.

### 4. Make yourself an administrator

Register in the app, then run this in the SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Sign out and back in. An **Admin** item appears in the menu.

### 5. Host it

The frontend is static files, so any static host works:

- **Vercel:** import the `glearnhub/thesis-mastery` repository and set **Framework Preset** to **Other**. Leave the root directory, build command and output directory at their defaults.
- **Netlify:** drag the folder onto https://app.netlify.com/drop.
- **GitHub Pages:** publish the repository root.

Add the hosted address to Supabase's redirect URLs (step 2).

## How the rule-based marker works

Each question has a short list of **key points**, written from its expected answer:

- **Essential points:** all of them must be in your answer for it to count as Correct.
- **Supporting points:** they raise your completeness score but are not required.
- **Red flags:** common wrong statements, such as "censored means they died". If your answer contains one, it is marked Incorrect. A red flag is ignored when "not", "no", "never" or "without" comes just before it.
- **A minimum length:** a very short answer cannot be Correct.

Each point lists the phrases that count as making it. Matching ignores:

- capital letters;
- small words (the, a, of …);
- word endings (censor, censored and censoring all match);
- British and American spelling;
- number words, so "one year" matches "1 year".

A phrase still matches with a couple of extra words in between.

**Verdicts**

| Verdict | When |
|---|---|
| Correct | Every essential point is covered, there is no red flag, and the answer is long enough. Adds one to the question's correct count. |
| Partially Correct | Some essential points are covered. |
| Incorrect | No essential points are covered, a red flag appears, or the answer is too thin. |

The feedback also checks how you said it:

- whether you open with a courtesy and lead with the answer;
- sentence length;
- hedging words such as "maybe" and "I guess";
- an answer much longer than it needs to be.

**Mark as correct.** No rule list covers every way of saying something. If your answer was right but the marker missed your wording, press **My answer was right: mark as correct** under the answer. It adds one to the correct count, once per attempt. Use it honestly: it only affects your own progress.

**Teach Me** shows the expected answer, the key points it must contain, the order to say them in, the tone and the common mistakes. It is never recorded as an attempt.

## Editing questions and rules

**In the app (administrators):**

- **Admin -> Questions:** add, edit or delete a question. The editor has a **Marking rules** box and a **Test the rules** panel. Type a sample answer, or press **Try the expected answer**, to see how it would be marked before you save.
- **Admin -> Import & export:** upload a CSV or Excel file in the format of `data/questions.csv`, including a `marking_rules` column, or download the current bank.

**Rule format.** Write one rule per line:

```text
E   | The exact event time is unknown | do not know; unknown; exact event time
B   | In your study, censored at 365 days | 365
NUM | Gives the actual value from your results
X   | Censored does not mean the patient died | censored means they died
MIN | 15
```

- `E` is an essential point. `B` is a supporting point.
- `NUM` means the answer must contain a number. It counts as essential.
- `X` is a red flag.
- `MIN` sets the minimum number of words.

**From the source files.** The questions live in `scripts/source/qa_*.py` and the rules in `scripts/source/rules_*.py`. After editing them, run these three commands:

Rebuild the seed files:

```bash
python scripts/build_seed.py
```

Check that every expected answer still marks Correct and that nonsense answers mark Incorrect:

```bash
node scripts/test_rules.js
```

Check that each question's rules do not accept other questions' answers:

```bash
node scripts/cross_check.js
```

Then run `supabase/seed/questions.sql` again in the SQL Editor.

Three questions (160, 161, 163) have expected answers that are templates for your final results, such as "[Use your final result here]". The tests skip them. Once your results are in, update those expected answers and their rules.

## Optional: AI marking with Claude

AI marking judges meaning rather than phrases, and gives richer feedback on wording and tone. The AI also sees each question's key points. It costs money per answer: roughly 3 to 8 US cents per click with Claude Opus 5.5 at medium effort, by estimate. Check the Anthropic Console for real figures.

To switch it on:

1. Get an API key at https://console.anthropic.com.
2. Deploy the function from this folder with the Supabase CLI. No install is needed, because `npx` comes with Node.js.

Log in:

```bash
npx supabase@latest login
```

Create the CLI settings file:

```bash
npx supabase@latest init
```

Link the folder to your project:

```bash
npx supabase@latest link --project-ref YOUR_REF
```

Store your API key on Supabase's server:

```bash
npx supabase@latest secrets set ANTHROPIC_API_KEY=sk-ant-your-key
```

Deploy the function:

```bash
npx supabase@latest functions deploy evaluate-answer
```

If it says Docker is not running, add `--use-api` to the end of the last command.

3. In `js/config.js`, set `MARKING: "ai"`.

The key stays in Supabase's secret store and never reaches the browser.

- **Model:** the function uses `claude-opus-5-5`. To change it, run `npx supabase@latest secrets set CLAUDE_MODEL=claude-sonnet-5-5`.
- **Refusals:** server-side refusal fallback is on, so a declined request is retried on a fallback model.
- **Saving results:** with AI marking, attempts are saved by the server only.

## Other details

**Repeated clicks.** Each answer carries a request id. If the same answer is submitted twice, through a double click or a retry after a network drop, the second request returns the first result and does not count again.

**Mastery.** Only answers marked Correct add to a question's correct count:

| Correct answers | Status |
|---|---|
| 0 | Not Started |
| 1–4 | Good Start |
| 5–9 | Good Progress |
| 10 or more | Mastered |

The count never goes down, so a mastered question stays mastered. Category progress counts only mastered questions.

**Drafts.** The answer box saves a draft as you type. If saving fails, your answer stays in the box.

**Security.** Every user sees only their own attempts and progress. With rule-based marking the browser marks the answer, so a determined user could fake their own results. That only affects their own practice record. Questions and rules can be changed only by administrators.
