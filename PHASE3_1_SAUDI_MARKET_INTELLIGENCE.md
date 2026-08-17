# نوفافيرك Phase 3.1 — Saudi Market Intelligence

Added:
- Saudi Market Intelligence primary module.
- Source catalog for Etimad, MODON, Saudi Contractors Authority, Aramco contracting/supplier channels, SABIC supplier channel.
- market-radar-worker Edge Function using Brave first and Tavily fallback.
- Source-specific domain-restricted discovery queries.
- Raw market event store with duplicate protection, event classification and scoring.
- Human review gate before converting a market signal to a Project Candidate.
- Project Candidate remains needs_research; no auto-verification.
- Command Center integration with Saudi market signal counts and latest radar run.
- Source enable/disable controls and per-source manual scan.
- Migration with RLS and anon revoke.
- Market intelligence behavior tests.

Pipeline:
Source → Search → Raw Market Event → Human Verify/Reject → Project Candidate → Project Intelligence → Relationships → Pursuit → Bid Board → Won.

No fabricated projects, companies, contacts, project values, relationships, RFQs, or awards were inserted.
