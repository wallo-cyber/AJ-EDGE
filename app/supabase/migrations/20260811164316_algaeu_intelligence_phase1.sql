-- ALGAEU Intelligence Expansion Phase 1. Additive only; no production data is changed.
alter table public.companies
  add column if not exists company_types text[] not null default '{}'::text[],
  add column if not exists sectors text[] not null default '{}'::text[],
  add column if not exists opportunity_types text[] not null default '{}'::text[],
  add column if not exists company_size_tier text not null default 'UNKNOWN',
  add column if not exists financial_signal text not null default 'UNKNOWN',
  add column if not exists government_contractor_grade text not null default '',
  add column if not exists government_grade_verified_at timestamptz,
  add column if not exists relationship_risk_flag text not null default 'NONE';

alter table public.contacts
  add column if not exists general_phone text not null default '',
  add column if not exists direct_phone text not null default '',
  add column if not exists general_email text not null default '',
  add column if not exists direct_email text not null default '',
  add column if not exists decision_influence text not null default 'NEUTRAL',
  add column if not exists best_contact_window text not null default '',
  add column if not exists language_preference text not null default '';

create table if not exists public.sales_kit_assets (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null, asset_type text not null, sector_applicability text[] not null default '{}'::text[], language text not null default 'ARABIC', asset_url text not null default '', active boolean not null default true, notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.outreach_campaigns (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null, audience_filters jsonb not null default '{}'::jsonb, outreach_type text not null default 'COMPANY_INTRODUCTION', sequence jsonb not null default '[]'::jsonb, sales_kit_asset_ids uuid[] not null default '{}'::uuid[], status text not null default 'DRAFT', notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.campaign_companies (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 campaign_id uuid not null references public.outreach_campaigns(id) on delete cascade, company_id uuid not null references public.companies(id) on delete cascade,
 suggested_sequence jsonb not null default '[]'::jsonb, status text not null default 'SELECTED', created_at timestamptz not null default now(), unique(owner_id,campaign_id,company_id)
);
create table if not exists public.opportunity_signals (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade, company_id uuid not null references public.companies(id) on delete cascade,
 signal_type text not null, title text not null, description text not null default '', source_name text not null, source_url text not null, published_at timestamptz, detected_at timestamptz not null default now(), city text not null default '', sector text not null default '', confidence integer not null check(confidence between 0 and 100), commercial_relevance integer not null default 0 check(commercial_relevance between 0 and 100), freshness_score integer not null default 0 check(freshness_score between 0 and 100), evidence_quality integer not null default 0 check(evidence_quality between 0 and 100), opportunity_score integer not null default 0 check(opportunity_score between 0 and 100), score_reason text not null default '', estimated_project_value_range text, estimated_timeline text not null default '', source_tier text not null default 'TIER_3', status text not null default 'NEW', target_role text not null default '', recommended_service text not null default '', recommended_outreach_type text not null default '', next_action text not null default '', sla_due_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(owner_id,company_id,source_url,signal_type)
);

alter table public.user_settings add column if not exists max_new_companies_per_day integer not null default 10 check(max_new_companies_per_day between 1 and 100), add column if not exists max_followups_per_day integer not null default 15 check(max_followups_per_day between 1 and 100), add column if not exists opportunity_score_weights jsonb not null default '{"commercial_intent":25,"recency":15,"sector_fit":15,"geographic_fit":10,"evidence_quality":15,"company_priority":10,"accessibility":10}'::jsonb;

alter table public.sales_kit_assets enable row level security; alter table public.outreach_campaigns enable row level security; alter table public.campaign_companies enable row level security; alter table public.opportunity_signals enable row level security;
revoke all on public.sales_kit_assets,public.outreach_campaigns,public.campaign_companies,public.opportunity_signals from anon;
grant select,insert,update on public.sales_kit_assets,public.outreach_campaigns,public.campaign_companies,public.opportunity_signals to authenticated; grant all on public.sales_kit_assets,public.outreach_campaigns,public.campaign_companies,public.opportunity_signals to service_role;
do $$ declare t text; begin foreach t in array array['sales_kit_assets','outreach_campaigns','campaign_companies','opportunity_signals'] loop execute format('create policy "own_select_%s" on public.%I for select to authenticated using ((select auth.uid())=owner_id)',t,t); execute format('create policy "own_insert_%s" on public.%I for insert to authenticated with check ((select auth.uid())=owner_id)',t,t); execute format('create policy "own_update_%s" on public.%I for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id)',t,t); end loop; end $$;
create index if not exists companies_owner_intelligence_filters_idx on public.companies(owner_id,priority,lead_score desc) where archived_at is null;
create index if not exists opportunity_signals_owner_status_score_idx on public.opportunity_signals(owner_id,status,opportunity_score desc);
