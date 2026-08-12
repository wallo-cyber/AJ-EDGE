create table if not exists public.company_documents(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 readiness_item_key text not null default '',
 document_type text not null default 'OTHER' check(document_type in ('CR','CONTRACTING_ACTIVITY','ZAKAT','GOSI','SCA','CONTRACTOR_CLASSIFICATION','ISO9001','ISO14001','ISO45001','HSE_PLAN','SAFETY_OFFICER','EQUIPMENT_LIST','FINANCIALS','BANK_FACILITY','BOND_CAPABILITY','PROJECT_PROOF','PERFORMANCE_CERTIFICATE','KEY_CVS','COMPANY_PROFILE','VALUE_PROPOSITION','OTHER')),
 file_name text not null, storage_path text not null, mime_type text not null default '', file_size bigint not null default 0,
 issued_at date, expires_at date,
 verification_status text not null default 'NEEDS_REVIEW' check(verification_status in ('NEEDS_REVIEW','VERIFIED','REJECTED')),
 current_version boolean not null default true, notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.company_documents enable row level security;
revoke all on public.company_documents from anon;
grant select,insert,update,delete on public.company_documents to authenticated;
drop policy if exists company_documents_owner_all on public.company_documents;
create policy company_documents_owner_all on public.company_documents for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create index if not exists company_documents_owner_idx on public.company_documents(owner_id);
create index if not exists company_documents_readiness_idx on public.company_documents(owner_id,readiness_item_key,current_version);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('company-documents','company-documents',false,20971520,array['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists company_documents_storage_select on storage.objects;
create policy company_documents_storage_select on storage.objects for select to authenticated using(bucket_id='company-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists company_documents_storage_insert on storage.objects;
create policy company_documents_storage_insert on storage.objects for insert to authenticated with check(bucket_id='company-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists company_documents_storage_update on storage.objects;
create policy company_documents_storage_update on storage.objects for update to authenticated using(bucket_id='company-documents' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='company-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists company_documents_storage_delete on storage.objects;
create policy company_documents_storage_delete on storage.objects for delete to authenticated using(bucket_id='company-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
