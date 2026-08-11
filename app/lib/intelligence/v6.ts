import { businessAngle, messageSimilarity, type IntelligenceRow, type MessageStyle, type TargetSegment } from './core.ts';

export const SIGNAL_TYPES = [
  'VENDOR_PORTAL_FOUND', 'CONTACT_FOUND', 'DECISION_MAKER_VERIFIED', 'PROJECT_SIGNAL', 'RFQ_SIGNAL',
  'REPLY_SIGNAL', 'MEETING_SIGNAL', 'REFERRAL_SIGNAL', 'FOLLOW_UP_DUE', 'STALE_RELATIONSHIP',
  'DATA_COMPLETED', 'HIGH_FIT_TARGET', 'OPPORTUNITY_SIGNAL',
] as const;
export type SignalType = typeof SIGNAL_TYPES[number];
export type SignalStrength = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RelationshipStage = 'UNKNOWN' | 'TARGET' | 'RESEARCHING' | 'CONTACT_READY' | 'OUTREACH_PREPARED' | 'CONTACTED' | 'ENGAGED' | 'MEETING' | 'OPPORTUNITY' | 'NURTURE' | 'WON' | 'LOST' | 'DO_NOT_CONTACT';
export type NextActionCode = 'VERIFY_COMPANY' | 'COMPLETE_RESEARCH' | 'FIND_DECISION_MAKER' | 'VERIFY_CONTACT' | 'CHECK_VENDOR_REGISTRATION' | 'PREPARE_OUTREACH_STRATEGY' | 'PREPARE_DRAFT' | 'REVIEW_DRAFT' | 'RECORD_COMMUNICATION' | 'FOLLOW_UP' | 'REPLY_REQUIRED' | 'SCHEDULE_MEETING' | 'CREATE_OPPORTUNITY' | 'REVIEW_OPPORTUNITY' | 'RECONNECT_LATER' | 'CLOSE_NOT_RELEVANT';
export type ReplyIntent = 'INTERESTED' | 'SEND_PROFILE' | 'VENDOR_REGISTRATION' | 'REFERRAL' | 'MEETING_REQUEST' | 'RFQ' | 'FOLLOW_UP_LATER' | 'NOT_NOW' | 'NOT_INTERESTED' | 'WRONG_CONTACT' | 'OUT_OF_OFFICE' | 'GENERAL_RESPONSE' | 'UNKNOWN';
export type AgentTeam = 'RESEARCH' | 'STRATEGY' | 'OUTREACH' | 'COMMERCIAL' | 'SUPERVISOR';
export type OutreachAutomationLevel = 0 | 1 | 2 | 3 | 4;

export type Evidence = { label: string; value: string; source?: string };
export type ExplainableScore = { score: number; reason: string; confidence: number; evidence: Evidence[]; updatedAt: string };
export type BusinessSignal = {
  companyId: string; type: SignalType; strength: SignalStrength; confidence: number; evidence: Evidence[];
  source: string; detectedAt: string; expiresAt?: string; recommendedAction: NextActionCode;
};
export type NextBestAction = {
  code: NextActionCode; reason: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; dueAt?: string;
  source: string; confidence: number; blockingRequirement?: string;
};

const stringValue = (value: unknown) => String(value ?? '').trim();
const upper = (value: unknown) => stringValue(value).toUpperCase();
const numberValue = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const bool = (value: unknown) => value === true || upper(value) === 'TRUE';
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const nowIso = (value?: Date | string) => value instanceof Date ? value.toISOString() : value || new Date().toISOString();
const sameCompany = (company: IntelligenceRow, row: IntelligenceRow) => !company.id || row.company_id === company.id;
const hasEvidence = (row: IntelligenceRow) => Boolean(row.evidence || row.evidence_reference || row.source || row.source_url || row.research_evidence_url);
const active = (row: IntelligenceRow) => !row.archived_at;

export function isVerifiedDecisionMakerV6(contact: IntelligenceRow) {
  return active(contact) && bool(contact.decision_maker) && upper(contact.verification_status) === 'VERIFIED' && hasEvidence(contact);
}

export function deriveRelationshipStage(context: {
  company: IntelligenceRow; contacts?: IntelligenceRow[]; drafts?: IntelligenceRow[]; events?: IntelligenceRow[];
  meetings?: IntelligenceRow[]; opportunities?: IntelligenceRow[];
}): RelationshipStage {
  const { company } = context;
  const contacts = (context.contacts ?? []).filter(row => sameCompany(company, row) && active(row));
  const drafts = (context.drafts ?? []).filter(row => sameCompany(company, row) && active(row));
  const events = (context.events ?? []).filter(row => sameCompany(company, row) && active(row));
  const meetings = (context.meetings ?? []).filter(row => sameCompany(company, row) && active(row));
  const opportunities = (context.opportunities ?? []).filter(row => sameCompany(company, row) && active(row));
  if (bool(company.do_not_contact) || upper(company.relationship_stage) === 'DO_NOT_CONTACT') return 'DO_NOT_CONTACT';
  if (opportunities.some(row => upper(row.stage) === 'WON')) return 'WON';
  if (opportunities.some(row => upper(row.stage) === 'LOST')) return 'LOST';
  if (opportunities.length) return 'OPPORTUNITY';
  if (meetings.length || events.some(row => upper(row.reply_intent) === 'MEETING_REQUEST')) return 'MEETING';
  if (events.some(row => upper(row.direction) === 'INBOUND')) return 'ENGAGED';
  if (events.some(row => upper(row.direction) === 'OUTBOUND')) return 'CONTACTED';
  if (drafts.some(row => ['DRAFT', 'APPROVED'].includes(upper(row.status)))) return 'OUTREACH_PREPARED';
  if (contacts.some(isVerifiedDecisionMakerV6)) return 'CONTACT_READY';
  if (contacts.length || upper(company.verification_status).includes('RESEARCH')) return 'RESEARCHING';
  if (company.id) return 'TARGET';
  return 'UNKNOWN';
}

export function buildRelationshipMemory(context: {
  company: IntelligenceRow; contacts?: IntelligenceRow[]; drafts?: IntelligenceRow[]; events?: IntelligenceRow[];
  meetings?: IntelligenceRow[]; opportunities?: IntelligenceRow[]; notes?: IntelligenceRow[]; research?: IntelligenceRow[];
}) {
  const { company } = context;
  const collect = (kind: string, rows: IntelligenceRow[], dateFields: string[]) => rows
    .filter(row => sameCompany(company, row) && active(row))
    .map(row => ({
      id: stringValue(row.id), kind, at: dateFields.map(field => stringValue(row[field])).find(Boolean) || '',
      summary: stringValue(row.outcome || row.subject || row.title || row.notes || row.research_extracted_fact || row.body),
      evidence: stringValue(row.evidence_reference || row.source_url || row.research_evidence_url || row.source),
    }));
  const timeline = [
    ...collect('COMMUNICATION', context.events ?? [], ['occurred_at', 'created_at']),
    ...collect('MEETING', context.meetings ?? [], ['meeting_date', 'scheduled_at', 'created_at']),
    ...collect('OPPORTUNITY', context.opportunities ?? [], ['updated_at', 'created_at']),
    ...collect('RESEARCH', context.research ?? [], ['completed_at', 'updated_at', 'created_at']),
    ...collect('NOTE', context.notes ?? [], ['updated_at', 'created_at']),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const stage = deriveRelationshipStage(context);
  const last = timeline[0];
  const inbound = (context.events ?? []).filter(row => sameCompany(company, row) && upper(row.direction) === 'INBOUND').sort((a, b) => stringValue(b.occurred_at).localeCompare(stringValue(a.occurred_at)))[0];
  const outbound = (context.events ?? []).filter(row => sameCompany(company, row) && upper(row.direction) === 'OUTBOUND').sort((a, b) => stringValue(b.occurred_at).localeCompare(stringValue(a.occurred_at)))[0];
  return {
    relationshipSummary: timeline.length ? `${timeline.length} حدثاً محفوظاً؛ آخر حدث: ${last.kind}${last.summary ? ` — ${last.summary}` : ''}.` : 'لا يوجد تواصل أو حدث تجاري موثق بعد.',
    relationshipStatus: stage,
    lastMeaningfulEvent: last ?? null,
    lastOutboundAt: stringValue(outbound?.occurred_at),
    lastReplyAt: stringValue(inbound?.occurred_at),
    nextRelationshipAction: stage === 'ENGAGED' ? 'REPLY_REQUIRED' : stage === 'CONTACTED' ? 'FOLLOW_UP' : stage === 'OPPORTUNITY' ? 'REVIEW_OPPORTUNITY' : 'COMPLETE_RESEARCH',
    importantCommitments: timeline.filter(item => /commit|promise|send|profile|موعد|إرسال|تزويد/i.test(item.summary)),
    timeline,
  };
}

const signal = (companyId: string, type: SignalType, strength: SignalStrength, confidence: number, evidence: Evidence[], source: string, recommendedAction: NextActionCode, detectedAt: string): BusinessSignal => ({ companyId, type, strength, confidence: clamp(confidence), evidence, source, recommendedAction, detectedAt });

export function detectBusinessSignals(context: {
  company: IntelligenceRow; contacts?: IntelligenceRow[]; events?: IntelligenceRow[]; meetings?: IntelligenceRow[];
  followups?: IntelligenceRow[]; opportunities?: IntelligenceRow[]; now?: Date;
}) {
  const { company } = context;
  const companyId = stringValue(company.id);
  const detectedAt = nowIso(context.now);
  const contacts = (context.contacts ?? []).filter(row => sameCompany(company, row) && active(row));
  const events = (context.events ?? []).filter(row => sameCompany(company, row) && active(row));
  const meetings = (context.meetings ?? []).filter(row => sameCompany(company, row) && active(row));
  const followups = (context.followups ?? []).filter(row => sameCompany(company, row) && active(row));
  const opportunities = (context.opportunities ?? []).filter(row => sameCompany(company, row) && active(row));
  const signals: BusinessSignal[] = [];
  if (company.vendor_registration_url) signals.push(signal(companyId, 'VENDOR_PORTAL_FOUND', 'HIGH', 95, [{ label: 'Vendor portal', value: stringValue(company.vendor_registration_url), source: stringValue(company.source_url) }], 'COMPANY_DATA', 'CHECK_VENDOR_REGISTRATION', detectedAt));
  if (contacts.length) signals.push(signal(companyId, 'CONTACT_FOUND', 'MEDIUM', 80, [{ label: 'Contacts', value: String(contacts.length) }], 'CONTACTS', contacts.some(isVerifiedDecisionMakerV6) ? 'PREPARE_OUTREACH_STRATEGY' : 'VERIFY_CONTACT', detectedAt));
  const verified = contacts.filter(isVerifiedDecisionMakerV6);
  if (verified.length) signals.push(signal(companyId, 'DECISION_MAKER_VERIFIED', 'HIGH', Math.max(...verified.map(row => numberValue(row.confidence) || 85)), verified.map(row => ({ label: 'Decision maker', value: stringValue(row.full_name || row.name), source: stringValue(row.source_url || row.source) })), 'CONTACTS', 'PREPARE_OUTREACH_STRATEGY', detectedAt));
  const inbound = events.filter(row => upper(row.direction) === 'INBOUND');
  if (inbound.length) signals.push(signal(companyId, 'REPLY_SIGNAL', 'HIGH', 100, inbound.slice(0, 3).map(row => ({ label: stringValue(row.reply_intent || 'Reply'), value: stringValue(row.outcome || row.notes), source: stringValue(row.evidence_reference) })), 'COMMUNICATION_EVENTS', 'REPLY_REQUIRED', detectedAt));
  const rfq = inbound.find(row => upper(row.reply_intent) === 'RFQ' && hasEvidence(row));
  if (rfq) signals.push(signal(companyId, 'RFQ_SIGNAL', 'CRITICAL', 100, [{ label: 'RFQ reply', value: stringValue(rfq.outcome || rfq.notes), source: stringValue(rfq.evidence_reference) }], 'COMMUNICATION_EVENTS', 'CREATE_OPPORTUNITY', detectedAt));
  if (meetings.length) signals.push(signal(companyId, 'MEETING_SIGNAL', 'HIGH', 95, [{ label: 'Meetings', value: String(meetings.length) }], 'MEETINGS', 'REVIEW_OPPORTUNITY', detectedAt));
  const due = followups.filter(row => !['COMPLETED', 'CANCELLED'].includes(upper(row.status)) && stringValue(row.date || row.due_date) <= detectedAt.slice(0, 10));
  if (due.length) signals.push(signal(companyId, 'FOLLOW_UP_DUE', 'HIGH', 100, [{ label: 'Due follow-ups', value: String(due.length) }], 'FOLLOW_UPS', 'FOLLOW_UP', detectedAt));
  if (numberValue(company.data_completeness) >= 80) signals.push(signal(companyId, 'DATA_COMPLETED', 'MEDIUM', 90, [{ label: 'Completeness', value: `${numberValue(company.data_completeness)}%` }], 'COMPANY_DATA', verified.length ? 'PREPARE_OUTREACH_STRATEGY' : 'FIND_DECISION_MAKER', detectedAt));
  if (numberValue(company.lead_score) >= 80) signals.push(signal(companyId, 'HIGH_FIT_TARGET', 'HIGH', 90, [{ label: 'Lead score', value: String(numberValue(company.lead_score)) }], 'COMPANY_DATA', verified.length ? 'PREPARE_OUTREACH_STRATEGY' : 'FIND_DECISION_MAKER', detectedAt));
  if (opportunities.length) signals.push(signal(companyId, 'OPPORTUNITY_SIGNAL', 'CRITICAL', 100, opportunities.map(row => ({ label: stringValue(row.stage), value: stringValue(row.title), source: stringValue(row.source) })), 'OPPORTUNITIES', 'REVIEW_OPPORTUNITY', detectedAt));
  const memory = buildRelationshipMemory({ company, contacts, events, meetings, opportunities });
  if (memory.lastMeaningfulEvent?.at) {
    const age = context.now ? context.now.getTime() - new Date(memory.lastMeaningfulEvent.at).getTime() : 0;
    if (age > 60 * 86_400_000) signals.push(signal(companyId, 'STALE_RELATIONSHIP', 'MEDIUM', 90, [{ label: 'Last event', value: memory.lastMeaningfulEvent.at }], 'RELATIONSHIP_MEMORY', 'RECONNECT_LATER', detectedAt));
  }
  return signals;
}

export function opportunitySignalScore(signals: BusinessSignal[], updatedAt?: string): ExplainableScore {
  const weights: Partial<Record<SignalType, number>> = { RFQ_SIGNAL: 45, OPPORTUNITY_SIGNAL: 40, REPLY_SIGNAL: 18, MEETING_SIGNAL: 22, REFERRAL_SIGNAL: 15, FOLLOW_UP_DUE: 8, PROJECT_SIGNAL: 25, HIGH_FIT_TARGET: 8, VENDOR_PORTAL_FOUND: 4 };
  const accepted = signals.filter(item => item.evidence.length > 0 && (
    !(['PROJECT_SIGNAL', 'RFQ_SIGNAL'] as SignalType[]).includes(item.type)
    || item.evidence.some(entry => Boolean(entry.value && (entry.source || item.source === 'COMMUNICATION_EVENTS')))
  ));
  const points = accepted.reduce((sum, item) => sum + (weights[item.type] ?? 0) * item.confidence / 100, 0);
  return { score: clamp(points), reason: accepted.length ? accepted.map(item => item.type).join(', ') : 'لا توجد إشارة تجارية موثقة تستدعي التحرك الآن.', confidence: accepted.length ? clamp(accepted.reduce((sum, item) => sum + item.confidence, 0) / accepted.length) : 100, evidence: accepted.flatMap(item => item.evidence), updatedAt: updatedAt || nowIso() };
}

export function recommendNextBestAction(context: {
  company: IntelligenceRow; contacts?: IntelligenceRow[]; drafts?: IntelligenceRow[]; events?: IntelligenceRow[];
  followups?: IntelligenceRow[]; meetings?: IntelligenceRow[]; opportunities?: IntelligenceRow[]; signals?: BusinessSignal[]; now?: Date;
}): NextBestAction {
  const company = context.company;
  const contacts = (context.contacts ?? []).filter(row => sameCompany(company, row) && active(row));
  const drafts = (context.drafts ?? []).filter(row => sameCompany(company, row) && active(row));
  const events = (context.events ?? []).filter(row => sameCompany(company, row) && active(row));
  const followups = (context.followups ?? []).filter(row => sameCompany(company, row) && active(row));
  const opportunities = (context.opportunities ?? []).filter(row => sameCompany(company, row) && active(row));
  const today = nowIso(context.now).slice(0, 10);
  const result = (code: NextActionCode, reason: string, priority: NextBestAction['priority'], confidence: number, blockingRequirement?: string): NextBestAction => ({ code, reason, priority, confidence, blockingRequirement, source: 'V6_NEXT_BEST_ACTION', dueAt: priority === 'CRITICAL' ? today : undefined });
  if (bool(company.do_not_contact) || upper(company.relationship_stage) === 'DO_NOT_CONTACT') return result('CLOSE_NOT_RELEVANT', 'الشركة مصنفة عدم تواصل؛ لا يجوز إنشاء أو إرسال تواصل جديد.', 'CRITICAL', 100, 'DO_NOT_CONTACT');
  const unresolvedReply = events.find(row => upper(row.direction) === 'INBOUND' && !row.action_completed_at);
  if (unresolvedReply) return result('REPLY_REQUIRED', 'يوجد رد وارد موثق لم يُغلق إجراؤه التالي.', 'CRITICAL', 100);
  const due = followups.find(row => !['COMPLETED', 'CANCELLED'].includes(upper(row.status)) && stringValue(row.date || row.due_date) <= today);
  if (due) return result('FOLLOW_UP', 'توجد متابعة مستحقة أو متأخرة.', 'HIGH', 100);
  if (upper(company.verification_status).includes('NEEDS') || numberValue(company.data_completeness) < 40) return result('COMPLETE_RESEARCH', 'ملف الشركة غير مكتمل بما يكفي لاتخاذ قرار تواصل آمن.', 'HIGH', 90, 'COMPANY_EVIDENCE');
  const decisionMaker = contacts.find(isVerifiedDecisionMakerV6);
  if (!decisionMaker) return result(contacts.length ? 'VERIFY_CONTACT' : 'FIND_DECISION_MAKER', contacts.length ? 'توجد جهة اتصال لكن لا يوجد صانع قرار موثق بدليل.' : 'لا يوجد صانع قرار حقيقي مرتبط بالشركة.', 'HIGH', 100, 'VERIFIED_DECISION_MAKER');
  const strategyExists = Boolean(company.business_angle) || Boolean(company.conversation_strategy_id);
  if (!strategyExists) return result('PREPARE_OUTREACH_STRATEGY', 'صانع القرار موثق لكن استراتيجية المحادثة لم تُعتمد بعد.', 'MEDIUM', 95);
  const draft = drafts.find(row => ['DRAFT', 'APPROVED'].includes(upper(row.status)));
  if (!draft) return result('PREPARE_DRAFT', 'الاستراتيجية جاهزة ولا توجد مسودة مرتبطة بصانع القرار.', 'HIGH', 100);
  if (upper(draft.status) === 'DRAFT') return result('REVIEW_DRAFT', 'المسودة تحتاج مراجعة بشرية ولا تعتبر جاهزة أو مرسلة.', 'HIGH', 100);
  const outbound = events.find(row => upper(row.direction) === 'OUTBOUND');
  if (!outbound) return result('RECORD_COMMUNICATION', 'المسودة معتمدة لكن لا يوجد حدث تواصل صادر فعلي.', 'MEDIUM', 100, 'MANUAL_COMMUNICATION_EVENT');
  if (opportunities.length) return result('REVIEW_OPPORTUNITY', 'توجد فرصة مفتوحة وتحتاج مراجعة الخطوة التجارية التالية.', 'HIGH', 100);
  const commercialSignal = (context.signals ?? []).some(item => ['RFQ_SIGNAL', 'MEETING_SIGNAL', 'OPPORTUNITY_SIGNAL'].includes(item.type));
  if (commercialSignal) return result('CREATE_OPPORTUNITY', 'إشارة تجارية موثقة وصلت إلى حد مراجعة إنشاء فرصة.', 'HIGH', 90, 'HUMAN_REVIEW');
  return result('RECONNECT_LATER', 'لا يوجد رد أو إشارة عاجلة؛ حافظ على العلاقة ضمن دورة متابعة مناسبة.', 'LOW', 85);
}

export function buildCompanyIntelligence(context: Parameters<typeof recommendNextBestAction>[0]) {
  const company = context.company;
  const contacts = context.contacts ?? [];
  const signals = context.signals ?? detectBusinessSignals(context);
  const opportunity = opportunitySignalScore(signals);
  const angle = businessAngle(company);
  const verified = contacts.filter(row => sameCompany(company, row) && isVerifiedDecisionMakerV6(row));
  const reachability = clamp((company.general_email || company.email || company.general_phone || company.phone ? 40 : 0) + (contacts.some(row => row.email || row.phone || row.mobile) ? 30 : 0) + (verified.length ? 30 : 0));
  const completeness = clamp(numberValue(company.data_completeness));
  const fit = clamp(numberValue(company.fit_score) || (angle.segment === 'OTHER' ? 40 : angle.confidence));
  const calculatedLead = clamp(fit * .45 + completeness * .20 + reachability * .15 + (verified.length ? 100 : 0) * .15 + (company.vendor_registration_url ? 100 : 0) * .05);
  const lead = numberValue(company.lead_score) > 0 ? clamp(numberValue(company.lead_score)) : calculatedLead;
  const nextAction = recommendNextBestAction({ ...context, signals });
  const updatedAt = nowIso(context.now);
  const score = (value: number, reason: string, evidence: Evidence[], confidence = 90): ExplainableScore => ({ score: clamp(value), reason, confidence: clamp(confidence), evidence, updatedAt });
  return {
    targetSegment: angle.segment,
    sector: stringValue(company.sector),
    subsector: stringValue(company.subsector),
    businessFit: score(fit, angle.reason, [{ label: 'Segment', value: angle.segment }, { label: 'Sector', value: stringValue(company.sector) }], angle.confidence),
    reachability: score(reachability, verified.length ? 'توجد قناة وصانع قرار موثق.' : contacts.length ? 'توجد قناة اتصال لكن تغطية القرار غير مكتملة.' : 'لا توجد جهة اتصال موثقة.', [{ label: 'Contacts', value: String(contacts.length) }, { label: 'Verified decision makers', value: String(verified.length) }]),
    dataCompleteness: score(completeness, `اكتمال الملف المحفوظ ${completeness}%.`, [{ label: 'Stored completeness', value: String(completeness) }]),
    decisionMakerCoverage: score(verified.length ? 100 : 0, verified.length ? 'صانع قرار موثق بدليل.' : 'لا يوجد صانع قرار موثق.', verified.map(row => ({ label: 'Decision maker', value: stringValue(row.full_name || row.name), source: stringValue(row.source_url || row.source) }))),
    vendorRegistrationStatus: stringValue(company.vendor_registration_status || (company.vendor_registration_url ? 'PORTAL_FOUND' : 'NOT_CHECKED')),
    relationshipStage: deriveRelationshipStage(context),
    opportunitySignal: opportunity,
    outreachReadiness: score(Math.min(reachability, verified.length ? 100 : 0, completeness || 0), verified.length ? 'جاهزية التواصل تعتمد على اكتمال الملف والقناة.' : 'صانع القرار الموثق شرط مانع.', [{ label: 'Reachability', value: String(reachability) }, { label: 'Completeness', value: String(completeness) }]),
    leadScore: score(lead, numberValue(company.lead_score) > 0 ? 'Lead Score المحفوظ هو المصدر الموحد؛ المرجع التفسيري: 45% ملاءمة + 20% اكتمال + 15% وصول + 15% تغطية قرار + 5% مسار موردين.' : '45% ملاءمة + 20% اكتمال + 15% وصول + 15% تغطية قرار + 5% مسار موردين.', [{ label: 'Stored lead score', value: String(numberValue(company.lead_score) || 'غير متوفر') }, { label: 'Calculated reference', value: String(calculatedLead) }, { label: 'Business fit', value: String(fit) }, { label: 'Completeness', value: String(completeness) }, { label: 'Reachability', value: String(reachability) }]),
    priority: ['A','B','C'].includes(upper(company.priority)) ? upper(company.priority) as 'A'|'B'|'C' : lead >= 80 ? 'A' : lead >= 60 ? 'B' : 'C',
    nextBestAction: nextAction,
    businessAngle: angle,
    signals,
    updatedAt,
  };
}

export type ConversationObjective = 'INTRODUCTION' | 'VENDOR_REGISTRATION' | 'SUBCONTRACTING' | 'PROJECT_DISCUSSION' | 'INDUSTRIAL_SUPPORT' | 'MEETING_REQUEST' | 'FOLLOW_UP' | 'RECONNECT' | 'PROFILE_REQUEST_RESPONSE' | 'RFQ_RESPONSE_PREP' | 'REFERRAL_FOLLOW_UP';
export type ConversationStrategy = {
  objective: ConversationObjective; targetSegment: TargetSegment; targetRole: string; relationshipStage: RelationshipStage;
  businessAngle: string; messageType: string; messageStyle: MessageStyle; language: 'ARABIC' | 'ENGLISH';
  channel: 'EMAIL' | 'WHATSAPP' | 'LINKEDIN' | 'CALL_SCRIPT'; cta: string; risk: string; contextSummary: string;
};

export function conversationStrategy(context: {
  company: IntelligenceRow; contacts?: IntelligenceRow[]; drafts?: IntelligenceRow[]; events?: IntelligenceRow[];
  meetings?: IntelligenceRow[]; opportunities?: IntelligenceRow[]; language?: 'ARABIC' | 'ENGLISH'; channel?: ConversationStrategy['channel']; objective?: ConversationObjective;
}): ConversationStrategy {
  const angle = businessAngle(context.company);
  const stage = deriveRelationshipStage(context);
  const memory = buildRelationshipMemory(context);
  const objective = context.objective ?? (stage === 'CONTACTED' ? 'FOLLOW_UP' : stage === 'ENGAGED' ? 'PROFILE_REQUEST_RESPONSE' : context.company.vendor_registration_url ? 'VENDOR_REGISTRATION' : angle.segment === 'MAIN_CONTRACTOR' ? 'SUBCONTRACTING' : angle.segment === 'INDUSTRIAL_FACTORY' ? 'INDUSTRIAL_SUPPORT' : 'INTRODUCTION');
  const language = context.language ?? (upper(context.company.recommended_language) === 'ENGLISH' ? 'ENGLISH' : 'ARABIC');
  return {
    objective, targetSegment: angle.segment, targetRole: angle.role, relationshipStage: stage, businessAngle: angle.angle,
    messageType: objective, messageStyle: angle.style, language, channel: context.channel ?? 'EMAIL',
    cta: objective === 'VENDOR_REGISTRATION' ? 'طلب مسار التأهيل والخطوة التالية' : objective === 'FOLLOW_UP' ? 'تأكيد الخطوة التالية المناسبة' : 'تحديد الشخص أو المسار المناسب للتعاون',
    risk: angle.evidenceLevel === 'LIMITED' ? 'البيانات محدودة؛ يمنع ذكر مشروع أو احتياج غير موثق.' : 'لا تستخدم ادعاءات أو تخصيصاً غير مدعوم.',
    contextSummary: memory.relationshipSummary,
  };
}

export function personalizationLevel(input: { companyName?: string; targetSegment?: string; targetRole?: string; verifiedPerson?: string; evidence?: Evidence[] }) {
  if (input.verifiedPerson && input.evidence?.some(item => item.value)) return 3 as const;
  if (input.companyName && input.targetSegment && input.targetRole) return 2 as const;
  if (input.companyName) return 1 as const;
  return 0 as const;
}

export function generateProfessionalMessage(input: { strategy: ConversationStrategy; companyName: string; recipientName?: string; verifiedRecipient?: boolean; evidence?: Evidence[] }) {
  const { strategy } = input;
  const level = personalizationLevel({ companyName: input.companyName, targetSegment: strategy.targetSegment, targetRole: strategy.targetRole, verifiedPerson: input.verifiedRecipient ? input.recipientName : '', evidence: input.evidence });
  const recipientAr = input.recipientName && input.verifiedRecipient ? `الأستاذ/ة ${input.recipientName}` : `فريق ${strategy.targetRole}`;
  const recipientEn = input.recipientName && input.verifiedRecipient ? input.recipientName : strategy.targetRole;
  const channel = strategy.channel;
  let body: string;
  if (strategy.language === 'ARABIC') {
    const opening = strategy.objective === 'FOLLOW_UP' ? `مرحباً ${recipientAr}، أتابع معكم بخصوص تواصلنا السابق مع ${input.companyName}.` : `مرحباً ${recipientAr}، أتواصل معكم بخصوص ${input.companyName}.`;
    const reason = `نرى مجالاً مهنياً للتعاون في ${strategy.businessAngle}، دون افتراض وجود مشروع أو احتياج غير معلن.`;
    const cta = strategy.objective === 'VENDOR_REGISTRATION' ? 'هل يمكن مشاركتنا بمسار تأهيل المقاولين والخطوة المطلوبة؟' : 'هل يمكن توجيهنا إلى الشخص أو المسار المناسب لمناقشة ذلك؟';
    body = `${opening}\n\n${reason}\n\n${cta}`;
  } else {
    const opening = strategy.objective === 'FOLLOW_UP' ? `Hello ${recipientEn}, I am following up on our previous contact with ${input.companyName}.` : `Hello ${recipientEn}, I am reaching out regarding ${input.companyName}.`;
    const reason = `We see a relevant cooperation angle around ${strategy.businessAngle}, without assuming a current project or unpublished requirement.`;
    const cta = strategy.objective === 'VENDOR_REGISTRATION' ? 'Could you share the contractor qualification route and the next required step?' : 'Could you direct us to the appropriate person or route for a focused discussion?';
    body = `${opening}\n\n${reason}\n\n${cta}`;
  }
  if (channel === 'WHATSAPP') body = body.replaceAll('\n\n', ' ');
  return { body, personalizationLevel: level, strategy };
}

export function evaluateMessageQuality(input: {
  body: string; companyName: string; businessAngle: string; channel: ConversationStrategy['channel'];
  personalizationLevel: 0 | 1 | 2 | 3; relationshipAware: boolean; evidenceSafe: boolean; existingDrafts?: string[];
}) {
  const words = input.body.trim().split(/\s+/).filter(Boolean).length;
  const max = input.channel === 'WHATSAPP' ? 60 : input.channel === 'LINKEDIN' ? 80 : input.channel === 'EMAIL' ? 160 : 140;
  const min = input.channel === 'WHATSAPP' ? 15 : input.channel === 'LINKEDIN' ? 25 : input.channel === 'EMAIL' ? 45 : 20;
  const similarity = Math.max(0, ...(input.existingDrafts ?? []).map(item => messageSimilarity(input.body, item)));
  const banned = /يسعدنا أن نقدم|خدماتنا المتميزة|الشركة الرائدة|delighted to introduce|leading company/i.test(input.body);
  const dimensions = {
    personalization: input.personalizationLevel * 25,
    relevance: input.body.includes(input.companyName) && input.businessAngle ? 100 : 50,
    clarity: /[؟?]/.test(input.body) ? 100 : 55,
    length: words >= min && words <= max ? 100 : words > max * 1.35 || words < min * .5 ? 35 : 70,
    professionalTone: banned ? 30 : 100,
    ctaQuality: (input.body.match(/[؟?]/g) ?? []).length === 1 ? 100 : 65,
    relationshipAwareness: input.relationshipAware ? 100 : 70,
    evidenceSafety: input.evidenceSafe ? 100 : 0,
    duplicateRisk: similarity >= .82 ? 25 : similarity >= .65 ? 60 : 100,
  };
  const score = clamp(Object.values(dimensions).reduce((sum, item) => sum + item, 0) / Object.keys(dimensions).length);
  const warnings = [banned ? 'لغة دعائية عامة' : '', similarity >= .82 ? 'GENERIC_PATTERN: المسودة مشابهة لمسودات أخرى وتحتاج تخصيصاً.' : '', !input.evidenceSafe ? 'توجد ادعاءات أو إشارات غير مدعومة.' : '', words < min || words > max ? `الطول ${words} كلمة لا يناسب القناة.` : ''].filter(Boolean);
  return { score, status: score >= 90 ? 'EXCELLENT' : score >= 78 ? 'STRONG' : score >= 65 ? 'ACCEPTABLE' : 'WEAK', dimensions, warnings, duplicateSimilarity: Math.round(similarity * 100), requiresReview: true } as const;
}

export function classifyReply(body: string) {
  const value = body.toLowerCase();
  const rules: Array<[ReplyIntent, RegExp, 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE', number]> = [
    ['RFQ', /rfq|request for quotation|طلب عرض سعر|مناقصة/, 'POSITIVE', 95],
    ['MEETING_REQUEST', /meeting|meet|call|اجتماع|مكالمة/, 'POSITIVE', 90],
    ['VENDOR_REGISTRATION', /vendor|supplier registration|prequalification|تسجيل المورد|التأهيل/, 'POSITIVE', 90],
    ['SEND_PROFILE', /profile|company profile|ملف الشركة|الملف التعريفي/, 'POSITIVE', 88],
    ['REFERRAL', /contact|refer|forward|تواصل مع|أحيلكم|تحويل/, 'POSITIVE', 82],
    ['WRONG_CONTACT', /wrong contact|not the right person|لست الشخص|جهة غير صحيحة/, 'NEUTRAL', 95],
    ['OUT_OF_OFFICE', /out of office|annual leave|إجازة|خارج المكتب/, 'NEUTRAL', 98],
    ['NOT_INTERESTED', /not interested|do not contact|غير مهتم|لا تتواصل/, 'NEGATIVE', 98],
    ['FOLLOW_UP_LATER', /later|next month|follow up|لاحقاً|الشهر القادم/, 'NEUTRAL', 85],
    ['INTERESTED', /interested|sounds good|مهتم|مناسب/, 'POSITIVE', 80],
  ];
  const match = rules.find(([, pattern]) => pattern.test(value));
  const intent = match?.[0] ?? (body.trim() ? 'GENERAL_RESPONSE' : 'UNKNOWN');
  const sentiment = match?.[2] ?? 'NEUTRAL';
  const confidence = match?.[3] ?? (body.trim() ? 55 : 100);
  const commercialSignal = ['RFQ', 'MEETING_REQUEST', 'INTERESTED', 'VENDOR_REGISTRATION'].includes(intent) ? 'HIGH' : ['SEND_PROFILE', 'REFERRAL'].includes(intent) ? 'MEDIUM' : sentiment === 'NEGATIVE' ? 'NEGATIVE' : 'LOW';
  const nextAction: Record<ReplyIntent, NextActionCode> = { INTERESTED:'REPLY_REQUIRED',SEND_PROFILE:'REPLY_REQUIRED',VENDOR_REGISTRATION:'CHECK_VENDOR_REGISTRATION',REFERRAL:'FIND_DECISION_MAKER',MEETING_REQUEST:'SCHEDULE_MEETING',RFQ:'CREATE_OPPORTUNITY',FOLLOW_UP_LATER:'FOLLOW_UP',NOT_NOW:'RECONNECT_LATER',NOT_INTERESTED:'CLOSE_NOT_RELEVANT',WRONG_CONTACT:'FIND_DECISION_MAKER',OUT_OF_OFFICE:'RECONNECT_LATER',GENERAL_RESPONSE:'REPLY_REQUIRED',UNKNOWN:'REPLY_REQUIRED' };
  return { intent, sentiment, commercialSignal, confidence, nextAction: nextAction[intent] };
}

export function followUpIntelligence(input: { state: 'NO_RESPONSE' | 'PROFILE_REQUESTED' | 'REFERRED' | 'VENDOR_PROCESS' | 'MEETING_REQUESTED' | 'FOLLOW_UP_LATER' | 'RFQ_EXPECTED' | 'RFQ_RECEIVED' | 'POSITIVE_RESPONSE' | 'NEGATIVE_RESPONSE'; memory: ReturnType<typeof buildRelationshipMemory>; now?: Date }) {
  const days: Record<typeof input.state, number | null> = { NO_RESPONSE:3,PROFILE_REQUESTED:2,REFERRED:2,VENDOR_PROCESS:5,MEETING_REQUESTED:1,FOLLOW_UP_LATER:14,RFQ_EXPECTED:3,RFQ_RECEIVED:1,POSITIVE_RESPONSE:1,NEGATIVE_RESPONSE:null };
  const due = days[input.state] === null ? undefined : new Date((input.now ?? new Date()).getTime() + Number(days[input.state]) * 86_400_000).toISOString().slice(0, 10);
  return { state: input.state, dueAt: due, shouldClose: input.state === 'NEGATIVE_RESPONSE', reason: `المتابعة مبنية على ${input.state} وآخر ذاكرة علاقة موثقة.`, memoryRead: input.memory.relationshipSummary, nextAction: input.state === 'RFQ_RECEIVED' ? 'CREATE_OPPORTUNITY' : input.state === 'MEETING_REQUESTED' ? 'SCHEDULE_MEETING' : input.state === 'NEGATIVE_RESPONSE' ? 'CLOSE_NOT_RELEVANT' : 'FOLLOW_UP' };
}

export function communicationStatus(events: IntelligenceRow[]) {
  return { contacted: events.some(row => active(row) && upper(row.direction) === 'OUTBOUND'), replied: events.some(row => active(row) && upper(row.direction) === 'INBOUND') };
}

export function opportunityHealth(input: { stage?: unknown; lastMeaningfulEvent?: string; nextAction?: string; dueAt?: string; now?: Date }) {
  const today = (input.now ?? new Date()).toISOString().slice(0, 10);
  const stage = upper(input.stage);
  if (['WON', 'LOST'].includes(stage)) return { health: 'HEALTHY' as const, reason: 'الفرصة مغلقة بنتيجة واضحة.' };
  if (!input.nextAction) return { health: 'NEEDS_ACTION' as const, reason: 'لا توجد خطوة تالية محددة.' };
  if (input.dueAt && input.dueAt < today) return { health: 'AT_RISK' as const, reason: 'الخطوة التالية متأخرة.' };
  if (input.lastMeaningfulEvent && (input.now ?? new Date()).getTime() - new Date(input.lastMeaningfulEvent).getTime() > 45 * 86_400_000) return { health: 'STALE' as const, reason: 'لا يوجد حدث مهم خلال 45 يوماً.' };
  return { health: 'HEALTHY' as const, reason: 'الخطوة التالية والوتيرة الزمنية واضحتان.' };
}

export function dealCoach(context: { company: IntelligenceRow; contacts?: IntelligenceRow[]; events?: IntelligenceRow[]; meetings?: IntelligenceRow[]; opportunities?: IntelligenceRow[]; notes?: IntelligenceRow[]; signals?: BusinessSignal[] }) {
  const memory = buildRelationshipMemory(context);
  const contacts = (context.contacts ?? []).filter(row => sameCompany(context.company, row) && isVerifiedDecisionMakerV6(row));
  const opportunity = (context.opportunities ?? []).find(row => sameCompany(context.company, row) && active(row));
  const next = recommendNextBestAction({ ...context, signals: context.signals });
  const health = opportunityHealth({ stage: opportunity?.stage, lastMeaningfulEvent: memory.lastMeaningfulEvent?.at, nextAction: stringValue(opportunity?.next_action || next.code), dueAt: stringValue(opportunity?.next_action_date) });
  return {
    currentSituation: memory.relationshipSummary,
    keyContacts: contacts.map(row => ({ name: stringValue(row.full_name || row.name), role: stringValue(row.position), source: stringValue(row.source_url || row.source) })),
    missingInformation: [contacts.length ? '' : 'صانع قرار موثق', opportunity?.value ? '' : 'قيمة الفرصة', opportunity?.next_action ? '' : 'الخطوة التجارية التالية'].filter(Boolean),
    risks: [health.health !== 'HEALTHY' ? health.reason : '', contacts.length ? '' : 'لا يوجد شخص قرار موثق'].filter(Boolean),
    recommendedNextStep: next,
    dueDate: stringValue(opportunity?.next_action_date),
    relationshipHealth: health,
  };
}

export const AGENT_TEAMS: Record<AgentTeam, readonly string[]> = {
  RESEARCH: ['Discovery', 'Verification', 'Enrichment', 'Decision Maker'],
  STRATEGY: ['Qualification', 'Business Angle', 'Next Best Action'],
  OUTREACH: ['Conversation Strategy', 'Outreach Draft', 'Reply Intelligence', 'Follow-up'],
  COMMERCIAL: ['Vendor Registration', 'Opportunity', 'Deal Coach'],
  SUPERVISOR: ['Supervisor'],
};

export function routeAgentTeam(action: NextActionCode): AgentTeam {
  if (['VERIFY_COMPANY','COMPLETE_RESEARCH','FIND_DECISION_MAKER','VERIFY_CONTACT'].includes(action)) return 'RESEARCH';
  if (['PREPARE_OUTREACH_STRATEGY'].includes(action)) return 'STRATEGY';
  if (['PREPARE_DRAFT','REVIEW_DRAFT','RECORD_COMMUNICATION','FOLLOW_UP','REPLY_REQUIRED','RECONNECT_LATER'].includes(action)) return 'OUTREACH';
  if (['CHECK_VENDOR_REGISTRATION','SCHEDULE_MEETING','CREATE_OPPORTUNITY','REVIEW_OPPORTUNITY','CLOSE_NOT_RELEVANT'].includes(action)) return 'COMMERCIAL';
  return 'SUPERVISOR';
}

export function supervisorDecision(input: { action: NextBestAction; externalResearchPaused: boolean; sendingDisabled: boolean; existingJobKeys?: string[]; companyId: string }) {
  const team = routeAgentTeam(input.action.code);
  const requiresExternalProvider = team === 'RESEARCH' && ['VERIFY_COMPANY','COMPLETE_RESEARCH','FIND_DECISION_MAKER','VERIFY_CONTACT'].includes(input.action.code);
  const jobKey = `${input.companyId}:${team}:${input.action.code}`;
  return { team, jobKey, duplicate: (input.existingJobKeys ?? []).includes(jobKey), canRunInternally: !requiresExternalProvider, status: requiresExternalProvider && input.externalResearchPaused ? 'WAITING_MANUAL_RESEARCH' : input.action.code === 'RECORD_COMMUNICATION' && input.sendingDisabled ? 'WAITING_HUMAN' : 'READY', requiresExternalProvider, requiresHuman: ['REVIEW_DRAFT','RECORD_COMMUNICATION','CREATE_OPPORTUNITY','CLOSE_NOT_RELEVANT'].includes(input.action.code) };
}

export interface EmailProvider {
  readonly name: string;
  send(): Promise<never>;
  createDraft(input: { subject: string; body: string }): Promise<{ provider: string; status: 'LOCAL_DRAFT'; subject: string; body: string }>;
  getMessage(): Promise<null>;
  getThread(): Promise<null>;
  getDeliveryStatus(): Promise<'DISABLED'>;
  getReplies(): Promise<[]>;
}

export class ManualProvider implements EmailProvider {
  readonly name = 'MANUAL';
  async send(): Promise<never> { throw new Error('EXTERNAL_SENDING_DISABLED'); }
  async createDraft(input: { subject: string; body: string }) { return { provider: this.name, status: 'LOCAL_DRAFT' as const, ...input }; }
  async getMessage() { return null; }
  async getThread() { return null; }
  async getDeliveryStatus() { return 'DISABLED' as const; }
  async getReplies() { return [] as []; }
}

export function automationEligibility(input: { level: OutreachAutomationLevel; verifiedRecipient: boolean; qualityScore: number; doNotContact: boolean; recentDuplicate: boolean; dailyLimitReached: boolean; unresolvedReply: boolean; relationshipStage: RelationshipStage; approvedRule: boolean; providerAvailable: boolean }) {
  const reasons = ['AUTOMATION_LEVEL_0', !input.verifiedRecipient ? 'RECIPIENT_NOT_VERIFIED' : '', input.qualityScore < 80 ? 'QUALITY_BELOW_THRESHOLD' : '', input.doNotContact ? 'DO_NOT_CONTACT' : '', input.recentDuplicate ? 'RECENT_DUPLICATE_CONTACT' : '', input.dailyLimitReached ? 'DAILY_LIMIT' : '', input.unresolvedReply ? 'UNRESOLVED_REPLY' : '', !input.approvedRule ? 'RULE_NOT_APPROVED' : '', !input.providerAvailable ? 'PROVIDER_UNAVAILABLE' : ''].filter(Boolean);
  return { allowed: false, reasons, requestedLevel: input.level, effectiveLevel: 0 as OutreachAutomationLevel };
}

export function humanOverride<T>(input: { before: T; after: T; field: string; reason?: string; actorId: string; at?: string }) {
  return { eventType: 'HUMAN_OVERRIDE', field: input.field, before: input.before, after: input.after, reason: input.reason ?? '', actorId: input.actorId, createdAt: input.at ?? nowIso(), supersedesAgent: true };
}

export function feedbackEvent(input: { targetType:'DRAFT'|'BUSINESS_ANGLE'|'NEXT_BEST_ACTION'|'AGENT_RESULT'; targetId:string; rating:'USEFUL'|'NOT_USEFUL'; reason?:string; at?:string }) {
  return { targetType:input.targetType, targetId:input.targetId, rating:input.rating, reason:input.reason ?? '', createdAt:input.at ?? nowIso() };
}

export function agentOutput(input: { status: string; entity: string; result: unknown; reason: string; confidence: number; evidence?: Evidence[]; nextAction: NextActionCode; requiresHuman: boolean; requiresExternalProvider: boolean; team: AgentTeam; agent: string }) {
  return { ...input, confidence: clamp(input.confidence), evidence: input.evidence ?? [], version: 'v6', createdAt: nowIso() };
}
