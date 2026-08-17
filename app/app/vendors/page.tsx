'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';

const TABLE = 'vendors';
const safe = (v: unknown) => String(v ?? '').trim();

type Draft = { company_name: string; contact_name: string; phone: string; city: string; scope: string };
const EMPTY: Draft = { company_name: '', contact_name: '', phone: '', city: '', scope: '' };

export default function VendorsPage() {
  const [rows, setRows] = useState<SimpleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try { setRows(await simpleCrud.list(TABLE)); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر تحميل الموردين.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.company_name, r.contact_name, r.city, r.scope, r.phone].map(safe).join(' ').includes(q));
  }, [rows, query]);

  const save = async () => {
    if (!draft.company_name.trim()) { setError('اسم الشركة مطلوب.'); return; }
    setSaving(true); setError('');
    try {
      const values = {
        company_name: draft.company_name.trim(),
        contact_name: draft.contact_name.trim() || null,
        phone: draft.phone.trim() || null,
        city: draft.city.trim() || null,
        scope: draft.scope.trim() || null,
      };
      if (editingId) await simpleCrud.update(TABLE, editingId, values);
      else await simpleCrud.create(TABLE, values);
      setDraft(EMPTY); setEditingId(''); setShowForm(false);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر الحفظ.'); }
    finally { setSaving(false); }
  };

  const edit = (row: SimpleRow) => {
    setDraft({
      company_name: safe(row.company_name), contact_name: safe(row.contact_name),
      phone: safe(row.phone), city: safe(row.city), scope: safe(row.scope),
    });
    setEditingId(row.id); setShowForm(true);
  };

  const remove = async (row: SimpleRow) => {
    if (!confirm(`حذف المورد "${safe(row.company_name)}"؟ لا يمكن التراجع.`)) return;
    setError('');
    try { await simpleCrud.remove(TABLE, row.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر الحذف.'); }
  };

  const field = 'w-full rounded-xl border border-[var(--nav-border)] bg-white/70 px-3 py-2 text-sm outline-none focus:border-[var(--nav-accent)]';
  const label = 'mb-1 block text-xs font-semibold text-[var(--nav-secondary)]';

  return (
    <CRMPage
      title="الموردون"
      description="سجل الموردين المعتمدين: بيانات التواصل، المدينة، ونطاق الأعمال الذي يغطيه كل مورد."
      action={
        <button
          className="rounded-xl bg-[#2f2417] px-4 py-2 text-sm font-bold text-[#fff8e8] hover:opacity-90"
          onClick={() => { setDraft(EMPTY); setEditingId(''); setShowForm((v) => !v); }}
        >
          {showForm ? 'إغلاق النموذج' : 'إضافة مورد'}
        </button>
      }
    >
      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {showForm && (
        <section className="rounded-2xl border border-[var(--nav-border)] bg-white/60 p-5">
          <h3 className="mb-4 text-base font-bold">{editingId ? 'تعديل بيانات المورد' : 'مورد جديد'}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              <span className={label}>اسم الشركة *</span>
              <input className={field} value={draft.company_name}
                     onChange={(e) => setDraft({ ...draft, company_name: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className={label}>اسم المسؤول</span>
              <input className={field} value={draft.contact_name}
                     onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className={label}>رقم الجوال</span>
              <input className={field} dir="ltr" placeholder="+9665…" value={draft.phone}
                     onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className={label}>المدينة</span>
              <input className={field} value={draft.city}
                     onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className={label}>الأعمال التي يقوم بها</span>
              <input className={field} placeholder="مثال: توريد وتركيب أنظمة إطفاء الحريق"
                     value={draft.scope}
                     onChange={(e) => setDraft({ ...draft, scope: e.target.value })} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-xl bg-[#2f2417] px-4 py-2 text-sm font-bold text-[#fff8e8] hover:opacity-90 disabled:opacity-50"
                    onClick={() => void save()} disabled={saving}>
              {saving ? 'جارٍ الحفظ…' : editingId ? 'حفظ التعديل' : 'إضافة المورد'}
            </button>
            <button className="btn-ghost"
                    onClick={() => { setShowForm(false); setEditingId(''); setDraft(EMPTY); }}>إلغاء</button>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input className={`${field} max-w-md`} value={query} onChange={(e) => setQuery(e.target.value)}
               placeholder="ابحث باسم الشركة أو المدينة أو نوع الأعمال" />
        <span className="text-sm text-[var(--nav-secondary)]">{filtered.length} مورد</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--nav-border)]">
        <table className="w-full min-w-[760px] text-right text-sm">
          <thead className="bg-[#f5ecdb]/70 text-xs text-[var(--nav-secondary)]">
            <tr>
              <th className="px-4 py-3 font-bold">الشركة</th>
              <th className="px-4 py-3 font-bold">المسؤول</th>
              <th className="px-4 py-3 font-bold">الجوال</th>
              <th className="px-4 py-3 font-bold">المدينة</th>
              <th className="px-4 py-3 font-bold">الأعمال</th>
              <th className="px-4 py-3 font-bold">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-[#8a7a5c]">جارٍ التحميل…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[#8a7a5c]">
                {rows.length === 0 ? 'لم يُضف أي مورد بعد.' : 'لا نتائج مطابقة للبحث.'}
              </td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-[var(--nav-border)] hover:bg-[#f5ecdb]/40">
                <td className="px-4 py-3 font-bold">{safe(r.company_name)}</td>
                <td className="px-4 py-3 text-[#6f6044]">{safe(r.contact_name) || '—'}</td>
                <td className="px-4 py-3" dir="ltr">
                  {safe(r.phone)
                    ? <a className="font-medium underline-offset-2 hover:underline" href={`tel:${safe(r.phone)}`}>{safe(r.phone)}</a>
                    : <span className="text-[#a4967c]">—</span>}
                </td>
                <td className="px-4 py-3 text-[#6f6044]">{safe(r.city) || '—'}</td>
                <td className="px-4 py-3 text-[#6f6044]">{safe(r.scope) || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button className="btn-ghost px-3 py-1 text-xs" onClick={() => edit(r)}>تعديل</button>
                    <button className="rounded-lg border border-rose-300 px-3 py-1 text-xs text-rose-600 hover:bg-rose-50"
                            onClick={() => void remove(r)}>حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CRMPage>
  );
}
