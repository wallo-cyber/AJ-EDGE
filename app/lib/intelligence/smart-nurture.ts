export type NurtureDecision = 'CONTACT_NOW'|'FOLLOW_UP'|'NURTURE'|'WAIT'|'RE_ENGAGE'|'DO_NOT_CONTACT';
type Row = Record<string, unknown>;
const text=(value:unknown)=>String(value??'').trim();
const daysSince=(value:unknown, now=new Date())=>{const date=new Date(text(value));return Number.isNaN(date.getTime())?Infinity:Math.floor((now.getTime()-date.getTime())/86400000);};

export function nurtureDecision(company:Row, context:{events?:Row[];opportunities?:Row[];signals?:Row[];now?:Date}={}) {
 const events=context.events??[], opportunities=context.opportunities??[], signals=context.signals??[], now=context.now??new Date();
 const activeOpportunity=opportunities.some(item=>!['WON','LOST'].includes(text(item.stage).toUpperCase()));
 const lastOutbound=events.filter(item=>text(item.direction).toUpperCase()==='OUTBOUND').map(item=>item.occurred_at||item.created_at).sort().at(-1);
 const replies=events.some(item=>text(item.direction).toUpperCase()==='INBOUND'); const recent=daysSince(lastOutbound,now)<30;
 const signal=signals.some(item=>Boolean(item.source_url)&&['NEW','RELEVANT'].includes(text(item.status).toUpperCase()));
 const priority=text(company.priority).toUpperCase()||'C'; const paused=text(company.nurture_status).toUpperCase()==='PAUSED'||company.do_not_contact===true;
 if(paused)return {decision:'DO_NOT_CONTACT' as const,reason:'تم إيقاف التواصل لهذه الشركة أو وضعها في قائمة عدم التواصل.',timing:null,frequency:0};
 if(activeOpportunity)return {decision:'FOLLOW_UP' as const,reason:'توجد فرصة مفتوحة وتحتاج متابعة مباشرة مرتبطة بالفرصة، لا نشرة دورية.',timing:0,frequency:0};
 if(replies)return {decision:'FOLLOW_UP' as const,reason:'يوجد رد محفوظ؛ المتابعة يجب أن تكون مخصصة للسياق.',timing:0,frequency:0};
 if(signal)return {decision:'CONTACT_NOW' as const,reason:'هناك إشارة موثقة حديثة تصلح سبباً حقيقياً للتواصل.',timing:0,frequency:priority==='A'?30:60};
 if(recent)return {decision:'WAIT' as const,reason:'تم التواصل حديثاً؛ لا تُنشأ رسالة جديدة قبل انتهاء فترة التهدئة.',timing:30-daysSince(lastOutbound,now),frequency:priority==='A'?30:60};
 if(priority==='C')return {decision:'WAIT' as const,reason:'الأولوية C لا تُغذّى دورياً من دون إشارة أو سبب جديد.',timing:null,frequency:90};
 const lastNurture=daysSince(company.last_nurture_date,now), frequency=Number(company.nurture_frequency_days|| (priority==='A'?45:75));
 if(lastNurture>=frequency)return {decision:lastNurture===Infinity?'NURTURE':'RE_ENGAGE' as NurtureDecision,reason:'مرّ الوقت المحدد منذ آخر تحديث علاقة دون تواصل حديث أو فرصة مفتوحة.',timing:0,frequency};
 return {decision:'WAIT' as const,reason:'دورة التغذية الدورية لم تستحق بعد.',timing:frequency-lastNurture,frequency};
}

export function exclusionReason(company:Row, context:{events?:Row[];opportunities?:Row[];contacts?:Row[]}={}) {
 if(company.do_not_contact===true||text(company.nurture_status).toUpperCase()==='PAUSED') return 'PAUSED_OR_DO_NOT_CONTACT';
 if(!(text(company.general_email)||context.contacts?.some(contact=>text(contact.email)&&text(contact.verification_status).toUpperCase()==='VERIFIED'))) return 'NO_VERIFIED_EMAIL_CHANNEL';
 if(context.opportunities?.some(opportunity=>!['WON','LOST'].includes(text(opportunity.stage).toUpperCase()))) return 'ACTIVE_OPPORTUNITY_REQUIRES_DIRECT_FOLLOW_UP';
 if(context.events?.some(event=>text(event.direction).toUpperCase()==='OUTBOUND'&&daysSince(event.occurred_at||event.created_at)<30)) return 'RECENTLY_CONTACTED';
 return '';
}
