'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CRMPage } from './crm-shell';
import { supabaseCrm } from '../lib/supabase/crm';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

export type CrudField = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'company' | 'contact' | 'opportunity' | 'select'; options?: string[]; required?: boolean; defaultValue?: string | number };

type Props = { table: string; title: string; description: string; fields: CrudField[]; summaryField?: string };
const valueLabels: Record<string, string> = { Active: 'نشط', 'On Leave': 'في إجازة', Inactive: 'غير نشط', New: 'جديد', Contacted: 'تم التواصل' };
const displayValue = (value: unknown) => valueLabels[String(value ?? '')] ?? String(value ?? '—');

export function SimpleCrudPage({ table, title, description, fields, summaryField }: Props) {
  const emptyForm = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, String(field.defaultValue ?? '')])), [fields]);
  const [rows, setRows] = useState<SimpleRow[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; companyName: string }>>([]);
  const [contacts, setContacts] = useState<SimpleRow[]>([]);
  const [opportunities, setOpportunities] = useState<SimpleRow[]>([]);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<SimpleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setLoading(true);
    void Promise.all([simpleCrud.list(table), supabaseCrm.companies.list(), simpleCrud.list('contacts'), simpleCrud.list('opportunities')])
      .then(([items, companyItems, contactItems, opportunityItems]) => { setRows(items); setCompanies(companyItems); setContacts(contactItems); setOpportunities(opportunityItems); })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [table]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const payload: Record<string, string | number | null> = { ...form };
      for (const field of fields) {
        if (field.type === 'number') payload[field.key] = form[field.key].trim() ? Number(form[field.key]) : null;
        if ((field.type === 'date' || field.type === 'datetime-local') && !form[field.key]) payload[field.key] = null;
      }
      if (payload.company_id) payload.company_name = companies.find((company) => company.id === payload.company_id)?.companyName ?? '';
      if (editingId) {
        const updated = await simpleCrud.update(table, editingId, payload);
        setRows((items) => items.map((item) => item.id === editingId ? updated : item));
        setSuccess('تم حفظ التعديلات بنجاح.');
      } else {
        const created = await simpleCrud.create(table, payload);
        setRows((items) => [created, ...items]);
        setSelectedRow(created);
        setSuccess('تمت الإضافة بنجاح.');
      }
      setForm(emptyForm); setEditingId(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ البيانات.'); }
    finally { setSaving(false); }
  }

  function edit(row: SimpleRow) {
    setEditingId(row.id);
    setForm(Object.fromEntries(fields.map((field) => [field.key, String(row[field.key] ?? '').slice(0, field.type === 'datetime-local' ? 16 : undefined)])));
    setSuccess('');
  }

  const summary = useMemo(() => summaryField ? Object.entries(rows.reduce<Record<string, number>>((result, row) => { const label = String(row[summaryField] ?? 'غير محدد'); result[label] = (result[label] ?? 0) + 1; return result; }, {})).sort((a, b) => b[1] - a[1]) : [], [rows, summaryField]);

  async function remove(id: string) {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    setError('');
    try { await simpleCrud.remove(table, id); setRows((items) => items.filter((item) => item.id !== id)); setSuccess('تم الحذف بنجاح.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر الحذف.'); }
  }

  return (
    <CRMPage title={title} description={description}>
      {selectedRow ? <section className="crm-card p-4" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-[#9a742b]">تفاصيل السجل</p><h3 className="text-lg font-bold">{String(selectedRow.name || selectedRow.title || 'السجل المحدد')}</h3></div><button type="button" onClick={() => setSelectedRow(null)} className="btn-ghost">إغلاق التفاصيل</button></div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{fields.map((field) => <div key={field.key} className="rounded-xl border p-3"><dt className="text-xs text-[#75664d]">{field.label}</dt><dd className="mt-1 font-semibold">{displayValue(selectedRow[field.key])}</dd></div>)}</dl>
      </section> : null}
      {summaryField ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{summary.map(([label, count]) => <div key={label} className="crm-kpi"><p className="text-xs text-[#75664d]">{displayValue(label)}</p><strong className="mt-2 block text-2xl">{count}</strong></div>)}{!summary.length && !loading ? <div className="crm-empty sm:col-span-2 xl:col-span-5">لا توجد بيانات في المسار بعد.</div> : null}</div> : null}
      <form onSubmit={submit} className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => <label key={field.key} className="text-sm text-[#6f6044]">{field.label}
            {field.type === 'textarea' ? <textarea required={field.required} value={form[field.key] ?? ''} onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))} className="mt-1 min-h-24 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5" />
              : field.type === 'company' ? <select required={field.required} value={form[field.key] ?? ''} onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))} className="mt-1 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5"><option value="">اختر الشركة</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.companyName}</option>)}</select>
              : field.type === 'contact' ? <select required={field.required} value={form[field.key] ?? ''} onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))} className="mt-1 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5"><option value="">بدون جهة اتصال</option>{contacts.filter((contact) => !form.company_id || contact.company_id === form.company_id).map((contact) => <option key={contact.id} value={contact.id}>{String(contact.full_name || contact.name || 'جهة اتصال')}</option>)}</select>
              : field.type === 'opportunity' ? <select required={field.required} value={form[field.key] ?? ''} onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))} className="mt-1 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5"><option value="">بدون فرصة مرتبطة</option>{opportunities.filter((opportunity) => !form.company_id || opportunity.company_id === form.company_id).map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{String(opportunity.title || 'فرصة')}</option>)}</select>
              : field.type === 'select' ? <select required={field.required} value={form[field.key] ?? ''} onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))} className="mt-1 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5"><option value="">اختر</option>{field.options?.map((option) => <option key={option} value={option}>{displayValue(option)}</option>)}</select>
              : <input required={field.required} type={field.type ?? 'text'} value={form[field.key] ?? ''} onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))} className="mt-1 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5" />}
          </label>)}
        </div>
        <div className="mt-4 flex gap-2"><button disabled={saving} className="rounded-full bg-[#2f2417] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة'}</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-full border border-[#ead9b3] px-5 py-2.5 text-sm">إلغاء</button> : null}</div>
        {error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}{success ? <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-700">{success}</p> : null}
      </form>
      <div className="overflow-x-auto rounded-[24px] border border-[#ead9b3] bg-white p-3">{loading ? <p className="p-6 text-center text-[#6f6044]">جارٍ تحميل البيانات...</p> : rows.length === 0 ? <p className="p-6 text-center text-[#6f6044]">لا توجد بيانات بعد.</p> : <table className="min-w-full text-right text-sm"><thead><tr className="border-b border-[#ead9b3] text-[#9a7b2f]">{fields.slice(0, 6).map((field) => <th key={field.key} className="px-3 py-3">{field.label}</th>)}<th className="px-3 py-3">الإجراءات</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-[#f4ebd7]">{fields.slice(0, 6).map((field) => <td key={field.key} className="px-3 py-3">{field.type === 'company' ? companies.find((company) => company.id === row[field.key])?.companyName ?? '—' : field.type === 'contact' ? String(contacts.find((contact) => contact.id === row[field.key])?.full_name || '—') : field.type === 'opportunity' ? String(opportunities.find((opportunity) => opportunity.id === row[field.key])?.title || '—') : String(row[field.key] ?? '—')}</td>)}<td className="px-3 py-3"><div className="flex gap-2"><button onClick={() => setSelectedRow(row)} className="rounded-full border px-3 py-1.5">فتح</button><button onClick={() => edit(row)} className="rounded-full border px-3 py-1.5">تعديل</button><button onClick={() => void remove(row.id)} className="rounded-full border px-3 py-1.5 text-red-700">حذف</button></div></td></tr>)}</tbody></table>}</div>
    </CRMPage>
  );
}
