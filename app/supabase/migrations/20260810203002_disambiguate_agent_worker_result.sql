do $$
declare definition text;
begin
  select pg_get_functiondef('public.agent_worker_tick(integer)'::regprocedure) into definition;
  if definition not like '%#variable_conflict use_variable%' then
    definition:=replace(definition,E'\nDECLARE',E'\n#variable_conflict use_variable\nDECLARE');
    definition:=replace(definition,E'\ndeclare',E'\n#variable_conflict use_variable\ndeclare');
    execute definition;
  end if;
end $$;

revoke execute on function public.agent_worker_tick(integer) from public,anon,authenticated;
grant execute on function public.agent_worker_tick(integer) to service_role;
