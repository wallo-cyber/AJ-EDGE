alter table public.company_discovery
  add column if not exists contact_name text not null default '',
  add column if not exists contact_position text not null default '',
  add column if not exists linkedin text not null default '';
