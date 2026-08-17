# نوفافيرك Operational V3

Date: 2026-08-11
Branch: `codex/aj-edge-mvp`

## Source of truth

The operational flow uses Supabase for companies, contacts, messages/drafts, communication events, follow-ups, opportunities, research jobs, agent settings, runs, and audit history. `companyOutreachState` is the shared definition for readiness/contact/reply, and `isVerifiedDecisionMaker` is the shared evidence gate. No migration was required.

## Repairs

- Reduced Companies to the ten operational fields requested and moved secondary detail to Company 360.
- Added six saved company views, whole-row navigation, contextual quick actions, mobile cards, and translated business statuses.
- Added a single Next Best Action to Company 360 and tightened its decision-maker presentation to require verification plus evidence.
- Added a practical Contacts empty state without creating fake people.
- Grouped 692 manual-research jobs by company while preserving every job record and its evidence workflow.
- Replaced contradictory agent labels with state derived from enabled/paused settings and queue/running/failed counts. Idle enabled agents now say they are ready and waiting for work.
- Kept Draft, Approved Draft, outbound communication, inbound reply, and opportunity as distinct persisted stages.
- Kept Tavily/external research paused and all external sending disabled.

## Data integrity

Before and after: 181 companies, 0 contacts/verified decision makers, 882 messages (881 drafts), 1 follow-up, 0 opportunities, 1,919 jobs, 1,227 completed, 692 manual research, 0 queued/running/failed. Duplicate company, contact, and idempotency-key job groups: zero. Supervisor resume created and processed zero jobs, proving completed work was not replayed.

## Verification

TypeScript, ESLint, 33 domain/agent/discovery/operational tests, and the Next.js production build pass. The read-only server audit confirms Supabase/Auth access, anonymous denial under RLS, all 11 internal agents enabled and unpaused, and unchanged counts. The local server responds at `http://localhost:3000`. Responsive implementation uses the authenticated drawer, desktop table, mobile cards, RTL direction, and no global forced table width at 390px. Browser authentication was not bypassed; protected visual screens require the existing signed-in user session for final human review.
