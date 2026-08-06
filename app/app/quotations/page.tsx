import { CRMPage } from '../../components/crm-shell';

export default function QuotationsPage() {
  return (
    <CRMPage
      title="العروض"
      description="إدارة العروض المرسلة إلى العملاء مع تتبع المراحل والملفات."
      action={<div className="rounded-2xl border border-[#ead9b3] bg-white px-4 py-3 text-sm text-[#6f6044]">العروض ستظهر عند الإرسال</div>}
    >
      <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">لا توجد عروض بعد</h3>
        <p className="mt-2 text-sm leading-7 text-[#6f6044]">سيتم عرض هنا كل عرض مع حالته وتاريخ الإرسال.</p>
      </div>
    </CRMPage>
  );
}
