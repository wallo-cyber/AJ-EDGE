# ALGAEU Static + Data Product Audit

Audit date: 2026-08-11  
Scope: static code, routes, components, Supabase schema/RLS, read-only production data, agents, queues, tests, documentation.  
Method: source inspection plus the existing server-side read-only Supabase audit. No browser automation, screenshots, writes, migrations, external research, or external sending were used.

## EXECUTIVE SUMMARY

ALGAEU has a substantial protected CRM foundation: 27 Next.js page routes, ownership-based RLS, persistent agent jobs, duplicate guards, and working CRUD primitives. The application is not ready for a V1 business-development release because its core commercial chain is disconnected at the most important point: 181 companies and 881 Draft messages exist, but there are 0 contacts, 0 verified decision makers, 0 meetings, and 0 opportunities. The UI labels 58 companies as ready for outreach even though the product has no saved person to contact.

The navigation exposes 21 primary items, several of which are overlapping workspaces or empty downstream modules. The application also downloads entire tables into the browser for dashboard, search, reports, Company 360, and agent monitoring. This works at current scale but produces slow, fragile screens and makes the product feel like a collection of administrative tables rather than a focused daily sales workflow.

Security posture is comparatively strong: the server audit confirmed server access, Auth Admin access, anonymous denial, RLS ownership policies, zero anonymous allow-all policies, and zero duplicate company/contact/job groups. The main V1 blockers are product truthfulness, missing decision-maker data, incomplete workflow linkage, and excessive navigation/operational complexity.

Production snapshot observed read-only:

- Companies: 181 active; Priority A 12, B 114, C 55.
- Contacts / verified decision makers: 0 / 0.
- Messages: 882 total; 881 Draft/Approved outreach records; only 1 company marked Contacted.
- Follow-ups: 1. Meetings, opportunities, quotations, contracts: 0.
- Company intelligence: 114 records.
- Agent jobs: 1,919; 1,227 completed; 692 manual research required; 0 queued/running/failed.
- Agent settings: 11 internal agents enabled and unpaused; 84 historical agent errors.
- Duplicate groups reported by the existing audit: companies 0, contacts 0, jobs 0.

## TOP 20 PROBLEMS

| ID | Severity | Page/Route | File | Problem | Business impact | Recommended fix |
|---|---|---|---|---|---|---|
| P01 | Critical | `/ready-outreach`, `/dashboard` | `components/ready-outreach-workspace.tsx`, `app/dashboard/page.tsx` | “Ready” is derived from Priority A/B plus any general email/phone and sometimes a draft; it does not require a verified person. Production has 0 contacts but 58 companies are described as ready. | The owner cannot answer “who exactly should I contact?” and may contact generic inboxes under a misleading readiness label. | Split states into Channel Available, Contact Needed, Decision Maker Verified, Draft Ready, Approved, Contacted; require an identified/verified person for person-ready status. |
| P02 | Critical | `/ready-outreach` | `components/ready-outreach-workspace.tsx` | `Mark Contacted` writes `sent_at`, company `last_contact`, outcome, follow-up, and sometimes an opportunity based on a button click; no evidence of an actual communication event is required. | Funnel, response rate, follow-ups, and opportunity reporting can become materially false. | Record an explicit manual communication event with channel, recipient, timestamp, evidence/note, then derive Contacted from that event. |
| P03 | Critical | Product-wide | production data + `PROJECT_STATUS.md` | 181 companies and 881 drafts exist with 0 contacts, 0 meetings, and 0 opportunities. Draft volume is not conversion progress. | The core flow stops before person-level outreach and provides little immediate revenue value. | Make decision-maker acquisition/verification the primary V1 work queue and prevent generic drafts from appearing as sales progress. |
| P04 | High | `/dashboard`, `/reports` | `app/dashboard/page.tsx`, `app/reports/page.tsx` | KPI definitions differ between screens. “Ready” on Dashboard allows a contact record; Reports only checks general company channels. | Executives see different numbers for the same concept. | Centralize metric definitions in one tested domain module or database view. |
| P05 | High | `/dashboard` | `app/dashboard/page.tsx` | “Replied” is inferred from any `last_outcome` other than `No Response`, including outcomes that are not replies or may be manually assigned. | Conversion funnel overstates engagement. | Derive replies from inbound communication events only. |
| P06 | High | `/dashboard`, `/reports` | same files | RFQ is inferred from opportunity `stage` text matching RFQ, while the declared opportunity stages include `Lead/Qualified/Meeting/RFQ/Proposal...` in one area and `Identified/RFQ Received` in another. | Funnel stages are inconsistent and records can disappear from KPI counts. | Adopt one canonical stage enum and map legacy values explicitly. |
| P07 | High | `/agent-center` | `components/agent-control-center.tsx` | `Run` chooses the single highest Priority A company for every company agent and only prevents currently queued/running duplicates; it does not explain eligibility or completed-work idempotency in the UI. | Users can rerun the wrong company or create redundant work; agent behavior is opaque. | Require explicit company/job selection and show eligibility, last result, idempotency key, and why a job will or will not run. |
| P08 | High | `/agent-center` | `components/agent-control-center.tsx` | Page loads all jobs, runs, logs, errors, companies, contacts, and intelligence, then refreshes all data every 30 seconds. Current counts exceed 11,000 rows across these tables. | Slow UI, high Data API traffic, browser memory pressure, and poor mobile behavior. | Replace with aggregated server queries and paginated per-agent history. |
| P09 | High | Company 360 | `app/companies/[id]/page.tsx`, `components/company-details-view.tsx` | Loading one company first loads all companies, then Company 360 loads complete contacts, follow-ups, messages, meetings, opportunities, audit events, jobs, logs, and companies before filtering client-side. | Company detail becomes slower as the system succeeds and risks timeouts. | Query the company by ID and use `company_id`/job IDs server-side with pagination. |
| P10 | High | `/search` | `app/search/page.tsx` | Global Search downloads every row from seven tables before a user types and performs client substring matching. | Slow initial load, stale results, poor scalability, and no relevance ranking. | Use a server-side search endpoint/RPC with indexed text search, result limits, and grouped pagination. |
| P11 | High | `/reports` | `app/reports/page.tsx` | Reports loads ten entire tables into the browser and calculates metrics locally. Date filter applies to company creation date, not the event date of communications, meetings, or opportunities. | Time-based reports answer the wrong business question. | Aggregate by event dates server-side and label date semantics explicitly. |
| P12 | High | `/companies` | `app/companies/page.tsx`, `lib/supabase/crm.ts` | Bulk priority and research actions send one update per selected company using full object mapping. There is no transaction, progress, or partial-failure recovery. | A batch can leave records in a mixed state without telling the user which failed. | Use a validated bulk RPC/server action returning per-record results. |
| P13 | High | `/vendor-registration` | `app/vendor-registration/page.tsx` | Inputs save automatically on blur; status is also mutated when the URL blurs. There is no dirty indicator or explicit save/revert. | Accidental clicks can overwrite production workflow state. | Use an explicit per-company Save/Cancel flow with validation and audit summary. |
| P14 | High | `/opportunities`, `/meetings`, `/quotations`, `/contracts`, `/agents` | `components/simple-crud-page.tsx` | One generic CRUD component exposes deletion and editing for materially different business entities, shows only the first six fields, and lacks workflow-specific validation. | Deals, meetings, proposals, and contracts lose their business context and can be deleted too easily. | Replace with domain-specific forms/state transitions; use archive/close semantics and audit history. |
| P15 | High | `/login` | `app/login/page.tsx` | Public UI exposes self-service signup in the production business application. RLS isolates users, but account creation is not an intended operator workflow. | Unauthorized accounts can be created and user expectations become unclear. | Hide signup unless explicitly invited; configure invite-only access. |
| P16 | Medium | Sidebar | `components/crm-shell.tsx` | 21 first-level navigation items are presented in one long list. | Users must understand the data model before knowing what to do today. | Reduce to 7–9 primary destinations and group administration/system screens. |
| P17 | Medium | `/daily`, `/dashboard` | `components/daily-workspace.tsx`, `app/dashboard/page.tsx` | Both act as morning command centers with overlapping KPIs and priorities. | The product has two competing “home” screens. | Make Daily the default operational home; keep Dashboard as a compact analytics tab. |
| P18 | Medium | `/discovery`, `/enrichment`, `/manual-research` | corresponding route/components | Three pages represent adjacent research stages but use separate lists and mental models. | Operators cannot see one company’s research progression end to end. | Merge into a Research workspace with Discovery, Enrichment, and Manual Queue tabs. |
| P19 | Medium | `/outreach`, `/ready-outreach` | `components/outreach-workspace.tsx`, `components/ready-outreach-workspace.tsx` | Draft creation and readiness/review are split; `/outreach` is not in sidebar but is linked from Daily. | Hidden route and duplicated draft context create navigation confusion. | Merge as an Outreach workspace with Drafts, Review, Ready, and History tabs. |
| P20 | Medium | Mobile, all table pages | `app/globals.css` and page tables | At widths under 768px every table is forced to `min-width:760px`; the product relies on horizontal scrolling instead of mobile-specific row cards. | Core lists are difficult to use at 390px. | Render compact mobile cards or prioritized columns with a details drawer. |

## BROKEN/INCOMPLETE FUNCTIONS

| ID | Severity | Page/Route | File | Problem | Business impact | Recommended fix |
|---|---|---|---|---|---|---|
| F01 | High | `/companies/[id]` | `app/companies/[id]/page.tsx` | “Edit / return to companies” only links back; it does not open edit mode for the current company. | Expected quick action is misleading. | Provide direct edit state or rename to “Back to companies.” |
| F02 | High | `/ready-outreach` | `components/ready-outreach-workspace.tsx` | The outcome selector is global for all cards, increasing the chance of applying a stale outcome to the wrong company. | Wrong follow-ups/opportunities may be created. | Keep outcome and confirmation inside each company card/modal. |
| F03 | High | `/ready-outreach` | same file | Only the first 30 ready records are rendered; there is no pagination or “show more.” | Eligible targets beyond 30 are invisible. | Add server pagination with total count. |
| F04 | High | `/outreach` | `components/outreach-workspace.tsx` | Only the first 20 saved messages are shown without filtering, sorting, pagination, approval, rejection, or status history. | Draft backlog of 882 records cannot be managed. | Add a paginated draft review queue, or merge with Ready Outreach. |
| F05 | Medium | `/contacts` | `app/contacts/page.tsx` | Search/sort/filter exists but there is no pagination. | Contact list will degrade once the current zero-contact gap is fixed. | Add server pagination and decision-maker filters. |
| F06 | Medium | generic CRUD routes | `components/simple-crud-page.tsx` | No search, filtering, sorting, or pagination is available. | Operational modules become unusable beyond small counts. | Add domain-specific list controls and server pagination. |
| F07 | Medium | `/daily` | `components/daily-workspace.tsx` | “Create opportunity” and “Schedule follow-up” navigate to generic blank forms without carrying the selected company/task context. | Daily action requires reselecting information and encourages mistakes. | Deep-link with company/contact preselection or inline quick forms. |
| F08 | Medium | `/daily` | same file | “Start my day” is local component state and resets on navigation/refresh. | The UI does not preserve daily workflow position. | Persist view preference or show the queue directly. |
| F09 | Medium | `/vendor-registration` | `app/vendor-registration/page.tsx` | All 181 companies are rendered as large editable cards; there is no pagination. | The page is heavy and visually overwhelming. | Default to actionable statuses and paginate. |
| F10 | Medium | `/manual-research` | `app/manual-research/page.tsx` | Queue is read-only and provides no structured completion/evidence capture action. | 692 tasks cannot be resolved inside the product. | Add safe manual evidence submission and resolution flow when development resumes. |
| F11 | Medium | `/system-status` | `app/system-status/page.tsx` | “Application RUNNING,” external states, and some health meanings are hardcoded or inferred from successful list loads. | Status can be green while Cron/Edge Function/provider is unhealthy. | Use explicit server health checks and last-heartbeat timestamps. |
| F12 | Medium | `/settings` | `app/settings/page.tsx` | Supabase CONNECTED, research PAUSED, and sending DISABLED are static labels. | Configuration screen can misrepresent runtime state. | Read real integration/feature-flag state from protected server endpoints. |
| F13 | Low | All routes | route inventory | No route-level `loading.tsx` exists and only a global `error.tsx` exists; loading is repeated inconsistently inside client pages. | Transitions feel blank/inconsistent and errors lack recovery context. | Add shared route loading/error boundaries when implementing fixes. |
| F14 | Low | App documentation | `app/README.md` | App README is still the generic create-next-app document. | Operators/developers receive conflicting setup information. | Replace with ALGAEU-specific documentation after product decisions. |

## BUSINESS LOGIC ISSUES

- Ready for Outreach is not equivalent to a verified person ready for outreach. Current code accepts company-level general channels.
- Draft and Approved are correctly distinct from Sent in storage, but `Mark Contacted` changes message status to `Contacted` and populates `sent_at`, mixing communication-event and message-review states.
- Generic company email is treated as a usable channel and can qualify readiness, although the project principle states generic email is not a decision maker.
- Dashboard “Qualified” accepts every Priority A/B company, coupling prioritization to qualification and inflating the funnel.
- Dashboard “Contacted” accepts either `outreach_status === Contacted` or any `last_contact`, while Ready Outreach can set these from manual confirmation without recipient evidence.
- “Replied” is inferred from company `last_outcome`, not inbound messages.
- Requested Vendor Registration sets company vendor status to `Available` even if no portal was actually found.
- RFQ Expected/Received can immediately create an opportunity with hardcoded probability and generic next action; values are not fabricated, which is good, but stage vocabulary is inconsistent.
- Meeting creation from outcome uses a default date three calendar days later, not confirmed scheduling.
- Agent manual Run selects the same top Priority A target instead of the business record the user is viewing.
- Company 360 calculates upcoming follow-ups with `date >= today`, excluding overdue items despite those being most urgent.
- Priority thresholds are persisted in settings, but the production qualification logic is migration/RPC-driven and there is no evidence the saved thresholds reconfigure that server logic.

## DATA QUALITY ISSUES

| ID | Severity | Evidence | Problem | Business impact | Recommended fix |
|---|---|---|---|---|---|
| D01 | Critical | 181 companies, 0 contacts | No person-level contact data exists. | The central “right person” question is unanswered for every company. | Prioritize verified contact acquisition and provenance. |
| D02 | Critical | 0 verified decision makers | Decision-maker coverage is 0%. | Outreach cannot be targeted credibly. | Make decision-maker coverage a gating metric. |
| D03 | High | 881 Draft/Approved messages, 0 contacts | Nearly all drafts are company-level/generic. | High draft count creates false confidence and possible spam-like repetition. | Reclassify generic drafts as templates/preparation, not ready outreach. |
| D04 | High | 58 ready companies vs 0 contacts | Readiness conflicts with data reality. | Dashboard and Daily Center are misleading. | Recalculate readiness with explicit tiers. |
| D05 | High | 692 manual research jobs | 36% of 1,919 jobs remain blocked on external/manual evidence. | The actionable research queue is very large and hides high-value targets. | Rank by Priority A/B, missing decision maker, vendor portal, and expected value. |
| D06 | Medium | 114 intelligence rows for 181 companies | 67 companies have no intelligence record. | Company 360 depth is inconsistent. | Expose coverage and missing-reason status. |
| D07 | Medium | 1 follow-up | Follow-up coverage is negligible relative to 181 companies and 881 drafts. | The system is preparing outreach but not operating a follow-up cadence. | Only generate follow-ups from real logged contact or an explicit planned action. |
| D08 | Medium | 0 meetings/opportunities/quotations/contracts | Downstream pipeline is empty. | Reports and pipeline pages provide no proof of business outcome. | Treat these pages as secondary until real records exist; do not inflate upstream metrics. |
| D09 | Medium | 84 historical agent errors | Errors are retained but product UI shows only per-agent count/logs and no resolution workflow. | Repeated failure patterns may be missed. | Group unresolved errors by cause and show required human action. |
| D10 | Low | 0 duplicate company/contact/job groups | Duplicate protection currently passes. | Positive integrity result, but it does not test near-duplicate names/domains/phones. | Add normalized near-duplicate review without auto-merging. |

## UX ARCHITECTURE ISSUES

- The product asks the owner to navigate by system module rather than by today’s business decision.
- Dashboard contains 18 KPI cards before the user reaches target lists, weakening visual hierarchy.
- Arabic UI is mixed heavily with English statuses (`Ready`, `Draft`, `Approved`, `Contacted`, `Run`, `Logs`, `PAUSED`) without a consistent glossary.
- The global `html dir=rtl` is correct, but URLs, emails, phone numbers, identifiers, dates, logs, and code-like status values do not receive explicit `dir=ltr`, which can scramble reading order.
- Large tables universally become 760px horizontal-scroll surfaces on mobile.
- Company 360 has ten horizontal tabs, plus a nested intelligence workspace with its own information model; this is dense on mobile and duplicates global modules.
- System Status and Agent Center expose technical terms (`PGMQ`, Cron, logs, runs) more prominently than “what needs me.”
- Empty pages for meetings/opportunities/offers/contracts occupy equal navigation weight to active daily work.
- Many success/error messages are per-component, but there is no consistent toast, unsaved-change protection, or retry pattern.

## SIDEBAR SIMPLIFICATION

Current primary items: 21. Recommended primary items: 8.

1. Today
2. Companies
3. Contacts
4. Research
5. Outreach
6. Pipeline
7. Agents
8. Reports

Secondary/admin menu: Search, Export, Settings, System Status.

## PAGES TO MERGE

| Pages | Recommendation | Reason |
|---|---|---|
| `/daily` + operational parts of `/dashboard` | Daily as default; Dashboard as Analytics tab | Removes two competing home screens. |
| `/discovery` + `/enrichment` + `/manual-research` | One Research workspace with three tabs | Represents one evidence-gathering lifecycle. |
| `/outreach` + `/ready-outreach` | One Outreach workspace with Drafts, Review, Ready, History | Removes hidden route and keeps message state coherent. |
| `/opportunities` + `/quotations` + `/contracts` | One Pipeline workspace with stage tabs; offers/contracts remain linked detail views | Matches Lead → RFQ → Proposal → Won/Lost. |
| `/agents` + relevant company/contact relationship fields | Move referral “agents/introducers” to Contacts/Partners; keep `/agent-center` for automation | The two uses of “agent” are conceptually different and confusing. |
| `/reports` + analytics portion of `/dashboard` | Reports/Analytics workspace | Avoids duplicate KPI definitions. |

## PAGES TO REMOVE/HIDE

- Hide `/contracts` from primary navigation until at least one contract exists; access it through Pipeline.
- Hide `/quotations` from primary navigation until a real RFQ/opportunity exists; access it through Pipeline.
- Hide `/meetings` from primary navigation when empty; surface upcoming meetings in Today and Company 360.
- Remove `/outreach` as a standalone hidden destination after merging with Ready Outreach.
- Remove the unused `AgentsWorkflow` component or explicitly repurpose it only after verifying its old discovery workflow; it is currently unreferenced and contains legacy behavior that can create company/opportunity/follow-up/timeline records together.
- Keep `/system-status`, `/settings`, and `/exports` in an admin/secondary menu, not the core business sidebar.

## MISSING HIGH-VALUE FEATURES

These are gaps in the requested V1 path, not scope expansion:

- A ranked “Next Best Action” queue that requires a concrete company, reason, person/channel, and due date.
- Decision-maker coverage and verification workflow with evidence/source freshness.
- A canonical communication event model separating Draft, Approved, Sent, Delivered, Replied, and manually logged calls/visits.
- Unified activity timeline derived from events, not duplicated JSON arrays plus relational tables.
- Funnel metric definitions shared by Dashboard, Reports, Daily, and Agent Center.
- Safe manual-research completion with evidence URL, extracted fact, confidence, reviewer, and resolution.
- Opportunity/RFQ linkage from actual inbound outcome and next action, with no default fabricated commercial value.
- Near-duplicate review for normalized company name/domain/phone.

## AGENTS ISSUES

- Agent cards show technical counts and logs but not a concise business purpose, latest business result, blocker reason, or exact user action required.
- “Completed today” counts both `completed` and `manual_research_required`, which makes blocked/manual work look completed.
- `Enriched` is based on the presence of a `tavily` key in intelligence JSON, which conflicts with current paused provider operation and misses internally enriched records.
- Ready-for-outreach agent metric does not require a persisted Draft/Approved message or verified decision maker.
- Manual Run selects one top Priority A company rather than a chosen target.
- Pause All/Emergency Stop updates every settings row client-side via many requests, without transaction or role-specific confirmation.
- Logs fetch and refresh all 4,814 rows, then filter the selected agent in the browser.
- The unreferenced legacy `agents-workflow.tsx` simulates five agents locally and can create an opportunity and follow-up as part of approving a discovered candidate; this conflicts with the current server-side orchestrator and should not be reactivated accidentally.
- The worker’s external research implementation is logically separated and provider limits move work to manual research, which is positive; however the UI lacks a human resolution path.

## RECOMMENDED FINAL USER FLOW

1. Open **Today** and see no more than 10–20 ranked actions.
2. Each action states: target company, why it matters, correct person/evidence, recommended message/action, and due date.
3. Open Company 360 for one target; validate company facts and decision maker.
4. If the person is missing, create/resolve a Research task; do not label the company person-ready.
5. Prepare and approve a draft for a named recipient or explicitly label it generic-channel outreach.
6. Log the real communication event manually; only then mark Contacted.
7. Record the response; automatically propose the correct follow-up, meeting, vendor task, or opportunity.
8. Promote a verified opportunity through RFQ → Proposal → Negotiation → Won/Lost.
9. Return to Today for the next action; use Reports for trend review, not daily execution.

## RECOMMENDED FINAL NAVIGATION

- **Today** — tasks, overdue follow-ups, replies, meetings, human interventions.
- **Companies** — list plus Company 360.
- **Contacts** — people and decision makers.
- **Research** — Discovery | Enrichment | Manual Research.
- **Outreach** — Drafts | Review | Ready | Contact History.
- **Pipeline** — Opportunities | RFQs | Proposals | Won/Lost; contracts as linked records.
- **Agents** — business-readable automation status and interventions.
- **Reports** — executive KPIs and conversion analytics.
- Secondary: Global Search, Export, Settings, System Status.

## V1 RELEASE BLOCKERS

1. Zero contacts and zero verified decision makers.
2. Misleading Ready/Contacted/Replied metric definitions.
3. Communication state can be advanced without durable recipient/evidence events.
4. Dashboard, Reports, Daily, and Agent Center use inconsistent KPI logic.
5. Core high-volume pages load entire tables client-side and will degrade rapidly.
6. Draft backlog has no scalable review/pagination workflow.
7. Manual Research backlog has no completion/evidence workflow.
8. Generic CRUD and hard delete are insufficient for opportunity, proposal, contract, and meeting lifecycle integrity.
9. Navigation complexity obscures the target business-development flow.
10. Mobile tables are horizontally scrolling desktop tables rather than usable mobile workflows.

## V1 RELEASE RECOMMENDATION

**NO — not ready for V1 release as a dependable business-development operating system.**

The codebase is a solid secured MVP foundation and the queue infrastructure is unusually mature for this stage. Release readiness should be reconsidered after the product reports truthful funnel states, stores verified contacts/decision makers, scales draft/manual-research review, unifies the daily workflow, and reduces the navigation. No database or code changes were made during this audit.

