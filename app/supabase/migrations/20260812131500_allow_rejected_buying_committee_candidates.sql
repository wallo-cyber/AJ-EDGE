alter table public.buying_committee_members drop constraint if exists buying_committee_members_verification_status_check;
alter table public.buying_committee_members add constraint buying_committee_members_verification_status_check
check (verification_status in ('needs_research','partially_verified','verified','rejected'));
