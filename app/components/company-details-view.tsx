'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CompanyIntelligenceWorkspace } from './company-intelligence-workspace';
import { FollowUpForm } from './follow-up-form';
import type { Company } from '../lib/company-store';
import { type Contact } from '../lib/contact-store';
import { type FollowUp } from '../lib/follow-up-store';
import { supabaseCrm } from '../lib/supabase/crm';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

type CompanyDetailsViewProps = {
  company: Company;
};
type CompanyTab = 'overview' | 'contacts' | 'decisionMakers' | 'research' | 'vendorRegistration' | 'outreach' | 'followups' | 'meetings' | 'opportunities' | 'activity';
const companyTabs: { id: CompanyTab; label: string }[] = [
  { id: 'overview', label: 'نظرة عامة' }, { id: 'contacts', label: 'جهات الاتصال' }, { id: 'decisionMakers', label: 'صنّاع القرار' },
  { id: 'research', label: 'البحث' }, { id: 'vendorRegistration', label: 'تسجيل الموردين' }, { id: 'outreach', label: 'التواصل' },
  { id: 'followups', label: 'المتابعات' }, { id: 'meetings', label: 'الاجتماعات' },
  { id: 'opportunities', label: 'الفرص' }, { id: 'activity', label: 'النشاط' },
];

export function CompanyDetailsView({ company }: CompanyDetailsViewProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [operational, setOperational] = useState<Record<string, SimpleRow[]>>({});
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CompanyTab>('overview');
  const [operationalLoading, setOperationalLoading] = useState(true);
  const [operationalError, setOperationalError] = useState('');

  useEffect(() => {
    void Promise.all([simpleCrud.forCompany('contacts',company.id),simpleCrud.forCompany('follow_ups',company.id),simpleCrud.forCompany('messages',company.id),simpleCrud.forCompany('meetings',company.id),simpleCrud.forCompany('opportunities',company.id),simpleCrud.forCompany('audit_events',company.id),simpleCrud.forCompany('agent_jobs',company.id),simpleCrud.forCompany('communication_events',company.id)]).then(([contactRows, followUpRows, messages, meetings, opportunities, auditEvents, agentJobs, communicationEvents]) => {
      setContacts(contactRows.map((row) => ({ id:String(row.id),companyId:String(row.company_id??''),companyName:String(row.company_name??company.companyName),fullName:String(row.full_name||row.name||''),position:String(row.position??''),department:String(row.department??''),mobile:String(row.mobile||row.phone||''),email:String(row.email??''),linkedIn:String(row.linked_in||row.linkedin||''),decisionLevel:String(row.decision_level??'Unknown'),preferredContactMethod:String(row.preferred_contact_method??''),source:String(row.source??''),sourceUrl:String(row.source_url??''),confidence:Number(row.confidence??0),verificationStatus:String(row.verification_status??'UNVERIFIED'),decisionMaker:Boolean(row.decision_maker),verifiedAt:String(row.verified_at??''),archivedAt:String(row.archived_at??''),notes:String(row.notes??''),createdAt:String(row.created_at??''),updatedAt:String(row.updated_at??'') })) as Contact[]);
      setFollowUps(followUpRows.map((row)=>({id:String(row.id),companyId:String(row.company_id??''),companyName:String(row.company_name??''),contactPerson:String(row.contact_person??''),followUpType:String(row.follow_up_type??'General'),date:String(row.date||row.due_date||''),time:String(row.time??''),priority:String(row.priority??'Medium'),status:String(row.status??'Pending'),subject:String(row.subject||row.title||''),notes:String(row.notes??''),result:String(row.result||row.outcome||''),nextAction:String(row.next_action??''),nextFollowUpDate:String(row.next_follow_up_date??''),createdAt:String(row.created_at??''),updatedAt:String(row.updated_at??'')})) as FollowUp[]);
      setOperational({ company:[{id:company.id,company_name:company.companyName,company_type:company.companyType??null,sector:company.sector??null,city:company.city??null,website:company.website??null,general_email:company.generalEmail??null,general_phone:company.generalPhone??null,source_url:company.sourceUrl??null,vendor_registration_url:company.vendorRegistrationUrl??null,vendor_registration_status:company.vendorRegistrationStatus??null,vendor_registration_requirements:company.vendorRegistrationRequirements??null,vendor_registration_account_status:company.vendorRegistrationAccountStatus??null,vendor_registration_last_checked:company.vendorRegistrationLastChecked??null,vendor_registration_next_action:company.vendorRegistrationNextAction??null,vendor_registration_notes:company.vendorRegistrationNotes??null,verified_at:company.verificationStatus==='Verified'?company.updatedAt:null,updated_at:company.updatedAt??null}], messages, meetings, opportunities, audit_events:auditEvents, agent_logs:agentJobs, communication_events:communicationEvents });
    }).catch((reason: Error) => setOperationalError(reason.message)).finally(() => setOperationalLoading(false));
  }, [company]);

  const upcomingFollowUps = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return followUps.filter((item) => ['Pending', 'Due Today', 'Overdue', 'مجدولة', 'متأخرة'].includes(item.status) && item.date >= today);
  }, [followUps]);

  async function handleFollowUpSubmit(followUp: FollowUp) {
    const created = await supabaseCrm.followUps.create({ ...followUp, companyId: company.id, companyName: company.companyName });
    setFollowUps((items) => [created as FollowUp, ...items]);
    setIsFollowUpOpen(false);
  }

  const companyRow = operational.company?.[0];
  const decisionMakers = contacts.filter((contact) => contact.decisionMaker && contact.verificationStatus === 'VERIFIED' && Boolean(contact.sourceUrl || contact.source));
  const nextBestAction = useMemo(() => {
    const hasOutbound=(operational.communication_events??[]).some(item=>item.direction==='OUTBOUND');
    const hasInbound=(operational.communication_events??[]).some(item=>item.direction==='INBOUND');
    const hasDraft=(operational.messages??[]).some(item=>['Draft','Approved'].includes(String(item.status)));
    if (!decisionMakers.length) return {label:'استكمال صانع القرار',href:`/research?tab=manual&company_id=${company.id}`,detail:'حدد الشخص الصحيح ووثّق المصدر قبل تجهيز التواصل.'};
    if (!hasDraft) return {label:'تجهيز رسالة',href:`/outreach?tab=drafts&company_id=${company.id}`,detail:'صانع القرار موثق؛ جهز مسودة مرتبطة به للمراجعة.'};
    if (!hasOutbound) return {label:'مراجعة المسودة',href:`/outreach?tab=ready&company_id=${company.id}`,detail:'المسودة ليست تواصلاً. راجعها ثم سجل حدث التواصل الحقيقي.'};
    if (hasInbound) return {label:'متابعة الرد',href:`/outreach?tab=history&company_id=${company.id}`,detail:'وصل رد موثق؛ حدد النتيجة والإجراء التالي.'};
    if (upcomingFollowUps.length) return {label:'تنفيذ المتابعة',href:`/follow-ups?company_id=${company.id}`,detail:'توجد متابعة محفوظة ومستحقة لهذه الشركة.'};
    return {label:'تقييم فرصة',href:`/pipeline?company_id=${company.id}`,detail:'راجع نتيجة التواصل وحدد إن كانت فرصة مؤهلة.'};
  },[company.id,decisionMakers.length,operational.communication_events,operational.messages,upcomingFollowUps.length]);
  const activityItems = useMemo(() => [
    ...(operational.audit_events ?? []).map((item) => ({ id: `audit-${item.id}`, at: String(item.created_at ?? ''), source: 'Audit', title: `${String(item.entity_type ?? '')} · ${String(item.action ?? '')}` })),
    ...(operational.agent_logs ?? []).map((item) => ({ id: `agent-${item.id}`, at: String(item.created_at ?? ''), source: String(item.agent_name ?? 'Agent'), title: String(item.message ?? '') })),
  ].sort((a, b) => b.at.localeCompare(a.at)), [operational.agent_logs, operational.audit_events]);

  return (
    <div className="space-y-4">
      {operationalError ? <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">تعذر تحميل بعض بيانات الشركة: {operationalError}</div> : null}
      {operationalLoading ? <div className="crm-empty animate-pulse">جارٍ تحميل ملف الشركة الكامل...</div> : null}
      <section className="crm-card flex flex-col gap-3 border-r-4 border-r-[#b78d38] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold text-[#9a742b]">الإجراء الأفضل التالي</p><h3 className="mt-1 text-lg font-bold">{nextBestAction.label}</h3><p className="mt-1 text-sm text-[#75664d]">{nextBestAction.detail}</p></div><Link href={nextBestAction.href} className="btn-primary shrink-0">ابدأ الآن</Link></section>
      <div className="flex gap-1 overflow-x-auto rounded-[18px] border border-[#ead9b3] bg-[#f7efdf] p-1.5">
        {companyTabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${activeTab === tab.id ? 'bg-[#2f2417] text-[#fef8ec] shadow-md' : 'text-[#6f6044] hover:bg-white'}`}>{tab.label}</button>)}
      </div>

      <section className="crm-card p-5"><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4"><div><div className="flex justify-between"><p className="text-xs text-[#6f6044]">Priority</p><span className={`crm-chip ${company.priority === 'A' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'}`}>{company.priority||'C'}</span></div><strong className="mt-2 block text-2xl">أولوية {company.priority||'C'}</strong></div><div><div className="flex justify-between text-xs"><span>Lead Score</span><strong>{company.leadScore||0}/100</strong></div><div className="crm-progress mt-3"><span style={{width:`${company.leadScore||0}%`}} /></div></div><div><div className="flex justify-between text-xs"><span>Data Completeness</span><strong>{company.dataCompleteness||0}%</strong></div><div className="crm-progress mt-3"><span style={{width:`${company.dataCompleteness||0}%`}} /></div></div><div><p className="text-xs text-[#6f6044]">Qualification</p><strong className="mt-2 block text-lg">{company.qualificationStatus || 'Needs Research'}</strong><p className="mt-1 text-xs text-[#75664d]">{company.qualificationReason || 'بانتظار التصنيف الداخلي'}</p></div></div>{company.scoreReasons?.length?<ul className="mt-4 flex flex-wrap gap-2 text-xs text-[#6f6044]">{company.scoreReasons.map(reason=><li className="crm-chip bg-[#f5ecdc]" key={reason}>+ {reason}</li>)}</ul>:null}{company.nextAction ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><strong>الإجراء التالي:</strong> {company.nextAction}</p> : null}{company.missingFields?.length?<p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">البيانات الناقصة: {company.missingFields.join('، ')}</p>:null}</section>

      <section className="rounded-[24px] border border-[#ead9b3] bg-white p-5">
        <h3 className="text-lg font-semibold">مركز العمل على الشركة</h3>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <a target="_blank" rel="noreferrer" href={`https://www.google.com/search?q=${encodeURIComponent(company.companyName)}`} className="rounded-full border px-3 py-2">بحث الشركة</a>
          <a target="_blank" rel="noreferrer" href={`https://www.google.com/search?q=${encodeURIComponent(company.companyName)}+procurement+manager`} className="rounded-full border px-3 py-2">مسؤول المشتريات</a>
          <a target="_blank" rel="noreferrer" href={`https://www.google.com/search?q=${encodeURIComponent(company.companyName)}+projects+manager`} className="rounded-full border px-3 py-2">مسؤول المشاريع</a>
          <a target="_blank" rel="noreferrer" href={`https://www.google.com/search?q=${encodeURIComponent(company.companyName)}+vendor+registration`} className="rounded-full border px-3 py-2">تسجيل الموردين</a>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div><p className="text-xs">المسودات</p><strong>{operational.messages?.filter((item) => ['Draft', 'Approved'].includes(String(item.status))).length ?? 0}</strong></div>
          <div><p className="text-xs">الاجتماعات</p><strong>{operational.meetings?.length ?? 0}</strong></div>
          <div><p className="text-xs">الفرص</p><strong>{operational.opportunities?.length ?? 0}</strong></div>
          <div><p className="text-xs">سجل التدقيق</p><strong>{operational.audit_events?.length ?? 0}</strong></div>
        </div>
        {operational.messages?.[0] ? <div className="mt-4 rounded-2xl bg-[#fdf8ee] p-3"><p className="text-xs">أول مسودة جاهزة للمراجعة</p><p className="mt-2 whitespace-pre-wrap text-sm">{String(operational.messages[0].body ?? '')}</p></div> : null}
      </section>

      {activeTab==='activity'&&<section className="rounded-[24px] border border-[#ead9b3] bg-white p-5"><h3 className="text-lg font-semibold">نشاط الوكلاء الداخلي</h3><p className="mt-1 text-xs text-[#75664d]">تفاصيل مساندة ضمن سجل النشاط، وليست حالة تجارية للشركة.</p><div className="mt-3 space-y-2 text-xs">{operational.agent_logs?.slice(0,10).map(item=><div key={item.id} className="rounded-xl bg-[#fdf8ee] p-3"><span className="text-[#9a7b2f]">{String(item.created_at??'')} · {String(item.agent_name??'')}</span><p>{String(item.message??'')}</p></div>)}{!operational.agent_logs?.length&&<p>لا يوجد نشاط داخلي مسجل لهذه الشركة.</p>}</div></section>}

      {activeTab === 'research' ? (
        <CompanyIntelligenceWorkspace company={company} />
      ) : activeTab === 'contacts' ? (
        <section className="crm-card p-5"><h3 className="font-bold">جهات الاتصال</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{contacts.map((contact) => <article key={contact.id} className="rounded-2xl border border-[#ead9b3] bg-[#fdf9f1] p-4"><div className="flex justify-between gap-3"><strong>{contact.fullName}</strong><span className={`crm-chip ${contact.verificationStatus === 'Verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{contact.verificationStatus || 'Needs Verification'}</span></div><p className="mt-1 text-sm text-[#75664d]">{contact.position || contact.department || '—'}</p><p className="mt-2 text-xs">{contact.email || contact.mobile || 'لا توجد بيانات اتصال منشورة'}</p><p className="mt-2 text-xs text-[#75664d]">المصدر: {contact.source || 'غير موثق'} · الثقة {contact.confidence || 0}%</p>{contact.sourceUrl ? <a href={contact.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-[#8d6926] underline">فتح المصدر</a> : null}</article>)}{!contacts.length && <div className="crm-empty md:col-span-2">لا توجد جهات اتصال مرتبطة بعد.</div>}</div></section>
      ) : activeTab === 'decisionMakers' ? (
        <section className="crm-card p-5"><div className="flex items-center justify-between"><h3 className="font-bold">صنّاع القرار</h3><span className="crm-chip bg-[#f0e3ca] text-[#6d5125]">{decisionMakers.length} موثق</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{decisionMakers.map((contact) => <article key={contact.id} className="rounded-2xl border border-[#ead9b3] bg-[#fdf9f1] p-4"><strong>{contact.fullName}</strong><p className="mt-1 text-sm text-[#75664d]">{contact.position || contact.department}</p><div className="mt-3 space-y-1 text-xs"><p>{contact.email || 'البريد غير منشور'}</p><p>{contact.mobile || 'الهاتف غير منشور'}</p>{contact.linkedIn && <a className="text-[#8d6926] underline" href={contact.linkedIn} target="_blank" rel="noreferrer">الملف العام</a>}</div></article>)}{!decisionMakers.length && <div className="crm-empty md:col-span-2">لم يُعثر على صانع قرار موثق بعد؛ الحالة محفوظة للبحث اليدوي دون تخمين.</div>}</div></section>
      ) : activeTab === 'vendorRegistration' ? (
        <section className="crm-card p-5"><div className="flex items-center justify-between"><h3 className="font-bold">تسجيل الموردين والمقاولين</h3><span className={`crm-chip ${companyRow?.vendor_registration_url ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{String(companyRow?.vendor_registration_status || (companyRow?.vendor_registration_url ? 'Portal Found' : 'Manual Action Required'))}</span></div><div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-[#fdf9f1] p-4"><p className="text-xs text-[#75664d]">رابط البوابة</p>{companyRow?.vendor_registration_url ? <a className="mt-2 block break-all font-semibold text-[#8d6926] underline" href={String(companyRow.vendor_registration_url)} target="_blank" rel="noreferrer">{String(companyRow.vendor_registration_url)}</a> : <p className="mt-2 font-semibold">غير متوفر بمصدر مؤكد</p>}</div><div className="rounded-2xl bg-[#fdf9f1] p-4"><p className="text-xs text-[#75664d]">آخر تحقق</p><p className="mt-2 font-semibold">{String(companyRow?.vendor_registration_last_checked || companyRow?.verified_at || companyRow?.updated_at || '—')}</p><p className="mt-3 text-xs text-[#75664d]">المصدر: {String(companyRow?.source_url || 'بحث يدوي مطلوب')}</p></div><div className="rounded-2xl bg-[#fdf9f1] p-4"><p className="text-xs text-[#75664d]">المتطلبات</p><p className="mt-2 whitespace-pre-wrap text-sm">{String(companyRow?.vendor_registration_requirements || 'غير موثقة بعد')}</p></div><div className="rounded-2xl bg-[#fdf9f1] p-4"><p className="text-xs text-[#75664d]">الحساب والإجراء التالي</p><p className="mt-2 text-sm">{String(companyRow?.vendor_registration_account_status || 'لا يوجد حساب مسجل')}</p><p className="mt-2 text-sm font-semibold">{String(companyRow?.vendor_registration_next_action || 'مراجعة يدوية عند توفر بوابة رسمية')}</p></div></div>{companyRow?.vendor_registration_notes ? <p className="mt-4 rounded-2xl bg-[#fdf9f1] p-4 text-sm">{String(companyRow.vendor_registration_notes)}</p> : null}</section>
      ) : activeTab === 'outreach' ? (
        <section className="crm-card p-5"><h3 className="font-bold">مسودات التواصل</h3><div className="mt-4 space-y-3">{operational.messages?.map((item) => <article key={item.id} className="rounded-2xl border border-[#ead9b3] bg-[#fdf9f1] p-4"><div className="flex justify-between gap-3"><strong>{String(item.template_name || item.subject || 'مسودة')}</strong><span className="crm-chip bg-amber-100 text-amber-800">{String(item.status || 'Draft')}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{String(item.body || '')}</p></article>)}{!operational.messages?.length && <div className="crm-empty">لا توجد مسودات بعد.</div>}</div></section>
      ) : activeTab === 'followups' ? (
        <section className="crm-card p-5"><h3 className="font-bold">المتابعات</h3><div className="mt-4 space-y-3">{followUps.map((item) => <article key={item.id} className="rounded-2xl border p-4"><div className="flex justify-between"><strong>{item.subject || item.followUpType}</strong><span className="crm-chip bg-blue-50 text-blue-700">{item.status}</span></div><p className="mt-2 text-xs text-[#75664d]">{item.date}</p></article>)}{!followUps.length && <div className="crm-empty">لا توجد متابعات بعد.</div>}</div></section>
      ) : activeTab === 'meetings' ? (
        <section className="crm-card p-5"><h3 className="font-bold">الاجتماعات</h3><div className="mt-4 space-y-3">{operational.meetings?.map((item) => <article key={item.id} className="rounded-2xl border p-4"><strong>{String(item.title || item.subject || 'اجتماع')}</strong><p className="mt-2 text-xs text-[#75664d]">{String(item.date || item.meeting_date || '')}</p></article>)}{!operational.meetings?.length && <div className="crm-empty">لا توجد اجتماعات بعد.</div>}</div></section>
      ) : activeTab === 'opportunities' ? (
        <section className="crm-card p-5"><h3 className="font-bold">الفرص</h3><div className="mt-4 space-y-3">{operational.opportunities?.map((item) => <article key={item.id} className="rounded-2xl border p-4"><div className="flex justify-between"><strong>{String(item.title || 'فرصة')}</strong><span className="crm-chip bg-emerald-50 text-emerald-700">{String(item.stage || '')}</span></div><p className="mt-2 text-sm text-[#75664d]">{String(item.next_action || '')}</p></article>)}{!operational.opportunities?.length && <div className="crm-empty">لا توجد فرص حقيقية بعد.</div>}</div></section>
      ) : activeTab === 'activity' ? (
        <section className="crm-card p-5"><h3 className="font-bold">سجل النشاط</h3><div className="mt-4 space-y-2">{activityItems.slice(0, 100).map((item) => <div key={item.id} className="border-r-2 border-[#b78d38] bg-[#fdf9f1] p-3 text-xs"><span className="text-[#9a7b2f]">{item.at} · {item.source}</span><p className="mt-1">{item.title}</p></div>)}{!activityItems.length && <div className="crm-empty">لا يوجد نشاط بعد.</div>}</div></section>
      ) : (
        <>
      <section className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">معلومات الشركة</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div><p className="text-sm text-[#9a7b2f]">اسم الشركة</p><p className="mt-1 font-semibold text-[#2f2417]">{company.companyName}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">النوع</p><p className="mt-1 font-semibold text-[#2f2417]">{company.companyType}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">القطاع</p><p className="mt-1 font-semibold text-[#2f2417]">{company.sector || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">النشاط</p><p className="mt-1 font-semibold text-[#2f2417]">{String(companyRow?.activity || company.serviceOpportunity || '—')}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">المدينة</p><p className="mt-1 font-semibold text-[#2f2417]">{company.city}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">العنوان</p><p className="mt-1 font-semibold text-[#2f2417]">{String(companyRow?.address || '—')}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">الموقع الإلكتروني</p><p className="mt-1 font-semibold text-[#2f2417]">{company.website || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">البريد الإلكتروني العام</p><p className="mt-1 font-semibold text-[#2f2417]">{company.generalEmail || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">الهاتف العام</p><p className="mt-1 font-semibold text-[#2f2417]">{company.generalPhone || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">الحالة</p><p className="mt-1 font-semibold text-[#2f2417]">{company.status}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">التأهيل</p><p className="mt-1 font-semibold text-[#2f2417]">{String(companyRow?.data_quality_status || '—')}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">زاوية التعاقد المقترحة</p><p className="mt-1 font-semibold text-[#2f2417]">{company.contractingAngle || String(companyRow?.contracting_angle || '—')}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">حالة البحث</p><p className="mt-1 font-semibold text-[#2f2417]">{String(companyRow?.verification_status || '—')}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">حالة التواصل</p><p className="mt-1 font-semibold text-[#2f2417]">{String(companyRow?.outreach_status || 'Not Contacted')}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">المصدر</p><p className="mt-1 font-semibold text-[#2f2417]">{String(companyRow?.source_name || company.sourceName || '—')}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">رابط المصدر</p>{companyRow?.source_url ? <a href={String(companyRow.source_url)} target="_blank" rel="noreferrer" className="mt-1 block break-all font-semibold text-[#8d6926] underline">فتح المصدر</a> : <p className="mt-1 font-semibold">—</p>}</div>
          <div><p className="text-sm text-[#9a7b2f]">آخر تواصل</p><p className="mt-1 font-semibold text-[#2f2417]">{company.lastContact || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">المتابعة القادمة</p><p className="mt-1 font-semibold text-[#2f2417]">{company.nextFollowUp || '—'}</p></div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#ead9b3] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[#2f2417]">جهات الاتصال</h3>
          <div className="flex flex-wrap gap-2">
            <Link href={`/contacts?company_id=${company.id}`} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-3 py-1.5 text-xs font-semibold text-[#6f6044]">إضافة جهة اتصال لهذه الشركة</Link>
            <button onClick={() => setIsFollowUpOpen(true)} className="rounded-full border border-[#d8c08d] bg-[#f8efe0] px-3 py-1.5 text-xs font-semibold text-[#2f2417]">إضافة متابعة</button>
            <Link href="/ready-outreach" className="rounded-full border border-[#d8c08d] bg-[#fff0e0] px-3 py-1.5 text-xs font-semibold text-[#9a4b2d]">مراجعة المسودات</Link>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div><p className="text-sm text-[#9a7b2f]">الشخص المسؤول</p><p className="mt-1 font-semibold text-[#2f2417]">{company.contactPerson || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">المنصب</p><p className="mt-1 font-semibold text-[#2f2417]">{company.position || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">الجوال</p><p className="mt-1 font-semibold text-[#2f2417]">{company.mobile || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">LinkedIn</p><p className="mt-1 font-semibold text-[#2f2417]">{company.linkedIn || '—'}</p></div>
        </div>
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-[#2f2417]">الجهات المرتبطة</h4>
          <ul className="mt-3 space-y-2 text-sm text-[#6f6044]">
            {contacts.length > 0 ? contacts.map((contact) => <li key={contact.id} className="rounded-2xl border border-[#ead9b3] bg-[#fdf8ee] p-3">{contact.fullName} • {contact.department} • {contact.mobile || '—'}</li>) : <li>لا توجد جهات اتصال مرتبطة بعد.</li>}
          </ul>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#ead9b3] bg-white p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">السجل التواصل</h3>
        <ul className="mt-3 space-y-2 text-sm text-[#6f6044]">
          {company.communicationHistory.length > 0 ? company.communicationHistory.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-[#ead9b3] bg-[#fdf8ee] p-3">{entry.date} • {entry.type}: {entry.content}</li>
          )) : <li>لا توجد سجلات تواصل بعد.</li>}
        </ul>
      </section>

      <section className="rounded-[24px] border border-[#ead9b3] bg-white p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">المتابعات القادمة</h3>
        <ul className="mt-3 space-y-2 text-sm text-[#6f6044]">
          {upcomingFollowUps.length > 0 ? upcomingFollowUps.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-[#ead9b3] bg-[#fdf8ee] p-3">{entry.date} • {entry.followUpType} • {entry.subject || 'بدون موضوع'}</li>
          )) : <li>لا توجد متابعات قادمة بعد.</li>}
        </ul>
      </section>

      {isFollowUpOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2f2417]/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[30px] border border-[#ead9b3] bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-[#2f2417]">إضافة متابعة</h3>
              <button onClick={() => setIsFollowUpOpen(false)} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-3 py-1.5 text-sm text-[#6f6044]">إغلاق</button>
            </div>
            <FollowUpForm
              companyId={company.id}
              companyName={company.companyName}
              contactPerson={company.contactPerson}
              contactOptions={contacts}
              onSubmit={handleFollowUpSubmit}
              onCancel={() => setIsFollowUpOpen(false)}
              submitLabel="حفظ المتابعة"
            />
          </div>
        </div>
      ) : null}

      <section className="rounded-[24px] border border-[#ead9b3] bg-white p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">الفرص</h3>
        <ul className="mt-3 space-y-2 text-sm text-[#6f6044]">
          {company.opportunities.length > 0 ? company.opportunities.map((item, index) => <li key={`${item}-${index}`} className="rounded-2xl border border-[#ead9b3] bg-[#fdf8ee] p-3">{item}</li>) : <li>لا توجد فرص بعد.</li>}
        </ul>
      </section>

      <section className="rounded-[24px] border border-[#ead9b3] bg-white p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">ملاحظات</h3>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#6f6044]">{company.notes || '—'}</p>
      </section>
        </>
      )}
    </div>
  );
}
