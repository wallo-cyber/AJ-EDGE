'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CRMPage } from '../../components/crm-shell';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';

const safe = (value: unknown) => String(value ?? '').trim();
const statuses = ['Not Checked', 'Portal Found', 'Preparing', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Renewal Required'];

export default function VendorRegistrationPage() {
  const [rows, setRows] = useState<SimpleRow[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('الكل');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const load = () => simpleCrud.list('companies').then(setRows).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => rows.filter((row) => {
    const status = safe(row.vendor_registration_status) || (row.vendor_registration_url ? 'Portal Found' : 'Not Checked');
    return (filter === 'الكل' || status === filter) && `${safe(row.company_name)} ${safe(row.city)} ${safe(row.company_type)}`.toLowerCase().includes(query.trim().toLowerCase());
  }).sort((a, b) => safe(a.priority).localeCompare(safe(b.priority)) || Number(b.lead_score ?? 0) - Number(a.lead_score ?? 0)), [filter, query, rows]);
  const save = async (row: SimpleRow, values: Record<string, unknown>) => {
    try { await simpleCrud.update('companies', row.id, { ...values, vendor_registration_last_checked: new Date().toISOString() }); setNotice('تم حفظ حالة التسجيل في Supabase.'); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر الحفظ.'); }
  };
  return <CRMPage title="تسجيل الموردين" description="إدارة بوابات التسجيل والإجراءات اليدوية بدون إرسال أو تسجيل خارجي تلقائي.">
    {notice ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}{error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <div className="crm-card grid gap-3 p-4 md:grid-cols-[1fr_260px]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث باسم الشركة أو المدينة" className="rounded-xl border bg-white p-3"/><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border bg-white p-3"><option value="الكل">كل الحالات</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>
    {loading ? <div className="crm-empty animate-pulse">جارٍ تحميل سجلات الموردين...</div> : <div className="grid gap-4 lg:grid-cols-2">{visible.map((row) => <article key={row.id} className="crm-card p-4"><div className="flex items-start justify-between gap-3"><div><Link href={`/companies/${row.id}`} className="font-bold hover:text-[#9a742b]">{safe(row.company_name)}</Link><p className="mt-1 text-xs text-[#75664d]">Priority {safe(row.priority) || 'C'} · {safe(row.company_type)} · {safe(row.city)}</p></div><span className="crm-chip bg-amber-50 text-amber-800">{safe(row.vendor_registration_status) || (row.vendor_registration_url ? 'Portal Found' : 'Not Checked')}</span></div><div className="mt-4 grid gap-3"><input defaultValue={safe(row.vendor_registration_url)} onBlur={(event) => void save(row, { vendor_registration_url: event.target.value, vendor_registration_status: event.target.value ? 'Portal Found' : 'Not Checked' })} placeholder="رابط بوابة التسجيل الرسمية" className="rounded-xl border p-2.5 text-sm"/><select defaultValue={safe(row.vendor_registration_status) || 'Not Checked'} onChange={(event) => void save(row, { vendor_registration_status: event.target.value })} className="rounded-xl border p-2.5 text-sm">{statuses.map((status) => <option key={status}>{status}</option>)}</select><textarea defaultValue={safe(row.vendor_registration_requirements)} onBlur={(event) => void save(row, { vendor_registration_requirements: event.target.value })} placeholder="المستندات والمتطلبات المؤكدة" className="min-h-20 rounded-xl border p-2.5 text-sm"/><input defaultValue={safe(row.vendor_registration_account_status)} onBlur={(event) => void save(row, { vendor_registration_account_status: event.target.value })} placeholder="مرجع اسم المستخدم فقط — لا تحفظ كلمة المرور" className="rounded-xl border p-2.5 text-sm"/><input defaultValue={safe(row.vendor_registration_next_action)} onBlur={(event) => void save(row, { vendor_registration_next_action: event.target.value })} placeholder="الإجراء التالي أو موعد التجديد" className="rounded-xl border p-2.5 text-sm"/><textarea defaultValue={safe(row.vendor_registration_notes)} onBlur={(event) => void save(row, { vendor_registration_notes: event.target.value })} placeholder="ملاحظات" className="min-h-20 rounded-xl border p-2.5 text-sm"/></div></article>)}{!visible.length && <div className="crm-empty lg:col-span-2">لا توجد سجلات مطابقة.</div>}</div>}
  </CRMPage>;
}
