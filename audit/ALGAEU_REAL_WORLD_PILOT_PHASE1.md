# ALGAEU Real-World Pilot — Phase 1

Date: 2026-08-11

## Cohort

Production contains 12 active Priority A companies. The Pilot therefore includes all 12, followed by the eight highest-ranked remaining companies using lead score, completeness, and relevance to construction, industry, engineering, oil and gas, or real-estate development. No stored priority was falsified.

Top five by the reproducible ranking:

1. Ajdan Real Estate Development Company — score 91, completeness 85%
2. Emmar International Business Trading Co. Ltd — score 91, completeness 85%
3. Jenan Real Estate Company — score 91, completeness 85%
4. Dar Wa Emaar Real Estate Investment & Development — score 91, completeness 85%
5. Retal Urban Development Company — score 91, completeness 85%

## Persisted work

- 78 existing research jobs were reprioritized and grouped using one stable workflow identifier per pilot company. Nothing was deleted.
- 20 idempotent Qualification jobs were created and completed using current Supabase data only.
- All 20 companies are `NEEDS DECISION MAKER`; no contact has evidence-backed VERIFIED status.
- Four companies have a stored vendor-registration URL; 16 need vendor-registration review.
- Zero new contacts, drafts, communication events, follow-ups, or opportunities were fabricated.
- Existing drafts remain preparation artifacts and are not Ready for Review because none is linked to a verified decision maker.

## End-to-end gate test

Ajdan was followed through Company → persisted research workflow → decision-maker gate. The flow correctly stops at `NEEDS DECISION MAKER`; Contact, tailored Draft, Review, and Follow-up preparation remain unavailable until a real person and evidence are entered. This is a passing safety-path test, not a fabricated completed funnel.

## Verification

Supervisor ran after cohort setup and processed zero additional work. Final queue: 0 queued, 0 running, 0 failed. Duplicate company/contact/idempotency groups: zero. Supabase/Auth/RLS server audit passed. External research stayed PAUSED and external sending stayed DISABLED.
