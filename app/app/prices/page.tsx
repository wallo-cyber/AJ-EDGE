'use client';
export const dynamic = 'force-dynamic';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';
import { CRMPage } from '../../components/crm-shell';

const TABLE = 'vendor_prices';
const VENDOR_TABLE = 'vendors';

const UNITS = [
  'م٢',
  'م٣',
  'م.ط',
  'طن',
  'كجم',
  'لتر',
  'عدد',
  'يوم',
  'شهر',
  'مقطوعية',
] as const;

const SOURCES = ['عرض سعر مكتوب', 'واتساب', 'مكالمة', 'زيارة', 'تقدير مبدئي'] as const;

/** بعد هذه المدة يُعتبر السعر قديمًا ويُعلَّم */
const STALE_DAYS = 180;

type Draft = {
  vendor_id: string;
  item: string;
  unit: string;
  price: string;
  quoted_at: string;
  source: string;
  notes: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const EMPTY: Draft = {
  vendor_id: '',
  item: '',
  unit: '',
  price: '',
  quoted_at: todayISO(),
  source: '',
  notes: '',
};

const safe = (v: unknown) => String(v ?? '').trim();
const norm = (v: unknown) => safe(v).replace(/\s+/g, ' ').toLowerCase();

const toNum = (v: unknown) => {
  const n = Number(String(v ?? '').replace(/[, ]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

const money = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function daysSince(d: unknown) {
  const t = Date.parse(safe(d));
  if (!Number.isFinite(t)) return NaN;
  return Math.floor((Date.now() - t) / 86400000);
}

type Group = {
  key: string;
  item: string;
  unit: string;
  quotes: SimpleRow[];
  min: number;
  max: number;
  avg: number;
  minVendor: string;
  spread: number;
  stale: boolean;
};

export default function PricesPage() {
  const [rows, setRows] = useState<SimpleRow[]>([]);
  const [vendors, setVendors] = useState<SimpleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [tradeFilter, setTradeFilter] = useState('');
  const [expandedKey, setExpandedKey] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [priceData, vendorData] = await Promise.all([
        simpleCrud.list(TABLE),
        simpleCrud.list(VENDOR_TABLE),
      ]);
      setRows(priceData);
      setVendors(vendorData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل الأسعار.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const vendorById = useMemo(() => {
    const map = new Map<string, SimpleRow>();
    vendors.forEach((v) => map.set(String(v.id), v));
    return map;
  }, [vendors]);

  const activeVendors = useMemo(
    () =>
      vendors
        .filter((v) => v.is_active !== false)
        .sort((a, b) => safe(a.company_name).localeCompare(safe(b.company_name), 'ar')),
    [vendors],
  );

  const vendorName = (id: unknown) => safe(vendorById.get(String(id))?.company_name) || 'مورد محذوف';
  const vendorTrade = (id: unknown) => safe(vendorById.get(String(id))?.trade);

  /** التخصصات التي فيها أسعار فعلًا */
  const presentTrades = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const t = vendorTrade(r.vendor_id);
      if (t) set.add(t);
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'ar'));
  }, [rows, vendorById]);

  /** أسماء البنود المستخدمة سابقًا — لتوحيد الكتابة عند الإدخال */
  const itemSuggestions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const i = safe(r.item);
      if (i) set.add(i);
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'ar'));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim();
    return rows.filter((r) => {
      if (tradeFilter && vendorTrade(r.vendor_id) !== tradeFilter) return false;
      if (!q) return true;
      return [r.item, r.unit, r.notes, r.source, vendorName(r.vendor_id)]
        .map(safe)
        .join(' ')
        .includes(q);
    });
  }, [rows, query, tradeFilter, vendorById]);

  /** تجميع العروض حسب البند + الوحدة، مع أقل ومتوسط وأعلى سعر */
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, { item: string; unit: string; quotes: SimpleRow[] }>();
    filtered.forEach((r) => {
      const key = `${norm(r.item)}|${norm(r.unit)}`;
      const g = map.get(key);
      if (g) g.quotes.push(r);
      else map.set(key, { item: safe(r.item), unit: safe(r.unit), quotes: [r] });
    });

    return [...map.entries()]
      .map(([key, g]) => {
        const priced = g.quotes
          .map((q) => ({ q, n: toNum(q.price) }))
          .filter((x) => Number.isFinite(x.n) && x.n > 0)
          .sort((a, b) => a.n - b.n);

        const nums = priced.map((x) => x.n);
        const min = nums.length ? nums[0] : NaN;
        const max = nums.length ? nums[nums.length - 1] : NaN;
        const avg = nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : NaN;

        const allStale = g.quotes.every((q) => {
          const d = daysSince(q.quoted_at);
          return Number.isFinite(d) && d > STALE_DAYS;
        });

        return {
          key,
          item: g.item,
          unit: g.unit,
          quotes: [...g.quotes].sort((a, b) => toNum(a.price) - toNum(b.price)),
          min,
          max,
          avg,
          minVendor: priced.length ? vendorName(priced[0].q.vendor_id) : '',
          spread: Number.isFinite(min) && min > 0 ? ((max - min) / min) * 100 : NaN,
          stale: allStale,
        };
      })
      .sort((a, b) => a.item.localeCompare(b.item, 'ar'));
  }, [filtered, vendorById]);

  const stats = useMemo(() => {
    const quoting = new Set(rows.map((r) => String(r.vendor_id)));
    return {
      items: new Set(rows.map((r) => `${norm(r.item)}|${norm(r.unit)}`)).size,
      quotes: rows.length,
      vendors: quoting.size,
    };
  }, [rows]);

  async function save() {
    if (!draft.vendor_id) {
      setError('اختر المورد.');
      return;
    }
    if (!draft.item.trim()) {
      setError('اسم البند مطلوب.');
      return;
    }
    const price = toNum(draft.price);
    if (!Number.isFinite(price) || price <= 0) {
      setError('أدخل سعرًا صحيحًا أكبر من صفر.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const values: Record<string, unknown> = {
        vendor_id: draft.vendor_id,
        item: draft.item.trim(),
        unit: draft.unit || null,
        price,
        quoted_at: draft.quoted_at || todayISO(),
        source: draft.source || null,
        notes: draft.notes.trim() || null,
      };
      if (editingId) {
        values.updated_at = new Date().toISOString();
        await simpleCrud.update(TABLE, editingId, values);
      } else {
        await simpleCrud.create(TABLE, values);
      }
      // نُبقي المورد والبند لتسريع إدخال عدة أسعار متتابعة
      setDraft((d) => ({ ...EMPTY, vendor_id: editingId ? '' : d.vendor_id }));
      setEditingId('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الحفظ.');
    } finally {
      setSaving(false);
    }
  }

  function edit(row: SimpleRow) {
    setDraft({
      vendor_id: String(row.vendor_id ?? ''),
      item: safe(row.item),
      unit: safe(row.unit),
      price: safe(row.price),
      quoted_at: safe(row.quoted_at).slice(0, 10) || todayISO(),
      source: safe(row.source),
      notes: safe(row.notes),
    });
    setEditingId(String(row.id));
    setShowForm(true);
  }

  async function remove(row: SimpleRow) {
    if (!confirm(`حذف تسعيرة "${safe(row.item)}" من ${vendorName(row.vendor_id)}؟`)) return;
    setError('');
    try {
      await simpleCrud.remove(TABLE, String(row.id));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الحذف.');
    }
  }

  // نفس أنماط صفحة الموردين — تعتمد متغيرات الثيم
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
      title="بنك الأسعار المرجعية"
      description="أسعار البنود من الموردين: أقل وأعلى ومتوسط سعر لكل بند، لتسعير العطاءات من مصدر حقيقي."
      action={
        <button
          className="btn-primary"
          onClick={() => {
            setDraft(EMPTY);
            setEditingId('');
            setShowForm((v) => !v);
          }}
        >
          {showForm ? 'إغلاق النموذج' : 'إضافة تسعيرة'}
        </button>
      }
    >
      {error && (
        <div className="rounded-xl border border-rose-400/60 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {!loading && vendors.length === 0 && (
        <div className="rounded-xl border border-amber-400/60 px-4 py-3 text-sm text-amber-400">
          لا يوجد موردون بعد. أضف موردين أولًا من صفحة الموردين، ثم سجّل أسعارهم هنا.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { k: 'بند مسعّر', v: stats.items },
          { k: 'عرض سعر', v: stats.quotes },
          { k: 'مورد مسعِّر', v: stats.vendors },
        ].map((s) => (
          <div key={s.k} className={panel}>
            <div className="text-2xl font-bold text-[var(--nav-accent)]">{s.v}</div>
            <div className="mt-1 text-xs font-semibold text-[var(--nav-secondary)]">{s.k}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <section className={panel}>
          <h3 className="mb-4 text-base font-bold">
            {editingId ? 'تعديل التسعيرة' : 'تسعيرة جديدة'}
          </h3>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={label}>المورد *</label>
              <select
                className={field}
                value={draft.vendor_id}
                onChange={(e) => setDraft({ ...draft, vendor_id: e.target.value })}
              >
                <option value="">— اختر المورد —</option>
                {activeVendors.map((v) => (
                  <option key={String(v.id)} value={String(v.id)}>
                    {safe(v.company_name)}
                    {safe(v.trade) ? ` — ${safe(v.trade)}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={label}>البند *</label>
              <input
                className={field}
                list="price-items"
                value={draft.item}
                onChange={(e) => setDraft({ ...draft, item: e.target.value })}
                placeholder="مثال: خرسانة مسلحة للقواعد شاملة الحديد والصب"
              />
              <datalist id="price-items">
                {itemSuggestions.map((i) => (
                  <option key={i} value={i} />
                ))}
              </datalist>
              <p className="mt-1 text-[11px] text-[var(--nav-secondary)]">
                اكتب البند بالصيغة نفسها كل مرة — القائمة تقترح ما سجّلته سابقًا حتى تتجمّع العروض
                تحت بند واحد.
              </p>
            </div>

            <div>
              <label className={label}>الوحدة</label>
              <select
                className={field}
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              >
                <option value="">— بلا تحديد —</option>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={label}>السعر (ريال) *</label>
              <input
                className={field}
                dir="ltr"
                inputMode="decimal"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className={label}>تاريخ التسعير</label>
              <input
                className={field}
                dir="ltr"
                type="date"
                value={draft.quoted_at}
                onChange={(e) => setDraft({ ...draft, quoted_at: e.target.value })}
              />
            </div>

            <div>
              <label className={label}>المصدر</label>
              <select
                className={field}
                value={draft.source}
                onChange={(e) => setDraft({ ...draft, source: e.target.value })}
              >
                <option value="">— بلا تحديد —</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={label}>ملاحظات</label>
              <input
                className={field}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="شروط السعر: شامل التوريد؟ حد أدنى للكمية؟ مدة السريان؟"
              />
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button className="btn-primary" onClick={() => void save()} disabled={saving}>
              {saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديل' : 'حفظ التسعيرة'}
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
              إغلاق
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
            placeholder="بحث بالبند أو المورد أو الملاحظات..."
          />
          <span className="text-xs font-semibold text-[var(--nav-secondary)]">
            {groups.length} بند
          </span>
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
        ) : groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--nav-secondary)]">
            {rows.length === 0
              ? 'لا توجد أسعار بعد. سجّل أول تسعيرة بعد أول مكالمة مع مورد.'
              : 'لا نتائج مطابقة للفلترة الحالية.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--nav-border)]">
                  <th className={th}>البند</th>
                  <th className={th}>الوحدة</th>
                  <th className={th}>عروض</th>
                  <th className={th}>أقل سعر</th>
                  <th className={th}>المتوسط</th>
                  <th className={th}>أعلى سعر</th>
                  <th className={th}>الفارق</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const open = expandedKey === g.key;
                  return (
                    <Fragment key={g.key}>
                      <tr
                        className="cursor-pointer border-b border-[var(--nav-border)]/60 hover:opacity-80"
                        onClick={() => setExpandedKey(open ? '' : g.key)}
                      >
                        <td className={`${td} max-w-sm`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{g.item}</span>
                            {g.stale && (
                              <span className="rounded-full border border-amber-400/60 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                                قديم
                              </span>
                            )}
                          </div>
                          {g.minVendor && (
                            <div className="mt-1 text-xs text-[var(--nav-secondary)]">
                              الأقل: {g.minVendor}
                            </div>
                          )}
                        </td>
                        <td className={td}>{g.unit || '—'}</td>
                        <td className={td}>{g.quotes.length}</td>
                        <td className={`${td} font-semibold text-emerald-400`} dir="ltr">
                          {Number.isFinite(g.min) ? money(g.min) : '—'}
                        </td>
                        <td className={td} dir="ltr">
                          {Number.isFinite(g.avg) ? money(g.avg) : '—'}
                        </td>
                        <td className={td} dir="ltr">
                          {Number.isFinite(g.max) ? money(g.max) : '—'}
                        </td>
                        <td className={td} dir="ltr">
                          {Number.isFinite(g.spread) && g.spread > 0
                            ? `${g.spread.toFixed(0)}%`
                            : '—'}
                        </td>
                      </tr>

                      {open && (
                        <tr className="border-b border-[var(--nav-border)]/60">
                          <td className="px-3 pb-4" colSpan={7}>
                            <div className="grid gap-2">
                              {g.quotes.map((q) => {
                                const age = daysSince(q.quoted_at);
                                return (
                                  <div
                                    key={String(q.id)}
                                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--nav-border)] px-3 py-2 text-sm"
                                  >
                                    <div className="min-w-[180px]">
                                      <div className="font-semibold">
                                        {vendorName(q.vendor_id)}
                                      </div>
                                      <div className="text-xs text-[var(--nav-secondary)]">
                                        {safe(q.source) || 'مصدر غير محدد'}
                                        {safe(q.quoted_at) && ` · ${safe(q.quoted_at).slice(0, 10)}`}
                                        {Number.isFinite(age) && age > STALE_DAYS && ' · قديم'}
                                      </div>
                                    </div>

                                    <div className="font-bold text-[var(--nav-accent)]" dir="ltr">
                                      {money(toNum(q.price))} {g.unit ? `/ ${g.unit}` : ''}
                                    </div>

                                    {safe(q.notes) && (
                                      <div className="flex-1 text-xs text-[var(--nav-secondary)]">
                                        {safe(q.notes)}
                                      </div>
                                    )}

                                    <div className="flex gap-2">
                                      <button className={iconBtn} onClick={() => edit(q)}>
                                        تعديل
                                      </button>
                                      <button
                                        className="rounded-lg border border-rose-400/50 px-2 py-1 text-xs font-semibold text-rose-400 hover:border-rose-400"
                                        onClick={() => void remove(q)}
                                      >
                                        حذف
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
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
