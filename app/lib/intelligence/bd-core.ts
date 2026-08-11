import { businessAngle, classifySegment, weightedCompleteness, type IntelligenceRow } from './core.ts';

export const BD_STAGES = ['DISCOVER','DETECT','VERIFY','ENRICH','QUALIFY','MAP','TARGET','PERSONALIZE','APPROVE','CONTACT','FOLLOW_UP','MEETING','RFQ','PROPOSAL','WIN_LOSS'] as const;
export type BDStage = typeof BD_STAGES[number];
const text=(value:unknown)=>String(value??'').trim();
const upper=(value:unknown)=>text(value).toUpperCase();
const own=(company:IntelligenceRow,row:IntelligenceRow)=>!company.id||row.company_id===company.id;

export function companyLifecycle(input:{company:IntelligenceRow;contacts?:IntelligenceRow[];signals?:IntelligenceRow[];drafts?:IntelligenceRow[];events?:IntelligenceRow[];followups?:IntelligenceRow[];meetings?:IntelligenceRow[];opportunities?:IntelligenceRow[];proposals?:IntelligenceRow[]}):{stage:BDStage;reason:string}{
 const {company}=input; const contacts=(input.contacts??[]).filter(r=>own(company,r)); const signals=(input.signals??[]).filter(r=>own(company,r)&&text(r.source_url)); const drafts=(input.drafts??[]).filter(r=>own(company,r)); const events=(input.events??[]).filter(r=>own(company,r)); const opportunities=(input.opportunities??[]).filter(r=>own(company,r));
 if(opportunities.some(r=>['WON','LOST'].includes(upper(r.stage))))return {stage:'WIN_LOSS',reason:'توجد نتيجة فرصة محفوظة'};
 if((input.proposals??[]).some(r=>own(company,r)))return {stage:'PROPOSAL',reason:'يوجد عرض محفوظ'};
 if(events.some(r=>upper(r.reply_intent)==='RFQ'))return {stage:'RFQ',reason:'يوجد RFQ موثق في سجل التواصل'};
 if((input.meetings??[]).some(r=>own(company,r)))return {stage:'MEETING',reason:'يوجد اجتماع محفوظ'};
 if(events.some(r=>upper(r.direction)==='OUTBOUND'))return {stage:(input.followups??[]).some(r=>own(company,r)&&!['COMPLETED','CANCELLED'].includes(upper(r.status)))?'FOLLOW_UP':'CONTACT',reason:'يوجد تواصل صادر فعلي'};
 if(drafts.some(r=>upper(r.status)==='APPROVED'))return {stage:'APPROVE',reason:'توجد مسودة معتمدة'};
 if(drafts.length)return {stage:'PERSONALIZE',reason:'توجد مسودة تحتاج مراجعة'};
 if(contacts.some(r=>r.decision_maker===true&&upper(r.verification_status)==='VERIFIED'&&(r.source_url||r.source)))return {stage:'TARGET',reason:'صانع القرار موثق'};
 if(contacts.length)return {stage:'MAP',reason:'توجد جهات اتصال وتحتاج تحديد القرار'};
 if(Number(company.lead_score??0)>0)return {stage:'QUALIFY',reason:'تم احتساب الملاءمة والأولوية'};
 if(Number(company.data_completeness??0)>=50)return {stage:'ENRICH',reason:'ملف الشركة قيد الاستكمال'};
 if(upper(company.verification_status).includes('VERIF'))return {stage:'VERIFY',reason:'تم التحقق من الشركة'};
 if(signals.length)return {stage:'DETECT',reason:'توجد إشارة موثقة'};
 return {stage:'DISCOVER',reason:'شركة مكتشفة ولم تتقدم بعد'};
}

export function qualificationGate(company:IntelligenceRow,contacts:IntelligenceRow[]=[],signals:IntelligenceRow[]=[]){
 const completeness=weightedCompleteness(company,contacts); const segment=classifySegment(company); const evidence=Boolean(company.source_url||company.website||signals.some(s=>s.source_url)); const contactable=Boolean(company.general_email||company.general_phone||contacts.some(c=>c.email||c.phone||c.mobile)); const intent=Math.max(0,...signals.filter(s=>s.source_url).map(s=>Number(s.opportunity_score??0)));
 const fit=segment.segment==='OTHER'?35:80, location=/dammam|khobar|dhahran|jubail|qatif|ras tanura|eastern|الدمام|الخبر|الظهران|الجبيل|القطيف|رأس تنورة|الشرقية/i.test(text(company.city))?100:40;
 const score=Math.round(fit*.25+intent*.2+location*.15+(contactable?100:0)*.15+completeness.score*.15+(evidence?100:0)*.1); const priority=score>=80?'A':score>=60?'B':score>=35?'C':'IGNORE';
 return {score,priority,dimensions:{fit,intent,location,accessibility:contactable?100:0,evidence:evidence?100:0,completeness:completeness.score},reason:`Fit ${fit} · Intent ${intent} · Location ${location} · Completeness ${completeness.score}`};
}

export function decisionMakerTarget(company:IntelligenceRow){const angle=businessAngle(company);return {segment:angle.segment,department:angle.department,role:angle.role,reason:angle.reason};}

export function projectIntelligence(signal:IntelligenceRow,company:IntelligenceRow){if(!text(signal.source_url))return null; const angle=businessAngle(company); const urgency=Number(signal.opportunity_score??0)>=75?'HIGH':Number(signal.opportunity_score??0)>=50?'MEDIUM':'LOW'; return {projectType:text(signal.signal_type),possibleScope:angle.angle,targetDepartment:angle.department,recommendedOutreach:angle.type,urgency,evidence:text(signal.source_url)};}
