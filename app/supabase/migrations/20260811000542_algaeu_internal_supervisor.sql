-- نوفافيرك production activation: keep external research paused while the
-- Supervisor schedules only work that can be completed from persisted data.

create or replace function aj_agents.supervisor_tick(p_owner uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  total integer := 0;
begin
  if not exists (
    select 1
    from public.agent_settings
    where owner_id = p_owner
      and agent_name = 'Supervisor'
      and enabled
      and not paused
  ) then
    return 0;
  end if;

  if exists (
    select 1 from public.agent_settings
    where owner_id = p_owner and agent_name = 'Qualification' and enabled and not paused
  ) then
    for c in
      select id, priority, company_name
      from public.companies
      where owner_id = p_owner and priority in ('A', 'B')
      order by priority, lead_score desc
    loop
      perform aj_agents.enqueue_job(
        p_owner,
        'Qualification',
        c.id,
        case when c.priority = 'A' then 100 else 70 end,
        jsonb_build_object('company_name', c.company_name, 'priority', c.priority, 'source', 'internal_supervisor')
      );
      total := total + 1;
    end loop;
  end if;

  if exists (
    select 1 from public.agent_settings
    where owner_id = p_owner and agent_name = 'Outreach Draft' and enabled and not paused
  ) then
    for c in
      select id, priority, company_name
      from public.companies company
      where owner_id = p_owner
        and priority in ('A', 'B')
        and (
          nullif(general_email, '') is not null
          or nullif(email, '') is not null
          or nullif(general_phone, '') is not null
          or nullif(phone, '') is not null
          or exists (select 1 from public.contacts contact where contact.company_id = company.id)
        )
      order by priority, lead_score desc
    loop
      perform aj_agents.enqueue_job(
        p_owner,
        'Outreach Draft',
        c.id,
        case when c.priority = 'A' then 100 else 70 end,
        jsonb_build_object('company_name', c.company_name, 'priority', c.priority, 'source', 'internal_supervisor')
      );
      total := total + 1;
    end loop;
  end if;

  if exists (
    select 1 from public.agent_settings
    where owner_id = p_owner and agent_name = 'Follow-up' and enabled and not paused
  ) then
    for c in
      select id, priority, company_name
      from public.companies
      where owner_id = p_owner and nullif(last_contact, '') is not null
      order by priority, lead_score desc
    loop
      perform aj_agents.enqueue_job(
        p_owner,
        'Follow-up',
        c.id,
        90,
        jsonb_build_object('company_name', c.company_name, 'source', 'internal_supervisor')
      );
      total := total + 1;
    end loop;
  end if;

  if exists (
    select 1 from public.agent_settings
    where owner_id = p_owner and agent_name = 'Opportunity' and enabled and not paused
  ) then
    for c in
      select id, priority, company_name
      from public.companies
      where owner_id = p_owner
        and last_outcome in ('RFQ Expected', 'RFQ Received', 'Opportunity Identified', 'Requested Meeting')
      order by priority, lead_score desc
    loop
      perform aj_agents.enqueue_job(
        p_owner,
        'Opportunity',
        c.id,
        95,
        jsonb_build_object('company_name', c.company_name, 'source', 'internal_supervisor')
      );
      total := total + 1;
    end loop;
  end if;

  if exists (
    select 1 from public.agent_settings
    where owner_id = p_owner and agent_name = 'Daily Planner' and enabled and not paused
  ) then
    perform aj_agents.enqueue_job(
      p_owner,
      'Daily Planner',
      null,
      90,
      jsonb_build_object('source', 'internal_supervisor')
    );
    total := total + 1;
  end if;

  update public.agent_settings
  set last_run_at = now(),
      next_run_at = now() + interval '15 minutes',
      updated_at = now()
  where owner_id = p_owner and agent_name = 'Supervisor';

  return total;
end;
$$;

update public.agent_settings
set enabled = true,
    paused = case
      when agent_name in ('Verification', 'Enrichment', 'Decision Maker', 'Vendor Registration', 'Discovery adapter') then true
      else false
    end,
    next_run_at = case agent_name
      when 'Supervisor' then now() + interval '15 minutes'
      when 'Qualification' then now() + interval '15 minutes'
      when 'Outreach Draft' then now() + interval '15 minutes'
      when 'Opportunity' then now() + interval '15 minutes'
      when 'Follow-up' then now() + interval '30 minutes'
      when 'Daily Planner' then case
        when date_trunc('day', now()) + interval '2 hours' > now()
          then date_trunc('day', now()) + interval '2 hours'
        else date_trunc('day', now()) + interval '1 day 2 hours'
      end
      else next_run_at
    end,
    updated_at = now()
where agent_name in (
  '_global', 'Supervisor', 'Verification', 'Enrichment', 'Decision Maker',
  'Qualification', 'Vendor Registration', 'Outreach Draft', 'Follow-up',
  'Opportunity', 'Daily Planner', 'Discovery adapter'
);

update public.agent_jobs
set result = coalesce(result, '{}'::jsonb) || jsonb_build_object(
      'external_search_state', 'paused_quota_exhausted',
      'external_search_message', 'PAUSED — EXTERNAL SEARCH UNAVAILABLE'
    ),
    updated_at = now()
where agent_name in ('Verification', 'Enrichment', 'Decision Maker', 'Vendor Registration', 'Discovery adapter')
  and status = 'manual_research_required';

update public.messages
set subject = replace(replace(replace(coalesce(subject, ''), 'AJ-EDGE CRM', 'نوفافيرك'), 'AJ-EDGE', 'نوفافيرك'), 'AJ EDGE', 'نوفافيرك'),
    body = replace(replace(replace(coalesce(body, ''), 'AJ-EDGE CRM', 'نوفافيرك'), 'AJ-EDGE', 'نوفافيرك'), 'AJ EDGE', 'نوفافيرك'),
    updated_at = now()
where coalesce(subject, '') like '%AJ-EDGE%'
   or coalesce(subject, '') like '%AJ EDGE%'
   or coalesce(body, '') like '%AJ-EDGE%'
   or coalesce(body, '') like '%AJ EDGE%';

do $$
declare
  supervisor_job_id bigint;
  tavily_job_id bigint;
begin
  select jobid into supervisor_job_id from cron.job where jobname = 'aj-agents-supervisor';
  select jobid into tavily_job_id from cron.job where jobname = 'aj-agents-tavily-worker';
  if supervisor_job_id is not null then
    perform cron.alter_job(supervisor_job_id, active := true);
  end if;
  if tavily_job_id is not null then
    perform cron.alter_job(tavily_job_id, active := false);
  end if;
end;
$$;
