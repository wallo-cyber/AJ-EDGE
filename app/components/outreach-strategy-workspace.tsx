'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { isVerifiedDecisionMaker } from '../lib/domain/business';
import { businessAngle, MESSAGE_STYLES, MESSAGE_TYPES, type MessageStyle, type MessageType } from '../lib/intelligence/core';
import { conversationStrategy, evaluateMessageQuality, generateProfessionalMessage, type ConversationObjective, type ConversationStrategy } from '../lib/intelligence/v6';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

const safe = (value: unknown) => String(value ?? '').trim();
const styleLabels: Record<MessageStyle, string> = { DIRECT:'مباشرة', RELATIONSHIP:'بناء علاقة', OPPORTUNITY_LED:'مرتبطة بفرصة' };
type UiChannel = 'Email' | 'LinkedIn' | 'WhatsApp' | 'Call';

function objectiveFor(value: MessageType): ConversationObjective {
  if (value === 'VENDOR_REGISTRATION') return 'VENDOR_REGISTRATION';
  if (value === 'SUBCONTRACTING') return 'SUBCONTRACTING';
  if (value === 'MEETING_REQUEST') return 'MEETING_REQUEST';
  if (value === 'RFQ_FOLLOW_UP') return 'RFQ_RESPONSE_PREP';
  if (value.startsWith('FOLLOW_UP') || value === 'FINAL_FOLLOW_UP') return 'FOLLOW_UP';
  if (value === 'PROJECT_OPPORTUNITY') return 'PROJECT_DISCUSSION';
  if (value === 'INDUSTRIAL_SERVICES') return 'INDUSTRIAL_SUPPORT';
  return 'INTRODUCTION';
}

function providerChannel(value: UiChannel): ConversationStrategy['channel'] {
  return value === 'Email' ? 'EMAIL' : value === 'LinkedIn' ? 'LINKEDIN' : value === 'WhatsApp' ? 'WHATSAPP' : 'CALL_SCRIPT';
}

export function OutreachStrategyWorkspace({ companies, contacts, messages, onSaved }: { companies:SimpleRow[]; contacts:SimpleRow[]; messages:SimpleRow[]; onSaved:()=>Promise<void> }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SimpleRow | null>(null);
  const [language, setLanguage] = useState<'ARABIC' | 'ENGLISH'>('ARABIC');
  const [style, setStyle] = useState<MessageStyle>('DIRECT');
  const [kind, setKind] = useState<MessageType>('INITIAL_INTRODUCTION');
  const [channel, setChannel] = useState<UiChannel>('Email');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const rows = useMemo(() => companies
    .filter(company => !company.archived_at && (!query || `${safe(company.company_name)} ${safe(company.sector)} ${safe(company.target_segment)}`.toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => safe(a.priority).localeCompare(safe(b.priority)) || Number(b.lead_score ?? 0) - Number(a.lead_score ?? 0)), [companies, query]);
  const visible = rows.slice((page - 1) * 20, page * 20);
  const pages = Math.max(1, Math.ceil(rows.length / 20));

  const verifiedContact = (company: SimpleRow) => contacts.find(contact => contact.company_id === company.id && isVerifiedDecisionMaker(contact));
  const strategyFor = (company: SimpleRow, nextLanguage = language, nextStyle = style, nextKind = kind, nextChannel = channel) => {
    const base = conversationStrategy({ company, contacts, events:[], language:nextLanguage, channel:providerChannel(nextChannel), objective:objectiveFor(nextKind) });
    return { ...base, messageStyle:nextStyle, messageType:nextKind };
  };
  const generatedFor = (company: SimpleRow, nextLanguage = language, nextStyle = style, nextKind = kind, nextChannel = channel) => {
    const contact = verifiedContact(company);
    return generateProfessionalMessage({
      strategy:strategyFor(company, nextLanguage, nextStyle, nextKind, nextChannel),
      companyName:safe(company.company_name),
      recipientName:safe(contact?.full_name || contact?.name),
      verifiedRecipient:Boolean(contact),
      evidence:contact ? [{ label:'Decision maker', value:safe(contact.full_name || contact.name), source:safe(contact.source_url || contact.source) }] : [],
    });
  };
  const open = (company: SimpleRow) => {
    const intelligence = businessAngle(company);
    const nextLanguage = safe(company.recommended_language) === 'ENGLISH' ? 'ENGLISH' : 'ARABIC';
    setSelected(company); setLanguage(nextLanguage); setStyle(intelligence.style); setKind(intelligence.type); setChannel('Email');
    setBody(generatedFor(company, nextLanguage, intelligence.style, intelligence.type, 'Email').body); setError('');
  };

  const selectedStrategy = selected ? strategyFor(selected) : null;
  const selectedContact = selected ? verifiedContact(selected) : undefined;
  const personalization = selected ? generatedFor(selected).personalizationLevel : 0;
  const quality = selected && selectedStrategy ? evaluateMessageQuality({
    body, companyName:safe(selected.company_name), businessAngle:selectedStrategy.businessAngle, channel:selectedStrategy.channel,
    personalizationLevel:personalization, relationshipAware:selectedStrategy.relationshipStage !== 'TARGET',
    evidenceSafe:!body.match(/مشروع حالي|مشروع قائم|current project|awarded project/i), existingDrafts:messages.map(message => safe(message.body)),
  }) : null;

  const save = async () => {
    if (!selected || !quality || !selectedStrategy) return;
    if (messages.length && !Object.hasOwn(messages[0], 'quality_score')) { setError('تخزين V6 غير مفعّل بعد؛ يجب تطبيق migration الإضافية الآمنة أولاً.'); return; }
    try {
      const strategyRow = await simpleCrud.create('conversation_strategies', {
        company_id:selected.id, contact_id:selectedContact?.id ?? null, objective:selectedStrategy.objective,
        target_segment:selectedStrategy.targetSegment, target_role:selectedStrategy.targetRole, relationship_stage:selectedStrategy.relationshipStage,
        business_angle:selectedStrategy.businessAngle, message_type:kind, message_style:style, language, channel:selectedStrategy.channel,
        cta:selectedStrategy.cta, risk:selectedStrategy.risk, context_summary:selectedStrategy.contextSummary, status:'DRAFT',
      });
      await simpleCrud.create('messages', {
        company_id:selected.id, company_name:safe(selected.company_name), contact_id:selectedContact?.id ?? null, strategy_id:strategyRow.id,
        recipient:safe(selectedContact?.full_name || selectedContact?.name), channel,
        subject:language === 'ARABIC' ? `تواصل مهني مع ${safe(selected.company_name)}` : `Business introduction — ${safe(selected.company_name)}`,
        body, status:'Draft', draft_classification:selectedContact ? 'PERSONALIZED' : 'PREPARATION', language, message_type:kind, message_style:style,
        quality_score:quality.score, quality_status:quality.status, quality_issues:quality.warnings, quality_breakdown:quality.dimensions,
        duplicate_similarity:quality.duplicateSimilarity, duplicate_warning:quality.warnings.find(item => item.includes('GENERIC_PATTERN')) || '',
        personalization_level:personalization, relationship_context_summary:selectedStrategy.contextSummary,
      });
      setSelected(null);
      await onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ الاستراتيجية والمسودة.'); }
  };

  return <section className="space-y-3">
    <div className="crm-card flex gap-2 p-3"><input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="ابحث بالشركة أو القطاع أو الفئة" className="w-full rounded-xl border p-2"/><span className="crm-chip status-neutral">{rows.length}</span></div>
    <div className="grid gap-3 md:grid-cols-2">{visible.map(company => { const intelligence=businessAngle(company), contact=verifiedContact(company); return <article key={company.id} className="crm-card p-4"><div className="flex justify-between gap-2"><div><Link href={`/companies/${company.id}`} className="font-bold">{safe(company.company_name)}</Link><p className="text-xs text-[#75664d]">{intelligence.segment} · أولوية {safe(company.priority) || 'C'}</p></div><span className={`crm-chip ${contact ? 'status-success' : 'status-warning'}`}>{contact ? 'جهة موثقة' : 'الشخص مفقود'}</span></div><p className="mt-3 text-sm"><b>الزاوية:</b> {safe(company.business_angle) || intelligence.angle}</p><p className="text-sm"><b>الدور:</b> {safe(company.recommended_role) || intelligence.role}</p><div className="mt-3 flex gap-2"><button onClick={() => open(company)} className="btn-primary">إعداد مسودة</button><Link href={`/research?tab=manual&company_id=${company.id}`} className="btn-ghost">بحث</Link></div></article>; })}</div>
    <div className="flex justify-between text-sm"><span>صفحة {page} من {pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="btn-ghost">السابق</button><button disabled={page >= pages} onClick={() => setPage(value => value + 1)} className="btn-ghost">التالي</button></div></div>

    {selected && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-3"><div className="max-h-[94vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5"><div className="flex justify-between"><div><h3 className="font-bold">محرر الرسالة — {safe(selected.company_name)}</h3><p className="text-xs text-[#75664d]">مسودة فقط؛ الإرسال الخارجي معطّل ومستوى الأتمتة 0.</p></div><button onClick={() => setSelected(null)} className="btn-ghost">إغلاق</button></div>
      {selectedStrategy && <div className="mt-3 grid gap-2 rounded-xl bg-[#f8f1e4] p-3 text-xs sm:grid-cols-3"><span><b>الهدف:</b> {selectedStrategy.objective}</span><span><b>الدور:</b> {selectedStrategy.targetRole}</span><span><b>مرحلة العلاقة:</b> {selectedStrategy.relationshipStage}</span><span className="sm:col-span-3"><b>السياق:</b> {selectedStrategy.contextSummary}</span></div>}
      <div className="mt-4 grid gap-2 sm:grid-cols-4"><select value={language} onChange={event => setLanguage(event.target.value as typeof language)} className="rounded-xl border p-2"><option value="ARABIC">العربية</option><option value="ENGLISH">English</option></select><select value={kind} onChange={event => setKind(event.target.value as MessageType)} className="rounded-xl border p-2">{MESSAGE_TYPES.map(value => <option key={value}>{value}</option>)}</select><select value={style} onChange={event => setStyle(event.target.value as MessageStyle)} className="rounded-xl border p-2">{MESSAGE_STYLES.map(value => <option key={value} value={value}>{styleLabels[value]}</option>)}</select><select value={channel} onChange={event => setChannel(event.target.value as UiChannel)} className="rounded-xl border p-2"><option>Email</option><option>LinkedIn</option><option>WhatsApp</option><option>Call</option></select></div>
      <button onClick={() => setBody(generatedFor(selected).body)} className="btn-secondary mt-3">إعادة الصياغة</button><textarea value={body} onChange={event => setBody(event.target.value)} dir={language === 'ENGLISH' ? 'ltr' : 'rtl'} className="mt-3 min-h-56 w-full rounded-xl border p-4 leading-7"/>
      <div className="mt-3 flex flex-wrap items-center gap-2">{quality && <><span className={`crm-chip ${quality.score >= 78 ? 'status-success' : quality.score >= 65 ? 'status-warning' : 'status-danger'}`}>الجودة {quality.score}/100</span><span className="crm-chip status-neutral">التخصيص Level {personalization}</span>{quality.duplicateSimilarity >= 82 && <span className="crm-chip status-danger">تشابه {quality.duplicateSimilarity}%</span>}<span className="text-xs">{quality.warnings.join('، ') || 'صياغة مخصصة وآمنة'}</span></>}<button onClick={() => void navigator.clipboard.writeText(body)} className="btn-ghost mr-auto">نسخ</button><button onClick={() => void save()} className="btn-primary">حفظ للمراجعة</button></div>
      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div></div>}
  </section>;
}
