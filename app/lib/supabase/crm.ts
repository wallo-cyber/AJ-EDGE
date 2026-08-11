import type { Company, Contact, FollowUp, Meeting, Opportunity } from '../crm/types';
import { getSupabaseClient, isSupabaseConfigured } from './client';

type DbRow = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function nullable(value: string) {
  return value || null;
}

function jsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function throwIfError(error: { message: string; code?: string } | null) {
  if (error) {
    console.error('[Supabase:crm]', error.code || 'request_failed');
    throw new Error('تعذر إتمام العملية في قاعدة البيانات. أعد المحاولة، وإن استمرت المشكلة راجع حالة النظام.');
  }
}

function companyFromRow(row: DbRow): Company {
  return {
    id: text(row.id), companyName: text(row.company_name), companyType: text(row.company_type),
    sector: text(row.sector), city: text(row.city), website: text(row.website),
    generalEmail: text(row.general_email) || text(row.email), generalPhone: text(row.general_phone) || text(row.phone),
    contactPerson: text(row.contact_person), position: text(row.position), mobile: text(row.mobile),
    linkedIn: text(row.linked_in) || text(row.linkedin), serviceOpportunity: text(row.service_opportunity),
    status: text(row.status), lastContact: text(row.last_contact), nextFollowUp: text(row.next_follow_up),
    notes: text(row.notes), priority:text(row.priority), leadScore:Number(row.lead_score||0), dataCompleteness:Number(row.data_completeness||0), dataQualityStatus:text(row.data_quality_status), missingFields:jsonArray<string>(row.missing_fields), scoreReasons:jsonArray<string>(row.score_reasons), sourceName:text(row.source_name), sourceUrl:text(row.source_url),
    qualificationStatus:text(row.qualification_status), qualificationReason:text(row.qualification_reason), contractingAngle:text(row.contracting_angle), nextAction:text(row.next_action), vendorRegistrationUrl:text(row.vendor_registration_url), vendorRegistrationStatus:text(row.vendor_registration_status), vendorRegistrationRequirements:text(row.vendor_registration_requirements), vendorRegistrationAccountStatus:text(row.vendor_registration_account_status), vendorRegistrationLastChecked:text(row.vendor_registration_last_checked), vendorRegistrationNextAction:text(row.vendor_registration_next_action), vendorRegistrationNotes:text(row.vendor_registration_notes), outreachStatus:text(row.outreach_status), verificationStatus:text(row.verification_status), archivedAt:text(row.archived_at), communicationHistory: jsonArray(row.communication_history),
    followUps: jsonArray(row.follow_ups), opportunities: jsonArray(row.opportunities),
    createdAt: text(row.created_at), updatedAt: text(row.updated_at),
  };
}

function companyToRow(company: Partial<Company>) {
  return {
    company_name: company.companyName, company_type: nullable(company.companyType ?? ''), sector: nullable(company.sector ?? ''),
    city: nullable(company.city ?? ''), website: nullable(company.website ?? ''), email: nullable(company.generalEmail ?? ''),
    phone: nullable(company.generalPhone ?? ''), general_email: company.generalEmail ?? '', general_phone: company.generalPhone ?? '',
    contact_person: nullable(company.contactPerson ?? ''), position: nullable(company.position ?? ''), mobile: company.mobile ?? '',
    linkedin: nullable(company.linkedIn ?? ''), linked_in: company.linkedIn ?? '', service_opportunity: company.serviceOpportunity ?? '',
    status: nullable(company.status ?? ''), last_contact: company.lastContact ?? '', next_follow_up: nullable(company.nextFollowUp ?? ''),
    notes: nullable(company.notes ?? ''), priority: company.priority ?? 'C', lead_score: company.leadScore ?? 0,
    data_completeness: company.dataCompleteness ?? 0, data_quality_status: company.dataQualityStatus ?? 'Poor Data',
    missing_fields: company.missingFields ?? [], score_reasons: company.scoreReasons ?? [], source_name: company.sourceName ?? '',
    source_url: company.sourceUrl ?? '', qualification_status: company.qualificationStatus ?? 'Needs Research',
    qualification_reason: company.qualificationReason ?? '', contracting_angle: company.contractingAngle ?? '',
    next_action: company.nextAction ?? '', vendor_registration_url: company.vendorRegistrationUrl ?? '',
    vendor_registration_status: company.vendorRegistrationStatus ?? 'Not Checked', vendor_registration_requirements: company.vendorRegistrationRequirements ?? '', vendor_registration_account_status: company.vendorRegistrationAccountStatus ?? '', vendor_registration_last_checked: nullable(company.vendorRegistrationLastChecked ?? ''), vendor_registration_next_action: company.vendorRegistrationNextAction ?? '', vendor_registration_notes: company.vendorRegistrationNotes ?? '', archived_at: nullable(company.archivedAt ?? ''), outreach_status: company.outreachStatus ?? 'Not Contacted',
    verification_status: company.verificationStatus ?? 'Needs Verification', communication_history: company.communicationHistory ?? [],
    follow_ups: company.followUps ?? [], opportunities: company.opportunities ?? [], updated_at: new Date().toISOString(),
  };
}

function contactFromRow(row: DbRow): Contact {
  return {
    id: text(row.id), companyId: text(row.company_id), companyName: text(row.company_name),
    fullName: text(row.full_name) || text(row.name), position: text(row.position), department: text(row.department),
    mobile: text(row.mobile) || text(row.phone), email: text(row.email), linkedIn: text(row.linked_in) || text(row.linkedin),
    decisionLevel: text(row.decision_level), preferredContactMethod: text(row.preferred_contact_method), source: text(row.source), sourceUrl: text(row.source_url), confidence: Number(row.confidence || 0), verificationStatus: text(row.verification_status), notes: text(row.notes),
    createdAt: text(row.created_at), updatedAt: text(row.updated_at),
  };
}

function contactToRow(contact: Partial<Contact>) {
  const contactScore = Math.min(100, (contact.fullName ? 20 : 0) + (contact.position ? 15 : 0) + (contact.department ? 10 : 0) + (contact.mobile ? 15 : 0) + (contact.email ? 15 : 0) + (contact.linkedIn ? 10 : 0) + (contact.decisionLevel && contact.decisionLevel !== 'Unknown' ? 15 : 0));
  return {
    company_id: nullable(contact.companyId ?? ''), company_name: contact.companyName ?? '', name: nullable(contact.fullName ?? ''),
    full_name: contact.fullName ?? '', position: nullable(contact.position ?? ''), department: contact.department ?? '',
    phone: nullable(contact.mobile ?? ''), mobile: contact.mobile ?? '', email: nullable(contact.email ?? ''),
    linkedin: nullable(contact.linkedIn ?? ''), linked_in: contact.linkedIn ?? '', decision_level: contact.decisionLevel ?? '',
    preferred_contact_method: contact.preferredContactMethod ?? '', decision_role: contact.position ?? 'Other', contact_classification: contact.decisionLevel === 'Primary' ? 'Decision Maker' : contact.decisionLevel === 'Influencer' ? 'Influencer' : ['Procurement', 'Projects', 'Engineering', 'Management'].includes(contact.decisionLevel ?? '') ? 'Decision Maker' : 'General Contact', verification_status: contact.verificationStatus ?? 'Needs Verification', contact_score: contactScore, source: contact.source ?? '', source_url: contact.sourceUrl ?? '', confidence: Math.max(0, Math.min(100, Number(contact.confidence || 0))), notes: nullable(contact.notes ?? ''), updated_at: new Date().toISOString(),
  };
}

function followUpFromRow(row: DbRow): FollowUp {
  return {
    id: text(row.id), companyId: text(row.company_id), companyName: text(row.company_name), contactId: text(row.contact_id) || undefined,
    contactPerson: text(row.contact_person), followUpType: text(row.follow_up_type), date: text(row.date) || text(row.due_date),
    time: text(row.time).slice(0, 5), priority: text(row.priority), status: text(row.status), subject: text(row.subject) || text(row.title),
    notes: text(row.notes), result: text(row.result), nextAction: text(row.next_action), nextFollowUpDate: text(row.next_follow_up_date),
    createdAt: text(row.created_at), updatedAt: text(row.updated_at),
  };
}

function followUpToRow(item: Partial<FollowUp>) {
  return {
    company_id: nullable(item.companyId ?? ''), company_name: item.companyName ?? '', contact_id: nullable(item.contactId ?? ''),
    contact_person: item.contactPerson ?? '', follow_up_type: item.followUpType ?? '', date: item.date || new Date().toISOString().slice(0, 10),
    due_date: nullable(item.date ?? ''), time: item.time || '00:00', priority: item.priority ?? '', status: nullable(item.status ?? ''),
    subject: item.subject ?? '', title: nullable(item.subject ?? ''), notes: nullable(item.notes ?? ''), result: item.result ?? '', outcome: item.result ?? '',
    next_action: item.nextAction ?? '', next_follow_up_date: nullable(item.nextFollowUpDate ?? ''), updated_at: new Date().toISOString(),
  };
}

async function list(table: string, mapper: (row: DbRow) => unknown) {
  const { data, error } = await getSupabaseClient().from(table).select('*').order('created_at', { ascending: false });
  throwIfError(error);
  return (data ?? []).map((row) => mapper(row as DbRow));
}

async function insert<T>(table: string, row: DbRow, mapper: (row: DbRow) => T) {
  const { data, error } = await getSupabaseClient().from(table).insert(row).select('*').single();
  throwIfError(error);
  return mapper(data as DbRow);
}

async function update<T>(table: string, id: string, row: DbRow, mapper: (row: DbRow) => T) {
  const { data, error } = await getSupabaseClient().from(table).update(row).eq('id', id).select('*').single();
  throwIfError(error);
  return mapper(data as DbRow);
}

async function remove(table: string, id: string) {
  const { error } = await getSupabaseClient().from(table).delete().eq('id', id);
  throwIfError(error);
}

export const supabaseCrm = {
  configured: isSupabaseConfigured,
  companies: {
    list: () => list('companies', companyFromRow) as Promise<Company[]>,
    create: (item: Partial<Company>) => insert('companies', companyToRow(item), companyFromRow),
    update: (id: string, item: Partial<Company>) => update('companies', id, companyToRow(item), companyFromRow),
    remove: (id: string) => remove('companies', id),
  },
  contacts: {
    list: () => list('contacts', contactFromRow) as Promise<Contact[]>,
    create: (item: Partial<Contact>) => insert('contacts', contactToRow(item), contactFromRow),
    update: (id: string, item: Partial<Contact>) => update('contacts', id, contactToRow(item), contactFromRow),
    remove: (id: string) => remove('contacts', id),
  },
  followUps: {
    list: () => list('follow_ups', followUpFromRow) as Promise<FollowUp[]>,
    create: (item: Partial<FollowUp>) => insert('follow_ups', followUpToRow(item), followUpFromRow),
    update: (id: string, item: Partial<FollowUp>) => update('follow_ups', id, followUpToRow(item), followUpFromRow),
    remove: (id: string) => remove('follow_ups', id),
  },
  meetings: {
    list: () => list('meetings', (row) => ({ id: text(row.id), companyId: text(row.company_id), companyName: '', contactPerson: '', title: text(row.title), scheduledAt: text(row.meeting_date), location: text(row.location), notes: text(row.notes), status: '', createdAt: text(row.created_at), updatedAt: text(row.created_at) })) as Promise<Meeting[]>,
  },
  opportunities: {
    list: () => list('opportunities', (row) => ({ id: text(row.id), companyId: text(row.company_id), companyName: '', title: text(row.title), service: '', probability: String(row.probability ?? ''), estimatedValue: String(row.value ?? ''), stage: text(row.stage), priority: '', owner: '', notes: text(row.notes), createdAt: text(row.created_at), updatedAt: text(row.created_at) })) as Promise<Opportunity[]>,
    create: (item: Partial<Opportunity>) => insert('opportunities', {
      company_id: nullable(item.companyId ?? ''), title: nullable(item.title ?? ''),
      value: Number(item.estimatedValue || 0), stage: nullable(item.stage ?? ''),
      probability: Number.parseInt(item.probability ?? '0', 10) || 0, notes: nullable(item.notes ?? ''),
    }, (row) => ({ id: text(row.id), companyId: text(row.company_id), companyName: item.companyName ?? '', title: text(row.title), service: item.service ?? '', probability: String(row.probability ?? ''), estimatedValue: String(row.value ?? ''), stage: text(row.stage), priority: item.priority ?? '', owner: item.owner ?? '', notes: text(row.notes), createdAt: text(row.created_at), updatedAt: text(row.created_at) } as Opportunity)),
  },
};
