import { SimpleCrudPage } from '../../components/simple-crud-page';

export default function MeetingsPage() {
  return <SimpleCrudPage table="meetings" title="الاجتماعات" description="إدارة الاجتماعات ونتائجها والإجراء التالي." fields={[
    { key: 'company_id', label: 'الشركة', type: 'company', required: true },
    { key: 'title', label: 'العنوان', required: true },
    { key: 'meeting_date', label: 'الموعد', type: 'datetime-local', required: true },
    { key: 'purpose', label: 'الغرض', required: true },
    { key: 'participants', label: 'المشاركون' },
    { key: 'location', label: 'الموقع' },
    { key: 'status', label: 'الحالة', type: 'select', options: ['Scheduled', 'Completed', 'Cancelled'] },
    { key: 'contact_person', label: 'جهة الاتصال' },
    { key: 'outcome', label: 'النتيجة', type: 'textarea' },
    { key: 'next_action', label: 'الإجراء التالي' },
    { key: 'notes', label: 'الملاحظات', type: 'textarea' },
  ]} />;
}
