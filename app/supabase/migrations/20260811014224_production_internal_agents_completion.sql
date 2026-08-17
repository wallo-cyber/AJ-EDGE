-- نوفافيرك production completion. External search remains paused; the same
-- persisted agents continue in deterministic internal mode.

alter table public.companies
  add column if not exists archived_at timestamptz,
  add column if not exists vendor_registration_requirements text not null default '',
  add column if not exists vendor_registration_account_status text not null default '',
  add column if not exists vendor_registration_last_checked timestamptz,
  add column if not exists vendor_registration_next_action text not null default '',
  add column if not exists vendor_registration_notes text not null default '';

alter table public.user_settings
  add column if not exists company_profile_name text not null default '',
  add column if not exists target_sectors text[] not null default array[]::text[],
  add column if not exists target_cities text[] not null default array[]::text[],
  add column if not exists priority_a_threshold integer not null default 80 check (priority_a_threshold between 0 and 100),
  add column if not exists priority_b_threshold integer not null default 60 check (priority_b_threshold between 0 and 100),
  add column if not exists initial_follow_up_days integer not null default 3 check (initial_follow_up_days between 1 and 90),
  add column if not exists follow_up_interval_days integer not null default 7 check (follow_up_interval_days between 1 and 90);

alter table public.agent_jobs
  add column if not exists idempotency_key text;

create unique index if not exists agent_jobs_owner_idempotency_idx
  on public.agent_jobs(owner_id, agent_name, coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), idempotency_key)
  where idempotency_key is not null;

create index if not exists companies_owner_archive_idx
  on public.companies(owner_id, archived_at);

create or replace function aj_agents.company_work_fingerprint(p_company uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select md5(concat_ws('|',
    coalesce(c.company_name, ''), coalesce(c.company_type, ''), coalesce(c.sector, ''),
    coalesce(c.activity, ''), coalesce(c.city, ''), coalesce(c.website, ''),
    coalesce(c.general_email, c.email, ''), coalesce(c.general_phone, c.phone, ''),
    coalesce(c.source_url, ''), coalesce(c.vendor_registration_url, ''),
    coalesce(c.last_contact, ''), coalesce(c.last_outcome, ''),
    (select count(*)::text from public.contacts x where x.company_id = c.id),
    (select count(*)::text from public.messages x where x.company_id = c.id),
    (select count(*)::text from public.follow_ups x where x.company_id = c.id),
    (select count(*)::text from public.opportunities x where x.company_id = c.id)
  ))
  from public.companies c
  where c.id = p_company;
$$;

revoke execute on function aj_agents.company_work_fingerprint(uuid) from public, anon, authenticated;

create or replace function aj_agents.enqueue_job(
  p_owner uuid,
  p_agent text,
  p_company uuid default null,
  p_priority integer default 50,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_key text;
begin
  if p_company is not null then
    v_key := md5(p_agent || '|' || coalesce(aj_agents.company_work_fingerprint(p_company), '') || '|' || coalesce(p_payload->>'mode', 'internal'));
  else
    v_key := md5(p_agent || '|' || current_date::text || '|' || coalesce(p_payload->>'mode', 'internal'));
  end if;

  select id into v_id
  from public.agent_jobs
  where owner_id = p_owner
    and agent_name = p_agent
    and company_id is not distinct from p_company
    and idempotency_key = v_key
    and status in ('queued', 'running', 'completed', 'manual_research_required')
  order by created_at desc
  limit 1;
  if v_id is not null then return v_id; end if;

  insert into public.agent_jobs(owner_id, company_id, agent_name, priority, payload, idempotency_key)
  values(p_owner, p_company, p_agent, p_priority, p_payload || jsonb_build_object('mode', 'internal'), v_key)
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from public.agent_jobs
    where owner_id = p_owner
      and agent_name = p_agent
      and company_id is not distinct from p_company
      and idempotency_key = v_key
    order by created_at desc limit 1;
  end if;
  return v_id;
end;
$$;

revoke execute on function aj_agents.enqueue_job(uuid, text, uuid, integer, jsonb)
  from public, anon, authenticated;

create or replace function aj_agents.refresh_company_qualification(p_company uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_qualification text;
  v_reason text;
  v_angle text;
  v_next text;
begin
  select
    case
      when c.status in ('مرفوض', 'Rejected') then 'Not Relevant'
      when c.priority = 'A' and c.lead_score >= 80 then 'Target'
      when c.priority in ('A', 'B') and c.data_completeness >= 45 then 'Potential'
      when c.priority = 'C' then 'Low Priority'
      else 'Needs Research'
    end,
    case
      when c.status in ('مرفوض', 'Rejected') then 'Marked as not relevant by the user'
      when c.priority = 'A' and c.lead_score >= 80 then 'High target fit based on persisted lead score, sector, and priority'
      when c.priority in ('A', 'B') and c.data_completeness >= 45 then 'Relevant target with sufficient persisted business data'
      when c.priority = 'C' then 'Low current fit based on the persisted lead score'
      else 'More verified company data is required before qualification'
    end,
    case
      when lower(coalesce(c.company_type, '')) similar to '%(main contractor|مقاول رئيسي)%' then 'Subcontracting and specialist contracting packages'
      when lower(coalesce(c.company_type, '')) similar to '%(real estate|developer|مطور)%' then 'Contractor registration and upcoming development packages'
      when lower(coalesce(c.company_type, '')) similar to '%(factory|industrial|مصنع|صناعي)%' then 'Industrial civil works, expansions, and maintenance'
      else 'General contracting and vendor registration'
    end,
    case
      when c.data_completeness < 70 then 'Complete missing company data through manual research'
      when not exists (select 1 from public.contacts x where x.company_id = c.id) then 'Identify and verify the appropriate decision maker'
      when nullif(trim(c.vendor_registration_url), '') is null then 'Review official vendor or contractor registration options'
      else 'Review the prepared outreach draft and approve it manually'
    end
  into v_qualification, v_reason, v_angle, v_next
  from public.companies c where c.id = p_company;

  update public.companies
  set qualification_status = v_qualification,
      qualification_reason = v_reason,
      contracting_angle = v_angle,
      next_action = v_next,
      updated_at = now()
  where id = p_company
    and (qualification_status, qualification_reason, contracting_angle, next_action)
      is distinct from (v_qualification, v_reason, v_angle, v_next);
end;
$$;

revoke execute on function aj_agents.refresh_company_qualification(uuid) from public, anon, authenticated;

create or replace function aj_agents.supervisor_tick(p_owner uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  a text;
  total integer := 0;
  v_job uuid;
begin
  if not exists (
    select 1 from public.agent_settings
    where owner_id = p_owner and agent_name = 'Supervisor' and enabled and not paused
  ) then return 0; end if;

  for c in
    select id, priority, company_name, lead_score,
      (nullif(general_email, '') is not null or nullif(email, '') is not null
       or nullif(general_phone, '') is not null or nullif(phone, '') is not null
       or exists(select 1 from public.contacts x where x.company_id = companies.id)) as contactable,
      nullif(last_contact, '') is not null as contacted,
      last_outcome
    from public.companies
    where owner_id = p_owner and archived_at is null
    order by case priority when 'A' then 1 when 'B' then 2 else 3 end, lead_score desc
  loop
    foreach a in array array['Verification','Enrichment','Decision Maker','Qualification','Vendor Registration'] loop
      if exists(select 1 from public.agent_settings where owner_id=p_owner and agent_name=a and enabled and not paused) then
        v_job := aj_agents.enqueue_job(p_owner, a, c.id, case c.priority when 'A' then 100 when 'B' then 70 else 40 end,
          jsonb_build_object('company_name', c.company_name, 'priority', c.priority, 'source', 'internal_supervisor', 'mode', 'internal'));
        total := total + case when v_job is null then 0 else 1 end;
      end if;
    end loop;

    if c.priority in ('A','B') and c.contactable
       and exists(select 1 from public.agent_settings where owner_id=p_owner and agent_name='Outreach Draft' and enabled and not paused) then
      perform aj_agents.enqueue_job(p_owner, 'Outreach Draft', c.id, case when c.priority='A' then 100 else 70 end,
        jsonb_build_object('company_name', c.company_name, 'priority', c.priority, 'source', 'internal_supervisor', 'mode', 'internal'));
    end if;
    if c.contacted and exists(select 1 from public.agent_settings where owner_id=p_owner and agent_name='Follow-up' and enabled and not paused) then
      perform aj_agents.enqueue_job(p_owner, 'Follow-up', c.id, 90, jsonb_build_object('source','internal_supervisor','mode','internal'));
    end if;
    if c.last_outcome in ('RFQ Expected','RFQ Received','Opportunity Identified','Requested Meeting')
       and exists(select 1 from public.agent_settings where owner_id=p_owner and agent_name='Opportunity' and enabled and not paused) then
      perform aj_agents.enqueue_job(p_owner, 'Opportunity', c.id, 95, jsonb_build_object('source','internal_supervisor','mode','internal'));
    end if;
  end loop;

  if exists(select 1 from public.agent_settings where owner_id=p_owner and agent_name='Daily Planner' and enabled and not paused) then
    perform aj_agents.enqueue_job(p_owner, 'Daily Planner', null, 90, jsonb_build_object('source','internal_supervisor','mode','internal'));
  end if;
  if exists(select 1 from public.agent_settings where owner_id=p_owner and agent_name='Discovery adapter' and enabled and not paused) then
    perform aj_agents.enqueue_job(p_owner, 'Discovery adapter', null, 40, jsonb_build_object('source','internal_supervisor','mode','internal'));
  end if;

  update public.agent_settings set last_run_at=now(), next_run_at=now()+interval '15 minutes', updated_at=now()
  where owner_id=p_owner and agent_name='Supervisor';
  return total;
end;
$$;

revoke execute on function aj_agents.supervisor_tick(uuid) from public, anon, authenticated;

update public.agent_settings
set enabled = true,
    paused = false,
    next_run_at = case
      when agent_name = 'Daily Planner' then date_trunc('day', now()) + interval '1 day 2 hours'
      when agent_name = 'Follow-up' then now() + interval '30 minutes'
      else now() + interval '15 minutes'
    end,
    updated_at = now()
where agent_name in ('_global','Supervisor','Verification','Enrichment','Decision Maker','Qualification',
  'Vendor Registration','Outreach Draft','Follow-up','Opportunity','Daily Planner','Discovery adapter');

do $$
declare v_job bigint;
begin
  select jobid into v_job from cron.job where jobname = 'aj-agents-tavily-worker';
  if v_job is not null then perform cron.alter_job(v_job, active := false); end if;
end;
$$;

select public.agent_supervisor_tick();
