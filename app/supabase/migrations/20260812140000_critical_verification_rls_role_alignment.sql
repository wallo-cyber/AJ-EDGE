-- Critical revenue-path hardening for existing installations.
update public.contacts
set verification_status = case
  when upper(trim(coalesce(verification_status,''))) = 'VERIFIED' then 'VERIFIED'
  when upper(trim(coalesce(verification_status,''))) in ('PUBLIC SOURCE VERIFIED','PARTIALLY VERIFIED','PARTIALLY_VERIFIED') then 'PARTIALLY_VERIFIED'
  else 'UNVERIFIED'
end;

alter table public.contacts drop constraint if exists contacts_verification_status_check;
alter table public.contacts add constraint contacts_verification_status_check
  check (verification_status in ('UNVERIFIED','PARTIALLY_VERIFIED','VERIFIED'));

update public.buying_committee_members set committee_role='SITE_USER' where committee_role='PLANT_USER';
alter table public.buying_committee_members drop constraint if exists buying_committee_members_committee_role_check;
alter table public.buying_committee_members add constraint buying_committee_members_committee_role_check
  check (committee_role in ('ECONOMIC_BUYER','TECHNICAL_BUYER','PROJECT_OWNER','PROCUREMENT_GATEKEEPER','CONTRACTS_COMMERCIAL','SITE_USER','INFLUENCER','CHAMPION'));

alter table public.research_evidence enable row level security;
alter table public.buying_committee_members enable row level security;
alter table public.external_signals enable row level security;

revoke all on public.research_evidence, public.buying_committee_members, public.external_signals from anon;
revoke all on public.research_evidence, public.buying_committee_members, public.external_signals from authenticated;
grant select, insert, update, delete on public.research_evidence, public.buying_committee_members, public.external_signals to authenticated;
grant all on public.research_evidence, public.buying_committee_members, public.external_signals to service_role;

do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname='public' and tablename in ('research_evidence','buying_committee_members','external_signals') loop
    execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename);
  end loop;
end $$;

create policy research_evidence_select_own on public.research_evidence for select to authenticated using (owner_id=(select auth.uid()));
create policy research_evidence_insert_own on public.research_evidence for insert to authenticated with check (owner_id=(select auth.uid()));
create policy research_evidence_update_own on public.research_evidence for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy research_evidence_delete_own on public.research_evidence for delete to authenticated using (owner_id=(select auth.uid()));
create policy buying_committee_select_own on public.buying_committee_members for select to authenticated using (owner_id=(select auth.uid()));
create policy buying_committee_insert_own on public.buying_committee_members for insert to authenticated with check (owner_id=(select auth.uid()));
create policy buying_committee_update_own on public.buying_committee_members for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy buying_committee_delete_own on public.buying_committee_members for delete to authenticated using (owner_id=(select auth.uid()));
create policy external_signals_select_own on public.external_signals for select to authenticated using (owner_id=(select auth.uid()));
create policy external_signals_insert_own on public.external_signals for insert to authenticated with check (owner_id=(select auth.uid()));
create policy external_signals_update_own on public.external_signals for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy external_signals_delete_own on public.external_signals for delete to authenticated using (owner_id=(select auth.uid()));
