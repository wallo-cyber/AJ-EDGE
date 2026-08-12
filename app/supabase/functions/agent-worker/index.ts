import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

type Row = Record<string, unknown>;
type SearchResult = { title?: string; url?: string; content?: string; score?: number; provider?: string; rank?: number };
type AuthScope = { kind: 'cron'; ownerId: null } | { kind: 'user'; ownerId: string };

const safe = (value: unknown) => String(value ?? '').trim();
const allowedOrigin = (origin: string) => {
  if (!origin) return '';
  if (origin === 'https://aj-edge.vercel.app' || origin === 'https://aj-edge-wallo-8917.vercel.app') return origin;
  if (/^https:\/\/aj-edge-[a-z0-9-]+-wallo-8917\.vercel\.app$/i.test(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return origin;
  return '';
};
const corsFor = (request: Request) => ({
  'Access-Control-Allow-Origin': allowedOrigin(request.headers.get('Origin') ?? ''),
  'Access-Control-Allow-Headers': 'authorization, x-agent-token, x-client-info, apikey, content-type',
  'Vary': 'Origin',
});
const constantTimeEqual = (a: string, b: string) => {
  const aa = new TextEncoder().encode(a), bb = new TextEncoder().encode(b);
  let diff = aa.length ^ bb.length;
  const n = Math.max(aa.length, bb.length);
  for (let i = 0; i < n; i++) diff |= (aa[i % Math.max(aa.length, 1)] ?? 0) ^ (bb[i % Math.max(bb.length, 1)] ?? 0);
  return diff === 0;
};
const domainOf = (value: string) => { try { return new URL(value.startsWith('http') ? value : `https://${value}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const stop = new Set(['company','co','limited','ltd','llc','inc','group','international','holding','holdings','development','industrial','contracting','trading','estate','real','saudi','arabia','investment','business']);
const tokens = (value: string) => value.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff ]/g, ' ').split(/\s+/).filter((x) => x.length > 2 && !stop.has(x));
const companyMatch = (company: Row, result: SearchResult) => {
  const ts = tokens(safe(company.company_name));
  const hay = `${safe(result.title)} ${safe(result.content)} ${safe(result.url)}`.toLowerCase();
  if (!ts.length) return false;
  const hits = ts.filter((x) => hay.includes(x)).length;
  return ts.length === 1 ? hits === 1 : hits >= Math.min(2, ts.length);
};
const committeeRole = (company: Row) => {
  const t = safe(company.company_type).toLowerCase();
  if (t.includes('developer')) return ['PROJECT_OWNER', 'Projects / Construction'];
  if (t.includes('contractor')) return ['PROCUREMENT_GATEKEEPER', 'Procurement / Subcontracts'];
  if (t.includes('factory') || t.includes('industrial')) return ['TECHNICAL_BUYER', 'Engineering / Projects'];
  if (t.includes('consult') || safe(company.company_type).includes('هندسي')) return ['INFLUENCER', 'Projects / Technical'];
  return ['PROCUREMENT_GATEKEEPER', 'Procurement / Projects'];
};
const roleTerms: Record<string, string[]> = {
  PROJECT_OWNER:['project director','head of projects','projects director','project manager','construction director','manager, projects construction','development manager'],
  PROCUREMENT_GATEKEEPER:['procurement director','head of procurement','procurement manager','supply chain manager','subcontracts manager'],
  TECHNICAL_BUYER:['engineering director','engineering manager','technical director','technical manager','projects manager'],
  INFLUENCER:['project manager','technical manager','design manager','tender manager'],
  ECONOMIC_BUYER:['chief executive officer','managing director','general manager'],
  CONTRACTS_COMMERCIAL:['contracts director','contracts manager','commercial manager'],
  SITE_USER:['plant manager','facility manager','operations manager'],
};
const roleMatch = (role: string, text: string) => (roleTerms[role] ?? []).find((term) => text.toLowerCase().includes(term)) ?? '';
const plausibleName = (raw: string) => {
  const parts = raw.split(/\s+/).filter(Boolean);
  return parts.length >= 2 && parts.length <= 6 && !/(company|group|factory|industrial|contracting|developer|project|manager|director|procurement|engineering|linkedin)/i.test(raw);
};
const extractCandidateName = (title: string) => {
  const zoom = title.match(/^Contact\s+([^,|]+?)(?:,|\|)/i);
  if (zoom?.[1]) return zoom[1].trim();
  return title.split(/\s(?:-|\|)\s/)[0].replace(/\s*LinkedIn.*$/i, '').replace(/^Contact\s+/i,'').trim();
};
const allowedCandidateDomain = (url: string, site: string) => {
  const d = domainOf(url);
  return url.includes('linkedin.com/in/') || Boolean(site && d === site) || ['zoominfo.com','rocketreach.co','signalhire.com'].some(x => d === x || d === `www.${x}`);
};
const signalRegex = /(expansion|new factory|warehouse|new facility|epc award|contractor award|consultant appointment|building permit|industrial land|modon|vendor registration|prequalification|rfq|rfp|tender|projects director|procurement manager|توسعة|مصنع جديد|مستودع|تسجيل الموردين|تأهيل مسبق|مناقصة)/i;

async function braveSearch(query: string): Promise<SearchResult[]> {
  const key = Deno.env.get('BRAVE_SEARCH_API_KEY');
  if (!key) throw new Error('BRAVE_SEARCH_API_KEY is not configured');
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query.slice(0, 390)); url.searchParams.set('count', '10');
  const response = await fetch(url, { headers: { Accept: 'application/json', 'X-Subscription-Token': key } });
  if (!response.ok) throw new Error(`Brave request failed (${response.status})`);
  const body = await response.json();
  return (body?.web?.results ?? []).map((x: any, i: number) => ({ title:safe(x.title), url:safe(x.url), content:safe(x.description), score:Math.max(.58,.90-i*.035), provider:'brave', rank:i+1 }));
}
async function tavilySearch(query: string): Promise<SearchResult[]> {
  const key = Deno.env.get('TAVILY_API_KEY'); if (!key) return [];
  const response = await fetch('https://api.tavily.com/search', { method:'POST', headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json' }, body:JSON.stringify({ query, search_depth:'advanced', max_results:8, include_answer:false }) });
  if (!response.ok) throw new Error(`Tavily request failed (${response.status})`);
  const body = await response.json(); return (body.results ?? []).map((x: SearchResult) => ({ ...x, provider:'tavily' }));
}
async function search(query: string) {
  const errors: string[] = [];
  try { const results = await braveSearch(query); if (results.length) return { results, provider:'brave', errors }; } catch (e) { errors.push(e instanceof Error ? e.message : String(e)); }
  try { const results = await tavilySearch(query); if (results.length) return { results, provider:'tavily', errors }; } catch (e) { errors.push(e instanceof Error ? e.message : String(e)); }
  return { results:[] as SearchResult[], provider:'none', errors };
}
async function authorize(request: Request, admin: ReturnType<typeof createClient>): Promise<AuthScope | null> {
  const supplied = request.headers.get('x-agent-token') ?? '';
  if (supplied) {
    const { data } = await admin.from('agent_runtime_secrets').select('secret_value').eq('secret_name', 'edge_cron_token').maybeSingle();
    if (constantTimeEqual(safe(data?.secret_value), supplied)) return { kind:'cron', ownerId:null };
  }
  const authorization = request.headers.get('Authorization') ?? '';
  if (!authorization) return null;
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global:{ headers:{ Authorization:authorization } }, auth:{ persistSession:false } });
  const { data } = await userClient.auth.getUser();
  return data.user ? { kind:'user', ownerId:data.user.id } : null;
}
async function saveEvidence(admin: any, job: Row, company: Row, result: SearchResult, type: string, fact: string, confidence: number, query: string) {
  await admin.from('research_evidence').insert({ owner_id:job.owner_id, company_id:company.id, job_id:job.id, evidence_type:type, source_provider:result.provider ?? 'web_search', source_url:safe(result.url), source_title:safe(result.title), extracted_fact:fact, verification_confidence:confidence, date_found:new Date().toISOString(), raw_metadata:{ query, rank:result.rank ?? null } });
}
async function processDecision(admin: any, job: Row, company: Row) {
  const [fallbackRole, fallbackDept] = committeeRole(company);
  const role = safe(job.research_target_role) || fallbackRole, dept = safe(job.research_target_department) || fallbackDept;
  const companyName = safe(company.company_name), brand = tokens(companyName)[0] || companyName.split(/\s+/)[0], primary = roleTerms[role]?.[0] ?? 'manager', site=domainOf(safe(company.website));
  const queries = [`${brand} ${primary} Saudi Arabia LinkedIn`, `${brand} ${dept} director manager Saudi Arabia`, `${brand} ${primary} ZoomInfo`, site ? `site:${site} ${primary} team leadership` : `${brand} leadership ${primary}`];
  let candidates = 0, requests = 0; const providerErrors: string[] = [], providers:string[]=[];
  for (const query of queries) {
    const resultSet = await search(query); requests++; providers.push(resultSet.provider); providerErrors.push(...resultSet.errors);
    for (const result of resultSet.results) {
      const text = `${safe(result.title)} ${safe(result.content)} ${safe(result.url)}`;
      if (!companyMatch(company, result)) continue;
      const title = roleMatch(role, text); if (!title) continue;
      const url = safe(result.url); if (!allowedCandidateDomain(url, site)) continue;
      const rawName = extractCandidateName(safe(result.title)); if (!plausibleName(rawName)) continue;
      const thirdParty = !url.includes('linkedin.com/in/') && !(site && domainOf(url)===site);
      const confidence = thirdParty ? 55 : Math.min(69, Math.max(45, Math.round(Number(result.score ?? .6) * 100)));
      try { await saveEvidence(admin, job, company, result, 'DECISION_MAKER', `${rawName} — ${title}`, confidence, query); } catch {}
      const { data: existing } = await admin.from('buying_committee_members').select('id').eq('company_id', company.id).eq('committee_role', role).eq('source_url', url).maybeSingle();
      if (!existing?.id) {
        const { error } = await admin.from('buying_committee_members').insert({ owner_id:job.owner_id, company_id:company.id, contact_id:null, committee_role:role, name:rawName, position:title, department:dept, linkedin:url.includes('linkedin.com/in/') ? url : '', email:'', phone:'', source:thirdParty?'third_party_directory':result.provider ?? 'web_search', source_url:url, verification_confidence:confidence, influence:2, relationship_strength:0, attitude:'Unknown', verification_status:'needs_research', date_found:new Date().toISOString() });
        if (!error) candidates++;
      }
      if (candidates) break;
    }
    if (candidates) break;
  }
  await admin.from('agent_jobs').update({ status:'manual_research_required', result:{ api_requests:requests, candidates, providers, provider_errors:providerErrors, queries }, updated_at:new Date().toISOString() }).eq('id', job.id).eq('owner_id',job.owner_id);
  return { candidates, signals:0 };
}
function signalType(text: string) { const t=text.toLowerCase(); if(t.includes('rfq'))return'RFQ'; if(t.includes('rfp'))return'RFP'; if(t.includes('tender')||t.includes('مناقصة'))return'TENDER'; if((t.includes('vendor')&&t.includes('registration'))||t.includes('تسجيل الموردين'))return'VENDOR_REGISTRATION'; if(t.includes('prequal'))return'PREQUALIFICATION'; if(t.includes('modon'))return'MODON_ANNOUNCEMENT'; if(t.includes('expansion')||t.includes('توسعة'))return'FACTORY_EXPANSION'; if(t.includes('warehouse')||t.includes('مستودع'))return'WAREHOUSE_CONSTRUCTION'; if(t.includes('new factory'))return'NEW_FACTORY'; return'PROJECT_SIGNAL'; }
async function processSignal(admin: any, job: Row, company: Row) {
  const brand = tokens(safe(company.company_name))[0] || safe(company.company_name).split(/\s+/)[0];
  const query = `${brand} ${safe(company.company_name)} Saudi Arabia vendor registration supplier registration expansion project warehouse RFQ RFP tender MODON`;
  const resultSet = await search(query); let inserted = 0; const site=domainOf(safe(company.website));
  for (const result of resultSet.results) {
    const text = `${safe(result.title)} ${safe(result.content)} ${safe(result.url)}`;
    if (!companyMatch(company, result) || !signalRegex.test(text) || !safe(result.url)) continue;
    const type = signalType(text), url=safe(result.url), official=Boolean(site&&domainOf(url)===site);
    const entityMatch=companyMatch(company,result)?85:0, geographyMatch=/saudi|ksa|السعود/i.test(text)?85:(official?80:40), eventMatch=signalRegex.test(safe(result.title)+url)?85:60, sourceQuality=official?100:(/gov\.sa|modon\.gov\.sa|etimad\.sa/i.test(url)?95:55), freshness=/2026|2025|recent|latest/i.test(text)?80:50;
    const confidence = Math.min(69, Math.max(40, Math.round(Number(result.score ?? .6) * 100)));
    const { data: existing } = await admin.from('external_signals').select('id').eq('company_id', company.id).eq('signal_type', type).eq('source_url', url).maybeSingle();
    if (existing?.id) continue;
    const { error } = await admin.from('external_signals').insert({ owner_id:job.owner_id, company_id:company.id, signal_type:type, title:safe(result.title)||type, summary:safe(result.content).slice(0,800), source_provider:result.provider ?? 'web_search', source_url:url, source_title:safe(result.title), verification_confidence:confidence, verification_status:'needs_research', entity_match_confidence:entityMatch, geography_match_confidence:geographyMatch, event_match_confidence:eventMatch, source_quality_confidence:sourceQuality, freshness_confidence:freshness, detected_at:new Date().toISOString(), suggested_move:'Human verification required before any opportunity or outreach action', raw_metadata:{ query, rank:result.rank ?? null } });
    if (!error) { inserted++; try { await saveEvidence(admin, job, company, result, 'BUSINESS_SIGNAL', `${type} — ${safe(result.title)}`, confidence, query); } catch {} }
  }
  await admin.from('agent_jobs').update({ status:inserted ? 'completed' : 'manual_research_required', result:{ api_requests:1, signals_found:inserted, provider:resultSet.provider, provider_errors:resultSet.errors, query }, completed_at:inserted?new Date().toISOString():null, updated_at:new Date().toISOString() }).eq('id', job.id).eq('owner_id',job.owner_id);
  return { candidates:0, signals:inserted };
}

Deno.serve(async (request) => {
  const cors = corsFor(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers:cors });
  if (request.method !== 'POST') return new Response('POST required', { status:405, headers:cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth:{ persistSession:false, autoRefreshToken:false } });
  try {
    const scope = await authorize(request, admin);
    if (!scope) return Response.json({ ok:false, error:'Unauthorized' }, { status:401, headers:cors });
    const body = await request.json().catch(() => ({})); const size = Math.max(1, Math.min(Number(body.batch_size ?? 4), 6));
    let jobsQuery = admin.from('agent_jobs').select('*').in('agent_name',['Decision Maker','External Signal Radar']).in('status',['queued','manual_research_required']).order('priority',{ascending:false}).order('created_at').limit(300);
    if (scope.kind === 'user') jobsQuery = jobsQuery.eq('owner_id', scope.ownerId);
    const { data: rawJobs, error: jobError } = await jobsQuery; if (jobError) throw jobError;
    const jobs = (rawJobs ?? []).filter((j: Row) => Number((j.result as Row | null)?.api_requests ?? 0) === 0).slice(0,size);
    const ids = [...new Set(jobs.map((j: Row) => j.company_id).filter(Boolean))];
    let companyQuery = admin.from('companies').select('*').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
    if (scope.kind === 'user') companyQuery = companyQuery.eq('owner_id', scope.ownerId);
    const { data: companies, error: companyError } = await companyQuery; if (companyError) throw companyError;
    const companyById = new Map((companies ?? []).map((c: Row) => [safe(c.id), c]));
    const totals = { processed:0, candidates:0, signals:0, manual:0 };
    for (const job of jobs) {
      if (scope.kind === 'user' && safe(job.owner_id) !== scope.ownerId) continue;
      const company = companyById.get(safe(job.company_id)); if (!company) continue;
      await admin.from('agent_jobs').update({ status:'running', started_at:new Date().toISOString(), last_error:'' }).eq('id', job.id).eq('owner_id', job.owner_id);
      try {
        const outcome = safe(job.agent_name) === 'External Signal Radar' ? await processSignal(admin, job, company) : await processDecision(admin, job, company);
        totals.processed++; totals.candidates += outcome.candidates; totals.signals += outcome.signals; if (!outcome.candidates && !outcome.signals) totals.manual++;
      } catch (error) {
        await admin.from('agent_jobs').update({ status:'manual_research_required', last_error:error instanceof Error?error.message:String(error), updated_at:new Date().toISOString() }).eq('id', job.id).eq('owner_id', job.owner_id);
        totals.manual++;
      }
    }
    return Response.json({ ok:true, scope:scope.kind, ...totals }, { headers:cors });
  } catch (error) {
    return Response.json({ ok:false, error:error instanceof Error?error.message:String(error) }, { status:500, headers:cors });
  }
});
