'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from './crm-shell';
import { isVerifiedDecisionMaker } from '../lib/domain/business';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

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
      const tables = ['companies','contacts','follow_ups','communication_events','opportunities','agent_jobs','messages','audit_events'];
      const rows = await Promise.all(tables.map(async (table) => [table, (await simpleCrud.page(table, 1, table === 'agent_jobs' ? 1000 : 500, { order:'created_at' })).rows] as const));
      setData(Object.fromEntries(rows));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تجهيز مركز العمل اليومي.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => {
    const companies=data.companies??[], contacts=data.contacts??[], followups=data.follow_ups??[], events=data.communication_events??[], opportunities=data.opportunities??[], jobs=data.agent_jobs??[];
    return {
      priority: companies.filter(c=>c.priority==='A').length,
      missingDecisionMaker: companies.filter(c=>!contacts.some(x=>x.company_id===c.id&&isVerifiedDecisionMaker(x))).length,
      due: followups.filter(f=>safe(f.date||f.due_date)<=today&&!['Completed','Cancelled'].includes(safe(f.status))).length,
      replies: events.filter(e=>e.direction==='INBOUND'&&safe(e.occurred_at).startsWith(today)).length,
      ready: companies.filter(c=>contacts.some(x=>x.company_id===c.id&&isVerifiedDecisionMaker(x))&&!events.some(e=>e.company_id===c.id&&e.direction==='OUTBOUND')).length,
      pipeline: opportunities.filter(o=>!['WON','LOST'].includes(safe(o.stage))).length,
      intervention: jobs.filter(j=>['failed','manual_research_required'].includes(safe(j.status))).length,
    };
  }, [data, today]);

  const actions = useMemo(() => {
    const companies=data.companies??[],contacts=data.contacts??[],followUps=data.follow_ups??[],events=data.communication_events??[],opportunities=data.opportunities??[],jobs=data.agent_jobs??[],audit=data.audit_events??[];
    const list: Action[]=[]; const company=(id:unknown)=>companies.find(c=>c.id===id);
    const lastActivity=(id:unknown)=>safe([...events.filter(e=>e.company_id===id).map(e=>e.occurred_at),...audit.filter(e=>e.company_id===id).map(e=>e.created_at)].sort().at(-1));
    followUps.filter(f=>safe(f.date||f.due_date)<=today&&!['Completed','Cancelled'].includes(safe(f.status))).forEach(f=>list.push({id:`f-${f.id}`,rank:1,company:company(f.company_id),label:safe(f.company_name||f.subject),reason:safe(f.date||f.due_date)<today?'متابعة متأخرة':'متابعة مستحقة اليوم',action:safe(f.next_action||f.subject)||'تنفيذ المتابعة',href:`/follow-ups?company_id=${safe(f.company_id)}`,due:safe(f.date||f.due_date),last:lastActivity(f.company_id),followUp:f}));
    events.filter(e=>e.direction==='INBOUND'&&!e.archived_at).forEach(e=>list.push({id:`r-${e.id}`,rank:2,company:company(e.company_id),contact:contacts.find(c=>c.id===e.contact_id),label:safe(company(e.company_id)?.company_name)||'رد وارد',reason:`رد وارد عبر ${safe(e.channel)||'قناة تواصل'}`,action:safe(e.next_action)||'مراجعة الرد وتحديد الإجراء التالي',href:`/outreach?tab=history&company_id=${safe(e.company_id)}`,due:safe(e.next_action_date),last:safe(e.occurred_at)}));
    companies.filter(c=>contacts.some(x=>x.company_id===c.id&&isVerifiedDecisionMaker(x))&&!events.some(e=>e.company_id===c.id&&e.direction==='OUTBOUND')).forEach(c=>{const dm=contacts.find(x=>x.company_id===c.id&&isVerifiedDecisionMaker(x));list.push({id:`v-${c.id}`,rank:3,company:c,contact:dm,label:safe(c.company_name),reason:'صانع قرار موثق ولم يُسجل تواصل صادر',action:'مراجعة المسودة ثم تسجيل التواصل الفعلي',href:`/outreach?tab=ready&company_id=${c.id}`,last:lastActivity(c.id)})});
    companies.filter(c=>c.priority==='A'&&!contacts.some(x=>x.company_id===c.id&&isVerifiedDecisionMaker(x))).forEach(c=>list.push({id:`a-${c.id}`,rank:4,company:c,label:safe(c.company_name),reason:'شركة أولوية A بلا صانع قرار موثق',action:'تحديد الشخص الصحيح وتوثيق مصدره',href:`/research?tab=manual&company_id=${c.id}`,last:lastActivity(c.id)}));
    jobs.filter(j=>j.status==='manual_research_required').forEach(j=>{const c=company(j.company_id);list.push({id:`j-${j.id}`,rank:5,company:c,label:safe(c?.company_name)||safe(j.agent_name),reason:'تحتاج تدخلاً بشرياً',action:safe(j.last_error)||'إضافة دليل موثوق أو سبب تعذر التحقق',href:`/research?tab=manual&job_id=${j.id}`,last:safe(j.updated_at)})});
    opportunities.filter(o=>!['WON','LOST'].includes(safe(o.stage))&&safe(o.next_action_date)<=today).forEach(o=>list.push({id:`o-${o.id}`,rank:6,company:company(o.company_id),label:safe(o.title),reason:'إجراء فرصة مستحق',action:safe(o.next_action)||'تحديث الإجراء التالي',href:`/pipeline?opportunity_id=${o.id}`,due:safe(o.next_action_date),last:safe(o.updated_at)}));
    return list.sort((a,b)=>a.rank-b.rank||safe(a.due).localeCompare(safe(b.due))||Number(b.company?.lead_score??0)-Number(a.company?.lead_score??0)).slice(0,20);
  }, [data, today]);

  const complete = async (item: Action) => { if (!item.followUp) return; await simpleCrud.update('follow_ups', item.followUp.id, { status:'Completed' }); setNotice('تم إكمال المتابعة وحفظها.'); await load(); };
  const snooze = async (item: Action) => { const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10); if(item.followUp) await simpleCrud.update('follow_ups',item.followUp.id,{date:tomorrow,due_date:tomorrow,status:'Pending'}); else if(item.company) await simpleCrud.create('follow_ups',{company_id:item.company.id,company_name:safe(item.company.company_name),follow_up_type:'General',date:tomorrow,due_date:tomorrow,status:'Pending',priority:item.company.priority==='A'?'High':'Medium',subject:item.action,next_action:item.action}); setNotice(`تم التأجيل إلى ${tomorrow}.`); await load(); };
  const hour=new Date().getHours(); const greeting=hour<12?'صباح الخير':hour<18?'مساء الخير':'مساء الخير';

  return <CRMPage title="اليوم" description={`${greeting}، هذه أهم القرارات والإجراءات التي تدفع تطوير الأعمال اليوم.`}>
    {error&&<div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error} <button className="mr-2 underline" onClick={()=>void load()}>إعادة المحاولة</button></div>}
    {notice&&<p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
      {([['أولوية A تحتاج إجراء',stats.priority,'/companies?view=a'],['بدون صانع قرار',stats.missingDecisionMaker,'/companies?view=missing-dm'],['جاهزة للتواصل',stats.ready,'/outreach?tab=ready'],['متابعات اليوم',stats.due,'/follow-ups'],['ردود جديدة',stats.replies,'/outreach?tab=history'],['فرص نشطة',stats.pipeline,'/pipeline'],['بحث يدوي متراكم',stats.intervention,'/research?tab=manual']] as const).map(([label,value,href])=><Link key={label} href={href} className="crm-kpi min-h-0 p-4 hover:-translate-y-0.5"><p className="text-xs text-[#75664d]">{label}</p><strong className="mt-1 block text-2xl">{value}</strong></Link>)}
    </section>
    {loading?<div className="crm-empty animate-pulse">جارٍ ترتيب أولويات يومك…</div>:<section className="crm-card overflow-hidden">
      <header className="flex items-center justify-between border-b bg-[#faf5eb] p-4"><div><h3 className="section-title">الإجراءات التالية الأفضل</h3><p className="mt-1 text-xs text-[#75664d]">مرتبة حسب الاستحقاق والأولوية والدليل؛ المسودة وحدها لا تعني أنه تم التواصل.</p></div><span className="crm-chip status-neutral">{actions.length} إجراء</span></header>
      <div className="divide-y divide-[#eee3cd]">{actions.map((item,index)=><article key={item.id} className="grid gap-3 p-4 md:grid-cols-[36px_1fr_auto] md:items-center"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0e3ca] font-bold">{index+1}</span><div><div className="flex flex-wrap items-center gap-2"><Link href={item.company?`/companies/${item.company.id}`:item.href} className="font-bold hover:text-[#9a742b]">{item.label}</Link>{item.company&&<span className={`crm-chip ${item.company.priority==='A'?'status-warning':'status-neutral'}`}>أولوية {safe(item.company.priority)||'C'}</span>}</div><p className="mt-1 text-sm"><b>لماذا الآن:</b> {item.reason}</p><p className="text-sm"><b>الإجراء:</b> {item.action}</p><p className="mt-1 text-xs text-[#75664d]">الشخص: {safe(item.contact?.full_name||item.contact?.name)||'غير موثق'} · الاستحقاق: <span className="data-ltr">{item.due||today}</span> · آخر نشاط: <span className="data-ltr">{item.last||'—'}</span></p></div><div className="flex flex-wrap gap-2"><Link href={item.href} className="btn-primary">فتح</Link>{item.followUp&&<button onClick={()=>void complete(item)} className="btn-secondary">إكمال</button>}<button onClick={()=>void snooze(item)} className="btn-ghost">غداً</button></div></article>)}{!actions.length&&<div className="crm-empty m-4">لا توجد إجراءات مستحقة الآن. راجع الشركات ذات الأولوية أو الفرص النشطة.</div>}</div>
    </section>}
  </CRMPage>;
}
