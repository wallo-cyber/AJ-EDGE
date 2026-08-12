import { classifySegment, type IntelligenceRow, type TargetSegment } from './core.ts';

export const BUYING_ROLES = ['ECONOMIC_BUYER','PROJECT_OWNER','TECHNICAL_BUYER','PROCUREMENT_GATEKEEPER','CONTRACTS_COMMERCIAL','SITE_USER','INFLUENCER','CHAMPION'] as const;
export type BuyingRole = typeof BUYING_ROLES[number];

export type BuyingRoleRequirement = { role: BuyingRole; label: string; weight: number; departments: string[]; titleTerms: string[] };

const roleDefinitions: Record<BuyingRole, Omit<BuyingRoleRequirement,'weight'>> = {
  ECONOMIC_BUYER:{role:'ECONOMIC_BUYER',label:'صاحب القرار الاقتصادي',departments:['الإدارة العامة','management','executive'],titleTerms:['general manager','ceo','managing director','owner','director','مدير عام','الرئيس التنفيذي','المالك']},
  PROJECT_OWNER:{role:'PROJECT_OWNER',label:'مالك المشروع / المشاريع',departments:['المشاريع','projects','construction'],titleTerms:['project manager','projects manager','construction manager','project director','مدير المشروع','مدير المشاريع','مدير الإنشاءات']},
  TECHNICAL_BUYER:{role:'TECHNICAL_BUYER',label:'المشتري الفني / الهندسة',departments:['الهندسة','engineering','technical'],titleTerms:['engineering manager','technical manager','chief engineer','مهندس','مدير الهندسة','المدير الفني']},
  PROCUREMENT_GATEKEEPER:{role:'PROCUREMENT_GATEKEEPER',label:'بوابة المشتريات',departments:['المشتريات','procurement','purchasing','supply chain'],titleTerms:['procurement manager','purchasing manager','supply chain','buyer','مدير المشتريات','مسؤول المشتريات']},
  CONTRACTS_COMMERCIAL:{role:'CONTRACTS_COMMERCIAL',label:'العقود / التجاري',departments:['العقود','contracts','commercial'],titleTerms:['contracts manager','commercial manager','subcontract','مدير العقود','المدير التجاري','المقاولات الفرعية']},
  SITE_USER:{role:'SITE_USER',label:'المستخدم التشغيلي / الموقع',departments:['التشغيل','الصيانة','operations','maintenance','facility'],titleTerms:['plant manager','operations manager','maintenance manager','facility manager','مدير المصنع','مدير التشغيل','مدير الصيانة','مدير المرافق']},
  CHAMPION:{role:'CHAMPION',label:'الداعم الداخلي',departments:['projects','procurement','engineering','commercial','المشاريع','المشتريات','الهندسة','العقود'],titleTerms:['champion','sponsor','internal sponsor','داعم داخلي']},
  INFLUENCER:{role:'INFLUENCER',label:'مؤثر فني / استشاري',departments:['تطوير الأعمال','tenders','business development','technical'],titleTerms:['tender','business development','consultant','estimation','مناقصات','تطوير الأعمال','استشاري']},
};

const segmentRoles: Record<TargetSegment, Array<[BuyingRole,number]>> = {
  INDUSTRIAL_FACTORY:[['PROJECT_OWNER',24],['TECHNICAL_BUYER',22],['PROCUREMENT_GATEKEEPER',22],['SITE_USER',20],['CONTRACTS_COMMERCIAL',12]],
  REAL_ESTATE_DEVELOPER:[['PROJECT_OWNER',28],['CONTRACTS_COMMERCIAL',24],['PROCUREMENT_GATEKEEPER',24],['ECONOMIC_BUYER',14],['TECHNICAL_BUYER',10]],
  MAIN_CONTRACTOR:[['PROCUREMENT_GATEKEEPER',28],['CONTRACTS_COMMERCIAL',28],['PROJECT_OWNER',24],['TECHNICAL_BUYER',12],['ECONOMIC_BUYER',8]],
  INDUSTRIAL_CONTRACTOR:[['PROJECT_OWNER',28],['PROCUREMENT_GATEKEEPER',26],['CONTRACTS_COMMERCIAL',22],['TECHNICAL_BUYER',16],['ECONOMIC_BUYER',8]],
  ENGINEERING_CONSULTANT:[['PROJECT_OWNER',30],['INFLUENCER',28],['TECHNICAL_BUYER',24],['ECONOMIC_BUYER',10],['PROCUREMENT_GATEKEEPER',8]],
  MANUFACTURER:[['PROJECT_OWNER',27],['TECHNICAL_BUYER',25],['PROCUREMENT_GATEKEEPER',20],['SITE_USER',18],['CONTRACTS_COMMERCIAL',10]],
  SUPPLIER:[['PROJECT_OWNER',28],['TECHNICAL_BUYER',26],['PROCUREMENT_GATEKEEPER',20],['INFLUENCER',16],['ECONOMIC_BUYER',10]],
  FACILITY_OPERATOR:[['SITE_USER',28],['PROCUREMENT_GATEKEEPER',26],['TECHNICAL_BUYER',20],['CONTRACTS_COMMERCIAL',16],['PROJECT_OWNER',10]],
  OTHER:[['PROCUREMENT_GATEKEEPER',30],['PROJECT_OWNER',25],['ECONOMIC_BUYER',20],['TECHNICAL_BUYER',15],['CONTRACTS_COMMERCIAL',10]],
};

const text=(value:unknown)=>String(value??'').trim();
const norm=(value:unknown)=>text(value).toLowerCase();
const truthy=(value:unknown)=>Boolean(text(value));

export function buyingRequirements(company:IntelligenceRow): BuyingRoleRequirement[] {
  const segment=classifySegment(company).segment;
  return segmentRoles[segment].map(([role,weight])=>({...roleDefinitions[role],weight}));
}

export function inferBuyingRoles(contact:IntelligenceRow): BuyingRole[] {
  const title=norm(contact.position||contact.title||contact.decision_role);
  const department=norm(contact.department);
  const level=norm(contact.decision_level);
  const roles=BUYING_ROLES.filter(role=>{
    const def=roleDefinitions[role];
    return def.departments.some(term=>department.includes(term.toLowerCase())) || def.titleTerms.some(term=>title.includes(term.toLowerCase()));
  });
  if(level==='primary'||level==='management') roles.push('ECONOMIC_BUYER');
  if(level==='procurement') roles.push('PROCUREMENT_GATEKEEPER');
  if(level==='projects') roles.push('PROJECT_OWNER');
  if(level==='engineering') roles.push('TECHNICAL_BUYER');
  if(level==='influencer') roles.push('INFLUENCER');
  if(norm(contact.attitude)==='champion') roles.push('CHAMPION');
  return [...new Set(roles)];
}

export function isEvidenceVerifiedContact(contact:IntelligenceRow){
  return norm(contact.verification_status)==='verified' && Boolean(contact.source_url||contact.source);
}

export function hasDirectAccess(contact:IntelligenceRow){
  return Boolean(contact.email||contact.mobile||contact.phone||contact.linked_in||contact.linkedin);
}

export function contactAccessQuality(contact:IntelligenceRow){
  const verified=isEvidenceVerifiedContact(contact);
  const direct=hasDirectAccess(contact);
  const roles=inferBuyingRoles(contact);
  let score=0;
  if(verified) score+=35;
  if(truthy(contact.email)) score+=20;
  if(truthy(contact.mobile)||truthy(contact.phone)) score+=20;
  if(truthy(contact.linked_in)||truthy(contact.linkedin)) score+=10;
  if(roles.length) score+=15;
  return {score:Math.min(100,score),verified,direct,roles,status:verified&&direct?'CONTACTABLE':verified?'VERIFIED_NO_CHANNEL':direct?'UNVERIFIED_CHANNEL':'RESEARCH_ONLY'} as const;
}

export function buildBuyingCommittee(company:IntelligenceRow, contacts:IntelligenceRow[]=[]){
  const required=buyingRequirements(company);
  const people=contacts.filter(c=>!c.archived_at).map(contact=>({contact,quality:contactAccessQuality(contact)}));
  const roles=required.map(req=>{
    const matches=people.filter(person=>person.quality.roles.includes(req.role));
    const verified=matches.filter(person=>person.quality.verified);
    const contactable=verified.filter(person=>person.quality.direct);
    const best=[...matches].sort((a,b)=>b.quality.score-a.quality.score)[0];
    const achieved=contactable.length?req.weight:verified.length?Math.round(req.weight*.65):matches.length?Math.round(req.weight*.25):0;
    return {...req,achieved,status:contactable.length?'CONTACTABLE':verified.length?'VERIFIED_NO_CHANNEL':matches.length?'UNVERIFIED':'MISSING',bestContact:best?.contact??null,matchCount:matches.length};
  });
  const accessScore=Math.min(100,roles.reduce((sum,item)=>sum+item.achieved,0));
  const contactableRoles=roles.filter(item=>item.status==='CONTACTABLE').length;
  const verifiedPeople=people.filter(item=>item.quality.verified).length;
  const missingRoles=roles.filter(item=>item.status==='MISSING').map(item=>item.role);
  const strongest=[...people].sort((a,b)=>b.quality.score-a.quality.score)[0];
  return {segment:classifySegment(company).segment,accessScore,roles,contactableRoles,requiredRoles:roles.length,verifiedPeople,missingRoles,strongestContact:strongest?.contact??null};
}

export function decisionAccessNextAction(company:IntelligenceRow, contacts:IntelligenceRow[]=[]){
  const committee=buildBuyingCommittee(company,contacts);
  const firstMissing=committee.roles.find(role=>role.status==='MISSING');
  const firstWeak=committee.roles.find(role=>role.status!=='CONTACTABLE');
  if(firstMissing) return {code:'FIND_ROLE',role:firstMissing.role,label:`ابحث عن ${firstMissing.label}`,reason:`تغطية الوصول ${committee.accessScore}/100 والدور غير موجود في الحساب.`};
  if(firstWeak) return {code:'VERIFY_OR_CHANNEL',role:firstWeak.role,label:`فعّل الوصول إلى ${firstWeak.label}`,reason:'الشخص موجود لكن الوصول المباشر أو التحقق بالمصدر غير مكتمل.'};
  return {code:'MULTITHREAD_READY',role:null,label:'الحساب جاهز لتواصل متعدد الأطراف',reason:'الأدوار المطلوبة مغطاة بأشخاص موثقين وقنوات مباشرة.'};
}

export function accountFitScoreV2(company:IntelligenceRow,contacts:IntelligenceRow[]=[]){
  const segment=classifySegment(company).segment;
  const committee=buildBuyingCommittee(company,contacts);
  const strategicSegments:TargetSegment[]=['INDUSTRIAL_FACTORY','REAL_ESTATE_DEVELOPER','MAIN_CONTRACTOR','INDUSTRIAL_CONTRACTOR','FACILITY_OPERATOR','ENGINEERING_CONSULTANT'];
  const breakdown={
    segmentFit: strategicSegments.includes(segment)?20:segment==='MANUFACTURER'||segment==='SUPPLIER'?15:8,
    scopeFit: truthy(company.business_angle||company.contracting_angle||company.service_opportunity)?15:8,
    geography: truthy(company.city)?10:4,
    scale: truthy(company.company_size||company.estimated_employees)?10:5,
    procurementAccessibility: Math.round(committee.accessScore*10/100),
    vendorQualification: truthy(company.vendor_registration_url||company.vendor_registration_status)?10:3,
    decisionCoverage: Math.round(committee.accessScore*15/100),
    strategicValue: truthy(company.website||company.source_url)?10:5,
  };
  const score=Object.values(breakdown).reduce((a,b)=>a+b,0);
  return {score,breakdown,grade:score>=80?'A':score>=60?'B':score>=40?'C':'D',committee};
}

export function timingIntentScore(company:IntelligenceRow,context:{signals?:IntelligenceRow[];events?:IntelligenceRow[];meetings?:IntelligenceRow[];opportunities?:IntelligenceRow[]}={}){
  const signals=context.signals??[]; const events=context.events??[]; const meetings=context.meetings??[]; const opportunities=context.opportunities??[];
  const signalText=signals.map(s=>`${norm(s.signal_type)} ${norm(s.title)} ${norm(s.description)}`).join(' ');
  const rfq=/rfq|rfp|tender|bid|مناقصة|طلب عرض/.test(signalText)||opportunities.some(o=>/rfq|bid|proposal/i.test(text(o.stage)));
  const project=/project|expansion|factory|warehouse|construction|facility|توسع|مصنع|مستودع|إنشاء/.test(signalText);
  const recentInbound=events.some(e=>norm(e.direction)==='inbound');
  const referral=events.some(e=>/referr|intro|إحالة|تحويل/.test(`${norm(e.reply_intent)} ${norm(e.notes)}`));
  const vendor=truthy(company.vendor_registration_url)||/qualified|approved|registered/i.test(text(company.vendor_registration_status));
  const meeting=meetings.length>0;
  const breakdown={activeProject:project?25:0,expansionConstruction:project?20:0,rfqTender:rfq?25:0,vendorRegistration:vendor?10:0,recentInteraction:recentInbound?10:0,referral:referral?5:0,meeting:meeting?5:0};
  const score=Math.min(100,Object.values(breakdown).reduce((a,b)=>a+b,0));
  return {score,breakdown,level:score>=70?'HOT':score>=40?'WARM':score>0?'WATCH':'COLD'};
}

export function pursuitScore(company:IntelligenceRow,contacts:IntelligenceRow[]=[],context:{signals?:IntelligenceRow[];events?:IntelligenceRow[];meetings?:IntelligenceRow[];opportunities?:IntelligenceRow[]}={}){
  const fit=accountFitScoreV2(company,contacts); const intent=timingIntentScore(company,context);
  const score=Math.round(fit.score*.6+intent.score*.4);
  return {score,fit,intent,priority:score>=80?'MUST_PURSUE':score>=65?'PURSUE':score>=50?'CONDITIONAL':'NURTURE'};
}

export function roleSearchQuery(companyName:string, requirement:BuyingRoleRequirement){
  const roleTerms=requirement.titleTerms.slice(0,3).join(' OR ');
  return `"${companyName}" (${roleTerms})`;
}
