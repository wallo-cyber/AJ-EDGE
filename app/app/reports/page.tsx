'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { companyOutreachState, decisionMakerCoverage } from '../../lib/domain/business';
import { simpleCrud, type SimpleRow } from '../../lib/supabase/simple-crud';

const safe=(v:unknown)=>String(v??'').trim();
const group=(rows:SimpleRow[],key:string)=>Object.entries(rows.reduce<Record<string,number>>((a,r)=>{const k=safe(r[key])||'غير محدد';a[k]=(a[k]??0)+1;return a},{})).sort((a,b)=>b[1]-a[1]);
function Breakdown({title,rows}:{title:string;rows:ReadonlyArray<readonly [string,number]>}){const max=Math.max(1,...rows.map(r=>r[1]));return <section className="crm-card p-4"><h3 className="section-title">{title}</h3><div className="mt-4 space-y-3">{rows.slice(0,8).map(([label,count])=><div key={label}><div className="mb-1 flex justify-between text-sm"><span>{label}</span><b>{count}</b></div><div className="crm-progress"><span style={{width:`${count/max*100}%`}}/></div></div>)}{!rows.length&&<div className="crm-empty">لا توجد بيانات ضمن الفلاتر.</div>}</div></section>}

export default function ReportsPage(){
 const [data,setData]=useState<Record<string,SimpleRow[]>>({}),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [priority,setPriority]=useState('الكل'),[sector,setSector]=useState('الكل'),[fromDate,setFromDate]=useState('');
 useEffect(()=>{void Promise.all(['companies','contacts','follow_ups','opportunities','messages','communication_events','agent_jobs'].map(async t=>[t,(await simpleCrud.page(t,1,t==='agent_jobs'?3000:1000)).rows] as const)).then(r=>setData(Object.fromEntries(r))).catch((e:Error)=>setError(e.message)).finally(()=>setLoading(false))},[]);
 const companies=useMemo(()=>(data.companies??[]).filter(c=>(priority==='الكل'||c.priority===priority)&&(sector==='الكل'||c.sector===sector)&&(!fromDate||safe(c.created_at).slice(0,10)>=fromDate)),[data.companies,fromDate,priority,sector]);
 const ids=new Set(companies.map(c=>c.id)); const contacts=(data.contacts??[]).filter(r=>ids.has(safe(r.company_id))), messages=(data.messages??[]).filter(r=>ids.has(safe(r.company_id))), events=(data.communication_events??[]).filter(r=>ids.has(safe(r.company_id))), opps=(data.opportunities??[]).filter(r=>ids.has(safe(r.company_id)));
 const coverage=decisionMakerCoverage(companies,contacts); const outbound=new Set(events.filter(e=>e.direction==='OUTBOUND').map(e=>e.company_id)).size, replies=new Set(events.filter(e=>e.direction==='INBOUND').map(e=>e.company_id)).size; const active=opps.filter(o=>!['WON','LOST'].includes(safe(o.stage))).length;
 const sectors=[...new Set((data.companies??[]).map(c=>safe(c.sector)).filter(Boolean))].sort();
 const exportCsv=()=>{const cell=(v:unknown)=>`"${safe(v).replaceAll('"','""')}"`;const content='\uFEFF'+[['company_name','priority','lead_score','sector','city'],...companies.map(c=>[c.company_name,c.priority,c.lead_score,c.sector,c.city])].map(r=>r.map(cell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`algaeu-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)};
 return <CRMPage title="التقارير" description="مؤشرات لاتخاذ القرار من بيانات Supabase الفعلية؛ المسودة ليست تواصلاً والرد يعتمد على حدث وارد موثق." action={<button onClick={exportCsv} className="btn-secondary">تصدير CSV</button>}>
  {error&&<p className="rounded-xl bg-red-50 p-3 text-red-700">تعذر تحميل التقارير: {error}</p>}
  <div className="crm-card grid gap-3 p-3 sm:grid-cols-3"><input type="date" aria-label="من تاريخ" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="rounded-xl border p-2"/><select value={priority} onChange={e=>setPriority(e.target.value)} className="rounded-xl border p-2"><option>الكل</option><option>A</option><option>B</option><option>C</option></select><select value={sector} onChange={e=>setSector(e.target.value)} className="rounded-xl border p-2"><option>الكل</option>{sectors.map(s=><option key={s}>{s}</option>)}</select></div>
  {loading?<div className="crm-empty animate-pulse">جارٍ إعداد مؤشرات القرار…</div>:<>
   <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["الشركات المستهدفة",companies.length,'/companies'],['تغطية صناع القرار',`${coverage.percent}%`,'/contacts?decision_maker=true'],['فرص نشطة',active,'/pipeline'],['ردود موثقة',replies,'/outreach?tab=history']].map(([l,v,h])=><Link href={String(h)} key={String(l)} className="crm-kpi hover:-translate-y-0.5"><p className="text-xs text-[#75664d]">{l}</p><strong className="mt-2 block text-3xl">{v}</strong></Link>)}</div>
   <section className="crm-card p-4"><h3 className="section-title">مسار التحويل</h3><div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-6">{[['مستهدفة',companies.length],['صانع قرار',coverage.covered],['جاهزة',companies.filter(c=>['DRAFT_READY','APPROVED'].includes(companyOutreachState(c,contacts,messages,events))).length],['تم التواصل',outbound],['ردت',replies],['فرصة',active]].map(([l,v])=><div key={String(l)} className="rounded-xl bg-[#f8f1e4] p-3 text-center"><b className="block text-xl">{v}</b><span className="text-xs text-[#75664d]">{l}</span></div>)}</div></section>
   <div className="grid gap-4 lg:grid-cols-3"><Breakdown title="حسب الأولوية" rows={group(companies,'priority')}/><Breakdown title="حسب القطاع" rows={group(companies,'sector')}/><Breakdown title="الفرص حسب المرحلة" rows={group(opps,'stage')}/></div>
  </>}
 </CRMPage>
}
