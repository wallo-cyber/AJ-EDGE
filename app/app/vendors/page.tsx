'use client';
export const dynamic = 'force-dynamic';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';
import { CRMPage } from '../../components/crm-shell';

const TABLE = 'vendors';

const TRADES = [
  'حفريات وأسفلت',
  'خرسانة وعظم',
  'بلوك وأرصفة',
  'دهانات',
  'جبس بورد',
  'زجاج وكلادينج',
  'سباكة',
  'كهرباء',
  'تكييف',
  'عزل',
  'ألمنيوم',
  'حديد وتسليح',
  'تأجير معدات',
  'مواد بناء',
  'مقاول عام',
  'أخرى',
] as const;

type Draft = {
  company_name: string;
  trade: string;
  contact_name: string;
  phone: string;
  email: string;
  city: string;
  scope: string;
  notes: string;
  is_active: boolean;
};

const EMPTY: Draft = {
  company_name: '',
  trade: '',
  contact_name: '',
  phone: '',
  email: '',
  city: '',
  scope: '',
  notes: '',
  is_active: true,
};

const safe = (v: unknown) => String(v ?? '').trim();

/** يحوّل أي صيغة جوال سعودي إلى 9665xxxxxxxx لرابط واتساب */
function waNumber(raw: string) {
  const d = safe(raw).replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('966')) return d;
  if (d.startsWith('0')) return '966' + d.slice(1);
  if (d.length === 9 && d.startsWith('5')) return '966' + d;
  return d;
}

export default function VendorsPage() {
  const [rows, setRows] = useState<SimpleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [tradeFilter, setTradeFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [expandedId, setExpandedId] = useState('');
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

  /** التخصصات الموجودة فعلًا في البيانات — لا نعرض فلترًا فارغًا */
const presentTrades = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const t = safe(r.trade);
      if (t) set.add(t);
    });
    const known: string[] = TRADES.filter((t) => set.has(t));
    return [...known, ...[...set].filter((t) => !known.includes(t))];
  }, [rows]);
    const known: string[] = TRADES.filter((t) => set.has(t));
    return [...known, ...[...set].filter((t) => !known.includes(t))];

  const filtered = useMemo(() => {
    const q = query.trim();
    return rows.filter((r) => {
      const active = r.is_active !== false;
      if (!showInactive && !active) return false;
      if (tradeFilter && safe(r.trade) !== tradeFilter) return false;
      if (!q) return true;
      return [r.company_name, r.trade, r.contact_name, r.city, r.scope, r.phone, r.email, r.notes]
        .map(safe)
        .join(' ')
        .includes(q);
    });
  }, [rows, query, tradeFilter, showInactive]);

  const inactiveCount = useMemo(
    () => rows.filter((r) => r.is_active === false).length,
    [rows],
  );

  async function save() {
    if (!draft.company_name.trim()) {
      setError('اسم الشركة مطلوب.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const values: Record<string, unknown> = {
        company_name: draft.company_name.trim(),
        trade: draft.trade || null,
        contact_name: draft.contact_name.trim() || null,
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        city: draft.city.trim() || null,
        scope: draft.scope.trim() || null,
        notes: draft.notes.trim() || null,
        is_active: draft.is_active,
      };
      if (editingId) {
        values.updated_at = new Date().toISOString();
        await simpleCrud.update(TABLE, editingId, values);
      } else {
        await simpleCrud.create(TABLE, values);
      }
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
      trade: safe(row.trade),
      contact_name: safe(row.contact_name),
      phone: safe(row.phone),
      email: safe(row.email),
      city: safe(row.city),
      scope: safe(row.scope),
      notes: safe(row.notes),
      is_active: row.is_active !== false,
    });
    setEditingId(String(row.id));
    setShowForm(true);
  }

  /** إيقاف/تنشيط بدل الحذف — لا نفقد السجل */
  async function toggleActive(row: SimpleRow) {
    setError('');
    const next = row.is_active === false;
    try {
      await simpleCrud.update(TABLE, String(row.id), {
        is_active: next,
        updated_at: new Date().toISOString(),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحديث الحالة.');
    }
  }

  async function remove(row: SimpleRow) {
    if (
      !confirm(
        `حذف المورد "${safe(row.company_name)}" نهائيًا؟ لا يمكن التراجع.\n\nالأفضل عادةً "إيقاف" المورد بدل حذفه.`,
      )
    )
      return;
    setError('');
    try {
      await simpleCrud.remove(TABLE, String(row.id));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الحذف.');
    }
  }

  // كل الأنماط تعتمد متغيرات الثيم — تعمل مع original و neon و teal
  const field =
    'w-full rounded-xl border border-[var(--nav-border)] bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--nav-secondary)] focus:border-[var(--nav-accent)]';
  const label = 'mb-1 block text-xs font-semibold text-[var(--nav-secondary)]';
  const panel = 'rounded-2xl border border-[var(--nav-border)] p-5';
  const th = 'px-3 py-3 text-right text-xs font-bold text-[var(--nav-secondary)]';
  const td = 'px-3 py-3 text-sm align-top';
  const chip = 'rounded-full border px-3 py-1 text-xs font-semibold transition';
  const chipOn = 'border-[var(--nav-accent)] text-[var(--nav-accent)]';
  const chipOff = 'border-[var(--nav-border)] text-[var(--nav-secondary)] hover:opacity-80';
  const iconBtn =
    'rounded-lg border border-[var(--nav-border)] px-2 py-1 text-xs font-semibold hover:border-[var(--nav-accent)]';

  return (
    <CRMPage
      title="الموردون"
      description="سجل الموردين ومقاولي الباطن: التخصص، بيانات التواصل، ونطاق الأعمال."
      action={
        <button
          className="btn-primary"
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
        <div className="rounded-xl border border-rose-400/60 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {showForm && (
        <section className={panel}>
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
              <label className={label}>التخصص</label>
              <select
                className={field}
                value={draft.trade}
                onChange={(e) => setDraft({ ...draft, trade: e.target.value })}
              >
                <option value="">— بلا تحديد —</option>
                {TRADES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
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
                placeholder="مثال: تنفيذ قواعد وأرضيات صناعية — خرسانة مسلحة"
              />
            </div>
            <div className="md:col-span-3">
              <label className={label}>ملاحظات</label>
              <textarea
                className={`${field} min-h-[80px]`}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="أسعار مرجعية، مشاريع سابقة، ملاحظات على الالتزام..."
              />
            </div>
            <div className="md:col-span-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                />
                مورد نشط
              </label>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button className="btn-primary" onClick={() => void save()} disabled={saving}>
              {saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديل' : 'حفظ المورد'}
            </button>
            <button
              className="btn-secondary"
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

      <section className={panel}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            className={`${field} max-w-sm`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم أو المدينة أو نطاق الأعمال..."
          />
          <div className="flex items-center gap-3">
            {inactiveCount > 0 && (
              <button
                className={`${chip} ${showInactive ? chipOn : chipOff}`}
                onClick={() => setShowInactive((v) => !v)}
              >
                {showInactive ? 'إخفاء الموقوفين' : `إظهار الموقوفين (${inactiveCount})`}
              </button>
            )}
            <span className="text-xs font-semibold text-[var(--nav-secondary)]">
              {filtered.length} من {rows.length} مورد
            </span>
          </div>
        </div>

        {presentTrades.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              className={`${chip} ${tradeFilter === '' ? chipOn : chipOff}`}
              onClick={() => setTradeFilter('')}
            >
              الكل
            </button>
            {presentTrades.map((t) => (
              <button
                key={t}
                className={`${chip} ${tradeFilter === t ? chipOn : chipOff}`}
                onClick={() => setTradeFilter(tradeFilter === t ? '' : t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--nav-secondary)]">جارٍ التحميل...</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--nav-secondary)]">
            {rows.length === 0
              ? 'لا يوجد موردون بعد. ابدأ بإضافة مورد.'
              : 'لا نتائج مطابقة للفلترة الحالية.'}
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
                  <th className={th}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const id = String(row.id);
                  const active = row.is_active !== false;
                  const wa = waNumber(safe(row.phone));
                  const open = expandedId === id;
                  const hasDetails = safe(row.email) || safe(row.notes);

                  return (
                    <Fragment key={id}>
                      <tr
                        className={`border-b border-[var(--nav-border)]/60 ${active ? '' : 'opacity-50'}`}
                      >
                        <td className={td}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{safe(row.company_name)}</span>
                            {!active && (
                              <span className="rounded-full border border-rose-400/60 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                                موقوف
                              </span>
                            )}
                          </div>
                          {safe(row.trade) && (
                            <div className="mt-1 text-xs text-[var(--nav-accent)]">
                              {safe(row.trade)}
                            </div>
                          )}
                        </td>
                        <td className={td}>{safe(row.contact_name) || '—'}</td>
                        <td className={td}>
                          {safe(row.phone) ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <a className="hover:underline" dir="ltr" href={`tel:${safe(row.phone)}`}>
                                {safe(row.phone)}
                              </a>
                              {wa && (
                                <a
                                  className={iconBtn}
                                  href={`https://wa.me/${wa}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  واتساب
                                </a>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className={td}>{safe(row.city) || '—'}</td>
                        <td className={`${td} max-w-xs`}>
                          {safe(row.scope) || '—'}
                          {hasDetails && (
                            <button
                              className="mt-1 block text-xs font-semibold text-[var(--nav-secondary)] hover:underline"
                              onClick={() => setExpandedId(open ? '' : id)}
                            >
                              {open ? 'إخفاء التفاصيل' : 'تفاصيل أكثر'}
                            </button>
                          )}
                        </td>
                        <td className={`${td} whitespace-nowrap`}>
                          <div className="flex flex-wrap gap-2">
                            <button className={iconBtn} onClick={() => edit(row)}>
                              تعديل
                            </button>
                            <button className={iconBtn} onClick={() => void toggleActive(row)}>
                              {active ? 'إيقاف' : 'تنشيط'}
                            </button>
                            <button
                              className="rounded-lg border border-rose-400/50 px-2 py-1 text-xs font-semibold text-rose-400 hover:border-rose-400"
                              onClick={() => void remove(row)}
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>

                      {open && (
                        <tr className="border-b border-[var(--nav-border)]/60">
                          <td className="px-3 pb-4 text-sm" colSpan={6}>
                            <div className="grid gap-3 md:grid-cols-2">
                              {safe(row.email) && (
                                <div>
                                  <div className={label}>البريد الإلكتروني</div>
                                  <a
                                    className="hover:underline"
                                    dir="ltr"
                                    href={`mailto:${safe(row.email)}`}
                                  >
                                    {safe(row.email)}
                                  </a>
                                </div>
                              )}
                              {safe(row.notes) && (
                                <div>
                                  <div className={label}>ملاحظات</div>
                                  <p className="whitespace-pre-wrap">{safe(row.notes)}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </CRMPage>
  );
}
