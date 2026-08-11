'use client';
import Link from 'next/link';
export function CompanyActions({companyId,onEdit,onArchive,archived}:{companyId:string;onEdit:()=>void;onArchive:()=>void;archived?:boolean}){
 return <div className="flex flex-wrap gap-2">
  <Link href={`/companies/${companyId}`} className="btn-primary">فتح الملف</Link>
  <Link href={`/research?tab=manual&company_id=${companyId}`} className="btn-secondary">استكمال البيانات</Link>
  <Link href={`/outreach?tab=ready&company_id=${companyId}`} className="btn-ghost">تجهيز التواصل</Link>
  <Link href={`/follow-ups?company_id=${companyId}`} className="btn-ghost">متابعة</Link>
  <button onClick={onEdit} className="btn-ghost">تعديل</button>
  <button onClick={onArchive} className="btn-ghost">{archived?'استعادة':'أرشفة'}</button>
 </div>
}
