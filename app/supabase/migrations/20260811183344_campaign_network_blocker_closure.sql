-- Additive blocker closure: campaign-owned manual drafts and evidence-backed company network.
alter table public.messages add column if not exists campaign_id uuid references public.outreach_campaigns(id) on delete set null, add column if not exists personalization_score integer check (personalization_score between 0 and 100), add column if not exists claim_warning text not null default '', add column if not exists recommended_attachment_id uuid references public.sales_kit_assets(id) on delete set null;

create table if not exists public.company_relationships (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 source_company_id uuid not null references public.companies(id) on delete cascade, target_company_id uuid references public.companies(id) on delete set null,
 relationship_type text not null, opportunity_id uuid references public.opportunities(id) on delete set null,
 project_reference text not null default '', evidence text not null default '', source_url text not null default '', confidence integer not null default 0 check(confidence between 0 and 100), verified_at timestamptz, status text not null default 'UNVERIFIED' check(status in ('UNVERIFIED','VERIFIED','REJECTED')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (source_company_id <> target_company_id),
 check (status <> 'VERIFIED' or (length(trim(evidence)) > 0 and length(trim(source_url)) > 0 and verified_at is not null)),
 unique(owner_id,source_company_id,target_company_id,relationship_type,source_url)
);
alter table public.company_relationships enable row level security;
revoke all on public.company_relationships from anon;
grant select,insert,update on public.company_relationships to authenticated; grant all on public.company_relationships to service_role;
create policy "relationships_select_own" on public.company_relationships for select to authenticated using ((select auth.uid())=owner_id);
create policy "relationships_insert_own" on public.company_relationships for insert to authenticated with check ((select auth.uid())=owner_id);
create policy "relationships_update_own" on public.company_relationships for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create index if not exists messages_campaign_company_idx on public.messages(owner_id,campaign_id,company_id,created_at desc) where archived_at is null;
create index if not exists company_relationships_source_idx on public.company_relationships(owner_id,source_company_id,status,confidence desc);
