'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';

const today = new Date().toISOString().slice(0, 10);
const safe = (value: unknown) => String(value ?? '').trim();
const isClosed = (value: unknown) => ['Completed', 'Cancelled', 'مكتملة', 'ملغاة'].includes(safe(value));

export default function DashboardPage() {
  const [data, setData] = useState<Record<string, SimpleRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const tables = ['companies', 'contacts', 'follow_ups', 'opportunities', 'meetings', 'messages', 'quotations', 'contracts', 'agent_jobs', 'agent_settings', 'audit_events'];
    void Promise.all(tables.map(async (table) => [table, await simpleCrud.list(table)] as const))
      .then((rows) => setData(Object.fromEntries(rows)))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const companies = useMemo(() => data.companies ?? [], [data.companies]);
  const contacts = data.contacts ?? [];
  const followUps = data.follow_ups ?? [];
  const opportunities = data.opportunities ?? [];
  const meetings = data.meetings ?? [];
  const messages = data.messages ?? [];
  const quotations = data.quotations ?? [];
  const agentJobs = data.agent_jobs ?? [];
  const agentSettings = data.agent_settings ?? [];
  const auditEvents = data.audit_events ?? [];

  const ready = companies.filter((company) => ['A', 'B'].includes(safe(company.priority)) && Boolean(company.general_email || company.email || company.general_phone || company.phone || contacts.some((contact) => contact.company_id === company.id)));
  const contacted = companies.filter((company) => company.outreach_status === 'Contacted' || safe(company.last_contact));
  const replied = companies.filter((company) => safe(company.last_outcome) && safe(company.last_outcome) !== 'No Response');
  const qualified = companies.filter((company) => ['Target', 'Potential'].includes(safe(company.qualification_status)) || ['A', 'B'].includes(safe(company.priority)));
  const openOpportunities = opportunities.filter((item) => !['Won', 'Lost'].includes(safe(item.stage)));
  const rfqs = opportunities.filter((item) => /RFQ|Request Received/i.test(safe(item.stage)));
  const proposals = quotations.filter((item) => !['Rejected', 'Expired', 'مرفوض', 'منتهي'].includes(safe(item.status)));
  const due = followUps.filter((item) => safe(item.date || item.due_date) === today && !isClosed(item.status));
  const overdue = followUps.filter((item) => safe(item.date || item.due_date) < today && !isClosed(item.status));

  const metrics = [
    ['إجمالي الشركات', companies.length, '/companies'], ['Priority A', companies.filter((item) => item.priority === 'A').length, '/companies'],
    ['Priority B', companies.filter((item) => item.priority === 'B').length, '/companies'], ['Priority C', companies.filter((item) => item.priority === 'C').length, '/companies'],
    ['جاهزة للتواصل', ready.length, '/ready-outreach'], ['تحتاج بحثاً', agentJobs.filter((item) => item.status === 'manual_research_required').length, '/enrichment'],
    ['صنّاع القرار', contacts.filter((item) => item.contact_classification === 'Decision Maker').length, '/contacts'], ['بوابات الموردين', companies.filter((item) => safe(item.vendor_registration_url)).length, '/enrichment'],
    ['تم التواصل', contacted.length, '/ready-outreach'], ['متابعات اليوم', due.length, '/follow-ups'], ['متأخرة', overdue.length, '/follow-ups'], ['ردود', replied.length, '/ready-outreach'],
    ['اجتماعات', meetings.length, '/meetings'], ['فرص مفتوحة', openOpportunities.length, '/opportunities'], ['RFQs', rfqs.length, '/opportunities'], ['عروض', proposals.length, '/quotations'],
    ['فوز', opportunities.filter((item) => item.stage === 'Won').length, '/opportunities'], ['خسارة', opportunities.filter((item) => item.stage === 'Lost').length, '/opportunities'],
  ] as const;

  const top = useMemo(() => [...companies].sort((a, b) => Number(b.lead_score ?? 0) - Number(a.lead_score ?? 0)).slice(0, 10), [companies]);
  const todaysPriorities = top.filter((company) => company.priority === 'A' && !safe(company.last_contact)).slice(0, 5);
  const upcoming = [...followUps].filter((item) => safe(item.date || item.due_date) >= today && !isClosed(item.status)).sort((a, b) => safe(a.date || a.due_date).localeCompare(safe(b.date || b.due_date))).slice(0, 5);
  const recent = auditEvents.slice(0, 6);
  const funnel = [['Companies', companies.length], ['Qualified', qualified.length], ['Ready', ready.length], ['Contacted', contacted.length], ['Replied', replied.length], ['Meeting', meetings.length], ['Opportunity', opportunities.length], ['RFQ', rfqs.length], ['Proposal', proposals.length], ['Won', opportunities.filter((item) => item.stage === 'Won').length]] as const;
  const activeInternal = agentSettings.filter((item) => !item.paused && ['Supervisor', 'Qualification', 'Outreach Draft', 'Follow-up', 'Opportunity', 'Daily Planner'].includes(safe(item.agent_name))).length;

  return <CRMPage title="لوحة القيادة التنفيذية" description="لوحة قرار يومية من بيانات Supabase الحقيقية فقط.">
    {error ? <p className="rounded-xl bg-red-50 p-3 text-red-700">تعذر تحميل لوحة القيادة: {error}</p> : null}
    {loading ? <div className="crm-empty animate-pulse">جارٍ تحميل المؤشرات...</div> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{metrics.map(([label, metric, href], index) => <Link href={href} key={label} className="crm-kpi transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><p className="text-xs font-semibold text-[#75664d]">{label}</p><span className="text-[#b38b3c]">{['◆','◈','◷','!'][index % 4]}</span></div><p className="mt-3 text-3xl font-bold">{metric}</p></Link>)}</div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <section className="crm-card overflow-hidden"><div className="flex items-center justify-between border-b border-[#eadfc9] bg-[#faf5eb] p-4"><h3 className="font-bold">أفضل الشركات المستهدفة</h3><span className="crm-chip bg-[#f0e3ca] text-[#6d5125]">Top 10</span></div><div className="divide-y divide-[#eee3cd]">{top.map((company, index) => { const score = Math.max(0, Math.min(100, Number(company.lead_score ?? 0))); return <Link href={`/companies/${company.id}`} key={company.id} className="grid gap-3 p-4 hover:bg-[#fdf9f1] sm:grid-cols-[32px_1fr_150px] sm:items-center"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5ecdc] text-xs font-bold">{index + 1}</span><div className="min-w-0"><p className="truncate font-semibold">{safe(company.company_name)}</p><p className="mt-1 text-xs text-[#75664d]">{safe(company.city)} · {safe(company.company_type)}</p></div><div><div className="mb-1 flex justify-between text-xs"><span className={`crm-chip ${company.priority === 'A' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'}`}>Priority {safe(company.priority)}</span><strong>{score}/100</strong></div><div className="crm-progress"><span style={{ width: `${score}%` }} /></div></div></Link>; })}</div></section>
        <section className="crm-card p-4"><h3 className="font-bold">Conversion Funnel</h3><div className="mt-4 space-y-3">{funnel.map(([label, count], index) => <div key={label}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><strong>{count}</strong></div><div className="crm-progress"><span style={{ width: `${companies.length ? Math.max(count ? 3 : 0, Number(count) / companies.length * 100) : 0}%`, opacity: 1 - index * .05 }} /></div></div>)}</div><Link href="/agent-center" className="mt-5 block rounded-2xl bg-[#f8f1e4] p-4"><p className="text-xs text-[#75664d]">الوكلاء الداخليون النشطون</p><strong className="mt-1 block text-2xl">{activeInternal}/6</strong></Link></section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="crm-card p-4"><h3 className="font-bold">أولويات اليوم</h3><div className="mt-3 space-y-2">{todaysPriorities.map((company) => <Link href={`/companies/${company.id}`} key={company.id} className="block rounded-xl bg-[#fdf9f1] p-3"><strong>{safe(company.company_name)}</strong><p className="mt-1 text-xs text-[#75664d]">{safe(company.next_action) || 'مراجعة المسودة وخطوة التواصل التالية'}</p></Link>)}{!todaysPriorities.length && <div className="crm-empty">لا توجد أولويات A غير متواصَل معها.</div>}</div></section>
        <section className="crm-card p-4"><h3 className="font-bold">المتابعات القادمة</h3><div className="mt-3 space-y-2">{upcoming.map((item) => <Link href="/follow-ups" key={item.id} className="flex justify-between gap-3 rounded-xl bg-[#fdf9f1] p-3"><span>{safe(item.company_name || item.subject)}</span><strong className="text-xs">{safe(item.date || item.due_date)}</strong></Link>)}{!upcoming.length && <div className="crm-empty">لا توجد متابعات قادمة.</div>}</div></section>
        <section className="crm-card p-4"><h3 className="font-bold">آخر النشاطات</h3><div className="mt-3 space-y-2">{recent.map((event) => <div key={event.id} className="rounded-xl bg-[#fdf9f1] p-3"><span className="text-xs text-[#9a7b2f]">{safe(event.entity_type)} · {safe(event.action)}</span><p className="mt-1 text-xs text-[#75664d]">{safe(event.created_at).slice(0, 16)}</p></div>)}{!recent.length && <div className="crm-empty">لا يوجد نشاط حديث.</div>}</div></section>
      </div>
      <p className="text-xs text-[#75664d]">المسودات الجاهزة للمراجعة اليدوية: {messages.filter((message) => ['Draft', 'Approved'].includes(safe(message.status))).length} · العقود: {(data.contracts ?? []).length}</p>
    </>}
  </CRMPage>;
}
