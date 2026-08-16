import { classifySegment, type IntelligenceRow, type TargetSegment } from './intelligence/core';

export const SEGMENT_LABELS: Record<TargetSegment,string> = {
  REAL_ESTATE_DEVELOPER:'مطورون عقاريون',
  ENGINEERING_CONSULTANT:'استشاريون هندسيون',
  MAIN_CONTRACTOR:'مقاولون رئيسيون',
  INDUSTRIAL_CONTRACTOR:'مقاولون رئيسيون / EPC',
  INDUSTRIAL_FACTORY:'عملاء صناعيون',
  MANUFACTURER:'عملاء صناعيون',
  SUPPLIER:'Supply Side',
  FACILITY_OPERATOR:'عملاء صناعيون',
  OTHER:'غير مصنف — يحتاج مراجعة',
};

export const CORE_SEGMENTS: TargetSegment[] = [
  'REAL_ESTATE_DEVELOPER','ENGINEERING_CONSULTANT','MAIN_CONTRACTOR','INDUSTRIAL_CONTRACTOR','INDUSTRIAL_FACTORY','MANUFACTURER','SUPPLIER','FACILITY_OPERATOR','OTHER'
];

export function companySegment(row:IntelligenceRow):TargetSegment {
  return classifySegment(row).segment;
}

export function readableText(value:unknown){
  let output=String(value??'');
  const trimmed=output.trim();
  if(trimmed.startsWith('"')&&trimmed.endsWith('"')){
    try{const parsed=JSON.parse(trimmed);if(typeof parsed==='string')output=parsed}catch{/* keep original */}
  }
  output=output
    .replace(/\\u\{([0-9a-fA-F]+)\}/g,(_,hex)=>String.fromCodePoint(parseInt(hex,16)))
    .replace(/\\u([0-9a-fA-F]{4})/g,(_,hex)=>String.fromCharCode(parseInt(hex,16)))
    .replace(/\\x([0-9a-fA-F]{2})/g,(_,hex)=>String.fromCharCode(parseInt(hex,16)))
    .replace(/\\r\\n/g,'\n').replace(/\\n/g,'\n').replace(/\\t/g,'\t')
    .replace(/&nbsp;/gi,' ')
    .replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g,(_,hex)=>String.fromCodePoint(parseInt(hex,16)))
    .replace(/&quot;/gi,'"').replace(/&apos;/gi,"'").replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
  if(/%(?:D8|D9|DA|DB)/i.test(output)){
    try{output=decodeURIComponent(output)}catch{/* keep decoded-so-far value */}
  }
  return output;
}

export const RELATIONSHIP_LABELS:Record<string,string>={DIRECT_BUYER:'عميل مباشر',SUBCONTRACT_BUYER:'مشتري مقاولات باطن',INFLUENCER_REFERRER:'مؤثر / شريك إحالة',SUPPLY_SIDE:'جهة توريد',UNCLASSIFIED:'يحتاج تصنيف'};

export type LastResearchedTone='status-success'|'status-warning'|'status-danger'|'status-neutral';

function arabicUnit(count:number,forms:[string,string,string,string]):string{
  if(count===1)return forms[0];
  if(count===2)return forms[1];
  if(count>=3&&count<=10)return `${count} ${forms[2]}`;
  return `${count} ${forms[3]}`;
}

export function lastResearchedLabel(value?:string|null):{label:string;tone:LastResearchedTone}{
  const timestamp=value?Date.parse(value):NaN;
  if(!value||!Number.isFinite(timestamp))return {label:'لم يُبحث عنه',tone:'status-neutral'};
  const diffDays=Math.max(0,Math.floor((Date.now()-timestamp)/86400000));
  const tone:LastResearchedTone=diffDays<30?'status-success':diffDays<=90?'status-warning':'status-danger';
  let label:string;
  if(diffDays<1)label='اليوم';
  else if(diffDays<30)label=`منذ ${arabicUnit(diffDays,['يوم','يومين','أيام','يومًا'])}`;
  else if(diffDays<365){const months=Math.max(1,Math.round(diffDays/30));label=`منذ ${arabicUnit(months,['شهر','شهرين','أشهر','شهرًا'])}`}
  else{const years=Math.max(1,Math.round(diffDays/365));label=`منذ ${arabicUnit(years,['سنة','سنتين','سنوات','سنة'])}`}
  return {label,tone};
}
