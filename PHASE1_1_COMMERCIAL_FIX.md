# ALGAEU Phase 1.1 — Commercial Workflow Fix

## Corrected from user review

1. **Company segmentation is now explicit and operational**
   - Developers, engineering consultants, main contractors, industrial contractors, factories/industrial companies, manufacturers, suppliers, facility operators, and other accounts have separate filters with counts.
   - The company table now has a dedicated **نوع العميل** column; raw sector is no longer the only grouping.

2. **Outreach list / campaign targeting**
   - Outreach Strategy now supports selecting a segment, priority, and reachability.
   - User can choose either **all current filtered results** or **manually selected companies**.
   - Bulk preparation only includes companies with a verified decision maker and a direct email; generic company email is not treated as decision access.
   - External sending remains human-controlled; ALGAEU prepares the safe send list and personalized drafts.

3. **Company editing no longer sends the user back to the company list**
   - The Edit Company action is now an in-place modal inside Company 360.
   - Saving keeps the user on the same account page.

4. **Legacy Arabic draft rendering fixed**
   - Added decoding for literal Unicode escapes, JSON-escaped strings, HTML numeric entities, escaped newlines/tabs, and URI-encoded Arabic.
   - Draft view renders decoded content.
   - Added an explicit “إصلاح ترميز المسودة” action that persists the corrected body/subject when needed.

5. **Text editor widened**
   - Individual composer max width increased to 7xl.
   - Composer height increased to 480px with larger Arabic typography.
   - Existing draft editor increased to 320px and larger line spacing.

6. **Commercial Pursuit layer added**
   - Outreach now shows a segment-specific commercial objective, why the approach is used, and the recommended CTA before building a list.
   - This makes the workflow segment-led and objective-led rather than generic email generation.

## Verification

- `npm test`: PASS (all existing tests + Revenue Phase 1 tests).
- `npm run build`: not executed in this container because the ZIP does not include installed Next.js dependencies and package installation is unavailable here. The Vercel Preview build should be used as the final compile gate before production.
