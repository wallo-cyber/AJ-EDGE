'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from './crm-shell';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

const vendorStatuses = ['Not Checked', 'Available', 'Registration Started', 'Registered', 'Rejected', 'Not Applicable'];
const safe = (value: unknown) => String(value ?? '').trim();
const external = (url: unknown) => { const value = safe(url); return value ? (value.startsWith('http') ? value : `https://${value}`) : ''; };

export function EnrichmentWorkspace() {
  const [companies, setCompanies] = useState<SimpleRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const load = () => simpleCrud.list('companies').then(setCompanies).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);
  const rows = useMemo(() => companies.filter((company) => {
    const missing = Array.isArray(company.missing_fields) ? company.missing_fields : [];
    return safe(company.company_name).toLowerCase().includes(search.toLowerCase()) && (missing.length > 0 || safe(company.verification_status) !== 'Verified');
  }).sort((a, b) => safe(a.priority).localeCompare(safe(b.priority)) || Number(b.lead_score ?? 0) - Number(a.lead_score ?? 0)), [companies, search]);
  const update = async (row: SimpleRow, values: Record<string, string | number | null>, notice: string) => { await simpleCrud.update('companies', row.id, values); setMessage(notice); await load(); };

  return <CRMPage title="استكمال البيانات" description="طابور قانوني يبدأ بـ Priority A ثم B، ولا يحفظ أي معلومة غير موثقة.">
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">متوقف مؤقتاً — حصة البحث الخارجي غير متاحة. البحث اليدوي والبيانات المحفوظة يعملان بصورة طبيعية.</p>
    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث عن شركة" className="w-full rounded-xl border p-3" />
    {message && <p className="rounded-xl bg-emerald-50 p-3 text-emerald-700">{message}</p>}
    {loading ? <p className="p-8 text-center">جارٍ التحميل...</p> : <div className="grid gap-3">{rows.map((row) => {
      const name = safe(row.company_name);
      const query = encodeURIComponent(name);
      const missing = Array.isArray(row.missing_fields) ? row.missing_fields.map(safe).filter(Boolean) : [];
      const searches = [
        ['Google الشركة', `https://www.google.com/search?q=${query}`],
        ['LinkedIn الشركة', `https://www.linkedin.com/search/results/companies/?keywords=${query}`],
        ['مسؤول المشتريات', `https://www.google.com/search?q=${query}+procurement+manager`],
        ['مسؤول المشاريع', `https://www.google.com/search?q=${query}+projects+manager`],
        ['LinkedIn المشتريات', `https://www.google.com/search?q=site%3Alinkedin.com%2Fin+${query}+procurement`],
        ['LinkedIn المشاريع', `https://www.google.com/search?q=site%3Alinkedin.com%2Fin+${query}+projects`],
        ['تسجيل الموردين', `https://www.google.com/search?q=${query}+vendor+supplier+contractor+registration+prequalification`],
      ];
      return <article key={row.id} className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{name}</h3><p className="text-sm text-[#6f6044]">Priority {safe(row.priority)} · {safe(row.lead_score)}/100 · اكتمال {safe(row.data_completeness)}%</p><p className="mt-1 text-xs text-red-700">الناقص: {missing.join('، ') || 'التحقق من المصدر'}</p></div><span className="rounded-full bg-[#f8efe0] px-3 py-1 text-xs">{safe(row.data_quality_status)}</span></div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">{external(row.website) && <a target="_blank" rel="noreferrer" href={external(row.website)} className="rounded-full border px-3 py-2">الموقع الرسمي</a>}{searches.map(([label, href]) => <a key={label} target="_blank" rel="noreferrer" href={href} className="rounded-full border px-3 py-2">{label}</a>)}<Link href={`/contacts?company=${row.id}`} className="rounded-full border px-3 py-2">إضافة جهة اتصال</Link><Link href={`/companies/${row.id}`} className="rounded-full border px-3 py-2">ملف الشركة</Link></div>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]"><input defaultValue={safe(row.vendor_registration_url)} placeholder="رابط تسجيل المورد/المقاول" onBlur={(event) => void update(row, { vendor_registration_url: event.target.value, vendor_registration_status: event.target.value ? 'Available' : safe(row.vendor_registration_status) }, 'تم حفظ رابط التسجيل.')} className="rounded-xl border p-2 text-xs" /><select value={safe(row.vendor_registration_status) || 'Not Checked'} onChange={(event) => void update(row, { vendor_registration_status: event.target.value }, 'تم تحديث حالة التسجيل.')} className="rounded-xl border p-2 text-xs">{vendorStatuses.map((status) => <option key={status}>{status}</option>)}</select><button onClick={() => void update(row, { verification_status: 'Verified', verified_at: new Date().toISOString() }, `تم توثيق مراجعة ${name}.`)} className="rounded-full bg-[#2f2417] px-3 py-2 text-xs text-white">تم التحقق</button></div>
      </article>;
    })}{rows.length === 0 && <p className="p-8 text-center text-[#6f6044]">لا توجد شركات تحتاج استكمالاً.</p>}</div>}
  </CRMPage>;
}
