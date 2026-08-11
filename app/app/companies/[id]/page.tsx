'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CompanyDetailsView } from '../../../components/company-details-view';
import { CRMPage } from '../../../components/crm-shell';
import { type Company } from '../../../lib/company-store';
import { supabaseCrm } from '../../../lib/supabase/crm';

export default function CompanyDetailsPage() {
  const params = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void supabaseCrm.companies.get(params.id).then((item) => setCompany(item as Company)).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, [params.id]);

  const toggleArchive = async () => {
    if (!company) return;
    const restoring = Boolean(company.archivedAt);
    if (!window.confirm(restoring ? 'استعادة الشركة إلى السجلات النشطة؟' : 'أرشفة الشركة مع الاحتفاظ بجميع بياناتها؟')) return;
    try { setCompany(await supabaseCrm.companies.update(company.id, { ...company, archivedAt: restoring ? '' : new Date().toISOString() }) as Company); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحديث الأرشفة.'); }
  };

  if (loading) return <CRMPage title="تفاصيل الشركة" description="تحميل الملف الكامل من Supabase."><div className="crm-empty animate-pulse">جارٍ تحميل الشركة...</div></CRMPage>;

  if (!company) {
    return (
      <CRMPage
        title="تفاصيل الشركة"
        description={error || 'لا توجد شركة بهذا المعرف في قاعدة البيانات الحالية.'}
        action={
          <Link href="/companies" className="rounded-full border border-[#d8c08d] bg-white px-4 py-2.5 text-sm font-semibold text-[#6f6044]">
            العودة إلى الشركات
          </Link>
        }
      >
        <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5 text-sm text-[#6f6044]">
          لم يتم العثور على الشركة المطلوبة.
        </div>
      </CRMPage>
    );
  }

  return (
    <CRMPage
      title="تفاصيل الشركة"
      description="ملف كامل للشركة مع معلومات الاتصال، السجل التواصل، المتابعات، والفرص."
      action={<div className="flex flex-wrap gap-2"><button onClick={() => void toggleArchive()} className="rounded-full border border-[#d8c08d] bg-[#fff0e0] px-4 py-2.5 text-sm font-semibold text-[#9a4b2d]">{company.archivedAt ? 'استعادة' : 'أرشفة'}</button><Link href={`/companies?edit=${company.id}`} className="rounded-full border border-[#d8c08d] bg-white px-4 py-2.5 text-sm font-semibold text-[#6f6044]">تعديل الشركة</Link><Link href="/companies" className="rounded-full border border-[#d8c08d] bg-white px-4 py-2.5 text-sm font-semibold text-[#6f6044]">العودة</Link></div>}
    >
      <CompanyDetailsView company={company} />
    </CRMPage>
  );
}
