'use client';
export const dynamic = 'force-dynamic';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';
import { CRMPage } from '../../components/crm-shell';

const TABLE = 'vendor_prices';
const VENDOR_TABLE = 'vendors';
const CATALOG_TABLE = 'materials_catalog';

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

type MaterialImportRow = {
  vendor_name: string;
  item: string;
  unit: string;
  price: string;
  quoted_at: string;
  source: string;
  notes: string;
};

type MaterialImportStatus = 'new' | 'duplicate' | 'no-vendor' | 'no-price';

type MaterialImportPreviewRow = MaterialImportRow & {
  resolvedVendorId: string;
  willCreateVendor: boolean;
  catalogItemId: string;
  willCreateCatalogItem: boolean;
  status: MaterialImportStatus;
};

const MATERIAL_IMPORT_HEADER_HINTS = ['المورد', 'vendor', 'البند', 'item', 'السعر', 'price'];

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

/** يقرأ نصًا ملصوقًا من Excel أو محتوى CSV إلى صفوف تسعيرات. الترتيب: المورد، البند، الوحدة، السعر، تاريخ التسعير، المصدر، ملاحظات */
function parseMaterialsImport(text: string): MaterialImportRow[] {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== '');
  if (!lines.length) return [];
  const rows = lines.map(splitImportLine);
  const looksLikeHeader = rows[0].some((c) =>
    MATERIAL_IMPORT_HEADER_HINTS.some((hint) => c.toLowerCase().includes(hint.toLowerCase())),
  );
  const dataRows = looksLikeHeader ? rows.slice(1) : rows;
  return dataRows
    .map((cols) => ({
      vendor_name: (cols[0] || '').trim(),
      item: (cols[1] || '').trim(),
      unit: (cols[2] || '').trim(),
      price: (cols[3] || '').trim(),
      quoted_at: (cols[4] || '').trim(),
      source: (cols[5] || '').trim(),
      notes: (cols[6] || '').trim(),
    }))
    .filter((r) => r.item);
}

const MATERIAL_CSV_TEMPLATE_HEADER = 'اسم المورد,البند,الوحدة,السعر,تاريخ التسعير,المصدر,ملاحظات';
const MATERIAL_CSV_TEMPLATE_EXAMPLE =
  'مؤسسة الفوز العربية,خرسانة مسلحة للقواعد شاملة الحديد والصب,م٣,450,2026-08-01,عرض سعر مكتوب,شامل التوريد';

/** يولّد ملف CSV نموذج للتحميل — صف عناوين + صف مثال، بترميز يدعم العربي في Excel */
function downloadMaterialsCsvTemplate() {
  const csv = '﻿' + MATERIAL_CSV_TEMPLATE_HEADER + '\n' + MATERIAL_CSV_TEMPLATE_EXAMPLE + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'قالب-أسعار-المواد.csv';
  a.click();
  URL.revokeObjectURL(url);
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
  const [catalogItems, setCatalogItems] = useState<SimpleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [tradeFilter, setTradeFilter] = useState('');
  const [expandedKey, setExpandedKey] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importDefaultVendorId, setImportDefaultVendorId] = useState('');
  const [importPreview, setImportPreview] = useState<MaterialImportPreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [showDeleteImport, setShowDeleteImport] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleteFileName, setDeleteFileName] = useState('');
  const [deleteDefaultVendorId, setDeleteDefaultVendorId] = useState('');
  const [deletePreview, setDeletePreview] = useState<
    { id: string; item: string; unit: string; vendorName: string; price: string }[]
  >([]);
  const [deletingByFile, setDeletingByFile] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [priceData, vendorData, catalogData] = await Promise.all([
        simpleCrud.list(TABLE),
        simpleCrud.list(VENDOR_TABLE),
        simpleCrud.list(CATALOG_TABLE),
      ]);
      setRows(priceData);
      setVendors(vendorData);
      setCatalogItems(catalogData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل الأسعار.');
    } finally {
      setLoading(false);
    }
  }

  /** يبحث عن أقرب بند مطابق في دليل البنود (تطابق تام أو احتواء جزئي للنص) — يفضّل أطول نص مطابق كأكثر دقة */
  function matchCatalogItem(desc: string): SimpleRow | null {
    const n = norm(desc);
    if (!n) return null;
    let best: SimpleRow | null = null;
    let bestLen = -1;
    for (const c of catalogItems) {
      const cn = norm(c.item);
      if (!cn) continue;
      if (cn === n || cn.includes(n) || n.includes(cn)) {
        if (cn.length > bestLen) {
          best = c;
          bestLen = cn.length;
        }
      }
    }
    return best;
  }

  useEffect(() => {
    void load();
  }, []);

  // البحث/الفلترة تُغيّر الصفوف المعروضة، فنفرّغ التحديد كيلا يبقى محددًا بند غير ظاهر
  useEffect(() => {
    setSelectedKeys(new Set());
  }, [query, tradeFilter]);

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

  /** لمطابقة اسم المورد بالاستيراد باسم موجود فعلًا (بدون حساسية لحالة الأحرف أو المسافات الزائدة) */
  const vendorIdByName = useMemo(() => {
    const map = new Map<string, string>();
    vendors.forEach((v) => {
      const n = norm(v.company_name);
      if (n && !map.has(n)) map.set(n, String(v.id));
    });
    return map;
  }, [vendors]);

  /** مفاتيح التسعيرات الموجودة فعلًا (مورد + بند + وحدة) — لتجاهل المكرر عند الاستيراد */
  const existingPriceKeys = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(`${String(r.vendor_id)}|${norm(r.item)}|${norm(r.unit)}`));
    return set;
  }, [rows]);

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

  /** أسماء البنود المستخدمة سابقًا + بنود دليل البنود — لتوحيد الكتابة عند الإدخال */
  const itemSuggestions = useMemo(() => {
    const set = new Set<string>();
    catalogItems.forEach((c) => {
      const i = safe(c.item);
      if (i) set.add(i);
    });
    rows.forEach((r) => {
      const i = safe(r.item);
      if (i) set.add(i);
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'ar'));
  }, [rows, catalogItems]);

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
      const matchedCatalog = matchCatalogItem(draft.item.trim());
      const values: Record<string, unknown> = {
        vendor_id: draft.vendor_id,
        item: draft.item.trim(),
        unit: draft.unit || null,
        price,
        quoted_at: draft.quoted_at || todayISO(),
        source: draft.source || null,
        notes: draft.notes.trim() || null,
        catalog_item_id: matchedCatalog ? matchedCatalog.id : null,
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
    const parsed = parseMaterialsImport(importText);
    if (!parsed.length) {
      setError('لم يُعثر على صفوف صالحة. تأكد أن اسم البند موجود في العمود الثاني.');
      return;
    }

    const seenInBatch = new Set<string>();
    const preview: MaterialImportPreviewRow[] = parsed.map((r) => {
      let vendorName = r.vendor_name;
      let resolvedVendorId = '';
      let willCreateVendor = false;

      if (vendorName) {
        const match = vendorIdByName.get(norm(vendorName));
        if (match) resolvedVendorId = match;
        else willCreateVendor = true;
      } else if (importDefaultVendorId) {
        resolvedVendorId = importDefaultVendorId;
        vendorName = safe(vendors.find((v) => String(v.id) === importDefaultVendorId)?.company_name);
      }

      // طابق البند بدليل البنود (تطابق تام أو احتواء جزئي) — نستخدم النص المعتمد بالدليل
      // بدل صيغة الملف المستورد نفسها، حتى تتوحّد المقارنة بين كل الملفات المستوردة لاحقًا
      const matchedCatalog = matchCatalogItem(r.item);
      const catalogItemId = matchedCatalog ? String(matchedCatalog.id) : '';
      const willCreateCatalogItem = !matchedCatalog;
      const resolvedItem = matchedCatalog ? safe(matchedCatalog.item) : r.item;

      const priceNum = toNum(r.price);
      let status: MaterialImportStatus;
      if (!vendorName && !willCreateVendor) {
        status = 'no-vendor';
      } else if (!Number.isFinite(priceNum) || priceNum <= 0) {
        status = 'no-price';
      } else {
        const vendorKey = resolvedVendorId || `new:${norm(vendorName)}`;
        const key = `${vendorKey}|${norm(resolvedItem)}|${norm(r.unit)}`;
        if (existingPriceKeys.has(key) || seenInBatch.has(key)) {
          status = 'duplicate';
        } else {
          status = 'new';
          seenInBatch.add(key);
        }
      }

      return {
        ...r,
        item: resolvedItem,
        vendor_name: vendorName,
        resolvedVendorId,
        willCreateVendor,
        catalogItemId,
        willCreateCatalogItem,
        status,
      };
    });

    setImportPreview(preview);
  }

  async function runImport() {
    const toImport = importPreview.filter((r) => r.status === 'new');
    if (!toImport.length) {
      setError('لا توجد صفوف جديدة صالحة للاستيراد.');
      return;
    }

    setImporting(true);
    setError('');
    try {
      // أنشئ الموردين الجدد أولًا (مرة واحدة لكل اسم) ثم اربط الصفوف بمعرفاتهم
      const newVendorNames = [
        ...new Set(toImport.filter((r) => r.willCreateVendor).map((r) => norm(r.vendor_name))),
      ];
      const createdVendorIds = new Map<string, string>();
      for (const key of newVendorNames) {
        const original = toImport.find((r) => norm(r.vendor_name) === key)?.vendor_name || '';
        const created = await simpleCrud.create(VENDOR_TABLE, {
          company_name: original,
          is_active: true,
        });
        createdVendorIds.set(key, String(created.id));
      }

      // أنشئ بنود دليل جديدة لأي بند لم يُطابَق (مرة واحدة لكل نص بند فريد بالدفعة)، معلَّمة
      // بعلامة «جديد» ليراجعها ويصنّفها لاحقًا من صفحة دليل البنود
      const newCatalogKeys = [
        ...new Set(toImport.filter((r) => r.willCreateCatalogItem).map((r) => norm(r.item))),
      ];
      const catalogIdByKey = new Map<string, string>();
      const catalogInserts: Record<string, unknown>[] = [];
      for (const key of newCatalogKeys) {
        const original = toImport.find((r) => norm(r.item) === key);
        const id = crypto.randomUUID();
        catalogIdByKey.set(key, id);
        catalogInserts.push({
          id,
          category: '',
          item: original?.item || '',
          unit: original?.unit || null,
          is_new: true,
        });
      }
      if (catalogInserts.length) await simpleCrud.createMany(CATALOG_TABLE, catalogInserts);

      const values = toImport.map((r) => ({
        vendor_id: r.resolvedVendorId || createdVendorIds.get(norm(r.vendor_name)) || null,
        catalog_item_id: r.catalogItemId || catalogIdByKey.get(norm(r.item)) || null,
        item: r.item,
        unit: r.unit || null,
        price: toNum(r.price),
        quoted_at: r.quoted_at || todayISO(),
        source: r.source || null,
        notes: r.notes || null,
      }));

      await simpleCrud.createMany(TABLE, values);
      setImportText('');
      setImportFileName('');
      setImportPreview([]);
      setShowImport(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر استيراد الأسعار.');
    } finally {
      setImporting(false);
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

  /** حذف كل التسعيرات المطابقة للفلترة/البحث الحالي دفعة واحدة — لحذف مجموعة كاملة (دفعة استيراد) بسهولة، مثلًا بالبحث باسم المورد */
  async function bulkDeleteFiltered() {
    if (!filtered.length) return;
    if (
      !confirm(
        `حذف ${filtered.length} تسعيرة مطابقة للبحث/الفلترة الحالية؟ هذا الإجراء لا يمكن التراجع عنه.`,
      )
    )
      return;
    setBulkDeleting(true);
    setError('');
    try {
      await simpleCrud.removeMany(
        TABLE,
        filtered.map((r) => String(r.id)),
      );
      setExpandedKey('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حذف المجموعة.');
    } finally {
      setBulkDeleting(false);
    }
  }

  function toggleSelectKey(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedKeys((prev) =>
      prev.size === groups.length ? new Set() : new Set(groups.map((g) => g.key)),
    );
  }

  /** حذف كل التسعيرات ضمن البنود المحدَّدة بمربعات الاختيار — تحديد يدوي بدل الاعتماد على البحث فقط */
  async function bulkDeleteSelected() {
    const idsToDelete = groups
      .filter((g) => selectedKeys.has(g.key))
      .flatMap((g) => g.quotes.map((q) => String(q.id)));
    if (!idsToDelete.length) return;
    if (
      !confirm(
        `حذف ${idsToDelete.length} تسعيرة ضمن ${selectedKeys.size} بند محدَّد؟ هذا الإجراء لا يمكن التراجع عنه.`,
      )
    )
      return;
    setBulkDeleting(true);
    setError('');
    try {
      await simpleCrud.removeMany(TABLE, idsToDelete);
      setSelectedKeys(new Set());
      setExpandedKey('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حذف البنود المحددة.');
    } finally {
      setBulkDeleting(false);
    }
  }

  function onDeleteFile(file: File | undefined) {
    if (!file) return;
    setDeleteFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setDeleteText(String(reader.result || ''));
    reader.onerror = () => setError('تعذرت قراءة الملف.');
    reader.readAsText(file, 'utf-8');
  }

  /** يقرأ نفس صيغة ملف الاستيراد، ويطابق كل صف بمورد + بند (عبر دليل البنود) + وحدة
   * مع التسعيرات الموجودة فعلًا، ليحدد بدقة أي التسعيرات ستُحذف — بدل الاعتماد على البحث النصي */
  function previewDeleteByFile() {
    setError('');
    const parsed = parseMaterialsImport(deleteText);
    if (!parsed.length) {
      setError('لم يُعثر على صفوف صالحة بالملف. تأكد أن اسم البند موجود في العمود الثاني.');
      return;
    }
    const targets = new Set<string>();
    parsed.forEach((r) => {
      let vendorId = '';
      if (r.vendor_name) vendorId = vendorIdByName.get(norm(r.vendor_name)) || '';
      else if (deleteDefaultVendorId) vendorId = deleteDefaultVendorId;
      if (!vendorId) return;
      const matched = matchCatalogItem(r.item);
      const resolvedItem = matched ? safe(matched.item) : r.item;
      targets.add(`${vendorId}|${norm(resolvedItem)}|${norm(r.unit)}`);
    });
    const matches = rows.filter((row) =>
      targets.has(`${String(row.vendor_id)}|${norm(row.item)}|${norm(row.unit)}`),
    );
    setDeletePreview(
      matches.map((row) => ({
        id: String(row.id),
        item: safe(row.item),
        unit: safe(row.unit),
        vendorName: vendorName(row.vendor_id),
        price: safe(row.price),
      })),
    );
    if (!matches.length) {
      setError(
        'لم يُعثر على أي تسعيرات مطابقة لهذا الملف في قاعدة البيانات. تأكد من اختيار المورد الصحيح إذا كان الملف بلا عمود مورد.',
      );
    }
  }

  async function runDeleteByFile() {
    if (!deletePreview.length) return;
    if (
      !confirm(
        `حذف ${deletePreview.length} تسعيرة مطابقة لهذا الملف؟ هذا الإجراء لا يمكن التراجع عنه.`,
      )
    )
      return;
    setDeletingByFile(true);
    setError('');
    try {
      await simpleCrud.removeMany(
        TABLE,
        deletePreview.map((r) => r.id),
      );
      setDeleteText('');
      setDeleteFileName('');
      setDeletePreview([]);
      setShowDeleteImport(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حذف التسعيرات.');
    } finally {
      setDeletingByFile(false);
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
      title="أسعار المواد"
      description="أسعار البنود من الموردين: أقل وأعلى ومتوسط سعر لكل بند، لتسعير العطاءات من مصدر حقيقي."
      action={
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-secondary"
            onClick={() => {
              setShowForm(false);
              setShowDeleteImport(false);
              setShowImport((v) => !v);
            }}
          >
            {showImport ? 'إغلاق الاستيراد' : 'استيراد المواد'}
          </button>
          <button
            className="rounded-lg border border-rose-400/50 px-3 py-2 text-sm font-semibold text-rose-400 hover:border-rose-400"
            onClick={() => {
              setShowForm(false);
              setShowImport(false);
              setShowDeleteImport((v) => !v);
            }}
          >
            {showDeleteImport ? 'إغلاق الحذف بملف' : 'حذف بملف'}
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              setShowImport(false);
              setShowDeleteImport(false);
              setDraft(EMPTY);
              setEditingId('');
              setShowForm((v) => !v);
            }}
          >
            {showForm ? 'إغلاق النموذج' : 'إضافة تسعيرة'}
          </button>
        </div>
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

      {showImport && (
        <section className={panel}>
          <h3 className="mb-2 text-base font-bold">استيراد أسعار بالجملة</h3>
          <p className="mb-3 text-xs text-[var(--nav-secondary)]">
            الأعمدة بالترتيب: اسم المورد، البند، الوحدة، السعر، تاريخ التسعير، المصدر، ملاحظات. الصف
            الأول اختياري كعناوين. الصق مباشرة من Excel (Tab) أو ارفع ملف CSV. إذا كانت كل الصفوف
            لمورد واحد اترك عمود المورد فارغًا واختر المورد الافتراضي أدناه. المورد غير الموجود
            يُنشأ تلقائيًا عند الاستيراد، والبنود المكررة (نفس المورد + البند + الوحدة) تُتجاهل
            تلقائيًا فلا تتكرر بياناتك. كل بند يُطابَق تلقائيًا مع{' '}
            <a href="/materials-catalog" className="underline">
              دليل البنود
            </a>
            ، وأي بند غير موجود فيه يُنشأ ويُعلَّم «جديد» لتصنيفه لاحقًا من هناك.
          </p>

          <div className="mb-3 grid gap-4 md:grid-cols-3">
            <div>
              <label className={label}>المورد الافتراضي (إن لم يوجد عمود مورد بالملف)</label>
              <select
                className={field}
                value={importDefaultVendorId}
                onChange={(e) => setImportDefaultVendorId(e.target.value)}
              >
                <option value="">— بدون —</option>
                {activeVendors.map((v) => (
                  <option key={String(v.id)} value={String(v.id)}>
                    {safe(v.company_name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-ghost" onClick={downloadMaterialsCsvTemplate}>
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
            placeholder={
              'مؤسسة الفوز العربية, خرسانة مسلحة للقواعد شاملة الحديد والصب, م٣, 450, 2026-08-01, عرض سعر مكتوب, شامل التوريد'
            }
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
              {(() => {
                const newCount = importPreview.filter((r) => r.status === 'new').length;
                const dupCount = importPreview.filter((r) => r.status === 'duplicate').length;
                const badCount = importPreview.length - newCount - dupCount;
                return (
                  <p className="mb-2 text-sm font-semibold">
                    {newCount} بند جديد جاهز للاستيراد
                    {dupCount > 0 && ` · ${dupCount} مكرر سيُتجاهل`}
                    {badCount > 0 && ` · ${badCount} صف فيه خلل (بلا مورد أو بلا سعر)`}
                  </p>
                );
              })()}
              <div className="max-h-64 overflow-auto rounded-xl border border-[var(--nav-border)]">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--nav-border)]">
                      <th className={th}>المورد</th>
                      <th className={th}>البند</th>
                      <th className={th}>الوحدة</th>
                      <th className={th}>السعر</th>
                      <th className={th}>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--nav-border)]/60">
                        <td className={td}>
                          {r.vendor_name || '—'}
                          {r.willCreateVendor && (
                            <span className="mr-1 rounded-full border border-amber-400/60 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                              مورد جديد
                            </span>
                          )}
                        </td>
                        <td className={td}>
                          {r.item}
                          {r.willCreateCatalogItem ? (
                            <span className="mr-1 rounded-full border border-amber-400/60 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                              بند جديد بالدليل
                            </span>
                          ) : (
                            <span className="mr-1 rounded-full border border-emerald-400/60 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                              مطابق للدليل
                            </span>
                          )}
                        </td>
                        <td className={td}>{r.unit || '—'}</td>
                        <td className={td} dir="ltr">
                          {r.price || '—'}
                        </td>
                        <td className={td}>
                          {r.status === 'new' && <span className="text-emerald-400">جديد</span>}
                          {r.status === 'duplicate' && (
                            <span className="text-[var(--nav-secondary)]">مكرر — سيُتجاهل</span>
                          )}
                          {r.status === 'no-vendor' && (
                            <span className="text-rose-400">بلا مورد</span>
                          )}
                          {r.status === 'no-price' && (
                            <span className="text-rose-400">بلا سعر صحيح</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className="btn-primary mt-3"
                disabled={importing || importPreview.every((r) => r.status !== 'new')}
                onClick={() => void runImport()}
              >
                {importing
                  ? 'جارٍ الاستيراد...'
                  : `استيراد ${importPreview.filter((r) => r.status === 'new').length} بند`}
              </button>
            </div>
          )}
        </section>
      )}

      {showDeleteImport && (
        <section className={panel}>
          <h3 className="mb-2 text-base font-bold">حذف تسعيرات بملف</h3>
          <p className="mb-3 text-xs text-[var(--nav-secondary)]">
            ارفع نفس ملف الاستيراد (أو الصقه) وسيطابق النظام كل صف (المورد + البند عبر دليل البنود
            + الوحدة) مع التسعيرات الموجودة فعلًا، ويعرض لك قائمة بما سيُحذف قبل التأكيد — مفيد
            لحذف دفعة استيراد كاملة بدقة حتى لو تغيّرت صياغة البحث. إذا كان الملف بلا عمود مورد،
            اختر المورد الافتراضي أدناه.
          </p>

          <div className="mb-3 grid gap-4 md:grid-cols-3">
            <div>
              <label className={label}>المورد الافتراضي (إن لم يوجد عمود مورد بالملف)</label>
              <select
                className={field}
                value={deleteDefaultVendorId}
                onChange={(e) => setDeleteDefaultVendorId(e.target.value)}
              >
                <option value="">— بدون —</option>
                {activeVendors.map((v) => (
                  <option key={String(v.id)} value={String(v.id)}>
                    {safe(v.company_name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="btn-secondary cursor-pointer">
              رفع ملف CSV
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => onDeleteFile(e.target.files?.[0])}
              />
            </label>
            {deleteFileName && (
              <span className="text-xs text-[var(--nav-secondary)]">{deleteFileName}</span>
            )}
          </div>

          <textarea
            className={`${field} min-h-[140px] font-mono text-xs`}
            dir="ltr"
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            placeholder={
              'مؤسسة الفوز العربية, خرسانة مسلحة للقواعد شاملة الحديد والصب, م٣, 450, 2026-08-01, عرض سعر مكتوب, شامل التوريد'
            }
          />

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              className="btn-primary"
              onClick={previewDeleteByFile}
              disabled={!deleteText.trim()}
            >
              معاينة الحذف
            </button>
            {(deleteText.trim() || deletePreview.length > 0) && (
              <button
                className="btn-secondary"
                onClick={() => {
                  setDeleteText('');
                  setDeleteFileName('');
                  setDeletePreview([]);
                }}
              >
                مسح
              </button>
            )}
          </div>

          {deletePreview.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-rose-400">
                {deletePreview.length} تسعيرة موجودة فعلًا ستُحذف
              </p>
              <div className="max-h-64 overflow-auto rounded-xl border border-[var(--nav-border)]">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--nav-border)]">
                      <th className={th}>المورد</th>
                      <th className={th}>البند</th>
                      <th className={th}>الوحدة</th>
                      <th className={`${th} text-center`}>السعر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletePreview.map((r) => (
                      <tr key={r.id} className="border-b border-[var(--nav-border)]/60">
                        <td className={td}>{r.vendorName}</td>
                        <td className={td}>{r.item}</td>
                        <td className={td}>{r.unit || '—'}</td>
                        <td className={`${td} text-center`} dir="ltr">
                          {r.price || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className="mt-3 rounded-lg border border-rose-400/50 px-4 py-2 text-sm font-semibold text-rose-400 hover:border-rose-400"
                disabled={deletingByFile}
                onClick={() => void runDeleteByFile()}
              >
                {deletingByFile ? 'جارٍ الحذف...' : `تأكيد حذف ${deletePreview.length} تسعيرة`}
              </button>
            </div>
          )}
        </section>
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
                onChange={(e) => {
                  const value = e.target.value;
                  const matched = matchCatalogItem(value);
                  setDraft((d) => ({
                    ...d,
                    item: value,
                    unit: !d.unit && matched && safe(matched.unit) ? safe(matched.unit) : d.unit,
                  }));
                }}
                placeholder="مثال: خرسانة مسلحة للقواعد شاملة الحديد والصب"
              />
              <datalist id="price-items">
                {itemSuggestions.map((i) => (
                  <option key={i} value={i} />
                ))}
              </datalist>
              <p className="mt-1 text-[11px] text-[var(--nav-secondary)]">
                اكتب البند بالصيغة نفسها كل مرة — القائمة تقترح ما سجّلته سابقًا وبنود دليل البنود
                حتى تتجمّع العروض تحت بند واحد.
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
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-[var(--nav-secondary)]">
              {groups.length} بند
            </span>
            {selectedKeys.size > 0 && (
              <button
                className="rounded-lg border border-rose-400/50 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:border-rose-400"
                disabled={bulkDeleting}
                onClick={() => void bulkDeleteSelected()}
              >
                {bulkDeleting ? 'جارٍ الحذف...' : `حذف المحدد (${selectedKeys.size})`}
              </button>
            )}
            {(query.trim() || tradeFilter) && filtered.length > 0 && (
              <button
                className="rounded-lg border border-rose-400/50 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:border-rose-400"
                disabled={bulkDeleting}
                onClick={() => void bulkDeleteFiltered()}
              >
                {bulkDeleting
                  ? 'جارٍ الحذف...'
                  : `حذف كل نتائج البحث (${filtered.length})`}
              </button>
            )}
          </div>
        </div>
        {(query.trim() || tradeFilter) && (
          <p className="mb-4 -mt-2 text-[11px] text-[var(--nav-secondary)]">
            لحذف مجموعة كاملة استوردتها دفعة واحدة (مثلًا مورد معيّن): اكتب اسم المورد بالبحث
            أعلاه ليظهر بنوده فقط، ثم اضغط &quot;حذف كل نتائج البحث&quot;. أو حدّد البنود بمربعات
            الاختيار بجدول النتائج واضغط &quot;حذف المحدد&quot;.
          </p>
        )}

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
                  <th className={`${th} w-8`}>
                    <input
                      type="checkbox"
                      aria-label="تحديد الكل"
                      checked={groups.length > 0 && selectedKeys.size === groups.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className={th}>البند</th>
                  <th className={th}>الوحدة</th>
                  <th className={th}>عروض</th>
                  <th className={`${th} text-center`}>السعر</th>
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
                        <td className={td} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`تحديد ${g.item}`}
                            checked={selectedKeys.has(g.key)}
                            onChange={() => toggleSelectKey(g.key)}
                          />
                        </td>
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
                              المورد: {g.minVendor}
                            </div>
                          )}
                        </td>
                        <td className={td}>{g.unit || '—'}</td>
                        <td className={td}>{g.quotes.length}</td>
                        <td
                          className={`${td} text-center font-semibold text-[var(--nav-accent)]`}
                          dir="ltr"
                        >
                          {Number.isFinite(g.min) ? money(g.min) : '—'}
                        </td>
                      </tr>

                      {open && (
                        <tr className="border-b border-[var(--nav-border)]/60">
                          <td className="px-3 pb-4" colSpan={5}>
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
