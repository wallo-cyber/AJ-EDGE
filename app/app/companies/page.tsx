'use client';

import { useEffect, useMemo, useState } from 'react';
import { CompanyActions } from '../../components/company-actions';
import { CompanyForm } from '../../components/company-form';
import { CRMPage } from '../../components/crm-shell';
import { companyCities, companyStatuses, companyTypes, type Company, type CompanyCity, type CompanyStatus, type CompanyType } from '../../lib/company-store';
import { crmServices } from '../../lib/crm/services';
import { filterItems, paginateItems, searchItems, sortItems } from '../../lib/crm/search';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState<CompanyCity | 'الكل'>('الكل');
  const [typeFilter, setTypeFilter] = useState<CompanyType | 'الكل'>('الكل');
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | 'الكل'>('الكل');

  useEffect(() => {
    setCompanies(crmServices.companies.list() as Company[]);
  }, []);

  const filteredCompanies = useMemo(() => {
    const searched = searchItems(companies, searchTerm, ['companyName', 'contactPerson', 'sector']);
    const filtered = filterItems(searched, {
      city: cityFilter === 'الكل' ? '' : cityFilter,
      companyType: typeFilter === 'الكل' ? '' : typeFilter,
      status: statusFilter === 'الكل' ? '' : statusFilter,
    });
    return sortItems(filtered as Company[], 'companyName' as keyof Company, 'asc');
  }, [companies, cityFilter, searchTerm, statusFilter, typeFilter]);

  const paginatedCompanies = useMemo(() => paginateItems(filteredCompanies, 1, 50), [filteredCompanies]);

  const openNewForm = () => {
    setEditingCompanyId(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCompanyId(null);
  };

  const handleSubmit = (company: Company) => {
    const nextCompanies = editingCompanyId
      ? companies.map((item) => (item.id === editingCompanyId ? { ...item, ...company } : item))
      : [{
          ...company,
          id: crypto.randomUUID(),
          communicationHistory: [],
          followUps: [],
          opportunities: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, ...companies];

    setCompanies(nextCompanies);
    crmServices.companies.replace(nextCompanies as never);
    closeForm();
  };

  const handleDelete = (companyId: string) => {
    const nextCompanies = companies.filter((company) => company.id !== companyId);
    setCompanies(nextCompanies);
    crmServices.companies.replace(nextCompanies as never);
  };

  const handleEdit = (company: Company) => {
    setEditingCompanyId(company.id);
    setIsFormOpen(true);
  };

  const editingCompany = companies.find((company) => company.id === editingCompanyId);

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
      <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="بحث باسم الشركة أو الشخص المسؤول"
            className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm text-[#2f2417] outline-none"
          />
          <select
            value={cityFilter}
            onChange={(event) => setCityFilter(event.target.value as CompanyCity | 'الكل')}
            className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm text-[#2f2417] outline-none"
          >
            <option value="الكل">المدينة: الكل</option>
            {companyCities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as CompanyType | 'الكل')}
            className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm text-[#2f2417] outline-none"
          >
            <option value="الكل">النوع: الكل</option>
            {companyTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as CompanyStatus | 'الكل')}
            className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm text-[#2f2417] outline-none"
          >
            <option value="الكل">الحالة: الكل</option>
            {companyStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {isFormOpen ? (
        <CompanyForm
          initialCompany={editingCompany}
          submitLabel={editingCompany ? 'حفظ التعديلات' : 'إضافة الشركة'}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      ) : null}

      <div className="overflow-x-auto rounded-[24px] border border-[#ead9b3] bg-white p-3">
        <table className="min-w-full text-right text-sm text-[#2f2417]">
          <thead>
            <tr className="border-b border-[#ead9b3] text-[#9a7b2f]">
              <th className="px-3 py-3">الشركة</th>
              <th className="px-3 py-3">النوع</th>
              <th className="px-3 py-3">المدينة</th>
              <th className="px-3 py-3">الشخص المسؤول</th>
              <th className="px-3 py-3">الحالة</th>
              <th className="px-3 py-3">المتابعة القادمة</th>
              <th className="px-3 py-3">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[#6f6044]">
                  لا توجد شركات تطابق هذه المعايير بعد.
                </td>
              </tr>
            ) : (
              filteredCompanies.map((company) => (
                <tr key={company.id} className="border-b border-[#f4ebd7] align-top">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{company.companyName}</div>
                    <div className="mt-1 text-xs text-[#6f6044]">{company.sector || '—'}</div>
                  </td>
                  <td className="px-3 py-3">{company.companyType}</td>
                  <td className="px-3 py-3">{company.city}</td>
                  <td className="px-3 py-3">{company.contactPerson || '—'}</td>
                  <td className="px-3 py-3">{company.status}</td>
                  <td className="px-3 py-3">{company.nextFollowUp || '—'}</td>
                  <td className="px-3 py-3">
                    <CompanyActions
                      companyId={company.id}
                      onEdit={() => handleEdit(company)}
                      onDelete={() => handleDelete(company.id)}
                      onCreateOutreach={() => {
                        const nextCompanies: Company[] = companies.map((item) => {
                          if (item.id !== company.id) {
                            return item;
                          }

                          return {
                            ...item,
                            communicationHistory: [
                              ...item.communicationHistory,
                              {
                                id: crypto.randomUUID(),
                                type: 'رسالة' as const,
                                content: 'تم إنشاء رسالة تواصل',
                                date: new Date().toISOString().slice(0, 10),
                              },
                            ],
                            updatedAt: new Date().toISOString(),
                          };
                        });
                        setCompanies(nextCompanies);
                        crmServices.companies.replace(nextCompanies as never);
                      }}
                      onAddFollowUp={() => {
                        const nextCompanies: Company[] = companies.map((item) => {
                          if (item.id !== company.id) {
                            return item;
                          }

                          return {
                            ...item,
                            followUps: [
                              ...item.followUps,
                              {
                                id: crypto.randomUUID(),
                                date: new Date().toISOString().slice(0, 10),
                                note: 'تمت إضافة متابعة جديدة',
                              },
                            ],
                            updatedAt: new Date().toISOString(),
                          };
                        });
                        setCompanies(nextCompanies);
                        crmServices.companies.replace(nextCompanies as never);
                      }}
                    />
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
