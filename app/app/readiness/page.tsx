'use client';
import {useEffect,useMemo,useState,type ChangeEvent} from'react';
import {CRMPage} from'../../components/crm-shell';
import {simpleCrud,type SimpleRow} from'../../lib/supabase/simple-crud';
import {uploadCompanyDocument,openCompanyDocument,deleteCompanyDocumentFile,validateCompanyDocument,MB} from'../../lib/supabase/company-documents';
import {SEED_ITEMS,SEED_GATEWAYS,GROUP_LABELS,readinessScore,groupScore,gatewayState,nextReadinessAction,expiringSoon,type ReadinessItem,type Gateway} from'../../lib/readiness/core';

const safe=(v:unknown)=>String(v??'').trim();
const DOC_TYPES:Record<string,string>={
 cr:'CR',act:'CONTRACTING_ACTIVITY',zakat:'ZAKAT',gosi:'GOSI',sca:'SCA',grade:'CONTRACTOR_CLASSIFICATION',
 iso9:'ISO9001',iso14:'ISO14001',iso45:'ISO45001',hse:'HSE_PLAN',safe:'SAFETY_OFFICER',equip:'EQUIPMENT_LIST',
 fin:'FINANCIALS',bank:'BANK_FACILITY',bond:'BOND_CAPABILITY',proj:'PROJECT_PROOF',perf:'PERFORMANCE_CERTIFICATE',
 cv:'KEY_CVS',prof:'COMPANY_PROFILE',value:'VALUE_PROPOSITION'
};
const day=(v:unknown)=>safe(v).slice(0,10);
const daysUntil=(v:unknown)=>{const d=day(v);if(!d)return null;return Math.ceil((new Date(`${d}T00:00:00`).getTime()-Date.now())/86400000)};
const expiryLabel=(v:unknown)=>{const n=daysUntil(v);if(n===null)return null;if(n<0)return{label:`منتهي منذ ${Math.abs(n)} يوم`,cls:'status-danger'};if(n<=60)return{label:`تجديد خلال ${n} يوم`,cls:'status-warning'};return{label:`ساري · ${n} يوم`,cls:'status-success'}};

export default function ReadinessPage(){
 const[items,setItems]=useState<SimpleRow[]>([]),[gateways,setGateways]=useState<SimpleRow[]>([]),[docs,setDocs]=useState<SimpleRow[]>([]);
 const[loading,setLoading]=useState(true),[notice,setNotice]=useState(''),[error,setError]=useState(''),[uploading,setUploading]=useState(false);
 const[file,setFile]=useState<File|null>(null),[itemKey,setItemKey]=useState('prof'),[issuedAt,setIssuedAt]=useState(''),[expiresAt,setExpiresAt]=useState(''),[notes,setNotes]=useState('');
 const load=async()=>{setLoading(true);setError('');try{const[a,b,c]=await Promise.all([
   simpleCrud.page('readiness_items',1,200,{order:'item_key',ascending:true}),
   simpleCrud.page('qualification_gateways',1,100,{order:'gateway_key',ascending:true}),
   simpleCrud.page('company_documents',1,500,{order:'created_at',ascending:false})
 ]);setItems(a.rows);setGateways(b.rows);setDocs(c.rows)}catch(e){setError(e instanceof Error?e.message:'تعذر تحميل ملف الجاهزية.')}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 const seed=async()=>{setNotice('');if(!items.length)for(const i of SEED_ITEMS)await simpleCrud.create('readiness_items',{...i,status:'MISSING'});if(!gateways.length)for(const g of SEED_GATEWAYS)await simpleCrud.create('qualification_gateways',{...g,status:'NOT_STARTED'});setNotice('تم إنشاء نموذج الجاهزية. كل العناصر تبدأ MISSING ولا توجد شهادة مفترضة.');await load()};
 const typed=items as unknown as ReadinessItem[],gtyped=gateways as unknown as Gateway[];
 const score=readinessScore(typed),next=nextReadinessAction(typed,gtyped),groups=['REGULATORY','TECHNICAL','FINANCIAL','PROOF','MARKETING'] as const;
 const verifiedDocs=docs.filter(d=>safe(d.verification_status)==='VERIFIED'&&d.current_version!==false);
 const reviewDocs=docs.filter(d=>safe(d.verification_status)==='NEEDS_REVIEW');
 const expiringDocs=verifiedDocs.filter(d=>{const n=daysUntil(d.expires_at);return n!==null&&n<=60});
 const missing=items.filter(i=>safe(i.status)!=='COMPLETE');
 const coverage=new Map<string,SimpleRow>();verifiedDocs.forEach(d=>{if(safe(d.readiness_item_key)&&!coverage.has(safe(d.readiness_item_key)))coverage.set(safe(d.readiness_item_key),d)});
 const selectedSeed=SEED_ITEMS.find(i=>i.item_key===itemKey);
 const submit=async()=>{
   if(!file){setError('اختر مستنداً أولاً.');return}
   setUploading(true);setError('');setNotice('');
   try{
     validateCompanyDocument(file,itemKey);
     const path=await uploadCompanyDocument(file,itemKey);
     await simpleCrud.create('company_documents',{readiness_item_key:itemKey,document_type:DOC_TYPES[itemKey]||'OTHER',file_name:file.name,storage_path:path,mime_type:file.type,file_size:file.size,issued_at:issuedAt||null,expires_at:expiresAt||null,verification_status:'NEEDS_REVIEW',current_version:true,notes});
     setFile(null);setIssuedAt('');setExpiresAt('');setNotes('');
     const input=document.getElementById('company-doc-upload') as HTMLInputElement|null;if(input)input.value='';
     setNotice('تم رفع المستند بأمان. بقيت حالته "يحتاج مراجعة" ولن يرفع درجة الجاهزية قبل اعتمادك.');
     await load();
   }catch(e){setError(e instanceof Error?e.message:'تعذر رفع المستند.')}finally{setUploading(false)}
 };
 const verify=async(d:SimpleRow)=>{
   setError('');const key=safe(d.readiness_item_key),item=items.find(i=>safe(i.item_key)===key);
   try{
     for(const old of docs.filter(x=>x.id!==d.id&&safe(x.readiness_item_key)===key&&x.current_version!==false&&safe(x.verification_status)==='VERIFIED'))await simpleCrud.update('company_documents',old.id,{current_version:false});
     await simpleCrud.update('company_documents',d.id,{verification_status:'VERIFIED',current_version:true});
     if(item)await simpleCrud.update('readiness_items',item.id,{status:'COMPLETE',document_url:safe(d.storage_path),issued_at:day(d.issued_at)||null,expires_at:day(d.expires_at)||null,notes:safe(d.notes)});
     setNotice(`تم اعتماد ${safe(d.file_name)} وربطه ببند ${selectedLabel(key)}.`);
     await load();
   }catch(e){setError(e instanceof Error?e.message:'تعذر اعتماد المستند.')}
 };
 const reject=async(d:SimpleRow)=>{try{await simpleCrud.update('company_documents',d.id,{verification_status:'REJECTED',current_version:false});setNotice('تم رفض المستند ولن يدخل في الجاهزية.');await load()}catch(e){setError(e instanceof Error?e.message:'تعذر رفض المستند.')}};
 const remove=async(d:SimpleRow)=>{if(!confirm('حذف الملف وسجله نهائياً؟'))return;try{await deleteCompanyDocumentFile(safe(d.storage_path));await simpleCrud.remove('company_documents',d.id);setNotice('تم حذف المستند. راجع حالة بند الجاهزية إذا كان هذا آخر مستند معتمد له.');await load()}catch(e){setError(e instanceof Error?e.message:'تعذر حذف المستند.')}};
 function selectedLabel(key:string){return SEED_ITEMS.find(i=>i.item_key===key)?.label||key}
 return <CRMPage title="Market Readiness" description="المستندات الفعلية ← النواقص ← نسبة الجاهزية ← التجديدات. الرفع لا يعني الاعتماد؛ كل مستند يحتاج مراجعة بشرية قبل احتسابه.">
 {error&&<div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
 {notice&&<div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
 {!loading&&!items.length?<div className="crm-card p-6"><h3 className="font-bold">لم يتم إعداد ملف الجاهزية بعد</h3><p className="mt-2 text-sm text-[#75664d]">سيتم إنشاء 20 بنداً و10 بوابات، كلها MISSING. بعدها ترفع مستندات الشركة والبروفايل وتربطها بالبند المناسب.</p><button onClick={()=>void seed()} className="btn-primary mt-4">إنشاء ملف الجاهزية</button></div>:<>
 <div className="grid gap-3 md:grid-cols-5">
  <div className="crm-kpi"><span>الجاهزية</span><b className="mt-2 block text-3xl">{score}%</b></div>
  <div className="crm-kpi"><span>المكتمل</span><b className="mt-2 block text-3xl">{items.length-missing.length}/{items.length}</b></div>
  <div className="crm-kpi"><span>المستندات المعتمدة</span><b className="mt-2 block text-3xl">{verifiedDocs.length}</b></div>
  <div className="crm-kpi"><span>بانتظار المراجعة</span><b className="mt-2 block text-3xl">{reviewDocs.length}</b></div>
  <div className="crm-kpi"><span>تجديد ≤ 60 يوم</span><b className="mt-2 block text-3xl">{expiringDocs.length}</b></div>
 </div>

 {next&&<div className="crm-card border-2 border-[#14554a] p-5"><p className="text-xs font-bold text-[#14554a]">NEXT READINESS ACTION</p><h3 className="mt-1 text-xl font-bold">{next.item.label}</h3><p className="mt-2 text-sm text-[#75664d]">يفتح {next.unlocks} بوابة فوراً ويقرّب {next.nears} بوابة. ارفع المستند إن كان موجودًا، أو ابدأ استكماله إن كان مفقودًا.</p></div>}

 <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
  <section className="crm-card p-5">
   <h3 className="font-bold">رفع مستند أو بروفايل الشركة</h3>
   <p className="mt-1 text-xs leading-6 text-[#75664d]">PDF حتى 100MB · البروفايل PDF حتى 150MB · Word/Excel حتى 50MB · JPG/PNG/WEBP حتى 30MB. الملفات محفوظة في Bucket خاص وغير عام.</p>
   <div className="mt-4 grid gap-3">
    <label className="text-sm font-bold">المستند يغطي أي متطلب؟<select value={itemKey} onChange={e=>setItemKey(e.target.value)} className="mt-1 w-full rounded-xl border p-2">{SEED_ITEMS.map(i=><option value={i.item_key} key={i.item_key}>{i.label}</option>)}</select></label>
    <input id="company-doc-upload" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" onChange={(e:ChangeEvent<HTMLInputElement>)=>{const nextFile=e.target.files?.[0]??null;if(!nextFile){setFile(null);return}try{validateCompanyDocument(nextFile,itemKey);setError('');setFile(nextFile)}catch(err){setFile(null);e.target.value='';setError(err instanceof Error?err.message:'ملف غير صالح')}}} className="rounded-xl border p-2"/>
    {file&&<div className="rounded-xl bg-[#f7f1e5] p-3 text-xs"><b>{file.name}</b><span className="mr-2 text-[#75664d]">{(file.size/MB).toFixed(1)} MB</span></div>}
    <div className="grid gap-3 md:grid-cols-2"><label className="text-xs">تاريخ الإصدار<input type="date" value={issuedAt} onChange={e=>setIssuedAt(e.target.value)} className="mt-1 w-full rounded-xl border p-2"/></label><label className="text-xs">تاريخ الانتهاء<input type="date" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} className="mt-1 w-full rounded-xl border p-2"/></label></div>
    <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="ملاحظات: رقم الشهادة، الجهة المصدرة، نطاق الاعتماد..." className="min-h-24 rounded-xl border p-2"/>
    <button disabled={!file||uploading} onClick={()=>void submit()} className="btn-primary disabled:opacity-40">{uploading?'جارٍ الرفع…':`رفع ${selectedSeed?.label||'المستند'} للمراجعة`}</button>
   </div>
  </section>

  <section className="crm-card p-5">
   <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">ما الذي ينقصنا؟</h3><p className="text-xs text-[#75664d]">المكتمل يعتمد على عناصر الجاهزية المعتمدة، وليس مجرد وجود ملف.</p></div><span className="crm-chip status-warning">{missing.length} بند ناقص/قيد الإنجاز</span></div>
   <div className="mt-3 grid gap-2 md:grid-cols-2">{missing.map(i=><div className="rounded-xl border p-3" key={i.id}><div className="flex justify-between gap-2"><b>{safe(i.label)}</b><span className={`crm-chip ${safe(i.status)==='IN_PROGRESS'?'status-warning':'status-neutral'}`}>{safe(i.status)}</span></div><p className="mt-1 text-xs text-[#75664d]">{GROUP_LABELS[safe(i.item_group) as keyof typeof GROUP_LABELS]} · وزن {Number(i.weight||0)}</p></div>)}</div>
  </section>
 </div>

 {reviewDocs.length>0&&<section className="crm-card p-5"><h3 className="font-bold">مستندات تحتاج اعتمادك</h3><p className="mt-1 text-xs text-[#75664d]">افتح الملف وتأكد من أنه يثبت المتطلب والتواريخ قبل اعتماد COMPLETE.</p><div className="mt-4 space-y-2">{reviewDocs.map(d=><div className="rounded-xl border p-3" key={d.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><b>{safe(d.file_name)}</b><p className="mt-1 text-xs text-[#75664d]">{selectedLabel(safe(d.readiness_item_key))}{day(d.expires_at)?` · ينتهي ${day(d.expires_at)}`:''}</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>void openCompanyDocument(safe(d.storage_path))} className="btn-ghost">فتح</button><button onClick={()=>void verify(d)} className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white">اعتماد</button><button onClick={()=>void reject(d)} className="rounded-xl bg-red-700 px-3 py-2 text-sm font-bold text-white">رفض</button></div></div></div>)}</div></section>}

 <section className="crm-card p-5">
  <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">مكتبة مستندات الشركة</h3><p className="text-xs text-[#75664d]">النسخ الحالية المعتمدة، التواريخ، وحالة التجديد.</p></div><span className="crm-chip status-neutral">{docs.length} ملف</span></div>
  <div className="mt-4 space-y-2">{docs.map(d=>{const ex=expiryLabel(d.expires_at);return <div className="rounded-xl border p-3" key={d.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><b>{safe(d.file_name)}</b><span className={`crm-chip ${safe(d.verification_status)==='VERIFIED'?'status-success':safe(d.verification_status)==='REJECTED'?'status-danger':'status-warning'}`}>{safe(d.verification_status)}</span>{d.current_version===false&&<span className="crm-chip status-neutral">نسخة سابقة</span>}{ex&&<span className={`crm-chip ${ex.cls}`}>{ex.label}</span>}</div><p className="mt-1 text-xs text-[#75664d]">{selectedLabel(safe(d.readiness_item_key))}{day(d.issued_at)?` · إصدار ${day(d.issued_at)}`:''}{day(d.expires_at)?` · انتهاء ${day(d.expires_at)}`:''}</p></div><div className="flex gap-2"><button onClick={()=>void openCompanyDocument(safe(d.storage_path))} className="btn-ghost">فتح</button><button onClick={()=>void remove(d)} className="btn-ghost">حذف</button></div></div></div>})}{!docs.length&&<div className="crm-empty">لم تُرفع مستندات بعد.</div>}</div>
 </section>

 <section className="crm-card p-5"><h3 className="font-bold">بوابات التأهيل</h3><div className="mt-3 grid gap-2 lg:grid-cols-2">{gateways.map(g=>{const x=gatewayState(g as unknown as Gateway,typed);return <div key={g.id} className="rounded-xl border p-3"><div className="flex justify-between gap-2"><b>{safe(g.name)}</b><span className={`crm-chip ${x.state==='OPEN'?'status-success':x.state==='ONE_AWAY'?'status-warning':'status-neutral'}`}>{x.state}</span></div>{x.missing.length>0&&<p className="mt-2 text-xs text-[#75664d]">الناقص: {x.missing.map(selectedLabel).join('، ')}</p>}</div>})}</div></section>
 </>}
 </CRMPage>
}
