create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  company_name text not null default '',
  contract_number text not null default '',
  title text not null default '',
  value numeric not null default 0,
  start_date date,
  end_date date,
  status text not null default 'Draft',
  renewal_reminder_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  company_name text not null default '',
  quotation_number text not null default '',
  title text not null default '',
  value numeric not null default 0,
  issue_date date,
  valid_until date,
  status text not null default 'Draft',
  follow_up_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contracts enable row level security;
alter table public.quotations enable row level security;

drop policy if exists contracts_owner_all on public.contracts;
create policy contracts_owner_all on public.contracts for all to authenticated using (true) with check (true);

drop policy if exists quotations_owner_all on public.quotations;
create policy quotations_owner_all on public.quotations for all to authenticated using (true) with check (true);

create index if not exists contracts_company_id_idx on public.contracts(company_id);
create index if not exists quotations_company_id_idx on public.quotations(company_id);