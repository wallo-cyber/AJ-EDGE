'use client';

import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from './crm-shell';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';
import { getSupabaseClient } from '../lib/supabase/client';
import { AGENT_NAMES, agentRequiresCompany, type AgentName } from '../lib/agents/orchestrator';

const safe = (value: unknown) => String(value ?? '').trim();
const hasTavilyResult = (row: SimpleRow) => Boolean(row.data && typeof row.data === 'object' && 'tavily' in row.data);

export function AgentControlCenter() {
  const [settings, setSettings] = useState<SimpleRow[]>([]);
  const [jobs, setJobs] = useState<SimpleRow[]>([]);
  const [runs, setRuns] = useState<SimpleRow[]>([]);
  const [logs, setLogs] = useState<SimpleRow[]>([]);
  const [errors, setErrors] = useState<SimpleRow[]>([]);
  const [companies, setCompanies] = useState<SimpleRow[]>([]);
  const [contacts, setContacts] = useState<SimpleRow[]>([]);
  const [intelligence, setIntelligence] = useState<SimpleRow[]>([]);
  const [selected, setSelected] = useState('Supervisor');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => Promise.all(['agent_settings', 'agent_jobs', 'agent_runs', 'agent_logs', 'agent_errors', 'companies', 'contacts', 'company_intelligence'].map((table) => simpleCrud.list(table))).then(([a, b, c, d, e, f, g, h]) => { setSettings(a); setJobs(b); setRuns(c); setLogs(d); setErrors(e); setCompanies(f); setContacts(g); setIntelligence(h); }).finally(() => setLoading(false));
  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;
    void getSupabaseClient().auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      void load();
      timer = window.setInterval(() => void load(), 30000);
    });
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, []);
  const global = settings.find((item) => item.agent_name === '_global');
  const today = new Date().toISOString().slice(0, 10);
  const topA = [...companies].filter((company) => company.priority === 'A').sort((a, b) => Number(b.lead_score ?? 0) - Number(a.lead_score ?? 0))[0];
  const readyForOutreach = companies.filter((company) => ['A', 'B'].includes(safe(company.priority)) && Boolean(company.general_email || company.email || company.general_phone || company.phone || contacts.some((contact) => contact.company_id === company.id))).length;
  const operationalMetrics = [
    ['Queued', jobs.filter((job) => job.status === 'queued').length], ['Running', jobs.filter((job) => job.status === 'running').length], ['Completed', jobs.filter((job) => job.status === 'completed').length], ['Failed', jobs.filter((job) => job.status === 'failed').length],
    ['Enriched', intelligence.filter(hasTavilyResult).length], ['Decision Makers Found', contacts.filter((contact) => contact.contact_classification === 'Decision Maker').length], ['Vendor Portals Found', companies.filter((company) => safe(company.vendor_registration_url)).length], ['Ready for Outreach', readyForOutreach], ['Needs Manual Research', jobs.filter((job) => job.status === 'manual_research_required').length],
  ];
  const rows = useMemo(() => AGENT_NAMES.map((name) => { const setting = settings.find((item) => item.agent_name === name); const ownJobs = jobs.filter((job) => job.agent_name === name); return { name, setting, queued: ownJobs.filter((job) => job.status === 'queued').length, running: ownJobs.filter((job) => job.status === 'running').length, completed: ownJobs.filter((job) => ['completed', 'manual_research_required'].includes(safe(job.status)) && safe(job.completed_at).startsWith(today)).length, failed: ownJobs.filter((job) => job.status === 'failed').length, last: safe(setting?.last_run_at), next: safe(setting?.next_run_at) }; }), [jobs, settings, today]);
  const updateSetting = async (row: SimpleRow | undefined, values: Record<string, unknown>) => { if (!row) return; await simpleCrud.update('agent_settings', row.id, values); await load(); };
  const runNow = async (name: AgentName) => { const companyAgents = agentRequiresCompany(name); const company = companyAgents ? topA : undefined; if (companyAgents && !company) { setNotice('لا توجد شركة Priority A متاحة.'); return; } const duplicate = jobs.some((job) => job.agent_name === name && job.company_id === (company?.id ?? null) && ['queued', 'running'].includes(safe(job.status))); if (duplicate) { setNotice('المهمة موجودة بالفعل في Queue.'); return; } await simpleCrud.create('agent_jobs', { agent_name: name, company_id: company?.id ?? null, priority: company?.priority === 'A' ? 100 : 80, payload: { source: 'control_center', company_name: company?.company_name ?? null } }); setNotice(`تمت إضافة ${name} إلى Queue.`); await load(); };
  const pauseAll = async (emergency = false) => { await Promise.all(settings.map((setting) => simpleCrud.update('agent_settings', setting.id, { paused: true, ...(emergency ? { enabled: false } : {}) }))); if (emergency) await Promise.all(jobs.filter((job) => job.status === 'queued').map((job) => simpleCrud.update('agent_jobs', job.id, { status: 'cancelled' }))); setNotice(emergency ? 'تم تنفيذ Emergency Stop.' : 'تم إيقاف جميع الوكلاء مؤقتاً.'); await load(); };
  const resumeAll = async () => { await Promise.all(settings.map((setting) => simpleCrud.update('agent_settings', setting.id, { paused: false, enabled: true }))); setNotice('تم تشغيل الوكلاء.'); await load(); };
  const retryFailed = async (name?: string) => { const failed = jobs.filter((job) => job.status === 'failed' && Number(job.attempts ?? 0) < Number(job.max_attempts ?? 3) && (!name || job.agent_name === name)); await Promise.all(failed.map((job) => simpleCrud.update('agent_jobs', job.id, { status: 'queued', scheduled_at: new Date().toISOString() }))); setNotice(`تمت إعادة ${failed.length} مهمة إلى Queue.`); await load(); };

  return <CRMPage title="مركز الوكلاء" description="تشغيل Server-Side عبر Supabase Queues وCron؛ لا يعتمد على بقاء المتصفح مفتوحاً.">
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-[#fdf8ee] p-4"><span className={`rounded-full px-3 py-1 text-xs ${global?.enabled && !global?.paused ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>Agents {global?.enabled && !global?.paused ? 'ON' : 'OFF'}</span><button onClick={() => void resumeAll()} className="rounded-full bg-[#2f2417] px-4 py-2 text-xs text-white">Agents ON</button><button onClick={() => void pauseAll()} className="rounded-full border px-4 py-2 text-xs">Pause All</button><button onClick={() => void retryFailed()} className="rounded-full border px-4 py-2 text-xs">Retry Failed</button><button onClick={() => void pauseAll(true)} className="rounded-full bg-red-700 px-4 py-2 text-xs text-white">Emergency Stop</button></div>
    <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5">{operationalMetrics.map(([label, count]) => <div key={String(label)} className="rounded-xl border bg-white p-3"><p className="text-xs text-[#6f6044]">{label}</p><strong className="text-2xl">{count}</strong></div>)}</div>
    {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    {loading ? <p className="p-8 text-center">جارٍ تحميل حالة الوكلاء...</p> : <div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-full text-right text-sm"><thead><tr className="border-b bg-[#fdf8ee]"><th className="p-3">Agent</th><th className="p-3">Status</th><th className="p-3">Queue</th><th className="p-3">Running</th><th className="p-3">Completed Today</th><th className="p-3">Failed</th><th className="p-3">Last Run</th><th className="p-3">Next Run</th><th className="p-3">Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name} className="border-b"><td className="p-3 font-semibold">{row.name}</td><td className="p-3">{row.setting?.enabled && !row.setting?.paused ? 'Active' : 'Paused'}</td><td className="p-3">{row.queued}</td><td className="p-3">{row.running}</td><td className="p-3">{row.completed}</td><td className="p-3">{row.failed}</td><td className="p-3 text-xs">{row.last ? new Date(row.last).toLocaleString('ar-SA') : '—'}</td><td className="p-3 text-xs">{row.next ? new Date(row.next).toLocaleString('ar-SA') : safe(row.setting?.schedule) || 'Queue'}</td><td className="p-3"><div className="flex flex-wrap gap-1"><button onClick={() => void runNow(row.name)} className="rounded-full border px-2 py-1 text-xs">Run Now</button><button onClick={() => void updateSetting(row.setting, { paused: !row.setting?.paused })} className="rounded-full border px-2 py-1 text-xs">{row.setting?.paused ? 'Resume' : 'Pause'}</button><button onClick={() => void retryFailed(row.name)} className="rounded-full border px-2 py-1 text-xs">Retry</button><button onClick={() => setSelected(row.name)} className="rounded-full border px-2 py-1 text-xs">Logs</button></div></td></tr>)}</tbody></table></div>}
    <section className="rounded-2xl border bg-white p-4"><h3 className="font-semibold">Logs — {selected}</h3><div className="mt-3 max-h-80 overflow-y-auto text-xs">{logs.filter((log) => log.agent_name === selected).slice(0, 100).map((log) => <div key={log.id} className="border-b py-2"><span className="text-[#9a7b2f]">{safe(log.created_at)} · {safe(log.level)}</span><p>{safe(log.message)}</p></div>)}{!logs.some((log) => log.agent_name === selected) && <p>لا توجد Logs بعد.</p>}</div>{errors.some((error) => error.agent_name === selected && !error.resolved) && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">أخطاء غير محلولة: {errors.filter((error) => error.agent_name === selected && !error.resolved).length}</p>}</section>
    <p className="text-xs text-[#6f6044]">Runs المسجلة: {runs.length} · تحديث تلقائي كل 30 ثانية.</p>
  </CRMPage>;
}
