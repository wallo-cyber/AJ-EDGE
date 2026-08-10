import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-agent-token, x-client-info, apikey, content-type',
};
const LIVE_AGENTS = ['Verification', 'Enrichment', 'Decision Maker', 'Vendor Registration', 'Discovery adapter'];
const blockedDomains = ['linkedin.com', 'facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'wikipedia.org', 'google.com'];

type Row = Record<string, unknown>;
type SearchResult = { title?: string; url?: string; content?: string; score?: number };

const safe = (value: unknown) => String(value ?? '').trim();
const domainOf = (value: string) => {
  try { return new URL(value.startsWith('http') ? value : `https://${value}`).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return ''; }
};
const tokens = (value: string) => value.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff ]/g, ' ').split(/\s+/).filter((part) => part.length > 2);
const companyMatch = (company: Row, result: SearchResult) => {
  const haystack = `${safe(result.title)} ${safe(result.content)} ${domainOf(safe(result.url))}`.toLowerCase();
  const nameTokens = tokens(safe(company.company_name));
  return nameTokens.length > 0 && nameTokens.filter((part) => haystack.includes(part)).length >= Math.min(2, nameTokens.length);
};
const unique = <T>(items: T[]) => [...new Set(items)];
const decisionRolePattern = /\b(owner|chief executive officer|ceo|managing director|general manager|procurement manager|purchasing manager|projects? manager|business development manager|engineering manager|facilit(?:y|ies) manager)\b/i;

function extractDecisionMaker(company: Row, results: SearchResult[]) {
  for (const result of results) {
    const url = safe(result.url);
    const text = `${safe(result.title)} ${safe(result.content)}`;
    const role = text.match(decisionRolePattern)?.[0];
    if (!url.includes('linkedin.com/in/') || !role || !companyMatch(company, result) || Number(result.score ?? 0) < 0.55) continue;
    const rawName = safe(result.title).split(/\s(?:-|\|)\s/)[0].replace(/\s*\|?\s*LinkedIn.*$/i, '').trim();
    const nameParts = rawName.split(/\s+/).filter(Boolean);
    if (nameParts.length < 2 || nameParts.length > 5 || decisionRolePattern.test(rawName) || /company|group|factory|industrial|contracting/i.test(rawName)) continue;
    return {
      name: rawName,
      title: role,
      linkedin: url,
      source_url: url,
      confidence: Math.min(0.9, Math.max(0.7, Number(result.score ?? 0.7))),
    };
  }
  return null;
}

async function tavilySearch(query: string): Promise<SearchResult[]> {
  const key = Deno.env.get('TAVILY_API_KEY');
  if (!key) throw new Error('TAVILY_API_KEY is not configured');
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, search_depth: 'advanced', max_results: 8, include_answer: false, include_raw_content: false }),
  });
  if (!response.ok) throw new Error(`Tavily request failed (${response.status})`);
  const body = await response.json();
  return Array.isArray(body.results) ? body.results : [];
}

function extractFacts(company: Row, results: SearchResult[]) {
  const existingDomain = domainOf(safe(company.website));
  const distinctive = tokens(safe(company.company_name)).filter((part) => !['company', 'development', 'industrial', 'trading', 'real', 'estate', 'saudi', 'arabia'].includes(part));
  const matched = results.filter((result) => {
    const domain = domainOf(safe(result.url));
    const sameDomain = Boolean(existingDomain) && (domain === existingDomain || domain.endsWith(`.${existingDomain}`));
    const brandedDomain = distinctive.some((part) => domain.includes(part));
    const linkedInMatch = safe(result.url).includes('linkedin.com/') && companyMatch(company, result);
    return sameDomain || brandedDomain || linkedInMatch;
  });
  const official = matched.find((result) => {
    const domain = domainOf(safe(result.url));
    if (!domain || blockedDomains.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`))) return false;
    if (existingDomain) return domain === existingDomain || domain.endsWith(`.${existingDomain}`);
    return Number(result.score ?? 0) >= 0.6 && distinctive.some((part) => domain.includes(part));
  });
  const linkedIn = matched.find((result) => safe(result.url).includes('linkedin.com/company/'));
  const vendor = matched.find((result) => {
    const domain = domainOf(safe(result.url));
    const isRegistrationPage = /vendor|supplier|registration|procurement|\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0645\u0648\u0631\u062f|\u0627\u0644\u0645\u0648\u0631\u062f\u064a\u0646/i.test(`${safe(result.title)} ${safe(result.url)}`);
    return isRegistrationPage && Boolean(existingDomain) && (domain === existingDomain || domain.endsWith(`.${existingDomain}`));
  });
  const evidenceResults = official ? matched.filter((result) => domainOf(safe(result.url)) === domainOf(safe(official.url))) : [];
  const evidenceText = evidenceResults.map((result) => `${safe(result.title)} ${safe(result.content)}`).join(' ');
  const emails = unique((evidenceText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).map((email) => email.toLowerCase()));
  const phones = unique(evidenceText.match(/(?:\+?966|00966|0)?[\s-]?(?:1[013467]|5\d)[\s-]?\d{3}[\s-]?\d{4}/g) ?? []);
  const sourceFor = (value?: SearchResult) => value ? { value: safe(value.url), source_url: safe(value.url), confidence: Math.min(0.95, Math.max(0.65, Number(value.score ?? 0.7))) } : null;
  return {
    official_website: sourceFor(official),
    linkedin_company: sourceFor(linkedIn),
    vendor_registration: sourceFor(vendor),
    general_email: emails[0] ? { value: emails[0], source_url: safe(official?.url ?? matched[0]?.url), confidence: 0.72 } : null,
    general_phone: phones[0] ? { value: phones[0], source_url: safe(official?.url ?? matched[0]?.url), confidence: 0.72 } : null,
    sources: matched.slice(0, 8).map((result) => ({ title: safe(result.title), url: safe(result.url), confidence: Number(result.score ?? 0) })),
  };
}

async function authorized(request: Request, admin: ReturnType<typeof createClient>) {
  const supplied = request.headers.get('x-agent-token') ?? '';
  if (supplied) {
    const { data } = await admin.from('agent_runtime_secrets').select('secret_value').eq('secret_name', 'edge_cron_token').maybeSingle();
    if (safe(data?.secret_value) === supplied) return true;
  }
  const authorization = request.headers.get('Authorization') ?? '';
  if (!authorization) return false;
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data } = await userClient.auth.getUser();
  return Boolean(data.user);
}

async function processJob(admin: ReturnType<typeof createClient>, job: Row, company: Row | null) {
  const agent = safe(job.agent_name);
  const companyName = safe(company?.company_name);
  const city = safe(company?.city);
  let query = `${companyName} ${city} official company website phone email LinkedIn Saudi Arabia`;
  if (agent === 'Decision Maker') query = `${companyName} Saudi Arabia procurement projects engineering manager LinkedIn`;
  if (agent === 'Vendor Registration') query = `${companyName} vendor supplier registration procurement portal`;
  if (agent === 'Verification') query = `verify ${companyName} ${city} official website company Saudi Arabia`;
  if (agent === 'Discovery adapter') query = 'Eastern Province Saudi Arabia industrial factory real estate developer main contractor official company';
  const results = await tavilySearch(query);
  if (!company) {
    const result = { api_requests: 1, discovered_sources: results.slice(0, 8).map((item) => ({ title: safe(item.title), source_url: safe(item.url), confidence: Number(item.score ?? 0) })) };
    await admin.from('agent_jobs').update({ status: 'completed', result, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', job.id);
    return { enriched: 0, decisionMakers: 0, contacts: 0, vendorPortals: 0, manual: 0 };
  }
  const facts = extractFacts(company, results);
  const decisionMaker = agent === 'Decision Maker' ? extractDecisionMaker(company, results) : null;
  const updates: Row = { updated_at: new Date().toISOString() };
  let contacts = 0;
  if (!safe(company.website) && facts.official_website?.value) updates.website = facts.official_website.value;
  if (!safe(company.general_email) && facts.general_email?.value) { updates.general_email = facts.general_email.value; contacts += 1; }
  if (!safe(company.general_phone) && facts.general_phone?.value) { updates.general_phone = facts.general_phone.value; contacts += 1; }
  if (!safe(company.linkedin_company) && facts.linkedin_company?.value) updates.linkedin_company = facts.linkedin_company.value;
  if (!safe(company.vendor_registration_url) && facts.vendor_registration?.value) updates.vendor_registration_url = facts.vendor_registration.value;
  if (!safe(company.source_url) && facts.official_website?.source_url) updates.source_url = facts.official_website.source_url;
  if (Object.keys(updates).length > 1) await admin.from('companies').update(updates).eq('id', company.id);

  if (decisionMaker) {
    const { data: existingContacts } = await admin.from('contacts').select('id,linkedin,linked_in,full_name').eq('company_id', company.id);
    const normalizedName = decisionMaker.name.toLowerCase();
    const duplicateContact = (existingContacts ?? []).some((contact: Row) => (safe(contact.linkedin) || safe(contact.linked_in)) === decisionMaker.linkedin || safe(contact.full_name).toLowerCase() === normalizedName);
    if (!duplicateContact) {
      const { error: contactError } = await admin.from('contacts').insert({ owner_id: job.owner_id, company_id: company.id, company_name: companyName, name: decisionMaker.name, full_name: decisionMaker.name, position: decisionMaker.title, decision_role: decisionMaker.title, contact_classification: 'Decision Maker', linkedin: decisionMaker.linkedin, linked_in: decisionMaker.linkedin, source: decisionMaker.source_url, verification_status: 'Public Source Verified', contact_score: Math.round(decisionMaker.confidence * 100), notes: `Public source: ${decisionMaker.source_url} | Confidence: ${decisionMaker.confidence.toFixed(2)}` });
      if (contactError) throw contactError;
      contacts = 1;
    }
  }

  const { data: existing } = await admin.from('company_intelligence').select('id,data').eq('company_id', company.id).maybeSingle();
  const previousData = (existing?.data ?? {}) as Row;
  const previousHistory = (previousData.tavily_history ?? {}) as Row;
  const agentEvidence = { agent, checked_at: new Date().toISOString(), ...facts, decision_maker: decisionMaker };
  const intelligence = { ...previousData, tavily: agentEvidence, tavily_history: { ...previousHistory, [agent]: agentEvidence } };
  if (existing?.id) await admin.from('company_intelligence').update({ data: intelligence, updated_at: new Date().toISOString() }).eq('id', existing.id);
  else await admin.from('company_intelligence').insert({ owner_id: job.owner_id, company_id: company.id, company_name: companyName, data: intelligence });

  const useful = Object.keys(updates).length > 1 || facts.sources.length > 0;
  const manual = agent === 'Decision Maker' && !decisionMaker;
  const status = manual ? 'manual_research_required' : 'completed';
  const result = { api_requests: 1, source_count: facts.sources.length, fields_updated: Object.keys(updates).filter((key) => key !== 'updated_at'), confidence_stored: true, decision_maker: decisionMaker, reason: manual ? 'No verified named decision maker was created automatically' : undefined };
  await admin.from('agent_jobs').update({ status, result, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', job.id);
  return { enriched: useful ? 1 : 0, decisionMakers: decisionMaker ? 1 : 0, contacts, vendorPortals: facts.vendor_registration ? 1 : 0, manual: manual ? 1 : 0 };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return new Response('POST required', { status: 405, headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    if (!await authorized(request, admin)) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401, headers: cors });
    const body = await request.json().catch(() => ({}));
    const batchSize = Math.max(1, Math.min(Number(body.batch_size ?? 3), 5));
    const { data: companies } = await admin.from('companies').select('*').in('priority', ['A', 'B']).order('priority').order('lead_score', { ascending: false });
    const byId = new Map((companies ?? []).map((company: Row) => [safe(company.id), company]));
    const priorityA = (companies ?? []).filter((company: Row) => company.priority === 'A').map((company: Row) => company.id);
    const priorityB = (companies ?? []).filter((company: Row) => company.priority === 'B').map((company: Row) => company.id);
    const { data: candidates, error } = await admin.from('agent_jobs').select('*').in('agent_name', LIVE_AGENTS).in('status', ['queued', 'manual_research_required']).order('priority', { ascending: false }).order('created_at');
    if (error) throw error;
    const unprocessed = (candidates ?? []).filter((job: Row) => Number((job.result as Row | null)?.api_requests ?? 0) === 0);
    const ordered = [...unprocessed].sort((a: Row, b: Row) => {
      const rank = (id: unknown) => priorityA.includes(id) ? 0 : priorityB.includes(id) ? 1 : 2;
      return rank(a.company_id) - rank(b.company_id);
    }).slice(0, batchSize);
    const totals = { processed: 0, enriched: 0, decisionMakers: 0, contacts: 0, vendorPortals: 0, manual: 0, apiRequests: 0 };
    for (const job of ordered) {
      const nextAttempt = Math.min(Number(job.max_attempts ?? 3), Number(job.attempts ?? 0) + 1);
      await admin.from('agent_jobs').update({ status: 'running', started_at: new Date().toISOString(), attempts: nextAttempt }).eq('id', job.id);
      const { data: run } = await admin.from('agent_runs').insert({ owner_id: job.owner_id, job_id: job.id, agent_name: job.agent_name, status: 'running' }).select('id').single();
      try {
        const outcome = await processJob(admin, job, byId.get(safe(job.company_id)) ?? null);
        const finishedAt = new Date().toISOString();
        await admin.from('agent_runs').update({ status: outcome.manual ? 'manual_research_required' : 'completed', completed_at: finishedAt, summary: outcome }).eq('id', run?.id);
        await admin.from('agent_logs').insert({ owner_id: job.owner_id, job_id: job.id, run_id: run?.id ?? null, agent_name: job.agent_name, level: 'info', message: 'Tavily agent completed with source-backed results.', metadata: outcome });
        await admin.from('agent_settings').update({ last_run_at: finishedAt, next_run_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), updated_at: finishedAt }).eq('owner_id', job.owner_id).eq('agent_name', job.agent_name);
        totals.processed += 1; totals.enriched += outcome.enriched; totals.decisionMakers += outcome.decisionMakers; totals.contacts += outcome.contacts; totals.vendorPortals += outcome.vendorPortals; totals.manual += outcome.manual; totals.apiRequests += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const providerLimited = message.includes('(432)');
        const failed = !providerLimited && nextAttempt >= Number(job.max_attempts ?? 3);
        const status = providerLimited ? 'manual_research_required' : failed ? 'failed' : 'queued';
        const result = providerLimited ? { api_requests: 0, reason: 'Tavily provider limit reached; manual research required', provider_status: 432 } : undefined;
        await admin.from('agent_jobs').update({ status, result, last_error: message, completed_at: providerLimited || failed ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', job.id);
        await admin.from('agent_runs').update({ status: providerLimited ? 'manual_research_required' : failed ? 'failed' : 'retrying', completed_at: new Date().toISOString(), summary: { error: message, manual_research_required: providerLimited } }).eq('id', run?.id);
        await admin.from('agent_errors').insert({ owner_id: job.owner_id, job_id: job.id, run_id: run?.id ?? null, agent_name: job.agent_name, error_message: message, attempt: nextAttempt });
      }
    }
    return Response.json({ ok: true, ...totals }, { headers: cors });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500, headers: cors });
  }
});
