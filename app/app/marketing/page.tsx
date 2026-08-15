import { SimpleCrudPage } from '../../components/simple-crud-page';

export default function MarketingPage() {
  const today = new Date();
  const day = today.getUTCDay();
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - (day === 0 ? 6 : day - 1));
  const weekStart = monday.toISOString().slice(0, 10);

  return <SimpleCrudPage
    table="marketing_engineers"
    title="فريق التسويق"
    description="متابعة بيانات مهندسي التسويق وأدائهم الأسبوعي وعدد المشاريع المقدمة والعملاء المؤهلين والاجتماعات."
    summaryField="status"
    fields={[
      { key: 'name', label: 'اسم مهندس التسويق', required: true },
      { key: 'phone', label: 'رقم الجوال' },
      { key: 'email', label: 'البريد الإلكتروني' },
      { key: 'status', label: 'الحالة', type: 'select', options: ['Active', 'On Leave', 'Inactive'], required: true, defaultValue: 'Active' },
      { key: 'week_start', label: 'بداية الأسبوع', type: 'date', required: true, defaultValue: weekStart },
      { key: 'projects_submitted', label: 'المشاريع المقدمة هذا الأسبوع', type: 'number', defaultValue: 0 },
      { key: 'weekly_target', label: 'المستهدف الأسبوعي', type: 'number', defaultValue: 0 },
      { key: 'qualified_leads', label: 'العملاء المؤهلون', type: 'number', defaultValue: 0 },
      { key: 'meetings_booked', label: 'الاجتماعات المحجوزة', type: 'number', defaultValue: 0 },
      { key: 'notes', label: 'ملاحظات الأداء الأسبوعي', type: 'textarea' },
    ]}
  />;
}
