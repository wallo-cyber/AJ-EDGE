import type { Company } from '../crm/types';
import { getSupabaseClient } from '../supabase/client';
import { supabaseCrm } from '../supabase/crm';
import { dataCompleteness, duplicateStatus, prepareImport, scoreDetails, type DiscoveryInput, type DiscoveryStatus } from './core';

export type DiscoveredCompany = DiscoveryInput & { id: string; leadScore: number; reviewStatus: DiscoveryStatus; discoveredAt: string; companyId?: string };
type Row = Record<string, unknown>;
const s = (value: unknown) => typeof value === 'string' ? value : '';
const fromRow = (row: Row): DiscoveredCompany => ({ id: s(row.id), companyName: s(row.company_name), companyType: s(row.company_type), sector: s(row.sector), activity:s(row.activity), address:s(row.address), tags:Array.isArray(row.tags)?row.tags.join(', '):'', city: s(row.city), website: s(row.website), generalPhone: s(row.general_phone), generalEmail: s(row.general_email), contactName: s(row.contact_name), contactPosition: s(row.contact_position), contactEmail:s(row.contact_email),contactPhone:s(row.contact_phone), linkedIn: s(row.linkedin), discoverySource: s(row.discovery_source), sourceUrl: s(row.source_url), notes: s(row.notes), projectSignal: Boolean(row.project_signal), verificationStatus: s(row.verification_status), leadScore: Number(row.lead_score), reviewStatus: s(row.review_status) as DiscoveryStatus, discoveredAt: s(row.discovered_at), companyId: s(row.company_id) || undefined });
const toRow = (item: DiscoveryInput, status: DiscoveryStatus = 'جديد') => { const scoring=scoreDetails(item); return ({ company_name: item.companyName.trim(), company_type: item.companyType, sector: item.sector, activity:item.activity??'', address:item.address??'', tags:(item.tags??'').split(',').map(v=>v.trim()).filter(Boolean), city: item.city, website: item.website, general_phone: item.generalPhone, general_email: item.generalEmail, contact_name: item.contactName, contact_position: item.contactPosition, contact_email:item.contactEmail??'',contact_phone:item.contactPhone??'', linkedin: item.linkedIn, discovery_source: item.discoverySource || 'CSV', source_url: item.sourceUrl, verification_status: item.verificationStatus || 'بحاجة تحقق', lead_score: scoring.score, score_reasons:scoring.reasons, data_completeness:dataCompleteness(item), duplicate_status:'New Lead', project_signal: item.projectSignal, notes: item.notes, review_status: status, updated_at: new Date().toISOString() }); };

export const discoveryService = {
  async list() { const { data, error } = await getSupabaseClient().from('company_discovery').select('*').order('lead_score', { ascending: false }); if (error) throw error; return (data ?? []).map((row) => fromRow(row)); },
  async import(items: DiscoveryInput[]) {
    const [queued, companies] = await Promise.all([this.list(), supabaseCrm.companies.list()]);
    const companyInputs = companies.map((company) => ({ companyName: company.companyName, website: company.website, generalPhone: company.generalPhone } as DiscoveryInput));
    const existing=[...queued, ...companyInputs]; const report = prepareImport(items, existing);
    if (!report.accepted.length) return { ...report, imported: 0 };
    const { error } = await getSupabaseClient().from('company_discovery').insert(report.accepted.map((item) => ({...toRow(item, !item.website && !item.generalPhone && !item.generalEmail ? 'بحاجة تحقق' : 'جديد'),duplicate_status:existing.some(e=>duplicateStatus(item,e)==='Possible Duplicate')?'Possible Duplicate':'New Lead'})));
    if (error) throw error; return { ...report, imported: report.accepted.length };
  },
  async update(id: string, item: DiscoveryInput, reviewStatus: DiscoveryStatus) { const { error } = await getSupabaseClient().from('company_discovery').update(toRow(item, reviewStatus)).eq('id', id); if (error) throw error; },
  async reject(ids: string[]) { const { error } = await getSupabaseClient().from('company_discovery').update({ review_status: 'غير مناسب', updated_at: new Date().toISOString() }).in('id', ids); if (error) throw error; },
  async approve(item: DiscoveredCompany) {
    const company = await supabaseCrm.companies.create({ companyName: item.companyName, companyType: item.companyType, sector: item.sector, city: item.city, website: item.website, generalPhone: item.generalPhone, generalEmail: item.generalEmail, contactPerson: item.contactName, position: item.contactPosition, linkedIn: item.linkedIn, status: 'مؤهل', notes: `${item.notes}${item.sourceUrl ? `\nالمصدر: ${item.sourceUrl}` : ''}` } as Partial<Company>);
    await getSupabaseClient().from('companies').update({activity:item.activity??'',address:item.address??'',source_name:item.discoverySource,source_url:item.sourceUrl,lead_score:item.leadScore,data_completeness:dataCompleteness(item),tags:(item.tags??'').split(',').map(v=>v.trim()).filter(Boolean)}).eq('id',company.id);
    if(item.contactName){await supabaseCrm.contacts.create({companyId:company.id,companyName:item.companyName,fullName:item.contactName,position:item.contactPosition,email:item.contactEmail||item.generalEmail,mobile:item.contactPhone||item.generalPhone,linkedIn:item.linkedIn,decisionLevel:'غير محدد',preferredContactMethod:'البريد الإلكتروني',notes:`تم إنشاؤه من اكتشاف الشركات: ${item.discoverySource}`});}
    const { error } = await getSupabaseClient().from('company_discovery').update({ review_status: 'تمت إضافته للـ CRM', verification_status: 'مؤهل', company_id: company.id, updated_at: new Date().toISOString() }).eq('id', item.id); if (error) throw error; return company;
  },
};
