create or replace function aj_agents.supervisor_tick(p_owner uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare c record; a text; total integer:=0;
begin
  for c in select id,priority,company_name from public.companies where owner_id=p_owner and priority='A' order by lead_score desc loop
    foreach a in array array['Verification','Enrichment','Decision Maker','Qualification','Vendor Registration','Outreach Draft','Follow-up','Opportunity'] loop
      perform aj_agents.enqueue_job(p_owner,a,c.id,100,jsonb_build_object('company_name',c.company_name,'priority',c.priority)); total:=total+1;
    end loop;
  end loop;
  for c in select id,priority,company_name from public.companies b
    where owner_id=p_owner and priority='B'
      and not exists(select 1 from public.agent_jobs j where j.owner_id=p_owner and j.company_id=b.id and j.agent_name='Qualification' and j.status in('queued','running','completed','manual_research_required') and j.created_at>now()-interval '1 day')
    order by lead_score desc limit 20
  loop
    foreach a in array array['Verification','Enrichment','Decision Maker','Qualification','Vendor Registration','Outreach Draft'] loop
      perform aj_agents.enqueue_job(p_owner,a,c.id,70,jsonb_build_object('company_name',c.company_name,'priority',c.priority)); total:=total+1;
    end loop;
  end loop;
  perform aj_agents.enqueue_job(p_owner,'Daily Planner',null,90,'{}');
  perform aj_agents.enqueue_job(p_owner,'Discovery adapter',null,40,'{}');
  return total+2;
end $$;
revoke execute on function aj_agents.supervisor_tick(uuid) from public,anon,authenticated;

select public.agent_supervisor_tick();
