'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';
import { CRMPage } from '../../components/crm-shell';

const TABLE = 'email_contacts';
const CONTACTS_TABLE = 'contacts';

const safe = (v: unknown) => String(v ?? '').trim();

export default function EmailContactsPage() {
  const [rows, setRows] = useState<SimpleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [promotingId, setPromotingId] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await simpleCrud.list(TABLE);
      const sorted = [...data].sort((a, b) => safe(a.full_name).localeCompare(safe(b.full_name), 'ar'));
      setRows(sorted);
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل الجهات البريدية.');
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
      [r.full_name, r.email, r.company_name].map(safe).join(' ').includes(q),
    );
  }, [rows, query]);

  const visibleIds = filtered.map((r) => String(r.id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }
  async function removeOne(id: string) {
    if (!confirm('حذف هذه الجهة البريدية نهائيًا؟')) return;
    setError('');
    try {
      await simpleCrud.remove(TABLE, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الحذف.');
    }
  }
  async function bulkDelete() {
    if (!selectedIds.size) return;
    if (!confirm(`حذف ${selectedIds.size} جهة بريدية نهائيًا؟`)) return;
    setBulkDeleting(true);
    setError('');
    try {
      await Promise.all([...selectedIds].map((id) => simpleCrud.remove(TABLE, id)));
      setNotice(`تم حذف ${selectedIds.size} جهة.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حذف بعض الجهات المحددة.');
    } finally {
      setBulkDeleting(false);
    }
  }

  /** ينقل جهة إلى جهات الاتصال الرئيسية بعد إدخال رقمها، ويحذفها من هنا */
  async function promote(row: SimpleRow) {
    const phone = phoneDraft.trim();
    if (!phone) {
      setError('أدخل رقم الجوال قبل النقل.');
      return;
    }
    setError('');
    try {
      await simpleCrud.create(CONTACTS_TABLE, {
        full_name: safe(row.full_name),
        email: safe(row.email) || null,
        company_name: safe(row.company_name) || null,
        phone,
        source: safe(row.source) || null,
      });
      await simpleCrud.remove(TABLE, String(row.id));
      setNotice(`تم نقل "${safe(row.full_name)}" إلى جهات الاتصال.`);
      setPromotingId('');
      setPhoneDraft('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر النقل.');
    }
  }

  const field =
    'w-full rounded-xl border border-[var(--nav-border)] bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--nav-secondary)] focus:border-[var(--nav-accent)]';
  const panel = 'rounded-2xl border border-[var(--nav-border)] p-5';
  const th = 'px-3 py-3 text-right text-xs font-bold text-[var(--nav-secondary)]';
  const td = 'px-3 py-3 text-sm align-top';
  const iconBtn =
    'rounded-lg border border-[var(--nav-border)] px-2 py-1 text-xs font-semibold hover:border-[var(--nav-accent)]';

  return (
    <CRMPage
      title="الجهات البريدية"
      description="جهات اتصال لها بريد إلكتروني بلا رقم جوال — منفصلة عن جهات الاتصال الرئيسية حتى يُضاف رقمها."
    >
      {error && (
        <div className="rounded-xl border border-rose-400/60 px-4 py-3 text-sm text-rose-400">{error}</div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-400/60 px-4 py-3 text-sm text-emerald-400">{notice}</div>
      )}

      <section className={panel}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            className={`${field} max-w-sm`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم أو البريد أو الشركة..."
          />
          <span className="text-xs font-semibold text-[var(--nav-secondary)]">
            {filtered.length} من {rows.length} جهة
          </span>
        </div>

        {filtered.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--nav-accent)]/40 bg-[var(--nav-accent)]/10 px-4 py-2.5">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="h-4 w-4" />
              تحديد الكل ({filtered.length})
            </label>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{selectedIds.size} محدد</span>
                <button className={iconBtn} onClick={() => setSelectedIds(new Set())}>
                  إلغاء التحديد
                </button>
                <button
                  className="rounded-lg border border-rose-400/50 px-2 py-1 text-xs font-semibold text-rose-400 hover:border-rose-400"
                  disabled={bulkDeleting}
                  onClick={() => void bulkDelete()}
                >
                  {bulkDeleting ? 'جارٍ الحذف...' : 'حذف المحدد'}
                </button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--nav-secondary)]">جارٍ التحميل...</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--nav-secondary)]">
            {rows.length === 0 ? 'لا توجد جهات بريدية.' : 'لا نتائج مطابقة للبحث.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--nav-border)]">
                  <th className={`${th} w-10`}>
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="h-4 w-4" />
                  </th>
                  <th className={th}>الاسم</th>
                  <th className={th}>البريد</th>
                  <th className={th}>الشركة</th>
                  <th className={th}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const id = String(row.id);
                  const promoting = promotingId === id;
                  return (
                    <tr key={id} className="border-b border-[var(--nav-border)]/60">
                      <td className={td}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(id)}
                          onChange={() => toggleSelected(id)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className={`${td} font-semibold`}>{safe(row.full_name) || '—'}</td>
                      <td className={td} dir="ltr">
                        {safe(row.email) ? (
                          <a className="hover:underline" href={`mailto:${safe(row.email)}`}>
                            {safe(row.email)}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={td}>{safe(row.company_name) || '—'}</td>
                      <td className={`${td} whitespace-nowrap`}>
                        {promoting ? (
                          <div className="flex flex-wrap gap-2">
                            <input
                              className={`${field} w-36`}
                              dir="ltr"
                              placeholder="05xxxxxxxx"
                              value={phoneDraft}
                              onChange={(e) => setPhoneDraft(e.target.value)}
                            />
                            <button className="btn-primary" onClick={() => void promote(row)}>
                              نقل
                            </button>
                            <button
                              className={iconBtn}
                              onClick={() => {
                                setPromotingId('');
                                setPhoneDraft('');
                              }}
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              className={iconBtn}
                              onClick={() => {
                                setPromotingId(id);
                                setPhoneDraft('');
                                setError('');
                              }}
                            >
                              أضف رقمًا وانقل
                            </button>
                            <button
                              className="rounded-lg border border-rose-400/50 px-2 py-1 text-xs font-semibold text-rose-400 hover:border-rose-400"
                              onClick={() => void removeOne(id)}
                            >
                              حذف
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
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