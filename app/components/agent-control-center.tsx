'use client';

import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from './crm-shell';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';
import { getSupabaseClient } from '../lib/supabase/client';
import { AGENT_NAMES, agentRequiresCompany, type AgentName } from '../lib/agents/orchestrator';

const safe = (value: unknown) => String(value ?? '').trim();
const hasTavilyResult = (row: SimpleRow) => Boolean(row.data && typeof row.data === 'object' && 'tavily' in row.data);
const EXTERNAL_SEARCH_PAUSED_AGENTS = new Set<AgentName>(['Supervisor', 'Verification', 'Enrichment', 'Decision Maker', 'Vendor Registration', 'Discovery adapter']);
const EXTERNAL_SEARCH_PAUSED_MESSAGE = 'متوقف مؤقتاً — حصة البحث الخارجي غير متاحة';

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
  const runNow = async (name: AgentName) => { if (EXTERNAL_SEARCH_PAUSED_AGENTS.has(name)) { setNotice(EXTERNAL_SEARCH_PAUSED_MESSAGE); return; } const companyAgents = agentRequiresCompany(name); const company = companyAgents ? topA : undefined; if (companyAgents && !company) { setNotice('لا توجد شركة Priority A متاحة.'); return; } const duplicate = jobs.some((job) => job.agent_name === name && job.company_id === (company?.id ?? null) && ['queued', 'running'].includes(safe(job.status))); if (duplicate) { setNotice('المهمة موجودة بالفعل في Queue.'); return; } await simpleCrud.create('agent_jobs', { agent_name: name, company_id: company?.id ?? null, priority: company?.priority === 'A' ? 100 : 80, payload: { source: 'control_center', company_name: company?.company_name ?? null } }); setNotice(`تمت إضافة ${name} إلى Queue.`); await load(); };
  const pauseAll = async (emergency = false) => { await Promise.all(settings.map((setting) => simpleCrud.update('agent_settings', setting.id, { paused: true, ...(emergency ? { enabled: false } : {}) }))); if (emergency) await Promise.all(jobs.filter((job) => job.status === 'queued').map((job) => simpleCrud.update('agent_jobs', job.id, { status: 'cancelled' }))); setNotice(emergency ? 'تم تنفيذ Emergency Stop.' : 'تم إيقاف جميع الوكلاء مؤقتاً.'); await load(); };
  const resumeAll = async () => { await Promise.all(settings.map((setting) => simpleCrud.update('agent_settings', setting.id, { paused: EXTERNAL_SEARCH_PAUSED_AGENTS.has(safe(setting.agent_name) as AgentName), enabled: true }))); setNotice('تم تشغيل الوكلاء المتاحين مع إبقاء البحث الخارجي متوقفاً.'); await load(); };
  const retryFailed = async (name?: string) => { const failed = jobs.filter((job) => job.status === 'failed' && Number(job.attempts ?? 0) < Number(job.max_attempts ?? 3) && (!name || job.agent_name === name)); await Promise.all(failed.map((job) => simpleCrud.update('agent_jobs', job.id, { status: 'queued', scheduled_at: new Date().toISOString() }))); setNotice(`تمت إعادة ${failed.length} مهمة إلى Queue.`); await load(); };

  return <CRMPage title="مركز الوكلاء" description="مراقبة وتشغيل الوكلاء الخلفيين عبر Supabase Queues وCron — العمل مستمر حتى عند إغلاق المتصفح.">
    <div className="crm-card flex flex-wrap items-center gap-2 p-4"><span className={`crm-chip ${global?.enabled && !global?.paused ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}><span className={`h-2 w-2 rounded-full ${global?.enabled && !global?.paused ? 'bg-emerald-500' : 'bg-red-500'}`} /> Agents {global?.enabled && !global?.paused ? 'ON' : 'OFF'}</span><span className="ml-auto text-xs text-[#75664d]">Background Server-Side</span><button onClick={() => void resumeAll()} className="rounded-xl bg-[#2f2417] px-4 py-2 text-xs font-bold text-white hover:bg-[#49351f]">Agents ON</button><button onClick={() => void pauseAll()} className="rounded-xl border border-[#d8c49b] px-4 py-2 text-xs">Pause All</button><button onClick={() => void retryFailed()} className="rounded-xl border border-[#d8c49b] px-4 py-2 text-xs">Retry Failed</button><button onClick={() => void pauseAll(true)} className="rounded-xl bg-red-700 px-4 py-2 text-xs text-white">Emergency Stop</button></div>
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{EXTERNAL_SEARCH_PAUSED_MESSAGE}</p>
    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">{operationalMetrics.map(([label, count]) => <div key={String(label)} className="crm-kpi"><p className="text-xs font-semibold text-[#75664d]">{label}</p><strong className="mt-2 block text-3xl">{count}</strong></div>)}</div>
    {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    {loading ? <div className="crm-empty animate-pulse">جارٍ تحميل حالة الوكلاء...</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((row) => { const externalSearchPaused = EXTERNAL_SEARCH_PAUSED_AGENTS.has(row.name); const active = row.setting?.enabled && !row.setting?.paused && !externalSearchPaused; return <article key={row.name} className={`crm-card p-4 ${selected === row.name ? 'ring-2 ring-[#b78d38]/30' : ''}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{row.name}</h3><span className={`crm-chip mt-2 ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}><span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-amber-500'}`} />{externalSearchPaused ? EXTERNAL_SEARCH_PAUSED_MESSAGE : active ? 'Active' : 'Paused'}</span></div><div className="rounded-2xl bg-[#f7efdf] px-3 py-2 text-center"><strong className="block text-xl">{row.queued}</strong><span className="text-[10px] text-[#75664d]">Queue</span></div></div><div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-blue-50 p-2"><strong className="block text-lg text-blue-800">{row.running}</strong>Running</div><div className="rounded-xl bg-emerald-50 p-2"><strong className="block text-lg text-emerald-800">{row.completed}</strong>Completed</div><div className="rounded-xl bg-red-50 p-2"><strong className="block text-lg text-red-700">{row.failed}</strong>Failed</div></div><dl className="mt-4 space-y-2 border-t border-[#eee3cd] pt-3 text-xs"><div className="flex justify-between gap-2"><dt className="text-[#75664d]">Last Run</dt><dd>{row.last ? new Date(row.last).toLocaleString('ar-SA') : '—'}</dd></div><div className="flex justify-between gap-2"><dt className="text-[#75664d]">Next Run</dt><dd>{externalSearchPaused ? 'عند استعادة الحصة' : row.next ? new Date(row.next).toLocaleString('ar-SA') : safe(row.setting?.schedule) || 'Queue'}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><button disabled={externalSearchPaused} onClick={() => void runNow(row.name)} className="rounded-lg bg-[#2f2417] px-3 py-1.5 text-xs text-white disabled:cursor-not-allowed disabled:bg-[#b7aa95]">Run</button><button disabled={externalSearchPaused} onClick={() => void updateSetting(row.setting, { paused: !row.setting?.paused })} className="rounded-lg border px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:text-[#a39886]">{externalSearchPaused ? 'Paused' : row.setting?.paused ? 'Resume' : 'Pause'}</button><button onClick={() => setSelected(row.name)} className="rounded-lg border px-3 py-1.5 text-xs">Logs</button></div></article>; })}</div>}
    <section className="crm-card p-4"><div className="flex items-center justify-between"><h3 className="font-bold">Logs — {selected}</h3><span className="crm-chip bg-[#f4ead7] text-[#6c5225]">Live history</span></div><div className="mt-3 max-h-80 overflow-y-auto text-xs">{logs.filter((log) => log.agent_name === selected).slice(0, 100).map((log) => <div key={log.id} className="border-b border-[#eee3cd] py-3"><span className="text-[#9a7b2f]">{safe(log.created_at)} · {safe(log.level)}</span><p className="mt-1">{safe(log.message)}</p></div>)}{!logs.some((log) => log.agent_name === selected) && <div className="crm-empty">لا توجد Logs بعد.</div>}</div>{errors.some((error) => error.agent_name === selected && !error.resolved) && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">أخطاء غير محلولة: {errors.filter((error) => error.agent_name === selected && !error.resolved).length}</p>}</section>
    <p className="text-xs text-[#6f6044]">Runs المسجلة: {runs.length} · تحديث تلقائي كل 30 ثانية.</p>
  </CRMPage>;
}
