# ALGAEU

ALGAEU is an Arabic RTL Business Development Intelligence platform for a contracting company. The application uses Next.js for the UI and the existing hosted Supabase project for authentication, operational data, queues, scheduled agents, logs, and enrichment state.

## Continue from a new computer

1. Install Git and Node.js 24 or a currently supported Node.js release.
2. Clone the repository and check out the working branch:

   ```bash
   git clone https://github.com/wallo-cyber/AJ-EDGE.git
   cd AJ-EDGE
   git checkout codex/aj-edge-mvp
   cd app
   npm ci
   ```

3. Copy `app/.env.example` to `app/.env.local` and provide these values locally:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=<project URL>
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
   TAVILY_API_KEY=<local Tavily key, only when testing Tavily locally>
   ```

   Never commit `.env.local`. The hosted Edge Function reads `TAVILY_API_KEY` from Supabase Edge Function Secrets, not from Git or the browser.

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`, then sign in with the same Supabase account. The companies, CRM records, agent state, progress, results, and logs will load from Supabase.

The hosted internal Cron workers continue processing even when the browser and development computer are off. External research remains paused while Tavily quota is unavailable. A new computer must not recreate, import, or seed the existing production data.

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

- Business data is stored in Supabase tables protected by ownership-based RLS.
- Agent jobs retain status, payload, result, attempts, timestamps, and errors in `agent_jobs`.
- Executions and audit details persist in `agent_runs`, `agent_logs`, and `agent_errors`.
- Enrichment evidence, source URLs, and confidence are persisted in `company_intelligence` and the relevant company/contact fields.
- Duplicate open processing is prevented by the queue/enqueue guards; completed jobs are not recreated during a normal restart.
- Outreach is draft-only and requires manual approval. No automatic external sending is enabled.
- Secrets remain in `.env.local` or Supabase Edge Function Secrets and are excluded from Git.

See `PROJECT_STATUS.md` for the current operational handoff.
