alter table public.companies
  add column if not exists priority text not null default 'C',
  add column if not exists score_reasons jsonb not null default '[]'::jsonb,
  add column if not exists missing_fields text[] not null default '{}',
  add column if not exists data_quality_status text not null default 'Poor Data',
  add column if not exists verification_status text not null default 'Needs Verification',
  add column if not exists outreach_status text not null default 'Not Contacted',
  add column if not exists last_outcome text not null default '',
  add column if not exists nurture_until date;

alter table public.messages
  add column if not exists approved_at timestamptz,
  add column if not exists outcome text not null default '';

create table if not exists public.user_settings (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  daily_outreach_limit integer not null default 10 check (daily_outreach_limit between 1 and 50),
  daily_follow_up_limit integer not null default 15 check (daily_follow_up_limit between 1 and 100),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
revoke all on public.user_settings from anon;
grant select,insert,update,delete on public.user_settings to authenticated;
create policy "Users select own settings" on public.user_settings for select to authenticated using ((select auth.uid())=owner_id);
create policy "Users insert own settings" on public.user_settings for insert to authenticated with check ((select auth.uid())=owner_id);
create policy "Users update own settings" on public.user_settings for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);

update public.companies set
  company_name=trim(regexp_replace(company_name,'\s+',' ','g')),
  city=case lower(trim(city)) when 'dammam' then 'Dammam' when 'الدمام' then 'Dammam' when 'khobar' then 'Khobar' when 'الخبر' then 'Khobar' when 'dhahran' then 'Dhahran' when 'الظهران' then 'Dhahran' when 'jubail' then 'Jubail' when 'الجبيل' then 'Jubail' when 'ras tanura' then 'Ras Tanura' when 'رأس تنورة' then 'Ras Tanura' when 'راس تنورة' then 'Ras Tanura' when 'qatif' then 'Qatif' when 'القطيف' then 'Qatif' else trim(city) end,
  website=lower(trim(trailing '/' from trim(website))), email=lower(trim(email)), general_email=lower(trim(general_email)),
  phone=regexp_replace(phone,'[^0-9+]','','g'), general_phone=regexp_replace(general_phone,'[^0-9+]','','g'),
  company_type=case when lower(company_type) like '%factory%' or company_type like '%مصنع%' then 'Factory' when lower(company_type) like '%industrial%' or company_type like '%صناع%' then 'Industrial Company' when lower(company_type) like '%contractor%' or company_type like '%مقاول%' then 'Main Contractor' when lower(company_type) like '%developer%' or company_type like '%مطور%' then 'Real Estate Developer' else trim(company_type) end,
  sector=trim(sector), activity=trim(activity), source_name=trim(source_name);

update public.companies set data_completeness=(
  (case when company_name<>'' then 15 else 0 end)+(case when company_type<>'' then 10 else 0 end)+(case when sector<>'' or activity<>'' then 10 else 0 end)+(case when city<>'' then 10 else 0 end)+
  (case when website<>'' then 10 else 0 end)+(case when coalesce(nullif(general_phone,''),nullif(phone,'')) is not null then 10 else 0 end)+(case when coalesce(nullif(general_email,''),nullif(email,'')) is not null then 10 else 0 end)+
  (case when contact_person<>'' then 10 else 0 end)+(case when mobile<>'' then 5 else 0 end)+(case when linked_in<>'' or linkedin is not null then 5 else 0 end)+(case when source_name<>'' or source_url<>'' then 5 else 0 end)
), missing_fields=array_remove(array[
  case when website='' then 'website' end,case when coalesce(nullif(general_phone,''),nullif(phone,'')) is null then 'general phone' end,case when coalesce(nullif(general_email,''),nullif(email,'')) is null then 'general email' end,
  case when contact_person='' then 'decision maker' end,case when mobile='' then 'mobile' end,case when linked_in='' and linkedin is null then 'LinkedIn' end,case when source_name='' and source_url='' then 'source verification' end
],null);

update public.companies set
  lead_score=least(100,
    case company_type when 'Factory' then 35 when 'Industrial Company' then 35 when 'Main Contractor' then 34 when 'Real Estate Developer' then 30 else 15 end+
    case when city in ('Dammam','Khobar','Dhahran','Jubail','Ras Tanura','Qatif') then 15 else 5 end+
    case when lower(sector||' '||activity||' '||notes) ~ 'industr|construct|contract|civil|maintenance|project|factory|صناع|مقاول|إنشاء|صيانة|مشروع' then 15 else 7 end+
    case when company_type in ('Factory','Industrial Company','Main Contractor','Real Estate Developer') then 8 else 3 end+
    case when website<>'' then 5 else 0 end+case when coalesce(nullif(general_phone,''),nullif(phone,'')) is not null then 5 else 0 end+case when coalesce(nullif(general_email,''),nullif(email,'')) is not null then 5 else 0 end+
    case when contact_person<>'' then 5 else 0 end+case when source_name<>'' or source_url<>'' then 4 else 0 end+case when data_completeness>=70 then 4 when data_completeness>=50 then 2 else 0 end),
  score_reasons=jsonb_build_array('Company type: '||coalesce(nullif(company_type,''),'Other'),'Location: '||coalesce(nullif(city,''),'Unknown'),case when website<>'' or coalesce(nullif(general_phone,''),nullif(phone,'')) is not null or coalesce(nullif(general_email,''),nullif(email,'')) is not null then 'Contact channel available' else 'Contact data needs enrichment' end,case when contact_person<>'' then 'Decision maker available' else 'Decision maker research needed' end);

update public.companies set priority=case when lead_score>=80 then 'A' when lead_score>=60 then 'B' else 'C' end,
 data_quality_status=case when data_completeness>=90 then 'Complete' when data_completeness>=70 then 'Good' when data_completeness>=45 then 'Needs Enrichment' else 'Poor Data' end;

insert into public.messages(owner_id,company_id,company_name,direction,channel,subject,body,status,template_name)
select c.owner_id,c.id,c.company_name,'outgoing',t.channel,t.subject,
case when t.template_name='Initial Email' then 'السادة '||c.company_name||'، تحية طيبة. نرغب في التعارف وبحث فرص التعاون في أعمال المقاولات والتنفيذ المناسبة لاحتياجاتكم، ويسعدنا التواصل مع مسؤول المشاريع أو المشتريات للتعريف المختصر وطلب التسجيل كمقاول/مورد عند ملاءمة ذلك.'
when t.template_name='Short WhatsApp' then 'السلام عليكم، نتواصل من AJ-EDGE للتعارف مع '||c.company_name||' وبحث فرص تعاون مناسبة في أعمال المقاولات والتنفيذ. نأمل توجيهنا لمسؤول المشاريع أو المشتريات.'
when t.template_name='LinkedIn Intro' then 'مرحباً، يسعدنا التعارف وبحث فرص التعاون المستقبلية مع '||c.company_name||' في الأعمال المناسبة، ونأمل التواصل مع المسؤول المختص.'
when t.template_name='Follow-up 1' then 'تحية طيبة، نتابع بلطف تواصلنا السابق مع '||c.company_name||'، ويسعدنا معرفة الشخص المناسب لبحث فرص التعاون أو التسجيل.'
else 'تحية طيبة، هذه متابعة أخيرة للتعارف وبحث أي فرصة مستقبلية مناسبة. سنسعد بالتواصل عند وجود احتياج دون إزعاج.' end,'Draft',t.template_name
from public.companies c cross join (values ('Email','Initial Email','تعارف وفرص تعاون'),('WhatsApp','Short WhatsApp','تعارف مختصر'),('LinkedIn','LinkedIn Intro','تعارف مهني'),('Email','Follow-up 1','متابعة أولى'),('Email','Follow-up 2','متابعة ثانية')) t(channel,template_name,subject)
where c.priority in ('A','B') and not exists(select 1 from public.messages m where m.company_id=c.id and m.template_name=t.template_name);

create index if not exists companies_owner_priority_score_idx on public.companies(owner_id,priority,lead_score desc);
create index if not exists companies_owner_quality_idx on public.companies(owner_id,data_quality_status);
create index if not exists messages_owner_status_idx on public.messages(owner_id,status,created_at desc);
