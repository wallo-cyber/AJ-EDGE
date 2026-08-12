import type {SimpleRow} from'../supabase/simple-crud';
const s=(v:unknown)=>String(v??'').trim();
const n=(v:unknown)=>Number(v||0)||0;

export type PursuitRoute='DIRECT_OWNER'|'SUBCONTRACT'|'CONSULTANT_REFERRAL'|'SUPPLIER_PARTNERSHIP'|'VENDOR_REGISTRATION'|'TENDER'|'UNDEFINED';
export type PlaybookStep={key:string;order:number;title:string;objective:string;targetRole:string;human:boolean};

export const PLAYBOOKS:Record<PursuitRoute,PlaybookStep[]>={
 DIRECT_OWNER:[
  {key:'verify_project',order:1,title:'تحقق من المشروع',objective:'تأكيد المشروع والمرحلة والاحتياج من مصدر موثق.',targetRole:'',human:true},
  {key:'map_owner_projects',order:2,title:'الوصول إلى Projects / Engineering',objective:'تحديد المسؤول الفعلي عن المشروع قبل Procurement.',targetRole:'PROJECT_OWNER',human:true},
  {key:'map_procurement',order:3,title:'تحديد Procurement / Contracts',objective:'فهم آلية التأهيل والشراء.',targetRole:'PROCUREMENT_GATEKEEPER',human:true},
  {key:'qualification',order:4,title:'فحص التأهيل',objective:'تحديد Vendor Registration والمتطلبات قبل طلب RFQ.',targetRole:'PROCUREMENT_GATEKEEPER',human:true},
  {key:'meeting',order:5,title:'طلب اجتماع المشروع',objective:'مناقشة الحزمة المناسبة والتوقيت.',targetRole:'PROJECT_OWNER',human:true},
  {key:'rfq_watch',order:6,title:'مراقبة RFQ',objective:'متابعة الطرح والحزمة دون إزعاج عشوائي.',targetRole:'PROCUREMENT_GATEKEEPER',human:true},
 ],
 SUBCONTRACT:[
  {key:'verify_award',order:1,title:'تحقق من ترسية المقاول الرئيسي',objective:'تأكيد أن المشروع فعلي وأن المقاول مسؤول عن التنفيذ.',targetRole:'',human:true},
  {key:'package_map',order:2,title:'حدد حزمة الباطن',objective:'تحديد الحزمة التي تناسب قدراتنا وتوقيت شرائها.',targetRole:'PROJECT_OWNER',human:true},
  {key:'prequal',order:3,title:'Prequalification',objective:'الوصول إلى Subcontracts / Procurement والتأهل.',targetRole:'PROCUREMENT_GATEKEEPER',human:true},
  {key:'commercial',order:4,title:'الوصول إلى Commercial / Contracts',objective:'فهم طريقة التسعير والشروط والحزم القادمة.',targetRole:'CONTRACTS_COMMERCIAL',human:true},
  {key:'package_request',order:5,title:'طلب الحزم الحالية والقادمة',objective:'الحصول على RFQ أو Bid Invite محدد.',targetRole:'PROCUREMENT_GATEKEEPER',human:true},
 ],
 CONSULTANT_REFERRAL:[
  {key:'map_pm',order:1,title:'حدد Project Manager',objective:'الوصول إلى مدير المشروع/المهندس المسؤول.',targetRole:'INFLUENCER',human:true},
  {key:'relationship',order:2,title:'ابنِ علاقة مهنية',objective:'تعريف القدرات دون طلب مشروع مباشر.',targetRole:'INFLUENCER',human:true},
  {key:'project_portfolio',order:3,title:'اربط الاستشاري بمشاريعه',objective:'تحديد المشاريع التي يمكن أن يرشحنا لها.',targetRole:'INFLUENCER',human:true},
  {key:'approved_list',order:4,title:'Approved Contractor / Tender List',objective:'فهم آلية إدراج المقاولين والترشيح.',targetRole:'INFLUENCER',human:true},
  {key:'introduction',order:5,title:'طلب مقدمة مناسبة',objective:'طلب Introduction فقط عند وجود مشروع وحاجة واضحة.',targetRole:'CHAMPION',human:true},
 ],
 SUPPLIER_PARTNERSHIP:[
  {key:'map_supplier_projects',order:1,title:'مشاريع المورد الحالية',objective:'فهم أين يورد ومن هم عملاؤه النشطون.',targetRole:'PROJECT_OWNER',human:true},
  {key:'joint_scope',order:2,title:'حدد النطاق المشترك',objective:'تحديد تنفيذ محلي مرتبط بمنتج المورد.',targetRole:'TECHNICAL_BUYER',human:true},
  {key:'lead_exchange',order:3,title:'Lead Sharing',objective:'بناء تبادل فرص موثق وليس وعودًا عامة.',targetRole:'CHAMPION',human:true},
  {key:'joint_intro',order:4,title:'Joint Introduction',objective:'التواصل المشترك مع العميل عند وجود فرصة موثقة.',targetRole:'CHAMPION',human:true},
 ],
 VENDOR_REGISTRATION:[
  {key:'find_portal',order:1,title:'حدد بوابة التسجيل',objective:'تأكيد رابط وإجراءات Vendor Registration.',targetRole:'PROCUREMENT_GATEKEEPER',human:true},
  {key:'requirements',order:2,title:'اجمع المتطلبات',objective:'مقارنة المتطلبات بمستندات الشركة وجاهزيتها.',targetRole:'PROCUREMENT_GATEKEEPER',human:true},
  {key:'apply',order:3,title:'تقديم التسجيل',objective:'التقديم بعد اعتماد بشري للملف.',targetRole:'PROCUREMENT_GATEKEEPER',human:true},
  {key:'followup',order:4,title:'متابعة حالة التأهيل',objective:'منع التسجيل من التوقف دون متابعة.',targetRole:'PROCUREMENT_GATEKEEPER',human:true},
 ],
 TENDER:[
  {key:'tender_verify',order:1,title:'تحقق من الطرح',objective:'تأكيد الجهة والموعد والمستندات.',targetRole:'PROCUREMENT_GATEKEEPER',human:true},
  {key:'bid_no_bid',order:2,title:'Bid / No-Bid',objective:'تقييم الملاءمة والوصول والتأهيل والمنافسة.',targetRole:'',human:true},
  {key:'documents',order:3,title:'مراجعة مستندات الطرح',objective:'فهم النطاق والمخاطر والمتطلبات.',targetRole:'TECHNICAL_BUYER',human:true},
  {key:'clarifications',order:4,title:'الاستفسارات والتوضيحات',objective:'إغلاق الغموض قبل التسعير.',targetRole:'CONTRACTS_COMMERCIAL',human:true},
  {key:'submit',order:5,title:'إدارة التسليم',objective:'ضبط الموعد والمسؤول والمرفقات.',targetRole:'PROCUREMENT_GATEKEEPER',human:true},
 ],
 UNDEFINED:[
  {key:'verify_project',order:1,title:'تحقق من المشروع',objective:'تأكيد المشروع ومصدره.',targetRole:'',human:true},
  {key:'map_ecosystem',order:2,title:'ارسم منظومة المشروع',objective:'Owner / Consultant / GC / Suppliers.',targetRole:'',human:true},
  {key:'select_route',order:3,title:'اختر مسار الإيراد',objective:'تحديد أقصر طريق واقعي للفوز بالعمل.',targetRole:'',human:true},
 ]
};

export function bidScore(x:Record<string,unknown>){
 const weights={project_fit:.14,scope_fit:.14,timing:.10,access:.14,qualification:.10,relationship:.10,competition:.08,commercial_attractiveness:.10,delivery_capability:.10};
 let total=0;
 for(const [k,w] of Object.entries(weights))total+=n(x[k])*w;
 return Math.round(Math.max(0,Math.min(100,total)));
}
export function bidRecommendation(score:number){
 return score>=80?'PURSUE':score>=65?'CONDITIONAL':score>=45?'WATCH':'PASS';
}
export function lifecyclePhase(project:SimpleRow,updates:SimpleRow[],bids:SimpleRow[]){
 const stage=s(project.stage);
 if(stage==='WON')return'AWARDED';
 if(['RFQ','BID','NEGOTIATION'].includes(stage)||bids.some(x=>['INVITED','REVIEWING','BIDDING','SUBMITTED','CLARIFICATION'].includes(s(x.status))))return'BIDDING';
 if(updates.some(x=>['GC_APPOINTED','TENDER','RFQ'].includes(s(x.update_type))))return'PRECONSTRUCTION';
 if(updates.some(x=>['DESIGN','CONSULTANT_APPOINTED'].includes(s(x.update_type))))return'DESIGN';
 return'EARLY_PLANNING';
}
export function relationshipLabel(edge:SimpleRow){
 const m:Record<string,string>={WORKED_WITH:'عمل معه',CURRENT_PROJECT:'مشروع حالي',PAST_PROJECT:'مشروع سابق',REFERRAL:'إحالة',SUPPLIER_OF:'مورد لـ',CONSULTANT_TO:'استشاري لـ',CONTRACTOR_TO:'مقاول لـ',CLIENT_OF:'عميل لـ',KNOWS:'يعرف',INTRODUCED_BY:'مقدمة بواسطة'};
 return m[s(edge.relationship_type)]||s(edge.relationship_type)||'علاقة';
}
export function strongestEdges(edges:SimpleRow[],limit=8){
 return [...edges].filter(e=>s(e.verification_status)==='verified').sort((a,b)=>n(b.strength)-n(a.strength)).slice(0,limit);
}
export function dueState(due:unknown){
 const raw=s(due);if(!raw)return'NO_DUE';const d=Date.parse(raw);if(!Number.isFinite(d))return'NO_DUE';const diff=d-Date.now();if(diff<0)return'OVERDUE';if(diff<72*3600*1000)return'DUE_SOON';return'UPCOMING';
}
