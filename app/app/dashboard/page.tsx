import { CRMPage } from '../../components/crm-shell';

export default function DashboardPage() {
  return (
    <CRMPage
      title="لوحة القيادة"
      description="نظرة عامة على النشاط التجاري مع تركيز على الشركات الصناعية والمقاولين الرئيسيين في المنطقة الشرقية."
      action={<div className="rounded-2xl border border-[#ead9b3] bg-white px-4 py-3 text-sm text-[#6f6044]">المحتوى جاهز للربط مع Supabase</div>}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-4">
          <p className="text-sm font-semibold text-[#9a7b2f]">التركيز الإقليمي</p>
          <p className="mt-3 text-lg font-semibold text-[#2f2417]">الدمام، الخبر، الظهران، الجبيل، رأس تنورة، القطيف</p>
        </div>
        <div className="rounded-[24px] border border-[#ead9b3] bg-[#fffdf8] p-4">
          <p className="text-sm font-semibold text-[#9a7b2f]">فئات الشركات</p>
          <p className="mt-3 text-lg font-semibold text-[#2f2417]">مصانع صناعية - شركات تصنيع - مقاولون رئيسيون - مطورو عقارات - استشاريون هندسيون</p>
        </div>
        <div className="rounded-[24px] border border-[#ead9b3] bg-[#f8efe0] p-4">
          <p className="text-sm font-semibold text-[#9a7b2f]">الحالة</p>
          <p className="mt-3 text-lg font-semibold text-[#2f2417]">لا توجد بيانات تجريبية - بنية التطبيق جاهزة للانتقال إلى الإنتاج</p>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#ead9b3] bg-white p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">ما الذي سيتم تنفيذه لاحقاً</h3>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-[#6f6044]">
          <li>• تتبع الشركات حسب المنطقة ونوع النشاط.</li>
          <li>• إدارة جهات الاتصال وملفات العملاء.</li>
          <li>• تتبع التواصل والمتابعات والفرص.</li>
        </ul>
      </div>
    </CRMPage>
  );
}
