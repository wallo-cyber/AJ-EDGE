-- نوفافيرك Plan B operational completion.
-- Add only additive CRM fields required by existing screens and make job
-- scheduling idempotent against the persisted company state.

alter table public.companies
  add column if not exists qualification_status text not null default 'Needs Research',
  add column if not exists qualification_reason text not null default '',
  add column if not exists contracting_angle text not null default '',
  add column if not exists next_action text not null default '';

alter table public.contacts
  add column if not exists source_url text not null default '',
  add column if not exists confidence integer not null default 0
    check (confidence between 0 and 100);

alter table public.meetings
  add column if not exists meeting_type text not null default 'General',
  add column if not exists agenda text not null default '',
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete set null;

alter table public.quotations
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete set null;

alter table public.quotations alter column value drop not null;
alter table public.quotations alter column value drop default;

alter table public.contracts
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete set null;

alter table public.contracts alter column value drop not null;
alter table public.contracts alter column value drop default;

create index if not exists meetings_opportunity_id_idx on public.meetings(opportunity_id);
create index if not exists quotations_opportunity_id_idx on public.quotations(opportunity_id);
create index if not exists contracts_opportunity_id_idx on public.contracts(opportunity_id);

create or replace function aj_agents.refresh_company_qualification(p_company uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.companies c
  set qualification_status = case
        when c.status in ('مرفوض', 'Rejected') then 'Not Relevant'
        when c.priority = 'A' and c.lead_score >= 80 then 'Target'
        when c.priority in ('A', 'B') and c.data_completeness >= 45 then 'Potential'
        when c.priority = 'C' then 'Low Priority'
        else 'Needs Research'
      end,
      qualification_reason = case
        when c.status in ('مرفوض', 'Rejected') then 'Marked as not relevant by the user'
        when c.priority = 'A' and c.lead_score >= 80 then 'High target fit based on the persisted lead score and priority'
        when c.priority in ('A', 'B') and c.data_completeness >= 45 then 'Relevant target with sufficient persisted business data'
        when c.priority = 'C' then 'Low current fit based on the persisted lead score'
        else 'More verified company data is required before qualification'
      end,
      contracting_angle = case
        when lower(coalesce(c.company_type, '')) similar to '%(main contractor|مقاول رئيسي)%'
          then 'Subcontracting and specialist contracting packages'
        when lower(coalesce(c.company_type, '')) similar to '%(real estate|developer|مطور)%'
          then 'Contractor registration and upcoming development packages'
        when lower(coalesce(c.company_type, '')) similar to '%(factory|industrial|مصنع|صناعي)%'
          then 'Industrial civil works, expansions, and maintenance'
        else 'General contracting and vendor registration'
      end,
      next_action = case
        when c.data_completeness < 70 then 'Complete missing company data through manual research'
        when not exists (select 1 from public.contacts x where x.company_id = c.id) then 'Identify and verify the appropriate decision maker'
        when nullif(trim(c.vendor_registration_url), '') is null then 'Review official vendor or contractor registration options'
        else 'Review the prepared outreach draft and approve it manually'
      end,
      updated_at = now()
  where c.id = p_company;
end;
$$;

revoke execute on function aj_agents.refresh_company_qualification(uuid) from public, anon, authenticated;

create or replace function aj_agents.sync_completed_qualification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.agent_name = 'Qualification'
     and new.status = 'completed'
     and old.status is distinct from 'completed'
     and new.company_id is not null then
    perform aj_agents.refresh_company_qualification(new.company_id);
  end if;
  return new;
end;
$$;

revoke execute on function aj_agents.sync_completed_qualification() from public, anon, authenticated;

drop trigger if exists sync_completed_qualification on public.agent_jobs;
create trigger sync_completed_qualification
after update of status on public.agent_jobs
for each row execute function aj_agents.sync_completed_qualification();

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
  v_company_updated_at timestamptz;
begin
  select id into v_id
  from public.agent_jobs
  where owner_id = p_owner
    and agent_name = p_agent
    and company_id is not distinct from p_company
    and status in ('queued', 'running')
  order by created_at desc
  limit 1;
  if v_id is not null then return v_id; end if;

  if p_company is not null then
    select updated_at into v_company_updated_at
    from public.companies
    where id = p_company and owner_id = p_owner;

    select id into v_id
    from public.agent_jobs
    where owner_id = p_owner
      and agent_name = p_agent
      and company_id = p_company
      and status in ('completed', 'manual_research_required')
      and coalesce(completed_at, updated_at, created_at) >= coalesce(v_company_updated_at, '-infinity'::timestamptz)
    order by coalesce(completed_at, updated_at, created_at) desc
    limit 1;
    if v_id is not null then return v_id; end if;
  elsif p_agent = 'Daily Planner' then
    select id into v_id
    from public.agent_jobs
    where owner_id = p_owner
      and agent_name = p_agent
      and company_id is null
      and status = 'completed'
      and completed_at >= date_trunc('day', now())
    order by completed_at desc
    limit 1;
    if v_id is not null then return v_id; end if;
  else
    select id into v_id
    from public.agent_jobs
    where owner_id = p_owner
      and agent_name = p_agent
      and company_id is null
      and status = 'manual_research_required'
    order by updated_at desc
    limit 1;
    if v_id is not null then return v_id; end if;
  end if;

  insert into public.agent_jobs(owner_id, company_id, agent_name, priority, payload)
  values(p_owner, p_company, p_agent, p_priority, p_payload)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function aj_agents.enqueue_job(uuid, text, uuid, integer, jsonb)
  from public, anon, authenticated;

do $$
declare company_record record;
begin
  for company_record in select id from public.companies loop
    perform aj_agents.refresh_company_qualification(company_record.id);
  end loop;
end;
$$;
