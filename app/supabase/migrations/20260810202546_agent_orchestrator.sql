create extension if not exists pgmq;
create extension if not exists pg_cron;

create schema if not exists aj_agents;
revoke all on schema aj_agents from public, anon, authenticated;

create table public.agent_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agent_name text not null,
  enabled boolean not null default true,
  paused boolean not null default false,
  batch_size integer not null default 5 check (batch_size between 1 and 50),
  schedule text not null default '',
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, agent_name)
);

create table public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  agent_name text not null,
  status text not null default 'queued' check (status in ('queued','running','completed','manual_research_required','failed','cancelled')),
  priority integer not null default 50,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  attempts integer not null default 0 check (attempts between 0 and 3),
  max_attempts integer not null default 3 check (max_attempts between 1 and 3),
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  last_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.agent_jobs(id) on delete cascade,
  agent_name text not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  summary jsonb not null default '{}'::jsonb
);

create table public.agent_logs (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.agent_jobs(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete cascade,
  agent_name text not null,
  level text not null default 'info',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.agent_errors (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.agent_jobs(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete cascade,
  agent_name text not null,
  error_message text not null,
  attempt integer not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.agent_settings enable row level security;
alter table public.agent_jobs enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_logs enable row level security;
alter table public.agent_errors enable row level security;
revoke all on public.agent_settings, public.agent_jobs, public.agent_runs, public.agent_logs, public.agent_errors from anon;
grant select,insert,update,delete on public.agent_settings to authenticated;
grant select,insert,update on public.agent_jobs to authenticated;
grant select on public.agent_runs, public.agent_logs, public.agent_errors to authenticated;
grant usage,select on sequence public.agent_logs_id_seq, public.agent_errors_id_seq to authenticated;

create policy "Users read own agent settings" on public.agent_settings for select to authenticated using ((select auth.uid())=owner_id);
create policy "Users insert own agent settings" on public.agent_settings for insert to authenticated with check ((select auth.uid())=owner_id);
create policy "Users update own agent settings" on public.agent_settings for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create policy "Users delete own agent settings" on public.agent_settings for delete to authenticated using ((select auth.uid())=owner_id);
create policy "Users read own agent jobs" on public.agent_jobs for select to authenticated using ((select auth.uid())=owner_id);
create policy "Users insert own agent jobs" on public.agent_jobs for insert to authenticated with check ((select auth.uid())=owner_id);
create policy "Users update own agent jobs" on public.agent_jobs for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create policy "Users read own agent runs" on public.agent_runs for select to authenticated using ((select auth.uid())=owner_id);
create policy "Users read own agent logs" on public.agent_logs for select to authenticated using ((select auth.uid())=owner_id);
create policy "Users read own agent errors" on public.agent_errors for select to authenticated using ((select auth.uid())=owner_id);

create index agent_jobs_worker_idx on public.agent_jobs(status,scheduled_at,priority desc);
create index agent_jobs_owner_agent_idx on public.agent_jobs(owner_id,agent_name,status,created_at desc);
create index agent_runs_owner_agent_idx on public.agent_runs(owner_id,agent_name,started_at desc);
create index agent_logs_owner_agent_idx on public.agent_logs(owner_id,agent_name,created_at desc);
create index agent_errors_owner_unresolved_idx on public.agent_errors(owner_id,resolved,created_at desc);
create index agent_jobs_company_id_idx on public.agent_jobs(company_id);
create index agent_runs_job_id_idx on public.agent_runs(job_id);
create index agent_logs_job_id_idx on public.agent_logs(job_id);
create index agent_logs_run_id_idx on public.agent_logs(run_id);
create index agent_errors_job_id_idx on public.agent_errors(job_id);
create index agent_errors_run_id_idx on public.agent_errors(run_id);

select pgmq.create('aj_agent_jobs');

create or replace function aj_agents.queue_job_message()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='queued' and (tg_op='INSERT' or old.status is distinct from 'queued') then
    perform pgmq.send('aj_agent_jobs',jsonb_build_object('job_id',new.id));
  end if;
  return new;
end $$;
revoke execute on function aj_agents.queue_job_message() from public,anon,authenticated;
create trigger queue_agent_job after insert or update of status on public.agent_jobs for each row execute function aj_agents.queue_job_message();

create or replace function aj_agents.enqueue_job(p_owner uuid,p_agent text,p_company uuid default null,p_priority integer default 50,p_payload jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if exists(select 1 from public.agent_jobs where owner_id=p_owner and agent_name=p_agent and company_id is not distinct from p_company and status in('queued','running','completed','manual_research_required') and created_at>now()-interval '1 day') then
    select id into v_id from public.agent_jobs where owner_id=p_owner and agent_name=p_agent and company_id is not distinct from p_company and status in('queued','running','completed','manual_research_required') and created_at>now()-interval '1 day' order by created_at desc limit 1;
    return v_id;
  end if;
  insert into public.agent_jobs(owner_id,company_id,agent_name,priority,payload) values(p_owner,p_company,p_agent,p_priority,p_payload) returning id into v_id;
  return v_id;
end $$;
revoke execute on function aj_agents.enqueue_job(uuid,text,uuid,integer,jsonb) from public,anon,authenticated;

create or replace function aj_agents.supervisor_tick(p_owner uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare c record; a text; total integer:=0;
begin
  for c in select id,priority,company_name from public.companies where owner_id=p_owner and priority='A' order by lead_score desc loop
    foreach a in array array['Verification','Enrichment','Decision Maker','Qualification','Vendor Registration','Outreach Draft','Follow-up','Opportunity'] loop
      perform aj_agents.enqueue_job(p_owner,a,c.id,case when c.priority='A' then 100 else 70 end,jsonb_build_object('company_name',c.company_name,'priority',c.priority)); total:=total+1;
    end loop;
  end loop;
  for c in select id,priority,company_name from public.companies b where owner_id=p_owner and priority='B' and not exists(select 1 from public.agent_jobs j where j.owner_id=p_owner and j.company_id=b.id and j.agent_name='Qualification' and j.status in('queued','running','completed','manual_research_required') and j.created_at>now()-interval '1 day') order by lead_score desc limit 20 loop
    foreach a in array array['Verification','Enrichment','Decision Maker','Qualification','Vendor Registration','Outreach Draft'] loop
      perform aj_agents.enqueue_job(p_owner,a,c.id,70,jsonb_build_object('company_name',c.company_name,'priority',c.priority)); total:=total+1;
    end loop;
  end loop;
  perform aj_agents.enqueue_job(p_owner,'Daily Planner',null,90,'{}');
  perform aj_agents.enqueue_job(p_owner,'Discovery adapter',null,40,'{}');
  return total+2;
end $$;
revoke execute on function aj_agents.supervisor_tick(uuid) from public,anon,authenticated;

create or replace function public.agent_worker_tick(p_batch_size integer default 10)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare q record; j public.agent_jobs%rowtype; r_id uuid; started timestamptz; c public.companies%rowtype; manual boolean; result jsonb; processed integer:=0; failed integer:=0; query_name text; query_role text;
begin
  for q in select * from pgmq.read('aj_agent_jobs',60,greatest(1,least(p_batch_size,50))) loop
    begin
      select * into j from public.agent_jobs where id=(q.message->>'job_id')::uuid for update skip locked;
      if not found or j.status<>'queued' or j.scheduled_at>now() then perform pgmq.delete('aj_agent_jobs',q.msg_id); continue; end if;
      if exists(select 1 from public.agent_settings where owner_id=j.owner_id and agent_name in('_global',j.agent_name) and (not enabled or paused)) then perform pgmq.delete('aj_agent_jobs',q.msg_id); update public.agent_jobs set status='cancelled',completed_at=now(),updated_at=now() where id=j.id; continue; end if;
      started:=clock_timestamp(); manual:=false; result:='{}'::jsonb;
      update public.agent_jobs set status='running',attempts=attempts+1,started_at=now(),updated_at=now() where id=j.id returning * into j;
      insert into public.agent_runs(owner_id,job_id,agent_name) values(j.owner_id,j.id,j.agent_name) returning id into r_id;
      insert into public.agent_logs(owner_id,job_id,run_id,agent_name,message) values(j.owner_id,j.id,r_id,j.agent_name,'Job started');
      if j.company_id is not null then select * into c from public.companies where id=j.company_id and owner_id=j.owner_id; end if;

      case j.agent_name
        when 'Supervisor' then result:=jsonb_build_object('jobs_created',aj_agents.supervisor_tick(j.owner_id));
        when 'Verification' then
          if coalesce(c.source_url,'')<>'' then update public.companies set verification_status='Verified',verified_at=now() where id=c.id;
          else manual:=true; result:=jsonb_build_object('reason','verification source required','search_url','https://www.google.com/search?q='||replace(c.company_name,' ','+')||'+official'); end if;
        when 'Enrichment' then
          if cardinality(c.missing_fields)>0 then manual:=true; result:=jsonb_build_object('missing_fields',c.missing_fields,'official_search','https://www.google.com/search?q='||replace(c.company_name,' ','+')||'+official+contact','linkedin_search','https://www.google.com/search?q=site%3Alinkedin.com%2Fcompany+'||replace(c.company_name,' ','+')); else result:=jsonb_build_object('complete',true); end if;
        when 'Decision Maker' then
          if exists(select 1 from public.contacts where owner_id=j.owner_id and company_id=c.id and contact_classification='Decision Maker') then result:=jsonb_build_object('found',true);
          else query_role:=case c.company_type when 'Main Contractor' then 'procurement subcontracts manager' when 'Real Estate Developer' then 'projects development manager' else 'projects engineering procurement manager' end; manual:=true; result:=jsonb_build_object('reason','Decision Maker Needed','google','https://www.google.com/search?q='||replace(c.company_name,' ','+')||'+'||replace(query_role,' ','+'),'linkedin','https://www.google.com/search?q=site%3Alinkedin.com%2Fin+'||replace(c.company_name,' ','+')||'+'||replace(query_role,' ','+')); end if;
        when 'Qualification' then
          update public.companies set
            data_completeness=least(100,(case when company_name<>'' then 15 else 0 end)+(case when company_type<>'' then 10 else 0 end)+(case when sector<>'' or activity<>'' then 10 else 0 end)+(case when city<>'' then 10 else 0 end)+(case when website<>'' then 10 else 0 end)+(case when coalesce(nullif(general_phone,''),nullif(phone,'')) is not null then 10 else 0 end)+(case when coalesce(nullif(general_email,''),nullif(email,'')) is not null then 10 else 0 end)+(case when exists(select 1 from public.contacts x where x.company_id=c.id) then 15 else 0 end)+(case when source_url<>'' then 10 else 0 end)),
            updated_at=now() where id=c.id;
          update public.companies set priority=case when lead_score>=80 then 'A' when lead_score>=60 then 'B' else 'C' end,data_quality_status=case when data_completeness>=90 then 'Complete' when data_completeness>=70 then 'Good' when data_completeness>=45 then 'Needs Enrichment' else 'Poor Data' end where id=c.id;
          result:=jsonb_build_object('recalculated',true);
        when 'Vendor Registration' then
          if coalesce(c.vendor_registration_url,'')<>'' then result:=jsonb_build_object('found',true,'url',c.vendor_registration_url);
          else manual:=true; result:=jsonb_build_object('reason','vendor portal research required','search_url','https://www.google.com/search?q='||replace(c.company_name,' ','+')||'+vendor+supplier+contractor+registration+prequalification'); end if;
        when 'Outreach Draft' then
          insert into public.messages(owner_id,company_id,company_name,direction,channel,subject,body,status,template_name)
          select c.owner_id,c.id,c.company_name,'outgoing',t.channel,t.subject,replace(replace(t.body,'{{company}}',c.company_name),'{{focus}}',case c.company_type when 'Main Contractor' then 'حزم المقاولات الباطنة والأعمال المدنية والمعمارية والصناعية' when 'Real Estate Developer' then 'التسجيل كمقاول والمشاريع المستقبلية وحزم الإنشاء' else 'الأعمال المدنية والإنشاءات الصناعية والتوسعات والصيانة الإنشائية' end),'Draft',t.template_name
          from (values ('Email','Initial Email','تعارف وفرص تعاون','تحية طيبة إلى {{company}}، نرغب في التعارف وبحث {{focus}}. يمكننا مشاركة الملف التعريفي عند الطلب، ويسعدنا معرفة آلية التسجيل أو الشخص المختص.'),('WhatsApp','Short WhatsApp','تعارف مختصر','السلام عليكم، نتواصل للتعارف مع {{company}} وبحث {{focus}}. نأمل توجيهنا للمسؤول المختص.'),('LinkedIn','LinkedIn Intro','تعارف مهني','مرحباً، يسعدنا التعارف مع {{company}} وبحث {{focus}} والتواصل مع المسؤول المختص.'),('Phone','Phone Call Opening','افتتاحية مكالمة','السلام عليكم، نتواصل للتعريف المختصر وبحث {{focus}} لدى {{company}}. هل يمكن توجيهنا لمسؤول المشاريع أو المشتريات؟'),('Email','Follow-up 1','متابعة أولى','تحية طيبة، نتابع بلطف تواصلنا مع {{company}} بشأن {{focus}}.'),('Email','Follow-up 2','متابعة ثانية','تحية طيبة، متابعة أخيرة غير مزعجة مع {{company}} بشأن {{focus}}.'),('Email','Revisit Later','إعادة تواصل لاحقاً','تحية طيبة، نعيد التواصل مع {{company}} في وقت مناسب لبحث {{focus}}.')) t(channel,template_name,subject,body)
          where not exists(select 1 from public.messages m where m.company_id=c.id and m.template_name=t.template_name);
          result:=jsonb_build_object('drafts_only',true);
        when 'Follow-up' then
          if coalesce(c.last_contact,'')<>'' and not exists(select 1 from public.follow_ups f where f.company_id=c.id and f.status='Pending') then
            insert into public.follow_ups(owner_id,company_id,company_name,follow_up_type,date,status,subject,next_action) values(c.owner_id,c.id,c.company_name,'Email',current_date+3,'Pending','Follow-up 1','Review real communication history'); result:=jsonb_build_object('created',true);
          else result:=jsonb_build_object('created',false,'reason','no real communication or existing follow-up'); end if;
        when 'Opportunity' then
          if c.last_outcome in('RFQ Expected','RFQ Received','Opportunity Identified','Requested Meeting') and not exists(select 1 from public.opportunities o where o.company_id=c.id and o.stage not in('Won','Lost')) then
            insert into public.opportunities(owner_id,company_id,company_name,title,stage,next_action,next_action_date,source) values(c.owner_id,c.id,c.company_name,c.last_outcome||' - '||c.company_name,case when c.last_outcome='RFQ Received' then 'RFQ Received' else 'Identified' end,'Review outcome and contact company',current_date+2,'Real outreach outcome'); result:=jsonb_build_object('created',true);
          else result:=jsonb_build_object('created',false,'reason','no qualifying real outcome'); end if;
        when 'Daily Planner' then result:=jsonb_build_object('companies',(select count(*) from public.companies where owner_id=j.owner_id),'overdue_followups',(select count(*) from public.follow_ups where owner_id=j.owner_id and date<current_date and status='Pending'),'prepared_at',now());
        when 'Discovery adapter' then result:=jsonb_build_object('pending_discovery',(select count(*) from public.company_discovery where owner_id=j.owner_id and review_status in('جديد','بحاجة تحقق')),'mode','internal_adapter');
        else result:=jsonb_build_object('skipped','unknown agent');
      end case;

      update public.agent_jobs set status=case when manual then 'manual_research_required' else 'completed' end,result=result,completed_at=now(),updated_at=now() where id=j.id;
      update public.agent_runs set status=case when manual then 'manual_research_required' else 'completed' end,completed_at=now(),duration_ms=extract(milliseconds from clock_timestamp()-started)::integer,summary=result where id=r_id;
      insert into public.agent_logs(owner_id,job_id,run_id,agent_name,message,metadata) values(j.owner_id,j.id,r_id,j.agent_name,case when manual then 'Manual research required' else 'Job completed' end,result);
      insert into public.agent_settings(owner_id,agent_name,last_run_at,next_run_at) values(j.owner_id,j.agent_name,now(),now()+interval '15 minutes') on conflict(owner_id,agent_name) do update set last_run_at=excluded.last_run_at,next_run_at=excluded.next_run_at,updated_at=now();
      perform pgmq.delete('aj_agent_jobs',q.msg_id); processed:=processed+1;
    exception when others then
      failed:=failed+1;
      insert into public.agent_errors(owner_id,job_id,run_id,agent_name,error_message,attempt) values(j.owner_id,j.id,r_id,j.agent_name,sqlerrm,coalesce(j.attempts,1));
      update public.agent_runs set status='failed',completed_at=now(),summary=jsonb_build_object('error',sqlerrm) where id=r_id;
      perform pgmq.delete('aj_agent_jobs',q.msg_id);
      if coalesce(j.attempts,1)<coalesce(j.max_attempts,3) then update public.agent_jobs set status='queued',last_error=sqlerrm,scheduled_at=now()+interval '5 minutes',updated_at=now() where id=j.id;
      else update public.agent_jobs set status='failed',last_error=sqlerrm,completed_at=now(),updated_at=now() where id=j.id; end if;
    end;
  end loop;
  return jsonb_build_object('processed',processed,'failed',failed);
end $$;
revoke execute on function public.agent_worker_tick(integer) from public,anon,authenticated;
grant execute on function public.agent_worker_tick(integer) to service_role;

create or replace function public.agent_supervisor_tick()
returns integer language plpgsql security definer set search_path='' as $$
declare s record; total integer:=0;
begin
  for s in select owner_id from public.agent_settings where agent_name='_global' and enabled and not paused loop total:=total+aj_agents.supervisor_tick(s.owner_id); end loop;
  return total;
end $$;
revoke execute on function public.agent_supervisor_tick() from public,anon,authenticated;
grant execute on function public.agent_supervisor_tick() to service_role;

insert into public.agent_settings(owner_id,agent_name,schedule)
select u.id,a.name,a.schedule from auth.users u cross join (values
('_global','always'),('Supervisor','*/15 * * * *'),('Verification','queue'),('Enrichment','queue:5'),('Decision Maker','queue:5'),('Qualification','queue'),('Vendor Registration','queue'),('Outreach Draft','queue'),('Follow-up','*/30 * * * *'),('Opportunity','queue'),('Daily Planner','0 2 * * *'),('Discovery adapter','queue')) a(name,schedule)
on conflict(owner_id,agent_name) do nothing;

do $$ declare j record; begin
  for j in select jobid from cron.job where jobname like 'aj-agents-%' loop perform cron.unschedule(j.jobid); end loop;
end $$;
select cron.schedule('aj-agents-supervisor','*/15 * * * *',$$select public.agent_supervisor_tick();$$);
select cron.schedule('aj-agents-worker','* * * * *',$$select public.agent_worker_tick(10);$$);
select cron.schedule('aj-agents-daily-planner','0 2 * * *',$$select aj_agents.enqueue_job(owner_id,'Daily Planner',null,100,'{}') from public.agent_settings where agent_name='_global' and enabled and not paused;$$);
select cron.schedule('aj-agents-followup','*/30 * * * *',$$select aj_agents.enqueue_job(c.owner_id,'Follow-up',c.id,90,'{}') from public.companies c join public.agent_settings s on s.owner_id=c.owner_id and s.agent_name='_global' and s.enabled and not s.paused where coalesce(c.last_contact,'')<>'';$$);
select cron.schedule('aj-agents-retry','*/5 * * * *',$$update public.agent_jobs set status='queued',scheduled_at=now(),updated_at=now() where status='failed' and attempts<max_attempts and scheduled_at<=now();$$);

select public.agent_supervisor_tick();
