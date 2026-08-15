alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('outreach-attachments', 'outreach-attachments', false, 104857600, null)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists outreach_attachments_storage_select on storage.objects;
create policy outreach_attachments_storage_select
on storage.objects for select to authenticated
using (
  bucket_id = 'outreach-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists outreach_attachments_storage_insert on storage.objects;
create policy outreach_attachments_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'outreach-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists outreach_attachments_storage_delete on storage.objects;
create policy outreach_attachments_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'outreach-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
