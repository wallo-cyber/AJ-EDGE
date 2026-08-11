export const OUTREACH_STATES = ['CHANNEL_AVAILABLE', 'CONTACT_NEEDED', 'DECISION_MAKER_VERIFIED', 'DRAFT_READY', 'APPROVED', 'CONTACTED', 'REPLIED'] as const;
export type OutreachState = typeof OUTREACH_STATES[number];

export const OPPORTUNITY_STAGES = ['IDENTIFIED', 'QUALIFIED', 'RFQ_RECEIVED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;
export type OpportunityStage = typeof OPPORTUNITY_STAGES[number];

export const CONTACT_VERIFICATION_STATES = ['UNVERIFIED', 'PARTIALLY_VERIFIED', 'VERIFIED'] as const;
export type ContactVerificationState = typeof CONTACT_VERIFICATION_STATES[number];

export type BusinessRow = Record<string, unknown>;

const value = (input: unknown) => String(input ?? '').trim();

export function isVerifiedDecisionMaker(contact: BusinessRow) {
  const verified = value(contact.verification_status).toUpperCase() === 'VERIFIED';
  const decisionMaker = contact.decision_maker === true || value(contact.contact_classification) === 'Decision Maker';
  return verified && decisionMaker;
}

export function companyOutreachState(company: BusinessRow, contacts: BusinessRow[], drafts: BusinessRow[], events: BusinessRow[]): OutreachState {
  const ownContacts = contacts.filter((row) => row.company_id === company.id);
  const ownDrafts = drafts.filter((row) => row.company_id === company.id && !row.archived_at);
  const ownEvents = events.filter((row) => row.company_id === company.id && !row.archived_at);
  if (ownEvents.some((row) => value(row.direction) === 'INBOUND')) return 'REPLIED';
  if (ownEvents.some((row) => value(row.direction) === 'OUTBOUND')) return 'CONTACTED';
  if (ownDrafts.some((row) => value(row.status) === 'Approved' && row.contact_id && ownContacts.some((contact) => contact.id === row.contact_id && isVerifiedDecisionMaker(contact)))) return 'APPROVED';
  if (ownDrafts.some((row) => value(row.status) === 'Draft' && row.contact_id && ownContacts.some((contact) => contact.id === row.contact_id && isVerifiedDecisionMaker(contact)))) return 'DRAFT_READY';
  if (ownContacts.some(isVerifiedDecisionMaker)) return 'DECISION_MAKER_VERIFIED';
  if (ownContacts.length === 0) return 'CONTACT_NEEDED';
  return company.general_email || company.email || company.general_phone || company.phone ? 'CHANNEL_AVAILABLE' : 'CONTACT_NEEDED';
}

export function decisionMakerCoverage(companies: BusinessRow[], contacts: BusinessRow[]) {
  const active = companies.filter((company) => !company.archived_at);
  const covered = active.filter((company) => contacts.some((contact) => contact.company_id === company.id && isVerifiedDecisionMaker(contact))).length;
  return { covered, total: active.length, percent: active.length ? Math.round(covered / active.length * 100) : 0 };
}

export function canonicalOpportunityStage(stage: unknown): OpportunityStage {
  const normalized = value(stage).toUpperCase().replaceAll(' ', '_');
  if (OPPORTUNITY_STAGES.includes(normalized as OpportunityStage)) return normalized as OpportunityStage;
  if (normalized.includes('RFQ')) return 'RFQ_RECEIVED';
  if (normalized.includes('PROPOSAL') || normalized.includes('SUBMITTED')) return 'PROPOSAL';
  if (normalized.includes('MEETING') || normalized.includes('QUALIFIED')) return 'QUALIFIED';
  return 'IDENTIFIED';
}
