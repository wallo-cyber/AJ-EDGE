'use client';

import { useEffect, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';

const today = new Date().toISOString().slice(0, 10);
const value = (item: SimpleRow, key: string) => String(item[key] ?? '');
const hasTavilyResult = (row: SimpleRow) => Boolean(row.data && typeof row.data === 'object' && 'tavily' in row.data);

export default function DashboardPage() {
  const [data, setData] = useState<Record<string, SimpleRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { void Promise.all(['companies', 'contacts', 'follow_ups', 'opportunities', 'meetings', 'messages', 'company_intelligence', 'agent_jobs'].map(async (table) => [table, await simpleCrud.list(table)] as const)).then((rows) => setData(Object.fromEntries(rows))).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)); }, []);
  const companies = data.companies ?? [], contacts = data.contacts ?? [], followUps = data.follow_ups ?? [], opportunities = data.opportunities ?? [], meetings = data.meetings ?? [], messages = data.messages ?? [], intelligence = data.company_intelligence ?? [], agentJobs = data.agent_jobs ?? [];
  const ready = companies.filter((company) => ['A', 'B'].includes(value(company, 'priority')) && (company.general_email || company.email || company.general_phone || company.phone || contacts.some((contact) => contact.company_id === company.id))).length;
  const contacted = companies.filter((company) => company.outreach_status === 'Contacted' || company.last_contact).length;
  const responded = companies.filter((company) => company.last_outcome && !['No Response', ''].includes(value(company, 'last_outcome'))).length;
  const rfqs = opportunities.filter((opportunity) => value(opportunity, 'stage').includes('RFQ')).length;
  const metrics = [
    ['Enriched', intelligence.filter(hasTavilyResult).length], ['Needs Manual Research', agentJobs.filter((job) => job.status === 'manual_research_required').length], ['Queued', agentJobs.filter((job) => job.status === 'queued').length], ['Failed Jobs', agentJobs.filter((job) => job.status === 'failed').length],
    ['إجمالي الشركات', companies.length], ['Priority A', companies.filter((company) => company.priority === 'A').length], ['Priority B', companies.filter((company) => company.priority === 'B').length], ['Priority C', companies.filter((company) => company.priority === 'C').length],
    ['تحتاج استكمالاً', companies.filter((company) => ['Needs Enrichment', 'Poor Data'].includes(value(company, 'data_quality_status'))).length], ['صناع القرار', contacts.filter((contact) => contact.contact_classification === 'Decision Maker').length], ['روابط التسجيل', companies.filter((company) => company.vendor_registration_url).length], ['جاهزة للتواصل', ready],
    ['تم التواصل', contacted], ['ردود', responded], ['متابعات اليوم', followUps.filter((item) => value(item, 'date') === today && !['Completed', 'Cancelled'].includes(value(item, 'status'))).length], ['متأخرة', followUps.filter((item) => value(item, 'date') < today && !['Completed', 'Cancelled'].includes(value(item, 'status'))).length],
    ['اجتماعات', meetings.length], ['RFQs', rfqs], ['فرص مفتوحة', opportunities.filter((item) => !['Won', 'Lost'].includes(value(item, 'stage'))).length], ['فوز', opportunities.filter((item) => item.stage === 'Won').length],
  ];
  const top = [...companies].sort((a, b) => Number(b.lead_score ?? 0) - Number(a.lead_score ?? 0)).slice(0, 10);
  return <CRMPage title="لوحة القيادة التنفيذية" description="مؤشرات تطوير الأعمال الحقيقية من Supabase.">{error && <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}{loading ? <p className="p-8 text-center">جارٍ تحميل المؤشرات...</p> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, metric]) => <div key={String(label)} className="rounded-2xl border border-[#ead9b3] bg-[#fdf8ee] p-4"><p className="text-xs text-[#6f6044]">{label}</p><p className="mt-2 text-3xl font-bold">{metric}</p></div>)}</div><div className="grid gap-4 lg:grid-cols-2"><section className="rounded-2xl border bg-white p-4"><h3 className="font-semibold">أفضل الشركات المستهدفة</h3>{top.map((company) => <div key={company.id} className="flex justify-between border-b py-2"><span>{value(company, 'company_name')}</span><strong>{value(company, 'priority')} · {value(company, 'lead_score')}/100</strong></div>)}</section><section className="rounded-2xl border bg-white p-4"><h3 className="font-semibold">Conversion Funnel</h3><p className="mt-3 leading-9">{companies.length} شركات ← {ready} جاهزة ← {contacted} تم التواصل ← {responded} ردود ← {opportunities.length} فرص ← {rfqs} RFQ ← {opportunities.filter((item) => item.stage === 'Won').length} فوز</p><p className="mt-3 text-xs text-[#6f6044]">المسودات قيد المراجعة: {messages.filter((message) => ['Draft', 'Approved'].includes(value(message, 'status'))).length}</p></section></div></>}</CRMPage>;
}
