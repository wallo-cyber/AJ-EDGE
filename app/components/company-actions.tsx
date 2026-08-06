'use client';

import Link from 'next/link';

type CompanyActionsProps = {
  companyId: string;
  onEdit: () => void;
  onDelete: () => void;
  onCreateOutreach: () => void;
  onAddFollowUp: () => void;
};

export function CompanyActions({ companyId, onEdit, onDelete, onCreateOutreach, onAddFollowUp }: CompanyActionsProps) {
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
      <button onClick={onDelete} className="rounded-full border border-[#d8c08d] bg-[#fff0e0] px-3 py-1.5 text-xs font-semibold text-[#9a4b2d]">
        حذف
      </button>
      <button onClick={onCreateOutreach} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-3 py-1.5 text-xs font-semibold text-[#6f6044]">
        إنشاء رسالة تواصل
      </button>
      <button onClick={onAddFollowUp} className="rounded-full border border-[#d8c08d] bg-[#f8efe0] px-3 py-1.5 text-xs font-semibold text-[#2f2417]">
        إضافة متابعة
      </button>
    </div>
  );
}
