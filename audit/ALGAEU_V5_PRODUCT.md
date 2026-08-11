# ALGAEU V5 Product Upgrade

## Implemented

- Nine target segments with explainable, deterministic classification from saved company facts.
- Segment-specific cooperation angle, reason, confidence, evidence level, department, and recommended role.
- Recommended roles never create contacts or claim verification.
- Weighted completeness with critical and optional missing-data groups.
- One evidence-driven Next Best Action across the company lifecycle.
- Arabic and English message composition from company, segment, angle, target role, objective, style, channel, type, and one CTA.
- Eleven message types, three presentation styles, channel limits, anti-spam rules, 0–100 quality score, and duplicate similarity.
- Context-specific no-response, reply, vendor, meeting, and RFQ follow-up logic.
- Company 360 Outreach Intelligence and Outreach Strategy/editor surfaces.
- Quality threshold 65 before review approval; verified-decision-maker gate remains mandatory.
- Additive V5 schema for company intelligence overrides, contact role metadata, message quality metadata, standardized agent outputs, and RLS-protected user feedback.

## Safety

- No external provider, Tavily call, paid API, or external sending was invoked.
- No contacts, decision makers, replies, opportunities, projects, or evidence were fabricated.
- No production record was changed or deleted.
- Migration contains no destructive statement and performs no mass classification or priority rewrite.

## Verification

- TypeScript: PASS
- ESLint: PASS
- Tests: PASS (40/40)
- Production build: PASS (29 routes)
- Supabase server access/Auth/RLS before migration: PASS
- Counts preserved: 181 companies, 692 manual-research tasks, 881 drafts, one follow-up, 1,939 jobs.

## Blocking item

`SUPABASE_ACCESS_TOKEN` exists locally but is not a valid Supabase Personal Access Token for the Management API. CLI rejected its format and the official API returned HTTP 401. Therefore migration application, post-migration RLS verification, V5 persistence tests, internal-agent sample execution, and final authenticated V5 product QA were not performed. A valid PAT named `SUPABASE_ACCESS_TOKEN` in ignored `app/.env.local` is the only required external action.
