'use client';
export const dynamic = 'force-dynamic';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';
import { CRMPage } from '../../components/crm-shell';
import { LaborProjectsPanel } from '../../components/labor-projects-panel';

const TABLE = 'labor';

const TRADES = [
  'حداد مسلح',
  'نجار مسلح',
  'سباك',
  'كهربائي',
  'دهان',
  'مبلط وجبس',
  'لحّام',
  'عامل خرسانة',
  'سائق معدات',
  'مشرف عمالة',
  'عامل عام',
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

type ImportRow = {
  company_name: string;
  trade: string;
  contact_name: string;
  phone: string;
  email: string;
  city: string;
  scope: string;
};

const IMPORT_HEADER_HINTS = ['الاسم', 'name', 'اسم العامل'];

/** يفصل سطرًا بـ Tab (لصق من Excel) أو بفاصلة/فاصلة منقوطة (CSV) مع دعم الاقتباس */
function splitImportLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim());
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',' || c === ';') {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** يقرأ نصًا ملصوقًا من Excel أو محتوى CSV إلى صفوف عمالة. الترتيب: الاسم، المهنة، المسؤول، الجوال، البريد، المدينة، النطاق */
function parseLaborImport(text: string): ImportRow[] {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== '');
  if (!lines.length) return [];
  const rows = lines.map(splitImportLine);
  const looksLikeHeader = rows[0].some((c) =>
    IMPORT_HEADER_HINTS.some((hint) => c.toLowerCase().includes(hint.toLowerCase())),
  );
  const dataRows = looksLikeHeader ? rows.slice(1) : rows;
  return dataRows
    .map((cols) => ({
      company_name: (cols[0] || '').trim(),
      trade: (cols[1] || '').trim(),
      contact_name: (cols[2] || '').trim(),
      phone: (cols[3] || '').trim(),
      email: (cols[4] || '').trim(),
      city: (cols[5] || '').trim(),
      scope: (cols[6] || '').trim(),
    }))
    .filter((r) => r.company_name);
}

const CSV_TEMPLATE_HEADER = 'الاسم,المهنة,اسم المسؤول,الجوال,البريد الإلكتروني,المدينة,نطاق العمل';
const CSV_TEMPLATE_EXAMPLE = 'محمد عبدالله,حداد مسلح,محمد عبدالله,0555xxxxxx,mohammed@example.com,الدمام,حديد تسليح خرساني';

/** يولّد ملف CSV نموذج للتحميل — صف عناوين + صف مثال، بترميز يدعم العربي في Excel */
function downloadLaborCsvTemplate() {
  const csv = '﻿' + CSV_TEMPLATE_HEADER + '\n' + CSV_TEMPLATE_EXAMPLE + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'قالب-العمالة.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function LaborPage() {
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
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [movingId, setMovingId] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
      setError(e instanceof Error ? e.message : 'تعذر تحميل العمالة.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  /** التخصصات الموجودة فعلًا في البيانات — لا نعرض فلترًا فارغًا */
    const presentTrades = useMemo(() => {
    const set = new Set(rows.map((r) => safe(r.trade)).filter(Boolean));
    const known: string[] = TRADES.filter((t) => set.has(t));
    return [...known, ...[...set].filter((t) => !known.includes(t))];
  }, [rows]);

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
      setError('الاسم مطلوب.');
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

  function onImportFile(file: File | undefined) {
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImportText(String(reader.result || ''));
    reader.onerror = () => setError('تعذرت قراءة الملف.');
    reader.readAsText(file, 'utf-8');
  }

  function previewImport() {
    setError('');
    const parsed = parseLaborImport(importText);
    if (!parsed.length) {
      setError('لم يُعثر على صفوف صالحة. تأكد أن الاسم موجود في العمود الأول.');
      return;
    }
    setImportPreview(parsed);
  }

  async function runImport() {
    setImporting(true);
    setError('');
    try {
      const values = importPreview.map((r) => ({
        company_name: r.company_name,
        trade: r.trade || null,
        contact_name: r.contact_name || null,
        phone: r.phone || null,
        email: r.email || null,
        city: r.city || null,
        scope: r.scope || null,
        notes: null,
        is_active: true,
      }));
      await simpleCrud.createMany(TABLE, values);
      setImportText('');
      setImportFileName('');
      setImportPreview([]);
      setShowImport(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر استيراد العمالة.');
    } finally {
      setImporting(false);
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
        `حذف العامل "${safe(row.company_name)}" نهائيًا؟ لا يمكن التراجع.\n\nالأفضل عادةً "إيقاف" العامل بدل حذفه.`,
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

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visibleIds = filtered.map((r) => String(r.id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function bulkDelete() {
    const targets = filtered.filter((r) => selectedIds.has(String(r.id)));
    if (!targets.length) return;
    if (
      !confirm(
        `حذف ${targets.length} عامل نهائيًا؟ لا يمكن التراجع.\n\nالأفضل عادةً "إيقاف" العمالة بدل حذفها.`,
      )
    )
      return;
    setBulkDeleting(true);
    setError('');
    try {
      await Promise.all(targets.map((r) => simpleCrud.remove(TABLE, String(r.id))));
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حذف بعض العمالة المحددة.');
    } finally {
      setBulkDeleting(false);
    }
  }

  /** نقل عامل إلى قسم الموردين: ننسخ بياناته وروابط مشاريعه، ثم نحذفه من العمالة */
  async function moveToVendors(row: SimpleRow) {
    if (
      !confirm(`نقل "${safe(row.company_name)}" إلى قسم الموردين؟ سيُحذف من العمالة، وتنتقل معه روابط مشاريعه.`)
    )
      return;
    setError('');
    setMovingId(String(row.id));
    try {
      const created = await simpleCrud.create('vendors', {
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
      const links = await simpleCrud.listWhere('project_labor', 'labor_id', String(row.id));
      for (const link of links) {
        await simpleCrud.create('project_vendors', {
          project_id: link.project_id,
          vendor_id: created.id,
          role: safe(link.role),
          status: safe(link.status) || 'مبدئي',
          notes: safe(link.notes),
        });
      }
      await simpleCrud.remove(TABLE, String(row.id));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر نقل العامل إلى الموردين.');
    } finally {
      setMovingId('');
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
      title="العمالة"
      description="سجل العمالة: المهنة، بيانات التواصل، ونطاق العمل."
      action={
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-secondary"
            onClick={() => {
              setShowForm(false);
              setShowImport((v) => !v);
            }}
          >
            {showImport ? 'إغلاق الاستيراد' : 'استيراد عمالة'}
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              setShowImport(false);
              setDraft(EMPTY);
              setEditingId('');
              setShowForm((v) => !v);
            }}
          >
            {showForm ? 'إغلاق النموذج' : 'إضافة عامل'}
          </button>
        </div>
      }
    >
      {error && (
        <div className="rounded-xl border border-rose-400/60 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {showImport && (
        <section className={panel}>
          <h3 className="mb-2 text-base font-bold">استيراد عمالة بالجملة</h3>
          <p className="mb-3 text-xs text-[var(--nav-secondary)]">
            الأعمدة بالترتيب: الاسم، المهنة، اسم المسؤول، الجوال، البريد الإلكتروني، المدينة، نطاق العمل.
            الصف الأول اختياري كعناوين. الصق مباشرة من Excel (Tab) أو ارفع ملف CSV.
          </p>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-ghost" onClick={downloadLaborCsvTemplate}>
              تحميل نموذج CSV
            </button>
            <label className="btn-secondary cursor-pointer">
              رفع ملف CSV
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => onImportFile(e.target.files?.[0])}
              />
            </label>
            {importFileName && <span className="text-xs text-[var(--nav-secondary)]">{importFileName}</span>}
          </div>
          <textarea
            className={`${field} min-h-[140px] font-mono text-xs`}
            dir="ltr"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={'محمد عبدالله, حداد مسلح, محمد عبدالله, 0555xxxxxx, mohammed@example.com, الدمام, حديد تسليح خرساني'}
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button className="btn-primary" onClick={previewImport} disabled={!importText.trim()}>
              معاينة
            </button>
            {(importText.trim() || importPreview.length > 0) && (
              <button
                className="btn-secondary"
                onClick={() => {
                  setImportText('');
                  setImportFileName('');
                  setImportPreview([]);
                }}
              >
                مسح
              </button>
            )}
          </div>
          {importPreview.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold">{importPreview.length} عامل جاهز للاستيراد</p>
              <div className="max-h-64 overflow-auto rounded-xl border border-[var(--nav-border)]">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--nav-border)]">
                      <th className={th}>الاسم</th>
                      <th className={th}>المهنة</th>
                      <th className={th}>المسؤول</th>
                      <th className={th}>الجوال</th>
                      <th className={th}>المدينة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--nav-border)]/60">
                        <td className={td}>{r.company_name}</td>
                        <td className={td}>{r.trade || '—'}</td>
                        <td className={td}>{r.contact_name || '—'}</td>
                        <td className={td} dir="ltr">
                          {r.phone || '—'}
                        </td>
                        <td className={td}>{r.city || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn-primary mt-3" disabled={importing} onClick={() => void runImport()}>
                {importing ? 'جارٍ الاستيراد...' : `استيراد ${importPreview.length} عامل`}
              </button>
            </div>
          )}
        </section>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-3"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setDraft(EMPTY);
              setEditingId('');
              setShowForm(false);
              setError('');
            }
          }}
        >
        <section className={`crm-card max-h-[92vh] w-full max-w-3xl overflow-auto p-5`}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-base font-bold">
              {editingId ? 'تعديل بيانات العامل' : 'عامل جديد'}
            </h3>
            <button
              className="btn-ghost"
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

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={label}>الاسم *</label>
              <input
                className={field}
                value={draft.company_name}
                onChange={(e) => setDraft({ ...draft, company_name: e.target.value })}
                placeholder="اسم العامل أو مؤسسة توريد العمالة"
              />
            </div>
            <div>
              <label className={label}>المهنة</label>
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
              <label className={label}>نطاق العمل</label>
              <input
                className={field}
                value={draft.scope}
                onChange={(e) => setDraft({ ...draft, scope: e.target.value })}
                placeholder="مثال: أعمال حدادة مسلحة للقواعد والأعمدة"
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
                عامل نشط
              </label>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button className="btn-primary" onClick={() => void save()} disabled={saving}>
              {saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديل' : 'حفظ العامل'}
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
        </div>
      )}

      <section className={panel}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            className={`${field} max-w-sm`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم أو المدينة أو نطاق العمل..."
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
              {filtered.length} من {rows.length} عامل
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

        {selectedIds.size > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--nav-accent)]/40 bg-[var(--nav-accent)]/10 px-4 py-2.5">
            <span className="text-sm font-semibold">{selectedIds.size} محدد</span>
            <div className="flex gap-2">
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
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--nav-secondary)]">جارٍ التحميل...</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--nav-secondary)]">
            {rows.length === 0
              ? 'لا يوجد عمالة بعد. ابدأ بإضافة عامل.'
              : 'لا نتائج مطابقة للفلترة الحالية.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--nav-border)]">
                  <th className={`${th} w-10`}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label="تحديد كل العمالة الظاهرة"
                      className="h-4 w-4"
                    />
                  </th>
                  <th className={th}>الاسم</th>
                  <th className={th}>المسؤول</th>
                  <th className={th}>الجوال</th>
                  <th className={th}>المدينة</th>
                  <th className={th}>نطاق العمل</th>
                  <th className={th}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const id = String(row.id);
                  const active = row.is_active !== false;
                  const wa = waNumber(safe(row.phone));
                  const open = expandedId === id;

                  return (
                    <Fragment key={id}>
                      <tr
                        className={`border-b border-[var(--nav-border)]/60 ${active ? '' : 'opacity-50'}`}
                      >
                        <td className={td}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(id)}
                            onChange={() => toggleSelected(id)}
                            aria-label={`تحديد ${safe(row.company_name)}`}
                            className="h-4 w-4"
                          />
                        </td>
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
                          <button
                            className="mt-1 block text-xs font-semibold text-[var(--nav-secondary)] hover:underline"
                            onClick={() => setExpandedId(open ? '' : id)}
                          >
                            {open ? 'إخفاء التفاصيل' : 'تفاصيل أكثر'}
                          </button>
                        </td>
                        <td className={`${td} whitespace-nowrap`}>
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-lg border border-[var(--nav-accent)] px-2 py-1 text-xs font-semibold text-[var(--nav-accent)]"
                              onClick={() => setExpandedId(open ? '' : id)}
                            >
                              {open ? 'إغلاق الربط' : 'ربط بمشروع'}
                            </button>
                            <button className={iconBtn} onClick={() => edit(row)}>
                              تعديل
                            </button>
                            <button className={iconBtn} onClick={() => void toggleActive(row)}>
                              {active ? 'إيقاف' : 'تنشيط'}
                            </button>
                            <button
                              className={iconBtn}
                              disabled={movingId === id}
                              onClick={() => void moveToVendors(row)}
                            >
                              {movingId === id ? '...' : 'نقل إلى الموردين'}
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
                          <td className="px-3 pb-4 text-sm" colSpan={7}>
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
                            <div className="mt-3">
                              <LaborProjectsPanel laborId={id} />
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
