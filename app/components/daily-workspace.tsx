'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from './crm-shell';
import { isVerifiedDecisionMaker } from '../lib/domain/business';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';
import { getSupabaseClient } from '../lib/supabase/client';
import { buildCompanyIntelligence } from '../lib/intelligence/v6';

const safe = (value: unknown) => String(value ?? '').trim();
const dateKey = () => new Date().toISOString().slice(0, 10);
type Action = { id:string; rank:number; company?:SimpleRow; contact?:SimpleRow; label:string; reason:string; action:string; href:string; due?:string; last?:string; followUp?:SimpleRow };

export function DailyWorkspace() {
  const [data, setData] = useState<Record<string, SimpleRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const today = dateKey();
  const load = async () => {
    setLoading(true); setError('');
    try {
      const tables = ['companies','contacts','follow_ups','communication_events','opportunities','agent_jobs','messages','meetings','audit_events'];
      const rows = await Promise.all(tables.map(async (table) => [table, (await simpleCrud.page(table, 1, table === 'agent_jobs' ? 1000 : 500, { order:'created_at' })).rows] as const));
      setData(Object.fromEntries(rows));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تجهيز مركز العمل اليومي.'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    let cancelled=false;
    void getSupabaseClient().auth.getUser().then(({data:{user}})=>{if(!cancelled&&user)void load();});
    return()=>{cancelled=true;};
  }, []);

  const stats = useMemo(() => {
    const companies=data.companies??[], contacts=data.contacts??[], followups=data.follow_ups??[], events=data.communication_events??[], opportunities=data.opportunities??[], jobs=data.agent_jobs??[], messages=data.messages??[], meetings=data.meetings??[];
    const pendingExternal=jobs.filter(job=>job.status==='manual_research_required'&&job.research_resolution==='PENDING_EXTERNAL_RESEARCH');
    const potentialCompanies=new Set([...opportunities.filter(o=>!['WON','LOST'].includes(safe(o.stage))).map(o=>safe(o.company_id)),...companies.filter(c=>Number(c.opportunity_signal_score??0)>0).map(c=>c.id)]);
    const upcomingMeetings=meetings.filter(meeting=>!['Completed','Cancelled'].includes(safe(meeting.status))&&safe(meeting.date||meeting.meeting_date||meeting.scheduled_at)>=today);
    return {
      priority: companies.filter(c=>c.priority==='A').length,
      needsDecision: jobs.filter(j=>j.status==='failed').length+messages.filter(message=>message.status==='Draft'&&Boolean(message.contact_id)&&contacts.some(contact=>contact.id===message.contact_id&&isVerifiedDecisionMaker(contact))).length,
      externalResearch: pendingExternal.length,
      due: followups.filter(f=>safe(f.date||f.due_date)<=today&&!['Completed','Cancelled'].includes(safe(f.status))).length,
      ready: companies.filter(c=>contacts.some(x=>x.company_id===c.id&&isVerifiedDecisionMaker(x))&&!events.some(e=>e.company_id===c.id&&e.direction==='OUTBOUND')).length,
      vendorPortals: companies.filter(c=>Boolean(safe(c.vendor_registration_url))).length,
      potential: potentialCompanies.size,
      upcoming: upcomingMeetings.length+opportunities.filter(o=>!['WON','LOST'].includes(safe(o.stage))&&safe(o.next_action_date)>today).length,
    };
  }, [data, today]);

  const pilotCompanies = useMemo(() => {
    const companies=data.companies??[],contacts=data.contacts??[],jobs=data.agent_jobs??[],messages=data.messages??[];
    const ranks=new Map<string,number>();
    jobs.forEach(job=>{const payload=(job.payload&&typeof job.payload==='object'&&!Array.isArray(job.payload)?job.payload:{}) as Record<string,unknown>;if(payload.pilot==='real-world-pilot-phase-1'&&job.company_id){const id=safe(job.company_id),rank=Number(payload.pilot_rank??99);ranks.set(id,Math.min(rank,ranks.get(id)??99));}});
    return [...ranks.entries()].sort((a,b)=>a[1]-b[1]).slice(0,20).flatMap(([id,rank])=>{const company=companies.find(c=>c.id===id);if(!company)return[];const verifiedContacts=contacts.filter(c=>c.company_id===id&&safe(c.verification_status).toUpperCase()==='VERIFIED'&&Boolean(c.source_url||c.source));const dm=verifiedContacts.find(c=>c.decision_maker===true);const vendor=Boolean(company.vendor_registration_url);const draft=messages.find(m=>m.company_id===id&&m.contact_id===dm?.id&&['Draft','Approved'].includes(safe(m.status)));const status=!dm?'NEEDS DECISION MAKER':!verifiedContacts.length?'NEEDS CONTACT VERIFICATION':!vendor?'NEEDS VENDOR REGISTRATION':!draft?'READY FOR DRAFT':'READY FOR REVIEW';const href=status==='NEEDS DECISION MAKER'?`/research?tab=manual&company_id=${id}`:status==='NEEDS CONTACT VERIFICATION'?`/contacts?company_id=${id}`:status==='NEEDS VENDOR REGISTRATION'?`/companies/${id}`:`/outreach?tab=${status==='READY FOR REVIEW'?'review':'drafts'}&company_id=${id}`;return[{company,rank,dm,vendor,draft,status,href}]});
  },[data]);

  const highValueSignals = useMemo(() => {
    const companies=data.companies??[],contacts=data.contacts??[],followups=data.follow_ups??[],events=data.communication_events??[],opportunities=data.opportunities??[],drafts=data.messages??[];
    return companies.filter(company=>!company.archived_at).map(company=>({company,intelligence:buildCompanyIntelligence({company,contacts,drafts,events,followups,opportunities})})).filter(item=>item.intelligence.opportunitySignal.score>0).sort((a,b)=>b.intelligence.opportunitySignal.score-a.intelligence.opportunitySignal.score||b.intelligence.leadScore.score-a.intelligence.leadScore.score).slice(0,20);
  },[data]);

  const actions = useMemo(() => {
    const companies=data.companies??[],contacts=data.contacts??[],followUps=data.follow_ups??[],events=data.communication_events??[],opportunities=data.opportunities??[],jobs=data.agent_jobs??[],meetings=data.meetings??[],audit=data.audit_events??[];
    const list: Action[]=[]; const company=(id:unknown)=>companies.find(c=>c.id===id);
    const lastActivity=(id:unknown)=>safe([...events.filter(e=>e.company_id===id).map(e=>e.occurred_at),...audit.filter(e=>e.company_id===id).map(e=>e.created_at)].sort().at(-1));
    followUps.filter(f=>safe(f.date||f.due_date)<=today&&!['Completed','Cancelled'].includes(safe(f.status))).forEach(f=>list.push({id:`f-${f.id}`,rank:4,company:company(f.company_id),label:safe(f.company_name||f.subject),reason:safe(f.date||f.due_date)<today?'متابعة متأخرة':'متابعة مستحقة اليوم',action:safe(f.next_action||f.subject)||'تنفيذ المتابعة',href:`/follow-ups?company_id=${safe(f.company_id)}`,due:safe(f.date||f.due_date),last:lastActivity(f.company_id),followUp:f}));
    events.filter(e=>e.direction==='INBOUND'&&!e.archived_at).forEach(e=>list.push({id:`r-${e.id}`,rank:5,company:company(e.company_id),contact:contacts.find(c=>c.id===e.contact_id),label:safe(company(e.company_id)?.company_name)||'رد وارد',reason:`رد وارد عبر ${safe(e.channel)||'قناة تواصل'}`,action:safe(e.next_action)||'مراجعة الرد وتحديد الإجراء التالي',href:`/outreach?tab=history&company_id=${safe(e.company_id)}`,due:safe(e.next_action_date),last:safe(e.occurred_at)}));
    companies.filter(c=>contacts.some(x=>x.company_id===c.id&&isVerifiedDecisionMaker(x))&&!events.some(e=>e.company_id===c.id&&e.direction==='OUTBOUND')).forEach(c=>{const dm=contacts.find(x=>x.company_id===c.id&&isVerifiedDecisionMaker(x));list.push({id:`v-${c.id}`,rank:3,company:c,contact:dm,label:safe(c.company_name),reason:'صانع قرار موثق ولم يُسجل تواصل صادر',action:'مراجعة المسودة ثم تسجيل التواصل الفعلي',href:`/outreach?tab=ready&company_id=${c.id}`,last:lastActivity(c.id)})});
    companies.filter(c=>c.priority==='A'&&!contacts.some(x=>x.company_id===c.id&&isVerifiedDecisionMaker(x))).forEach(c=>list.push({id:`a-${c.id}`,rank:1,company:c,label:safe(c.company_name),reason:'شركة أولوية A بلا صانع قرار موثق',action:'تحديد الشخص الصحيح وتوثيق مصدره',href:`/research?tab=manual&company_id=${c.id}`,last:lastActivity(c.id)}));
    jobs.filter(j=>j.status==='manual_research_required'&&company(j.company_id)?.priority!=='A').forEach(j=>{const c=company(j.company_id),external=j.research_resolution==='PENDING_EXTERNAL_RESEARCH';list.push({id:`j-${j.id}`,rank:2,company:c,label:safe(c?.company_name)||safe(j.agent_name),reason:external?'يحتاج بحثاً خارجياً موثقاً — المعالجة الداخلية مكتملة':'قرار أو دليل ناقص يمنع تقدم الشركة',action:external?'مراجعة روابط البحث عند توفر مزود خارجي':safe(j.last_error)||'إضافة دليل موثوق أو سبب تعذر التحقق',href:`/research?tab=manual&job_id=${j.id}`,last:safe(j.updated_at)})});
    companies.filter(c=>!c.vendor_registration_url&&safe(c.vendor_registration_status)!=='Not Applicable').forEach(c=>list.push({id:`vendor-${c.id}`,rank:7,company:c,label:safe(c.company_name),reason:'حالة تسجيل الموردين تحتاج مراجعة',action:safe(c.vendor_registration_next_action)||'البحث عن بوابة الموردين الرسمية',href:`/vendor-registration?company_id=${c.id}`,last:lastActivity(c.id)}));
    jobs.filter(j=>j.status==='failed').forEach(j=>{const c=company(j.company_id);list.push({id:`failed-${j.id}`,rank:8,company:c,label:safe(c?.company_name)||safe(j.agent_name),reason:'وظيفة داخلية متوقفة وتحتاج تدخلاً',action:safe(j.last_error)||'مراجعة سبب التعطل',href:'/agent-center',last:safe(j.updated_at)})});
    opportunities.filter(o=>!['WON','LOST'].includes(safe(o.stage))&&safe(o.next_action_date)<=today).forEach(o=>list.push({id:`o-${o.id}`,rank:6,company:company(o.company_id),label:safe(o.title),reason:'إجراء فرصة مستحق',action:safe(o.next_action)||'تحديث الإجراء التالي',href:`/pipeline?opportunity_id=${o.id}`,due:safe(o.next_action_date),last:safe(o.updated_at)}));
    meetings.filter(meeting=>!['Completed','Cancelled'].includes(safe(meeting.status))&&safe(meeting.date||meeting.meeting_date||meeting.scheduled_at)).forEach(meeting=>list.push({id:`meeting-${meeting.id}`,rank:6,company:company(meeting.company_id),label:safe(meeting.title||meeting.subject||meeting.company_name)||'اجتماع قادم',reason:'اجتماع أو إجراء مجدول',action:safe(meeting.agenda)||'مراجعة جدول الاجتماع والتحضير',href:`/meetings?company_id=${safe(meeting.company_id)}`,due:safe(meeting.date||meeting.meeting_date||meeting.scheduled_at),last:safe(meeting.updated_at||meeting.created_at)}));
    const ordered=list.sort((a,b)=>a.rank-b.rank||safe(a.due).localeCompare(safe(b.due))||Number(b.company?.lead_score??0)-Number(a.company?.lead_score??0));
    const unique=new Map<string,Action>();
    ordered.forEach(item=>{const key=safe(item.company?.id)||item.id;if(!unique.has(key))unique.set(key,item)});
    return [...unique.values()].slice(0,10);
  }, [data, today]);

  const complete = async (item: Action) => { if (!item.followUp) return; await simpleCrud.update('follow_ups', item.followUp.id, { status:'Completed' }); setNotice('تم إكمال المتابعة وحفظها.'); await load(); };
  const snooze = async (item: Action) => { const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10); if(item.followUp) await simpleCrud.update('follow_ups',item.followUp.id,{date:tomorrow,due_date:tomorrow,status:'Pending'}); else if(item.company) await simpleCrud.create('follow_ups',{company_id:item.company.id,company_name:safe(item.company.company_name),follow_up_type:'General',date:tomorrow,due_date:tomorrow,status:'Pending',priority:item.company.priority==='A'?'High':'Medium',subject:item.action,next_action:item.action}); setNotice(`تم التأجيل إلى ${tomorrow}.`); await load(); };
  const hour=new Date().getHours(); const greeting=hour<12?'صباح الخير':hour<18?'مساء الخير':'مساء الخير';

  return <CRMPage title="اليوم" description={`${greeting}، هذه أهم القرارات والإجراءات التي تدفع تطوير الأعمال اليوم.`}>
    {error&&<div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error} <button className="mr-2 underline" onClick={()=>void load()}>إعادة المحاولة</button></div>}
    {notice&&<p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {([['أهم الشركات اليوم',stats.priority,'/companies?view=a'],['جاهز للتواصل',stats.ready,'/outreach?tab=ready'],['يحتاج قراراً مني',stats.needsDecision,'/daily?view=decision'],['يحتاج بحثاً خارجياً',stats.externalResearch,'/research?tab=manual'],['متابعة مستحقة',stats.due,'/follow-ups'],['بوابات موردين موثقة',stats.vendorPortals,'/vendor-registration'],['فرصة محتملة',stats.potential,'/pipeline'],['اجتماع أو إجراء قادم',stats.upcoming,'/meetings']] as const).map(([label,value,href])=><Link key={label} href={href} className="crm-kpi min-h-0 p-4 hover:-translate-y-0.5"><p className="text-xs text-[#75664d]">{label}</p><strong className="mt-1 block text-2xl">{value}</strong></Link>)}
    </section>
    <section className="crm-card overflow-hidden"><header className="flex flex-wrap items-center justify-between gap-2 border-b bg-[#faf5eb] p-4"><div><p className="text-xs font-bold text-[#9a742b]">ALGAEU COMMAND CENTER</p><h3 className="section-title">إشارات عالية القيمة</h3><p className="mt-1 text-xs text-[#75664d]">Opportunity Signal مستقل عن Lead Score ولا يظهر دون دليل محفوظ.</p></div><span className="crm-chip status-neutral">{highValueSignals.length}</span></header><div className="grid gap-3 p-3 md:grid-cols-2">{highValueSignals.map(({company,intelligence})=><article key={company.id} className="rounded-xl border bg-white p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><Link href={`/companies/${company.id}`} className="font-bold">{safe(company.company_name)}</Link><p className="mt-1 text-xs text-[#75664d]">لماذا الآن؟ {intelligence.opportunitySignal.reason}</p></div><div className="flex gap-1"><span className="crm-chip status-warning">Signal {intelligence.opportunitySignal.score}</span><span className="crm-chip status-neutral">Lead {intelligence.leadScore.score}</span></div></div><p className="mt-2 text-sm"><b>الإجراء:</b> {intelligence.nextBestAction.code} — {intelligence.nextBestAction.reason}</p><p className="mt-1 text-xs text-[#75664d]">Evidence: {intelligence.opportunitySignal.evidence.map(item=>item.label).join('، ')}</p></article>)}{!highValueSignals.length&&<div className="crm-empty md:col-span-2">لا توجد إشارات تجارية موثقة تستدعي التحرك الآن.</div>}</div></section>
    <section className="crm-card overflow-hidden"><header className="flex flex-wrap items-center justify-between gap-2 border-b bg-[#faf5eb] p-4"><div><h3 className="section-title">PILOT — TOP 20</h3><p className="mt-1 text-xs text-[#75664d]">12 شركة أولوية A وجميعها أولاً، ثم أعلى 8 شركات تالية دون تغيير تصنيفها الحقيقي.</p></div><span className="crm-chip status-warning">{pilotCompanies.length}/20</span></header>
      <div className="desktop-table overflow-x-auto"><table className="w-full min-w-[1100px] text-right text-sm"><thead><tr><th className="p-3">الشركة</th><th className="p-3">الأولوية</th><th className="p-3">Lead Score</th><th className="p-3">صانع القرار</th><th className="p-3">تحقق التواصل</th><th className="p-3">تسجيل المورد</th><th className="p-3">المسودة</th><th className="p-3">الإجراء التالي</th></tr></thead><tbody>{pilotCompanies.map(item=><tr key={item.company.id} className="border-t"><td className="p-3"><Link href={`/companies/${item.company.id}`} className="font-bold">{safe(item.company.company_name)}</Link></td><td className="p-3">{safe(item.company.priority)}</td><td className="p-3">{Number(item.company.lead_score??0)}</td><td className="p-3">{item.dm?safe(item.dm.full_name||item.dm.name):'مطلوب'}</td><td className="p-3">{item.dm?'موثق':'غير متوفر'}</td><td className="p-3">{item.vendor?'متوفر':'يحتاج مراجعة'}</td><td className="p-3">{item.draft?'جاهزة للمراجعة':'غير مرتبطة بشخص موثق'}</td><td className="p-3"><Link href={item.href} className="btn-primary">{item.status==='NEEDS DECISION MAKER'?'ابدأ البحث':item.status==='NEEDS CONTACT VERIFICATION'?'تحقق من الجهة':item.status==='NEEDS VENDOR REGISTRATION'?'راجع التسجيل':item.status==='READY FOR DRAFT'?'جهز رسالة':'راجع المسودة'}</Link></td></tr>)}</tbody></table></div>
      <div className="mobile-cards grid gap-3 p-3">{pilotCompanies.map(item=><article key={item.company.id} className="rounded-xl border bg-white p-3"><div className="flex justify-between gap-2"><Link href={`/companies/${item.company.id}`} className="font-bold">{item.rank}. {safe(item.company.company_name)}</Link><span className="crm-chip status-warning">{safe(item.company.priority)} · {Number(item.company.lead_score??0)}</span></div><p className="mt-2 text-xs">صانع القرار: {item.dm?'موثق':'مطلوب'} · المورد: {item.vendor?'متوفر':'يحتاج مراجعة'} · المسودة: {item.draft?'مراجعة':'غير جاهزة'}</p><Link href={item.href} className="btn-primary mt-3">تنفيذ الإجراء التالي</Link></article>)}</div>
      {!pilotCompanies.length&&<div className="crm-empty m-4">لم تُجهز قائمة Pilot بعد.</div>}
    </section>
    {loading?<div className="crm-empty animate-pulse">جارٍ ترتيب أولويات يومك…</div>:<section className="crm-card overflow-hidden">
      <header className="flex items-center justify-between border-b bg-[#faf5eb] p-4"><div><h3 className="section-title">الإجراءات التالية الأفضل</h3><p className="mt-1 text-xs text-[#75664d]">مرتبة حسب الاستحقاق والأولوية والدليل؛ المسودة وحدها لا تعني أنه تم التواصل.</p></div><span className="crm-chip status-neutral">{actions.length} إجراء</span></header>
      <div className="divide-y divide-[#eee3cd]">{actions.map((item,index)=><article key={item.id} className="grid gap-3 p-4 md:grid-cols-[36px_1fr_auto] md:items-center"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0e3ca] font-bold">{index+1}</span><div><div className="flex flex-wrap items-center gap-2"><Link href={item.company?`/companies/${item.company.id}`:item.href} className="font-bold hover:text-[#9a742b]">{item.label}</Link>{item.company&&<span className={`crm-chip ${item.company.priority==='A'?'status-warning':'status-neutral'}`}>أولوية {safe(item.company.priority)||'C'}</span>}</div><p className="mt-1 text-sm"><b>لماذا الآن:</b> {item.reason}</p><p className="text-sm"><b>الإجراء:</b> {item.action}</p><p className="mt-1 text-xs text-[#75664d]">الشخص: {safe(item.contact?.full_name||item.contact?.name)||'غير موثق'} · الاستحقاق: <span className="data-ltr">{item.due||today}</span> · آخر نشاط: <span className="data-ltr">{item.last||'—'}</span></p></div><div className="flex flex-wrap gap-2"><Link href={item.href} className="btn-primary">فتح</Link>{item.followUp&&<button onClick={()=>void complete(item)} className="btn-secondary">إكمال</button>}<button onClick={()=>void snooze(item)} className="btn-ghost">غداً</button></div></article>)}{!actions.length&&<div className="crm-empty m-4">لا توجد إجراءات مستحقة الآن. راجع الشركات ذات الأولوية أو الفرص النشطة.</div>}</div>
    </section>}
  </CRMPage>;
}
