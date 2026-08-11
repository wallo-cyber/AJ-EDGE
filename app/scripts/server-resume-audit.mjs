import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const envText = await readFile(new URL('../.env.local', import.meta.url), 'utf8');
const localEnv = Object.fromEntries(envText.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match) return [];
  return [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]];
}));
const env = (name) => process.env[name] || localEnv[name];
const url = env('NEXT_PUBLIC_SUPABASE_URL');
const secret = env('SUPABASE_SECRET_KEY');
const publishable = env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
if (!url || !secret || !publishable) throw new Error('Missing local Supabase server-audit configuration.');

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const anonymous = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
const applicationTables = [
  'companies', 'contacts', 'follow_ups', 'opportunities', 'messages', 'meetings',
  'quotations', 'contracts', 'documents', 'news', 'company_intelligence', 'timeline',
  'company_discovery', 'user_settings', 'agents', 'agent_settings', 'agent_jobs',
  'agent_runs', 'agent_logs', 'agent_errors', 'audit_events',
];

async function count(table, apply = (query) => query) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = await apply(admin.from(table).select('*', { count: 'exact', head: true }));
    if (!result.error) return result.count ?? 0;
    if (attempt === 3) {
      const summary = [result.error.code, result.error.message, result.error.details, result.error.hint].filter(Boolean).join(' | ');
      throw new Error(`${table}: ${summary || 'Supabase request failed without diagnostic text'}`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
}

async function all(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) return rows;
  }
}

function duplicateGroups(rows, keyOf) {
  const seen = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.values()].filter((value) => value > 1).length;
}

async function queueState() {
  const state = {};
  for (const status of ['queued', 'running', 'completed', 'manual_research_required', 'failed', 'cancelled']) {
    state[status] = await count('agent_jobs', (query) => query.eq('status', status));
  }
  return state;
}

const resume = { requested: process.argv.includes('--resume'), supervisorCalled: false, workerPasses: 0, processed: 0 };
if (resume.requested) {
  const { error: supervisorError } = await admin.rpc('agent_supervisor_tick');
  if (supervisorError) throw new Error(`Supervisor resume failed: ${supervisorError.message}`);
  resume.supervisorCalled = true;
  for (let pass = 0; pass < 100; pass += 1) {
    const state = await queueState();
    if (state.queued === 0 && state.running === 0) break;
    const { data, error } = await admin.rpc('agent_worker_tick', { p_batch_size: 50 });
    if (error) throw new Error(`Internal worker failed: ${error.message}`);
    resume.workerPasses += 1;
    resume.processed += Number(data ?? 0);
  }
}

const tableCounts = {};
for (const table of applicationTables) tableCounts[table] = await count(table);
const companies = await all('companies', 'id,owner_id,company_name,website,general_phone,priority,archived_at,last_contact,last_outcome,vendor_registration_url,missing_fields');
const contacts = await all('contacts', 'id,owner_id,company_id,full_name,email,mobile,contact_classification');
const messages = await all('messages', 'id,owner_id,company_id,status,template_name');
const jobs = await all('agent_jobs', 'id,owner_id,company_id,agent_name,status,idempotency_key,attempts,max_attempts');
const settings = await all('agent_settings', 'id,owner_id,agent_name,enabled,paused,schedule');
const followUps = await all('follow_ups', 'id,owner_id,company_id,status,date,due_date');
const opportunities = await all('opportunities', 'id,owner_id,company_id,title,stage,next_action,next_action_date');
const queue = await queueState();
const today = new Date().toISOString().slice(0, 10);
const openFollowUps = followUps.filter((row) => !['Completed', 'Cancelled'].includes(String(row.status ?? '')));
const taskCount = Math.min(20,
  openFollowUps.filter((row) => String(row.date || row.due_date || '') <= today).length
  + companies.filter((row) => row.priority === 'A' && !row.last_contact && !row.archived_at).length
  + opportunities.filter((row) => !['Won', 'Lost'].includes(String(row.stage ?? '')) && (!row.next_action || !row.next_action_date || String(row.next_action_date) <= today)).length,
);
const duplicates = {
  companies: duplicateGroups(companies, (row) => `${row.owner_id}|${String(row.company_name ?? '').trim().toLocaleLowerCase()}`),
  contacts: duplicateGroups(contacts, (row) => `${row.owner_id}|${row.company_id}|${String(row.full_name ?? '').trim().toLocaleLowerCase()}`),
  jobs: duplicateGroups(jobs, (row) => row.idempotency_key ? `${row.owner_id}|${row.agent_name}|${row.company_id ?? ''}|${row.idempotency_key}` : ''),
};
const { error: anonymousError } = await anonymous.from('companies').select('id').limit(1);
const { data: users, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
if (authError) throw new Error(`Auth admin verification failed: ${authError.message}`);

console.log(JSON.stringify({
  serverAccess: true,
  authAdminAccess: Array.isArray(users?.users),
  anonymousProtected: Boolean(anonymousError),
  tableCounts,
  activeCompanies: companies.filter((row) => !row.archived_at).length,
  drafts: messages.filter((row) => ['Draft', 'Approved'].includes(String(row.status ?? ''))).length,
  tasks: taskCount,
  queue,
  internalAgents: {
    total: settings.filter((row) => row.agent_name !== '_global').length,
    enabled: settings.filter((row) => row.agent_name !== '_global' && row.enabled).length,
    unpaused: settings.filter((row) => row.agent_name !== '_global' && !row.paused).length,
    globalEnabled: Boolean(settings.find((row) => row.agent_name === '_global')?.enabled),
    globalPaused: Boolean(settings.find((row) => row.agent_name === '_global')?.paused),
  },
  duplicates,
  resume,
}, null, 2));
