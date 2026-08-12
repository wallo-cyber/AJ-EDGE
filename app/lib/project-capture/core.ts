export type ProjectStage='SIGNAL'|'CANDIDATE'|'VERIFIED'|'ACTIVE'|'RFQ'|'BID'|'NEGOTIATION'|'WON'|'LOST'|'ON_HOLD';
export type RevenueRoute='DIRECT_OWNER'|'SUBCONTRACT'|'CONSULTANT_REFERRAL'|'SUPPLIER_PARTNERSHIP'|'VENDOR_REGISTRATION'|'TENDER'|'UNDEFINED';
export type ProjectFact={id?:string;stage?:unknown;route_to_revenue?:unknown;verification_status?:unknown;verification_confidence?:unknown;estimated_value?:unknown;probability?:unknown;why_now?:unknown;next_action?:unknown;last_signal_at?:unknown};
export type ProjectEntity={entity_role?:unknown;verification_status?:unknown};
export type ProjectPackage={status?:unknown;scope_fit?:unknown;qualification_status?:unknown};
export type AccessPath={status?:unknown;strength?:unknown;path_type?:unknown;target_role?:unknown;target_company_id?:unknown;via_company_id?:unknown;contact_id?:unknown;evidence_url?:unknown;next_action?:unknown};

export const STAGE_LABELS:Record<ProjectStage,string>={
 SIGNAL:'إشارة',CANDIDATE:'مشروع محتمل',VERIFIED:'مشروع موثق',ACTIVE:'Pursuit نشط',RFQ:'RFQ',BID:'Bid',NEGOTIATION:'تفاوض',WON:'فوز',LOST:'خسارة',ON_HOLD:'معلق'
};
export const ROUTE_LABELS:Record<RevenueRoute,string>={
 DIRECT_OWNER:'عقد مباشر مع المالك',SUBCONTRACT:'مقاولة باطن',CONSULTANT_REFERRAL:'إحالة استشاري',SUPPLIER_PARTNERSHIP:'شراكة مورد/مصنع',VENDOR_REGISTRATION:'تسجيل وتأهيل مورد',TENDER:'مناقصة',UNDEFINED:'المسار غير محدد'
};

const s=(v:unknown)=>String(v??'').trim();
const n=(v:unknown)=>Number(v||0)||0;

export function projectCoverage(entities:ProjectEntity[]){
 const wanted=['OWNER','CONSULTANT','MAIN_CONTRACTOR'];
 const known=new Set(entities.filter(e=>s(e.verification_status)==='verified').map(e=>s(e.entity_role)));
 return {known:wanted.filter(x=>known.has(x)).length,total:wanted.length,missing:wanted.filter(x=>!known.has(x))};
}

export function bestAccessPath(paths:AccessPath[]){
 const active=paths.filter(p=>!['BLOCKED','CLOSED'].includes(s(p.status)));
 return [...active].sort((a,b)=>n(b.strength)-n(a.strength))[0]??null;
}

export function projectCommercialScore(project:ProjectFact,entities:ProjectEntity[],packages:ProjectPackage[],paths:AccessPath[]){
 let score=0;
 if(s(project.verification_status)==='verified')score+=20;
 score+=Math.min(15,Math.round(n(project.verification_confidence)*.15));
 const coverage=projectCoverage(entities); score+=Math.round(coverage.known/coverage.total*15);
 if(bestAccessPath(paths))score+=15;
 const fit=Math.max(0,...packages.map(p=>n(p.scope_fit)));score+=Math.round(fit*.15);
 if(packages.some(p=>['OPEN','RFQ','BID','SUBMITTED'].includes(s(p.status))))score+=15;
 if(['DIRECT_OWNER','SUBCONTRACT','CONSULTANT_REFERRAL','SUPPLIER_PARTNERSHIP','VENDOR_REGISTRATION','TENDER'].includes(s(project.route_to_revenue)))score+=5;
 return Math.min(100,score);
}

export function projectNextMove(project:ProjectFact,entities:ProjectEntity[],packages:ProjectPackage[],paths:AccessPath[]){
 if(s(project.verification_status)!=='verified')return {kind:'VERIFY_PROJECT',label:'تحقق من المشروع ومصدره قبل بدء المطاردة'};
 const coverage=projectCoverage(entities);
 if(coverage.missing.includes('OWNER'))return {kind:'MAP_OWNER',label:'حدد المالك الحقيقي للمشروع'};
 if(coverage.missing.includes('CONSULTANT'))return {kind:'MAP_CONSULTANT',label:'حدد الاستشاري أو مدير المشروع'};
 if(coverage.missing.includes('MAIN_CONTRACTOR'))return {kind:'MAP_MAIN_CONTRACTOR',label:'حدد المقاول الرئيسي / EPC'};
 if(!bestAccessPath(paths))return {kind:'BUILD_ACCESS_PATH',label:'ابنِ أقصر مسار وصول إلى المشروع'};
 if(!packages.length)return {kind:'IDENTIFY_PACKAGE',label:'حدد أول حزمة أعمال يمكننا استهدافها'};
 if(!packages.some(p=>n(p.scope_fit)>=60))return {kind:'PACKAGE_FIT',label:'قيّم ملاءمة حزم الأعمال لقدراتنا'};
 if(s(project.route_to_revenue)==='UNDEFINED')return {kind:'SELECT_REVENUE_ROUTE',label:'حدد Route-to-Revenue للمشروع'};
 return {kind:'PURSUE',label:s(project.next_action)||'نفّذ الحركة التجارية التالية على المشروع'};
}

export function routeSuggestion(input:{ownerKnown?:boolean;mainContractorKnown?:boolean;consultantKnown?:boolean;supplierLead?:boolean;vendorPortal?:boolean;tender?:boolean}):RevenueRoute{
 if(input.tender)return'TENDER';
 if(input.vendorPortal)return'VENDOR_REGISTRATION';
 if(input.supplierLead)return'SUPPLIER_PARTNERSHIP';
 if(input.mainContractorKnown)return'SUBCONTRACT';
 if(input.consultantKnown&&!input.ownerKnown)return'CONSULTANT_REFERRAL';
 if(input.ownerKnown)return'DIRECT_OWNER';
 return'UNDEFINED';
}
