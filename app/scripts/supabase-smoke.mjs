import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

try {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
  }
} catch {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.SUPABASE_TEST_EMAIL;
const password = process.env.SUPABASE_TEST_PASSWORD;
if (!url || !key) throw new Error('Supabase URL and publishable key are required.');

const supabase = createClient(url, key, { auth: { persistSession: false } });
const ids = {};
const marker = `AJ-EDGE-SMOKE-${crypto.randomUUID()}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function insert(table, values) {
  const { data, error } = await supabase.from(table).insert(values).select('*').single();
  if (error) throw error;
  ids[table] = data.id;
  return data;
}

async function update(table, id, values) {
  const { data, error } = await supabase.from(table).update(values).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

try {
  if (!email || !password) {
    const health = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
    assert(health.ok, `Supabase connectivity failed (${health.status}).`);
    const protectedTable = await fetch(`${url}/rest/v1/company_discovery?select=id&limit=1`, { headers: { apikey: key } });
    assert(protectedTable.status === 401, `Anonymous RLS check returned ${protectedTable.status} instead of 401.`);
    console.log('Supabase connectivity passed and anonymous access to company_discovery is blocked; authenticated CRUD deferred without test credentials.');
    process.exitCode = 0;
  } else {
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) throw authError;

  const company = await insert('companies', { company_name: marker, company_type: 'مصنع', city: 'الدمام', status: 'نشط' });
  assert(company.company_name === marker, 'Company insert/read failed.');
  const updatedCompany = await update('companies', company.id, { notes: 'smoke-updated' });
  assert(updatedCompany.notes === 'smoke-updated', 'Company update failed.');

  const contact = await insert('contacts', { company_id: company.id, company_name: marker, full_name: marker, department: 'المشاريع' });
  assert((await update('contacts', contact.id, { position: 'Smoke' })).position === 'Smoke', 'Contact update failed.');

  const followUp = await insert('follow_ups', { company_id: company.id, contact_id: contact.id, company_name: marker, subject: marker, status: 'مجدولة' });
  assert((await update('follow_ups', followUp.id, { result: 'smoke-updated' })).result === 'smoke-updated', 'Follow-up update failed.');

  const opportunity = await insert('opportunities', { company_id: company.id, title: marker, value: 1, probability: 10 });
  assert((await update('opportunities', opportunity.id, { probability: 20 })).probability === 20, 'Opportunity update failed.');

  const meeting = await insert('meetings', { company_id: company.id, title: marker, meeting_date: new Date().toISOString() });
  assert((await update('meetings', meeting.id, { location: 'Smoke' })).location === 'Smoke', 'Meeting update failed.');

  const message = await insert('messages', { company_id: company.id, company_name: marker, subject: marker, body: marker });
  assert((await update('messages', message.id, { channel: 'Smoke' })).channel === 'Smoke', 'Message update failed.');

  const quotation = await insert('quotations', { company_id: company.id, company_name: marker, quotation_number: marker, title: marker, value: 1 });
  assert(Number((await update('quotations', quotation.id, { value: 2 })).value) === 2, 'Quotation update failed.');

  const contract = await insert('contracts', { company_id: company.id, company_name: marker, contract_number: marker, title: marker, value: 1 });
  assert((await update('contracts', contract.id, { status: 'Smoke' })).status === 'Smoke', 'Contract update failed.');

  const { data, error } = await supabase.from('companies').select('id').eq('id', company.id).single();
  if (error) throw error;
  assert(data.id === company.id, 'Company select failed.');
  console.log('Authenticated Supabase CRM flow passed for 8 tables.');
  }
} finally {
  for (const table of ['contracts', 'quotations', 'messages', 'meetings', 'opportunities', 'follow_ups', 'contacts', 'companies']) {
    if (!ids[table]) continue;
    const { error } = await supabase.from(table).delete().eq('id', ids[table]);
    if (error) console.error(`Cleanup failed for ${table}: ${error.message}`);
  }
  await supabase.auth.signOut();
}
