'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';
// ↓↓ تحقّق من هذا السطر: افتح app/companies/page.tsx وانسخ منه سطر استيراد CRMPage كما هو ↓↓
import { CRMPage } from '../../components/crm-shell';

const TABLE = 'vendors';

type Draft = {
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  city: string;
  scope: string;
  notes: string;
};

const EMPTY: Draft = {
  company_name: '',
  contact_name: '',
  phone: '',
  email: '',
  city: '',
  scope: '',
  notes: '',
};

const safe = (v: unknown) => String(v ?? '').trim();

export default function VendorsPage() {
  const [rows, setRows] = useState<SimpleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await simpleCrud.list(TABLE);
      const sorted = [...data].sort((a, b) =>
        safe(b.created_at).localeCompare(safe(a.created_at)),
      );
      setRows(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل الموردين.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.company_name, r.contact_name, r.city, r.scope, r.phone, r.email, r.notes]
        .map(safe)
        .join(' ')
        .includes(q),
    );
  }, [rows, query]);

  async function save() {
    if (!draft.company_name.trim()) {
      setError('اسم الشركة مطلوب.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const values = {
        company_name: draft.company_name.trim(),
        contact_name: draft.contact_name.trim() || null,
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        city: draft.city.trim() || null,
        scope: draft.scope.trim() || null,
        notes: draft.notes.trim() || null,
      };
      if (editingId) await simpleCrud.update(TABLE, editingId, values);
      else await simpleCrud.create(TABLE, values);
      setDraft(EMPTY);
      setEditingId('');
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الحفظ.');
    } finally {
      setSaving(false);
    }
  }

  function edit(row: SimpleRow) {
    setDraft({
      company_name: safe(row.company_name),
      contact_name: safe(row.contact_name),
      phone: safe(row.phone),
      email: safe(row.email),
      city: safe(row.city),
      scope: safe(row.scope),
      notes: safe(row.notes),
    });
    setEditingId(String(row.id));
    setShowForm(true);
  }

  async function remove(row: SimpleRow) {
    if (!confirm(`حذف المورد "${safe(row.company_name)}"؟ لا يمكن التراجع.`)) return;
    setError('');
    try {
      await simpleCrud.remove(TABLE, String(row.id));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الحذف.');
    }
  }

  const field =
    'w-full rounded-xl border border-[var(--nav-border)] bg-white/70 px-3 py-2 text-sm outline-none focus:border-[var(--nav-accent)]';
  const label = 'mb-1 block text-xs font-semibold text-[var(--nav-secondary)]';
  const th = 'px-4 py-3 text-right text-xs font-bold text-[var(--nav-secondary)]';
  const td = 'px-4 py-3 text-sm align-top';

  return (
    <CRMPage
      title="الموردون"
      description="سجل الموردين المعتمدين: بيانات التواصل، المدينة، ونطاق الأعمال الذي يغطيه كل مورد."
      action={
        <button
          className="rounded-xl bg-[#2f2417] px-4 py-2 text-sm font-bold text-[#fff8e8] hover:opacity-90"
          onClick={() => {
            setDraft(EMPTY);
            setEditingId('');
            setShowForm((v) => !v);
          }}
        >
          {showForm ? 'إغلاق النموذج' : 'إضافة مورد'}
        </button>
      }
    >
      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {showForm && (
        <section className="rounded-2xl border border-[var(--nav-border)] bg-white/60 p-5">
          <h3 className="mb-4 text-base font-bold">
            {editingId ? 'تعديل بيانات المورد' : 'مورد جديد'}
          </h3>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={label}>اسم الشركة *</label>
              <input
                className={field}
                value={draft.company_name}
                onChange={(e) => setDraft({ ...draft, company_name: e.target.value })}
                placeholder="مؤسسة / شركة ..."
              />
            </div>
            <div>
              <label className={label}>اسم المسؤول</label>
              <input
                className={field}
                value={draft.contact_name}
                onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })}
                placeholder="الاسم"
              />
            </div>
            <div>
              <label className={label}>الجوال</label>
              <input
                className={field}
                dir="ltr"
                inputMode="tel"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                placeholder="05xxxxxxxx"
              />
            </div>
            <div>
              <label className={label}>البريد الإلكتروني</label>
              <input
                className={field}
                dir="ltr"
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className={label}>المدينة</label>
              <input
                className={field}
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                placeholder="الدمام"
              />
            </div>
            <div className="md:col-span-3">
              <label className={label}>نطاق الأعمال</label>
              <input
                className={field}
                value={draft.scope}
                onChange={(e) => setDraft({ ...draft, scope: e.target.value })}
                placeholder="مثال: أعمال خرسانة وحفريات — تنفيذ قواعد وأرضيات صناعية"
              />
            </div>
            <div className="md:col-span-3">
              <label className={label}>ملاحظات</label>
              <textarea
                className={`${field} min-h-[80px]`}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="أسعار، مشاريع سابقة، تقييم..."
              />
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              className="rounded-xl bg-[#2f2417] px-5 py-2 text-sm font-bold text-[#fff8e8] hover:opacity-90 disabled:opacity-50"
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديل' : 'حفظ المورد'}
            </button>
            <button
              className="rounded-xl border border-[var(--nav-border)] px-5 py-2 text-sm font-semibold hover:bg-black/5"
              onClick={() => {
                setDraft(EMPTY);
                setEditingId('');
                setShowForm(false);
                setError('');
              }}
            >
              إلغاء
            </button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[var(--nav-border)] bg-white/60 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            className={`${field} max-w-sm`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم أو المدينة أو نطاق الأعمال..."
          />
          <span className="text-xs font-semibold text-[var(--nav-secondary)]">
            {filtered.length} مورد
          </span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--nav-secondary)]">جارٍ التحميل...</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--nav-secondary)]">
            {rows.length === 0 ? 'لا يوجد موردون بعد. ابدأ بإضافة مورد.' : 'لا نتائج مطابقة للبحث.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--nav-border)]">
                  <th className={th}>الشركة</th>
                  <th className={th}>المسؤول</th>
                  <th className={th}>الجوال</th>
                  <th className={th}>المدينة</th>
                  <th className={th}>نطاق الأعمال</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={String(row.id)} className="border-b border-[var(--nav-border)]/60">
                    <td className={`${td} font-semibold`}>{safe(row.company_name)}</td>
                    <td className={td}>{safe(row.contact_name) || '—'}</td>
                    <td className={td} dir="ltr">
                      {safe(row.phone) ? (
                        <a className="hover:underline" href={`tel:${safe(row.phone)}`}>
                          {safe(row.phone)}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={td}>{safe(row.city) || '—'}</td>
                    <td className={`${td} max-w-xs`}>{safe(row.scope) || '—'}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      <button
                        className="text-xs font-semibold text-[var(--nav-accent)] hover:underline"
                        onClick={() => edit(row)}
                      >
                        تعديل
                      </button>
                      <button
                        className="mr-3 text-xs font-semibold text-rose-600 hover:underline"
                        onClick={() => void remove(row)}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </CRMPage>
  );
}
