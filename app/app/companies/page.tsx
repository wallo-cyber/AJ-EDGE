'use client';

import { useEffect, useMemo, useState } from 'react';
import { CompanyActions } from '../../components/company-actions';
import { CompanyForm } from '../../components/company-form';
import { CRMPage } from '../../components/crm-shell';
import { type Company } from '../../lib/company-store';
import { filterItems, paginateItems, searchItems } from '../../lib/crm/search';
import { supabaseCrm } from '../../lib/supabase/crm';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('الكل');
  const [typeFilter, setTypeFilter] = useState('الكل');
  const [sectorFilter, setSectorFilter] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [priorityFilter, setPriorityFilter] = useState('الكل');
  const [contactFilter, setContactFilter] = useState('الكل');
  const [completenessFilter, setCompletenessFilter] = useState('الكل');
  const [vendorFilter, setVendorFilter] = useState('الكل');
  const [outreachFilter, setOutreachFilter] = useState('الكل');
  const [archiveFilter, setArchiveFilter] = useState('نشطة');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    void supabaseCrm.companies.list().then((items) => setCompanies(items as Company[])).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, []);

  const filteredCompanies = useMemo(() => {
    const searched = searchItems(companies, searchTerm, ['companyName', 'contactPerson', 'sector']);
    const filtered = filterItems(searched, {
      city: cityFilter === 'الكل' ? '' : cityFilter,
      companyType: typeFilter === 'الكل' ? '' : typeFilter,
      status: statusFilter === 'الكل' ? '' : statusFilter,
    });
    return [...filtered as Company[]].filter((company) => {
      const completeness = company.dataCompleteness ?? 0;
      return (archiveFilter === 'الكل' || (archiveFilter === 'مؤرشفة' ? Boolean(company.archivedAt) : !company.archivedAt))
        && (sectorFilter === 'الكل' || company.sector === sectorFilter)
        && (priorityFilter === 'الكل' || (company.priority || 'C') === priorityFilter)
        && (contactFilter === 'الكل' || (contactFilter === 'متوفر' ? Boolean(company.contactPerson) : !company.contactPerson))
        && (completenessFilter === 'الكل' || (completenessFilter === 'عالي' ? completeness >= 80 : completenessFilter === 'متوسط' ? completeness >= 50 && completeness < 80 : completeness < 50))
        && (vendorFilter === 'الكل' || (vendorFilter === 'متوفر' ? Boolean(company.vendorRegistrationUrl) : !company.vendorRegistrationUrl))
        && (outreachFilter === 'الكل' || (company.outreachStatus || 'Not Contacted') === outreachFilter);
    }).sort((a,b)=>(a.priority??'C').localeCompare(b.priority??'C')||(b.leadScore??0)-(a.leadScore??0));
  }, [archiveFilter, companies, cityFilter, completenessFilter, contactFilter, outreachFilter, priorityFilter, searchTerm, sectorFilter, statusFilter, typeFilter, vendorFilter]);

  const paginatedCompanies = useMemo(() => paginateItems(filteredCompanies, page, 25), [filteredCompanies, page]);
  const options = useMemo(() => ({
    cities: [...new Set(companies.map((company) => company.city).filter(Boolean))].sort(),
    types: [...new Set(companies.map((company) => company.companyType).filter(Boolean))].sort(),
    sectors: [...new Set(companies.map((company) => company.sector).filter(Boolean))].sort(),
    statuses: [...new Set(companies.map((company) => company.status).filter(Boolean))].sort(),
    outreach: [...new Set(companies.map((company) => company.outreachStatus || 'Not Contacted'))].sort(),
  }), [companies]);

  useEffect(() => { setPage(1); }, [archiveFilter, cityFilter, completenessFilter, contactFilter, outreachFilter, priorityFilter, searchTerm, sectorFilter, statusFilter, typeFilter, vendorFilter]);

  const openNewForm = () => {
    setEditingCompanyId(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCompanyId(null);
  };

  const handleSubmit = async (company: Company) => {
    setError(''); setSuccess('');
    try {
      if (editingCompanyId) {
        const updated = await supabaseCrm.companies.update(editingCompanyId, company);
        setCompanies((items) => items.map((item) => item.id === editingCompanyId ? updated as Company : item));
      } else {
        const created = await supabaseCrm.companies.create({ ...company, communicationHistory: [], followUps: [], opportunities: [] });
        setCompanies((items) => [created as Company, ...items]);
      }
      setSuccess('تم حفظ الشركة بنجاح.'); closeForm();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ الشركة.'); }
  };

  const handleArchive = async (company: Company) => {
    const restoring = Boolean(company.archivedAt);
    if (!window.confirm(restoring ? 'هل تريد استعادة الشركة إلى السجلات النشطة؟' : 'هل تريد أرشفة الشركة؟ ستبقى كل بياناتها محفوظة.')) return;
    try {
      const updated = await supabaseCrm.companies.update(company.id, { ...company, archivedAt: restoring ? '' : new Date().toISOString() });
      setCompanies((items) => items.map((item) => item.id === company.id ? updated as Company : item));
      setSuccess(restoring ? 'تمت استعادة الشركة.' : 'تمت أرشفة الشركة بدون حذف بياناتها.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحديث حالة الأرشفة.'); }
  };

  const handleEdit = (company: Company) => {
    setEditingCompanyId(company.id);
    setIsFormOpen(true);
  };

  const editingCompany = companies.find((company) => company.id === editingCompanyId);

  const setBulkPriority = async (priority: string) => {
    if (!selectedIds.length) return;
    const changed = await Promise.all(companies.filter((company) => selectedIds.includes(company.id)).map((company) => supabaseCrm.companies.update(company.id, { ...company, priority })));
    setCompanies((items) => items.map((item) => changed.find((company) => company.id === item.id) as Company ?? item));
    setSelectedIds([]); setSuccess(`تم تحديث أولوية ${changed.length} شركة.`);
  };

  const markForResearch = async () => {
    if (!selectedIds.length) return;
    const changed = await Promise.all(companies.filter((company) => selectedIds.includes(company.id)).map((company) => supabaseCrm.companies.update(company.id, { ...company, verificationStatus: 'Needs Verification', nextAction: 'Complete missing company data through manual research' })));
    setCompanies((items) => items.map((item) => changed.find((company) => company.id === item.id) as Company ?? item));
    setSelectedIds([]); setSuccess(`تم وضع ${changed.length} شركة ضمن البحث اليدوي.`);
  };

  const exportSelected = () => {
    const rows = companies.filter((company) => selectedIds.includes(company.id));
    if (!rows.length) return;
    const cell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = '\uFEFF' + [['company_name','company_type','sector','city','priority','lead_score','data_completeness','outreach_status'], ...rows.map((company) => [company.companyName,company.companyType,company.sector,company.city,company.priority,company.leadScore,company.dataCompleteness,company.outreachStatus])].map((row) => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `algaeu-companies-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <CRMPage
      title="الشركات"
      description="إدارة الشركات المستهدفة في المنطقة الشرقية مع البحث والتصفية والتواصل والمتابعة."
      action={
        <button
          onClick={openNewForm}
          className="rounded-full bg-[#2f2417] px-5 py-3 text-sm font-semibold text-[#fef8ec]"
        >
          إضافة شركة
        </button>
      }
    >
      {error ? <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-2xl bg-green-50 p-3 text-sm text-green-700">{success}</div> : null}
      {loading ? <div className="rounded-2xl bg-white p-6 text-center text-[#6f6044]">جارٍ تحميل الشركات...</div> : null}
      <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="بحث باسم الشركة أو الشخص المسؤول"
            className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm text-[#2f2417] outline-none"
          />
          <select
            value={cityFilter}
            onChange={(event) => setCityFilter(event.target.value)}
            className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm text-[#2f2417] outline-none"
          >
            <option value="الكل">المدينة: الكل</option>
            {options.cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm text-[#2f2417] outline-none"
          >
            <option value="الكل">النوع: الكل</option>
            {options.types.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm text-[#2f2417] outline-none"
          >
            <option value="الكل">الحالة: الكل</option>
            {options.statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm"><option value="الكل">الأولوية: الكل</option><option value="A">Priority A</option><option value="B">Priority B</option><option value="C">Priority C</option></select>
          <select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm"><option value="الكل">القطاع: الكل</option>{options.sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</select>
          <select value={contactFilter} onChange={(event) => setContactFilter(event.target.value)} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm"><option value="الكل">جهة الاتصال: الكل</option><option value="متوفر">متوفرة</option><option value="مفقود">مفقودة</option></select>
          <select value={completenessFilter} onChange={(event) => setCompletenessFilter(event.target.value)} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm"><option value="الكل">اكتمال البيانات: الكل</option><option value="عالي">80% فأكثر</option><option value="متوسط">50–79%</option><option value="منخفض">أقل من 50%</option></select>
          <select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm"><option value="الكل">تسجيل الموردين: الكل</option><option value="متوفر">بوابة متوفرة</option><option value="مفقود">غير متوفرة</option></select>
          <select value={outreachFilter} onChange={(event) => setOutreachFilter(event.target.value)} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm"><option value="الكل">حالة التواصل: الكل</option>{options.outreach.map((status) => <option key={status} value={status}>{status}</option>)}</select>
          <select value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm"><option value="نشطة">السجلات النشطة</option><option value="مؤرشفة">المؤرشفة</option><option value="الكل">الكل</option></select>
        </div>
      </div>

      {selectedIds.length ? <div className="crm-card flex flex-wrap items-center gap-2 p-3"><strong className="ml-auto text-sm">المحدد: {selectedIds.length}</strong>{['A','B','C'].map((priority) => <button key={priority} onClick={() => void setBulkPriority(priority)} className="rounded-xl border px-3 py-2 text-xs">تعيين Priority {priority}</button>)}<button onClick={() => void markForResearch()} className="rounded-xl border px-3 py-2 text-xs">وضع للبحث</button><button onClick={exportSelected} className="rounded-xl bg-[#2f2417] px-3 py-2 text-xs text-white">تصدير المحدد</button></div> : null}

      {isFormOpen ? (
        <CompanyForm
          initialCompany={editingCompany}
          submitLabel={editingCompany ? 'حفظ التعديلات' : 'إضافة الشركة'}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      ) : null}

      <div className="crm-card overflow-x-auto p-2">
        <table className="min-w-full text-right text-sm text-[#2f2417]">
          <thead>
            <tr className="border-b border-[#ead9b3] text-[#9a7b2f]">
              <th className="px-3 py-3"><input aria-label="تحديد جميع الشركات في الصفحة" type="checkbox" checked={paginatedCompanies.items.length > 0 && paginatedCompanies.items.every((company) => selectedIds.includes(company.id))} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...new Set([...ids, ...paginatedCompanies.items.map((company) => company.id)])] : ids.filter((id) => !paginatedCompanies.items.some((company) => company.id === id)))} /></th>
              <th className="px-3 py-3">الشركة</th>
              <th className="px-3 py-3">الأولوية</th>
              <th className="px-3 py-3">Lead Score</th>
              <th className="px-3 py-3">اكتمال البيانات</th>
              <th className="px-3 py-3">النوع</th>
              <th className="px-3 py-3">المدينة</th>
              <th className="px-3 py-3">صانع القرار</th>
              <th className="px-3 py-3">التواصل</th>
              <th className="px-3 py-3">تسجيل الموردين</th>
              <th className="px-3 py-3">آخر نشاط</th>
              <th className="px-3 py-3">الإجراء التالي</th>
              <th className="px-3 py-3">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-3 py-10 text-center text-[#6f6044]">
                  لا توجد شركات تطابق هذه المعايير بعد.
                </td>
              </tr>
            ) : (
              paginatedCompanies.items.map((company) => (
                <tr key={company.id} className="border-b border-[#f4ebd7] align-top">
                  <td className="px-3 py-3"><input aria-label={`تحديد ${company.companyName}`} type="checkbox" checked={selectedIds.includes(company.id)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, company.id] : ids.filter((id) => id !== company.id))} /></td>
                  <td className="px-3 py-3">
                    <div className="font-semibold">{company.companyName}</div>
                    <div className="mt-1 text-xs text-[#6f6044]">{company.sector || '—'}</div>
                  </td>
                  <td className="px-3 py-3"><span className={`crm-chip ${company.priority === 'A' ? 'bg-amber-100 text-amber-800' : company.priority === 'B' ? 'bg-stone-200 text-stone-700' : 'bg-orange-50 text-orange-700'}`}>Priority {company.priority || 'C'}</span></td>
                  <td className="min-w-32 px-3 py-3"><div className="mb-1 flex justify-between text-xs"><span>الدرجة</span><strong>{company.leadScore || 0}/100</strong></div><div className="crm-progress"><span style={{ width: `${Math.max(0, Math.min(100, company.leadScore || 0))}%` }} /></div></td>
                  <td className="min-w-32 px-3 py-3"><div className="mb-1 flex justify-between text-xs"><span>الملف</span><strong>{company.dataCompleteness || 0}%</strong></div><div className="crm-progress"><span style={{ width: `${Math.max(0, Math.min(100, company.dataCompleteness || 0))}%` }} /></div></td>
                  <td className="px-3 py-3">{company.companyType}</td>
                  <td className="px-3 py-3">{company.city}</td>
                  <td className="px-3 py-3">{company.contactPerson || 'مفقود'}</td>
                  <td className="px-3 py-3"><span className="crm-chip bg-emerald-50 text-emerald-700">{company.outreachStatus || 'Not Contacted'}</span></td>
                  <td className="px-3 py-3">{company.vendorRegistrationUrl ? <a href={company.vendorRegistrationUrl} target="_blank" rel="noreferrer" className="text-[#8d6926] underline">متوفرة</a> : company.vendorRegistrationStatus || 'Not Checked'}</td>
                  <td className="px-3 py-3">{company.lastContact || company.updatedAt?.slice(0,10) || '—'}</td>
                  <td className="max-w-52 px-3 py-3">{company.nextAction || company.nextFollowUp || '—'}</td>
                  <td className="px-3 py-3">
                    <CompanyActions
                      companyId={company.id}
                      onEdit={() => handleEdit(company)}
                      archived={Boolean(company.archivedAt)}
                      onArchive={() => void handleArchive(company)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm text-[#6f6044]"><span>{paginatedCompanies.totalItems} شركة · صفحة {paginatedCompanies.page} من {paginatedCompanies.totalPages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border px-4 py-2 disabled:opacity-40">السابق</button><button disabled={page >= paginatedCompanies.totalPages} onClick={() => setPage((value) => Math.min(paginatedCompanies.totalPages, value + 1))} className="rounded-xl border px-4 py-2 disabled:opacity-40">التالي</button></div></div>
    </CRMPage>
  );
}
