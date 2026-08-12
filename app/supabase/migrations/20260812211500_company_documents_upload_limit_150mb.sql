-- Storage hardening for large company profiles.
update storage.buckets
set file_size_limit=157286400,
    allowed_mime_types=array[
      'application/pdf',
      'image/png','image/jpeg','image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
where id='company-documents';
