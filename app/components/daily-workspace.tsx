'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from './crm-shell';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

const today = new Date().toISOString().slice(0, 10);
const safe = (value: unknown) => String(value ?? '').trim();
const hasTavilyResult = (row: SimpleRow) => Boolean(row.data && typeof row.data === 'object' && 'tavily' in row.data);
const external = (value: unknown) => { const url = safe(value); return url ? (url.startsWith('http') ? url : `https://${url}`) : ''; };
type DailyTask = { id: string; label: string; rank: number; href: string; company?: SimpleRow; followUp?: SimpleRow; draft?: SimpleRow; reason: string; assignedAgent: string; dueDate?: string };

export function DailyWorkspace() {
  const [data, setData] = useState<Record<string, SimpleRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dismissed, setDismissed] = useState<string[]>([]);
  const load = () => Promise.all(['companies', 'company_discovery', 'contacts', 'follow_ups', 'opportunities', 'messages', 'user_settings', 'company_intelligence', 'agent_jobs'].map(async (table) => [table, await simpleCrud.list(table)] as const)).then((rows) => setData(Object.fromEntries(rows))).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);
  const companies = useMemo(() => data.companies ?? [], [data.companies]);
  const followUps = useMemo(() => data.follow_ups ?? [], [data.follow_ups]);
  const opportunities = useMemo(() => data.opportunities ?? [], [data.opportunities]);
  const contacts = useMemo(() => data.contacts ?? [], [data.contacts]);
  const messages = useMemo(() => data.messages ?? [], [data.messages]);
  const discovery = useMemo(() => data.company_discovery ?? [], [data.company_discovery]);
  const intelligence = useMemo(() => data.company_intelligence ?? [], [data.company_intelligence]);
  const agentJobs = useMemo(() => data.agent_jobs ?? [], [data.agent_jobs]);
  const settings = data.user_settings?.[0];
  const outreachLimit = Number(settings?.daily_outreach_limit || 10), followUpLimit = Number(settings?.daily_follow_up_limit || 15);
  const tasks = useMemo(() => {
    const list: DailyTask[] = [];
    const companyById = (id: unknown) => companies.find((company) => company.id === id);
    const draftFor = (id: unknown) => messages.find((message) => message.company_id === id && ['Draft', 'Approved'].includes(safe(message.status)) && message.template_name === 'Initial Email') ?? messages.find((message) => message.company_id === id && ['Draft', 'Approved'].includes(safe(message.status)));
    const hasOpenFollowUp = (companyId: unknown) => followUps.some((item) => item.company_id === companyId && !['Completed', 'Cancelled', 'مكتملة', 'ملغاة'].includes(safe(item.status)));
    const addFollowUp = (item: SimpleRow, rank: number, prefix: string) => list.push({ id: `follow-${item.id}`, label: `${prefix}: ${safe(item.company_name || item.subject)}`, rank, href: '/follow-ups', followUp: item, company: companyById(item.company_id), reason: prefix, assignedAgent: 'Follow-up', dueDate: safe(item.date || item.due_date) });
    followUps.filter((item) => safe(item.date || item.due_date) < today && !['Completed', 'Cancelled'].includes(safe(item.status))).slice(0, followUpLimit).forEach((item) => addFollowUp(item, 1, 'متابعة متأخرة'));
    followUps.filter((item) => safe(item.date || item.due_date) === today && !['Completed', 'Cancelled'].includes(safe(item.status))).slice(0, followUpLimit).forEach((item) => addFollowUp(item, 2, 'متابعة اليوم'));
    companies.filter((company) => company.last_outcome && !['', 'No Response'].includes(safe(company.last_outcome))).forEach((company) => list.push({ id: `reply-${company.id}`, label: `رد يحتاج إجراء: ${safe(company.company_name)} — ${safe(company.last_outcome)}`, rank: 3, href: '/ready-outreach', company, draft: draftFor(company.id), reason: 'رد حقيقي يحتاج إجراءً تالياً', assignedAgent: 'Opportunity' }));
    const ready = (company: SimpleRow) => Boolean(company.general_email || company.email || company.general_phone || company.phone || contacts.some((contact) => contact.company_id === company.id));
    companies.filter((company) => company.priority === 'A' && ready(company) && !company.last_contact && !hasOpenFollowUp(company.id)).slice(0, outreachLimit).forEach((company) => list.push({ id: `ready-a-${company.id}`, label: `Priority A جاهزة للتواصل: ${safe(company.company_name)}`, rank: 4, href: '/ready-outreach', company, draft: draftFor(company.id), reason: 'ملاءمة عالية وبيانات اتصال متوفرة', assignedAgent: 'Outreach Draft' }));
    companies.filter((company) => company.priority === 'A' && !contacts.some((contact) => contact.company_id === company.id) && !hasOpenFollowUp(company.id)).forEach((company) => list.push({ id: `contact-a-${company.id}`, label: `Priority A تحتاج صانع قرار: ${safe(company.company_name)}`, rank: 5, href: '/enrichment', company, reason: 'لا يوجد صانع قرار موثق', assignedAgent: 'Manual Research' }));
    companies.filter((company) => company.priority === 'B' && ready(company) && !company.last_contact && !hasOpenFollowUp(company.id)).slice(0, outreachLimit).forEach((company) => list.push({ id: `ready-b-${company.id}`, label: `Priority B جاهزة للتواصل: ${safe(company.company_name)}`, rank: 6, href: '/ready-outreach', company, draft: draftFor(company.id), reason: 'شركة مؤهلة وبها قناة تواصل', assignedAgent: 'Outreach Draft' }));
    companies.filter((company) => ['Available', 'Registration Started'].includes(safe(company.vendor_registration_status)) && !hasOpenFollowUp(company.id)).forEach((company) => list.push({ id: `vendor-${company.id}`, label: `التسجيل كمورد/مقاول: ${safe(company.company_name)}`, rank: 7, href: '/enrichment', company, reason: 'بوابة تسجيل موثقة تحتاج إجراءً يدوياً', assignedAgent: 'Daily Planner' }));
    opportunities.filter((item) => !['Won', 'Lost'].includes(safe(item.stage)) && (!item.next_action || !item.next_action_date || safe(item.next_action_date) <= today)).forEach((item) => list.push({ id: `opportunity-${item.id}`, label: `إجراء فرصة: ${safe(item.title)}`, rank: 8, href: '/opportunities', company: companyById(item.company_id), reason: 'الإجراء التالي مستحق', assignedAgent: 'Opportunity', dueDate: safe(item.next_action_date) }));
    discovery.filter((item) => ['جديد', 'بحاجة تحقق'].includes(safe(item.review_status))).forEach((item) => list.push({ id: `discovery-${item.id}`, label: `مراجعة شركة جديدة: ${safe(item.company_name)}`, rank: 9, href: '/discovery', reason: 'سجل اكتشاف لم يُعتمد بعد', assignedAgent: 'Manual Review' }));
    companies.filter((company) => Array.isArray(company.missing_fields) && company.missing_fields.length > 0 && !hasOpenFollowUp(company.id)).forEach((company) => list.push({ id: `enrich-${company.id}`, label: `استكمال بيانات: ${safe(company.company_name)}`, rank: 10, href: '/enrichment', company, reason: `حقول ناقصة: ${(company.missing_fields as unknown as unknown[]).map(safe).join('، ')}`, assignedAgent: 'Manual Research' }));
    return list.filter((task) => !dismissed.includes(task.id)).sort((a, b) => a.rank - b.rank || Number(b.company?.lead_score ?? 0) - Number(a.company?.lead_score ?? 0) || safe(a.dueDate).localeCompare(safe(b.dueDate))).slice(0, 20);
  }, [companies, contacts, discovery, dismissed, followUps, followUpLimit, messages, opportunities, outreachLimit]);
  const complete = async (task: DailyTask) => { if (!task.followUp) return; await simpleCrud.update('follow_ups', task.followUp.id, { status: 'Completed' }); setNotice('تم إكمال المتابعة.'); await load(); };
  const snooze = async (task: DailyTask) => { const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10); if (task.followUp) await simpleCrud.update('follow_ups', task.followUp.id, { status: 'Pending', date: tomorrow, due_date: tomorrow, next_follow_up_date: tomorrow }); else if (task.company && !followUps.some((item) => item.company_id === task.company?.id && !['Completed','Cancelled'].includes(safe(item.status)))) await simpleCrud.create('follow_ups', { company_id: task.company.id, company_name: safe(task.company.company_name), title: `مهمة مؤجلة: ${task.label}`, subject: task.label, follow_up_type: 'General', status: 'Pending', priority: task.company.priority === 'A' ? 'High' : 'Medium', date: tomorrow, due_date: tomorrow, next_action: task.reason }); setDismissed((items) => [...items, task.id]); setNotice(`تم تأجيل المهمة إلى ${tomorrow} وحفظها في Supabase.`); await load(); };
  const copyDraft = async (task: DailyTask) => { if (!task.draft) return; await navigator.clipboard.writeText(safe(task.draft.body)); setNotice('تم نسخ المسودة.'); };
  const cards = [
    ['اليوم', followUps.filter((item) => safe(item.date || item.due_date) === today && !['Completed', 'Cancelled'].includes(safe(item.status))).length],
    ['المتأخرة', followUps.filter((item) => safe(item.date || item.due_date) < today && !['Completed', 'Cancelled'].includes(safe(item.status))).length],
    ['Priority A', companies.filter((company) => company.priority === 'A' && !company.last_contact).length],
    ['جاهزة للتواصل', companies.filter((company) => ['A', 'B'].includes(safe(company.priority)) && messages.some((message) => message.company_id === company.id && ['Draft', 'Approved'].includes(safe(message.status)))).length],
    ['تحتاج بحثاً', agentJobs.filter((job) => job.status === 'manual_research_required').length],
    ['صانع القرار مفقود', companies.filter((company) => !contacts.some((contact) => contact.company_id === company.id && contact.contact_classification === 'Decision Maker')).length],
    ['تسجيل الموردين', companies.filter((company) => safe(company.vendor_registration_url)).length],
    ['المتابعات', followUps.filter((item) => !['Completed', 'Cancelled'].includes(safe(item.status))).length],
    ['الردود', companies.filter((company) => company.last_outcome && !['', 'No Response'].includes(safe(company.last_outcome))).length],
    ['الفرص', opportunities.filter((item) => !['Won', 'Lost'].includes(safe(item.stage))).length],
    ['Enriched', intelligence.filter(hasTavilyResult).length],
  ];

  return <CRMPage title="مركز العمل اليومي" description={`صندوق مهام تنفيذي بحد ${outreachLimit} تواصل جديد و${followUpLimit} متابعة، مرتب حسب الأولوية.`}>{error && <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}{notice && <p className="rounded-xl bg-emerald-50 p-3 text-emerald-700">{notice}</p>}{loading ? <div className="crm-empty animate-pulse">جارٍ تجهيز يومك...</div> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([label, count], index) => <div key={String(label)} className="crm-kpi"><div className="flex items-start justify-between"><p className="text-xs font-semibold text-[#75664d]">{label}</p><span className="text-[#b38b3c]">{['◷','!','A','→','⌕','◉','◇','✓','↩','◆','+'][index] ?? '•'}</span></div><strong className="mt-3 block text-3xl">{count}</strong></div>)}</div><div className="crm-card flex flex-wrap items-center justify-between gap-3 p-4"><div><h3 className="font-bold">صندوق مهام اليوم</h3><p className="text-xs text-[#75664d]">ابدأ بأعلى أولوية؛ التأجيل يُحفظ في Supabase ولا يضيع عند تغيير الجهاز.</p></div><button onClick={() => setStarted(true)} className="rounded-xl bg-[#2f2417] px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#49351f]">ابدأ يومي · {tasks.length}</button></div>{started && <section className="crm-card overflow-hidden"><div className="flex items-center justify-between border-b border-[#eadfc9] bg-[#faf5eb] p-4"><h3 className="font-bold">قائمة العمل</h3><span className="crm-chip bg-[#2f2417] text-white">{tasks.length} مهمة</span></div><div className="divide-y divide-[#eee3cd]">{tasks.map((task, index) => { const site = external(task.company?.website); const linkedIn = external(task.company?.linkedin_company || task.company?.linked_in || task.company?.linkedin); const phone = safe(task.company?.general_phone || task.company?.phone); return <article key={task.id} className="group flex gap-3 p-4 hover:bg-[#fdf9f1]"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0e3ca] text-sm font-bold text-[#6d5125]">{index + 1}</div><div className="min-w-0 flex-1"><Link href={task.href} className="font-semibold hover:text-[#9a742b]">{task.label}</Link><div className="mt-1 flex flex-wrap gap-3 text-[11px] text-[#75664d]"><span>السبب: {task.reason}</span><span>المسؤول: {task.assignedAgent}</span>{task.dueDate ? <span>الاستحقاق: {task.dueDate}</span> : null}</div><div className="mt-3 flex flex-wrap gap-2 text-xs">{task.company && <Link href={`/companies/${task.company.id}`} className="rounded-lg border px-3 py-1.5">فتح الشركة</Link>}{task.draft && <button onClick={() => void copyDraft(task)} className="rounded-lg border px-3 py-1.5">نسخ المسودة</button>}{site && <a href={site} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-1.5">الموقع</a>}{linkedIn && <a href={linkedIn} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-1.5">LinkedIn</a>}{phone && <a href={`tel:${phone}`} className="rounded-lg border px-3 py-1.5">اتصال</a>}{task.followUp && <button onClick={() => void complete(task)} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-white">إكمال</button>}<Link href="/opportunities" className="rounded-lg border px-3 py-1.5">إنشاء فرصة</Link><Link href="/follow-ups" className="rounded-lg border px-3 py-1.5">جدولة متابعة</Link><button onClick={() => void snooze(task)} className="rounded-lg border px-3 py-1.5 text-[#75664d]">تأجيل للغد</button></div></div></article>; })}{!tasks.length && <div className="crm-empty m-4">لا توجد مهام مستحقة.</div>}</div></section>}</>}</CRMPage>;
}
