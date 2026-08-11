'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';

const safe = (value: unknown) => String(value ?? '').trim();
const PAGE_SIZE = 50;

export default function ManualResearchPage() {
  const [jobs, setJobs] = useState<SimpleRow[]>([]);
  const [companies, setCompanies] = useState<SimpleRow[]>([]);
  const [query, setQuery] = useState('');
  const [agent, setAgent] = useState('الكل');
  const [priority, setPriority] = useState('الكل');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void Promise.all([simpleCrud.listWhere('agent_jobs', 'status', 'manual_research_required'), simpleCrud.list('companies')])
      .then(([jobRows, companyRows]) => { setJobs(jobRows); setCompanies(companyRows); })
      .catch(() => setError('تعذر تحميل قائمة البحث اليدوي. تحقق من الاتصال ثم أعد المحاولة.'))
      .finally(() => setLoading(false));
  }, []);

  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company])), [companies]);
  const rows = useMemo(() => jobs.filter((job) => {
    const company = companyById.get(safe(job.company_id));
    const haystack = `${safe(company?.company_name)} ${safe(job.agent_name)} ${safe(job.last_error)} ${safe(job.payload)}`.toLocaleLowerCase();
    return (agent === 'الكل' || job.agent_name === agent)
      && (priority === 'الكل' || (priority === 'عالية' ? Number(job.priority ?? 0) >= 90 : priority === 'متوسطة' ? Number(job.priority ?? 0) >= 60 && Number(job.priority ?? 0) < 90 : Number(job.priority ?? 0) < 60))
      && haystack.includes(query.trim().toLocaleLowerCase());
  }).sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0) || safe(a.created_at).localeCompare(safe(b.created_at))), [agent, companyById, jobs, priority, query]);
  const agents = useMemo(() => [...new Set(jobs.map((job) => safe(job.agent_name)).filter(Boolean))].sort(), [jobs]);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [agent, priority, query]);

  return <CRMPage title="البحث اليدوي" description="قائمة محفوظة للمهام التي تحتاج مصدراً خارجياً أو تحققاً بشرياً. لا يتم تشغيل Tavily أو حذف أي مهمة من هذه الصفحة.">
    {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <div className="crm-kpi"><p className="text-xs text-[#75664d]">إجمالي البحث اليدوي</p><strong className="mt-3 block text-3xl">{jobs.length}</strong></div>
      <div className="crm-kpi"><p className="text-xs text-[#75664d]">المعروض الآن</p><strong className="mt-3 block text-3xl">{rows.length}</strong></div>
      <div className="crm-kpi"><p className="text-xs text-[#75664d]">الصفحات</p><strong className="mt-3 block text-3xl">{totalPages}</strong></div>
      <div className="crm-kpi"><p className="text-xs text-[#75664d]">حالة القائمة</p><strong className="mt-3 block text-lg text-amber-700">PENDING</strong></div>
      <div className="crm-kpi"><p className="text-xs text-[#75664d]">External Research</p><strong className="mt-3 block text-lg text-amber-700">PAUSED</strong></div>
      <div className="crm-kpi"><p className="text-xs text-[#75664d]">External Sending</p><strong className="mt-3 block text-lg text-emerald-700">DISABLED</strong></div>
    </div>
    <div className="crm-card grid gap-3 p-4 md:grid-cols-[1fr_240px_200px]">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث باسم الشركة أو نوع البحث" className="rounded-xl border border-[#e5d4b1] bg-white p-3" />
      <select value={agent} onChange={(event) => setAgent(event.target.value)} className="rounded-xl border border-[#e5d4b1] bg-white p-3"><option>الكل</option>{agents.map((name) => <option key={name}>{name}</option>)}</select>
      <select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-xl border border-[#e5d4b1] bg-white p-3"><option>الكل</option><option>عالية</option><option>متوسطة</option><option>منخفضة</option></select>
    </div>
    {loading ? <div className="crm-empty animate-pulse">جارٍ تحميل المهام المحفوظة...</div> : <div className="crm-card overflow-x-auto p-2"><table className="min-w-full text-right text-sm"><thead><tr className="text-[#8a6f35]"><th className="p-3">الشركة</th><th className="p-3">نوع البحث</th><th className="p-3">السبب</th><th className="p-3">الأولوية</th><th className="p-3">تاريخ الإنشاء</th><th className="p-3">المحاولات</th><th className="p-3">المزوّد المطلوب</th><th className="p-3">الحالة</th></tr></thead><tbody>{visible.map((job) => { const company = companyById.get(safe(job.company_id)); return <tr key={job.id} className="border-t border-[#eee3cd]"><td className="p-3">{company ? <Link href={`/companies/${company.id}`} className="font-semibold hover:text-[#9a742b]">{safe(company.company_name)}</Link> : 'مهمة عامة'}</td><td className="p-3">{safe(job.agent_name)}</td><td className="max-w-md p-3 text-xs text-[#75664d]">{safe(job.last_error) || 'تحتاج مصدراً عاماً موثوقاً قبل اعتماد النتيجة.'}</td><td className="p-3"><span className="crm-chip bg-[#f7edd9] text-[#765722]">{safe(job.priority)}</span></td><td className="p-3 text-xs">{safe(job.created_at).slice(0, 16)}</td><td className="p-3">{safe(job.attempts)}/{safe(job.max_attempts)}</td><td className="p-3">External Research</td><td className="p-3"><span className="crm-chip bg-amber-100 text-amber-800">Pending / Manual</span></td></tr>; })}{!visible.length && <tr><td colSpan={8} className="p-10 text-center text-[#75664d]">لا توجد مهام مطابقة.</td></tr>}</tbody></table></div>}
    <div className="flex items-center justify-between gap-3 text-sm"><span>صفحة {page} من {totalPages} · {rows.length} مهمة</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border px-4 py-2 disabled:opacity-40">السابق</button><button disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-xl border px-4 py-2 disabled:opacity-40">التالي</button></div></div>
  </CRMPage>;
}
