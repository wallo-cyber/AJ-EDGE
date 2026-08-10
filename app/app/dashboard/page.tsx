'use client';

import { useEffect, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { simpleCrud } from '../../lib/supabase/simple-crud';

const metrics = [
  ['company_discovery', 'الشركات المكتشفة'],
  ['companies', 'الشركات'], ['contacts', 'جهات الاتصال'], ['opportunities', 'الفرص'],
  ['follow_ups', 'المتابعات'], ['meetings', 'الاجتماعات'], ['quotations', 'عروض الأسعار'], ['contracts', 'العقود'],
] as const;

export default function DashboardPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all(metrics.map(async ([table]) => [table, (await simpleCrud.list(table)).length] as const))
      .then((values) => setCounts(Object.fromEntries(values)))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  return <CRMPage title="لوحة القيادة" description="ملخص حي لبيانات CRM الحالية في Supabase.">
    {error ? <div className="rounded-2xl bg-red-50 p-4 text-red-700">تعذر تحميل المؤشرات: {error}</div> : null}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([table, label]) => <div key={table} className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5"><p className="text-sm text-[#6f6044]">{label}</p><p className="mt-2 text-3xl font-semibold text-[#2f2417]">{loading ? '…' : counts[table] ?? 0}</p></div>)}</div>
  </CRMPage>;
}
