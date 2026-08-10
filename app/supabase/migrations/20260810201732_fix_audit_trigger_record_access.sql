create or replace function public.capture_crm_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_new jsonb := to_jsonb(new);
  row_old jsonb := to_jsonb(old);
  v_owner uuid := coalesce(nullif(row_new->>'owner_id', '')::uuid, nullif(row_old->>'owner_id', '')::uuid);
  v_entity uuid := coalesce(nullif(row_new->>'id', '')::uuid, nullif(row_old->>'id', '')::uuid);
  v_company uuid;
  v_action text;
begin
  v_company := case
    when tg_table_name = 'companies' then v_entity
    else coalesce(nullif(row_new->>'company_id', '')::uuid, nullif(row_old->>'company_id', '')::uuid)
  end;
  v_action := case
    when tg_table_name = 'companies' and tg_op = 'INSERT' then 'Company created'
    when tg_table_name = 'companies' then 'Company updated'
    when tg_table_name = 'contacts' then 'Contact added'
    when tg_table_name = 'follow_ups' then 'Follow-up created'
    when tg_table_name = 'opportunities' and tg_op = 'INSERT' then 'Opportunity created'
    when tg_table_name = 'opportunities' then 'Opportunity stage changed'
    when tg_table_name = 'messages' and row_new->>'status' = 'Approved' and row_old->>'status' is distinct from 'Approved' then 'Draft approved'
    when tg_table_name = 'messages' and row_new->>'status' = 'Contacted' and row_old->>'status' is distinct from 'Contacted' then 'Contacted'
    when tg_table_name = 'messages' and coalesce(row_new->>'outcome', '') <> coalesce(row_old->>'outcome', '') then 'Outcome added'
    else null
  end;
  if v_action is not null then
    insert into public.audit_events(owner_id, company_id, entity_type, entity_id, action, details)
    values (v_owner, v_company, tg_table_name, v_entity, v_action,
      jsonb_build_object(
        'status', coalesce(row_new->>'status', ''),
        'stage', coalesce(row_new->>'stage', ''),
        'outcome', coalesce(row_new->>'outcome', '')
      ));
  end if;
  return new;
end;
$$;

revoke execute on function public.capture_crm_audit_event() from public, anon, authenticated;
