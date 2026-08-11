-- Captures the already-applied production migration so a fresh checkout has
-- the complete schema history. External Tavily execution remains paused.

create extension if not exists pg_net;

create or replace function public.invoke_tavily_agent_worker(p_batch_size integer default 3)
returns bigint
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
declare
  v_token text;
  v_request_id bigint;
begin
  select secret_value into v_token
  from public.agent_runtime_secrets
  where secret_name = 'edge_cron_token';

  select net.http_post(
    url := 'https://vbdgfrkthvurbqeofeyj.supabase.co/functions/v1/agent-worker',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-agent-token', v_token),
    body := jsonb_build_object('batch_size', greatest(1, least(coalesce(p_batch_size, 3), 5))),
    timeout_milliseconds := 120000
  ) into v_request_id;
  return v_request_id;
end;
$$;

revoke execute on function public.invoke_tavily_agent_worker(integer)
  from public, anon, authenticated;
grant execute on function public.invoke_tavily_agent_worker(integer) to service_role;

do $$
declare
  v_job bigint;
begin
  select jobid into v_job from cron.job where jobname = 'aj-agents-tavily-worker';
  if v_job is null then
    v_job := cron.schedule(
      'aj-agents-tavily-worker',
      '*/10 * * * *',
      'select public.invoke_tavily_agent_worker(3);'
    );
  end if;
  perform cron.alter_job(v_job, active := false);
end;
$$;
