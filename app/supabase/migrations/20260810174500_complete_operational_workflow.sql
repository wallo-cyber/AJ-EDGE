alter table public.companies
  add column if not exists linkedin_company text not null default '',
  add column if not exists verified_at timestamptz,
  add column if not exists vendor_registration_url text not null default '',
  add column if not exists vendor_registration_status text not null default 'Not Checked';

alter table public.meetings
  add column if not exists contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists purpose text not null default '',
  add column if not exists participants text not null default '',
  add column if not exists outcome text not null default '',
  add column if not exists next_action text not null default '';

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_events enable row level security;
revoke all on public.audit_events from anon;
grant select, insert on public.audit_events to authenticated;
drop policy if exists "Users select own audit events" on public.audit_events;
drop policy if exists "Users insert own audit events" on public.audit_events;
create policy "Users select own audit events" on public.audit_events for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Users insert own audit events" on public.audit_events for insert to authenticated with check ((select auth.uid()) = owner_id);

create or replace function public.capture_crm_audit_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := coalesce(new.owner_id, old.owner_id);
  v_company uuid;
  v_action text;
begin
  v_company := case when tg_table_name = 'companies' then coalesce(new.id, old.id) else coalesce(new.company_id, old.company_id) end;
  v_action := case
    when tg_table_name = 'companies' and tg_op = 'INSERT' then 'Company created'
    when tg_table_name = 'companies' then 'Company updated'
    when tg_table_name = 'contacts' then 'Contact added'
    when tg_table_name = 'follow_ups' then 'Follow-up created'
    when tg_table_name = 'opportunities' and tg_op = 'INSERT' then 'Opportunity created'
    when tg_table_name = 'opportunities' then 'Opportunity stage changed'
    when tg_table_name = 'messages' and to_jsonb(new)->>'status' = 'Approved' then 'Draft approved'
    when tg_table_name = 'messages' and to_jsonb(new)->>'status' = 'Contacted' then 'Contacted'
    when tg_table_name = 'messages' and coalesce(to_jsonb(new)->>'outcome', '') <> coalesce(to_jsonb(old)->>'outcome', '') then 'Outcome added'
    else null end;
  if v_action is not null then
    insert into public.audit_events(owner_id, company_id, entity_type, entity_id, action, details)
    values (v_owner, v_company, tg_table_name, coalesce(new.id, old.id), v_action,
      jsonb_build_object(
        'status', coalesce(to_jsonb(new)->>'status', ''),
        'stage', coalesce(to_jsonb(new)->>'stage', ''),
        'outcome', coalesce(to_jsonb(new)->>'outcome', '')
      ));
  end if;
  return new;
end $$;

drop trigger if exists audit_companies on public.companies;
create trigger audit_companies after insert or update on public.companies for each row execute function public.capture_crm_audit_event();
drop trigger if exists audit_contacts on public.contacts;
create trigger audit_contacts after insert on public.contacts for each row execute function public.capture_crm_audit_event();
drop trigger if exists audit_follow_ups on public.follow_ups;
create trigger audit_follow_ups after insert on public.follow_ups for each row execute function public.capture_crm_audit_event();
drop trigger if exists audit_opportunities on public.opportunities;
create trigger audit_opportunities after insert or update of stage on public.opportunities for each row execute function public.capture_crm_audit_event();
drop trigger if exists audit_messages on public.messages;
create trigger audit_messages after update of status, outcome on public.messages for each row execute function public.capture_crm_audit_event();

insert into public.messages(owner_id, company_id, company_name, direction, channel, subject, body, status, template_name)
select c.owner_id, c.id, c.company_name, 'outgoing', t.channel, t.subject,
  replace(replace(t.body, '{{company}}', c.company_name), '{{focus}}',
    case c.company_type
      when 'Factory' then 'الأعمال المدنية والإنشاءات الصناعية والتوسعات والصيانة الإنشائية'
      when 'Industrial Company' then 'الأعمال المدنية والإنشاءات الصناعية والتوسعات والصيانة الإنشائية'
      when 'Main Contractor' then 'حزم المقاولات الباطنة والأعمال المدنية والمعمارية والصناعية'
      when 'Real Estate Developer' then 'التسجيل كمقاول والمشاريع المستقبلية وحزم الأعمال المدنية والمعمارية'
      else 'فرص أعمال المقاولات والتنفيذ المناسبة' end),
  'Draft', t.template_name
from public.companies c
cross join (values
  ('Phone', 'Phone Call Opening', 'افتتاحية مكالمة', 'السلام عليكم، معكم AJ-EDGE. نتواصل للتعريف المختصر وبحث {{focus}} لدى {{company}}. هل يمكن توجيهنا إلى مسؤول المشاريع أو المشتريات؟'),
  ('Email', 'Revisit Later', 'إعادة تواصل لاحقاً', 'تحية طيبة، نعيد التواصل مع {{company}} في الوقت المناسب لبحث {{focus}}. يسعدنا مشاركة الملف التعريفي عند الطلب والتعرف على آلية التسجيل أو التأهيل لديكم.')
) as t(channel, template_name, subject, body)
where c.priority in ('A','B')
  and not exists (select 1 from public.messages m where m.company_id = c.id and m.template_name = t.template_name);

create index if not exists audit_events_owner_created_idx on public.audit_events(owner_id, created_at desc);
create index if not exists companies_owner_vendor_status_idx on public.companies(owner_id, vendor_registration_status);
