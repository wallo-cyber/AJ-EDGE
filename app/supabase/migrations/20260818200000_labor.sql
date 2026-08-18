-- قسم العمالة — نفس بنية جدول vendors تمامًا (نفس الأعمدة والاستخدام)، بس باسم جدول مستقل
create table if not exists public.labor (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  trade text,
  contact_name text,
  phone text,
  email text,
  city text,
  scope text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.labor enable row level security;

drop policy if exists labor_all on public.labor;
create policy labor_all on public.labor for all to authenticated using(true) with check(true);

create index if not exists labor_trade_idx on public.labor(trade);

-- ربط العمالة بالمشاريع — نفس بنية project_vendors تمامًا
create table if not exists public.project_labor (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  labor_id uuid not null references public.labor(id) on delete cascade,
  role text not null default '',
  status text not null default 'مبدئي',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, labor_id, role)
);

alter table public.project_labor enable row level security;

drop policy if exists project_labor_owner_all on public.project_labor;
create policy project_labor_owner_all on public.project_labor for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

create index if not exists project_labor_project_idx on public.project_labor(project_id,status);
create index if not exists project_labor_labor_idx on public.project_labor(labor_id);
