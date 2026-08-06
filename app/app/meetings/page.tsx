import { CRMPage } from '../../components/crm-shell';

export default function MeetingsPage() {
  return (
    <CRMPage
      title="الاجتماعات"
      description="جدولة الاجتماعات مع العملاء والشركاء والمقاولين الرئيسيين في المنطقة الشرقية."
      action={<div className="rounded-2xl border border-[#ead9b3] bg-white px-4 py-3 text-sm text-[#6f6044]">التقويم سيكون متاحاً لاحقاً</div>}
    >
      <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">لا توجد اجتماعات بعد</h3>
        <p className="mt-2 text-sm leading-7 text-[#6f6044]">سيتم إدراج الاجتماعات القادمة والمكتملة هنا.</p>
      </div>
    </CRMPage>
  );
}
