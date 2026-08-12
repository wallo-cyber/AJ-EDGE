export type MarketEventType=
 'NEW_FACTORY'|'EXPANSION'|'WAREHOUSE'|'NEW_FACILITY'|'CONTRACT_AWARD'|'CONSULTANT_APPOINTED'|
 'GC_APPOINTED'|'LAND_ALLOCATION'|'PERMIT'|'VENDOR_REGISTRATION'|'PREQUALIFICATION'|'RFQ'|'RFP'|
 'TENDER'|'HIRING_SIGNAL'|'OTHER';

export function classifyMarketEvent(text:string):MarketEventType{
 const t=String(text??'').toLowerCase();
 if(/new factory|مصنع جديد|new plant/.test(t))return'NEW_FACTORY';
 if(/expansion|توسعة/.test(t))return'EXPANSION';
 if(/warehouse|مستودع|logistics hub/.test(t))return'WAREHOUSE';
 if(/new facility|facility project|منشأة جديدة/.test(t))return'NEW_FACILITY';
 if(/contract award|awarded|ترسية|إسناد/.test(t))return'CONTRACT_AWARD';
 if(/consultant appointed|consultancy award|استشاري/.test(t))return'CONSULTANT_APPOINTED';
 if(/main contractor|general contractor|epc award/.test(t))return'GC_APPOINTED';
 if(/industrial land|land allocation|أرض صناعية/.test(t))return'LAND_ALLOCATION';
 if(/permit|رخصة|تصريح/.test(t))return'PERMIT';
 if(/vendor registration|supplier registration|تسجيل المورد/.test(t))return'VENDOR_REGISTRATION';
 if(/prequal|pre-qualification|تأهيل مسبق/.test(t))return'PREQUALIFICATION';
 if(/\brfq\b/.test(t))return'RFQ';
 if(/\brfp\b/.test(t))return'RFP';
 if(/tender|مناقصة|منافسة/.test(t))return'TENDER';
 if(/hiring|recruiting|project manager vacancy|procurement manager vacancy/.test(t))return'HIRING_SIGNAL';
 return'OTHER';
}

export function marketEventScore(x:{sourceQuality:number;eventConfidence:number;geographyConfidence:number;freshnessConfidence:number}){
 const score=x.sourceQuality*.35+x.eventConfidence*.30+x.geographyConfidence*.20+x.freshnessConfidence*.15;
 return Math.round(Math.max(0,Math.min(100,score)));
}

export function shouldReviewMarketEvent(score:number,eventType:MarketEventType){
 return score>=60&&eventType!=='OTHER';
}

export function suggestedMarketMove(eventType:MarketEventType){
 const m:Partial<Record<MarketEventType,string>>={
  NEW_FACTORY:'تحقق من المالك والاستشاري ومرحلة التصميم قبل أي تواصل.',
  EXPANSION:'اربط التوسعة بمشاريع/Engineering وحدد الحزمة المحتملة.',
  CONTRACT_AWARD:'حدد المقاول الفائز وابحث عن حزم الباطن القادمة.',
  CONSULTANT_APPOINTED:'اربط الاستشاري بالمشروع وحدد Project Manager/Design Manager.',
  GC_APPOINTED:'ابدأ Subcontract Pursuit وحدد Procurement/Subcontracts.',
  VENDOR_REGISTRATION:'افحص جاهزية مستندات الشركة ومتطلبات البوابة.',
  PREQUALIFICATION:'قارن شروط التأهيل بMarket Readiness قبل التقديم.',
  RFQ:'انقلها إلى Bid Board بعد التحقق البشري.',
  RFP:'انقلها إلى Bid Board بعد التحقق البشري.',
  TENDER:'نفّذ Bid/No-Bid قبل استهلاك وقت التسعير.',
 };
 return m[eventType]??'راجع الدليل واربط الإشارة بمشروع أو جهة مناسبة.';
}
