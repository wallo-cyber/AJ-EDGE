'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CompanyDetailsView } from '../../../components/company-details-view';
import { CRMPage } from '../../../components/crm-shell';
import { readCompanies, type Company } from '../../../lib/company-store';

export default function CompanyDetailsPage() {
  const params = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    const found = readCompanies().find((item) => item.id === params.id) ?? null;
    setCompany(found);
  }, [params.id]);

  if (!company) {
    return (
      <CRMPage
        title="تفاصيل الشركة"
        description="لا توجد شركة بهذا المعرف في التخزين المحلي بعد."
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
      action={
        <Link href="/companies" className="rounded-full border border-[#d8c08d] bg-white px-4 py-2.5 text-sm font-semibold text-[#6f6044]">
          العودة إلى الشركات
        </Link>
      }
    >
      <CompanyDetailsView company={company} />
    </CRMPage>
  );
}
