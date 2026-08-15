alter table public.referral_partners
  add column if not exists partner_status text not null default 'PENDING';

alter table public.referral_partners
  drop constraint if exists referral_partners_partner_status_check;

alter table public.referral_partners
  add constraint referral_partners_partner_status_check
  check (partner_status in ('PENDING', 'ACCEPTED', 'REJECTED'));

create index if not exists referral_partners_owner_status_idx
  on public.referral_partners(owner_id, partner_status, created_at desc);
