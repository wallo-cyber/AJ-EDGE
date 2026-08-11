'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CompanyIntelligenceWorkspace } from './company-intelligence-workspace';
import { FollowUpForm } from './follow-up-form';
import { OutreachIntelligenceCard } from './outreach-intelligence-card';
import type { Company } from '../lib/company-store';
import { type Contact } from '../lib/contact-store';
import { type FollowUp } from '../lib/follow-up-store';
import { supabaseCrm } from '../lib/supabase/crm';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';
import { buildCompanyIntelligence, buildRelationshipMemory, conversationStrategy, dealCoach, followUpIntelligence, generateProfessionalMessage } from '../lib/intelligence/v6';
import { companyLifecycle, qualificationGate } from '../lib/intelligence/bd-core';
import { recommendAttachment } from '../lib/intelligence/attachment-recommendation';

type CompanyDetailsViewProps = {
  company: Company;
};
type CompanyTab = 'overview' | 'intelligence' | 'contacts' | 'research' | 'signals' | 'outreach' | 'relationship' | 'network' | 'pipeline' | 'activity' | 'decisionMakers' | 'vendorRegistration' | 'followups' | 'meetings' | 'opportunities';
const companyTabs: { id: CompanyTab; label: string }[] = [
  { id: 'overview', label: 'نظرة عامة' }, { id: 'intelligence', label: 'الذكاء' }, { id: 'contacts', label: 'جهات الاتصال' },
  { id: 'research', label: 'البحث' }, { id: 'signals', label: 'الإشارات والمشاريع' }, { id: 'outreach', label: 'التواصل' }, { id: 'relationship', label: 'العلاقة' }, { id: 'network', label: 'شبكة العلاقات' },
  { id: 'decisionMakers', label: 'صناع القرار' }, { id: 'vendorRegistration', label: 'تسجيل الموردين' }, { id: 'followups', label: 'المتابعات' }, { id: 'meetings', label: 'الاجتماعات' }, { id: 'opportunities', label: 'الفرص' },
  { id: 'pipeline', label: 'المسار التجاري' }, { id: 'activity', label: 'النشاط' },
];

export function CompanyDetailsView({ company }: CompanyDetailsViewProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [operational, setOperational] = useState<Record<string, SimpleRow[]>>({});
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CompanyTab>('overview');
  const [operationalLoading, setOperationalLoading] = useState(true);
  const [operationalError, setOperationalError] = useState('');
  const [prepareNotice, setPrepareNotice] = useState('');
  const [networkType, setNetworkType] = useState('');
  const [networkStatus, setNetworkStatus] = useState('');

  useEffect(() => {
    void Promise.all([simpleCrud.forCompany('contacts',company.id),simpleCrud.forCompany('follow_ups',company.id),simpleCrud.forCompany('messages',company.id),simpleCrud.forCompany('meetings',company.id),simpleCrud.forCompany('opportunities',company.id),simpleCrud.forCompany('audit_events',company.id),simpleCrud.forCompany('agent_jobs',company.id),simpleCrud.forCompany('communication_events',company.id),simpleCrud.forCompany('opportunity_signals',company.id),simpleCrud.list('company_relationships'),simpleCrud.list('companies'),simpleCrud.list('sales_kit_assets')]).then(([contactRows, followUpRows, messages, meetings, opportunities, auditEvents, agentJobs, communicationEvents, signals, relationships, companies, salesKitAssets]) => {
      setContacts(contactRows.map((row) => ({ id:String(row.id),companyId:String(row.company_id??''),companyName:String(row.company_name??company.companyName),fullName:String(row.full_name||row.name||''),position:String(row.position??''),department:String(row.department??''),phone:String(row.phone??''),mobile:String(row.mobile||row.phone||''),email:String(row.email??''),linkedIn:String(row.linked_in||row.linkedin||''),decisionLevel:String(row.decision_level??'Unknown'),preferredContactMethod:String(row.preferred_contact_method??''),source:String(row.source??''),sourceUrl:String(row.source_url??''),confidence:Number(row.confidence??0),verificationStatus:String(row.verification_status??'UNVERIFIED'),decisionMaker:Boolean(row.decision_maker),verifiedAt:String(row.verified_at??''),archivedAt:String(row.archived_at??''),notes:String(row.notes??''),createdAt:String(row.created_at??''),updatedAt:String(row.updated_at??'') })) as Contact[]);
      setFollowUps(followUpRows.map((row)=>({id:String(row.id),companyId:String(row.company_id??''),companyName:String(row.company_name??''),contactPerson:String(row.contact_person??''),followUpType:String(row.follow_up_type??'General'),date:String(row.date||row.due_date||''),time:String(row.time??''),priority:String(row.priority??'Medium'),status:String(row.status??'Pending'),subject:String(row.subject||row.title||''),notes:String(row.notes??''),result:String(row.result||row.outcome||''),nextAction:String(row.next_action??''),nextFollowUpDate:String(row.next_follow_up_date??''),createdAt:String(row.created_at??''),updatedAt:String(row.updated_at??'')})) as FollowUp[]);
      setOperational({ company:[{id:company.id,company_name:company.companyName,company_type:company.companyType??null,sector:company.sector??null,city:company.city??null,website:company.website??null,general_email:company.generalEmail??null,general_phone:company.generalPhone??null,priority:company.priority??'C',lead_score:company.leadScore??0,data_completeness:company.dataCompleteness??0,verification_status:company.verificationStatus??'',business_angle:company.contractingAngle??'',source_url:company.sourceUrl??null,vendor_registration_url:company.vendorRegistrationUrl??null,vendor_registration_status:company.vendorRegistrationStatus??null,vendor_registration_requirements:company.vendorRegistrationRequirements??null,vendor_registration_account_status:company.vendorRegistrationAccountStatus??null,vendor_registration_last_checked:company.vendorRegistrationLastChecked??null,vendor_registration_next_action:company.vendorRegistrationNextAction??null,vendor_registration_notes:company.vendorRegistrationNotes??null,verified_at:company.verificationStatus==='Verified'?company.updatedAt:null,updated_at:company.updatedAt??null}], contacts:contactRows, follow_ups:followUpRows, messages, meetings, opportunities, signals, audit_events:auditEvents, agent_logs:agentJobs, communication_events:communicationEvents, relationships, companies, sales_kit_assets:salesKitAssets });
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
  const v6Intelligence = useMemo(() => companyRow ? buildCompanyIntelligence({ company:companyRow, contacts:operational.contacts, drafts:operational.messages, events:operational.communication_events, followups:operational.follow_ups, meetings:operational.meetings, opportunities:operational.opportunities }) : null, [companyRow, operational.communication_events, operational.contacts, operational.follow_ups, operational.meetings, operational.messages, operational.opportunities]);
  const relationshipMemory = useMemo(() => companyRow ? buildRelationshipMemory({ company:companyRow, contacts:operational.contacts, drafts:operational.messages, events:operational.communication_events, meetings:operational.meetings, opportunities:operational.opportunities, research:operational.agent_logs }) : null, [companyRow, operational.agent_logs, operational.communication_events, operational.contacts, operational.meetings, operational.messages, operational.opportunities]);
  const coach = useMemo(() => companyRow ? dealCoach({ company:companyRow, contacts:operational.contacts, events:operational.communication_events, meetings:operational.meetings, opportunities:operational.opportunities, signals:v6Intelligence?.signals }) : null, [companyRow, operational.communication_events, operational.contacts, operational.meetings, operational.opportunities, v6Intelligence?.signals]);
  const lifecycle = useMemo(() => companyRow ? companyLifecycle({company:companyRow,contacts:operational.contacts,signals:operational.signals,drafts:operational.messages,events:operational.communication_events,followups:operational.follow_ups,meetings:operational.meetings,opportunities:operational.opportunities}) : null,[companyRow,operational]);
  const qualification = useMemo(() => companyRow ? qualificationGate(companyRow,operational.contacts,operational.signals) : null,[companyRow,operational.contacts,operational.signals]);
  const networkRelationships = useMemo(() => (operational.relationships ?? []).filter((item) => (String(item.source_company_id) === company.id || String(item.target_company_id) === company.id) && (!networkType || String(item.relationship_type) === networkType) && (!networkStatus || String(item.status) === networkStatus)), [company.id, networkStatus, networkType, operational.relationships]);
  const networkCompanyName = (id: unknown) => String((operational.companies ?? []).find((item) => item.id === String(id))?.company_name ?? 'جهة غير مسماة');
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
  const outreachPrep = useMemo(() => {
    if (!companyRow) return null;
    const recipient = decisionMakers[0] ?? contacts.find((item) => Boolean(item.email || item.mobile || item.phone));
    const strategy = conversationStrategy({ company: companyRow, contacts: operational.contacts, drafts: operational.messages, events: operational.communication_events, meetings: operational.meetings, opportunities: operational.opportunities, channel: 'EMAIL', language: String(companyRow.recommended_language || 'ARABIC').toUpperCase() === 'ENGLISH' ? 'ENGLISH' : 'ARABIC' });
    const generated = generateProfessionalMessage({ strategy, companyName: String(companyRow.company_name || company.companyName), recipientName: recipient ? String(recipient.fullName || '') : '', verifiedRecipient: Boolean(recipient && String(recipient.verificationStatus || '').toUpperCase() === 'VERIFIED'), evidence: recipient ? [{ label: 'Recipient', value: String(recipient.fullName || ''), source: String(recipient.sourceUrl || recipient.source || '') }] : [] });
    const attachment = recommendAttachment((operational.sales_kit_assets ?? []).filter((item) => item.active !== false), companyRow, recipient ? String(recipient.position || '') : String(companyRow.recommended_role || ''));
    const followup = followUpIntelligence({ state: 'NO_RESPONSE', memory: relationshipMemory ?? buildRelationshipMemory({ company: companyRow, contacts: operational.contacts, drafts: operational.messages, events: operational.communication_events, meetings: operational.meetings, opportunities: operational.opportunities }) });
    return { recipient, strategy, generated, attachment, followup };
  }, [company.companyName, companyRow, contacts, decisionMakers, operational.communication_events, operational.contacts, operational.meetings, operational.messages, operational.opportunities, operational.sales_kit_assets, relationshipMemory]);

  async function savePreparedOutreachDraft() {
    if (!companyRow || !outreachPrep) return;
    try {
      await simpleCrud.create('messages', {
        company_id: company.id,
        company_name: String(companyRow.company_name || company.companyName),
        contact_id: outreachPrep.recipient ? String((outreachPrep.recipient as Record<string, unknown>).id || '') || null : null,
        recipient: outreachPrep.recipient ? String(outreachPrep.recipient.fullName || '') : '',
        subject: outreachPrep.strategy.language === 'ENGLISH' ? `Business introduction — ${String(companyRow.company_name || company.companyName)}` : `تواصل مهني مع ${String(companyRow.company_name || company.companyName)}`,
        body: outreachPrep.generated.body,
        channel: 'Email',
        status: 'Draft',
        message_type: outreachPrep.strategy.messageType,
        message_style: outreachPrep.strategy.messageStyle,
        recommended_attachment_id: outreachPrep.attachment?.id ?? null,
        follow_up_suggestion: outreachPrep.followup.nextAction,
        follow_up_due_at: outreachPrep.followup.dueAt ?? null,
      });
      setPrepareNotice('تم تجهيز المسودة وإرفاق التوصية داخل Company 360 للمراجعة البشرية.');
    } catch (reason) {
      setPrepareNotice(reason instanceof Error ? reason.message : 'تعذر حفظ المسودة المقترحة.');
    }
  }

  return (
    <div className="space-y-4">
      {operationalError ? <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">تعذر تحميل بعض بيانات الشركة: {operationalError}</div> : null}
      {operationalLoading ? <div className="crm-empty animate-pulse">جارٍ تحميل ملف الشركة الكامل...</div> : null}
      <section className="crm-card flex flex-col gap-3 border-r-4 border-r-[#b78d38] p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap gap-2"><span className="crm-chip status-warning">{lifecycle?.stage||'DISCOVER'}</span><span className="crm-chip status-neutral">Qualification {qualification?.score||0}/100 · {qualification?.priority||'C'}</span></div><p className="mt-2 text-xs font-bold text-[#9a742b]">الإجراء الأفضل التالي</p><h3 className="mt-1 text-lg font-bold">{nextBestAction.label}</h3><p className="mt-1 text-sm text-[#75664d]">{nextBestAction.detail}</p><p className="mt-1 text-xs text-[#75664d]">مرحلة الشركة: {lifecycle?.reason}</p></div><Link href={nextBestAction.href} className="btn-primary shrink-0">ابدأ الآن</Link></section>
      {outreachPrep ? <section className="crm-card p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-[#9a742b]">PREPARE OUTREACH</p><h3 className="text-lg font-bold">تجهيز التواصل قبل الإرسال اليدوي</h3><p className="mt-1 text-sm text-[#75664d]">المستلم: {outreachPrep.recipient?.fullName || 'غير محدد'} · الدور: {outreachPrep.strategy.targetRole}</p></div><button onClick={() => void savePreparedOutreachDraft()} className="btn-primary">حفظ Draft</button></div><div className="mt-3 grid gap-3 md:grid-cols-2"><div className="rounded-xl border bg-[#fdf8ee] p-3"><p className="text-xs text-[#75664d]">Personalized Email Preview</p><pre className="mt-2 whitespace-pre-wrap text-sm leading-7">{outreachPrep.generated.body}</pre></div><div className="rounded-xl border bg-[#fdf8ee] p-3 text-sm"><p><b>Recommended Attachment:</b> {String(outreachPrep.attachment?.name || outreachPrep.attachment?.asset_type || 'لا يوجد أصل مطابق')}</p><p className="mt-2"><b>Follow-up Suggestion:</b> {outreachPrep.followup.nextAction}</p><p className="mt-1"><b>Due:</b> <span className="data-ltr">{outreachPrep.followup.dueAt || '—'}</span></p><p className="mt-2 text-xs text-[#75664d]">External sending remains disabled. This action only prepares draft + recommendation.</p></div></div>{prepareNotice ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{prepareNotice}</p> : null}</section> : null}
      <div className="flex gap-1 overflow-x-auto rounded-[18px] border border-[#ead9b3] bg-[#f7efdf] p-1.5">
        {companyTabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${activeTab === tab.id ? 'bg-[#2f2417] text-[#fef8ec] shadow-md' : 'text-[#6f6044] hover:bg-white'}`}>{tab.label}</button>)}
      </div>

      <section className="crm-card p-5"><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5"><div><div className="flex justify-between"><p className="text-xs text-[#6f6044]">Priority</p><span className={`crm-chip ${company.priority === 'A' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'}`}>{company.priority||'C'}</span></div><strong className="mt-2 block text-2xl">أولوية {company.priority||'C'}</strong></div><div><div className="flex justify-between text-xs"><span>Lead Score</span><strong>{v6Intelligence?.leadScore.score ?? company.leadScore ?? 0}/100</strong></div><div className="crm-progress mt-3"><span style={{width:`${v6Intelligence?.leadScore.score ?? company.leadScore ?? 0}%`}} /></div></div><div><div className="flex justify-between text-xs"><span>Opportunity Signal</span><strong>{v6Intelligence?.opportunitySignal.score ?? 0}/100</strong></div><div className="crm-progress mt-3"><span style={{width:`${v6Intelligence?.opportunitySignal.score ?? 0}%`}} /></div></div><div><div className="flex justify-between text-xs"><span>Data Completeness</span><strong>{company.dataCompleteness||0}%</strong></div><div className="crm-progress mt-3"><span style={{width:`${company.dataCompleteness||0}%`}} /></div></div><div><p className="text-xs text-[#6f6044]">Relationship Stage</p><strong className="mt-2 block text-lg">{v6Intelligence?.relationshipStage || 'TARGET'}</strong><p className="mt-1 text-xs text-[#75664d]">{relationshipMemory?.relationshipSummary || 'لا يوجد حدث موثق بعد.'}</p></div></div>{company.scoreReasons?.length?<ul className="mt-4 flex flex-wrap gap-2 text-xs text-[#6f6044]">{company.scoreReasons.map(reason=><li className="crm-chip bg-[#f5ecdc]" key={reason}>+ {reason}</li>)}</ul>:null}{company.nextAction ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><strong>الإجراء التالي:</strong> {company.nextAction}</p> : null}{company.missingFields?.length?<p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">البيانات الناقصة: {company.missingFields.join('، ')}</p>:null}</section>

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

      {activeTab === 'intelligence' ? (
        companyRow ? <OutreachIntelligenceCard company={companyRow} contacts={operational.contacts} drafts={operational.messages} events={operational.communication_events} followups={operational.follow_ups} opportunities={operational.opportunities}/> : <div className="crm-empty">تعذر تجهيز طبقة الذكاء لهذه الشركة.</div>
      ) : activeTab === 'research' ? (
        <CompanyIntelligenceWorkspace company={company} />
      ) : activeTab === 'signals' ? (
        <section className="crm-card p-5"><h3 className="font-bold">Project / Signal Intelligence</h3><div className="mt-4 space-y-3">{operational.signals?.map(item=><article key={item.id} className="rounded-2xl border p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{String(item.title||item.signal_type||'إشارة موثقة')}</strong><span className="crm-chip status-warning">{String(item.opportunity_score||0)}/100</span></div><p className="mt-2 text-sm">{String(item.description||'لا يوجد وصف إضافي')}</p><p className="mt-2 text-xs text-[#75664d]">القسم المستهدف: {String(item.target_role||company.recommendedRole||'يحتاج تحديداً')} · الإجراء: {String(item.next_action||'مراجعة الإشارة')}</p>{item.source_url&&<a href={String(item.source_url)} target="_blank" rel="noreferrer" className="mt-2 block text-xs underline">فتح المصدر الموثق</a>}</article>)}{!operational.signals?.length&&<div className="crm-empty">لا توجد إشارات مشروع موثقة لهذه الشركة حالياً.</div>}</div></section>
      ) : activeTab === 'contacts' ? (
        <section className="crm-card p-5"><h3 className="font-bold">جهات الاتصال</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{contacts.map((contact) => <article key={contact.id} className="rounded-2xl border border-[#ead9b3] bg-[#fdf9f1] p-4"><div className="flex justify-between gap-3"><strong>{contact.fullName}</strong><span className={`crm-chip ${String(contact.verificationStatus).toUpperCase() === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{contact.verificationStatus || 'UNVERIFIED'}</span></div><p className="mt-1 text-sm text-[#75664d]">{contact.department || '—'} · {contact.position || '—'}</p><p className="mt-2 text-xs">هاتف: {contact.phone || '—'} · جوال: {contact.mobile || '—'}</p><p className="mt-1 text-xs">Email: {contact.email || '—'}</p><p className="mt-1 text-xs">LinkedIn: {contact.linkedIn || '—'}</p><p className="mt-2 text-xs text-[#75664d]">المصدر: {contact.source || 'غير موثق'} · الثقة {contact.confidence || 0}% · تاريخ التحقق: {contact.verifiedAt ? contact.verifiedAt.slice(0, 10) : '—'}</p>{contact.sourceUrl ? <a href={contact.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-[#8d6926] underline">فتح المصدر</a> : null}</article>)}{!contacts.length && <div className="crm-empty md:col-span-2">لا توجد جهات اتصال مرتبطة بعد.</div>}</div></section>
      ) : activeTab === 'decisionMakers' ? (
        <section className="crm-card p-5"><div className="flex items-center justify-between"><h3 className="font-bold">صنّاع القرار</h3><span className="crm-chip bg-[#f0e3ca] text-[#6d5125]">{decisionMakers.length} موثق</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{decisionMakers.map((contact) => <article key={contact.id} className="rounded-2xl border border-[#ead9b3] bg-[#fdf9f1] p-4"><strong>{contact.fullName}</strong><p className="mt-1 text-sm text-[#75664d]">{contact.position || contact.department}</p><div className="mt-3 space-y-1 text-xs"><p>{contact.email || 'البريد غير منشور'}</p><p>{contact.mobile || 'الهاتف غير منشور'}</p>{contact.linkedIn && <a className="text-[#8d6926] underline" href={contact.linkedIn} target="_blank" rel="noreferrer">الملف العام</a>}</div></article>)}{!decisionMakers.length && <div className="crm-empty md:col-span-2">لم يُعثر على صانع قرار موثق بعد؛ الحالة محفوظة للبحث اليدوي دون تخمين.</div>}</div></section>
      ) : activeTab === 'vendorRegistration' ? (
        <section className="crm-card p-5"><div className="flex items-center justify-between"><h3 className="font-bold">تسجيل الموردين والمقاولين</h3><span className={`crm-chip ${companyRow?.vendor_registration_url ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{String(companyRow?.vendor_registration_status || (companyRow?.vendor_registration_url ? 'Portal Found' : 'Manual Action Required'))}</span></div><div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-[#fdf9f1] p-4"><p className="text-xs text-[#75664d]">رابط البوابة</p>{companyRow?.vendor_registration_url ? <a className="mt-2 block break-all font-semibold text-[#8d6926] underline" href={String(companyRow.vendor_registration_url)} target="_blank" rel="noreferrer">{String(companyRow.vendor_registration_url)}</a> : <p className="mt-2 font-semibold">غير متوفر بمصدر مؤكد</p>}</div><div className="rounded-2xl bg-[#fdf9f1] p-4"><p className="text-xs text-[#75664d]">آخر تحقق</p><p className="mt-2 font-semibold">{String(companyRow?.vendor_registration_last_checked || companyRow?.verified_at || companyRow?.updated_at || '—')}</p><p className="mt-3 text-xs text-[#75664d]">المصدر: {String(companyRow?.source_url || 'بحث يدوي مطلوب')}</p></div><div className="rounded-2xl bg-[#fdf9f1] p-4"><p className="text-xs text-[#75664d]">المتطلبات</p><p className="mt-2 whitespace-pre-wrap text-sm">{String(companyRow?.vendor_registration_requirements || 'غير موثقة بعد')}</p></div><div className="rounded-2xl bg-[#fdf9f1] p-4"><p className="text-xs text-[#75664d]">الحساب والإجراء التالي</p><p className="mt-2 text-sm">{String(companyRow?.vendor_registration_account_status || 'لا يوجد حساب مسجل')}</p><p className="mt-2 text-sm font-semibold">{String(companyRow?.vendor_registration_next_action || 'مراجعة يدوية عند توفر بوابة رسمية')}</p></div></div>{companyRow?.vendor_registration_notes ? <p className="mt-4 rounded-2xl bg-[#fdf9f1] p-4 text-sm">{String(companyRow.vendor_registration_notes)}</p> : null}</section>
      ) : activeTab === 'outreach' ? (
        <section className="crm-card p-5"><h3 className="font-bold">مسودات التواصل</h3><div className="mt-4 space-y-3">{operational.messages?.map((item) => <article key={item.id} className="rounded-2xl border border-[#ead9b3] bg-[#fdf9f1] p-4"><div className="flex justify-between gap-3"><strong>{String(item.template_name || item.subject || 'مسودة')}</strong><span className="crm-chip bg-amber-100 text-amber-800">{String(item.status || 'Draft')}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{String(item.body || '')}</p></article>)}{!operational.messages?.length && <div className="crm-empty">لا توجد مسودات بعد.</div>}</div></section>
      ) : activeTab === 'relationship' ? (
        <section className="crm-card p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">ذاكرة العلاقة</h3><p className="mt-1 text-sm text-[#75664d]">{relationshipMemory?.relationshipSummary}</p></div><span className="crm-chip status-neutral">{relationshipMemory?.relationshipStatus || 'TARGET'}</span></div><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-[#f8f1e4] p-3"><p className="text-xs text-[#75664d]">آخر حدث مهم</p><strong>{relationshipMemory?.lastMeaningfulEvent?.kind || 'لا يوجد'}</strong><p className="data-ltr text-xs">{relationshipMemory?.lastMeaningfulEvent?.at || '—'}</p></div><div className="rounded-xl bg-[#f8f1e4] p-3"><p className="text-xs text-[#75664d]">آخر تواصل صادر</p><strong className="data-ltr">{relationshipMemory?.lastOutboundAt || '—'}</strong></div><div className="rounded-xl bg-[#f8f1e4] p-3"><p className="text-xs text-[#75664d]">آخر رد</p><strong className="data-ltr">{relationshipMemory?.lastReplyAt || '—'}</strong></div></div><div className="mt-4 space-y-2">{relationshipMemory?.timeline.slice(0,25).map(item=><article key={`${item.kind}-${item.id}`} className="border-r-2 border-[#b78d38] bg-[#fdf9f1] p-3 text-sm"><div className="flex justify-between gap-2"><strong>{item.kind}</strong><span className="data-ltr text-xs text-[#75664d]">{item.at}</span></div><p className="mt-1">{item.summary || 'حدث محفوظ دون وصف إضافي'}</p>{item.evidence&&<p className="mt-1 break-all text-xs text-[#75664d]">Evidence: {item.evidence}</p>}</article>)}{!relationshipMemory?.timeline.length&&<div className="crm-empty">لا توجد أحداث علاقة موثقة بعد.</div>}</div></section>
      ) : activeTab === 'network' ? (
        <section className="crm-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Network Intelligence</h3><p className="mt-1 text-sm text-[#75664d]">علاقات محفوظة بأدلة فقط؛ أي سجل غير مكتمل يبقى AI SUGGESTION — NOT VERIFIED.</p></div><div className="flex gap-2"><select value={networkType} onChange={event=>setNetworkType(event.target.value)} className="rounded border p-2 text-sm"><option value="">كل العلاقات</option>{['Owner','Developer','Consultant','Main Contractor','Subcontractor','Supplier','Partner'].map(type=><option key={type}>{type}</option>)}</select><select value={networkStatus} onChange={event=>setNetworkStatus(event.target.value)} className="rounded border p-2 text-sm"><option value="">كل حالات التحقق</option>{['VERIFIED','UNVERIFIED','REJECTED'].map(status=><option key={status}>{status}</option>)}</select></div></div><div className="mt-4 space-y-3">{networkRelationships.map(item=>{const sourceName=networkCompanyName(item.source_company_id);const targetName=networkCompanyName(item.target_company_id);const isVerified=String(item.status)==='VERIFIED';return <article key={item.id} className="rounded-2xl border border-[#ead9b3] bg-[#fdf9f1] p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{sourceName} → {targetName}</strong><span className={`crm-chip ${isVerified?'status-success':'status-warning'}`}>{isVerified?'VERIFIED':'AI SUGGESTION — NOT VERIFIED'}</span></div><p className="mt-2 text-sm">{String(item.relationship_type||'Relationship')} · Confidence {String(item.confidence||0)}%</p><p className="mt-2 text-sm">Project / Opportunity: {String(item.project_reference||item.opportunity_id||'غير مرتبط')}</p><p className="mt-2 whitespace-pre-wrap text-sm">Evidence: {String(item.evidence||'لا يوجد دليل كافٍ؛ لا يعامل كحقيقة.')}</p>{item.source_url?<a href={String(item.source_url)} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-[#8d6926] underline">فتح المصدر</a>:null}<p className="mt-2 text-xs text-[#75664d]">Verified at: {String(item.verified_at||'—')}</p></article>})}{!networkRelationships.length&&<div className="crm-empty">لا توجد علاقات موثقة أو مقترحة لهذه الشركة. لا يتم إنشاء علاقة من دون دليل.</div>}</div></section>
      ) : activeTab === 'pipeline' ? (
        <section className="space-y-3"><div className="crm-card p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">Deal Coach</h3><p className="mt-1 text-sm text-[#75664d]">{coach?.currentSituation}</p></div><span className={`crm-chip ${coach?.relationshipHealth.health === 'HEALTHY' ? 'status-success' : coach?.relationshipHealth.health === 'AT_RISK' ? 'status-danger' : 'status-warning'}`}>{coach?.relationshipHealth.health || 'NEEDS_ACTION'}</span></div><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-[#f8f1e4] p-3"><p className="text-xs text-[#75664d]">الخطوة الموصى بها</p><strong>{coach?.recommendedNextStep.code}</strong><p className="mt-1 text-xs">{coach?.recommendedNextStep.reason}</p></div><div className="rounded-xl bg-[#f8f1e4] p-3"><p className="text-xs text-[#75664d]">المعلومات الناقصة</p><strong>{coach?.missingInformation.join('، ') || 'لا توجد'}</strong></div><div className="rounded-xl bg-[#f8f1e4] p-3"><p className="text-xs text-[#75664d]">المخاطر</p><strong>{coach?.risks.join('، ') || 'لا توجد مخاطر موثقة'}</strong></div></div></div><div className="grid gap-3 lg:grid-cols-2"><section className="crm-card p-5"><h3 className="font-bold">الفرص</h3><div className="mt-3 space-y-2">{operational.opportunities?.map(item=><article key={item.id} className="rounded-xl border p-3"><div className="flex justify-between"><strong>{String(item.title || 'فرصة')}</strong><span className="crm-chip status-neutral">{String(item.stage || '')}</span></div><p className="mt-2 text-sm">{String(item.next_action || 'لا توجد خطوة تالية')}</p></article>)}{!operational.opportunities?.length&&<div className="crm-empty">لا توجد فرصة موثقة بعد.</div>}</div></section><section className="crm-card p-5"><h3 className="font-bold">الموردون والاجتماعات</h3><p className="mt-3 text-sm">حالة التسجيل: <b>{String(companyRow?.vendor_registration_status || 'Not Checked')}</b></p><p className="mt-2 text-sm">الاجتماعات المحفوظة: <b>{operational.meetings?.length || 0}</b></p><Link href={`/vendor-registration?company_id=${company.id}`} className="btn-ghost mt-3">فتح مسار الموردين</Link></section></div></section>
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
