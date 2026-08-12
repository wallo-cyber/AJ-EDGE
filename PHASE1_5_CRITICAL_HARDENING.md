# ALGAEU Phase 1.5 — Critical Revenue Path Hardening

Implemented before any additional UI work.

## 1. Verification gate
- Canonical contact states are now only `UNVERIFIED`, `PARTIALLY_VERIFIED`, `VERIFIED`.
- Production DB has a CHECK constraint enforcing this vocabulary.
- Public-source research cannot auto-promote a contact to VERIFIED.
- Edge worker v22 creates evidence/candidates only; final VERIFIED status requires human approval.
- Behavioral test confirms `PARTIALLY_VERIFIED` and `Public Source Verified` cannot cross the decision-maker gate.

## 2. Buying Committee source of truth
- Application and DB now use eight roles: `ECONOMIC_BUYER`, `TECHNICAL_BUYER`, `PROJECT_OWNER`, `PROCUREMENT_GATEKEEPER`, `CONTRACTS_COMMERCIAL`, `SITE_USER`, `INFLUENCER`, `CHAMPION`.
- Replaced `PLANT_USER` with `SITE_USER`.
- Removed dead `lib/revenue-intelligence.ts` and its text-presence test.

## 3. Account Fit mathematics
- Fixed procurement accessibility from `accessScore*.10/100` to `accessScore*10/100`.
- Fixed decision coverage from `accessScore*.15/100` to `accessScore*15/100`.
- Added behavioral test proving full committee access can reach Account Fit grade A.
- Fixed in-place `.sort()` mutation in `buildBuyingCommittee`.

## 4. RLS / grants
- RLS remains enabled on `research_evidence`, `buying_committee_members`, `external_signals`.
- Removed all `anon` grants from the three tables in production.
- Replaced legacy policies with explicit owner-scoped select/insert/update/delete policies.
- Updated original table-creation migration so fresh deployments enable RLS in the same migration.
- Added corrective migration for existing installations.

## 5. Edge Function tenant isolation
- `agent-worker` production version: v22 ACTIVE.
- Authenticated user invocation is scoped to the JWT user's `owner_id` for jobs and companies.
- Internal cron invocation remains available only through the stored secret token.
- Secret comparison is constant-time style rather than direct string equality.
- CORS is restricted to ALGAEU Vercel domains and local development, not `*`.
- Every update is additionally constrained by the job's `owner_id`.
- The worker does not auto-create VERIFIED contacts or VERIFIED signals.

## Verification
- Full npm test suite passed after scoring/role changes before the final gate test.
- Domain tests: 6/6 PASS.
- Intelligence tests: 31/31 PASS.
- New runtime cron smoke test against worker v22 returned HTTP 200 with `scope: cron` and no auto-verification.
- Production query confirms zero `anon` grants on the three revenue intelligence tables.
- Production DB confirms contact verification and buying committee role CHECK constraints.
- Local `npm run build` could not run because the materialized ZIP has no installed `next` dependency; use Vercel Preview as the build-equivalent check.
