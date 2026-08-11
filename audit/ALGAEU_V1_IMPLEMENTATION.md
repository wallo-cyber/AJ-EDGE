# ALGAEU V1 Consolidation — Implementation Report

Date: 2026-08-11

## Implemented

- Consolidated the primary navigation into Today, Companies, Contacts, Research, Outreach, Pipeline, Agents, and Reports. Search, Export, Settings, and System Status remain secondary.
- Preserved legacy URLs with redirects into the consolidated Research, Outreach, Pipeline, and Reports workspaces.
- Added central domain definitions for outreach state, contact verification, decision-maker qualification, and canonical opportunity stages.
- Rebuilt Today around a ranked top-20 next-best-action list using persisted business records.
- Added evidence-driven Manual Research resolution states without invoking an external provider.
- Added explicit Decision Maker and verified-at fields to contacts; contact removal is an archive operation.
- Added a communication event ledger. Contacted and Replied derive only from outbound and inbound events respectively.
- Kept historical drafts as preparation records and prevented approval without a verified decision maker.
- Consolidated opportunities, RFQs, proposals, and closed outcomes into Pipeline with canonical stages, required source/next action, nullable value, and archive/close operations.
- Replaced vendor-registration autosave with explicit Save/Cancel and server pagination.
- Added server-side search queries, paginated data helpers, focused Company 360 queries, invite-only login, and safe manual agent targeting.
- Kept external research paused and external sending disabled.

## Database migration

Migration: `app/supabase/migrations/20260811075453_algaeu_v1_core_consolidation.sql`

The migration is additive, preserves existing records, creates `communication_events`, adds decision-maker/evidence/archive fields, normalizes opportunity stages, enables RLS, revokes anonymous access, and grants ownership-scoped authenticated access. It has **not been applied remotely on this device** because Supabase CLI has no Personal Access Token. `SUPABASE_SECRET_KEY` remains server-only and was not misused as a DDL credential.

## Verification

- TypeScript: PASS
- ESLint: PASS with two non-blocking hook dependency warnings
- Automated tests: PASS, 28/28
- Production build: PASS, 29 routes
- Server-side Supabase continuity audit: PASS
- Auth Admin access: PASS
- Anonymous data denial: PASS
- Production data preserved: 181 companies, 0 contacts, 881 drafts, 1 follow-up, 1,919 jobs
- Duplicate groups: companies 0, contacts 0, jobs 0

## Release blocker

Apply the committed migration to Supabase before deploying this code. Required local-only credential: `SUPABASE_ACCESS_TOKEN` (Supabase Personal Access Token) for the CLI. Do not place it in Git or client code.
