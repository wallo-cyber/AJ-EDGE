'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createEmptyContract, contractStatuses, type Contract } from '../lib/contract-store';

type ContractFormProps = {
  initialContract?: Contract;
  companyId?: string;
  companyName?: string;
  onSubmit: (contract: Contract) => void;
  onCancel: () => void;
  submitLabel: string;
};

export function ContractForm({ initialContract, companyId, companyName, onSubmit, onCancel, submitLabel }: ContractFormProps) {
  const [form, setForm] = useState<Contract>(() => ({
    ...createEmptyContract(companyId, companyName),
    id: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Contract));

  useEffect(() => {
    if (initialContract) {
      setForm(initialContract);
      return;
    }
    setForm({
      ...createEmptyContract(companyId, companyName),
      id: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Contract);
  }, [companyId, companyName, initialContract]);

  function updateField(key: keyof Contract, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contract: Contract = {
      ...form,
      companyId: form.companyId || companyId || '',
      companyName: form.companyName || companyName || '',
      updatedAt: new Date().toISOString(),
      ...(initialContract ? {} : { createdAt: new Date().toISOString() }),
    };
    onSubmit(contract);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">الشركة</label>
          <input required readOnly={Boolean(companyName)} value={form.companyName} onChange={(event) => updateField('companyName', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">رقم العقد</label>
          <input required value={form.contractNumber} onChange={(event) => updateField('contractNumber', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">عنوان العقد</label>
          <input required value={form.title} onChange={(event) => updateField('title', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">القيمة (ريال)</label>
          <input required type="number" value={form.value} onChange={(event) => updateField('value', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">الحالة</label>
          <select required value={form.status} onChange={(event) => updateField('status', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            {contractStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">تاريخ البداية</label>
          <input required type="date" value={form.startDate} onChange={(event) => updateField('startDate', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">تاريخ الانتهاء</label>
          <input required type="date" value={form.endDate} onChange={(event) => updateField('endDate', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">تذكير قبل الانتهاء بتاريخ</label>
          <input type="date" value={form.renewalReminderDate} onChange={(event) => updateField('renewalReminderDate', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">ملاحظات</label>
          <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} className="min-h-24 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-full border border-[#d8c08d] bg-white px-4 py-2.5 text-sm font-semibold text-[#6f6044]">إلغاء</button>
        <button type="submit" className="rounded-full bg-[#2f2417] px-4 py-2.5 text-sm font-semibold text-[#fef8ec]">{submitLabel}</button>
      </div>
    </form>
  );
}