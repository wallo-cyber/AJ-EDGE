# AJ-EDGE Project Status

Status date: 2026-08-11 (Asia/Riyadh)  
Branch: `codex/aj-edge-mvp`  
Last stable handoff commit before final closure: `d07207f` (`Finalize Priority A agent activation`)
Current handoff commit: use `git rev-parse HEAD` after pulling the branch.

## Stable state

- Next.js application, Supabase Authentication, and ownership-based RLS are operational.
- 116 companies are persisted in Supabase.
- Current persisted operational records: 719 agent jobs, 1,466 runs, 2,414 logs, 40 historical error records, 113 companies with source-backed Tavily intelligence, and 805 outreach drafts.
- Contacts, opportunities, and follow-ups currently contain zero real records; their schemas and CRUD remain Supabase-backed.
- Agents and all AJ-EDGE Cron schedules are active.
- Tavily is connected only from the server-side Edge Worker. External sending remains disabled.
- All automated Tavily jobs available for Priority A and Priority B were processed. Qualification and outreach-draft jobs were then rerun against the enriched data.
- Job state at handoff: 597 completed and 122 `manual_research_required`; zero queued, running, duplicate-open, or failed jobs.
- Current operating metrics: 116 companies, 115 verified, 113 enriched, 46 ready for outreach review, 7 verified vendor portals, 0 verified decision makers, and 336 Tavily API requests persisted in job results.
- Priority distribution remains 11 A, 104 B, and 1 C after the final qualification pass.

## Persistence guarantees verified

- All CRM collections and operational agent state are in the hosted Supabase project; the unused browser `localStorage` provider was removed.
- Every agent job has its owner, agent, status, attempts, maximum attempts, creation timestamp, and update timestamp persisted.
- Results, source evidence, confidence, errors, runs, and logs remain available after browser or computer shutdown.
- The durable agent job table is the source of truth. Supabase pgmq/Cron/Edge Functions provide background delivery and execution.
- The enqueue guards prevent duplicate open jobs, and completed/manual-review work is not re-enqueued during the normal daily window.

## Resume test

The database worker Cron was paused in Supabase and the existing Daily Planner job `ca31dcfa-5187-4a5b-a04c-3a1a8d5cf127` was re-queued. Its queued state and pgmq message remained persisted while Cron was inactive. After Cron was re-enabled, the same job completed, the queue returned to zero, and total jobs remained 719 with zero duplicate open-job groups.

## Continue tomorrow

1. Pull `codex/aj-edge-mvp` and follow `README.md`.
2. Use the existing Supabase project and sign in with the same user account.
3. Do not rerun imports or seed production data.
4. Check `/agent-center` for live status and `/daily` for the operating queue.
5. Priority A/B enrichment will continue from persisted job state through hosted Cron.

## Non-blocking remaining work

- 122 records remain in manual research status, primarily where no sufficiently reliable public source or verified decision maker was found. Nine final lookups were moved to manual research after Tavily returned provider-limit status 432; the worker now treats this response as manual research instead of wasting retries.
- No real decision-maker contacts, opportunities, or follow-ups have been entered yet.
- Supabase leaked-password protection is an optional project setting still reported by the security advisor.
