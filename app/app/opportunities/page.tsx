import { CRMPage } from '../../components/crm-shell';

export default function OpportunitiesPage() {
  return (
    <CRMPage
      title="الفرص"
      description="إدارة فرص العمل والتقديرات الأولية للمشاريع في المنطقة الشرقية."
      action={<div className="rounded-2xl border border-[#ead9b3] bg-white px-4 py-3 text-sm text-[#6f6044]">الفرص تحتاج إلى بيانات فعلية</div>}
    >
      <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">لا توجد فرص بعد</h3>
        <p className="mt-2 text-sm leading-7 text-[#6f6044]">سيتم تتبع مراحل كل فرصة من التحضير إلى الإغلاق.</p>
      </div>
    </CRMPage>
  );
}
