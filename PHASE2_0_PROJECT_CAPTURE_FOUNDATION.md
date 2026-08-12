# ALGAEU Phase 2.0 — Project Capture Foundation

Goal
Turn ALGAEU from company-centric CRM behavior into a project/opportunity capture operating system without deleting or replacing the existing workflows.

Implemented
- New primary navigation item: Projects.
- New Project entity with stages from Candidate through Won/Lost.
- Route-to-Revenue: Direct Owner, Subcontract, Consultant Referral, Supplier Partnership, Vendor Registration, Tender.
- Project Graph: Owner, Consultant, Main Contractor, EPC, Supplier, Facility Operator, Vendor Portal.
- Work Packages with scope fit and qualification status.
- Access Paths that model how we can actually enter the project.
- Capture Plan with Objective, Win Strategy, Why Us, Risks, Competition, Next 3 Moves, and explicit human Bid/No-Bid.
- Capture Score based on verified evidence, mapped stakeholders, access path, package fit, and active package status.
- Project Next Move engine.
- Daily Workspace now includes project capture actions alongside replies/follow-ups/outreach.
- Verified external signals can be selected when manually creating a Project Candidate.
- Project Candidate is never auto-verified from a signal.
- Project human verification requires a source URL and confidence >= 70%.
- No project, party, package, access path, or capture plan was fabricated or seeded.

Database
- Additive tables only: projects, project_entities, project_packages, project_access_paths, capture_plans.
- RLS enabled on all five.
- anon revoked.
- owner-scoped authenticated CRUD policies.
- Existing companies, contacts, messages, opportunities, readiness, and other data untouched.

Validation
- Existing tests pass.
- Readiness tests pass.
- New Project Capture behavior tests: 6/6 pass.
- Live database contains zero fabricated Project Capture rows after migration.
