'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { getSupabaseClient } from '../../lib/supabase/client';
import type { SimpleRow } from '../../lib/supabase/simple-crud';

const groups=[
  {table:'companies',label:'الشركات',columns:'company_name,sector,city',title:'company_name',href:(row:SimpleRow)=>`/companies/${row.id}`},
  {table:'contacts',label:'جهات الاتصال',columns:'full_name,name,position,email',title:'full_name',href:()=>'/contacts'},
  {table:'opportunities',label:'الفرص',columns:'title,next_action,notes',title:'title',href:()=>'/pipeline'},
  {table:'follow_ups',label:'المتابعات',columns:'subject,title,company_name',title:'subject',href:()=>'/follow-ups'},
] as const;
const safe=(value:unknown)=>String(value??'').trim();

export default function SearchPage(){
  const [query,setQuery]=useState(''),[results,setResults]=useState<Array<{group:(typeof groups)[number];rows:SimpleRow[]}>>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
  useEffect(()=>{if(query.trim().length<2){setResults([]);return}const timer=window.setTimeout(()=>{setLoading(true);setError('');const term=query.trim().replaceAll(',',' ');void Promise.all(groups.map(async group=>{const filters=group.columns.split(',').map(column=>`${column}.ilike.%${term}%`).join(',');const{data,error:searchError}=await getSupabaseClient().from(group.table).select('*').or(filters).limit(8);if(searchError)throw searchError;return{group,rows:(data??[]) as SimpleRow[]}})).then(setResults).catch(()=>setError('تعذر تنفيذ البحث الآن.')).finally(()=>setLoading(false))},300);return()=>window.clearTimeout(timer)},[query]);
  return <CRMPage title="البحث الشامل" description="بحث Server-Side محدود ومصنف عبر سجلات تطوير الأعمال."><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="اكتب اسم شركة أو شخص أو فرصة أو متابعة" className="w-full rounded-2xl border bg-white p-4"/>{error&&<p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}{loading?<div className="crm-empty animate-pulse">جارٍ البحث...</div>:query.trim().length<2?<div className="crm-empty">أدخل حرفين على الأقل.</div>:<div className="grid gap-4 md:grid-cols-2">{results.map(({group,rows})=><section key={group.table} className="crm-card p-4"><h3 className="font-bold">{group.label} <span className="text-xs text-[#75664d]">({rows.length})</span></h3><div className="mt-3 divide-y">{rows.map(row=><Link key={row.id} href={group.href(row)} className="block py-3 text-sm hover:text-[#9a742b]"><strong>{safe(row[group.title])||safe(row.name)||safe(row.company_name)}</strong><p className="text-xs text-[#75664d]">{safe(row.position||row.sector||row.next_action||row.company_name)}</p></Link>)}{!rows.length&&<p className="py-4 text-sm text-[#75664d]">لا توجد نتائج.</p>}</div></section>)}</div>}</CRMPage>;
}
