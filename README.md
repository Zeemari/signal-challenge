# SIGNAL

**Know what's known. See what's fresh.**

An AI layer for turning noisy community reports into transparent, time-sensitive signals — built for the K-Fest "Build Something That Helps" challenge.

## The problem

When something might be happening on a road home, people don't lack information — they're flooded with it. A cousin's WhatsApp forward, a neighbour's secondhand story, a vigilante group's radio call. The problem isn't detecting danger; it's that nobody can tell what's recent, what's firsthand, what's corroborated, and what's still just a rumour.

## What SIGNAL does

SIGNAL collects short community reports, uses AI to structure them (what happened, where, source type, urgency), and groups reports that may describe the same situation into a **Signal** — a transparent picture of what's known, not a verdict.

It never says a location is "safe" or "dangerous." It says things like:

> 4 reports have been received around Northern Road in the last 12 minutes. 2 are direct observations and 2 are second-hand. The reports appear to describe the same developing situation, but the nature of the activity has not been independently confirmed.

## Key features

- **Signal Fusion** — groups reports by location + time proximity into a single evolving picture, instead of a flat list.
- **Freshness** — every report and signal shows how old the information is (🟢 recent / 🟡 aging / ⚪ stale), never implying old = false.
- **Source transparency** — every report is tagged direct observation, secondhand, authority, WhatsApp, etc.
- **"Why this signal?"** — every signal shows the evidence checklist behind it (report counts, source mix, time window, what's still unconfirmed).
- **Conflicting reports handling** — when reports disagree, SIGNAL says so explicitly instead of picking a side.
- **Ask SIGNAL** — a constrained Q&A that answers only from stored reports, in a fixed structure (current picture / what supports this / what's unknown / last updated), so it can't drift into giving a safety verdict.

## AI architecture

All AI calls run server-side (Vercel functions in `/api`) so the API key never reaches the browser.

| Step | Where | What it does |
|---|---|---|
| Extraction | `api/submit-report.js` | Claude turns a raw report into structured JSON (summary, event type, entities, urgency) — instructed to never invent details not in the text |
| Clustering | `api/submit-report.js` | Heuristic: same normalized location + within a 30-minute window → same signal. No embeddings/vector search — deliberately simple for a 48-hour build |
| Classification | `api/submit-report.js` | Claude reviews all reports in a signal and returns a status (`emerging` / `corroborating` / `conflicting` / `unconfirmed`) + hedged summary + evidence bullets |
| Ask SIGNAL | `api/ask-signal.js` | Matches the question to a known signal by location keyword, then Claude answers strictly from that signal's reports in a fixed 4-part template |

AI is explicitly never used to judge whether a location is safe, invent report details, or resolve conflicting reports into one "truth."

## Tech stack

- Vue 3 + Vite
- Tailwind CSS v4
- Supabase (Postgres, via `@supabase/supabase-js`)
- Vercel (static hosting + serverless functions in `/api`)
- Anthropic Claude (`claude-haiku-4-5`) for extraction, classification, and Q&A

## Setup

1. **Create a Supabase project** at supabase.com. In the SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql` to load demo data.
2. **Copy env vars**: `cp .env.example .env.local` and fill in:
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — from Supabase project settings → API
   - `ANTHROPIC_API_KEY` — from console.anthropic.com (server-only, never exposed to the browser)
3. **Install & run**:
   ```
   npm install
   npm run dev          # frontend only, http://localhost:5173
   ```
   To test the `/api` serverless functions locally, use the Vercel CLI instead: `vercel dev`.
4. **Deploy**: push to GitHub, import into Vercel, add the same three env vars in the Vercel project settings.

## Limitations

- Clustering is a location+time heuristic, not semantic/embedding-based — two differently-worded reports about the same spot within 30 minutes will cluster; a report using unusual phrasing about a known location might not.
- Ask SIGNAL matches questions to locations by keyword substring, not full NLU — it only knows about locations that already have a signal.
- No auth — this is a public read/write prototype by design, not a production posture.
- No real-time push; the dashboard reflects state as of page load.

## What's next with more time

- Real-time updates via Supabase Realtime subscriptions
- Embedding-based semantic similarity as a second clustering pass, for reports that describe the same event without sharing exact location text
- A lightweight trust signal for repeat/reliable reporters, without building full accounts
- Push notifications when a new report lands near a location the user cares about

## Disclaimer

SIGNAL organizes community reports and does not independently verify every report. Use trusted local authorities and your own judgment for urgent safety decisions.
