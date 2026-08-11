'use client';

import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';

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
    void Promise.all(['companies', 'contacts', 'follow_ups', 'opportunities', 'messages', 'agent_jobs'].map(async (table) => [table, await simpleCrud.list(table)] as const))
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
  const followUps = (data.follow_ups ?? []).filter((row) => companyIds.has(safe(row.company_id)));
  const opportunities = (data.opportunities ?? []).filter((row) => companyIds.has(safe(row.company_id)));
  const messages = (data.messages ?? []).filter((row) => companyIds.has(safe(row.company_id)));
  const jobs = (data.agent_jobs ?? []).filter((row) => !row.company_id || companyIds.has(safe(row.company_id)));
  const options = { sectors: [...new Set((data.companies ?? []).map((row) => safe(row.sector)).filter(Boolean))].sort(), types: [...new Set((data.companies ?? []).map((row) => safe(row.company_type)).filter(Boolean))].sort(), statuses: [...new Set((data.companies ?? []).map((row) => safe(row.status)).filter(Boolean))].sort() };
  const cards = [['الشركات', companies.length], ['جاهزة للتواصل', companies.filter((row) => ['A','B'].includes(safe(row.priority)) && Boolean(row.general_email || row.email || row.general_phone || row.phone)).length], ['تم التواصل', companies.filter((row) => row.outreach_status === 'Contacted' || safe(row.last_contact)).length], ['المتابعات', followUps.length], ['الفرص', opportunities.length], ['المسودات', messages.filter((row) => ['Draft','Approved'].includes(safe(row.status))).length], ['مهام الوكلاء المكتملة', jobs.filter((row) => row.status === 'completed').length], ['بحث يدوي', jobs.filter((row) => row.status === 'manual_research_required').length]] as const;
  const completeness = [['80–100%', companies.filter((row) => Number(row.data_completeness || 0) >= 80).length], ['50–79%', companies.filter((row) => Number(row.data_completeness || 0) >= 50 && Number(row.data_completeness || 0) < 80).length], ['أقل من 50%', companies.filter((row) => Number(row.data_completeness || 0) < 50).length]] as const;

  return <CRMPage title="التقارير التشغيلية" description="تقارير مباشرة من بيانات Supabase مع فلاتر بسيطة لاتخاذ القرار.">
    {error ? <p className="rounded-xl bg-red-50 p-3 text-red-700">تعذر تحميل التقارير: {error}</p> : null}
    <div className="crm-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5"><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="من تاريخ" className="rounded-xl border bg-white p-2.5"/><select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-xl border bg-white p-2.5"><option value="الكل">الأولوية: الكل</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select><select value={sector} onChange={(event) => setSector(event.target.value)} className="rounded-xl border bg-white p-2.5"><option value="الكل">القطاع: الكل</option>{options.sectors.map((item) => <option key={item}>{item}</option>)}</select><select value={companyType} onChange={(event) => setCompanyType(event.target.value)} className="rounded-xl border bg-white p-2.5"><option value="الكل">النوع: الكل</option>{options.types.map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border bg-white p-2.5"><option value="الكل">الحالة: الكل</option>{options.statuses.map((item) => <option key={item}>{item}</option>)}</select></div>
    {loading ? <div className="crm-empty animate-pulse">جارٍ إعداد التقارير...</div> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, count]) => <div key={label} className="crm-kpi"><p className="text-xs text-[#75664d]">{label}</p><strong className="mt-3 block text-3xl">{count}</strong></div>)}</div><div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4"><Summary title="الشركات حسب الأولوية" rows={group(companies, 'priority')} /><Summary title="الشركات حسب القطاع" rows={group(companies, 'sector')} /><Summary title="الفرص حسب المرحلة" rows={group(opportunities, 'stage')} /><Summary title="اكتمال البيانات" rows={[...completeness]} /></div></>}
  </CRMPage>;
}
