import { CRMPage } from '../../components/crm-shell';

export default function ReportsPage() {
  return (
    <CRMPage
      title="التقارير"
      description="تقارير تشغيلية ومؤشرات أداء مخصصة لتنظيم المبيعات والتواصل مع السوق المحلي."
      action={<div className="rounded-2xl border border-[#ead9b3] bg-white px-4 py-3 text-sm text-[#6f6044]">التقارير ستكون ديناميكية</div>}
    >
      <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">لا توجد تقارير بعد</h3>
        <p className="mt-2 text-sm leading-7 text-[#6f6044]">سيتم عرض مؤشرات مثل نشاط التواصل، العروض، والمراجعات هنا.</p>
      </div>
    </CRMPage>
  );
}
