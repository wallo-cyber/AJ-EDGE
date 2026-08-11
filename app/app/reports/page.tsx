'use client';

import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';
import { companyOutreachState, decisionMakerCoverage } from '../../lib/domain/business';

const safe = (value: unknown) => String(value ?? '').trim();
const group = (rows: SimpleRow[], key: string) => Object.entries(rows.reduce<Record<string, number>>((result, row) => { const label = safe(row[key]) || 'غير محدد'; result[label] = (result[label] ?? 0) + 1; return result; }, {})).sort((a, b) => b[1] - a[1]);
const Summary = ({ title, rows }: { title: string; rows: ReadonlyArray<readonly [string, number]> }) => <section className="crm-card p-4"><h3 className="font-bold">{title}</h3><div className="mt-3 divide-y divide-[#eee3cd]">{rows.slice(0, 12).map(([label, count]) => <div key={label} className="flex items-center justify-between gap-3 py-2 text-sm"><span>{label}</span><strong>{count}</strong></div>)}{!rows.length && <div className="crm-empty">لا توجد بيانات.</div>}</div></section>;

export default function ReportsPage() {
  const [data, setData] = useState<Record<string, SimpleRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [priority, setPriority] = useState('الكل');
  const [sector, setSector] = useState('الكل');
  const [companyType, setCompanyType] = useState('الكل');
  const [status, setStatus] = useState('الكل');
  const [fromDate, setFromDate] = useState('');

  useEffect(() => {
    void Promise.all(['companies', 'contacts', 'follow_ups', 'opportunities', 'messages', 'communication_events', 'agent_jobs', 'agent_runs', 'meetings', 'quotations', 'contracts'].map(async (table) => [table, (await simpleCrud.page(table, 1, table === 'agent_jobs' || table === 'agent_runs' ? 3000 : 1000)).rows] as const))
      .then((rows) => setData(Object.fromEntries(rows)))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const companies = useMemo(() => (data.companies ?? []).filter((company) =>
    (priority === 'الكل' || company.priority === priority)
    && (sector === 'الكل' || company.sector === sector)
    && (companyType === 'الكل' || company.company_type === companyType)
    && (status === 'الكل' || company.status === status)
    && (!fromDate || safe(company.created_at).slice(0, 10) >= fromDate)
  ), [companyType, data.companies, fromDate, priority, sector, status]);
  const companyIds = useMemo(() => new Set(companies.map((company) => company.id)), [companies]);
  const opportunities = (data.opportunities ?? []).filter((row) => companyIds.has(safe(row.company_id)));
  const messages = (data.messages ?? []).filter((row) => companyIds.has(safe(row.company_id)));
  const events = (data.communication_events ?? []).filter((row) => companyIds.has(safe(row.company_id)));
  const contacts = (data.contacts ?? []).filter((row) => companyIds.has(safe(row.company_id)));
  const jobs = (data.agent_jobs ?? []).filter((row) => !row.company_id || companyIds.has(safe(row.company_id)));
  const meetings = (data.meetings ?? []).filter((row) => companyIds.has(safe(row.company_id)));
  const quotations = (data.quotations ?? []).filter((row) => companyIds.has(safe(row.company_id)));
  const options = { sectors: [...new Set((data.companies ?? []).map((row) => safe(row.sector)).filter(Boolean))].sort(), types: [...new Set((data.companies ?? []).map((row) => safe(row.company_type)).filter(Boolean))].sort(), statuses: [...new Set((data.companies ?? []).map((row) => safe(row.status)).filter(Boolean))].sort() };
  const coverage = decisionMakerCoverage(companies, contacts);
  const cards = [['الشركات', companies.length], ['صانع قرار موثق', coverage.covered], ['تغطية صانع القرار', `${coverage.percent}%`], ['Draft Ready', companies.filter((row) => ['DRAFT_READY','APPROVED'].includes(companyOutreachState(row, contacts, messages, events))).length], ['تم التواصل', new Set(events.filter((row) => row.direction === 'OUTBOUND').map((row) => row.company_id)).size], ['الردود', new Set(events.filter((row) => row.direction === 'INBOUND').map((row) => row.company_id)).size], ['الاجتماعات', meetings.length], ['الفرص', opportunities.filter((row) => !row.archived_at).length], ['RFQs', opportunities.filter((row) => row.stage === 'RFQ_RECEIVED').length], ['العروض', quotations.length], ['الفوز', opportunities.filter((row) => row.stage === 'WON').length], ['بحث يدوي', jobs.filter((row) => row.status === 'manual_research_required').length]] as const;
  const completeness = [['80–100%', companies.filter((row) => Number(row.data_completeness || 0) >= 80).length], ['50–79%', companies.filter((row) => Number(row.data_completeness || 0) >= 50 && Number(row.data_completeness || 0) < 80).length], ['أقل من 50%', companies.filter((row) => Number(row.data_completeness || 0) < 50).length]] as const;

  const exportCsv = () => { const cell = (value: unknown) => `"${safe(value).replaceAll('"', '""')}"`; const content = '\uFEFF' + [['company_name','priority','lead_score','data_completeness','status','city','sector','outreach_status'], ...companies.map((row) => [row.company_name,row.priority,row.lead_score,row.data_completeness,row.status,row.city,row.sector,row.outreach_status])].map((row) => row.map(cell).join(',')).join('\r\n'); const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href=url; link.download=`algaeu-report-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url); };

  return <CRMPage title="التقارير التشغيلية" description="تقارير مباشرة من بيانات Supabase مع فلاتر بسيطة لاتخاذ القرار." action={<button onClick={exportCsv} className="rounded-full bg-[#2f2417] px-5 py-2.5 text-sm text-white">تصدير CSV</button>}>
    {error ? <p className="rounded-xl bg-red-50 p-3 text-red-700">تعذر تحميل التقارير: {error}</p> : null}
    <div className="crm-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5"><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="من تاريخ" className="rounded-xl border bg-white p-2.5"/><select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-xl border bg-white p-2.5"><option value="الكل">الأولوية: الكل</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select><select value={sector} onChange={(event) => setSector(event.target.value)} className="rounded-xl border bg-white p-2.5"><option value="الكل">القطاع: الكل</option>{options.sectors.map((item) => <option key={item}>{item}</option>)}</select><select value={companyType} onChange={(event) => setCompanyType(event.target.value)} className="rounded-xl border bg-white p-2.5"><option value="الكل">النوع: الكل</option>{options.types.map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border bg-white p-2.5"><option value="الكل">الحالة: الكل</option>{options.statuses.map((item) => <option key={item}>{item}</option>)}</select></div>
    {loading ? <div className="crm-empty animate-pulse">جارٍ إعداد التقارير...</div> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, count]) => <div key={label} className="crm-kpi"><p className="text-xs text-[#75664d]">{label}</p><strong className="mt-3 block text-3xl">{count}</strong></div>)}</div><div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5"><Summary title="الشركات حسب الأولوية" rows={group(companies, 'priority')} /><Summary title="الشركات حسب القطاع" rows={group(companies, 'sector')} /><Summary title="الفرص حسب المرحلة" rows={group(opportunities, 'stage')} /><Summary title="اكتمال البيانات" rows={[...completeness]} /><Summary title="أداء الوكلاء" rows={group(data.agent_runs ?? [], 'agent_name')} /></div></>}
  </CRMPage>;
}
