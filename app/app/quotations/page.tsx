'use client';

import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { QuotationForm } from '../../components/quotation-form';
import { type Company } from '../../lib/company-store';
import { quotationStatuses, type Quotation, type QuotationStatus } from '../../lib/quotation-store';
import { quotationDecision } from '../../lib/intelligence/quotation-ai';
import { quotationsApi, supabaseCrm } from '../../lib/supabase/crm';

const viewOptions = ['all', 'follow_up_now', 'expiring_soon', 'expired', 'waiting'] as const;
type ViewOption = (typeof viewOptions)[number];

const viewLabels: Record<ViewOption, string> = {
  all: 'الكل',
  follow_up_now: 'يحتاج متابعة الآن',
  expiring_soon: 'ينتهي قريباً',
  expired: 'منتهية',
  waiting: 'قيد الانتظار',
};

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [view, setView] = useState<ViewOption>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'الكل'>('الكل');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    void Promise.all([quotationsApi.list(), supabaseCrm.companies.list()])
      .then(([quotationItems, companyItems]) => {
        setQuotations(quotationItems as Quotation[]);
        setCompanies(companyItems as Company[]);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const decorated = useMemo(() => {
    return quotations.map((item) => ({
      item,
      decision: quotationDecision({ status: item.status, valid_until: item.validUntil, issue_date: item.issueDate }),
    }));
  }, [quotations]);

  const filtered = useMemo(() => {
    return decorated.filter(({ item, decision }) => {
      const haystack = `${item.companyName} ${item.quotationNumber} ${item.title}`.toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'الكل' || item.status === statusFilter;
      const matchesView =
        view === 'all' ||
        (view === 'follow_up_now' && decision.decision === 'FOLLOW_UP_NOW') ||
        (view === 'expiring_soon' && decision.decision === 'EXPIRING_SOON') ||
        (view === 'expired' && decision.decision === 'EXPIRED') ||
        (view === 'waiting' && decision.decision === 'WAITING');
      return matchesSearch && matchesStatus && matchesView;
    });
  }, [decorated, searchTerm, statusFilter, view]);

  const openNewForm = () => {
    setEditingId(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (quotation: Quotation) => {
    const selectedCompany = companies.find((company) => company.id === quotation.companyId || company.companyName === quotation.companyName);
    const linked = { ...quotation, companyId: selectedCompany?.id ?? quotation.companyId, companyName: selectedCompany?.companyName ?? quotation.companyName };
    setError('');
    setSuccess('');
    if (editingId) {
      const updated = await quotationsApi.update(editingId, linked);
      setQuotations((items) => items.map((item) => (item.id === editingId ? (updated as Quotation) : item)));
    } else {
      const created = await quotationsApi.create(linked);
      setQuotations((items) => [created as Quotation, ...items]);
    }
    setSuccess('تم حفظ العرض.');
    closeForm();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف العرض؟')) return;
    await quotationsApi.remove(id);
    setQuotations((items) => items.filter((item) => item.id !== id));
  };

  const handleEdit = (quotation: Quotation) => {
    setEditingId(quotation.id);
    setIsFormOpen(true);
  };

  const editing = quotations.find((item) => item.id === editingId) ?? undefined;

  return (
    <CRMPage
      title="عروض الأسعار"
      description="متابعة العروض المرسلة وصلاحيتها وتنبيهات المتابعة قبل انتهائها."
      action={<button onClick={openNewForm} className="rounded-full bg-[#2f2417] px-5 py-3 text-sm font-semibold text-[#fef8ec]">إضافة عرض</button>}
    >
      {error ? <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-2xl bg-green-50 p-3 text-sm text-green-700">{success}</div> : null}
      {loading ? <div className="rounded-2xl bg-white p-6 text-center text-[#6f6044]">جاري تحميل العروض...</div> : null}

      <div className="flex flex-wrap gap-2 rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-3">
        {viewOptions.map((option) => (
          <button key={option} onClick={() => setView(option)} className={`rounded-full px-3 py-2 text-sm ${view === option ? 'bg-[#2f2417] text-[#fef8ec]' : 'bg-white text-[#6f6044]'}`}>
            {viewLabels[option]}
          </button>
        ))}
      </div>

      <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="بحث بالشركة أو رقم العرض" className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as QuotationStatus | 'الكل')} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            <option value="الكل">الحالة: الكل</option>
            {quotationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
      </div>

      {isFormOpen ? <QuotationForm initialQuotation={editing} companyId={editing?.companyId} companyName={editing?.companyName} onSubmit={handleSubmit} onCancel={closeForm} submitLabel={editing ? 'حفظ التعديلات' : 'إضافة عرض'} /> : null}

      <div className="overflow-x-auto rounded-[24px] border border-[#ead9b3] bg-white p-3">
        <table className="min-w-full text-right text-sm text-[#2f2417]">
          <thead>
            <tr className="border-b border-[#ead9b3] text-[#9a7b2f]">
              <th className="px-3 py-3">الشركة</th>
              <th className="px-3 py-3">رقم العرض</th>
              <th className="px-3 py-3">القيمة</th>
              <th className="px-3 py-3">صالح حتى</th>
              <th className="px-3 py-3">الحالة</th>
              <th className="px-3 py-3">تنبيه الذكاء</th>
              <th className="px-3 py-3">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-[#6f6044]">لا توجد عروض تطابق هذه المعايير بعد.</td></tr>
            ) : (
              filtered.map(({ item, decision }) => (
                <tr key={item.id} className="border-b border-[#f4ebd7]">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{item.companyName}</div>
                    <div className="mt-1 text-xs text-[#6f6044]">{item.title}</div>
                  </td>
                  <td className="px-3 py-3">{item.quotationNumber}</td>
                  <td className="px-3 py-3">{item.value}</td>
                  <td className="px-3 py-3">{item.validUntil}</td>
                  <td className="px-3 py-3">{item.status}</td>
                  <td className="px-3 py-3 text-xs text-[#9a4b2d]">{decision.reason}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleEdit(item)} className="rounded-full border border-[#d8c08d] bg-[#f8efe0] px-3 py-1.5 text-xs font-semibold text-[#2f2417]">تعديل</button>
                      <button onClick={() => handleDelete(item.id)} className="rounded-full border border-[#d8c08d] bg-[#fff0e0] px-3 py-1.5 text-xs font-semibold text-[#9a4b2d]">حذف</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </CRMPage>
  );
}