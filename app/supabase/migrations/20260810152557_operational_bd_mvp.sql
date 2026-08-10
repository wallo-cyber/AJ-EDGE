alter table public.company_discovery
  add column if not exists activity text not null default '',
  add column if not exists address text not null default '',
  add column if not exists tags text[] not null default '{}',
  add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete set null,
  add column if not exists duplicate_status text not null default 'New Lead',
  add column if not exists score_reasons jsonb not null default '[]'::jsonb,
  add column if not exists data_completeness integer not null default 0 check (data_completeness between 0 and 100),
  add column if not exists contact_email text not null default '',
  add column if not exists contact_phone text not null default '';

alter table public.companies
  add column if not exists activity text not null default '',
  add column if not exists address text not null default '',
  add column if not exists source_name text not null default '',
  add column if not exists source_url text not null default '',
  add column if not exists lead_score integer not null default 0 check (lead_score between 0 and 100),
  add column if not exists data_completeness integer not null default 0 check (data_completeness between 0 and 100),
  add column if not exists tags text[] not null default '{}';

alter table public.contacts
  add column if not exists source text not null default '',
  add column if not exists verification_status text not null default 'Needs Verification',
  add column if not exists decision_role text not null default 'Other',
  add column if not exists contact_classification text not null default 'General Contact',
  add column if not exists contact_score integer not null default 0 check (contact_score between 0 and 100);

alter table public.follow_ups
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete set null,
  add column if not exists outcome text not null default '';

alter table public.opportunities
  add column if not exists contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists opportunity_type text not null default 'Other',
  add column if not exists description text not null default '',
  add column if not exists source text not null default '',
  add column if not exists next_action text not null default '',
  add column if not exists next_action_date date;

alter table public.messages
  add column if not exists contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists status text not null default 'Draft',
  add column if not exists template_name text not null default '',
  add column if not exists drafted_at timestamptz not null default now();

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, company text not null default '', phone text not null default '', email text not null default '', city text not null default '',
  specialization text not null default '', industries text not null default '', relationship_status text not null default 'New',
  source text not null default '', notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.agents enable row level security;
revoke all on public.agents from anon;
grant select, insert, update, delete on public.agents to authenticated;
create policy "Users select own agents" on public.agents for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Users insert own agents" on public.agents for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Users update own agents" on public.agents for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Users delete own agents" on public.agents for delete to authenticated using ((select auth.uid()) = owner_id);

alter table public.opportunities add column if not exists agent_id uuid references public.agents(id) on delete set null;
create index if not exists follow_ups_opportunity_id_idx on public.follow_ups(opportunity_id);
create index if not exists opportunities_contact_id_idx on public.opportunities(contact_id);
create index if not exists opportunities_agent_id_idx on public.opportunities(agent_id);
create index if not exists messages_contact_id_idx on public.messages(contact_id);
create index if not exists agents_owner_status_idx on public.agents(owner_id, relationship_status);
