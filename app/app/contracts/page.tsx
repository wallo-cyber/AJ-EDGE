import { CRMPage } from '../../components/crm-shell';

export default function ContractsPage() {
  return (
    <CRMPage
      title="العقود"
      description="إدارة العقود الموقعة مع العملاء والمقاولين الرئيسيين."
      action={<div className="rounded-2xl border border-[#ead9b3] bg-white px-4 py-3 text-sm text-[#6f6044]">العقود ستظهر عند التوقيع</div>}
    >
      <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">لا توجد عقود بعد</h3>
        <p className="mt-2 text-sm leading-7 text-[#6f6044]">سيتم توثيق العقود المتفق عليها ومراحل التنفيذ لاحقاً.</p>
      </div>
    </CRMPage>
  );
}
