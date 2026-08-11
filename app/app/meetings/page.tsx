import { SimpleCrudPage } from '../../components/simple-crud-page';

export default function MeetingsPage() {
  return <SimpleCrudPage table="meetings" title="الاجتماعات" description="إدارة الاجتماعات الحقيقية ونتائجها والإجراء التالي." summaryField="status" fields={[
    { key: 'company_id', label: 'الشركة', type: 'company', required: true },
    { key: 'contact_id', label: 'جهة الاتصال', type: 'contact' },
    { key: 'opportunity_id', label: 'الفرصة المرتبطة', type: 'opportunity' },
    { key: 'title', label: 'العنوان', required: true },
    { key: 'meeting_date', label: 'الموعد', type: 'datetime-local', required: true },
    { key: 'meeting_type', label: 'النوع', type: 'select', options: ['In Person', 'Online', 'Phone', 'Site Visit', 'General'] },
    { key: 'agenda', label: 'جدول الأعمال', type: 'textarea', required: true },
    { key: 'participants', label: 'المشاركون' },
    { key: 'location', label: 'الموقع' },
    { key: 'status', label: 'الحالة', type: 'select', options: ['Scheduled', 'Completed', 'Cancelled'] },
    { key: 'outcome', label: 'النتيجة', type: 'textarea' },
    { key: 'next_action', label: 'الإجراء التالي' },
    { key: 'notes', label: 'الملاحظات', type: 'textarea' },
  ]} />;
}
