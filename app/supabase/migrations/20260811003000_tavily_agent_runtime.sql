create extension if not exists pg_net with schema extensions;

create table if not exists public.agent_runtime_secrets (
  secret_name text primary key,
  secret_value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.agent_runtime_secrets enable row level security;
revoke all on public.agent_runtime_secrets from anon, authenticated;

insert into public.agent_runtime_secrets(secret_name, secret_value)
values ('edge_cron_token', encode(gen_random_bytes(32), 'hex'))
on conflict (secret_name) do nothing;

create or replace function public.invoke_tavily_agent_worker(p_batch_size integer default 3)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_request_id bigint;
begin
  select secret_value into v_token from public.agent_runtime_secrets where secret_name='edge_cron_token';
  select net.http_post(
    url := 'https://vbdgfrkthvurbqeofeyj.supabase.co/functions/v1/agent-worker',
    headers := jsonb_build_object('Content-Type','application/json','x-agent-token',v_token),
    body := jsonb_build_object('batch_size',greatest(1,least(coalesce(p_batch_size,3),5))),
    timeout_milliseconds := 120000
  ) into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function public.invoke_tavily_agent_worker(integer) from public, anon, authenticated;

do $$
declare v_id bigint;
begin
  select jobid into v_id from cron.job where jobname='aj-agents-tavily-worker';
  if v_id is not null then perform cron.unschedule(v_id); end if;
  perform cron.schedule('aj-agents-tavily-worker','*/10 * * * *','select public.invoke_tavily_agent_worker(3);');
end $$;
