-- نوفافيرك Phase 3.1 — Saudi Market Intelligence
-- Source-centric discovery. Events are never promoted to projects automatically.

create table if not exists public.market_source_catalog (
  source_key text primary key,
  name text not null,
  source_type text not null check (source_type in ('GOV_TENDERS','INDUSTRIAL_NEWS','CONTRACTOR_MARKET','OWNER_SUPPLIER','OWNER_CONTRACTING','SUPPLIER_PORTAL')),
  base_url text not null,
  search_domain text not null,
  default_query text not null default '',
  trust_score integer not null default 80 check (trust_score between 0 and 100),
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.market_source_catalog enable row level security;
revoke all on public.market_source_catalog from anon;
revoke insert, update, delete on public.market_source_catalog from authenticated;
grant select on public.market_source_catalog to authenticated;
grant all on public.market_source_catalog to service_role;

drop policy if exists market_source_catalog_read on public.market_source_catalog;
create policy market_source_catalog_read on public.market_source_catalog
for select to authenticated using (active = true);

insert into public.market_source_catalog
(source_key,name,source_type,base_url,search_domain,default_query,trust_score,notes)
values
('ETIMAD','منصة اعتماد — المنافسات','GOV_TENDERS','https://monafasat.etimad.sa/tenders/index','etimad.sa',
 'منافسة OR مناقصة OR إنشاء OR تنفيذ OR صيانة OR تطوير OR تأهيل',100,
 'مصدر حكومي للمنافسات الحالية والمستقبلية.'),
('MODON','مدن — الأخبار والمشاريع الصناعية','INDUSTRIAL_NEWS','https://modon.gov.sa/ar/MediaCenter/modon-news/News/pages/default.aspx','modon.gov.sa',
 'مصنع OR توسعة OR إنشاء OR مستودع OR لوجستية OR استثمار OR عقد OR مشروع',100,
 'إشارات صناعية مبكرة: استثمارات، مصانع، مناطق لوجستية، ومشاريع تطوير المدن الصناعية.'),
('SCA','الهيئة السعودية للمقاولين / SCAVO','CONTRACTOR_MARKET','https://www.sca.sa/','sca.sa',
 'ترسية OR مشروع OR مقاول OR مناقصة OR تأهيل OR المنطقة الشرقية',95,
 'تقارير وأخبار قطاع المقاولات والترسيات والمؤشرات السوقية.'),
('ARAMCO_CONTRACTING','أرامكو — فرص التعاقد والمقاولات','OWNER_CONTRACTING','https://www.aramco.com/ar/what-we-do/suppliers/contracting-opportunities','aramco.com',
 'contracting opportunities OR General Bid Slates OR contractor qualification OR Saudi Arabia',100,
 'قناة رسمية للتأهيل وقوائم العطاءات العامة لخدمات المقاولات.'),
('ARAMCO_SUPPLIERS','أرامكو — الموردون والتأهيل','OWNER_SUPPLIER','https://www.aramco.com/ar/what-we-do/suppliers/become-a-supplier','aramco.com',
 'supplier registration OR qualification OR e-Marketplace OR contractor',100,
 'متطلبات التسجيل والتأهيل ومسارات الموردين والمقاولين.'),
('SABIC_SUPPLIERS','سابك — بوابة الموردين','SUPPLIER_PORTAL','https://supplier.sabic.com/RegisterSABICSupplier.aspx','supplier.sabic.com',
 'supplier registration OR technical qualification OR request for bid OR supplier onboarding',100,
 'التسجيل، التأهيل الفني، ثم استقبال طلبات العطاء إلكترونيًا.')
on conflict (source_key) do update set
 name=excluded.name, source_type=excluded.source_type, base_url=excluded.base_url,
 search_domain=excluded.search_domain, default_query=excluded.default_query,
 trust_score=excluded.trust_score, notes=excluded.notes, active=true;

create table if not exists public.market_source_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_key text not null references public.market_source_catalog(source_key) on delete cascade,
  enabled boolean not null default true,
  query_override text not null default '',
  cities text[] not null default '{}',
  sectors text[] not null default '{}',
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, source_key)
);

create table if not exists public.market_radar_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'RUNNING' check(status in ('RUNNING','COMPLETED','PARTIAL','FAILED')),
  sources_requested integer not null default 0,
  sources_completed integer not null default 0,
  queries_executed integer not null default 0,
  results_seen integer not null default 0,
  events_inserted integer not null default 0,
  provider text not null default '',
  errors jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.raw_market_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_key text not null references public.market_source_catalog(source_key) on delete restrict,
  run_id uuid references public.market_radar_runs(id) on delete set null,
  event_type text not null default 'OTHER'
    check(event_type in ('NEW_FACTORY','EXPANSION','WAREHOUSE','NEW_FACILITY','CONTRACT_AWARD','CONSULTANT_APPOINTED','GC_APPOINTED','LAND_ALLOCATION','PERMIT','VENDOR_REGISTRATION','PREQUALIFICATION','RFQ','RFP','TENDER','HIRING_SIGNAL','OTHER')),
  title text not null,
  summary text not null default '',
  source_url text not null,
  published_at timestamptz,
  detected_at timestamptz not null default now(),
  entity_name text not null default '',
  project_name text not null default '',
  city text not null default '',
  sector text not null default '',
  source_quality integer not null default 0 check(source_quality between 0 and 100),
  event_confidence integer not null default 0 check(event_confidence between 0 and 100),
  geography_confidence integer not null default 0 check(geography_confidence between 0 and 100),
  freshness_confidence integer not null default 0 check(freshness_confidence between 0 and 100),
  overall_score integer not null default 0 check(overall_score between 0 and 100),
  verification_status text not null default 'needs_research'
    check(verification_status in ('needs_research','verified','rejected')),
  review_status text not null default 'NEW'
    check(review_status in ('NEW','REVIEWED','CONVERTED','DISMISSED')),
  linked_company_id uuid references public.companies(id) on delete set null,
  linked_project_id uuid references public.projects(id) on delete set null,
  duplicate_key text not null,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, duplicate_key)
);

alter table public.market_source_subscriptions enable row level security;
alter table public.market_radar_runs enable row level security;
alter table public.raw_market_events enable row level security;

revoke all on public.market_source_subscriptions, public.market_radar_runs, public.raw_market_events from anon;
grant select,insert,update,delete on public.market_source_subscriptions, public.market_radar_runs, public.raw_market_events to authenticated;
grant all on public.market_source_subscriptions, public.market_radar_runs, public.raw_market_events to service_role;

do $$
declare t text;
begin
  foreach t in array array['market_source_subscriptions','market_radar_runs','raw_market_events'] loop
    execute format('drop policy if exists %I on public.%I', t||'_owner_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()))',
      t||'_owner_all', t
    );
  end loop;
end $$;

create index if not exists market_source_subscriptions_owner_enabled_idx
  on public.market_source_subscriptions(owner_id, enabled);
create index if not exists raw_market_events_owner_score_idx
  on public.raw_market_events(owner_id, overall_score desc, detected_at desc);
create index if not exists raw_market_events_owner_review_idx
  on public.raw_market_events(owner_id, review_status, verification_status);
