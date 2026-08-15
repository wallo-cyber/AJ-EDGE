create table if not exists public.marketing_engineers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  phone text not null default '',
  email text not null default '',
  status text not null default 'Active' check (status in ('Active', 'On Leave', 'Inactive')),
  week_start date not null default date_trunc('week', current_date)::date,
  projects_submitted integer not null default 0 check (projects_submitted >= 0),
  qualified_leads integer not null default 0 check (qualified_leads >= 0),
  meetings_booked integer not null default 0 check (meetings_booked >= 0),
  weekly_target integer not null default 0 check (weekly_target >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketing_engineers enable row level security;
revoke all on public.marketing_engineers from anon;
grant select, insert, update, delete on public.marketing_engineers to authenticated;

create policy "Users select own marketing engineers" on public.marketing_engineers for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Users insert own marketing engineers" on public.marketing_engineers for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Users update own marketing engineers" on public.marketing_engineers for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Users delete own marketing engineers" on public.marketing_engineers for delete to authenticated using ((select auth.uid()) = owner_id);

create index if not exists marketing_engineers_owner_week_idx on public.marketing_engineers(owner_id, week_start desc);
