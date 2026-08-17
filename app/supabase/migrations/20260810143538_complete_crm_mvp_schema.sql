-- نوفافيرك CRM MVP: complete the existing schema without dropping business data.

alter table public.companies add column if not exists owner_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.contacts add column if not exists owner_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.follow_ups add column if not exists owner_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.meetings add column if not exists owner_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.opportunities add column if not exists owner_id uuid references auth.users(id) on delete cascade default auth.uid();

alter table public.meetings add column if not exists company_name text not null default '';
alter table public.meetings add column if not exists contact_person text not null default '';
alter table public.meetings add column if not exists status text not null default 'مجدول';
alter table public.meetings add column if not exists updated_at timestamptz not null default now();

alter table public.opportunities add column if not exists company_name text not null default '';
alter table public.opportunities add column if not exists service text not null default '';
alter table public.opportunities add column if not exists priority text not null default '';
alter table public.opportunities add column if not exists owner text not null default '';
alter table public.opportunities add column if not exists updated_at timestamptz not null default now();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  company_id uuid references public.companies(id) on delete cascade,
  company_name text not null default '',
  direction text not null default 'outgoing' check (direction in ('incoming', 'outgoing')),
  channel text not null default '',
  subject text not null default '',
  body text not null default '',
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  company_id uuid references public.companies(id) on delete cascade,
  company_name text not null default '',
  quotation_number text not null default '',
  title text not null default '',
  value numeric(14,2) not null default 0,
  status text not null default 'مسودة',
  issue_date date,
  expires_at date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  company_id uuid references public.companies(id) on delete cascade,
  company_name text not null default '',
  contract_number text not null default '',
  title text not null default '',
  value numeric(14,2) not null default 0,
  status text not null default 'مسودة',
  start_date date,
  end_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  company_id uuid references public.companies(id) on delete cascade,
  company_name text not null default '',
  file_name text not null default '',
  category text not null default '',
  upload_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  company_id uuid references public.companies(id) on delete cascade,
  company_name text not null default '',
  title text not null default '',
  source text not null default '',
  date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_intelligence (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  company_name text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, company_id)
);

create table if not exists public.timeline (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  company_id uuid references public.companies(id) on delete cascade,
  company_name text not null default '',
  date timestamptz not null default now(),
  type text not null default '',
  title text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_owner_id_idx on public.companies(owner_id);
create index if not exists contacts_owner_company_idx on public.contacts(owner_id, company_id);
create index if not exists follow_ups_owner_company_date_idx on public.follow_ups(owner_id, company_id, date);
create index if not exists meetings_owner_company_date_idx on public.meetings(owner_id, company_id, meeting_date);
create index if not exists opportunities_owner_company_idx on public.opportunities(owner_id, company_id);
create index if not exists messages_owner_company_sent_idx on public.messages(owner_id, company_id, sent_at desc);
create index if not exists quotations_owner_company_idx on public.quotations(owner_id, company_id);
create index if not exists contracts_owner_company_idx on public.contracts(owner_id, company_id);
create index if not exists timeline_owner_company_date_idx on public.timeline(owner_id, company_id, date desc);

create unique index if not exists companies_owner_name_unique
  on public.companies(owner_id, lower(btrim(company_name))) where btrim(company_name) <> '';
create unique index if not exists companies_owner_email_unique
  on public.companies(owner_id, lower(btrim(general_email))) where btrim(general_email) <> '';
create unique index if not exists companies_owner_phone_unique
  on public.companies(owner_id, regexp_replace(general_phone, '\\D', '', 'g')) where regexp_replace(general_phone, '\\D', '', 'g') <> '';
create unique index if not exists companies_owner_website_unique
  on public.companies(owner_id, lower(btrim(website))) where btrim(coalesce(website, '')) <> '';
create unique index if not exists contacts_owner_email_unique
  on public.contacts(owner_id, lower(btrim(email))) where btrim(coalesce(email, '')) <> '';
create unique index if not exists contacts_owner_mobile_unique
  on public.contacts(owner_id, regexp_replace(mobile, '\\D', '', 'g')) where regexp_replace(mobile, '\\D', '', 'g') <> '';

do $$
declare
  table_name text;
  policy_name text;
  crm_tables text[] := array[
    'companies', 'contacts', 'follow_ups', 'meetings', 'opportunities',
    'messages', 'quotations', 'contracts', 'documents', 'news',
    'company_intelligence', 'timeline'
  ];
begin
  foreach table_name in array crm_tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);

    for policy_name in
      select policyname from pg_policies where schemaname = 'public' and tablename = table_name
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    end loop;

    execute format('create policy %I on public.%I for select to authenticated using (owner_id = (select auth.uid()))', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (owner_id = (select auth.uid()))', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (owner_id = (select auth.uid()))', table_name || '_delete_own', table_name);
  end loop;
end $$;
