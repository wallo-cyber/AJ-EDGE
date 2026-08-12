# Phase 1.3 — Decision-Maker Acquisition + External Signal Radar

Implemented in live Supabase and source parity:
- Evidence-first research_evidence with source URL/provider/confidence/date found.
- Normalized buying_committee_members covering the eight required roles.
- External signals store with evidence status; nothing is auto-verified without a source.
- Existing Decision Maker jobs converted from generic research into role-directed research by company type.
- External Signal Radar jobs created for active accounts with strict evidence payloads and provider candidates.
- Reachability and Decision Access are separate; generic email never qualifies as direct decision access.
- Signal taxonomy covers expansion, MODON, vendor registration, RFQ/RFP/tenders, awards and key hiring.

Live DB after migration: 202 companies, 0 contacts, 0 committee members, 0 verified external signals. No person or signal was fabricated.

Provider execution requires real external provider credentials/connectors. The evidence schema and directed queues are now ready; no fake research result was inserted.
