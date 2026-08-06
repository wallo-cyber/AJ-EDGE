import { CRMPage } from '../../components/crm-shell';

export default function OutreachPage() {
  return (
    <CRMPage
      title="التواصل"
      description="خطة التواصل مع الشركات المستهدفة، بما في ذلك رسائل البريد والاتصالات القادمة."
      action={<div className="rounded-2xl border border-[#ead9b3] bg-white px-4 py-3 text-sm text-[#6f6044]">سير العمل جاهز للتكامل</div>}
    >
      <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">لا توجد نشاطات تواصل بعد</h3>
        <p className="mt-2 text-sm leading-7 text-[#6f6044]">سيتم عرض جميع رسائل التواصل والمهام القادمة هنا.</p>
      </div>
    </CRMPage>
  );
}
