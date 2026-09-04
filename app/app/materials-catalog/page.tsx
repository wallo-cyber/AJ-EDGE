'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';
import { CRMPage } from '../../components/crm-shell';

const TABLE = 'materials_catalog';

const CATEGORIES = [
  'أعمال إنشائية',
  'أعمال ميكانيكية',
  'أعمال كهربائية',
  'أعمال تشطيبات',
  'أعمال مكافحة الحريق والإنذار',
] as const;

const UNCATEGORIZED = 'غير مصنف';

/** ترجمة أسماء التصنيفات — تُستعمل فقط حين تكون الواجهة بالإنجليزية */
const CATEGORY_EN: Record<string, string> = {
  'أعمال إنشائية': 'Structural Works',
  'أعمال ميكانيكية': 'Mechanical Works',
  'أعمال كهربائية': 'Electrical Works',
  'أعمال تشطيبات': 'Finishing Works',
  'أعمال مكافحة الحريق والإنذار': 'Fire Fighting & Alarm',
  'أعمال ترابية وأساسات': 'Earthworks & Foundations',
  'الأبواب والنوافذ والواجهات': 'Doors, Windows & Facades',
  'الأرضيات والحوائط': 'Flooring & Walls',
  'الأعمال الخارجية والتسليم': 'External Works & Handover',
  'الأعمال الصحية': 'Plumbing',
  'الإنارة والتحكم': 'Lighting & Controls',
  'التكييف والتهوية': 'HVAC',
  'التيار الخفيف والأمن': 'Low Current & Security',
  'الدهانات والكسوات': 'Paints & Claddings',
  'العزل والأسقف': 'Insulation & Roofing',
  'القواطع والأسقف المستعارة': 'Partitions & Ceilings',
  'القوى الكهربائية': 'Electrical Power',
  'الهيكل الخرساني والمعدني': 'Concrete & Steel Structure',
  'تمهيد وتجهيز الموقع': 'Site Preparation',
  'مكافحة الحريق': 'Fire Protection',
  [UNCATEGORIZED]: 'Uncategorized',
};
const catLabel = (c: string, lang: 'ar' | 'en') => (lang === 'en' ? CATEGORY_EN[c] || c : c);

/** نصوص واجهة الصفحة بلغتين */
const UI = {
  ar: {
    title: 'دليل البنود',
    description:
      'قائمة موحّدة لبنود الأعمال حسب التصنيف — بلا أسعار. عند استيراد ملف تسعير من صفحة أسعار المواد، يُطابَق كل بند تلقائيًا مع الدليل هنا، وأي بند غير موجود يُنشأ ويُعلَّم بعلامة «جديد» للمراجعة.',
    addItem: 'إضافة بند',
    closeForm: 'إغلاق النموذج',
    searchPlaceholder: 'بحث بالبند أو التصنيف...',
    itemsCount: (n: number) => `${n} بند`,
    all: 'الكل',
    newOnly: 'جديد فقط',
    selectAll: 'تحديد كل البنود الظاهرة',
    selected: (n: number) => `${n} محدد`,
    clearSelection: 'إلغاء التحديد',
    bulkDelete: 'حذف المحدد',
    bulkDeleting: 'جارٍ الحذف...',
    loading: 'جارٍ التحميل...',
    emptyNone: 'لا توجد بنود بعد. أضف بندًا أو استورد قائمة.',
    emptyFiltered: 'لا نتائج مطابقة للفلترة الحالية.',
    thCode: 'الكود',
    thItem: 'البند',
    thCategory: 'التصنيف',
    thUnit: 'الوحدة',
    langToggle: 'English',
  },
  en: {
    title: 'Materials Catalog',
    description:
      'A unified list of work items by category — prices excluded. When a pricing file is imported from the Materials Prices page, each item is matched automatically against this catalog; unmatched items are created and flagged "New" for review.',
    addItem: 'Add Item',
    closeForm: 'Close Form',
    searchPlaceholder: 'Search by item or category...',
    itemsCount: (n: number) => `${n} items`,
    all: 'All',
    newOnly: 'New only',
    selectAll: 'Select all visible items',
    selected: (n: number) => `${n} selected`,
    clearSelection: 'Clear selection',
    bulkDelete: 'Delete selected',
    bulkDeleting: 'Deleting...',
    loading: 'Loading...',
    emptyNone: 'No items yet. Add one or import a list.',
    emptyFiltered: 'No results match the current filter.',
    thCode: 'Code',
    thItem: 'Item',
    thCategory: 'Category',
    thUnit: 'Unit',
    langToggle: 'العربية',
  },
} as const;

type Draft = {
  code: string;
  category: string;
  item: string;
  unit: string;
  notes: string;
};

const EMPTY: Draft = { code: '', category: '', item: '', unit: '', notes: '' };

const safe = (v: unknown) => String(v ?? '').trim();
const norm = (v: unknown) => safe(v).replace(/\s+/g, ' ').toLowerCase();

type ImportRow = { category: string; item: string; unit: string; notes: string };

const IMPORT_HEADER_HINTS = ['التصنيف', 'category', 'البند', 'item'];

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

/** يقرأ نصًا ملصوقًا من Excel أو محتوى CSV إلى صفوف بنود. الترتيب: التصنيف، البند، الوحدة، ملاحظات */
function parseCatalogImport(text: string): ImportRow[] {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== '');
  if (!lines.length) return [];
  const rows = lines.map(splitImportLine);
  const looksLikeHeader = rows[0].some((c) =>
    IMPORT_HEADER_HINTS.some((hint) => c.toLowerCase().includes(hint.toLowerCase())),
  );
  const dataRows = looksLikeHeader ? rows.slice(1) : rows;
  return dataRows
    .map((cols) => ({
      category: (cols[0] || '').trim(),
      item: (cols[1] || '').trim(),
      unit: (cols[2] || '').trim(),
      notes: (cols[3] || '').trim(),
    }))
    .filter((r) => r.item);
}

const CSV_TEMPLATE_HEADER = 'التصنيف,البند,الوحدة,ملاحظات';
const CSV_TEMPLATE_EXAMPLE = 'أعمال إنشائية,خرسانة مسلحة للقواعد شاملة الحديد والصب,م٣,';

function downloadCsvTemplate() {
  const csv = '﻿' + CSV_TEMPLATE_HEADER + '\n' + CSV_TEMPLATE_EXAMPLE + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'قالب-دليل-البنود.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function MaterialsCatalogPage() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const t = UI[lang];
  const [rows, setRows] = useState<SimpleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [onlyNew, setOnlyNew] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [mergingId, setMergingId] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const [merging, setMerging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await simpleCrud.list(TABLE);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل دليل البنود.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const presentCategories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const c = safe(r.category);
      set.add(c || UNCATEGORIZED);
    });
    CATEGORIES.forEach((c) => set.add(c));
    const known = CATEGORIES.filter((c) => set.has(c));
    const extra = [...set].filter((c) => !known.includes(c as (typeof CATEGORIES)[number]) && c !== UNCATEGORIZED).sort((a, b) => a.localeCompare(b, 'ar'));
    const hasUncategorized = rows.some((r) => !safe(r.category));
    return [...known, ...extra, ...(hasUncategorized ? [UNCATEGORIZED] : [])];
  }, [rows]);

  /** يعيد اسم/وصف البند بلغة الواجهة الحالية، مع رجوع للعربي إن كانت الترجمة فارغة */
const itemLabel = (r: SimpleRow, lang: 'ar' | 'en') =>
  lang === 'en' ? safe(r.item_en) || safe(r.item) : safe(r.item);
const descLabel = (r: SimpleRow, lang: 'ar' | 'en') =>
  lang === 'en' ? safe(r.notes_en) || safe(r.notes) : safe(r.notes);

const filtered = useMemo(() => {
    const q = query.trim();
    return rows.filter((r) => {
      const cat = safe(r.category) || UNCATEGORIZED;
      if (categoryFilter && cat !== categoryFilter) return false;
      if (onlyNew && r.is_new !== true) return false;
      if (!q) return true;
      return [r.item, r.item_en, r.code, r.unit, r.notes, r.notes_en, cat].map(safe).join(' ').includes(q);
    });
  }, [rows, query, categoryFilter, onlyNew]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => safe(a.item).localeCompare(safe(b.item), 'ar')),
    [filtered],
  );

  const newCount = useMemo(() => rows.filter((r) => r.is_new === true).length, [rows]);

  /** تصنيفات مقترحة لحقل إدخال التصنيف — الخمسة الأساسية + أي تصنيف أُنشئ فعلًا (بدون «غير مصنف») */
  const categorySuggestions = useMemo(
    () => presentCategories.filter((c) => c !== UNCATEGORIZED),
    [presentCategories],
  );

  async function save() {
    if (!draft.item.trim()) {
      setError('اسم البند مطلوب.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const values: Record<string, unknown> = {
        code: draft.code.trim() || null,
        category: draft.category || '',
        item: draft.item.trim(),
        unit: draft.unit || null,
        notes: draft.notes.trim() || null,
      };
      if (editingId) {
        await simpleCrud.update(TABLE, editingId, values);
      } else {
        await simpleCrud.create(TABLE, { ...values, is_new: false });
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
      code: safe(row.code),
      category: safe(row.category),
      item: safe(row.item),
      unit: safe(row.unit),
      notes: safe(row.notes),
    });
    setEditingId(String(row.id));
    setShowForm(true);
    setShowImport(false);
  }

  async function approve(row: SimpleRow) {
    setError('');
    try {
      await simpleCrud.update(TABLE, String(row.id), { is_new: false });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الاعتماد.');
    }
  }

  async function remove(row: SimpleRow) {
    if (!confirm(`حذف البند "${safe(row.item)}" من الدليل؟ (لن يمسّ التسعيرات المرتبطة به، بس يفك ربطها)`))
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

  const visibleIds = sorted.map((r) => String(r.id));
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
    const targets = sorted.filter((r) => selectedIds.has(String(r.id)));
    if (!targets.length) return;
    if (
      !confirm(
        `حذف ${targets.length} بند من الدليل؟ (لن يمسّ التسعيرات المرتبطة، بس يفك ربطها)`,
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
      setError(e instanceof Error ? e.message : 'تعذر حذف بعض البنود المحددة.');
    } finally {
      setBulkDeleting(false);
    }
  }

  async function runMerge(row: SimpleRow) {
    const targetId = mergeTarget;
    if (!targetId || targetId === String(row.id)) {
      setError('اختر بندًا آخر تنقل إليه.');
      return;
    }
    const target = rows.find((r) => String(r.id) === targetId);
    if (!target) return;
    setMerging(true);
    setError('');
    try {
      await simpleCrud.updateWhere('vendor_prices', 'catalog_item_id', String(row.id), {
        catalog_item_id: targetId,
        item: safe(target.item),
      });
      await simpleCrud.remove(TABLE, String(row.id));
      setMergingId('');
      setMergeTarget('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر نقل البند.');
    } finally {
      setMerging(false);
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
    const parsed = parseCatalogImport(importText);
    if (!parsed.length) {
      setError('لم يُعثر على صفوف صالحة. تأكد أن اسم البند موجود في العمود الثاني.');
      return;
    }
    setImportPreview(parsed);
  }

  async function runImport() {
    if (!importPreview.length) return;
    setImporting(true);
    setError('');
    try {
      const existingKeys = new Set(rows.map((r) => norm(r.item)));
      const seen = new Set<string>();
      const values = importPreview
        .filter((r) => {
          const key = norm(r.item);
          if (existingKeys.has(key) || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((r) => ({
          category: r.category || '',
          item: r.item,
          unit: r.unit || null,
          notes: r.notes || null,
          is_new: false,
        }));
      if (values.length) await simpleCrud.createMany(TABLE, values);
      setImportText('');
      setImportFileName('');
      setImportPreview([]);
      setShowImport(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر استيراد البنود.');
    } finally {
      setImporting(false);
    }
  }

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
      title={t.title}
      description={t.description}
      action={
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-secondary"
            onClick={() => {
              setShowForm(false);
              setShowImport((v) => !v);
            }}
          >
            {showImport ? 'إغلاق الاستيراد' : 'استيراد بنود'}
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
            {showForm ? t.closeForm : t.addItem}
          </button>
          <button
            className="btn-ghost"
            onClick={() => setLang((v) => (v === 'ar' ? 'en' : 'ar'))}
            title="Toggle language / تبديل اللغة"
          >
            {t.langToggle}
          </button>
        </div>
      }
    >
      {error && (
        <div className="rounded-xl border border-rose-400/60 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className={panel}>
          <div className="text-2xl font-bold text-[var(--nav-accent)]">{rows.length}</div>
          <div className="mt-1 text-xs font-semibold text-[var(--nav-secondary)]">بند بالدليل</div>
        </div>
        <div className={panel}>
          <div className="text-2xl font-bold text-amber-400">{newCount}</div>
          <div className="mt-1 text-xs font-semibold text-[var(--nav-secondary)]">
            بند جديد بانتظار المراجعة
          </div>
        </div>
      </div>

      {showImport && (
        <section className={panel}>
          <h3 className="mb-2 text-base font-bold">استيراد بنود بالجملة</h3>
          <p className="mb-3 text-xs text-[var(--nav-secondary)]">
            الأعمدة بالترتيب: التصنيف، البند، الوحدة، ملاحظات (بلا أسعار). الصف الأول اختياري
            كعناوين. البنود المطابقة لاسم موجود فعلًا بالدليل تُتجاهل تلقائيًا.
          </p>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-ghost" onClick={downloadCsvTemplate}>
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
            {importFileName && (
              <span className="text-xs text-[var(--nav-secondary)]">{importFileName}</span>
            )}
          </div>
          <textarea
            className={`${field} min-h-[140px] font-mono text-xs`}
            dir="ltr"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={'أعمال إنشائية, خرسانة مسلحة للقواعد شاملة الحديد والصب, م٣'}
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
              <p className="mb-2 text-sm font-semibold">{importPreview.length} بند بالمعاينة</p>
              <div className="max-h-64 overflow-auto rounded-xl border border-[var(--nav-border)]">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--nav-border)]">
                      <th className={th}>التصنيف</th>
                      <th className={th}>البند</th>
                      <th className={th}>الوحدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--nav-border)]/60">
                        <td className={td}>{r.category || '—'}</td>
                        <td className={td}>{r.item}</td>
                        <td className={td}>{r.unit || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn-primary mt-3" disabled={importing} onClick={() => void runImport()}>
                {importing ? 'جارٍ الاستيراد...' : `استيراد ${importPreview.length} بند`}
              </button>
            </div>
          )}
        </section>
      )}

      {showForm && (
        <section className={panel}>
          <h3 className="mb-4 text-base font-bold">{editingId ? 'تعديل البند' : 'بند جديد'}</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={label}>الكود</label>
              <input
                className={field}
                dir="ltr"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                placeholder="PRE-001"
              />
            </div>
            <div>
              <label className={label}>التصنيف</label>
              <input
                className={field}
                list="catalog-categories"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="اختر تصنيفًا أو اكتب تصنيفًا جديدًا"
              />
              <datalist id="catalog-categories">
                {categorySuggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="mt-1 text-[11px] text-[var(--nav-secondary)]">
                اختر من المقترحات أو اكتب اسم تصنيف جديد غير موجود — يُنشأ تلقائيًا ويظهر بعدها
                ضمن أزرار التصنيفات بالأسفل.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className={label}>البند *</label>
              <input
                className={field}
                value={draft.item}
                onChange={(e) => setDraft({ ...draft, item: e.target.value })}
                placeholder="مثال: خرسانة مسلحة للقواعد شاملة الحديد والصب"
              />
            </div>
            <div>
              <label className={label}>الوحدة</label>
              <input
                className={field}
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                placeholder="م٣، م٢، عدد..."
              />
            </div>
            <div className="md:col-span-2">
              <label className={label}>ملاحظات</label>
              <input
                className={field}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button className="btn-primary" onClick={() => void save()} disabled={saving}>
              {saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديل' : 'حفظ البند'}
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
            placeholder={t.searchPlaceholder}
          />
          <span className="text-xs font-semibold text-[var(--nav-secondary)]">
            {t.itemsCount(sorted.length)}
          </span>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            className={`${chip} ${categoryFilter === '' ? chipOn : chipOff}`}
            onClick={() => setCategoryFilter('')}
          >
            {t.all}
          </button>
          {presentCategories.map((c) => (
            <button
              key={c}
              className={`${chip} ${categoryFilter === c ? chipOn : chipOff}`}
              onClick={() => setCategoryFilter(categoryFilter === c ? '' : c)}
            >
              {catLabel(c, lang)}
            </button>
          ))}
          <button
            className={`${chip} ${onlyNew ? 'border-amber-400 text-amber-400' : chipOff}`}
            onClick={() => setOnlyNew((v) => !v)}
          >
            {t.newOnly}
          </button>
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--nav-accent)]/40 bg-[var(--nav-accent)]/10 px-4 py-2.5">
            <span className="text-sm font-semibold">{t.selected(selectedIds.size)}</span>
            <div className="flex gap-2">
              <button className={iconBtn} onClick={() => setSelectedIds(new Set())}>
                {t.clearSelection}
              </button>
              <button
                className="rounded-lg border border-rose-400/50 px-2 py-1 text-xs font-semibold text-rose-400 hover:border-rose-400"
                disabled={bulkDeleting}
                onClick={() => void bulkDelete()}
              >
                {bulkDeleting ? t.bulkDeleting : t.bulkDelete}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--nav-secondary)]">{t.loading}</p>
        ) : sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--nav-secondary)]">
            {rows.length === 0 ? t.emptyNone : t.emptyFiltered}
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
                      aria-label={t.selectAll}
                      className="h-4 w-4"
                    />
                  </th>
                  <th className={th}>{t.thCode}</th>
                  <th className={th}>{t.thItem}</th>
                  <th className={th}>{t.thCategory}</th>
                  <th className={th}>{t.thUnit}</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={String(r.id)} className="border-b border-[var(--nav-border)]/60">
                    <td className={td}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(String(r.id))}
                        onChange={() => toggleSelected(String(r.id))}
                        aria-label={`${lang === 'ar' ? 'تحديد' : 'Select'} ${itemLabel(r, lang)}`}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className={`${td} whitespace-nowrap`} dir="ltr">
                      <span className="text-xs text-[var(--nav-secondary)]">{safe(r.code) || '—'}</span>
                    </td>
                    <td className={`${td} max-w-sm`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{itemLabel(r, lang)}</span>
                        {r.is_new === true && (
                          <span className="rounded-full border border-amber-400/60 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                            جديد
                          </span>
                        )}
                      </div>
                      {descLabel(r, lang) && (
                        <p className="mt-1 text-xs leading-relaxed text-[var(--nav-secondary)]">
                          {descLabel(r, lang)}
                        </p>
                      )}
                      {mergingId === String(r.id) && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <select
                            className={`${field} max-w-xs`}
                            value={mergeTarget}
                            onChange={(e) => setMergeTarget(e.target.value)}
                          >
                            <option value="">— اختر البند الهدف —</option>
                            {rows
                              .filter((o) => String(o.id) !== String(r.id))
                              .sort((a, b) => safe(a.item).localeCompare(safe(b.item), 'ar'))
                              .map((o) => (
                                <option key={String(o.id)} value={String(o.id)}>
                                  {safe(o.item)}
                                </option>
                              ))}
                          </select>
                          <button
                            className="btn-primary"
                            disabled={merging || !mergeTarget}
                            onClick={() => void runMerge(r)}
                          >
                            {merging ? 'جارٍ النقل...' : 'تأكيد النقل'}
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => {
                              setMergingId('');
                              setMergeTarget('');
                            }}
                          >
                            إلغاء
                          </button>
                        </div>
                      )}
                    </td>
                    <td className={td}>{catLabel(safe(r.category) || UNCATEGORIZED, lang)}</td>
                    <td className={td}>{safe(r.unit) || '—'}</td>
                    <td className={td}>
                      <div className="flex flex-wrap justify-end gap-2">
                        {r.is_new === true && (
                          <button className={iconBtn} onClick={() => void approve(r)}>
                            اعتماد
                          </button>
                        )}
                        <button
                          className={iconBtn}
                          onClick={() => {
                            setMergingId(mergingId === String(r.id) ? '' : String(r.id));
                            setMergeTarget('');
                          }}
                        >
                          نقل لبند موجود
                        </button>
                        <button className={iconBtn} onClick={() => edit(r)}>
                          تعديل
                        </button>
                        <button
                          className="rounded-lg border border-rose-400/50 px-2 py-1 text-xs font-semibold text-rose-400 hover:border-rose-400"
                          onClick={() => void remove(r)}
                        >
                          حذف
                        </button>
                      </div>
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
