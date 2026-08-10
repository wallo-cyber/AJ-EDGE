'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from './crm-shell';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

const outcomes = ['No Response', 'Wrong Contact', 'Requested Company Profile', 'Requested Vendor Registration', 'Requested Call', 'Requested Meeting', 'Requested More Information', 'Follow-up Later', 'RFQ Expected', 'RFQ Received', 'Opportunity Identified', 'Not Interested'];
const safe = (value: unknown) => String(value ?? '').trim();
const addBusinessDays = (count: number) => { const date = new Date(); while (count > 0) { date.setDate(date.getDate() + 1); if (date.getDay() !== 5 && date.getDay() !== 6) count -= 1; } return date.toISOString().slice(0, 10); };
const addCalendarDays = (count: number) => { const date = new Date(); date.setDate(date.getDate() + count); return date.toISOString(); };
const websiteUrl = (value: unknown) => { const url = safe(value); return url ? (url.startsWith('http') ? url : `https://${url}`) : ''; };

export function ReadyOutreachWorkspace() {
  const [companies, setCompanies] = useState<SimpleRow[]>([]);
  const [messages, setMessages] = useState<SimpleRow[]>([]);
  const [contacts, setContacts] = useState<SimpleRow[]>([]);
  const [outcome, setOutcome] = useState('No Response');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => Promise.all([simpleCrud.list('companies'), simpleCrud.list('messages'), simpleCrud.list('contacts')]).then(([a, b, c]) => { setCompanies(a); setMessages(b); setContacts(c); }).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);
  const rows = useMemo(() => companies.filter((company) => ['A', 'B'].includes(safe(company.priority)) && (company.general_email || company.email || company.general_phone || company.phone || contacts.some((contact) => contact.company_id === company.id))).map((company) => ({ company, drafts: messages.filter((message) => message.company_id === company.id && ['Draft', 'Approved'].includes(safe(message.status))), contact: contacts.find((contact) => contact.company_id === company.id) })).filter((item) => item.drafts.length).sort((a, b) => safe(a.company.priority).localeCompare(safe(b.company.priority)) || Number(b.company.lead_score ?? 0) - Number(a.company.lead_score ?? 0)), [companies, messages, contacts]);

  const markContacted = async (item: (typeof rows)[number], draft: SimpleRow) => {
    if (safe(draft.status) !== 'Approved') { setNotice('اعتمد المسودة أولاً قبل تسجيل التواصل.'); return; }
    const now = new Date().toISOString();
    await simpleCrud.update('messages', draft.id, { status: 'Contacted', sent_at: now, outcome, contact_id: item.contact?.id ?? null });
    const stopped = outcome === 'Not Interested';
    await simpleCrud.update('companies', item.company.id, { last_contact: now.slice(0, 10), outreach_status: stopped ? 'Stopped' : 'Contacted', last_outcome: outcome, next_follow_up: stopped ? null : addBusinessDays(outcome === 'No Response' ? 3 : 5), nurture_until: stopped ? addBusinessDays(90) : null });
    if (['No Response', 'Follow-up Later', 'Requested Company Profile', 'Requested More Information', 'Requested Call', 'Requested Vendor Registration'].includes(outcome)) await simpleCrud.create('follow_ups', { company_id: item.company.id, company_name: safe(item.company.company_name), contact_id: item.contact?.id ?? null, contact_person: safe(item.contact?.full_name || item.contact?.name), follow_up_type: outcome === 'Requested Call' ? 'Call' : 'Email', date: addBusinessDays(outcome === 'No Response' ? 3 : 5), time: '09:00', priority: safe(item.company.priority) === 'A' ? 'High' : 'Medium', status: 'Pending', subject: outcome === 'Requested Vendor Registration' ? 'التسجيل كمورد/مقاول' : `متابعة: ${outcome}`, next_action: outcome === 'Requested Vendor Registration' ? 'فتح رابط التسجيل واستكمال المتطلبات' : 'Follow-up', outcome });
    if (outcome === 'Requested Vendor Registration') await simpleCrud.update('companies', item.company.id, { vendor_registration_status: 'Available' });
    if (['RFQ Received', 'Opportunity Identified', 'RFQ Expected'].includes(outcome)) await simpleCrud.create('opportunities', { company_id: item.company.id, company_name: safe(item.company.company_name), contact_id: item.contact?.id ?? null, title: `${outcome} - ${safe(item.company.company_name)}`, opportunity_type: 'Other', stage: outcome === 'RFQ Received' ? 'RFQ Received' : 'Identified', probability: outcome === 'RFQ Received' ? 50 : 20, next_action: 'التواصل لتحديد المتطلبات', next_action_date: addBusinessDays(2), source: 'Outreach' });
    if (outcome === 'Requested Meeting') await simpleCrud.create('meetings', { company_id: item.company.id, company_name: safe(item.company.company_name), contact_id: item.contact?.id ?? null, contact_person: safe(item.contact?.full_name || item.contact?.name), title: `اجتماع تعارف - ${safe(item.company.company_name)}`, purpose: 'تعارف وبحث فرص التعاون', meeting_date: addCalendarDays(3), status: 'Requested', next_action: 'تأكيد موعد الاجتماع' });
    if (outcome === 'Wrong Contact') await simpleCrud.update('companies', item.company.id, { verification_status: 'Needs Verification', data_quality_status: 'Needs Enrichment' });
    setNotice(`تم تسجيل التواصل والنتيجة مع ${safe(item.company.company_name)}.`); await load();
  };

  return <CRMPage title="جاهز للتواصل" description="مراجعة واعتماد ونسخ يدوي فقط؛ لا يوجد إرسال جماعي أو تلقائي.">
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-[#fdf8ee] p-3"><label className="text-sm">نتيجة التواصل:</label><select value={outcome} onChange={(event) => setOutcome(event.target.value)} className="rounded-lg border bg-white p-2">{outcomes.map((value) => <option key={value}>{value}</option>)}</select></div>
    {notice && <p className="rounded-xl bg-emerald-50 p-3 text-emerald-700">{notice}</p>}
    {loading ? <p className="p-8 text-center">جارٍ التحميل...</p> : <div className="grid gap-3">{rows.slice(0, 30).map((item) => { const draft = item.drafts[0]; const linkedIn = safe(item.contact?.linked_in || item.contact?.linkedin || item.company.linkedin_company || item.company.linked_in || item.company.linkedin); const site = websiteUrl(item.company.website); const phone = safe(item.contact?.mobile || item.contact?.phone || item.company.general_phone || item.company.phone); return <article key={item.company.id} className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{safe(item.company.company_name)}</h3><p className="text-xs">{safe(item.company.company_type)} · Priority {safe(item.company.priority)} · {safe(item.company.lead_score)}/100 · {safe(item.contact?.full_name || item.contact?.name || 'Decision Maker Needed')}</p><p className="text-xs text-[#6f6044]">{safe(item.contact?.position || item.contact?.decision_role)} · {safe(draft.channel)} · Vendor: {safe(item.company.vendor_registration_status || 'Not Checked')}</p></div><span className="rounded-full bg-[#f8efe0] px-3 py-1 text-xs">{safe(draft.status)}</span></div><textarea defaultValue={safe(draft.body)} onBlur={(event) => void simpleCrud.update('messages', draft.id, { body: event.target.value })} className="mt-3 min-h-32 w-full rounded-xl border p-3 text-sm"/><div className="mt-2 flex flex-wrap gap-2 text-xs"><button onClick={() => void navigator.clipboard.writeText(safe(draft.body)).then(() => setNotice('تم نسخ المسودة.'))} className="rounded-full border px-3 py-2">نسخ المسودة</button>{site && <a href={site} target="_blank" rel="noreferrer" className="rounded-full border px-3 py-2">الموقع</a>}{linkedIn && <a href={websiteUrl(linkedIn)} target="_blank" rel="noreferrer" className="rounded-full border px-3 py-2">LinkedIn</a>}{phone && <a href={`tel:${phone}`} className="rounded-full border px-3 py-2">اتصال</a>}<Link href={`/companies/${item.company.id}`} className="rounded-full border px-3 py-2">فتح الشركة</Link><button onClick={() => void simpleCrud.update('messages', draft.id, { status: 'Approved', approved_at: new Date().toISOString() }).then(load)} className="rounded-full border px-3 py-2">اعتماد المسودة</button><button onClick={() => void markContacted(item, draft)} className="rounded-full bg-[#2f2417] px-3 py-2 text-white">Mark Contacted</button><button onClick={() => void simpleCrud.update('messages', draft.id, { status: 'Skipped' }).then(load)} className="rounded-full border px-3 py-2">تخطي اليوم</button><Link href={`/enrichment`} className="rounded-full border px-3 py-2">بحث إضافي</Link></div></article>; })}{rows.length === 0 && <p className="p-8 text-center">لا توجد شركات جاهزة حالياً.</p>}</div>}
  </CRMPage>;
}
