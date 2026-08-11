-- Conservative, manual-only nurture metadata. No sender, scheduler, or external provider is created.
alter table public.companies
  add column if not exists nurture_status text not null default 'ACTIVE',
  add column if not exists last_nurture_date date,
  add column if not exists next_nurture_date date,
  add column if not exists nurture_frequency_days integer not null default 60 check (nurture_frequency_days between 30 and 180),
  add column if not exists nurture_stage text not null default 'NURTURE',
  add column if not exists last_content_type text not null default '',
  add column if not exists engagement_status text not null default 'UNKNOWN',
  add column if not exists nurture_pause_reason text not null default '';

create table if not exists public.nurture_suggestions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  campaign_id uuid references public.outreach_campaigns(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  decision text not null check (decision in ('CONTACT_NOW','FOLLOW_UP','NURTURE','WAIT','RE_ENGAGE','DO_NOT_CONTACT')),
  reason text not null,
  recommended_channel text not null default 'EMAIL',
  recommended_message_type text not null default 'NURTURE',
  recommended_attachment_id uuid references public.sales_kit_assets(id) on delete set null,
  suggested_at timestamptz not null default now(),
  suggested_send_date date,
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','DISMISSED','PAUSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.nurture_suggestions enable row level security;
revoke all on public.nurture_suggestions from anon;
grant select, insert, update on public.nurture_suggestions to authenticated;
grant all on public.nurture_suggestions to service_role;
create policy "nurture_suggestions_select_own" on public.nurture_suggestions for select to authenticated using ((select auth.uid()) = owner_id);
create policy "nurture_suggestions_insert_own" on public.nurture_suggestions for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "nurture_suggestions_update_own" on public.nurture_suggestions for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create index if not exists nurture_suggestions_owner_company_idx on public.nurture_suggestions(owner_id, company_id, status, suggested_at desc);
