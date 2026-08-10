create table if not exists public.company_discovery (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_name text not null,
  company_type text not null default '',
  sector text not null default '',
  city text not null default '',
  website text not null default '',
  general_phone text not null default '',
  general_email text not null default '',
  discovery_source text not null default 'CSV',
  source_url text not null default '',
  discovered_at timestamptz not null default now(),
  verification_status text not null default 'بحاجة تحقق',
  lead_score integer not null default 0 check (lead_score between 0 and 100),
  project_signal boolean not null default false,
  notes text not null default '',
  review_status text not null default 'جديد' check (review_status in ('جديد', 'بحاجة تحقق', 'مؤهل', 'غير مناسب', 'تمت إضافته للـ CRM')),
  company_id uuid references public.companies(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_discovery_owner_review_score_idx
  on public.company_discovery (owner_id, review_status, lead_score desc);
create index if not exists company_discovery_company_id_idx
  on public.company_discovery (company_id);
create unique index if not exists company_discovery_owner_name_unique
  on public.company_discovery (owner_id, lower(regexp_replace(company_name, '[^[:alnum:]ء-ي]+', '', 'g')))
  where review_status <> 'غير مناسب';
create unique index if not exists company_discovery_owner_website_unique
  on public.company_discovery (owner_id, lower(regexp_replace(website, '^https?://(www\.)?|/+$', '', 'g')))
  where website <> '' and review_status <> 'غير مناسب';
create unique index if not exists company_discovery_owner_phone_unique
  on public.company_discovery (owner_id, regexp_replace(general_phone, '[^0-9]+', '', 'g'))
  where general_phone <> '' and review_status <> 'غير مناسب';

alter table public.company_discovery enable row level security;
revoke all on table public.company_discovery from anon;
grant select, insert, update, delete on table public.company_discovery to authenticated;

create policy "Users can select own discovered companies"
  on public.company_discovery for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "Users can insert own discovered companies"
  on public.company_discovery for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Users can update own discovered companies"
  on public.company_discovery for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Users can delete own discovered companies"
  on public.company_discovery for delete to authenticated
  using ((select auth.uid()) = owner_id);
