export const TARGET_SEGMENTS = ['INDUSTRIAL_FACTORY','REAL_ESTATE_DEVELOPER','MAIN_CONTRACTOR','INDUSTRIAL_CONTRACTOR','ENGINEERING_CONSULTANT','MANUFACTURER','SUPPLIER','FACILITY_OPERATOR','OTHER'] as const;
export type TargetSegment = typeof TARGET_SEGMENTS[number];
export const MESSAGE_TYPES = ['INITIAL_INTRODUCTION','VENDOR_REGISTRATION','SUBCONTRACTING','PROJECT_OPPORTUNITY','INDUSTRIAL_SERVICES','FOLLOW_UP_1','FOLLOW_UP_2','FINAL_FOLLOW_UP','MEETING_REQUEST','POST_MEETING','RFQ_FOLLOW_UP'] as const;
export type MessageType = typeof MESSAGE_TYPES[number];
export const MESSAGE_STYLES = ['DIRECT','RELATIONSHIP','OPPORTUNITY_LED'] as const;
export type MessageStyle = typeof MESSAGE_STYLES[number];
export type IntelligenceRow = Record<string, unknown>;

const text=(value:unknown)=>String(value??'').trim();
const haystack=(row:IntelligenceRow)=>[row.company_name,row.companyName,row.company_type,row.companyType,row.sector,row.subsector,row.activity,row.business_type].map(text).join(' ').toLowerCase();

export function classifySegment(company:IntelligenceRow):{segment:TargetSegment;confidence:number;reason:string}{
  const explicit=text(company.target_segment) as TargetSegment;
  if(TARGET_SEGMENTS.includes(explicit)) return {segment:explicit,confidence:100,reason:'تصنيف بشري محفوظ'};
  const value=haystack(company);
  const rules:Array<[TargetSegment,RegExp,string]>=[
    ['REAL_ESTATE_DEVELOPER',/real estate|developer|development|عقار|تطوير عقاري/,'نشاط تطوير عقاري'],
    ['ENGINEERING_CONSULTANT',/consult|engineering consultant|استشار|مكتب هندسي/,'نشاط استشارات هندسية'],
    ['MAIN_CONTRACTOR',/main contractor|general contractor|epc|مقاول رئيس|general construction/,'مقاول رئيسي أو EPC'],
    ['INDUSTRIAL_CONTRACTOR',/industrial contract|civil contract|construction.*industrial|مقاولات صناعية/,'مقاولات صناعية'],
    ['INDUSTRIAL_FACTORY',/factory|plant|petrochemical|refinery|industrial gases|مصنع|بتروكيما/,'منشأة أو مصنع صناعي'],
    ['MANUFACTURER',/manufactur|fabrication|تصنيع|منتج/,'نشاط تصنيع'],
    ['FACILITY_OPERATOR',/facility|operator|operations|تشغيل مرافق/,'تشغيل منشأة أو مرافق'],
    ['SUPPLIER',/supplier|trading|distribution|توريد|تجارة/,'توريد أو توزيع'],
  ];
  const match=rules.find(([,pattern])=>pattern.test(value));
  return match?{segment:match[0],confidence:80,reason:match[2]}:{segment:'OTHER',confidence:35,reason:'البيانات الحالية لا تكفي لتصنيف أدق'};
}

const strategy:Record<TargetSegment,{angle:string;reason:string;department:string;role:string;style:MessageStyle;type:MessageType}>={
  INDUSTRIAL_FACTORY:{angle:'دعم الأعمال المدنية والصيانة الإنشائية وتجهيز المواقع والتأهيل كمورد',reason:'المنشآت الصناعية تحتاج منفذين محليين للأعمال المدنية والدعم التشغيلي دون افتراض مشروع محدد',department:'المشاريع أو الهندسة أو المشتريات',role:'مدير المشاريع أو مدير المشتريات',style:'DIRECT',type:'INDUSTRIAL_SERVICES'},
  REAL_ESTATE_DEVELOPER:{angle:'التأهيل كمقاول لحزم التنفيذ والأعمال المدنية والمعمارية',reason:'المطورون يديرون تأهيل المقاولين وحزم تنفيذ حالية أو مستقبلية دون افتراض مشروع بعينه',department:'المشاريع أو الإنشاءات أو العقود',role:'مدير المشاريع أو مدير العقود',style:'OPPORTUNITY_LED',type:'PROJECT_OPPORTUNITY'},
  MAIN_CONTRACTOR:{angle:'تنفيذ حزم مقاولات فرعية ودعم التنفيذ المحلي',reason:'المقاول الرئيسي قد يحتاج مقاولين فرعيين للحزم المدنية والمعمارية والمتخصصة',department:'المقاولات الفرعية أو المشتريات أو التجاري',role:'مدير المقاولات الفرعية أو مدير المشتريات',style:'DIRECT',type:'SUBCONTRACTING'},
  INDUSTRIAL_CONTRACTOR:{angle:'دعم التنفيذ المحلي للحزم المدنية والصناعية',reason:'المقاول الصناعي يستفيد من قدرة تنفيذ محلية مكملة ضمن نطاقات موثقة عند ظهورها',department:'المشاريع أو المشتريات أو التجاري',role:'مدير المشاريع أو مدير المشتريات',style:'DIRECT',type:'SUBCONTRACTING'},
  ENGINEERING_CONSULTANT:{angle:'التعريف بقدرات التنفيذ وبناء علاقة مقاول موصى به',reason:'الاستشاري يؤثر في قوائم المقاولين والمناقصات والدعم الفني للتنفيذ',department:'إدارة المشاريع أو المناقصات أو تطوير الأعمال',role:'مدير المشروع أو مدير المناقصات',style:'RELATIONSHIP',type:'INITIAL_INTRODUCTION'},
  MANUFACTURER:{angle:'أعمال التركيب والواجهات المدنية وتجهيز المواقع والدعم الصناعي',reason:'المصنّع قد يحتاج دعماً محلياً لأعمال التركيب والتجهيز المرتبطة بمنتجاته',department:'المشاريع أو الهندسة أو العمليات',role:'مدير المشاريع أو مدير الهندسة',style:'DIRECT',type:'INDUSTRIAL_SERVICES'},
  SUPPLIER:{angle:'دعم التركيب والتنفيذ المحلي للأعمال المرتبطة بالتوريد',reason:'المورد قد يحتاج شريك تنفيذ محلي يكمل نطاق التوريد دون ادعاء عقد قائم',department:'المشاريع أو المبيعات الفنية',role:'مدير المشاريع أو مدير المبيعات الفنية',style:'RELATIONSHIP',type:'INITIAL_INTRODUCTION'},
  FACILITY_OPERATOR:{angle:'الصيانة الإنشائية والتعديلات المدنية ودعم المرافق',reason:'مشغل المرافق يحتاج مساراً واضحاً لتأهيل مقاولي الصيانة والتعديلات',department:'الصيانة أو المرافق أو المشتريات',role:'مدير الصيانة أو مدير المرافق',style:'DIRECT',type:'VENDOR_REGISTRATION'},
  OTHER:{angle:'التعريف بقدرات التنفيذ والتحقق من مسار تأهيل المقاولين',reason:'يلزم تحقق يدوي إضافي قبل اختيار زاوية أكثر تحديداً',department:'المشتريات أو تطوير الأعمال',role:'مسؤول المشتريات أو تطوير الأعمال',style:'RELATIONSHIP',type:'INITIAL_INTRODUCTION'},
};

export function businessAngle(company:IntelligenceRow){const classification=classifySegment(company);const selected=strategy[classification.segment];return {...classification,...selected,evidenceLevel:text(company.source_url||company.website)?'INTERNAL_SOURCE':'LIMITED'};}

export function weightedCompleteness(company:IntelligenceRow,contacts:IntelligenceRow[]=[]){
 const checks=[['هوية الشركة',15,company.company_name||company.companyName],['الموقع الإلكتروني',10,company.website],['القطاع والفئة',15,company.sector&&classifySegment(company).segment!=='OTHER'],['المدينة',8,company.city],['قناة اتصال',10,company.general_email||company.email||company.general_phone||company.phone],['صانع قرار موثق',18,contacts.some(c=>c.decision_maker===true&&text(c.verification_status)==='VERIFIED'&&Boolean(c.source_url||c.source))],['جهة اتصال موثقة',12,contacts.some(c=>text(c.verification_status)==='VERIFIED'&&Boolean(c.source_url||c.source))],['بوابة موردين',5,company.vendor_registration_url],['دليل مصدر',7,company.source_url||company.source]] as const;
 const score=checks.reduce((sum,[,weight,present])=>sum+(present?weight:0),0);const critical=checks.filter(([,weight,present])=>weight>=10&&!present).map(([label])=>label),optional=checks.filter(([,weight,present])=>weight<10&&!present).map(([label])=>label);return {score,missingCritical:critical,missingOptional:optional};
}

export function nextBestAction(company:IntelligenceRow,contacts:IntelligenceRow[]=[],drafts:IntelligenceRow[]=[],events:IntelligenceRow[]=[],followups:IntelligenceRow[]=[],opportunities:IntelligenceRow[]=[]){
 const verified=contacts.some(c=>c.company_id===company.id&&c.decision_maker===true&&text(c.verification_status)==='VERIFIED'&&Boolean(c.source_url||c.source));
 if(!verified)return {code:'FIND_DECISION_MAKER',label:'تحديد صانع القرار',reason:'لا يوجد صانع قرار موثق بدليل'};
 const ownDraft=drafts.find(d=>d.company_id===company.id&&!d.archived_at&&['Draft','Approved'].includes(text(d.status)));
 if(!ownDraft)return {code:'PREPARE_DRAFT',label:'تجهيز مسودة مخصصة',reason:'صانع القرار موثق ولا توجد مسودة مرتبطة'};
 if(text(ownDraft.status)==='Draft')return {code:'REVIEW_DRAFT',label:'مراجعة المسودة',reason:'المسودة لم تعتمد بشرياً بعد'};
 const outbound=events.some(e=>e.company_id===company.id&&e.direction==='OUTBOUND');if(!outbound)return {code:'RECORD_COMMUNICATION',label:'تسجيل التواصل الفعلي',reason:'المسودة معتمدة ولم يسجل تواصل صادر'};
 const inbound=events.some(e=>e.company_id===company.id&&e.direction==='INBOUND');if(!inbound)return {code:'FOLLOW_UP',label:'متابعة التواصل',reason:'تم التواصل ولم يسجل رد وارد'};
 if(!opportunities.some(o=>o.company_id===company.id&&!o.archived_at))return {code:'REVIEW_OPPORTUNITY',label:'مراجعة توصية فرصة',reason:'يوجد رد موثق ويجب تقييم الإشارة التجارية'};
 if(followups.some(f=>f.company_id===company.id&&!['Completed','Cancelled'].includes(text(f.status))))return {code:'COMPLETE_FOLLOW_UP',label:'تنفيذ المتابعة',reason:'توجد متابعة مفتوحة'};
 return {code:'REVIEW_COMPANY',label:'مراجعة الشركة',reason:'لا يوجد إجراء عاجل موثق'};
}

export type MessageInput={companyName:string;recipientName?:string;segment:TargetSegment;angle:string;role:string;language:'ARABIC'|'ENGLISH';style:MessageStyle;type:MessageType;channel:'Email'|'LinkedIn'|'WhatsApp'|'Call';};
export function generateMessage(input:MessageInput){
 const recipient=input.recipientName?`الأستاذ/ة ${input.recipientName}`:'فريق '+input.role;
 const ctaAr=input.type==='VENDOR_REGISTRATION'?'هل يمكن مشاركتنا بآلية تسجيل وتأهيل المقاولين لديكم؟':input.type==='SUBCONTRACTING'?'من المسؤول عن تأهيل المقاولين الفرعيين وحزم التنفيذ؟':'هل يمكن توجيهنا إلى القسم المسؤول لعرض ملف الشركة ومناقشة نطاق تعاون مناسب؟';
 const ctaEn=input.type==='VENDOR_REGISTRATION'?'Could you share your contractor/vendor qualification process?':input.type==='SUBCONTRACTING'?'Who handles subcontractor qualification and execution packages?':'Could you direct us to the right team for a brief introduction and a relevant cooperation discussion?';
 if(input.language==='ARABIC'){
  const opening=input.style==='DIRECT'?`مرحباً ${recipient}،`:input.style==='OPPORTUNITY_LED'?`مرحباً ${recipient}، نتواصل معكم بخصوص ${input.angle}.`:`مرحباً ${recipient}، نرغب في فتح قناة مهنية مع ${input.companyName}.`;
  const body=input.style==='OPPORTUNITY_LED'?` نعمل في تنفيذ أعمال المقاولات ونسعى لفهم آلية التعاون والتأهيل لديكم دون افتراض نطاق قائم.`:` نتواصل تحديداً بشأن ${input.angle}، ونرغب في معرفة المسار الصحيح للتعريف بقدرات التنفيذ.`;
  return `${opening}${body}\n\n${ctaAr}`;
 }
 const englishAngle:Record<TargetSegment,string>={INDUSTRIAL_FACTORY:'civil works, structural maintenance, site preparation, and vendor qualification',REAL_ESTATE_DEVELOPER:'contractor qualification and relevant execution packages',MAIN_CONTRACTOR:'subcontractor qualification and civil or architectural packages',INDUSTRIAL_CONTRACTOR:'local execution support for civil and industrial packages',ENGINEERING_CONSULTANT:'contractor introduction and relevant tender opportunities',MANUFACTURER:'installation, civil interface works, and local industrial support',SUPPLIER:'local installation and execution support',FACILITY_OPERATOR:'structural maintenance, civil modifications, and contractor qualification',OTHER:'your contractor qualification route'};
 const opening=input.style==='DIRECT'?`Hello ${input.recipientName||input.role},`:`Hello ${input.recipientName||input.role}, we are reaching out specifically to ${input.companyName}.`;
 const body=input.style==='OPPORTUNITY_LED'?` We would like to understand the right qualification route for ${englishAngle[input.segment]}, without assuming a current project or requirement.`:` Our purpose is to explore ${englishAngle[input.segment]} and identify the appropriate qualification route.`;
 return `${opening}\n\n${body}\n\n${ctaEn}`;
}

const genericPhrases=['يسعدنا أن نقدم','خدماتنا المتميزة','نحن الأفضل','delighted to introduce','leading company'];
const tokens=(value:string)=>new Set(value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,'').split(/\s+/).filter(word=>word.length>2));
export function messageSimilarity(a:string,b:string){const aa=tokens(a),bb=tokens(b),intersection=[...aa].filter(x=>bb.has(x)).length,union=new Set([...aa,...bb]).size;return union?intersection/union:0;}
export function messageQuality(message:string,input:Pick<MessageInput,'companyName'|'angle'|'channel'>,existing:string[]=[]){
 let score=100;const issues:string[]=[];const words=message.trim().split(/\s+/).filter(Boolean).length;
 if(!message.includes(input.companyName)){score-=15;issues.push('اسم الشركة غير موجود');}
 if(!message.toLowerCase().includes(input.angle.split(' ')[0].toLowerCase())){score-=15;issues.push('زاوية التعاون ضعيفة');}
 if(genericPhrases.some(p=>message.toLowerCase().includes(p.toLowerCase()))){score-=25;issues.push('صياغة تسويقية عامة');}
 const max=input.channel==='Email'?180:input.channel==='LinkedIn'?80:input.channel==='WhatsApp'?60:120;if(words>max){score-=20;issues.push('الرسالة أطول من القناة');}
 if(!/[؟?]/.test(message)){score-=15;issues.push('لا يوجد CTA واضح');}
 const maxSimilarity=Math.max(0,...existing.map(other=>messageSimilarity(message,other)));if(maxSimilarity>=.82){score-=25;issues.push('مسودة شبه مكررة وتحتاج تخصيصاً');}
 score=Math.max(0,score);return {score,status:score>=80?'STRONG':score>=65?'ACCEPTABLE':'WEAK',issues,maxSimilarity:Math.round(maxSimilarity*100)} as const;
}

export function followUpDraft(context:{language:'ARABIC'|'ENGLISH';companyName:string;recipientName?:string;kind:'NO_RESPONSE'|'REPLY'|'VENDOR'|'MEETING'|'RFQ'}){
 const name=context.recipientName||context.companyName;if(context.language==='ENGLISH'){if(context.kind==='NO_RESPONSE')return `Hello ${name}, following up briefly on the note below. Could you direct us to the appropriate team?`;if(context.kind==='VENDOR')return `Hello ${name}, thank you for sharing the qualification route. Could you confirm the next required document or step?`;return `Hello ${name}, following up on our recent ${context.kind.toLowerCase()} discussion. What would be the most useful next step?`;}
 if(context.kind==='NO_RESPONSE')return `مرحباً ${name}، متابعة مختصرة للرسالة أدناه. هل يمكن توجيهنا إلى القسم المسؤول؟`;if(context.kind==='VENDOR')return `مرحباً ${name}، شكراً لمشاركة مسار التأهيل. ما المستند أو الخطوة التالية المطلوبة؟`;return `مرحباً ${name}، نتابع معكم بخصوص التواصل الأخير. ما الإجراء الأنسب للانتقال إلى الخطوة التالية؟`;
}
