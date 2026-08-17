# نوفافيرك Phase 3.0 — World-Class Construction Acquisition OS

Operating references:
- Dodge Construction Network: early project visibility, lifecycle intelligence, project/relationship context, saved matching.
- ConstructConnect: project intelligence, filtering, qualification before pursuit.
- BuildingConnected / Bid Board Pro: centralized bid invites, due dates, job walks, workload and bid decisions.

Implemented in this build:
1. Project Intelligence
   - Lifecycle: Early Planning → Design → Preconstruction → Bidding → Awarded.
   - Project filtering by city, lifecycle, search and Capture Score.
   - Shows owner, last project update, value, stakeholders, work packages and bid items.
2. Relationship Intelligence
   - Verified relationship edges between firms/contacts.
   - Relationship type, strength, evidence and project linkage.
   - Manual relationship capture; no inferred relationship is treated as fact.
3. Bid Board
   - Bid invites, RFQ source, job walk, due date, responsible person and status.
   - Overdue / Due Soon / Upcoming triage.
4. Pursuit Workspace
   - Project lifecycle updates with evidence.
   - Route-specific pursuit playbooks.
   - Human approval gates retained.
   - Bid/No-Bid scoring separated from explicit human decision.
   - Project relationship panel.
5. Project Watchlists
   - Saved sector/city/signal filters with minimum signal score.
   - Matches stored signals; does not auto-create opportunities.
6. Data model
   - project_updates
   - relationship_edges
   - pursuit_steps
   - bid_decisions
   - project_watchlists
   - bid_board_items
   - RLS enabled; anon revoked; owner-scoped authenticated CRUD.
7. Existing data preserved.
8. No fabricated companies, contacts, projects, signals, relationships, bids or values were inserted.

Database migration was applied to the active AJ-EDGE Supabase project.
