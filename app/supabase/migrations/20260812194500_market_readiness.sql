create table if not exists public.readiness_items(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 item_key text not null,
 item_group text not null check(item_group in ('REGULATORY','TECHNICAL','FINANCIAL','PROOF','MARKETING')),
 label text not null, weight integer not null default 0 check(weight between 0 and 100),
 status text not null default 'MISSING' check(status in ('MISSING','IN_PROGRESS','COMPLETE')),
 document_url text not null default '', issued_at date, expires_at date, notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,item_key));
create table if not exists public.qualification_gateways(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 gateway_key text not null, name text not null, portal_url text not null default '',
 required_keys text[] not null default '{}',
 status text not null default 'NOT_STARTED' check(status in ('NOT_STARTED','READY_TO_APPLY','APPLIED','PENDING','QUALIFIED','EXPIRED')),
 applied_at timestamptz, qualified_at timestamptz, expires_at date, renewal_alert_at date, notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,gateway_key));
alter table public.companies add column if not exists required_gateway_key text not null default '';
alter table public.readiness_items enable row level security;
alter table public.qualification_gateways enable row level security;
revoke all on public.readiness_items,public.qualification_gateways from anon;
grant select,insert,update,delete on public.readiness_items,public.qualification_gateways to authenticated;
drop policy if exists readiness_items_owner_all on public.readiness_items;
create policy readiness_items_owner_all on public.readiness_items for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
drop policy if exists qualification_gateways_owner_all on public.qualification_gateways;
create policy qualification_gateways_owner_all on public.qualification_gateways for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create index if not exists readiness_items_owner_idx on public.readiness_items(owner_id);
create index if not exists qualification_gateways_owner_idx on public.qualification_gateways(owner_id);
