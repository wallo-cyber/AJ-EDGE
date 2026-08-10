import type { Company } from '../crm/types';
import { getSupabaseClient } from '../supabase/client';
import { supabaseCrm } from '../supabase/crm';
import { calculateLeadScore, isDuplicate, type DiscoveryInput, type DiscoveryStatus } from './core';

export type DiscoveredCompany = DiscoveryInput & { id: string; leadScore: number; reviewStatus: DiscoveryStatus; discoveredAt: string; companyId?: string };
type Row = Record<string, unknown>;
const s = (value: unknown) => typeof value === 'string' ? value : '';
const fromRow = (row: Row): DiscoveredCompany => ({ id: s(row.id), companyName: s(row.company_name), companyType: s(row.company_type), sector: s(row.sector), city: s(row.city), website: s(row.website), generalPhone: s(row.general_phone), generalEmail: s(row.general_email), discoverySource: s(row.discovery_source), sourceUrl: s(row.source_url), notes: s(row.notes), projectSignal: Boolean(row.project_signal), verificationStatus: s(row.verification_status), leadScore: Number(row.lead_score), reviewStatus: s(row.review_status) as DiscoveryStatus, discoveredAt: s(row.discovered_at), companyId: s(row.company_id) || undefined });
const toRow = (item: DiscoveryInput, status: DiscoveryStatus = 'جديد') => ({ company_name: item.companyName.trim(), company_type: item.companyType, sector: item.sector, city: item.city, website: item.website, general_phone: item.generalPhone, general_email: item.generalEmail, discovery_source: item.discoverySource || 'CSV', source_url: item.sourceUrl, verification_status: item.verificationStatus || 'بحاجة تحقق', lead_score: calculateLeadScore(item), project_signal: item.projectSignal, notes: item.notes, review_status: status, updated_at: new Date().toISOString() });

export const discoveryService = {
  async list() { const { data, error } = await getSupabaseClient().from('company_discovery').select('*').order('lead_score', { ascending: false }); if (error) throw error; return (data ?? []).map((row) => fromRow(row)); },
  async import(items: DiscoveryInput[]) {
    const [queued, companies] = await Promise.all([this.list(), supabaseCrm.companies.list()]);
    const companyInputs = companies.map((company) => ({ companyName: company.companyName, website: company.website, generalPhone: company.generalPhone } as DiscoveryInput));
    const accepted: DiscoveryInput[] = []; let duplicates = 0;
    for (const item of items) {
      if ([...queued, ...accepted, ...companyInputs].some((existing) => isDuplicate(item, existing))) duplicates += 1;
      else accepted.push(item);
    }
    if (!accepted.length) return { imported: 0, duplicates };
    const { error } = await getSupabaseClient().from('company_discovery').insert(accepted.map((item) => toRow(item)));
    if (error) throw error; return { imported: accepted.length, duplicates };
  },
  async update(id: string, item: DiscoveryInput, reviewStatus: DiscoveryStatus) { const { error } = await getSupabaseClient().from('company_discovery').update(toRow(item, reviewStatus)).eq('id', id); if (error) throw error; },
  async reject(ids: string[]) { const { error } = await getSupabaseClient().from('company_discovery').update({ review_status: 'غير مناسب', updated_at: new Date().toISOString() }).in('id', ids); if (error) throw error; },
  async approve(item: DiscoveredCompany) {
    const company = await supabaseCrm.companies.create({ companyName: item.companyName, companyType: item.companyType, sector: item.sector, city: item.city, website: item.website, generalPhone: item.generalPhone, generalEmail: item.generalEmail, status: 'مؤهل', notes: `${item.notes}${item.sourceUrl ? `\nالمصدر: ${item.sourceUrl}` : ''}` } as Partial<Company>);
    const { error } = await getSupabaseClient().from('company_discovery').update({ review_status: 'تمت إضافته للـ CRM', verification_status: 'مؤهل', company_id: company.id, updated_at: new Date().toISOString() }).eq('id', item.id); if (error) throw error; return company;
  },
};
