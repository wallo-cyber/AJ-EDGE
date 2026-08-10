'use client';

import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { FollowUpForm } from '../../components/follow-up-form';
import { type Company } from '../../lib/company-store';
import { type FollowUp, type FollowUpPriority, type FollowUpStatus, type FollowUpType } from '../../lib/follow-up-store';
import { supabaseCrm } from '../../lib/supabase/crm';

const viewOptions = ['today', 'upcoming', 'overdue', 'completed'] as const;

type ViewOption = (typeof viewOptions)[number];

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [view, setView] = useState<ViewOption>('upcoming');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | 'الكل'>('الكل');
  const [typeFilter, setTypeFilter] = useState<FollowUpType | 'الكل'>('الكل');
  const [priorityFilter, setPriorityFilter] = useState<FollowUpPriority | 'الكل'>('الكل');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    void Promise.all([supabaseCrm.followUps.list(), supabaseCrm.companies.list()]).then(([followUpItems, companyItems]) => {
      setFollowUps(followUpItems as FollowUp[]);
      setCompanies(companyItems as Company[]);
    }).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, []);

  const filteredFollowUps = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return followUps.filter((item) => {
      const haystack = `${item.companyName} ${item.contactPerson} ${item.subject} ${item.notes}`.toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesCompany = companyFilter === 'الكل' || item.companyName === companyFilter;
      const matchesStatus = statusFilter === 'الكل' || item.status === statusFilter;
      const matchesType = typeFilter === 'الكل' || item.followUpType === typeFilter;
      const matchesPriority = priorityFilter === 'الكل' || item.priority === priorityFilter;

      let matchesView = true;
      if (view === 'today') {
        matchesView = item.date === today;
      } else if (view === 'upcoming') {
        matchesView = item.date >= today && item.status === 'مجدولة';
      } else if (view === 'overdue') {
        matchesView = item.date < today && item.status === 'مجدولة';
      } else if (view === 'completed') {
        matchesView = item.status === 'مكتملة';
      }

      return matchesSearch && matchesCompany && matchesStatus && matchesType && matchesPriority && matchesView;
    });
  }, [companyFilter, followUps, priorityFilter, searchTerm, statusFilter, typeFilter, view]);

  const openNewForm = () => {
    setEditingFollowUpId(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingFollowUpId(null);
  };

  const handleSubmit = async (followUp: FollowUp) => {
    const selectedCompany = companies.find((company) => company.id === followUp.companyId || company.companyName === followUp.companyName);
    const linkedFollowUp = { ...followUp, companyId: selectedCompany?.id ?? followUp.companyId, companyName: selectedCompany?.companyName ?? followUp.companyName };
    setError(''); setSuccess('');
    if (editingFollowUpId) {
      const updated = await supabaseCrm.followUps.update(editingFollowUpId, linkedFollowUp);
      setFollowUps((items) => items.map((item) => item.id === editingFollowUpId ? updated as FollowUp : item));
    } else {
      const created = await supabaseCrm.followUps.create(linkedFollowUp);
      setFollowUps((items) => [created as FollowUp, ...items]);
    }
    setSuccess('تم حفظ المتابعة.'); closeForm();
  };

  const handleDelete = async (followUpId: string) => {
    await supabaseCrm.followUps.remove(followUpId);
    setFollowUps((items) => items.filter((item) => item.id !== followUpId));
  };

  const handleEdit = (followUp: FollowUp) => {
    setEditingFollowUpId(followUp.id);
    setIsFormOpen(true);
  };

  const handleMarkCompleted = async (followUpId: string) => {
    const current = followUps.find((item) => item.id === followUpId);
    if (!current) return;
    const updated = await supabaseCrm.followUps.update(followUpId, { ...current, status: 'مكتملة' });
    setFollowUps((items) => items.map((item) => item.id === followUpId ? updated as FollowUp : item));
  };

  const handleReschedule = async (followUp: FollowUp) => {
    const updated = await supabaseCrm.followUps.update(followUp.id, { ...followUp, status: 'مجدولة', nextFollowUpDate: new Date().toISOString().slice(0, 10) });
    setFollowUps((items) => items.map((item) => item.id === followUp.id ? updated as FollowUp : item));
  };

  const editingFollowUp = followUps.find((item) => item.id === editingFollowUpId) ?? undefined;

  return (
    <CRMPage
      title="المتابعات"
      description="إدارة المتابعات اليومية والمستقبلية مع متابعة الحالة والنتائج."
      action={<button onClick={openNewForm} className="rounded-full bg-[#2f2417] px-5 py-3 text-sm font-semibold text-[#fef8ec]">إضافة متابعة</button>}
    >
      {error ? <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-2xl bg-green-50 p-3 text-sm text-green-700">{success}</div> : null}
      {loading ? <div className="rounded-2xl bg-white p-6 text-center text-[#6f6044]">جارٍ تحميل المتابعات...</div> : null}
      <div className="flex flex-wrap gap-2 rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-3">
        {viewOptions.map((option) => (
          <button key={option} onClick={() => setView(option)} className={`rounded-full px-3 py-2 text-sm ${view === option ? 'bg-[#2f2417] text-[#fef8ec]' : 'bg-white text-[#6f6044]'}`}>
            {option === 'today' ? 'اليوم' : option === 'upcoming' ? 'القادمة' : option === 'overdue' ? 'المتأخرة' : 'المكتملة'}
          </button>
        ))}
      </div>

      <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="بحث بالموضوع أو الشركة" className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
          <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            <option value="الكل">الشركة: الكل</option>
            {companies.map((company) => <option key={company.id} value={company.companyName}>{company.companyName}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as FollowUpStatus | 'الكل')} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            <option value="الكل">الحالة: الكل</option>
            <option value="مجدولة">مجدولة</option>
            <option value="مكتملة">مكتملة</option>
            <option value="متأخرة">متأخرة</option>
            <option value="ملغاة">ملغاة</option>
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as FollowUpType | 'الكل')} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            <option value="الكل">النوع: الكل</option>
            <option value="اتصال">اتصال</option>
            <option value="بريد إلكتروني">بريد إلكتروني</option>
            <option value="واتساب">واتساب</option>
            <option value="زيارة">زيارة</option>
            <option value="اجتماع">اجتماع</option>
            <option value="LinkedIn">LinkedIn</option>
          </select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as FollowUpPriority | 'الكل')} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            <option value="الكل">الأولوية: الكل</option>
            <option value="عالية">عالية</option>
            <option value="متوسطة">متوسطة</option>
            <option value="منخفضة">منخفضة</option>
          </select>
        </div>
      </div>

      {isFormOpen ? <FollowUpForm initialFollowUp={editingFollowUp} companyId={editingFollowUp?.companyId} companyName={editingFollowUp?.companyName} contactPerson={editingFollowUp?.contactPerson} onSubmit={handleSubmit} onCancel={closeForm} submitLabel={editingFollowUp ? 'حفظ التعديلات' : 'إضافة متابعة'} /> : null}

      <div className="overflow-x-auto rounded-[24px] border border-[#ead9b3] bg-white p-3">
        <table className="min-w-full text-right text-sm text-[#2f2417]">
          <thead>
            <tr className="border-b border-[#ead9b3] text-[#9a7b2f]">
              <th className="px-3 py-3">الشركة</th>
              <th className="px-3 py-3">الشخص</th>
              <th className="px-3 py-3">النوع</th>
              <th className="px-3 py-3">التاريخ</th>
              <th className="px-3 py-3">الحالة</th>
              <th className="px-3 py-3">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredFollowUps.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-center text-[#6f6044]">لا توجد متابعات تطابق هذه المعايير بعد.</td></tr> : filteredFollowUps.map((item) => (
              <tr key={item.id} className="border-b border-[#f4ebd7]">
                <td className="px-3 py-3">
                  <div className="font-semibold">{item.companyName}</div>
                  <div className="mt-1 text-xs text-[#6f6044]">{item.subject}</div>
                </td>
                <td className="px-3 py-3">{item.contactPerson || '—'}</td>
                <td className="px-3 py-3">{item.followUpType}</td>
                <td className="px-3 py-3">{item.date} {item.time}</td>
                <td className="px-3 py-3">{item.status}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleMarkCompleted(item.id)} className="rounded-full border border-[#d8c08d] bg-[#f8efe0] px-3 py-1.5 text-xs font-semibold text-[#2f2417]">إكمال</button>
                    <button onClick={() => handleReschedule(item)} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-3 py-1.5 text-xs font-semibold text-[#6f6044]">إعادة جدولة</button>
                    <button onClick={() => handleEdit(item)} className="rounded-full border border-[#d8c08d] bg-[#f8efe0] px-3 py-1.5 text-xs font-semibold text-[#2f2417]">تعديل</button>
                    <button onClick={() => handleDelete(item.id)} className="rounded-full border border-[#d8c08d] bg-[#fff0e0] px-3 py-1.5 text-xs font-semibold text-[#9a4b2d]">حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CRMPage>
  );
}
