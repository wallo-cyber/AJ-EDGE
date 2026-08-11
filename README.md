# ALGAEU

ALGAEU is an Arabic RTL Business Development Intelligence platform for a contracting company. It combines company qualification, CRM operations, outreach preparation, follow-ups, opportunities, reporting, and durable background agents on the existing Supabase project.

## Production status

- The Next.js production build, Supabase Authentication, ownership-based RLS, persistent queues, and internal Cron workers are operational.
- Supabase is the source of truth for companies, contacts, drafts, follow-ups, opportunities, agent jobs, runs, logs, results, attempts, and errors.
- Internal agents run server-side and continue when the browser or local computer is closed.
- External research agents are paused safely while the external search quota is unavailable. Their persisted state is retained for later resume.
- External sending is disabled. Outreach remains draft and manual-approval only.

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
```

## Persistence and safety

- All operational collections are stored in Supabase; browser storage is not a source of truth.
- `agent_jobs` persists owner, status, payload, result, attempts, timestamps, scheduling state, and errors.
- `agent_runs`, `agent_logs`, and `agent_errors` persist execution and audit history.
- PGMQ and Supabase Cron provide durable server-side delivery and execution.
- Enqueue guards prevent duplicate active work and do not recreate completed work unless source data has changed.
- External search and external sending can remain unavailable without breaking the CRM.
- Secrets are excluded from Git and are never rendered in the UI or logs.

See `PROJECT_STATUS.md` for the latest verified operational handoff.
