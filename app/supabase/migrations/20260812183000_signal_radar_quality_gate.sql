alter table public.external_signals
  add column if not exists entity_match_confidence integer not null default 0 check(entity_match_confidence between 0 and 100),
  add column if not exists geography_match_confidence integer not null default 0 check(geography_match_confidence between 0 and 100),
  add column if not exists freshness_confidence integer not null default 0 check(freshness_confidence between 0 and 100),
  add column if not exists source_quality_confidence integer not null default 0 check(source_quality_confidence between 0 and 100),
  add column if not exists event_match_confidence integer not null default 0 check(event_match_confidence between 0 and 100),
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text not null default '';

alter table public.external_signals drop constraint if exists external_signals_verified_quality_gate;
alter table public.external_signals add constraint external_signals_verified_quality_gate
check (
  verification_status <> 'verified' or (
    entity_match_confidence >= 70 and
    geography_match_confidence >= 70 and
    freshness_confidence >= 50 and
    source_quality_confidence >= 60 and
    event_match_confidence >= 70
  )
);
