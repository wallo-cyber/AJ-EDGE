'use client';

import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';
import { getSupabaseClient } from '../../lib/supabase/client';

const safe = (value: unknown) => String(value ?? '').trim();

export default function SystemStatusPage() {
  const [data, setData] = useState<Record<string, SimpleRow[]>>({});
  const [auth, setAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    async function check() {
      setLoading(true);
      setError('');
      const supabase = getSupabaseClient();
      const authResult = await supabase.auth.getSession().catch(() => null);
      if (active) setAuth(Boolean(authResult?.data.session?.user));

      const results = await Promise.allSettled([
        simpleCrud.page('agent_settings', 1, 50),
        simpleCrud.page('agent_jobs', 1, 2500, { order: 'created_at' }),
        simpleCrud.page('agent_runs', 1, 100, { order: 'created_at' }),
        simpleCrud.page('agent_errors', 1, 250, { order: 'created_at' }),
        simpleCrud.page('companies', 1, 500, { order: 'created_at' }),
      ]);
      const failedResult = results.find((item) => item.status === 'rejected');
      if (failedResult?.status === 'rejected') {
        if (active) setError(failedResult.reason instanceof Error ? failedResult.reason.message : String(failedResult.reason));
      } else {
        const [settings, jobs, runs, errors, companies] = results.map((item) => item.status === 'fulfilled' ? item.value : { rows: [] });
        if (active) setData({ settings: settings.rows, jobs: jobs.rows, runs: runs.rows, errors: errors.rows, companies: companies.rows });
      }
      if (active) setLoading(false);
    }
    void check();
    return () => { active = false; };
  }, []);
  const jobs = useMemo(() => data.jobs ?? [], [data.jobs]);
  const settings = data.settings ?? [];
  const global = settings.find((row) => row.agent_name === '_global');
  const lastSuccess = [...(data.runs ?? [])].filter((row) => row.status === 'completed').sort((a, b) => safe(b.completed_at).localeCompare(safe(a.completed_at)))[0];
  const failed = jobs.filter((row) => row.status === 'failed').length;
  const queued = jobs.filter((row) => ['queued', 'running'].includes(safe(row.status))).length;
  const cards = [
    ['Application', 'RUNNING', true], ['Database', error ? 'DISCONNECTED' : 'CONNECTED', !error], ['Auth', auth ? 'PASS' : 'FAIL', auth],
    ['Background Jobs', queued ? `${queued} IN PROGRESS` : 'IDLE / SCHEDULED', true], ['Agents', global?.enabled && !global?.paused ? 'ACTIVE' : 'PAUSED', Boolean(global?.enabled && !global?.paused)],
    ['External Research', 'BRAVE ACTIVE · HUMAN GATED', true], ['External Sending', 'DISABLED', true], ['Failed Jobs', String(failed), failed === 0],
  ] as const;
  return <CRMPage title="حالة النظام" description="التفاصيل التقنية للتطبيق وقاعدة البيانات والمعالجة الخلفية.">
    {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    {loading ? <div className="crm-empty animate-pulse">جارٍ فحص الحالة...</div> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, ok]) => <article className="crm-kpi" key={label}><div className="flex items-center justify-between"><p className="text-xs text-[#75664d]">{label}</p><span className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} /></div><strong className="mt-3 block text-lg">{value}</strong></article>)}</div>
      <section className="crm-card p-5"><h3 className="font-bold">آخر تشغيل ناجح</h3><p className="mt-2 text-sm">{safe(lastSuccess?.completed_at) ? new Date(safe(lastSuccess.completed_at)).toLocaleString('ar-SA') : 'لا يوجد تشغيل مسجل'}</p><p className="mt-2 text-xs text-[#75664d]">الشركات المحفوظة: {(data.companies ?? []).length} · جميع الحالات والنتائج محفوظة في Supabase.</p></section>
    </>}
  </CRMPage>;
}
