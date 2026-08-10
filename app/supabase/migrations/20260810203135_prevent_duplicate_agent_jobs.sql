create or replace function aj_agents.enqueue_job(p_owner uuid,p_agent text,p_company uuid default null,p_priority integer default 50,p_payload jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  select id into v_id from public.agent_jobs
  where owner_id=p_owner and agent_name=p_agent and company_id is not distinct from p_company
    and status in('queued','running','completed','manual_research_required') and created_at>now()-interval '1 day'
  order by created_at desc limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.agent_jobs(owner_id,company_id,agent_name,priority,payload)
  values(p_owner,p_company,p_agent,p_priority,p_payload) returning id into v_id;
  return v_id;
end $$;
revoke execute on function aj_agents.enqueue_job(uuid,text,uuid,integer,jsonb) from public,anon,authenticated;

delete from public.agent_jobs queued
where queued.status='queued' and exists(
  select 1 from public.agent_jobs done
  where done.owner_id=queued.owner_id and done.agent_name=queued.agent_name
    and done.company_id is not distinct from queued.company_id
    and done.status in('completed','manual_research_required') and done.created_at<=queued.created_at
);
