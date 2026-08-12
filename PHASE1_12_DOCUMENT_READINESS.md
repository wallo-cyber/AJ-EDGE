# Phase 1.12 — Company Documents + Readiness

Implemented:
- Private Supabase Storage bucket: company-documents (20MB max, PDF/Word/Excel/JPG/PNG).
- Storage paths are scoped to the authenticated user's UUID.
- company_documents table with RLS and explicit authenticated CRUD.
- Upload from Market Readiness.
- Each uploaded file is linked to one readiness requirement.
- Upload alone does NOT mark a requirement complete.
- Human review gate: NEEDS_REVIEW → VERIFIED / REJECTED.
- On VERIFIED, the readiness item becomes COMPLETE and inherits issued/expiry dates.
- Previous verified document versions for the same readiness item become non-current.
- Company Profile, CVs, certificates, financials, equipment list, HSE, project proof, etc. are supported.
- Dashboard shows: readiness %, completed items, verified documents, documents awaiting review, and renewals due within 60 days.
- Missing requirements are displayed explicitly.
- Verified document library shows issue date, expiry date, current/previous version, and renewal warning.
- Files are opened through short-lived signed URLs; bucket is not public.
- No OCR/AI guess marks a document verified. Classification and dates remain user-controlled in this phase.

Safety:
- No existing documents were marked complete automatically.
- No production company readiness row was invented.
