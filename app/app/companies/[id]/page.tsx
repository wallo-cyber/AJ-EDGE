'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CompanyDetailsView } from '../../../components/company-details-view';
import { CompanyForm } from '../../../components/company-form';
import { CRMPage } from '../../../components/crm-shell';
import { type Company } from '../../../lib/company-store';
import { supabaseCrm } from '../../../lib/supabase/crm';

export default function CompanyDetailsPage() {
  const params = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice,setNotice]=useState('');
  const [editing,setEditing]=useState(false);

  useEffect(() => { void supabaseCrm.companies.get(params.id).then((item) => setCompany(item as Company)).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)); }, [params.id]);
  const toggleArchive = async () => { if (!company) return; const restoring = Boolean(company.archivedAt); if (!window.confirm(restoring ? 'استعادة الشركة إلى السجلات النشطة؟' : 'أرشفة الشركة مع الاحتفاظ بجميع بياناتها؟')) return; try { setCompany(await supabaseCrm.companies.update(company.id, { ...company, archivedAt: restoring ? '' : new Date().toISOString() }) as Company); } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحديث الأرشفة.'); } };
  const saveCompany=async(updated:Company)=>{if(!company)return;try{const saved=await supabaseCrm.companies.update(company.id,updated) as Company;setCompany(saved);setEditing(false);setNotice('تم حفظ تعديلات الشركة وبقيت داخل ملف الشركة.');setError('')}catch(reason){setError(reason instanceof Error?reason.message:'تعذر حفظ تعديلات الشركة.')}};

  if (loading) return <CRMPage title="تفاصيل الشركة" description="تحميل الملف الكامل من Supabase."><div className="crm-empty animate-pulse">جارٍ تحميل الشركة...</div></CRMPage>;
  if (!company) return <CRMPage title="تفاصيل الشركة" description={error || 'لا توجد شركة بهذا المعرف في قاعدة البيانات الحالية.'} action={<Link href="/companies" className="btn-ghost">العودة إلى الشركات</Link>}><div className="crm-empty">لم يتم العثور على الشركة المطلوبة.</div></CRMPage>;

  return <CRMPage title="تفاصيل الشركة" description="ملف الحساب التجاري: الأشخاص، الوصول، الإشارات، التواصل، المتابعات والفرص." action={<div className="flex flex-wrap gap-2"><button onClick={() => setEditing(true)} className="btn-primary">تعديل الشركة</button><button onClick={() => void toggleArchive()} className="btn-ghost">{company.archivedAt ? 'استعادة' : 'أرشفة'}</button><Link href="/companies" className="btn-ghost">العودة</Link></div>}>
    {notice?<p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>:null}{error?<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}
    <CompanyDetailsView company={company} />
    {editing?<div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-3"><div className="max-h-[94vh] w-full max-w-5xl overflow-auto rounded-[28px] bg-white p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold text-[#9a742b]">EDIT ACCOUNT</p><h3 className="text-lg font-bold">تعديل {company.companyName}</h3><p className="text-xs text-[#75664d]">بعد الحفظ ستبقى داخل Company 360.</p></div><button onClick={()=>setEditing(false)} className="btn-ghost">إغلاق</button></div><CompanyForm initialCompany={company} submitLabel="حفظ التعديلات" onSubmit={saveCompany} onCancel={()=>setEditing(false)}/></div></div>:null}
  </CRMPage>;
}
