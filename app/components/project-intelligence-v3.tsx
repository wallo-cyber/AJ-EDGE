'use client';
import Link from'next/link';
import {useEffect,useMemo,useState}from'react';
import {CRMPage}from'./crm-shell';
import {simpleCrud,type SimpleRow}from'../lib/supabase/simple-crud';
import {lifecyclePhase}from'../lib/acquisition-v3/core';
import {projectCommercialScore,type ProjectEntity,type ProjectPackage,type AccessPath,type ProjectFact}from'../lib/project-capture/core';

const s=(v:unknown)=>String(v??'').trim();
const n=(v:unknown)=>Number(v||0)||0;
const money=(v:unknown)=>n(v)?new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(n(v)):'—';

export function ProjectIntelligenceV3(){
 const[data,setData]=useState<Record<string,SimpleRow[]>>({}),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const[query,setQuery]=useState(''),[city,setCity]=useState('ALL'),[phase,setPhase]=useState('ALL'),[route,setRoute]=useState('ALL'),[minScore,setMinScore]=useState(0);
 useEffect(()=>{void(async()=>{try{const specs:[string,number,string][]=[['projects',1000,'updated_at'],['project_updates',3000,'occurred_at'],['project_entities',3000,'updated_at'],['project_packages',3000,'updated_at'],['project_access_paths',3000,'updated_at'],['bid_board_items',2000,'due_at'],['companies',2000,'company_name']];const rows=await Promise.all(specs.map(async([t,z,o])=>[t,(await simpleCrud.page(t,1,z,{order:o})).rows]as const));setData(Object.fromEntries(rows))}catch(e){setError(e instanceof Error?e.message:'تعذر تحميل Project Intelligence.')}finally{setLoading(false)}})()},[]);
 const projects=data.projects??[],updates=data.project_updates??[],entities=data.project_entities??[],packages=data.project_packages??[],paths=data.project_access_paths??[],bids=data.bid_board_items??[],companies=data.companies??[];
 const companyById=useMemo(()=>new Map(companies.map(c=>[s(c.id),c])),[companies]);
 const enriched=useMemo(()=>projects.map(project=>{const pe=entities.filter(x=>x.project_id===project.id),pp=packages.filter(x=>x.project_id===project.id),pa=paths.filter(x=>x.project_id===project.id),pu=updates.filter(x=>x.project_id===project.id),pb=bids.filter(x=>x.project_id===project.id);return{project,phase:lifecyclePhase(project,pu,pb),score:projectCommercialScore(project as unknown as ProjectFact,pe as unknown as ProjectEntity[],pp as unknown as ProjectPackage[],pa as unknown as AccessPath[]),updates:pu,packages:pp,entities:pe,bids:pb}}),[projects,updates,entities,packages,paths,bids]);
 const cities=useMemo(()=>Array.from(new Set(projects.map(x=>s(x.city)).filter(Boolean))).sort(),[projects]);
 const rows=useMemo(()=>enriched.filter(x=>{const q=query.toLowerCase(),owner=companyById.get(s(x.project.owner_company_id));return(!q||`${s(x.project.project_name)} ${s(owner?.company_name)} ${s(x.project.sector)} ${s(x.project.city)}`.toLowerCase().includes(q))&&(city==='ALL'||s(x.project.city)===city)&&(phase==='ALL'||x.phase===phase)&&(route==='ALL'||s(x.project.route_to_revenue)===route)&&x.score>=minScore}).sort((a,b)=>b.score-a.score),[enriched,query,city,phase,route,minScore,companyById]);
 return <CRMPage title="Project Intelligence" description="رؤية مبكرة للمشاريع من التخطيط والتصميم حتى الطرح والترسية، مع الأطراف والحزم والملاءمة في شاشة واحدة.">
  {error&&<div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
  <section className="crm-card p-4"><div className="grid gap-3 lg:grid-cols-5">
   <label className="text-xs lg:col-span-2">بحث مشروع / مالك / قطاع<input value={query} onChange={e=>setQuery(e.target.value)} className="mt-1 w-full rounded-xl border p-2" placeholder="ابحث..."/></label>
   <label className="text-xs">المدينة<select value={city} onChange={e=>setCity(e.target.value)} className="mt-1 w-full rounded-xl border p-2"><option value="ALL">كل المدن</option>{cities.map(x=><option key={x}>{x}</option>)}</select></label>
   <label className="text-xs">Lifecycle<select value={phase} onChange={e=>setPhase(e.target.value)} className="mt-1 w-full rounded-xl border p-2"><option value="ALL">كل المراحل</option><option>EARLY_PLANNING</option><option>DESIGN</option><option>PRECONSTRUCTION</option><option>BIDDING</option><option>AWARDED</option></select></label>
   <label className="text-xs">حد Capture Score<input type="number" min="0" max="100" value={minScore} onChange={e=>setMinScore(Number(e.target.value))} className="mt-1 w-full rounded-xl border p-2"/></label>
  </div></section>
  <section className="grid gap-3 md:grid-cols-5">{['EARLY_PLANNING','DESIGN','PRECONSTRUCTION','BIDDING','AWARDED'].map(ph=><div className="crm-kpi" key={ph}><span>{ph}</span><b className="mt-2 block text-3xl">{enriched.filter(x=>x.phase===ph).length}</b></div>)}</section>
  {loading?<div className="crm-empty">جارٍ بناء Project Intelligence…</div>:<div className="grid gap-3">{rows.map(x=>{const owner=companyById.get(s(x.project.owner_company_id));const last=[...x.updates].sort((a,b)=>s(b.occurred_at).localeCompare(s(a.occurred_at)))[0];return <Link href={`/projects/${x.project.id}`} className="crm-card p-4" key={x.project.id}><div className="grid gap-4 lg:grid-cols-[1.5fr_.6fr_.7fr_.7fr_.8fr] lg:items-center"><div><div className="flex flex-wrap gap-2"><span className="crm-chip status-neutral">{x.phase}</span><span className={`crm-chip ${s(x.project.verification_status)==='verified'?'status-success':'status-warning'}`}>{s(x.project.verification_status)||'needs_research'}</span></div><h3 className="mt-2 text-lg font-bold">{s(x.project.project_name)}</h3><p className="mt-1 text-xs text-[#8f96a3]">{s(owner?.company_name)||'المالك غير محدد'} · {s(x.project.city)||'الموقع غير محدد'} · {s(x.project.sector)||'القطاع غير محدد'}</p>{last&&<p className="mt-2 text-sm"><b>آخر تحديث:</b> {s(last.title)}</p>}</div><div><span className="text-xs text-[#8f96a3]">Capture</span><b className="block text-3xl">{x.score}</b></div><div><span className="text-xs text-[#8f96a3]">قيمة المشروع</span><b className="block">{money(x.project.estimated_value)} {s(x.project.currency)||'SAR'}</b></div><div><span className="text-xs text-[#8f96a3]">الأطراف</span><b className="block">{x.entities.length}</b><small>{x.packages.length} حزم</small></div><div><span className="text-xs text-[#8f96a3]">Route</span><b className="block text-sm">{s(x.project.route_to_revenue)||'UNDEFINED'}</b><small>{x.bids.length} Bid items</small></div></div></Link>})}{!rows.length&&<div className="crm-empty">لا توجد مشاريع مطابقة للفلاتر.</div>}</div>}
 </CRMPage>
}
