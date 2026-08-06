import { CRMPage } from '../../components/crm-shell';

export default function SettingsPage() {
  return (
    <CRMPage
      title="الإعدادات"
      description="إعدادات التطبيق الأساسية للاستعداد للربط مع Supabase وإدارة المستخدمين."
      action={<div className="rounded-2xl border border-[#ead9b3] bg-white px-4 py-3 text-sm text-[#6f6044]">الإعدادات ستتوسع لاحقاً</div>}
    >
      <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">إعدادات التطبيق</h3>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-[#6f6044]">
          <li>• إعدادات قاعدة البيانات Supabase.</li>
          <li>• إعدادات المستخدم والصلاحيات.</li>
          <li>• إعدادات المنطقة واللغة.</li>
        </ul>
      </div>
    </CRMPage>
  );
}
