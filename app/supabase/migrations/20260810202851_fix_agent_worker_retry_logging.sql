create or replace function aj_agents.prepare_agent_retry()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.status='queued' and new.last_error<>'' and new.last_error is distinct from old.last_error then
    new.attempts:=least(old.attempts+1,new.max_attempts);
  end if;
  return new;
end $$;
revoke execute on function aj_agents.prepare_agent_retry() from public,anon,authenticated;
create trigger prepare_agent_retry before update on public.agent_jobs for each row execute function aj_agents.prepare_agent_retry();

create or replace function aj_agents.detach_rolled_back_run()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.run_id is not null and not exists(select 1 from public.agent_runs where id=new.run_id) then new.run_id:=null; end if;
  return new;
end $$;
revoke execute on function aj_agents.detach_rolled_back_run() from public,anon,authenticated;
create trigger detach_rolled_back_run before insert on public.agent_errors for each row execute function aj_agents.detach_rolled_back_run();
