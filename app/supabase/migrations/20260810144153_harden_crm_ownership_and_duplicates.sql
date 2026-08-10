alter table public.companies alter column owner_id set not null;
alter table public.contacts alter column owner_id set not null;
alter table public.follow_ups alter column owner_id set not null;
alter table public.meetings alter column owner_id set not null;
alter table public.opportunities alter column owner_id set not null;

create unique index if not exists contacts_owner_company_name_unique
  on public.contacts(owner_id, company_id, lower(btrim(full_name)))
  where btrim(full_name) <> '' and company_id is not null;
