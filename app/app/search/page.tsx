'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';

const sources = [
  { table: 'companies', label: 'شركة', href: (row: SimpleRow) => `/companies/${row.id}` },
  { table: 'contacts', label: 'جهة اتصال', href: () => '/contacts' },
  { table: 'opportunities', label: 'فرصة', href: () => '/opportunities' },
  { table: 'meetings', label: 'اجتماع', href: () => '/meetings' },
  { table: 'follow_ups', label: 'متابعة', href: () => '/follow-ups' },
] as const;

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<Record<string, SimpleRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { void Promise.all(sources.map(async ({ table }) => [table, await simpleCrud.list(table)] as const)).then((values) => setData(Object.fromEntries(values))).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)); }, []);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return sources.flatMap((source) => (data[source.table] ?? []).filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(needle))).map((row) => ({ source, row }))).slice(0, 75);
  }, [data, query]);
  const title = (row: SimpleRow) => String(row.company_name || row.full_name || row.name || row.title || row.subject || 'سجل');

  return <CRMPage title="البحث الشامل" description="بحث سريع عبر الشركات وجهات الاتصال والفرص والاجتماعات والمتابعات.">
    {error ? <p className="rounded-xl bg-red-50 p-3 text-red-700">تعذر البحث: {error}</p> : null}
    <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اكتب اسم شركة أو شخص أو فرصة أو متابعة" className="w-full rounded-2xl border border-[#ead9b3] bg-white p-4" />
    <div className="rounded-2xl border bg-white p-4">{loading ? <p className="animate-pulse text-sm text-[#6f6044]">جارٍ تجهيز فهرس البحث...</p> : query.trim().length < 2 ? <p className="text-sm text-[#6f6044]">أدخل حرفين على الأقل.</p> : results.length === 0 ? <p className="text-sm text-[#6f6044]">لا توجد نتائج مطابقة.</p> : <div className="divide-y divide-[#eee3cd]">{results.map(({ source, row }) => <Link key={`${source.table}-${row.id}`} href={source.href(row)} className="flex items-center justify-between gap-3 p-3 hover:bg-[#fdf8ee]"><div><span className="crm-chip bg-[#f0e3ca] text-[#6d5125]">{source.label}</span><strong className="mr-3">{title(row)}</strong></div><span className="text-xs text-[#75664d]">فتح السجل ←</span></Link>)}</div>}</div>
  </CRMPage>;
}
