alter table public.opportunities add constraint opportunities_open_next_action_check
check (stage in ('Won','Lost') or (coalesce(trim(next_action),'')<>'' and next_action_date is not null));
