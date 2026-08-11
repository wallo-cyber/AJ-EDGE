# ALGAEU

ALGAEU is an Arabic RTL Business Development Platform for a contracting company. It combines company qualification, CRM operations, outreach preparation, follow-ups, opportunities, reporting, and durable background agents on the existing Supabase project.

## Production status

- The Next.js production build, Supabase Authentication, ownership-based RLS, persistent queues, and internal Cron workers are operational.
- Supabase is the source of truth for companies, contacts, drafts, follow-ups, opportunities, agent jobs, runs, logs, results, attempts, and errors.
- All 11 agents run server-side in deterministic internal mode and continue when the browser or local computer is closed.
- Tavily-backed external research is paused safely while the external search quota is unavailable. Persisted research tasks are retained for later resume.
- External sending is disabled. Outreach remains draft and manual-approval only.
- The Arabic RTL workspace includes a collapsible responsive navigation, a Daily Command Center with live quick actions, Company 360, operational vendor registration, and a dedicated paginated queue for manual research.

## Run from a new computer

1. Install Git and Node.js 24 (or another release supported by Next.js 16).
2. Clone the repository and check out the production working branch:

   ```bash
   git clone https://github.com/wallo-cyber/AJ-EDGE.git
   cd AJ-EDGE
   git checkout codex/aj-edge-mvp
   cd app
   npm ci
   ```

3. Copy `app/.env.example` to `app/.env.local` and set only the local Supabase public values:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=<project URL>
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
   ```

   `app/.env.local` is ignored by Git. Never place a service-role key or any secret in frontend code. Tavily is currently paused and is not required to run the production application; its hosted secret remains server-side in Supabase Edge Function Secrets.

   For a local server-only continuity audit, optionally add `SUPABASE_SECRET_KEY` to the same ignored file and run `npm run audit:resume`. The audit never exposes the key and performs no writes unless explicitly started with its resume flag.

4. Start the application:

   ```bash
   npm run dev
   ```

   For stable production mode:

   ```bash
   npm run build
   npm start
   ```

5. Open `http://localhost:3000` and sign in with the existing Supabase account. The same persisted data, tasks, drafts, progress, and agent history will appear on every device.

Do not seed, recreate, or re-import the production data when moving to another computer.

## Verification

Run from `app/`:

```bash
npx tsc --noEmit
npm run lint
npm test
npm audit --audit-level=high
npm run build
npm run test:supabase
npm run audit:resume
```

## Persistence and safety

- All operational collections are stored in Supabase; browser storage is not a source of truth.
- `agent_jobs` persists owner, status, payload, result, attempts, timestamps, scheduling state, errors, and a stable idempotency key.
- `agent_runs`, `agent_logs`, and `agent_errors` persist execution and audit history.
- PGMQ and Supabase Cron provide durable server-side delivery and execution.
- Enqueue guards prevent duplicate active work and do not recreate completed work unless relevant source data has changed.
- External search and external sending can remain unavailable without breaking the CRM.
- Secrets are excluded from Git and are never rendered in the UI or logs.

See `PROJECT_STATUS.md` for the latest verified operational handoff.

## Operational workflow

The operational path is Company → data completion → verified decision maker → outreach preparation → recorded communication → follow-up → opportunity → proposal → result. Company lists, Company 360, Today, Research, Outreach, Pipeline, Agents, and Reports derive status from the same Supabase records and domain functions. Manual research groups tasks by company without deleting the underlying queue records. Internal agents remain usable without Tavily; external research is paused and external sending is disabled.

## V2 user experience

ALGAEU now opens into **Today**, a compact action inbox fed by persisted Supabase data. It explains what needs attention, why it matters, who is involved, and where to act next. The primary navigation follows the business-development journey; administrative tools are secondary. Reports is the analytics destination and keeps Ready, Contacted, Replied, and Opportunity aligned with the domain rules. The responsive shell uses a drawer on small screens, compact KPI grids, card fallbacks for data tables, correct RTL, and isolated LTR rendering for technical values.

External research remains paused and external sending remains disabled. No V2 interface action changes those safety controls.

## V1 consolidated workspaces

The primary product flow is now: Today → Companies → Contacts → Research → Outreach → Pipeline → Agents → Reports. Legacy deep links redirect to the matching workspace tab. The additive V1 migration documented in `audit/ALGAEU_V1_IMPLEMENTATION.md` is applied to production; it provides the protected communication-event ledger and supporting decision-maker, pipeline, and research fields.
