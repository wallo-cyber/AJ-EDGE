-- ALGAEU V5 intelligence additions. Additive only; no existing row is rewritten.

alter table public.companies
  add column if not exists arabic_name text not null default '',
  add column if not exists english_name text not null default '',
  add column if not exists target_segment text not null default '',
  add column if not exists subsector text not null default '',
  add column if not exists business_type text not null default '',
  add column if not exists fit_score integer check (fit_score between 0 and 100),
  add column if not exists business_angle text not null default '',
  add column if not exists business_angle_reason text not null default '',
  add column if not exists business_angle_confidence integer check (business_angle_confidence between 0 and 100),
  add column if not exists business_angle_evidence_level text not null default '',
  add column if not exists recommended_department text not null default '',
  add column if not exists recommended_role text not null default '',
  add column if not exists recommended_language text not null default '',
  add column if not exists recommended_channel text not null default '',
  add column if not exists recommended_message_style text not null default '',
  add column if not exists human_override boolean not null default false;

alter table public.contacts
  add column if not exists arabic_name text not null default '',
  add column if not exists english_name text not null default '',
  add column if not exists role_category text not null default '';

alter table public.messages
  add column if not exists language text not null default '',
  add column if not exists message_type text not null default '',
  add column if not exists message_style text not null default '',
  add column if not exists quality_score integer check (quality_score between 0 and 100),
  add column if not exists quality_status text not null default '',
  add column if not exists quality_issues jsonb not null default '[]'::jsonb,
  add column if not exists duplicate_similarity integer check (duplicate_similarity between 0 and 100),
  add column if not exists rejected_at timestamptz;

alter table public.agent_jobs
  add column if not exists agent_version text not null default 'v5',
  add column if not exists output_confidence integer check (output_confidence between 0 and 100),
  add column if not exists output_reason text not null default '',
  add column if not exists output_evidence jsonb not null default '[]'::jsonb,
  add column if not exists output_next_action text not null default '';

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  target_type text not null,
  target_id uuid,
  rating text not null check (rating in ('USEFUL','NOT_USEFUL')),
  reason text not null default '',
  created_at timestamptz not null default now()
);

alter table public.user_feedback enable row level security;
revoke all on public.user_feedback from anon;
grant select, insert, update on public.user_feedback to authenticated;
create policy "Users read own feedback" on public.user_feedback for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Users insert own feedback" on public.user_feedback for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Users update own feedback" on public.user_feedback for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create index if not exists user_feedback_owner_company_idx on public.user_feedback(owner_id, company_id, created_at desc);
create index if not exists companies_owner_segment_priority_idx on public.companies(owner_id, target_segment, priority, lead_score desc) where archived_at is null;
create index if not exists messages_owner_quality_idx on public.messages(owner_id, quality_status, quality_score desc) where archived_at is null;
