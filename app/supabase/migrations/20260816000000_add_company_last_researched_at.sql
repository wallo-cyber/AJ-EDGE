-- Track the last time a company was successfully researched or enriched.
alter table public.companies add column if not exists last_researched_at timestamptz;
create index if not exists companies_last_researched_at_idx on public.companies(last_researched_at);
