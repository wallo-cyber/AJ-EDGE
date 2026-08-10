'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from './crm-shell';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

const today = new Date().toISOString().slice(0, 10);
const safe = (value: unknown) => String(value ?? '').trim();
const hasTavilyResult = (row: SimpleRow) => Boolean(row.data && typeof row.data === 'object' && 'tavily' in row.data);
const external = (value: unknown) => { const url = safe(value); return url ? (url.startsWith('http') ? url : `https://${url}`) : ''; };
type DailyTask = { id: string; label: string; rank: number; href: string; company?: SimpleRow; followUp?: SimpleRow; draft?: SimpleRow };

export function DailyWorkspace() {
  const [data, setData] = useState<Record<string, SimpleRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [skipped, setSkipped] = useState<string[]>([]);
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
    const addFollowUp = (item: SimpleRow, rank: number, prefix: string) => list.push({ id: `follow-${item.id}`, label: `${prefix}: ${safe(item.company_name || item.subject)}`, rank, href: '/follow-ups', followUp: item, company: companyById(item.company_id) });
    followUps.filter((item) => safe(item.date || item.due_date) < today && !['Completed', 'Cancelled'].includes(safe(item.status))).slice(0, followUpLimit).forEach((item) => addFollowUp(item, 1, 'متابعة متأخرة'));
    followUps.filter((item) => safe(item.date || item.due_date) === today && !['Completed', 'Cancelled'].includes(safe(item.status))).slice(0, followUpLimit).forEach((item) => addFollowUp(item, 2, 'متابعة اليوم'));
    companies.filter((company) => company.last_outcome && !['', 'No Response'].includes(safe(company.last_outcome))).forEach((company) => list.push({ id: `reply-${company.id}`, label: `رد يحتاج إجراء: ${safe(company.company_name)} — ${safe(company.last_outcome)}`, rank: 3, href: '/ready-outreach', company, draft: draftFor(company.id) }));
    const ready = (company: SimpleRow) => Boolean(company.general_email || company.email || company.general_phone || company.phone || contacts.some((contact) => contact.company_id === company.id));
    companies.filter((company) => company.priority === 'A' && ready(company) && !company.last_contact).slice(0, outreachLimit).forEach((company) => list.push({ id: `ready-a-${company.id}`, label: `Priority A جاهزة للتواصل: ${safe(company.company_name)}`, rank: 4, href: '/ready-outreach', company, draft: draftFor(company.id) }));
    companies.filter((company) => company.priority === 'A' && !contacts.some((contact) => contact.company_id === company.id)).forEach((company) => list.push({ id: `contact-a-${company.id}`, label: `Priority A تحتاج صانع قرار: ${safe(company.company_name)}`, rank: 5, href: '/enrichment', company }));
    companies.filter((company) => company.priority === 'B' && ready(company) && !company.last_contact).slice(0, outreachLimit).forEach((company) => list.push({ id: `ready-b-${company.id}`, label: `Priority B جاهزة للتواصل: ${safe(company.company_name)}`, rank: 6, href: '/ready-outreach', company, draft: draftFor(company.id) }));
    companies.filter((company) => ['Available', 'Registration Started'].includes(safe(company.vendor_registration_status))).forEach((company) => list.push({ id: `vendor-${company.id}`, label: `التسجيل كمورد/مقاول: ${safe(company.company_name)}`, rank: 7, href: '/enrichment', company }));
    opportunities.filter((item) => !['Won', 'Lost'].includes(safe(item.stage)) && (!item.next_action || !item.next_action_date || safe(item.next_action_date) <= today)).forEach((item) => list.push({ id: `opportunity-${item.id}`, label: `إجراء فرصة: ${safe(item.title)}`, rank: 8, href: '/opportunities', company: companyById(item.company_id) }));
    discovery.filter((item) => ['جديد', 'بحاجة تحقق'].includes(safe(item.review_status))).forEach((item) => list.push({ id: `discovery-${item.id}`, label: `مراجعة شركة جديدة: ${safe(item.company_name)}`, rank: 9, href: '/discovery' }));
    companies.filter((company) => Array.isArray(company.missing_fields) && company.missing_fields.length > 0).forEach((company) => list.push({ id: `enrich-${company.id}`, label: `استكمال بيانات: ${safe(company.company_name)}`, rank: 10, href: '/enrichment', company }));
    return list.filter((task) => !skipped.includes(task.id)).sort((a, b) => a.rank - b.rank).slice(0, 20);
  }, [companies, contacts, discovery, followUps, followUpLimit, messages, opportunities, outreachLimit, skipped]);
  const complete = async (task: DailyTask) => { if (!task.followUp) return; await simpleCrud.update('follow_ups', task.followUp.id, { status: 'Completed' }); setNotice('تم إكمال المتابعة.'); await load(); };
  const copyDraft = async (task: DailyTask) => { if (!task.draft) return; await navigator.clipboard.writeText(safe(task.draft.body)); setNotice('تم نسخ المسودة.'); };
  const cards = [['Enriched', intelligence.filter(hasTavilyResult).length], ['Needs Manual Research', agentJobs.filter((job) => job.status === 'manual_research_required').length], ['المتأخرة', followUps.filter((item) => safe(item.date || item.due_date) < today && !['Completed', 'Cancelled'].includes(safe(item.status))).length], ['اليوم', followUps.filter((item) => safe(item.date || item.due_date) === today).length], ['Priority A بلا تواصل', companies.filter((company) => company.priority === 'A' && !company.last_contact).length], ['جاهزة للتواصل', companies.filter((company) => ['A', 'B'].includes(safe(company.priority)) && messages.some((message) => message.company_id === company.id && ['Draft', 'Approved'].includes(safe(message.status)))).length]];

  return <CRMPage title="مركز العمل اليومي" description={`قائمة حقيقية بحد ${outreachLimit} تواصل جديد و${followUpLimit} متابعة، وبحد أقصى 20 مهمة.`}>{error && <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}{notice && <p className="rounded-xl bg-emerald-50 p-3 text-emerald-700">{notice}</p>}{loading ? <p className="p-8 text-center">جارٍ تجهيز يومك...</p> : <><div className="grid gap-3 sm:grid-cols-4">{cards.map(([label, count]) => <div key={String(label)} className="rounded-2xl border bg-[#fdf8ee] p-4"><p className="text-xs">{label}</p><strong className="text-3xl">{count}</strong></div>)}</div><button onClick={() => setStarted(true)} className="rounded-full bg-[#2f2417] px-6 py-3 text-white">ابدأ يومي</button>{started && <section className="rounded-2xl border bg-white p-4"><h3 className="font-semibold">قائمة العمل — {tasks.length} مهمة</h3>{tasks.map((task, index) => { const site = external(task.company?.website); const linkedIn = external(task.company?.linkedin_company || task.company?.linked_in || task.company?.linkedin); const phone = safe(task.company?.general_phone || task.company?.phone); return <article key={task.id} className="border-b py-3"><Link href={task.href} className="font-medium hover:underline">{index + 1}. {task.label}</Link><div className="mt-2 flex flex-wrap gap-2 text-xs">{task.company && <Link href={`/companies/${task.company.id}`} className="rounded-full border px-3 py-1.5">فتح الشركة</Link>}{task.draft && <button onClick={() => void copyDraft(task)} className="rounded-full border px-3 py-1.5">نسخ المسودة</button>}{site && <a href={site} target="_blank" rel="noreferrer" className="rounded-full border px-3 py-1.5">الموقع</a>}{linkedIn && <a href={linkedIn} target="_blank" rel="noreferrer" className="rounded-full border px-3 py-1.5">LinkedIn</a>}{phone && <a href={`tel:${phone}`} className="rounded-full border px-3 py-1.5">اتصال</a>}{task.followUp && <button onClick={() => void complete(task)} className="rounded-full border px-3 py-1.5">إكمال المتابعة</button>}<Link href="/opportunities" className="rounded-full border px-3 py-1.5">إنشاء فرصة</Link><Link href="/follow-ups" className="rounded-full border px-3 py-1.5">جدولة متابعة</Link><button onClick={() => setSkipped((items) => [...items, task.id])} className="rounded-full border px-3 py-1.5">تخطي اليوم</button></div></article>; })}{!tasks.length && <p className="py-5 text-sm">لا توجد مهام مستحقة.</p>}</section>}</>}</CRMPage>;
}
