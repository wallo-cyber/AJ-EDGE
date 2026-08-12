# Phase 1.9 — Strict Acquisition Radar

Live Supabase changes:
- All 18 previously human-approved external signals were revalidated.
- Only 3 official vendor/supplier registration signals remain verified.
- 15 were returned to needs_research; 1 earlier false positive remains rejected.
- external_signals now stores entity, geography, event, freshness and source-quality confidence.
- Database CHECK prevents `verified` unless the quality gate is satisfied.
- agent-worker v24 is ACTIVE.
- Brave queries use short brand + role, not over-constrained legal-name-only searches.
- Third-party directories may create candidates only as `needs_research`; they can never auto-create a verified contact.
- Source extraction cleans directory title noise.

20-account pilot:
- 20 Decision Maker jobs were processed on the strict engine.
- 5 candidate people surfaced for human review.
- Candidates remain unverified and do not count toward Decision Access.
- Signal re-run produced only one new low-confidence candidate signal; no automatic verification.
- Current verified signal set is limited to official vendor/supplier registration routes.

UI/source parity:
- Evidence Review displays the five signal quality dimensions.
- Approve Signal is disabled until the quality gate is met.
- Worker source and migration are synchronized with live Supabase.
