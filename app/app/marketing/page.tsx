import { SimpleCrudPage } from '../../components/simple-crud-page';

export default function MarketingPage() {
  return <SimpleCrudPage
    table="marketing_engineers"
    title="فريق التسويق"
    description="متابعة بيانات مهندسي التسويق وأدائهم الأسبوعي وعدد المشاريع المقدمة والعملاء المؤهلين والاجتماعات."
    summaryField="status"
    fields={[
      { key: 'name', label: 'اسم مهندس التسويق', required: true },
      { key: 'phone', label: 'رقم الجوال' },
      { key: 'email', label: 'البريد الإلكتروني' },
      { key: 'status', label: 'الحالة', type: 'select', options: ['Active', 'On Leave', 'Inactive'], required: true },
      { key: 'week_start', label: 'بداية الأسبوع', type: 'date', required: true },
      { key: 'projects_submitted', label: 'المشاريع المقدمة هذا الأسبوع', type: 'number' },
      { key: 'weekly_target', label: 'المستهدف الأسبوعي', type: 'number' },
      { key: 'qualified_leads', label: 'العملاء المؤهلون', type: 'number' },
      { key: 'meetings_booked', label: 'الاجتماعات المحجوزة', type: 'number' },
      { key: 'notes', label: 'ملاحظات الأداء الأسبوعي', type: 'textarea' },
    ]}
  />;
}
