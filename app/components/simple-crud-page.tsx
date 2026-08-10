'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CRMPage } from './crm-shell';
import { supabaseCrm } from '../lib/supabase/crm';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

export type CrudField = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'company' | 'select'; options?: string[]; required?: boolean };

type Props = { table: string; title: string; description: string; fields: CrudField[] };

export function SimpleCrudPage({ table, title, description, fields }: Props) {
  const emptyForm = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, ''])), [fields]);
  const [rows, setRows] = useState<SimpleRow[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; companyName: string }>>([]);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setLoading(true);
    void Promise.all([simpleCrud.list(table), supabaseCrm.companies.list()])
      .then(([items, companyItems]) => { setRows(items); setCompanies(companyItems); })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [table]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const payload: Record<string, string | number | null> = { ...form };
      for (const field of fields) {
        if (field.type === 'number') payload[field.key] = Number(form[field.key] || 0);
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

  async function remove(id: string) {
    setError('');
    try { await simpleCrud.remove(table, id); setRows((items) => items.filter((item) => item.id !== id)); setSuccess('تم الحذف بنجاح.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر الحذف.'); }
  }

  return (
    <CRMPage title={title} description={description}>
      <form onSubmit={submit} className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => <label key={field.key} className="text-sm text-[#6f6044]">{field.label}
            {field.type === 'textarea' ? <textarea required={field.required} value={form[field.key] ?? ''} onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))} className="mt-1 min-h-24 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5" />
              : field.type === 'company' ? <select required={field.required} value={form[field.key] ?? ''} onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))} className="mt-1 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5"><option value="">اختر الشركة</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.companyName}</option>)}</select>
              : field.type === 'select' ? <select required={field.required} value={form[field.key] ?? ''} onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))} className="mt-1 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5"><option value="">اختر</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>
              : <input required={field.required} type={field.type ?? 'text'} value={form[field.key] ?? ''} onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))} className="mt-1 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5" />}
          </label>)}
        </div>
        <div className="mt-4 flex gap-2"><button disabled={saving} className="rounded-full bg-[#2f2417] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة'}</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-full border border-[#ead9b3] px-5 py-2.5 text-sm">إلغاء</button> : null}</div>
        {error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}{success ? <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-700">{success}</p> : null}
      </form>
      <div className="overflow-x-auto rounded-[24px] border border-[#ead9b3] bg-white p-3">{loading ? <p className="p-6 text-center text-[#6f6044]">جارٍ تحميل البيانات...</p> : rows.length === 0 ? <p className="p-6 text-center text-[#6f6044]">لا توجد بيانات بعد.</p> : <table className="min-w-full text-right text-sm"><thead><tr className="border-b border-[#ead9b3] text-[#9a7b2f]">{fields.slice(0, 5).map((field) => <th key={field.key} className="px-3 py-3">{field.label}</th>)}<th className="px-3 py-3">الإجراءات</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-[#f4ebd7]">{fields.slice(0, 5).map((field) => <td key={field.key} className="px-3 py-3">{field.type === 'company' ? companies.find((company) => company.id === row[field.key])?.companyName ?? '—' : String(row[field.key] ?? '—')}</td>)}<td className="px-3 py-3"><div className="flex gap-2"><button onClick={() => edit(row)} className="rounded-full border px-3 py-1.5">تعديل</button><button onClick={() => void remove(row.id)} className="rounded-full border px-3 py-1.5 text-red-700">حذف</button></div></td></tr>)}</tbody></table>}</div>
    </CRMPage>
  );
}
