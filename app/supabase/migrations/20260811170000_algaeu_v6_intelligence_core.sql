-- نوفافيرك V6 intelligence core and autonomous BD foundation.
-- Additive only: no destructive DDL/DML, hard-coded production data, or external-provider activation.

alter table public.companies
  add column if not exists relationship_stage text not null default 'TARGET' check (relationship_stage in ('UNKNOWN','TARGET','RESEARCHING','CONTACT_READY','OUTREACH_PREPARED','CONTACTED','ENGAGED','MEETING','OPPORTUNITY','NURTURE','WON','LOST','DO_NOT_CONTACT')),
  add column if not exists opportunity_signal_score integer not null default 0 check (opportunity_signal_score between 0 and 100),
  add column if not exists opportunity_signal_reason text not null default '',
  add column if not exists next_best_action_code text not null default '',
  add column if not exists next_best_action_reason text not null default '',
  add column if not exists next_best_action_confidence integer check (next_best_action_confidence between 0 and 100),
  add column if not exists next_best_action_due_at timestamptz,
  add column if not exists do_not_contact boolean not null default false,
  add column if not exists outreach_cooldown_until timestamptz;

alter table public.company_intelligence
  add column if not exists target_segment text not null default '',
  add column if not exists subsector text not null default '',
  add column if not exists business_fit_score integer check (business_fit_score between 0 and 100),
  add column if not exists business_fit_reason text not null default '',
  add column if not exists business_fit_confidence integer check (business_fit_confidence between 0 and 100),
  add column if not exists business_fit_evidence jsonb not null default '[]'::jsonb,
  add column if not exists reachability_score integer check (reachability_score between 0 and 100),
  add column if not exists reachability_reason text not null default '',
  add column if not exists reachability_confidence integer check (reachability_confidence between 0 and 100),
  add column if not exists reachability_evidence jsonb not null default '[]'::jsonb,
  add column if not exists decision_maker_coverage_score integer check (decision_maker_coverage_score between 0 and 100),
  add column if not exists decision_maker_coverage_reason text not null default '',
  add column if not exists outreach_readiness_score integer check (outreach_readiness_score between 0 and 100),
  add column if not exists outreach_readiness_reason text not null default '',
  add column if not exists opportunity_signal_score integer check (opportunity_signal_score between 0 and 100),
  add column if not exists opportunity_signal_reason text not null default '',
  add column if not exists score_evidence jsonb not null default '{}'::jsonb,
  add column if not exists score_confidence jsonb not null default '{}'::jsonb,
  add column if not exists calculated_at timestamptz;

create table if not exists public.relationship_memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  relationship_summary text not null default '',
  relationship_status text not null default 'TARGET',
  last_meaningful_event jsonb,
  next_relationship_action text not null default '',
  important_commitments jsonb not null default '[]'::jsonb,
  structured_events jsonb not null default '[]'::jsonb,
  last_outbound_at timestamptz,
  last_reply_at timestamptz,
  reconnect_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, company_id)
);

create table if not exists public.business_signals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null,
  strength text not null check (strength in ('LOW','MEDIUM','HIGH','CRITICAL')),
  confidence integer not null check (confidence between 0 and 100),
  evidence jsonb not null default '[]'::jsonb,
  source text not null,
  detected_at timestamptz not null default now(),
  expires_at timestamptz,
  recommended_action text not null default '',
  fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, company_id, fingerprint)
);

create table if not exists public.conversation_strategies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  objective text not null,
  target_segment text not null default '',
  target_role text not null default '',
  relationship_stage text not null default 'TARGET',
  business_angle text not null default '',
  message_type text not null default '',
  message_style text not null default 'DIRECT',
  language text not null default 'ARABIC',
  channel text not null default 'EMAIL',
  cta text not null default '',
  risk text not null default '',
  context_summary text not null default '',
  status text not null default 'DRAFT',
  approved_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  segment text not null default '',
  message_style text not null default '',
  cta text not null default '',
  channel text not null default '',
  reply_intent text not null default '',
  outcome text not null default '',
  source_event_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  enabled boolean not null default false,
  minimum_quality_score integer not null default 80 check (minimum_quality_score between 0 and 100),
  daily_limit integer not null default 0 check (daily_limit between 0 and 100),
  minimum_contact_interval_days integer not null default 14 check (minimum_contact_interval_days between 1 and 365),
  require_verified_recipient boolean not null default true,
  require_no_unresolved_reply boolean not null default true,
  allowed_relationship_stages text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reconcile safely if protected placeholder tables already exist in the project.
alter table public.relationship_memories
  add column if not exists owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  add column if not exists company_id uuid not null references public.companies(id) on delete cascade,
  add column if not exists relationship_summary text not null default '',
  add column if not exists relationship_status text not null default 'TARGET',
  add column if not exists last_meaningful_event jsonb,
  add column if not exists next_relationship_action text not null default '',
  add column if not exists important_commitments jsonb not null default '[]'::jsonb,
  add column if not exists structured_events jsonb not null default '[]'::jsonb,
  add column if not exists last_outbound_at timestamptz,
  add column if not exists last_reply_at timestamptz,
  add column if not exists reconnect_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.business_signals
  add column if not exists owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  add column if not exists company_id uuid not null references public.companies(id) on delete cascade,
  add column if not exists type text not null default '',
  add column if not exists strength text not null default 'LOW' check (strength in ('LOW','MEDIUM','HIGH','CRITICAL')),
  add column if not exists confidence integer not null default 0 check (confidence between 0 and 100),
  add column if not exists evidence jsonb not null default '[]'::jsonb,
  add column if not exists source text not null default '',
  add column if not exists detected_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists recommended_action text not null default '',
  add column if not exists fingerprint text not null default '',
  add column if not exists created_at timestamptz not null default now();

alter table public.conversation_strategies
  add column if not exists owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  add column if not exists company_id uuid not null references public.companies(id) on delete cascade,
  add column if not exists contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists objective text not null default 'INTRODUCTION',
  add column if not exists target_segment text not null default '',
  add column if not exists target_role text not null default '',
  add column if not exists relationship_stage text not null default 'TARGET',
  add column if not exists business_angle text not null default '',
  add column if not exists message_type text not null default '',
  add column if not exists message_style text not null default 'DIRECT',
  add column if not exists language text not null default 'ARABIC',
  add column if not exists channel text not null default 'EMAIL',
  add column if not exists cta text not null default '',
  add column if not exists risk text not null default '',
  add column if not exists context_summary text not null default '',
  add column if not exists status text not null default 'DRAFT',
  add column if not exists approved_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.learning_events
  add column if not exists owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists message_id uuid references public.messages(id) on delete set null,
  add column if not exists segment text not null default '',
  add column if not exists message_style text not null default '',
  add column if not exists cta text not null default '',
  add column if not exists channel text not null default '',
  add column if not exists reply_intent text not null default '',
  add column if not exists outcome text not null default '',
  add column if not exists source_event_id uuid,
  add column if not exists created_at timestamptz not null default now();

alter table public.automation_rules
  add column if not exists owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  add column if not exists name text not null default '',
  add column if not exists enabled boolean not null default false,
  add column if not exists minimum_quality_score integer not null default 80 check (minimum_quality_score between 0 and 100),
  add column if not exists daily_limit integer not null default 0 check (daily_limit between 0 and 100),
  add column if not exists minimum_contact_interval_days integer not null default 14 check (minimum_contact_interval_days between 1 and 365),
  add column if not exists require_verified_recipient boolean not null default true,
  add column if not exists require_no_unresolved_reply boolean not null default true,
  add column if not exists allowed_relationship_stages text[] not null default '{}',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists relationship_memories_owner_company_unique_idx on public.relationship_memories(owner_id, company_id);
create unique index if not exists business_signals_owner_company_fingerprint_unique_idx on public.business_signals(owner_id, company_id, fingerprint);

alter table public.messages
  add column if not exists strategy_id uuid references public.conversation_strategies(id) on delete set null,
  add column if not exists personalization_level integer not null default 0 check (personalization_level between 0 and 3),
  add column if not exists quality_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists duplicate_warning text not null default '',
  add column if not exists relationship_context_summary text not null default '';

alter table public.communication_events
  add column if not exists message_id uuid references public.messages(id) on delete set null,
  add column if not exists subject text not null default '',
  add column if not exists reply_intent text not null default '',
  add column if not exists reply_sentiment text not null default '',
  add column if not exists commercial_signal text not null default '',
  add column if not exists reply_confidence integer check (reply_confidence between 0 and 100),
  add column if not exists action_completed_at timestamptz;

alter table public.opportunities
  add column if not exists health_status text not null default 'NEEDS_ACTION',
  add column if not exists health_reason text not null default '',
  add column if not exists current_situation text not null default '',
  add column if not exists key_contacts jsonb not null default '[]'::jsonb,
  add column if not exists missing_information jsonb not null default '[]'::jsonb,
  add column if not exists risks jsonb not null default '[]'::jsonb,
  add column if not exists deal_next_step text not null default '',
  add column if not exists deal_due_date date,
  add column if not exists relationship_health text not null default '';

alter table public.agent_jobs
  add column if not exists agent_team text not null default '',
  add column if not exists requires_human boolean not null default false,
  add column if not exists requires_external_provider boolean not null default false,
  add column if not exists output_standard jsonb not null default '{}'::jsonb;

alter table public.user_settings
  add column if not exists outreach_automation_level integer not null default 0 check (outreach_automation_level = 0),
  add column if not exists external_sending_enabled boolean not null default false check (external_sending_enabled = false),
  add column if not exists external_research_enabled boolean not null default false check (external_research_enabled = false),
  add column if not exists contact_frequency_days integer not null default 14 check (contact_frequency_days between 1 and 365);

alter table public.relationship_memories enable row level security;
alter table public.business_signals enable row level security;
alter table public.conversation_strategies enable row level security;
alter table public.learning_events enable row level security;
alter table public.automation_rules enable row level security;

revoke all on public.relationship_memories, public.business_signals, public.conversation_strategies, public.learning_events, public.automation_rules from anon;
grant select, insert, update on public.relationship_memories, public.business_signals, public.conversation_strategies, public.automation_rules to authenticated;
grant select, insert on public.learning_events to authenticated;
grant all on public.relationship_memories, public.business_signals, public.conversation_strategies, public.learning_events, public.automation_rules to service_role;

do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='relationship_memories' and policyname='Users read own relationship memory') then create policy "Users read own relationship memory" on public.relationship_memories for select to authenticated using ((select auth.uid()) = owner_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='relationship_memories' and policyname='Users insert own relationship memory') then create policy "Users insert own relationship memory" on public.relationship_memories for insert to authenticated with check ((select auth.uid()) = owner_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='relationship_memories' and policyname='Users update own relationship memory') then create policy "Users update own relationship memory" on public.relationship_memories for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id); end if; end $$;

do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='business_signals' and policyname='Users read own business signals') then create policy "Users read own business signals" on public.business_signals for select to authenticated using ((select auth.uid()) = owner_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='business_signals' and policyname='Users insert own business signals') then create policy "Users insert own business signals" on public.business_signals for insert to authenticated with check ((select auth.uid()) = owner_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='business_signals' and policyname='Users update own business signals') then create policy "Users update own business signals" on public.business_signals for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id); end if; end $$;

do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversation_strategies' and policyname='Users read own conversation strategies') then create policy "Users read own conversation strategies" on public.conversation_strategies for select to authenticated using ((select auth.uid()) = owner_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversation_strategies' and policyname='Users insert own conversation strategies') then create policy "Users insert own conversation strategies" on public.conversation_strategies for insert to authenticated with check ((select auth.uid()) = owner_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversation_strategies' and policyname='Users update own conversation strategies') then create policy "Users update own conversation strategies" on public.conversation_strategies for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id); end if; end $$;

do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='learning_events' and policyname='Users read own learning events') then create policy "Users read own learning events" on public.learning_events for select to authenticated using ((select auth.uid()) = owner_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='learning_events' and policyname='Users insert own learning events') then create policy "Users insert own learning events" on public.learning_events for insert to authenticated with check ((select auth.uid()) = owner_id); end if; end $$;

do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='automation_rules' and policyname='Users read own automation rules') then create policy "Users read own automation rules" on public.automation_rules for select to authenticated using ((select auth.uid()) = owner_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='automation_rules' and policyname='Users insert disabled automation rules') then create policy "Users insert disabled automation rules" on public.automation_rules for insert to authenticated with check ((select auth.uid()) = owner_id and enabled = false); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='automation_rules' and policyname='Users update disabled automation rules') then create policy "Users update disabled automation rules" on public.automation_rules for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id and enabled = false); end if; end $$;

create index if not exists companies_owner_relationship_stage_idx on public.companies(owner_id, relationship_stage, priority, lead_score desc) where archived_at is null;
create index if not exists companies_owner_opportunity_signal_idx on public.companies(owner_id, opportunity_signal_score desc, lead_score desc) where archived_at is null;
create index if not exists relationship_memories_owner_updated_idx on public.relationship_memories(owner_id, updated_at desc);
create index if not exists business_signals_owner_company_detected_idx on public.business_signals(owner_id, company_id, detected_at desc);
create index if not exists business_signals_owner_type_strength_idx on public.business_signals(owner_id, type, strength, detected_at desc);
create index if not exists conversation_strategies_owner_company_status_idx on public.conversation_strategies(owner_id, company_id, status, updated_at desc) where archived_at is null;
create index if not exists learning_events_owner_segment_outcome_idx on public.learning_events(owner_id, segment, outcome, created_at desc);
create index if not exists automation_rules_owner_enabled_idx on public.automation_rules(owner_id, enabled, updated_at desc);
create index if not exists communication_events_owner_reply_intent_idx on public.communication_events(owner_id, reply_intent, occurred_at desc) where direction = 'INBOUND' and archived_at is null;
create index if not exists opportunities_owner_health_idx on public.opportunities(owner_id, health_status, updated_at desc) where archived_at is null;
create index if not exists agent_jobs_owner_team_status_idx on public.agent_jobs(owner_id, agent_team, status, priority desc, created_at);
