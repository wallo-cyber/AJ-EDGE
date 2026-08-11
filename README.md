# ALGAEU

## Business Development Intelligence Core

The evidence-first intelligence core derives a company lifecycle, explainable qualification gate, segment-specific target role, project/signal recommendation, and one next action from persisted Supabase facts. It never fabricates contacts, projects, values, or scope. Company segments remain views over one Companies table, external search can stay paused, and all outreach remains draft plus manual approval.

## Intelligence Expansion Phase 1

Phase 1 adds safe, Supabase-persisted segmentation fields, Business Directory contact intelligence, Sales Kit metadata, Campaign Center review audiences, and source-required Opportunity Radar records. The migration is additive and does not seed or alter production companies. Campaigns are manual-review only; default limits are 10 new companies and 15 follow-ups per day with a 14-day company interval. External search stays paused and external sending stays disabled.

ALGAEU is an Arabic RTL Business Development Platform for a contracting company. It combines company qualification, CRM operations, outreach preparation, follow-ups, opportunities, reporting, and durable background agents on the existing Supabase project.

## Production status

- The Next.js production build, Supabase Authentication, ownership-based RLS, persistent queues, and internal Cron workers are operational.
- Supabase is the source of truth for companies, contacts, drafts, follow-ups, opportunities, agent jobs, runs, logs, results, attempts, and errors.
- All 11 agents run server-side in deterministic internal mode and continue when the browser or local computer is closed.
- Tavily-backed external research is paused safely while the external search quota is unavailable. Persisted research tasks are retained for later resume.
- External sending is disabled. Outreach remains draft and manual-approval only.
- V5/V6 intelligence migrations are applied. The current queue contains 537 unique pending-external-research tasks; 155 superseded task records are preserved as cancelled audit history.
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

## Internal CRM completion

The internal workflow is ready to operate without an external research provider: Today and Company 360 expose the next action; evidence-gated Contacts and Manual Research prepare verified decision-maker data; Outreach separates drafts, approval, and actual communication history; Pipeline connects communication, follow-up, and opportunity state; and Agent Center reports paused external research separately from healthy internal agents. External sending remains disabled. The current verified production baseline is 181 companies with no duplicate company, contact, or job groups.

## V4 operational product

V4 focuses ALGAEU on daily decisions rather than product noise. Today prioritizes human actions, Companies uses an eight-column decision view, Company 360 opens company-scoped contact work, Reports follows the real business-development funnel, and Agent Center describes internal/external states in business language. Global loading/error handling and responsive overflow guards support desktop, tablet, and mobile. No external research or sending integration is activated.

## V5 intelligence checkpoint

The repository contains a provider-free business intelligence and outreach engine with segment classification, business angles, role targeting, bilingual/channel-aware drafts, contextual follow-ups, quality scoring, duplicate detection, weighted completeness, and Next Best Action. Migration `20260811153000_algaeu_v5_intelligence.sql` is applied to the production Supabase project. External research and sending remain disabled.

## V6 autonomous BD foundation

V6 adds a deterministic intelligence core over the existing Supabase source of truth: explainable scores, structured relationship memory, evidence-only signals, Opportunity Signal, one Next Best Action, conversation strategy, Arabic/English draft generation, message-quality dimensions, duplicate warnings, reply/follow-up intelligence, Deal Coach, opportunity health, agent teams, feedback analytics, and a future email-provider interface. The current provider is `ManualProvider`; automation is locked to Level 0 and cannot send.

The additive migrations `20260811153000_algaeu_v5_intelligence.sql` and `20260811170000_algaeu_v6_intelligence_core.sql` are applied to project `vbdgfrkthvurbqeofeyj`; do not recreate or reapply them. Never deploy a Personal Access Token or `SUPABASE_SECRET_KEY` to the client. External research remains paused and external sending remains disabled.

Run `npm run audit:resume` for a read-only server check of production counts, Auth, anonymous denial, V5/V6 schema availability, and duplicate protection. The command never prints secrets and performs no writes without the explicit `--resume` flag.

## Campaign Center and Network Intelligence

Campaign Center creates a separate persisted outreach draft for every selected company. Draft generation uses only saved company data, a saved target contact/role, stored opportunity signals, and existing Sales Kit assets. Drafts can be reviewed, edited, saved, regenerated, approved, rejected, or reset. Approval only makes a draft **Ready for Manual Send**; external sending remains disabled.

Company 360 includes **Network Intelligence**. Relationship rows are evidence-backed Supabase records with source/target company, relationship type, optional project/opportunity reference, evidence, source URL, confidence, verification timestamp, and status. A row without sufficient evidence is visibly **AI SUGGESTION — NOT VERIFIED** and is never treated as a fact. Migration `20260811183344_campaign_network_blocker_closure.sql` is already applied; do not re-seed or recreate existing data.

## Real-world Pilot Phase 1

The first operational cohort is persisted through existing agent-job metadata and displayed in Today under `PILOT — TOP 20`. Run `node scripts/pilot-phase1.mjs` for a read-only preview; `--apply` is intentionally server-only and requires the ignored local Supabase secret. The script never calls an external research provider, never sends communication, never invents a contact, and uses an idempotency key for each internal Qualification job.

The production cohort contains all 12 available Priority A companies plus the eight highest-ranked remaining companies. This is explicit because changing stored priority merely to claim 20 Priority A records would corrupt business data.

## Operational workflow

The operational path is Company → data completion → verified decision maker → outreach preparation → recorded communication → follow-up → opportunity → proposal → result. Company lists, Company 360, Today, Research, Outreach, Pipeline, Agents, and Reports derive status from the same Supabase records and domain functions. Manual research groups tasks by company without deleting the underlying queue records. Internal agents remain usable without Tavily; external research is paused and external sending is disabled.

## V2 user experience

ALGAEU now opens into **Today**, a compact action inbox fed by persisted Supabase data. It explains what needs attention, why it matters, who is involved, and where to act next. The primary navigation follows the business-development journey; administrative tools are secondary. Reports is the analytics destination and keeps Ready, Contacted, Replied, and Opportunity aligned with the domain rules. The responsive shell uses a drawer on small screens, compact KPI grids, card fallbacks for data tables, correct RTL, and isolated LTR rendering for technical values.

External research remains paused and external sending remains disabled. No V2 interface action changes those safety controls.

## V1 consolidated workspaces

The primary product flow is now: Today → Companies → Contacts → Research → Outreach → Pipeline → Agents → Reports. Legacy deep links redirect to the matching workspace tab. The additive V1 migration documented in `audit/ALGAEU_V1_IMPLEMENTATION.md` is applied to production; it provides the protected communication-event ledger and supporting decision-maker, pipeline, and research fields.
