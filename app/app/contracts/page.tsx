'use client';

import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { ContractForm } from '../../components/contract-form';
import { type Company } from '../../lib/company-store';
import { contractStatuses, type Contract, type ContractStatus } from '../../lib/contract-store';
import { contractDecision } from '../../lib/intelligence/contract-ai';
import { contractsApi, supabaseCrm } from '../../lib/supabase/crm';

const viewOptions = ['all', 'renew_now', 'expiring_soon', 'expired', 'active'] as const;
type ViewOption = (typeof viewOptions)[number];

const viewLabels: Record<ViewOption, string> = {
  all: 'الكل',
  renew_now: 'يحتاج تجديد الآن',
  expiring_soon: 'ينتهي قريباً',
  expired: 'منتهية',
  active: 'سارية',
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [view, setView] = useState<ViewOption>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'الكل'>('الكل');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    void Promise.all([contractsApi.list(), supabaseCrm.companies.list()])
      .then(([contractItems, companyItems]) => {
        setContracts(contractItems as Contract[]);
        setCompanies(companyItems as Company[]);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const decorated = useMemo(() => {
    return contracts.map((item) => ({
      item,
      decision: contractDecision({ status: item.status, end_date: item.endDate }),
    }));
  }, [contracts]);

  const filtered = useMemo(() => {
    return decorated.filter(({ item, decision }) => {
      const haystack = `${item.companyName} ${item.contractNumber} ${item.title}`.toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'الكل' || item.status === statusFilter;
      const matchesView =
        view === 'all' ||
        (view === 'renew_now' && decision.decision === 'RENEW_NOW') ||
        (view === 'expiring_soon' && decision.decision === 'EXPIRING_SOON') ||
        (view === 'expired' && decision.decision === 'EXPIRED') ||
        (view === 'active' && decision.decision === 'ACTIVE');
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

  const handleSubmit = async (contract: Contract) => {
    const selectedCompany = companies.find((company) => company.id === contract.companyId || company.companyName === contract.companyName);
    const linked = { ...contract, companyId: selectedCompany?.id ?? contract.companyId, companyName: selectedCompany?.companyName ?? contract.companyName };
    setError('');
    setSuccess('');
    if (editingId) {
      const updated = await contractsApi.update(editingId, linked);
      setContracts((items) => items.map((item) => (item.id === editingId ? (updated as Contract) : item)));
    } else {
      const created = await contractsApi.create(linked);
      setContracts((items) => [created as Contract, ...items]);
    }
    setSuccess('تم حفظ العقد.');
    closeForm();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف العقد؟')) return;
    await contractsApi.remove(id);
    setContracts((items) => items.filter((item) => item.id !== id));
  };

  const handleEdit = (contract: Contract) => {
    setEditingId(contract.id);
    setIsFormOpen(true);
  };

  const editing = contracts.find((item) => item.id === editingId) ?? undefined;

  return (
    <CRMPage
      title="العقود"
      description="متابعة عقود الشركاء والعملاء وتنبيهات التجديد قبل الانتهاء."
      action={<button onClick={openNewForm} className="rounded-full bg-[#2f2417] px-5 py-3 text-sm font-semibold text-[#fef8ec]">إضافة عقد</button>}
    >
      {error ? <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-2xl bg-green-50 p-3 text-sm text-green-700">{success}</div> : null}
      {loading ? <div className="rounded-2xl bg-white p-6 text-center text-[#6f6044]">جاري تحميل العقود...</div> : null}

      <div className="flex flex-wrap gap-2 rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-3">
        {viewOptions.map((option) => (
          <button key={option} onClick={() => setView(option)} className={`rounded-full px-3 py-2 text-sm ${view === option ? 'bg-[#2f2417] text-[#fef8ec]' : 'bg-white text-[#6f6044]'}`}>
            {viewLabels[option]}
          </button>
        ))}
      </div>

      <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="بحث بالشركة أو رقم العقد" className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ContractStatus | 'الكل')} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            <option value="الكل">الحالة: الكل</option>
            {contractStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
      </div>

      {isFormOpen ? <ContractForm initialContract={editing} companyId={editing?.companyId} companyName={editing?.companyName} onSubmit={handleSubmit} onCancel={closeForm} submitLabel={editing ? 'حفظ التعديلات' : 'إضافة عقد'} /> : null}

      <div className="overflow-x-auto rounded-[24px] border border-[#ead9b3] bg-white p-3">
        <table className="min-w-full text-right text-sm text-[#2f2417]">
          <thead>
            <tr className="border-b border-[#ead9b3] text-[#9a7b2f]">
              <th className="px-3 py-3">الشركة</th>
              <th className="px-3 py-3">رقم العقد</th>
              <th className="px-3 py-3">القيمة</th>
              <th className="px-3 py-3">الانتهاء</th>
              <th className="px-3 py-3">الحالة</th>
              <th className="px-3 py-3">تنبيه الذكاء</th>
              <th className="px-3 py-3">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-[#6f6044]">لا توجد عقود تطابق هذه المعايير بعد.</td></tr>
            ) : (
              filtered.map(({ item, decision }) => (
                <tr key={item.id} className="border-b border-[#f4ebd7]">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{item.companyName}</div>
                    <div className="mt-1 text-xs text-[#6f6044]">{item.title}</div>
                  </td>
                  <td className="px-3 py-3">{item.contractNumber}</td>
                  <td className="px-3 py-3">{item.value}</td>
                  <td className="px-3 py-3">{item.endDate}</td>
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