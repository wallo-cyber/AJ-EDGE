# ALGAEU Phase 1.4 — Evidence Review Gate

Live runtime:
- Brave Search is the primary provider; Tavily remains fallback only.
- Supabase agent-worker version 21 is ACTIVE.
- Decision-maker automatic verification now requires exact legal-entity cross-verification or an official company source.
- False-positive contacts discovered during pilot were removed.
- False-positive signal from Jenan organizational structure was marked rejected.

Front-end changes:
- Research now shows Brave Search as active.
- Added Evidence Review tab.
- Candidate decision makers remain needs_research until a human opens the source and approves them.
- Human approval creates a verified Contact and links it to Buying Committee.
- Human rejection excludes the candidate from Decision Access.
- Candidate signals can be verified/rejected by a human; verification never auto-creates an Opportunity.
- All approval/rejection actions are written to audit_events.

Pilot state after strict cleanup and cross-verification:
- 20+ accounts researched through Brave.
- 0 auto-verified contacts after removing false positives.
- Candidate people remain evidence-gated.
- External signals remain needs_research unless the source/title proves the commercial event.

QA:
- npm test PASS: 62/62.
- Local npm run build cannot run in this ZIP workspace because installed Next.js dependencies are not included. Vercel Preview build remains the production-equivalent build check.
