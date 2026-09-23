# SIGNAL

SIGNAL turns scattered community reports into a clear, time-stamped picture of what is being reported in a place, where it came from, and how much supports it.

> Signal doesn't tell you what to believe. It shows you what's known, where it came from, and how fresh it is.

Built for the K-Fest Tech Screening Challenge.

## The Problem

At 6:40 PM, Amara is closing her shop. Her cousin heard something on WhatsApp. A neighbour saw movement on the road. A local vigilante has information but no quick way to reach everyone.

Amara doesn't lack information. She has too much of it, and none of it comes with context. Is it firsthand or passed along? Did it happen ten minutes ago or yesterday? Does anyone else say the same thing, or does someone say the opposite? By the time reliable information reaches her, it may be too late, or a rumour may already have caused panic.

## What We Chose to Build

We didn't try to solve everything. We didn't build a danger detector, a safety score, or another broadcast channel.

We focused on one gap: the space between "someone reported something" and "what can I actually understand and trust from that?"

SIGNAL collects short reports, structures them with AI, groups the ones that seem to describe the same situation, and shows the result with its uncertainty left in. It never says a road is safe or dangerous.

## How We Approached the Challenge

Our first realisation was that "people need alerts" isn't really the problem. People already get information from WhatsApp, neighbours and local contacts. The problem is that the information is fragmented, hard to check, sometimes contradictory, and often stale by the time it lands. Another alert system would just add to the noise.

So we built around four ideas:

1. **Speed.** Information that arrives late is not much use, so people can subscribe to SMS alerts instead of refreshing a page.
2. **Context.** Every report keeps its source type and its age.
3. **Verification.** Reports can be reviewed by responders and admins, and reports from verified correspondents or named institutions are marked as such.
4. **Transparency.** Uncertainty and conflicting reports stay visible instead of being smoothed over.

AI is good at one thing here: turning messy human text into structured data. We deliberately stopped it there. It organises and summarises. It does not decide what's true.

## How SIGNAL Works

```
Someone submits a report (what, where, when, source type)
        ↓
AI extracts a summary, event type, entities and urgency
        ↓
The report is attached to a signal (same location, within a 30-minute window)
        ↓
AI reviews all reports in that signal and sets a status:
emerging / corroborating / conflicting / unconfirmed
        ↓
People see the picture: report counts, source mix, freshness, what's unknown
        ↓
Subscribers can get an SMS alert when a signal is corroborated
```

## Key Features

- **Community reports.** Citizens describe what they saw, pick a location from a Nigeria state / LGA / landmark picker (or suggest a new one), and say how they'd describe the situation. Reports are tagged by source type (direct observation, second-hand, community source, authority, and so on), because not every report deserves the same weight.
- **Signals.** Related reports are grouped into one evolving signal rather than a flat list.
- **Freshness.** Every signal and report shows how old it is. Old doesn't mean false, and we don't imply it does.
- **"Why this signal?"** Each signal shows the evidence behind it: how many reports, what kinds of source, over what time window, and what is still unconfirmed.
- **Conflicting reports.** If reports disagree, SIGNAL says so plainly and doesn't pick one.
- **Ask SIGNAL.** A chat where you can ask things like "What do we know about Northern Road?" The answer comes only from stored reports, in a fixed shape: current picture, what supports it, what is unknown, last updated.
- **SMS alerts.** Users can subscribe to a location or LGA and confirm their number with a code. Alerts go out when a signal is corroborated, or when a verified correspondent reports something (marked as not yet independently confirmed).
- **Responder actions.** Responders can update a signal's status and add notes, and get notified about dangerous reports.

## How AI Fits Into SIGNAL

We use DeepSeek (`deepseek-chat`), called only from server-side functions so the API key never reaches the browser.

| Step | File | What the AI does |
|---|---|---|
| Extraction | `api/submit-report.js` | Turns a raw report into structured JSON: summary, event type, entities, urgency. Told not to invent details that aren't in the text. |
| Classification | `api/submit-report.js` | Reviews the reports in a signal and returns a status, a hedged summary and evidence points. |
| Ask SIGNAL | `api/ask-signal.js` | Answers a question strictly from the reports stored for the matching location. |

Grouping reports into signals is not AI. It's a simple heuristic (same normalised location, within 30 minutes). We kept it simple on purpose.

**What the AI does not do:**

- It doesn't invent reports or details.
- It doesn't decide that an unverified report is true.
- It doesn't declare an area safe or dangerous.
- It doesn't replace trusted authorities or human judgment.

If the AI call fails, the app falls back to the plain report text and a generic "unconfirmed" status instead of breaking.

## Trust, Verification & Uncertainty

Being straight about this: SIGNAL does **not** independently confirm that events happened. Verification here means giving people the material to judge for themselves:

- **Source types** on every report.
- **Human review.** Responders and admins can review signals and set their status.
- **Trusted reporters.** Users can be flagged as verified correspondents, and responders can be attached to a named institution (police station, news outlet, NGO and so on). Their reports carry that attribution.
- **Visible conflict.** Disagreeing reports are shown as disagreeing.
- **Visible gaps.** Every summary lists what is still unknown.

We did not build automatic cross-checking against external news sources. That is a real limitation and it's on our list below.

## Admin Dashboard

Admins can see and manage who is using the system:

- Add users (with a password) and change roles between citizen, responder and admin.
- Activate or deactivate accounts, and set responder phone numbers and institutions.
- Manage the location hierarchy directly, and approve or reject locations suggested by the community.

Responders have their own workspace for reviewing pending locations and setting signal status. The point is to keep a person in the loop instead of leaving everything to the AI.

## Try the Demo

Live app: (https://signal-challenge-production.up.railway.app)

Sign in at `/login` with one of these pre-made test accounts. They exist only for judging and demos, so they hold no real data.

| Role | Email | Password | What to try |
|---|---|---|---|
| Admin | `demo.admin@signal-demo.com` | `SignalDemo#Admin1` | `/admin/users` to add users and change roles, `/admin/locations` to manage the location hierarchy and approve community-suggested areas |
| Responder | `demo.responder@signal-demo.com` | `SignalDemo#Responder1` | `/responder` to review pending locations and reports, verify or reject them, and set signal status |

No account is needed to browse signals, submit a report or use Ask SIGNAL. Anyone can also sign up at `/signup` as a citizen.

**A quick demo path:**
1. As a visitor, submit a report from `/report`. Try suggesting a new area, such as "Mopol junction".
2. Sign in as the responder, open `/responder`, approve the suggested location and verify the report.
3. Back on the home page, open the signal to see its freshness, source type and review status, then ask "What do we know about Mopol Junction?" in Ask SIGNAL.
4. Sign in as the admin and open `/admin/users` to see role management.

To recreate or reset these accounts in your own Supabase project (needs `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`):
```
npm run seed:demo
```

## Tech Stack

- **Frontend:** Vue 3, Vite, Tailwind CSS v4
- **Backend:** Serverless-style functions in `/api`, run by Vercel or by `server.js` on Railway and other Node hosts
- **Database and auth:** Supabase (Postgres, Supabase Auth, row-level security)
- **AI:** DeepSeek (active) or Anthropic Claude
- **SMS:** Sendchamp (Twilio kept as a legacy option)
- **Deployment:** Railway (`npm run build`, then `npm start`) or Vercel

## Getting Started

1. **Create a Supabase project.** In the SQL editor, run `supabase/schema.sql`, then each numbered migration in order (`002` through `011`), then optionally `supabase/seed.sql` for demo data.
2. **Create `.env`** from the example and fill it in (see below):
   ```
   cp .env.example .env
   ```
3. **Install and run:**
   ```
   npm install
   npm run dev
   ```
   `npm run dev` serves both the frontend and the `/api` functions.
4. **Make your first admin.** Sign up normally, copy your user ID from Supabase Authentication, and run this in the SQL editor:
   ```sql
   update public.profiles set role = 'admin' where id = '<YOUR_USER_UUID>';
   ```
5. **Create the demo accounts** (optional): `npm run seed:demo`.
6. **Deploy.**
   - **Railway (or any Node host):** build with `npm run build`, start with `npm start`. `server.js` serves the built app and routes `/api/*` to the functions. Without it, API calls return 405.
   - **Vercel:** import the repo. `/api` works out of the box.

   Either way, add the same environment variables in the host's settings. Your local `.env` is not used in production.

## Environment Variables

| Variable | Used for |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (browser) |
| `VITE_SUPABASE_ANON_KEY` | Supabase public key (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase key. Never prefix with `VITE_`. |
| `DEEPSEEK_API_KEY` | Server-only key for the AI (DeepSeek) |
| `SENDCHAMP_API_KEY`, `SENDCHAMP_SENDER_NAME`, `SENDCHAMP_SMS_ROUTE` | SMS alerts via Sendchamp |
| `ANTHROPIC_API_KEY` | Optional, legacy Claude key |
| `TWILIO_ACCOUNT_SID` | Twilio account |
| `TWILIO_AUTH_TOKEN` | Twilio auth |
| `TWILIO_FROM_NUMBER` | Number alerts are sent from, in `+234...` format with no spaces |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify service (starts with `VA`) for confirmation codes |

Don't commit `.env` or paste keys into issues or chats.

## Project Structure

```
api/                 Serverless functions
  _lib/              Shared helpers (Claude, auth, Supabase, SMS)
  sms/               SMS subscribe / confirm / unsubscribe
  submit-report.js   Report intake, AI extraction, signal grouping
  ask-signal.js      Ask SIGNAL
  update-signal.js   Responder status updates
  admin-*.js         User and location administration
src/
  views/             Pages (dashboard, report form, signal detail, admin, ...)
  components/        UI pieces (signal cards, chat, SMS modal, ...)
  lib/               Client helpers (auth, API, freshness, sources)
server.js           Production server (static files + /api) for Railway
scripts/            seed-demo-users.js creates the demo accounts
supabase/            Schema and numbered migrations
```

## Future Improvements

- Cross-checking reports against news and other verified sources, which is the biggest gap today.
- Stronger source credibility, so a reporter's track record counts for something.
- Better geographic grouping than matching on location text.
- More reliable real-time updates (the dashboard currently reflects the state at page load).
- Image and audio reports.
- Integration with verified local authorities.
- Testing with real communities, which we haven't been able to do.
- Better support for low connectivity and offline use.

## Safety Note

SIGNAL organises and gives context to community reports. It does not independently verify every report, and what it shows may be incomplete, outdated or wrong. For urgent safety decisions, rely on trusted local authorities and your own judgment.

Two practical notes on the current build: SMS alerts need a paid Twilio account to send free-form text (trial accounts only allow a small set of preset messages), and grouping is a simple location-and-time rule, so differently worded reports about the same place can end up in separate signals.

## Team

- Zainab Musa
- Victory Anyanwu

---

Signal doesn't tell you what to believe. It shows you what's known, where it came from, and how fresh it is.
