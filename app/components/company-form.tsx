'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { companyCities, companyStatuses, companyTypes, createEmptyCompany, type Company } from '../lib/company-store';

type CompanyFormProps = {
  initialCompany?: Company;
  onSubmit: (company: Company) => void;
  onCancel: () => void;
  submitLabel: string;
};

const fields: Array<{
  key: keyof Company;
  label: string;
  type: 'text' | 'select' | 'email' | 'date' | 'textarea';
  options?: readonly string[];
}> = [
  { key: 'companyName', label: 'اسم الشركة', type: 'text' },
  { key: 'companyType', label: 'نوع الشركة', type: 'select', options: companyTypes },
  { key: 'sector', label: 'القطاع', type: 'text' },
  { key: 'city', label: 'المدينة', type: 'select', options: companyCities },
  { key: 'website', label: 'الموقع الإلكتروني', type: 'text' },
  { key: 'generalEmail', label: 'البريد الإلكتروني العام', type: 'email' },
  { key: 'generalPhone', label: 'الهاتف العام', type: 'text' },
  { key: 'contactPerson', label: 'الشخص المسؤول', type: 'text' },
  { key: 'position', label: 'المنصب', type: 'text' },
  { key: 'mobile', label: 'الجوال', type: 'text' },
  { key: 'linkedIn', label: 'LinkedIn', type: 'text' },
  { key: 'serviceOpportunity', label: 'فرصة الخدمة', type: 'text' },
  { key: 'status', label: 'الحالة', type: 'select', options: companyStatuses },
  { key: 'lastContact', label: 'آخر تواصل', type: 'date' },
  { key: 'nextFollowUp', label: 'المتابعة القادمة', type: 'date' },
  { key: 'notes', label: 'ملاحظات', type: 'textarea' },
];

export function CompanyForm({ initialCompany, onSubmit, onCancel, submitLabel }: CompanyFormProps) {
  const [form, setForm] = useState(() => {
    if (initialCompany) {
      return initialCompany;
    }

    return {
      ...createEmptyCompany(),
      id: '',
      communicationHistory: [],
      followUps: [],
      opportunities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies Company;
  });

  useEffect(() => {
    if (initialCompany) {
      setForm(initialCompany);
    }
  }, [initialCompany]);

  function updateField(key: keyof Company, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const company: Company = {
      ...form,
      companyName: form.companyName.trim(),
      sector: form.sector.trim(),
      contactPerson: form.contactPerson.trim(),
      updatedAt: new Date().toISOString(),
      ...(initialCompany ? {} : { createdAt: new Date().toISOString() }),
    };

    onSubmit(company);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5">
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const value = form[field.key as keyof Company] as string;
          const baseClass = 'w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm text-[#2f2417] outline-none focus:border-[#9a7b2f]';

          if (field.type === 'textarea') {
            return (
              <div key={field.key} className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-[#2f2417]">{field.label}</label>
                <textarea
                  required={field.key === 'companyName' || field.key === 'contactPerson' || field.key === 'notes'}
                  value={value}
                  onChange={(event) => updateField(field.key as keyof Company, event.target.value)}
                  className={`${baseClass} min-h-24`}
                />
              </div>
            );
          }

          if (field.type === 'select') {
            return (
              <div key={field.key}>
                <label className="mb-2 block text-sm font-semibold text-[#2f2417]">{field.label}</label>
                <select
                  required={field.key === 'companyType' || field.key === 'city' || field.key === 'status'}
                  value={value}
                  onChange={(event) => updateField(field.key as keyof Company, event.target.value)}
                  className={baseClass}
                >
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return (
            <div key={field.key}>
              <label className="mb-2 block text-sm font-semibold text-[#2f2417]">{field.label}</label>
              <input
                type={field.type}
                value={value}
                onChange={(event) => updateField(field.key as keyof Company, event.target.value)}
                className={baseClass}
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[#d8c08d] bg-white px-4 py-2.5 text-sm font-semibold text-[#6f6044]"
        >
          إلغاء
        </button>
        <button
          type="submit"
          className="rounded-full bg-[#2f2417] px-4 py-2.5 text-sm font-semibold text-[#fef8ec]"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
