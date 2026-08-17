-- نوفافيرك Phase 3.0 — Construction Acquisition OS
-- Inspired by construction intelligence / bid-management operating models.
-- Additive only; no existing data is deleted or rewritten.

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  update_type text not null check (update_type in (
    'EARLY_SIGNAL','PERMIT','DESIGN','CONSULTANT_APPOINTED','GC_APPOINTED','TENDER',
    'RFQ','AWARD','CONSTRUCTION_START','VENDOR_REGISTRATION','DOCUMENT','CONTACT','OTHER'
  )),
  title text not null,
  summary text not null default '',
  source_url text not null default '',
  source_name text not null default '',
  occurred_at timestamptz,
  verification_status text not null default 'needs_research'
    check (verification_status in ('needs_research','verified','rejected')),
  verification_confidence integer not null default 0 check (verification_confidence between 0 and 100),
  materiality integer not null default 50 check (materiality between 0 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.relationship_edges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  from_company_id uuid references public.companies(id) on delete cascade,
  from_contact_id uuid references public.contacts(id) on delete cascade,
  to_company_id uuid references public.companies(id) on delete cascade,
  to_contact_id uuid references public.contacts(id) on delete cascade,
  relationship_type text not null check (relationship_type in (
    'WORKED_WITH','CURRENT_PROJECT','PAST_PROJECT','REFERRAL','SUPPLIER_OF',
    'CONSULTANT_TO','CONTRACTOR_TO','CLIENT_OF','KNOWS','INTRODUCED_BY','OTHER'
  )),
  project_id uuid references public.projects(id) on delete set null,
  strength integer not null default 0 check (strength between 0 and 100),
  evidence_url text not null default '',
  verification_status text not null default 'needs_research'
    check (verification_status in ('needs_research','verified','rejected')),
  last_verified_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    from_company_id is not null or from_contact_id is not null
  ),
  check (
    to_company_id is not null or to_contact_id is not null
  )
);

create table if not exists public.pursuit_steps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  step_key text not null,
  step_order integer not null default 1,
  title text not null,
  objective text not null default '',
  target_role text not null default '',
  status text not null default 'TODO'
    check (status in ('TODO','READY','IN_PROGRESS','WAITING','DONE','SKIPPED','BLOCKED')),
  due_at timestamptz,
  completed_at timestamptz,
  requires_human_approval boolean not null default true,
  evidence_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, step_key)
);

create table if not exists public.bid_decisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_fit integer not null default 0 check (project_fit between 0 and 100),
  scope_fit integer not null default 0 check (scope_fit between 0 and 100),
  timing integer not null default 0 check (timing between 0 and 100),
  access integer not null default 0 check (access between 0 and 100),
  qualification integer not null default 0 check (qualification between 0 and 100),
  relationship integer not null default 0 check (relationship between 0 and 100),
  competition integer not null default 0 check (competition between 0 and 100),
  commercial_attractiveness integer not null default 0 check (commercial_attractiveness between 0 and 100),
  delivery_capability integer not null default 0 check (delivery_capability between 0 and 100),
  total_score integer not null default 0 check (total_score between 0 and 100),
  recommendation text not null default 'WATCH'
    check (recommendation in ('PURSUE','CONDITIONAL','WATCH','PASS')),
  human_decision text not null default 'UNDECIDED'
    check (human_decision in ('UNDECIDED','PURSUE','CONDITIONAL','NO_BID')),
  decision_reason text not null default '',
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_watchlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  sectors text[] not null default '{}',
  cities text[] not null default '{}',
  project_types text[] not null default '{}',
  stages text[] not null default '{}',
  signal_types text[] not null default '{}',
  min_signal_score integer not null default 60 check (min_signal_score between 0 and 100),
  min_project_value numeric(18,2),
  max_project_value numeric(18,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bid_board_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  package_id uuid references public.project_packages(id) on delete set null,
  invite_source text not null default '',
  received_at timestamptz,
  job_walk_at timestamptz,
  due_at timestamptz,
  status text not null default 'INVITED'
    check (status in ('INVITED','REVIEWING','NO_BID','BIDDING','SUBMITTED','CLARIFICATION','AWARDED','LOST')),
  responsible_person text not null default '',
  bid_value numeric(18,2),
  currency text not null default 'SAR',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_updates enable row level security;
alter table public.relationship_edges enable row level security;
alter table public.pursuit_steps enable row level security;
alter table public.bid_decisions enable row level security;
alter table public.project_watchlists enable row level security;
alter table public.bid_board_items enable row level security;

revoke all on public.project_updates, public.relationship_edges, public.pursuit_steps,
 public.bid_decisions, public.project_watchlists, public.bid_board_items from anon;

grant select,insert,update,delete on public.project_updates, public.relationship_edges,
 public.pursuit_steps, public.bid_decisions, public.project_watchlists, public.bid_board_items to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'project_updates','relationship_edges','pursuit_steps','bid_decisions','project_watchlists','bid_board_items'
  ] loop
    execute format('drop policy if exists %I on public.%I', t||'_owner_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()))',
      t||'_owner_all', t
    );
  end loop;
end $$;

create index if not exists project_updates_project_time_idx on public.project_updates(project_id, occurred_at desc);
create index if not exists relationship_edges_owner_strength_idx on public.relationship_edges(owner_id, strength desc);
create index if not exists relationship_edges_project_idx on public.relationship_edges(project_id);
create index if not exists pursuit_steps_project_order_idx on public.pursuit_steps(project_id, step_order);
create index if not exists bid_decisions_project_idx on public.bid_decisions(project_id, updated_at desc);
create index if not exists bid_board_owner_due_idx on public.bid_board_items(owner_id, due_at);
