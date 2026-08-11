# ALGAEU Project Status

## Final UI controls (2026-08-11)

- Sales Kit metadata now supports add, edit, active state and local list filtering.
- Campaign Center persists selected audience and campaign metadata as manual-review work; external sending remains disabled.
- Opportunity Radar provides a safe source-only list with status review actions and a paused-search empty state.

## Intelligence Expansion Phase 1 (2026-08-11)

- Additive Phase 1 schema is applied: multi-dimensional company classification, business-directory contact fields, Sales Kit metadata, review-only campaign audiences, and evidence-required Opportunity Radar signals.
- New records are ownership-RLS protected in Supabase. No existing business data, queues, signals, drafts, or agent results were deleted or rewritten.
- External search remains paused and external sending remains disabled. Campaigns persist audience selection and manual approval sequence only.

Status: **ALGAEU OPERATIONAL — V6 DATABASE + INTERNAL AGENTS READY**

Status date: 2026-08-11 (Asia/Riyadh)

Branch: `codex/aj-edge-mvp`

## Operational activation checkpoint (2026-08-11)

- The committed V5 and V6 additive migrations are now applied to Supabase project `vbdgfrkthvurbqeofeyj` and recorded in remote migration history. All six new intelligence tables have RLS enabled, anonymous access is blocked, and external sending remains database-locked to `false`.
- The 692 retained manual-research jobs were reviewed from persisted company and contact evidence. No missing fact could be completed safely from current data without fabrication.
- 155 superseded historical duplicates were closed as `cancelled` with an audit log and a preserved reason. No job row was deleted. The 537 unique tasks remain `manual_research_required` and are explicitly classified `PENDING_EXTERNAL_RESEARCH` with `requires_external_provider=true`.
- Supervisor and the internal worker completed an idempotent pass: 0 queued, 0 running, 0 failed, 0 duplicate job groups, and no completed company was reprocessed. Tavily Cron remains inactive while all five internal Cron jobs remain active.
- Current source-of-truth counts: 181 companies, 12 Priority A, 114 Priority B, 55 Priority C, 114 enriched company-intelligence records, 0 verified decision makers, 7 vendor portals, 881 saved drafts, 1 follow-up, and 0 opportunities.
- Today is the operating entry point and exposes the exact daily queues: top companies, ready outreach, user decisions, pending external research, due follow-ups, vendor portals, potential opportunities, and upcoming meetings/actions.
- External sending is disabled. No email, WhatsApp, LinkedIn message, or other external communication was sent.
- Historical checkpoint notes below are retained for traceability; this section and the top status are the current authority.

## V1 consolidation checkpoint (2026-08-11)

- V1 application consolidation is implemented locally: eight primary workspaces, centralized business states, evidence-based research resolution, verified decision-maker gating, communication events, canonical pipeline stages, ranked Today actions, invite-only login, targeted manual agent runs, and focused/paginated queries.
- TypeScript passes, 28/28 automated tests pass, and the production build passes with 29 routes.
- A read-only server audit confirms the production state remains unchanged: 181 companies, 0 contacts, 881 drafts, 1 follow-up, 1,919 jobs, and zero duplicate company/contact/job groups. External research and external sending remain disabled.
- The additive migration `20260811075453_algaeu_v1_core_consolidation.sql` is applied to project `vbdgfrkthvurbqeofeyj` and recorded in remote migration history. No destructive statement was present.
- Pre/post counts are identical: 181 companies, 0 contacts, 882 messages (881 Draft/Approved), 1 follow-up, 0 opportunities, 1,919 jobs, 2,710 runs, and 114 intelligence records. The transactional Communication Event test rolled back with zero residue.
- Communication Events have RLS enabled, explicit ownership policies for authenticated users, no anonymous table privileges, and no public anonymous policies. Security Advisor reports only the existing optional leaked-password-protection warning.
- V1 verification: TypeScript PASS, ESLint PASS, automated tests PASS (33/33), npm audit PASS (0 vulnerabilities), production build PASS (29 routes), server access/Auth Admin/anonymous denial PASS.
- Browser verification: public/login and protected-route redirect PASS at 1440px and 390px with no horizontal overflow. Authenticated internal screens were verified through server-side data checks, static implementation, TypeScript, tests, and production build; browser credentials were not bypassed.
- Supervisor and the internal worker were run idempotently after migration: zero new jobs, zero reprocessing, zero queued/running/failed jobs, and no changes to production counts. External research remains paused and external sending remains disabled.

Final handoff: the latest commit containing this document on the branch above.

## Verified production state

- The Next.js application, Supabase Authentication, ownership-based RLS, CRM routes, background queue, Cron schedules, and server-side internal agents are operational.
- Supabase is the source of truth. No operational collection uses `localStorage`, `sessionStorage`, or browser memory for persistence.
- Current production data is preserved: 181 active companies, 0 contacts, 881 persisted Draft/Approved outreach records, 1 follow-up, and no meetings, opportunities, proposals, or contracts yet.
- Current company distribution after the deterministic qualification pass is 12 Priority A, 114 Priority B, and 55 Priority C. Existing lead scores were preserved; priority follows the configured 80/60 thresholds.
- The Ready for Outreach workspace currently contains 58 companies with Priority A/B, a usable contact channel, and a persisted Draft/Approved message. There are 7 confirmed vendor portal links, 0 verified decision makers, and 1 company marked Contacted.
- No company or business record was deleted and no synthetic company, contact, opportunity, meeting, value, or communication was created.

## Product coverage

- Login and protected-route handling are operational.
- Dashboard exposes live executive KPIs, conversion funnel, top targets, priorities, upcoming follow-ups, activity, and agent state.
- Daily Center is a persistent task inbox with Today, Overdue, Priority A, Ready for Outreach, research, vendor, reply, and opportunity signals.
- Daily Center now includes direct quick actions, upcoming-meeting visibility, and live Supabase counts without hardcoded business metrics.
- Companies provides search, sorting, operational filters, pagination, safe archive/restore, bulk priority/research/export actions, and current Supabase data.
- Company 360 provides Overview, Contacts, Decision Makers, Research, Vendor Registration, Outreach, Follow-ups, Meetings, Opportunities, and Activity information.
- Contacts persists verification source, source URL, confidence, decision role, and contact score without auto-verifying unsupported details.
- Follow-ups, Meetings, Opportunities, Proposals, and Contracts provide linked Supabase CRUD and operational status pipelines. Numeric commercial values remain blank unless explicitly entered.
- Search covers Companies, Contacts/Decision Makers, Opportunities, Meetings, Follow-ups, persisted tasks, and nested notes/results.
- Reports include conversion and agent metrics plus filtered CSV export. Settings persists company profile, targets, thresholds, work limits, and follow-up timing.
- Vendor Registration and System Status have dedicated protected routes; loading, empty, error, success, not-found, and application-error states are operational.
- Manual Research has a dedicated protected, filtered, paginated workspace for 537 unique external-research tasks; 155 superseded duplicates remain preserved as cancelled audit history.
- The desktop navigation is collapsible, mobile navigation remains drawer-based, and the application metadata consistently uses `ALGAEU Business Development Platform`.
- Arabic RTL and responsive login/auth boundaries were verified at desktop and 390px mobile width with no horizontal overflow.

## Agents and persistence

- All 11 agents are enabled and unpaused in internal mode: Supervisor, Verification, Enrichment, Decision Maker, Qualification, Vendor Registration, Outreach Draft, Follow-up, Opportunity, Daily Planner, and Discovery adapter.
- Five internal Cron schedules are active: Supervisor, worker, Daily Planner, Follow-up, and retry. They do not depend on an open browser.
- The Tavily worker Cron is inactive. Research-capable agents execute safe internal checks and record missing evidence as manual research without calling Tavily.
- External sending remains disabled; outreach is draft plus manual approval only.
- Persisted agent state: 1,919 jobs, 2,710 runs, 4,814 logs, and 84 historical error records.
- Job state: 1,247 completed, 537 `manual_research_required`, 155 safely cancelled duplicates, 0 queued, 0 running, and 0 failed. PGMQ is empty; all automatable internal work across Priority A, B, then C is complete.
- Each job retains owner, agent, status, payload, result, attempts, maximum attempts, schedule, timestamps, and error information. Runs and logs remain available after browser or computer shutdown.

## Queue resume and duplicate protection

- A fresh resume test disabled the internal worker Cron, queued a Daily Planner validation job, confirmed it remained in PGMQ, then re-enabled the worker. The same job completed with one attempt and PGMQ returned to zero.
- The production supervisor pass processed all eligible internal work, returned PGMQ to zero, and left no failed jobs.
- A supervisor tick after completion created zero new work. The database contains zero duplicate idempotency-key groups.
- Company-scoped work is re-enqueued only when relevant persisted business inputs change. Daily Planner and Discovery work are date-guarded.
- Cross-device server resume was re-verified on 2026-08-11 using the local-only Supabase secret: the supervisor created no new jobs, the worker had nothing to drain, all 11 internal agents remained enabled and unpaused, and the persisted counts stayed unchanged.

## Database, Auth, and security

- Every public application table has RLS enabled and ownership policies remain intact; there are zero anonymous allow-all policies.
- The qualification refresh helper is unavailable to `public`, `anon`, and `authenticated` roles.
- Anonymous access to protected production data is denied; recent Supabase Auth `/user` requests and token refreshes returned HTTP 200 for the authenticated user.
- `agent_runtime_secrets` intentionally has RLS with no client policy, keeping it inaccessible from normal browser roles.
- The Supabase advisor reports only non-blocking items: optional leaked-password protection and performance information for unused/unindexed paths.
- `.env.local` is ignored, no secret file is tracked, the Tavily key is not exposed to frontend code, and no service-role key is used in the browser.

## Final QA

- TypeScript: PASS
- ESLint: PASS
- Automated tests: PASS (28/28)
- npm audit: PASS (0 vulnerabilities)
- Production build: PASS (27 application routes)
- Supabase connectivity/RLS smoke: PASS
- Server-side resume audit: PASS (`npm run audit:resume`) with Auth Admin access, anonymous data denial, complete application-table counts, and zero duplicate company/contact/job groups.
- Auth and anonymous redirect: PASS
- HTTP smoke: PASS for Login, Dashboard, Daily Center, Companies, Company 360, Discovery, Enrichment, Vendor Registration, Ready for Outreach, Agent Center, Manual Research, Contacts, Follow-ups, Meetings, Opportunities, Proposals, Contracts, Search, Reports, Export, Settings, and System Status.
- Local stable production server: `http://localhost:3000`
- 2026-08-11 development batch: TypeScript PASS, ESLint PASS, automated tests PASS (28/28), npm audit PASS (0 vulnerabilities), Supabase server audit/RLS PASS, and production build PASS (27 routes).

## Cross-device handoff

1. Pull `codex/aj-edge-mvp` and follow `README.md`.
2. Create a local ignored `app/.env.local` containing only the Supabase public URL and publishable key.
3. Sign in with the existing Supabase account. The same companies, CRM state, drafts, queues, runs, logs, tasks, and progress load from Supabase.
4. Do not seed, recreate, or re-import production records.

## Deferred external dependencies

- External search quota/provider availability is required only to resume Tavily-dependent research agents. Current CRM and internal agents remain production-operational without it.
- An outbound channel, credentials, and explicit business approval are required before any real external sending can be enabled.

These deferred dependencies are not production blockers for the current draft-and-manual-approval workflow.

## V2 UX consolidation — 2026-08-11

- Primary navigation now follows the eight-step business flow: Today, Companies, Contacts, Research & Enrichment, Outreach, Pipeline, Agents, and Reports. Search, Export, Settings, and System Status remain secondary; legacy routes remain compatible.
- Today is the executive action inbox with seven live clickable signals and at most 20 contextual actions. Reports is the analytics workspace with decision KPIs, a conversion funnel, business breakdowns, filters, and CSV export.
- Shared UI tokens now provide consistent action/status hierarchy, RTL-safe LTR data, compact cards, and mobile table/card behavior. Navigation collapse is the only new local UI preference and is not business data.
- Login visual QA passed at 1440, 1024, 768, and 390 pixels with RTL and no horizontal overflow. Authenticated surfaces passed TypeScript, production rendering, responsive source review, and server-side Supabase checks; the automation browser did not inherit the signed-in session.
- TypeScript PASS, ESLint PASS, automated tests PASS (33/33), production build PASS (27 application routes), server Supabase/Auth/RLS audit PASS, and duplicate company/contact/job groups remain zero.
- Data is unchanged: 181 active companies, 881 drafts, 1 follow-up, 1,919 jobs, and 2,710 runs. All 11 internal agents remain enabled and unpaused. External research is PAUSED and external sending is DISABLED.

## Operational V3 — 2026-08-11

- Companies is now an operational ten-column workspace with six saved views, whole-row navigation, contextual actions, mobile cards, and derived outreach state from contacts, drafts, communication events, follow-ups, and opportunities.
- Company 360 now exposes one evidence-based Next Best Action. A decision maker is shown as verified only when the contact is marked as a decision maker, has `VERIFIED` status, and retains a source/evidence reference.
- Manual Research groups persisted work by company. All 692 tasks remain stored, but each company appears once with its task count and direct manual/company actions. External-provider failures remain manual work and are not retried automatically.
- Agent Center derives every visible state from `agent_settings` plus live job counts. Enabled agents with no work show “ready and waiting for work,” never “paused.” Internal/external-research/external-sending states remain separate.
- Today shows seven business-action KPIs and a ranked action list. Contacts has an evidence-safe empty state leading to company selection, manual research, or explicit contact entry; no contacts were fabricated.
- Supervisor was invoked after the repair and created zero work, processed zero work, and recreated no completed jobs. Counts remained unchanged and duplicate company/contact/job groups stayed at zero.
- TypeScript PASS, ESLint PASS, tests PASS (33/33), production build PASS (27 application routes), Supabase/Auth/RLS PASS, and localhost responds on port 3000.

## Real-world Pilot Phase 1 — 2026-08-11

- Pilot cohort: all 12 active Priority A companies followed by the highest-ranked 8 remaining active companies. The stored business priority was not changed to fabricate a 20-company A cohort.
- Selection uses priority, lead score, data completeness, and construction/industrial/real-estate relevance. The cohort is persisted through `agent_jobs.payload.pilot = real-world-pilot-phase-1` with stable rank and workflow metadata.
- 78 existing manual-research jobs were attached to 20 company workflows and reprioritized; no job was deleted. All 20 companies currently require a verified decision maker. Four have a vendor-registration URL and 16 require vendor-registration review.
- 20 idempotent Qualification jobs ran against current Supabase data and completed successfully. Supervisor then ran and created or processed no duplicate work. Queue/running/failed are zero.
- No contacts or opportunities were fabricated. No new drafts were created because no contact satisfies the verified decision-maker evidence gate. The 881 pre-existing drafts remain preparation only and were not treated as communication.
- Today now contains `PILOT — TOP 20`, showing company, stored priority, lead score, decision-maker/contact verification, vendor registration, contact-linked draft state, and one direct next action.
- Counts after Pilot: 181 companies, 0 contacts, 0 verified decision makers, 692 manual-research jobs, 881 drafts, 0 communication events, 1 follow-up, 0 opportunities, 1,939 total jobs, and 1,247 completed jobs. Duplicate company/contact/idempotency groups remain zero.
- External research remains PAUSED and external sending remains DISABLED.

## NEXT DEVICE RESUME

1. Clone `https://github.com/wallo-cyber/AJ-EDGE.git` and check out `codex/aj-edge-mvp`.
2. Confirm the latest commit subject is `ALGAEU master checkpoint before V8`; do not reset, re-seed, or re-import production data.
3. Enter `app/`, run `npm ci`, then copy `app/.env.example` to the ignored `app/.env.local`.
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` locally. For the optional server-only cross-device audit, add `SUPABASE_SECRET_KEY` to the ignored `.env.local`; never put it in Git or any `NEXT_PUBLIC_` variable.
5. Sign in with the existing Supabase account. Project `vbdgfrkthvurbqeofeyj` is the source of truth for companies, contacts, drafts, follow-ups, opportunities, settings, agent jobs, queue state, runs, logs, errors, and progress.
6. Do not reapply or recreate migrations. V5 and V6 are recorded remotely; the committed migration directory is the complete production history.
7. Resume checks with `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run test:supabase`, and `npm run build` before changing code.
8. Start stable mode with `npm start` after a successful build and open `http://localhost:3000`.
9. External Tavily research remains paused and external sending remains disabled. Internal agents and Cron continue server-side without an open browser; pending external research stays persisted for later resume.
10. Before new work, read this file and verify `git status`, the current Supabase project, queue counts, and the latest migration. Continue on `codex/aj-edge-mvp`; do not merge to `main` unless explicitly requested.

## Internal completion before external search — 2026-08-11

- Today remains the operating center: live signals, the ranked Next Best Action list, and the persisted Pilot Top 20 all lead to one evidence-safe human action.
- Company 360 now supplies the complete company and vendor-registration record to its operational tabs, keeps one evidence-based Next Best Action, and confines the technical agent timeline to the Activity tab.
- Contacts rejects a verified decision maker without an evidence source. No contact or decision maker was fabricated; production contacts remain 0.
- Manual Research clearly separates available internal work, 692 persisted manual tasks, and paused external research. A paused provider is shown as a dependency, not a system failure.
- Outreach now loads the complete persisted message set before stage classification, separates preparation, review, approved, and communication history, and only records Contacted/Replied through real direction-specific communication events. External sending remains disabled.
- Pipeline adds consistent Arabic operational summaries for opportunities, linked follow-ups, source communication events, and active stages. Agent Center uses business-readable internal status labels and keeps external research separate.
- Final verification: TypeScript PASS, ESLint PASS, tests PASS (33/33), production build PASS (29 routes), Supabase/Auth/RLS continuity audit PASS, 181 companies preserved, and duplicate company/contact/job groups remain zero.
- Responsive public/login behavior was checked at desktop, tablet, and mobile sizes. The automation browser did not inherit the authenticated user session; protected workspaces were therefore verified through source, TypeScript, server-side data checks, and production rendering without bypassing Auth.
- Production counts remain 181 companies, 0 contacts, 881 drafts, 1 follow-up, 0 opportunities, 1,939 jobs, and 692 manual-research jobs. External research is PAUSED and external sending is DISABLED.

## V4 final product polish — 2026-08-11

- The daily command center now orders action types by business priority: Priority A, decision-maker evidence, outreach readiness, due follow-ups, replies, opportunities, vendor registration, then genuinely failed internal work. It remains an action list rather than an analytics dashboard.
- The Companies desktop default was reduced to eight decision columns, long names wrap safely, mobile remains card-based, and an unused 3,000-row audit fetch was removed.
- Company 360 now opens contact creation already scoped to the current company. Contacts preserves the company filter and pre-fills the relationship without inventing a person or verification evidence.
- Agent Center replaced technical ON/OFF/provider-quota language with Arabic business states that separate healthy internal agents, waiting external research, and disabled external communication.
- Reports now presents one ten-step decision funnel: targets, verified decision makers, ready, contacted, replies, active opportunities, won, lost, vendor portals, and manual-research backlog.
- Global route loading and recoverable error states were added. Responsive guards prevent accidental horizontal page overflow and keep controls touch-friendly without changing the ALGAEU identity.
- Visual checks passed at 1440px, 1024px, and 390px on the local authenticated boundary with RTL and zero horizontal overflow. Protected workspaces were not accessed by bypassing Supabase Auth.
- Final gates: TypeScript PASS, ESLint PASS, tests 33/33 PASS, production build 29 routes PASS, and Supabase/Auth/RLS audit PASS. Production remains 181 companies, 692 manual-research tasks, 881 drafts, one follow-up, and zero duplicate company/contact/job groups.
- No schema change, production mutation, external search, Tavily call, or external sending occurred during V4.

## V5 intelligence upgrade — implementation checkpoint

- Added a deterministic, provider-free intelligence engine for nine target segments, evidence-safe cooperation angles, recommended departments/roles, weighted completeness, one Next Best Action, Arabic/English message generation, channel-aware length, contextual follow-ups, quality scoring, and duplicate similarity.
- Added seven V5 domain tests; the full suite is 40/40 PASS. TypeScript, ESLint, and the 29-route production build pass.
- Company 360 now exposes Outreach Intelligence from current saved facts only. Recommended Role is explicitly a target role, never a fabricated contact.
- Outreach includes Strategy plus a simple Arabic/English editor, message type/style/channel controls, quality analysis, duplicate warnings, copy, and save-for-review. Approval is blocked below quality score 65 and still requires a verified decision maker.
- Added an additive migration for V5 company/contact/message/agent output metadata and protected user feedback. It contains no DROP, TRUNCATE, DELETE, reset, or production backfill.
- This historical migration blocker was cleared during the operational activation checkpoint using the authorized Supabase connection; V5 persistence columns and protected `user_feedback` are now present.
- Production business records remain preserved: 181 companies, 537 unique pending-external-research tasks, 155 cancelled duplicate task records, 881 drafts, and one follow-up. External research is PAUSED and external sending is DISABLED.

## V6 intelligence core — 2026-08-11

- Implemented a provider-free V6 domain layer for explainable company intelligence, structured relationship memory, evidence-gated business signals, an Opportunity Signal independent from the canonical stored Lead Score, one Next Best Action, relationship stages, conversation strategy, bilingual/channel-aware messages, quality dimensions, duplicate detection, contextual follow-ups, reply intent, Deal Coach, opportunity health, agent-team routing, auditable human overrides, user feedback, and a locked Manual email provider.
- Today now exposes high-value signals and one primary action per company. Company 360 uses eight business tabs and shows Lead Score, Opportunity Signal, Relationship Stage, memory, signals, outreach strategy, and Deal Coach. Outreach remains copy/manual-event only; Agent Center groups the existing internal agents into teams; Reports adds only evidence-backed V6 analytics.
- Automation is hard-locked to Level 0. External research remains PAUSED and external sending remains DISABLED. No Gmail, Resend, Tavily, WhatsApp, LinkedIn, or other external provider was called or connected.
- Added additive migrations `20260811153000_algaeu_v5_intelligence.sql` and `20260811170000_algaeu_v6_intelligence_core.sql`. They contain no destructive DDL/DML or production backfill, revoke anonymous access to new tables, enable ownership RLS, grant only authenticated/service roles, and tolerate pre-existing policies.
- Production migration application is complete. V5 and V6 are recorded remotely and their Data API shapes are present.
- Read-only server verification passes with server access, Auth Admin access, anonymous denial, and unchanged production counts: 181 companies, 0 contacts, 882 messages (881 Draft/Approved), 0 communication events, 1 follow-up, 0 opportunities, 1,939 jobs, 2,730 runs, 692 manual-research jobs, and zero duplicate company/contact/job groups.
- The Data API confirms all V5/V6 company/message columns and intelligence tables are available. Ownership RLS and anonymous denial are verified.
- Final QA is rerun at each operational checkpoint. Supabase/Auth/RLS continuity and the expanded seven-table anonymous-denial smoke test pass.
- Cross-device handoff is safe on `codex/aj-edge-mvp`; `.env.local` and all secrets remain ignored. No local Personal Access Token is required for normal application use.

## Master checkpoint before V8 — 2026-08-11

- Scope is frozen at V6. V8, external research, Tavily, and external sending were not started.
- Final checkpoint QA: automated tests PASS (57/57) and Next.js production build PASS (29 routes).
- Read-only Supabase verification confirms the business source of truth is remote: 181 companies, 0 contacts, 882 messages (881 Draft/Approved), 1 follow-up, 0 opportunities, 1,939 agent jobs, 2,730 runs, and 692 manual-research jobs. Duplicate company/contact/job groups remain zero. Browser storage contains only the sidebar-collapse preference, never CRM data.
- Supabase server access, Auth Admin access, ownership RLS continuity, and anonymous denial PASS. No production record was created, changed, deleted, reprocessed, or copied locally during this checkpoint.
- This checkpoint's migration limitation is superseded: `20260811153000_algaeu_v5_intelligence.sql` and `20260811170000_algaeu_v6_intelligence_core.sql` are now applied and verified remotely.
- Vercel readiness PASS: `vercel.json`, Next.js production build, dynamic site URL fallback, protected routes, and the public Supabase client configuration are ready. Required hosted variables are only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL`. Server secrets, PATs, service-role credentials, and Tavily must not be added to Vercel.
- Vercel CLI is not installed/linked on this device, so no deployment or share URL was created. Use the Vercel Dashboard to import `wallo-cyber/AJ-EDGE`, select branch `codex/aj-edge-mvp`, set Root Directory to `app`, add the three public variables, and deploy. Keep Supabase Auth enabled and add the final deployment URL to Supabase Auth URL Configuration.
- Exact clean-device resume command (PowerShell): `git clone https://github.com/wallo-cyber/AJ-EDGE.git; Set-Location AJ-EDGE; git switch --track origin/codex/aj-edge-mvp; Set-Location app; npm ci`
- After cloning, create ignored `app/.env.local` from `.env.example`, add the public Supabase values, optionally add the server-only audit secret, then run `npm test` and `npm run build`. Do not seed or re-import production data.
