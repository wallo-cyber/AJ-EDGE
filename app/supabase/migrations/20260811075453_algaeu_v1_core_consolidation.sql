-- نوفافيرك V1 consolidation. Additive only: preserve all production records.

alter table public.contacts
  add column if not exists decision_maker boolean not null default false,
  add column if not exists verified_at timestamptz,
  add column if not exists archived_at timestamptz;

update public.contacts
set verification_status = case
  when verification_status in ('Verified', 'VERIFIED') then 'VERIFIED'
  when verification_status in ('Partially Verified', 'PARTIALLY_VERIFIED') then 'PARTIALLY_VERIFIED'
  else 'UNVERIFIED'
end;

update public.contacts
set decision_maker = true
where contact_classification = 'Decision Maker'
   or decision_level in ('Primary', 'Procurement', 'Projects', 'Engineering', 'Management');

alter table public.messages
  add column if not exists draft_classification text not null default 'PREPARATION',
  add column if not exists archived_at timestamptz;

update public.messages
set draft_classification = 'PREPARATION'
where draft_classification is null or draft_classification = '';

create table if not exists public.communication_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  channel text not null,
  direction text not null check (direction in ('INBOUND', 'OUTBOUND')),
  recipient text not null default '',
  occurred_at timestamptz not null,
  status text not null default 'COMPLETED',
  outcome text not null default '',
  notes text not null default '',
  evidence_reference text not null default '',
  next_action text not null default '',
  next_action_date date,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.communication_events enable row level security;
revoke all on public.communication_events from anon;
grant select, insert, update on public.communication_events to authenticated;

create policy "Users read own communication events"
  on public.communication_events for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "Users insert own communication events"
  on public.communication_events for insert to authenticated
  with check ((select auth.uid()) = owner_id and (select auth.uid()) = created_by);
create policy "Users update own communication events"
  on public.communication_events for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create index if not exists communication_events_owner_company_time_idx
  on public.communication_events(owner_id, company_id, occurred_at desc);
create index if not exists communication_events_owner_direction_time_idx
  on public.communication_events(owner_id, direction, occurred_at desc);
create index if not exists communication_events_contact_idx
  on public.communication_events(contact_id) where contact_id is not null;

alter table public.opportunities
  add column if not exists source_communication_event_id uuid references public.communication_events(id) on delete set null,
  add column if not exists archived_at timestamptz,
  add column if not exists closed_at timestamptz;

update public.opportunities set stage = case
  when upper(stage) in ('WON') then 'WON'
  when upper(stage) in ('LOST') then 'LOST'
  when upper(stage) in ('NEGOTIATION') then 'NEGOTIATION'
  when upper(stage) in ('PROPOSAL', 'SUBMITTED', 'UNDER REVIEW') then 'PROPOSAL'
  when upper(stage) in ('RFQ', 'RFQ RECEIVED', 'REQUEST RECEIVED') then 'RFQ_RECEIVED'
  when upper(stage) in ('QUALIFIED', 'MEETING') then 'QUALIFIED'
  else 'IDENTIFIED'
end;

create index if not exists opportunities_owner_stage_active_idx
  on public.opportunities(owner_id, stage, updated_at desc) where archived_at is null;

alter table public.agent_jobs
  add column if not exists research_evidence_url text not null default '',
  add column if not exists research_evidence_type text not null default '',
  add column if not exists research_extracted_fact text not null default '',
  add column if not exists research_confidence integer check (research_confidence between 0 and 100),
  add column if not exists research_notes text not null default '',
  add column if not exists research_resolution text not null default '';

create index if not exists agent_jobs_owner_manual_priority_idx
  on public.agent_jobs(owner_id, status, priority desc, created_at)
  where status = 'manual_research_required';
