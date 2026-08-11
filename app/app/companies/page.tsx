'use client';
/* eslint-disable @next/next/no-location-assign-relative-destination */
export const dynamic='force-dynamic';
import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { CompanyActions } from '../../components/company-actions';
import { CompanyForm } from '../../components/company-form';
import { CRMPage } from '../../components/crm-shell';
import type { Company } from '../../lib/company-store';
import { companyOutreachState,isVerifiedDecisionMaker,type OutreachState } from '../../lib/domain/business';
import { supabaseCrm } from '../../lib/supabase/crm';
import { simpleCrud,type SimpleRow } from '../../lib/supabase/simple-crud';

const safe=(v:unknown)=>String(v??'').trim();
const stateLabel:Record<OutreachState,string>={CHANNEL_AVAILABLE:'قناة عامة فقط',CONTACT_NEEDED:'لم يتم العثور على الشخص الصحيح',DECISION_MAKER_VERIFIED:'صانع قرار موثق',DRAFT_READY:'مسودة جاهزة',APPROVED:'مسودة معتمدة',CONTACTED:'تم التواصل',REPLIED:'ورد رد'};
type View='all'|'a'|'missing-dm'|'ready'|'followup'|'opportunity';

export default function CompaniesPage(){
 const [companies,setCompanies]=useState<Company[]>([]),[related,setRelated]=useState<Record<string,SimpleRow[]>>({});
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [query,setQuery]=useState(''),[segment,setSegment]=useState(''),[view,setView]=useState<View>('all'),[page,setPage]=useState(1),[editing,setEditing]=useState<Company|null>(null),[formOpen,setFormOpen]=useState(false);
 const load=async()=>{setLoading(true);setError('');try{const [rows,contacts,messages,events,followups,opps]=await Promise.all([supabaseCrm.companies.list(),simpleCrud.page('contacts',1,1000),simpleCrud.page('messages',1,1500),simpleCrud.page('communication_events',1,1500),simpleCrud.page('follow_ups',1,1000),simpleCrud.page('opportunities',1,1000)]);setCompanies(rows as Company[]);setRelated({contacts:contacts.rows,messages:messages.rows,events:events.rows,followups:followups.rows,opps:opps.rows})}catch(e){setError(e instanceof Error?e.message:'تعذر تحميل الشركات.')}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]); useEffect(()=>setPage(1),[query,view]);
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const requested=params.get('view') as View|null;if(requested&&['all','a','missing-dm','ready','followup','opportunity'].includes(requested))setView(requested);setSegment(params.get('segment')??'')},[]);
 useEffect(()=>{
   if(!companies.length)return;
   const editId=new URLSearchParams(window.location.search).get('edit');
   if(!editId)return;
   const target=companies.find(c=>c.id===editId);
   if(target){
     setEditing(target);
     setFormOpen(true);
   }
 },[companies]);
 const states=useMemo(()=>new Map(companies.map(c=>[c.id,companyOutreachState({id:c.id,general_email:c.generalEmail,general_phone:c.generalPhone},related.contacts??[],related.messages??[],related.events??[])])),[companies,related]);
 const filtered=useMemo(()=>companies.filter(c=>!c.archivedAt).filter(c=>`${c.companyName} ${c.sector} ${c.city}`.toLowerCase().includes(query.toLowerCase())).filter(c=>{const meta=c as unknown as Record<string,unknown>;const text=`${meta.companyType??''} ${meta.businessType??''} ${meta.targetSegment??''} ${c.sector??''}`.toLowerCase();return !segment||text.includes(segment)}).filter(c=>{const dm=(related.contacts??[]).some(x=>x.company_id===c.id&&isVerifiedDecisionMaker(x)),state=states.get(c.id);if(view==='a')return c.priority==='A';if(view==='missing-dm')return !dm;if(view==='ready')return ['DECISION_MAKER_VERIFIED','DRAFT_READY','APPROVED'].includes(state??'');if(view==='followup')return (related.followups??[]).some(x=>x.company_id===c.id&&!['Completed','Cancelled'].includes(safe(x.status)));if(view==='opportunity')return (related.opps??[]).some(x=>x.company_id===c.id&&!['WON','LOST'].includes(safe(x.stage)));return true}).sort((a,b)=>(a.priority??'C').localeCompare(b.priority??'C')-(0)||(b.leadScore??0)-(a.leadScore??0)),[companies,query,related,states,view,segment]);
 const visible=filtered.slice((page-1)*25,page*25),pages=Math.max(1,Math.ceil(filtered.length/25));
 const save=async(c:Company)=>{try{if(editing){const overrideFields=(['priority','businessAngle','recommendedRole','recommendedLanguage','recommendedChannel','recommendedMessageStyle','nextAction','relationshipStage','doNotContact'] as const).filter(field=>editing[field]!==c[field]);const row=await supabaseCrm.companies.update(editing.id,{...c,humanOverride:overrideFields.length>0||c.humanOverride});if(overrideFields.length)await simpleCrud.create('audit_events',{company_id:editing.id,entity_type:'companies',entity_id:editing.id,action:'HUMAN_OVERRIDE',details:{fields:overrideFields,before:Object.fromEntries(overrideFields.map(field=>[field,editing[field]??null])),after:Object.fromEntries(overrideFields.map(field=>[field,c[field]??null]))}});setCompanies(items=>items.map(x=>x.id===editing.id?row as Company:x))}else{const row=await supabaseCrm.companies.create({...c,communicationHistory:[],followUps:[],opportunities:[]});setCompanies(items=>[row as Company,...items])}setFormOpen(false);setEditing(null);setNotice('تم حفظ الشركة بنجاح.')}catch(e){setError(e instanceof Error?e.message:'تعذر حفظ الشركة.')}};
 const archive=async(c:Company)=>{if(!window.confirm('أرشفة الشركة مع الاحتفاظ بجميع بياناتها؟'))return;const row=await supabaseCrm.companies.update(c.id,{...c,archivedAt:new Date().toISOString()});setCompanies(items=>items.map(x=>x.id===c.id?row as Company:x));setNotice('تمت الأرشفة دون حذف البيانات.')};
 return <CRMPage title="الشركات" description="قائمة عمل مختصرة تقود من الشركة إلى الشخص الصحيح ثم الإجراء التالي." action={<button onClick={()=>{setEditing(null);setFormOpen(true)}} className="btn-primary">إضافة شركة</button>}>
  {error&&<div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}<button onClick={()=>void load()} className="mr-2 underline">إعادة المحاولة</button></div>}{notice&&<p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
  <div className="crm-card p-3"><div className="flex gap-2 overflow-x-auto pb-2">{([['all','كل الشركات'],['a','أولوية A'],['missing-dm','ينقصها صانع قرار'],['ready','جاهزة للتواصل'],['followup','تحتاج متابعة'],['opportunity','فرص مفتوحة']] as [View,string][]).map(([id,label])=><button key={id} onClick={()=>setView(id)} className={view===id?'btn-primary shrink-0':'btn-ghost shrink-0'}>{label}</button>)}</div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث باسم الشركة أو القطاع أو المدينة" className="mt-2 w-full rounded-xl border p-2.5"/></div>
  {formOpen&&<CompanyForm initialCompany={editing??undefined} submitLabel={editing?'حفظ التعديلات':'إضافة الشركة'} onSubmit={save} onCancel={()=>{setFormOpen(false);setEditing(null)}}/>}
  {loading?<div className="crm-empty animate-pulse">جارٍ تحميل الشركات…</div>:<>
   <div className="desktop-table overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[940px] text-right text-sm"><thead><tr className="text-[#795d28]"><th className="p-3">الشركة</th><th className="p-3">الأولوية</th><th className="p-3">Lead Score</th><th className="p-3">القطاع</th><th className="p-3">المدينة</th><th className="p-3">صانع القرار</th><th className="p-3">حالة التواصل</th><th className="p-3">الإجراء التالي</th></tr></thead><tbody>{visible.map(c=>{const dm=(related.contacts??[]).find(x=>x.company_id===c.id&&isVerifiedDecisionMaker(x)),state=states.get(c.id)??'CONTACT_NEEDED';return <tr key={c.id} className="cursor-pointer border-t" onClick={()=>location.assign(`/companies/${c.id}`)}><td className="max-w-64 p-3 font-bold"><span className="line-clamp-2">{c.companyName}</span></td><td className="p-3"><span className="crm-chip status-warning">أولوية {c.priority||'C'}</span></td><td className="p-3">{c.leadScore??0}</td><td className="p-3">{c.sector||'—'}</td><td className="p-3">{c.city||'—'}</td><td className="p-3">{safe(dm?.full_name||dm?.name)||'مطلوب'}</td><td className="p-3"><span className="crm-chip status-neutral">{stateLabel[state]}</span></td><td className="max-w-64 p-3">{c.nextAction||'استكمال الملف'}</td></tr>})}</tbody></table></div>
   <div className="mobile-cards grid gap-3">{visible.map(c=><article key={c.id} className="crm-card p-4"><Link href={`/companies/${c.id}`} className="flex items-start justify-between"><div><strong>{c.companyName}</strong><p className="text-xs text-[#75664d]">{c.sector||'قطاع غير محدد'} · {c.city||'مدينة غير محددة'}</p></div><span className="crm-chip status-warning">أولوية {c.priority||'C'}</span></Link><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><p>Lead Score: <b>{c.leadScore??0}</b></p><p>الاكتمال: <b>{c.dataCompleteness??0}%</b></p></div><p className="mt-3 text-sm"><b>التواصل:</b> {stateLabel[states.get(c.id)??'CONTACT_NEEDED']}</p><p className="text-sm"><b>التالي:</b> {c.nextAction||'استكمال الملف'}</p><div className="mt-3"><CompanyActions companyId={c.id} archived={Boolean(c.archivedAt)} onEdit={()=>{setEditing(c);setFormOpen(true)}} onArchive={()=>void archive(c)}/></div></article>)}</div>
   {!visible.length&&<div className="crm-empty">لا توجد شركات مطابقة. غيّر العرض المحفوظ أو البحث.</div>}
   <div className="flex items-center justify-between text-sm"><span>{filtered.length} شركة · صفحة {page} من {pages}</span><div className="flex gap-2"><button className="btn-ghost" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>السابق</button><button className="btn-ghost" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>التالي</button></div></div>
  </>}
 </CRMPage>
}
