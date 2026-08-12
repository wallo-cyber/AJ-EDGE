# Phase 1.13.3 — Document Upload Limits

Updated document upload behavior:
- Company Profile PDF: up to 150 MB
- Other PDF: up to 100 MB
- Word DOC/DOCX: up to 50 MB
- Excel XLS/XLSX: up to 50 MB
- JPG/JPEG/PNG/WEBP: up to 30 MB
- Supabase Storage bucket hard limit: 150 MB
- Storage bucket remains private.
- Client validates extension, MIME type and size before upload.
- Upload errors now report the actual reason instead of a generic message.
- Readiness upload UI displays the exact limits.
- Existing human verification gate remains unchanged.
