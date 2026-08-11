begin;
insert into public.communication_events(owner_id,company_id,channel,direction,recipient,occurred_at,created_by)
select c.owner_id,c.id,'TEST_ROLLBACK','OUTBOUND','transactional verification only',now(),c.owner_id
from public.companies c limit 1;
do $$
begin
  if (select count(*) from public.communication_events where channel='TEST_ROLLBACK' and direction='OUTBOUND') <> 1 then
    raise exception 'Transactional communication event verification failed';
  end if;
end $$;
rollback;

select jsonb_build_object(
  'companies', (select count(*) from public.companies),
  'contacts', (select count(*) from public.contacts),
  'verified_decision_makers', (select count(*) from public.contacts where decision_maker and verification_status='VERIFIED'),
  'follow_ups', (select count(*) from public.follow_ups),
  'opportunities', (select count(*) from public.opportunities),
  'messages', (select count(*) from public.messages),
  'drafts', (select count(*) from public.messages where status in ('Draft','Approved')),
  'communication_events', (select count(*) from public.communication_events),
  'rollback_residue', (select count(*) from public.communication_events where channel='TEST_ROLLBACK'),
  'agent_jobs', (select count(*) from public.agent_jobs),
  'agent_runs', (select count(*) from public.agent_runs),
  'manual_research', (select count(*) from public.agent_jobs where status='manual_research_required'),
  'company_intelligence', (select count(*) from public.company_intelligence),
  'rls_disabled', (select coalesce(jsonb_agg(tablename), '[]'::jsonb) from pg_tables where schemaname='public' and tablename in ('companies','contacts','messages','communication_events','follow_ups','opportunities','agent_jobs') and not rowsecurity),
  'anonymous_communication_privileges', has_table_privilege('anon','public.communication_events','select,insert,update,delete')
) as verification;
