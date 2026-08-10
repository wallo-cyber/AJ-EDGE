# AJ-EDGE Project Status

Status date: 2026-08-11 (Asia/Riyadh)  
Branch: `codex/aj-edge-mvp`  
Last stable handoff commit before final closure: `ca750e4` (`Document cross-device resume and remove browser storage`)
Current handoff commit: use `git rev-parse HEAD` after pulling the branch.

## Stable state

- Next.js application, Supabase Authentication, and ownership-based RLS are operational.
- 116 companies are persisted in Supabase.
- Current persisted operational records: 715 agent jobs, 756 runs, 1,486 logs, 21 error records, 12 company-intelligence records, and 805 outreach drafts.
- Contacts, opportunities, and follow-ups currently contain zero real records; their schemas and CRUD remain Supabase-backed.
- Agents and all AJ-EDGE Cron schedules are active.
- Tavily is connected only from the server-side Edge Worker. External sending remains disabled.
- All 11 Priority A companies completed the required agent pipeline and have source-backed Tavily intelligence. Priority B remains staged progressively for 104 companies.
- Job state at handoff: 392 completed and 323 `manual_research_required`; zero queued/running duplicates and zero failed jobs.
- Current operating metrics: 10 companies ready for outreach, 1 verified vendor portal, 0 verified decision makers, and 41 Tavily API requests used during activation and verification.

## Persistence guarantees verified

- All CRM collections and operational agent state are in the hosted Supabase project; the unused browser `localStorage` provider was removed.
- Every agent job has its owner, agent, status, attempts, maximum attempts, creation timestamp, and update timestamp persisted.
- Results, source evidence, confidence, errors, runs, and logs remain available after browser or computer shutdown.
- The durable agent job table is the source of truth. Supabase pgmq/Cron/Edge Functions provide background delivery and execution.
- The enqueue guards prevent duplicate open jobs, and completed/manual-review work is not re-enqueued during the normal daily window.

## Resume test

The Tavily Cron job was paused in Supabase, an existing persisted job was observed unchanged, then Cron was re-enabled and the worker resumed. It completed the existing Enrichment job `1ff1e5a7-c23f-4221-8468-3e1bf811f440`, originally created at `2026-08-10 20:28:02 UTC`, without creating a new job. Total jobs remained 715 and duplicate open-job groups remained 0.

## Continue tomorrow

1. Pull `codex/aj-edge-mvp` and follow `README.md`.
2. Use the existing Supabase project and sign in with the same user account.
3. Do not rerun imports or seed production data.
4. Check `/agent-center` for live status and `/daily` for the operating queue.
5. Priority A/B enrichment will continue from persisted job state through hosted Cron.

## Non-blocking remaining work

- 323 records remain in manual research status, primarily where no sufficiently reliable public source or verified decision maker was found.
- No real decision-maker contacts, opportunities, or follow-ups have been entered yet.
- Supabase leaked-password protection is an optional project setting still reported by the security advisor.
