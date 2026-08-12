-- Phase 2.0 — Project-Centric Capture Foundation
-- Additive only. Existing company/contact/outreach/opportunity workflows remain intact.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_name text not null,
  owner_company_id uuid references public.companies(id) on delete set null,
  source_signal_id uuid references public.external_signals(id) on delete set null,
  project_type text not null default 'UNCLASSIFIED',
  sector text not null default '',
  city text not null default '',
  country text not null default 'Saudi Arabia',
  stage text not null default 'CANDIDATE'
    check(stage in ('SIGNAL','CANDIDATE','VERIFIED','ACTIVE','RFQ','BID','NEGOTIATION','WON','LOST','ON_HOLD')),
  route_to_revenue text not null default 'UNDEFINED'
    check(route_to_revenue in ('DIRECT_OWNER','SUBCONTRACT','CONSULTANT_REFERRAL','SUPPLIER_PARTNERSHIP','VENDOR_REGISTRATION','TENDER','UNDEFINED')),
  verification_status text not null default 'needs_research'
    check(verification_status in ('needs_research','verified','rejected')),
  verification_confidence integer not null default 0 check(verification_confidence between 0 and 100),
  estimated_value numeric(18,2),
  currency text not null default 'SAR',
  probability integer not null default 0 check(probability between 0 and 100),
  expected_procurement_at date,
  expected_start_at date,
  source_url text not null default '',
  why_now text not null default '',
  next_action text not null default '',
  last_signal_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_entities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  entity_name text not null default '',
  entity_role text not null
    check(entity_role in ('OWNER','CONSULTANT','MAIN_CONTRACTOR','EPC','SUPPLIER','FACILITY_OPERATOR','VENDOR_PORTAL','OTHER')),
  status text not null default 'UNKNOWN'
    check(status in ('UNKNOWN','IDENTIFIED','ENGAGED','CONFIRMED','REMOVED')),
  source_url text not null default '',
  verification_status text not null default 'needs_research'
    check(verification_status in ('needs_research','verified','rejected')),
  verification_confidence integer not null default 0 check(verification_confidence between 0 and 100),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_packages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  package_name text not null,
  package_type text not null default 'OTHER',
  status text not null default 'IDENTIFIED'
    check(status in ('IDENTIFIED','EXPECTED','OPEN','RFQ','BID','SUBMITTED','AWARDED','LOST','NOT_RELEVANT')),
  scope_fit integer not null default 0 check(scope_fit between 0 and 100),
  qualification_status text not null default 'UNKNOWN'
    check(qualification_status in ('UNKNOWN','READY','CONDITIONAL','BLOCKED')),
  estimated_value numeric(18,2),
  currency text not null default 'SAR',
  source_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_access_paths (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  target_company_id uuid references public.companies(id) on delete set null,
  via_company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  path_type text not null
    check(path_type in ('DIRECT','REFERRAL','CONSULTANT','SUPPLIER','MAIN_CONTRACTOR','VENDOR_PORTAL','OTHER')),
  target_role text not null default '',
  strength integer not null default 0 check(strength between 0 and 100),
  status text not null default 'IDENTIFIED'
    check(status in ('IDENTIFIED','REQUESTED','INTRODUCED','ACTIVE','BLOCKED','CLOSED')),
  evidence_url text not null default '',
  next_action text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.capture_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null unique references public.projects(id) on delete cascade,
  objective text not null default '',
  win_strategy text not null default '',
  why_us text not null default '',
  commercial_risks text not null default '',
  delivery_risks text not null default '',
  competition_notes text not null default '',
  next_three_moves jsonb not null default '[]'::jsonb,
  bid_decision text not null default 'UNDECIDED'
    check(bid_decision in ('UNDECIDED','PURSUE','CONDITIONAL','NO_BID')),
  bid_decision_reason text not null default '',
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.project_entities enable row level security;
alter table public.project_packages enable row level security;
alter table public.project_access_paths enable row level security;
alter table public.capture_plans enable row level security;

revoke all on public.projects, public.project_entities, public.project_packages, public.project_access_paths, public.capture_plans from anon;
grant select,insert,update,delete on public.projects, public.project_entities, public.project_packages, public.project_access_paths, public.capture_plans to authenticated;

drop policy if exists projects_owner_all on public.projects;
create policy projects_owner_all on public.projects for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
drop policy if exists project_entities_owner_all on public.project_entities;
create policy project_entities_owner_all on public.project_entities for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
drop policy if exists project_packages_owner_all on public.project_packages;
create policy project_packages_owner_all on public.project_packages for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
drop policy if exists project_access_paths_owner_all on public.project_access_paths;
create policy project_access_paths_owner_all on public.project_access_paths for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
drop policy if exists capture_plans_owner_all on public.capture_plans;
create policy capture_plans_owner_all on public.capture_plans for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

create index if not exists projects_owner_stage_idx on public.projects(owner_id,stage);
create index if not exists projects_owner_route_idx on public.projects(owner_id,route_to_revenue);
create index if not exists projects_owner_company_idx on public.projects(owner_id,owner_company_id);
create index if not exists project_entities_project_idx on public.project_entities(project_id,entity_role);
create index if not exists project_packages_project_idx on public.project_packages(project_id,status);
create index if not exists project_access_paths_project_idx on public.project_access_paths(project_id,status);
