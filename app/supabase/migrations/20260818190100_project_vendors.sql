-- ربط الموردين بالمشاريع — علاقة many-to-many بسيطة (الخيار أ من معاينة الأمثلة)
create table if not exists public.project_vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  role text not null default '',
  status text not null default 'مبدئي',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, vendor_id, role)
);

alter table public.project_vendors enable row level security;

drop policy if exists project_vendors_owner_all on public.project_vendors;
create policy project_vendors_owner_all on public.project_vendors for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

create index if not exists project_vendors_project_idx on public.project_vendors(project_id,status);
create index if not exists project_vendors_vendor_idx on public.project_vendors(vendor_id);
