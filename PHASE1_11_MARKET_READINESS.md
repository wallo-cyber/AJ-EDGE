# Phase 1.11 — Market Readiness

Integrated from the approved MERSAH readiness concept with one strategic change:
- Readiness never blocks relationship building, decision-maker research, or outreach.
- It controls commercial eligibility for formal qualification / Bid paths only.

Implemented:
- readiness_items + qualification_gateways with RLS and anon revoked.
- companies.required_gateway_key.
- Market Readiness page.
- 20 readiness items + 10 gateways seeded only when the user clicks Initialize; every item starts MISSING.
- No certificate/document is assumed complete.
- Company 360 shows route eligibility and missing requirements.
- Daily workspace shows Next Readiness Action only when there is no higher-priority commercial action.
- Consultants/referral partners remain relationship-eligible regardless of contractor qualification.
- Added six behavior tests.

Validation:
- npm test PASS, including readiness tests.
- Local next build unavailable in this extracted workspace because the Next binary is not installed; Vercel Preview remains the build validation step.
- Live Supabase migration applied. No readiness rows were seeded automatically.
