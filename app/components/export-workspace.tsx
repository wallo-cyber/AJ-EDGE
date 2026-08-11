'use client';

import { useState } from 'react';
import { CRMPage } from './crm-shell';
import { simpleCrud } from '../lib/supabase/simple-crud';

const tables = [['companies','Companies'],['contacts','Contacts'],['follow_ups','Follow-ups'],['opportunities','Opportunities'],['messages','Ready for Outreach']] as const;
function csvCell(value: unknown) { const text = Array.isArray(value) ? value.join('|') : typeof value === 'object' && value ? JSON.stringify(value) : String(value ?? ''); return `"${text.replaceAll('"','""')}"`; }

export function ExportWorkspace() {
  const [exporting, setExporting] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const download = async (table: string, label: string) => {
    setExporting(table); setNotice(''); setError('');
    try {
      const rows = await simpleCrud.list(table);
      if (!rows.length) { setNotice(`لا توجد بيانات في ${label} للتصدير.`); return; }
      const excluded = new Set(['owner_id']);
      const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))].filter((key) => !excluded.has(key));
      const csv = '\uFEFF' + [headers.join(','), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(','))].join('\r\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = `algaeu-${table}-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url);
      setNotice(`تم تصدير ${rows.length} سجل من ${label}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تصدير البيانات.'); }
    finally { setExporting(''); }
  };
  return <CRMPage title="التصدير والنسخ الاحتياطي" description="تصدير بيانات التشغيل بصيغة CSV دون بيانات المصادقة أو الأسرار.">{error ? <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}{notice ? <p className="rounded-xl bg-emerald-50 p-3 text-emerald-700">{notice}</p> : null}<div className="grid gap-3 sm:grid-cols-2">{tables.map(([table,label]) => <button disabled={Boolean(exporting)} key={table} onClick={() => void download(table,label)} className="rounded-2xl border border-[#ead9b3] bg-[#fdf8ee] p-5 text-right disabled:opacity-50"><strong>{exporting === table ? 'جارٍ التصدير...' : `تصدير ${label}`}</strong><p className="mt-1 text-xs text-[#6f6044]">CSV — بيانات المستخدم الحالي فقط</p></button>)}</div></CRMPage>;
}
