import type {SimpleRow} from'../supabase/simple-crud';
import {bestAccessPath,projectCommercialScore,projectCoverage,projectNextMove,type AccessPath,type ProjectEntity,type ProjectFact,type ProjectPackage}from'../project-capture/core.ts';

const s=(v:unknown)=>String(v??'').trim();
const n=(v:unknown)=>Number(v||0)||0;
const dateValue=(v:unknown)=>{const t=Date.parse(s(v));return Number.isFinite(t)?t:0};

export type AcquisitionProject={
 project:SimpleRow;
 score:number;
 move:{kind:string;label:string};
 access:number;
 coverage:{known:number;total:number;missing:string[]};
 packageFit:number;
 whyNow:string;
};

export function acquisitionProject(project:SimpleRow,entities:SimpleRow[],packages:SimpleRow[],paths:SimpleRow[]):AcquisitionProject{
 const pe=entities.filter(x=>x.project_id===project.id) as unknown as ProjectEntity[];
 const pp=packages.filter(x=>x.project_id===project.id) as unknown as ProjectPackage[];
 const pa=paths.filter(x=>x.project_id===project.id) as unknown as AccessPath[];
 const coverage=projectCoverage(pe);
 const best=bestAccessPath(pa);
 const packageFit=Math.max(0,...pp.map(x=>n(x.scope_fit)));
 return{
  project,
  score:projectCommercialScore(project as unknown as ProjectFact,pe,pp,pa),
  move:projectNextMove(project as unknown as ProjectFact,pe,pp,pa),
  access:best?n(best.strength):0,
  coverage,
  packageFit,
  whyNow:s(project.why_now)||'لا يوجد Trigger موثق بعد'
 };
}

export function rankAcquisitionProjects(projects:SimpleRow[],entities:SimpleRow[],packages:SimpleRow[],paths:SimpleRow[]){
 return projects
  .filter(p=>!['WON','LOST','ON_HOLD'].includes(s(p.stage)))
  .map(p=>acquisitionProject(p,entities,packages,paths))
  .sort((a,b)=>b.score-a.score||dateValue(b.project.last_signal_at||b.project.updated_at)-dateValue(a.project.last_signal_at||a.project.updated_at));
}

export function signalPriority(signal:SimpleRow){
 let score=0;
 if(s(signal.verification_status)==='verified')score+=35;
 score+=Math.min(20,Math.round(n(signal.event_match_confidence)*.20));
 score+=Math.min(15,Math.round(n(signal.entity_match_confidence)*.15));
 score+=Math.min(10,Math.round(n(signal.geography_match_confidence)*.10));
 score+=Math.min(10,Math.round(n(signal.source_quality_confidence)*.10));
 score+=Math.min(10,Math.round(n(signal.freshness_confidence)*.10));
 return Math.min(100,score);
}

export function routeReason(route:unknown){
 const r=s(route);
 if(r==='SUBCONTRACT')return'الدخول عبر المقاول الرئيسي أو EPC للحصول على حزمة باطن.';
 if(r==='CONSULTANT_REFERRAL')return'الاستشاري هو قناة التأثير/الترشيح الأسرع.';
 if(r==='SUPPLIER_PARTNERSHIP')return'المورد أو المصنع يمكن أن يكشف الاحتياج أو يفتح مقدمة.';
 if(r==='VENDOR_REGISTRATION')return'بوابة التأهيل هي العائق التجاري الحالي.';
 if(r==='TENDER')return'الفرصة مرتبطة بمناقصة أو طرح رسمي.';
 if(r==='DIRECT_OWNER')return'الوصول المباشر للمالك/المشاريع هو أقصر مسار.';
 return'لم يُحسم مسار الدخول بعد.';
}

export function funnelCounts(projects:SimpleRow[],meetings:SimpleRow[],opps:SimpleRow[]){
 return{
  signals:projects.filter(p=>s(p.stage)==='SIGNAL'||s(p.verification_status)==='needs_research').length,
  qualified:projects.filter(p=>['VERIFIED','ACTIVE','RFQ','BID','NEGOTIATION'].includes(s(p.stage))).length,
  access:projects.filter(p=>n(p.probability)>0||['ACTIVE','RFQ','BID','NEGOTIATION'].includes(s(p.stage))).length,
  meetings:meetings.filter(m=>!['CANCELLED','Cancelled'].includes(s(m.status))).length,
  rfq:projects.filter(p=>['RFQ','BID','NEGOTIATION'].includes(s(p.stage))).length,
  won:projects.filter(p=>s(p.stage)==='WON').length,
  opportunities:opps.filter(o=>!['LOST'].includes(s(o.stage))).length
 };
}
