import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ManualProvider, automationEligibility, buildCompanyIntelligence, buildRelationshipMemory, classifyReply,
  communicationStatus, conversationStrategy, dealCoach, detectBusinessSignals, evaluateMessageQuality,
  feedbackEvent, followUpIntelligence, generateProfessionalMessage, humanOverride, opportunityHealth, opportunitySignalScore,
  recommendNextBestAction, routeAgentTeam, supervisorDecision,
} from './v6.ts';

const company = { id: 'company-1', company_name: 'مصنع الشرق', company_type: 'Factory', sector: 'Industrial', city: 'Dammam', data_completeness: 85, lead_score: 88, source_url: 'https://example.test/company' };
const decisionMaker = { id: 'contact-1', company_id: company.id, full_name: 'أحمد', position: 'مدير المشاريع', decision_maker: true, verification_status: 'VERIFIED', source_url: 'https://example.test/contact', confidence: 90 };

test('relationship memory is a structured timeline and summary', () => {
  const result = buildRelationshipMemory({ company, contacts: [decisionMaker], events: [{ id:'e1',company_id:company.id,direction:'OUTBOUND',occurred_at:'2026-08-01T10:00:00Z',outcome:'Profile sent',evidence_reference:'manual-log' }] });
  assert.equal(result.timeline.length, 1);
  assert.equal(result.relationshipStatus, 'CONTACTED');
  assert.match(result.relationshipSummary, /حدثاً/);
});

test('signal engine uses only stored evidence and never invents project or RFQ signals', () => {
  const signals = detectBusinessSignals({ company, contacts: [decisionMaker], events: [] });
  assert.ok(signals.some(item => item.type === 'DECISION_MAKER_VERIFIED'));
  assert.equal(signals.some(item => item.type === 'PROJECT_SIGNAL' || item.type === 'RFQ_SIGNAL'), false);
});

test('RFQ signal requires an inbound evidence-backed event', () => {
  const withoutEvidence = detectBusinessSignals({ company, events: [{ company_id:company.id,direction:'INBOUND',reply_intent:'RFQ' }] });
  const withEvidence = detectBusinessSignals({ company, events: [{ company_id:company.id,direction:'INBOUND',reply_intent:'RFQ',evidence_reference:'logged-email',outcome:'RFQ received' }] });
  assert.equal(withoutEvidence.some(item => item.type === 'RFQ_SIGNAL'), false);
  assert.equal(withEvidence.some(item => item.type === 'RFQ_SIGNAL'), true);
});

test('opportunity signal remains independent of lead score', () => {
  const signals = detectBusinessSignals({ company: { ...company, lead_score: 95 } });
  assert.ok(opportunitySignalScore(signals).score < 30);
});

test('company intelligence produces explainable scores and one next action', () => {
  const result = buildCompanyIntelligence({ company, contacts: [decisionMaker] });
  assert.ok(result.leadScore.reason.includes('45%'));
  assert.ok(result.leadScore.evidence.length > 0);
  assert.equal(result.nextBestAction.code, 'PREPARE_OUTREACH_STRATEGY');
});

test('next best action prioritizes a real unresolved reply', () => {
  const result = recommendNextBestAction({ company, contacts:[decisionMaker], events:[{company_id:company.id,direction:'INBOUND',occurred_at:'2026-08-11'}] });
  assert.equal(result.code, 'REPLY_REQUIRED');
  assert.equal(result.priority, 'CRITICAL');
});

test('conversation strategy differs for factory, developer, and main contractor', () => {
  const factory = conversationStrategy({ company });
  const developer = conversationStrategy({ company:{...company,id:'2',company_name:'Developer',company_type:'Real Estate Developer',sector:'Real Estate'} });
  const contractor = conversationStrategy({ company:{...company,id:'3',company_name:'Contractor',company_type:'Main Contractor',sector:'Construction'} });
  assert.equal(new Set([factory.targetSegment, developer.targetSegment, contractor.targetSegment]).size, 3);
  assert.equal(new Set([factory.businessAngle, developer.businessAngle, contractor.businessAngle]).size, 3);
  const messages = [
    generateProfessionalMessage({strategy:factory,companyName:'Factory'}).body,
    generateProfessionalMessage({strategy:developer,companyName:'Developer'}).body,
    generateProfessionalMessage({strategy:contractor,companyName:'Contractor'}).body,
  ];
  assert.equal(new Set(messages).size, 3);
  assert.equal(recommendNextBestAction({company}).code, 'FIND_DECISION_MAKER');
});

test('professional message engine generates safe distinct Arabic and English messages', () => {
  const arStrategy = conversationStrategy({ company, contacts:[decisionMaker], language:'ARABIC' });
  const enStrategy = conversationStrategy({ company, contacts:[decisionMaker], language:'ENGLISH' });
  const ar = generateProfessionalMessage({ strategy:arStrategy, companyName:String(company.company_name), recipientName:'أحمد', verifiedRecipient:true, evidence:[{label:'Contact',value:'أحمد',source:'official'}] });
  const en = generateProfessionalMessage({ strategy:enStrategy, companyName:String(company.company_name), recipientName:'Ahmed', verifiedRecipient:true, evidence:[{label:'Contact',value:'Ahmed',source:'official'}] });
  assert.match(ar.body, /دون افتراض/);
  assert.match(en.body, /without assuming/i);
  assert.equal(ar.personalizationLevel, 3);
  assert.notEqual(ar.body, en.body);
});

test('message quality exposes dimensions and duplicate warning while retaining human review', () => {
  const body = `مرحباً فريق المشاريع، أتواصل معكم بخصوص مصنع الشرق. نرى مجالاً للتعاون في الأعمال المدنية. هل يمكن توجيهنا إلى المسار المناسب؟`;
  const result = evaluateMessageQuality({ body, companyName:'مصنع الشرق', businessAngle:'الأعمال المدنية', channel:'EMAIL', personalizationLevel:2, relationshipAware:true, evidenceSafe:true, existingDrafts:[body] });
  assert.equal(result.requiresReview, true);
  assert.equal(result.duplicateSimilarity, 100);
  assert.ok(result.warnings.some(item => item.includes('GENERIC_PATTERN')));
});

test('reply intelligence maps commercial intent without auto-creating an opportunity', () => {
  const result = classifyReply('Please send your company profile and let us arrange a meeting.');
  assert.equal(result.intent, 'MEETING_REQUEST');
  assert.equal(result.nextAction, 'SCHEDULE_MEETING');
  assert.equal('opportunity' in result, false);
});

test('follow-up intelligence reads relationship memory', () => {
  const memory = buildRelationshipMemory({ company, events:[] });
  const result = followUpIntelligence({ state:'VENDOR_PROCESS', memory, now:new Date('2026-08-11T00:00:00Z') });
  assert.equal(result.dueAt, '2026-08-16');
  assert.equal(result.memoryRead, memory.relationshipSummary);
});

test('contacted and replied are derived only from direction-specific events', () => {
  assert.deepEqual(communicationStatus([{direction:'OUTBOUND'}]), {contacted:true,replied:false});
  assert.deepEqual(communicationStatus([{direction:'INBOUND'}]), {contacted:false,replied:true});
});

test('deal coach and opportunity health use persisted facts only', () => {
  const result = dealCoach({ company, contacts:[decisionMaker], opportunities:[{company_id:company.id,title:'Package',stage:'QUALIFIED',next_action:'Confirm scope',next_action_date:'2026-08-20'}] });
  assert.equal(result.keyContacts[0].name, 'أحمد');
  assert.equal(result.missingInformation.includes('صانع قرار موثق'), false);
  assert.equal(opportunityHealth({stage:'QUALIFIED',nextAction:'Confirm scope',dueAt:'2026-08-20',now:new Date('2026-08-11')}).health, 'HEALTHY');
});

test('agent teams and supervisor pause external dependencies without blocking internal work', () => {
  assert.equal(routeAgentTeam('FIND_DECISION_MAKER'), 'RESEARCH');
  assert.equal(routeAgentTeam('PREPARE_DRAFT'), 'OUTREACH');
  const external = supervisorDecision({action:{code:'FIND_DECISION_MAKER',reason:'missing',priority:'HIGH',source:'test',confidence:100},externalResearchPaused:true,sendingDisabled:true,companyId:'1'});
  const internal = supervisorDecision({action:{code:'PREPARE_DRAFT',reason:'ready',priority:'HIGH',source:'test',confidence:100},externalResearchPaused:true,sendingDisabled:true,companyId:'1'});
  assert.equal(external.status, 'WAITING_MANUAL_RESEARCH');
  assert.equal(internal.status, 'READY');
});

test('human override is auditable and supersedes agent suggestion', () => {
  const event = humanOverride({before:'B',after:'A',field:'priority',reason:'Executive decision',actorId:'user-1',at:'2026-08-11T00:00:00Z'});
  assert.equal(event.supersedesAgent, true);
  assert.equal(event.eventType, 'HUMAN_OVERRIDE');
});

test('feedback is structured for analytics without external ML', () => {
  const result = feedbackEvent({targetType:'NEXT_BEST_ACTION',targetId:'company-1',rating:'USEFUL',reason:'Clear action',at:'2026-08-11T00:00:00Z'});
  assert.deepEqual(result, {targetType:'NEXT_BEST_ACTION',targetId:'company-1',rating:'USEFUL',reason:'Clear action',createdAt:'2026-08-11T00:00:00Z'});
});

test('manual provider and automation foundation cannot send', async () => {
  const provider = new ManualProvider();
  await assert.rejects(provider.send(), /EXTERNAL_SENDING_DISABLED/);
  assert.equal((await provider.createDraft({subject:'Test',body:'Draft'})).status, 'LOCAL_DRAFT');
  const eligibility = automationEligibility({level:0,verifiedRecipient:true,qualityScore:100,doNotContact:false,recentDuplicate:false,dailyLimitReached:false,unresolvedReply:false,relationshipStage:'CONTACT_READY',approvedRule:true,providerAvailable:false});
  assert.equal(eligibility.allowed, false);
  assert.equal(eligibility.effectiveLevel, 0);
  const attemptedEscalation = automationEligibility({level:4,verifiedRecipient:true,qualityScore:100,doNotContact:false,recentDuplicate:false,dailyLimitReached:false,unresolvedReply:false,relationshipStage:'CONTACT_READY',approvedRule:true,providerAvailable:true});
  assert.equal(attemptedEscalation.allowed, false);
  assert.equal(attemptedEscalation.effectiveLevel, 0);
});
