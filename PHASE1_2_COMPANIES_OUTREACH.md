# نوفافيرك Phase 1.2 — Companies & Outreach

- Rebuilt desktop companies table to fit the viewport without the previous 1380px forced width.
- Reduced the table to five commercial columns: company, segment, priority, decision access, and next commercial action.
- Moved sector/city and lead score into compact secondary context instead of separate wide columns.
- Added a visible Email Outreach button in the Companies page header.
- The button preserves the currently selected segment and opens Outreach Strategy on that same segment.
- Outreach already supports filtered-sector scope or manually selected companies and only counts verified decision makers with direct email as email-ready.
- Existing Arabic draft repair and wide message editor remain enabled.
- Full npm test suite passed after this change.
- Local npm run build could not execute because the materialized ZIP does not include installed Next.js dependencies; use Vercel Preview build as the deployment verification, as in Phase 1.1.
