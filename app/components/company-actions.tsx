'use client';

import Link from 'next/link';

type CompanyActionsProps = {
  companyId: string;
  onEdit: () => void;
  onArchive: () => void;
  archived?: boolean;
};

export function CompanyActions({ companyId, onEdit, onArchive, archived }: CompanyActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/companies/${companyId}`}
        className="rounded-full border border-[#d8c08d] bg-white px-3 py-1.5 text-xs font-semibold text-[#6f6044]"
      >
        عرض
      </Link>
      <button onClick={onEdit} className="rounded-full border border-[#d8c08d] bg-[#f8efe0] px-3 py-1.5 text-xs font-semibold text-[#2f2417]">
        تعديل
      </button>
      <button onClick={onArchive} className="rounded-full border border-[#d8c08d] bg-[#fff0e0] px-3 py-1.5 text-xs font-semibold text-[#9a4b2d]">
        {archived ? 'استعادة' : 'أرشفة'}
      </button>
      <Link href="/ready-outreach" className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-3 py-1.5 text-xs font-semibold text-[#6f6044]">مراجعة التواصل</Link>
      <Link href="/follow-ups" className="rounded-full border border-[#d8c08d] bg-[#f8efe0] px-3 py-1.5 text-xs font-semibold text-[#2f2417]">إضافة متابعة</Link>
    </div>
  );
}
