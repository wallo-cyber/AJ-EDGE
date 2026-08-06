'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Contact } from '../lib/contact-store';
import { createEmptyFollowUp, followUpPriorities, followUpStatuses, followUpTypes, type FollowUp } from '../lib/follow-up-store';

type FollowUpFormProps = {
  initialFollowUp?: FollowUp;
  companyId?: string;
  companyName?: string;
  contactPerson?: string;
  contactOptions?: Contact[];
  onSubmit: (followUp: FollowUp) => void;
  onCancel: () => void;
  submitLabel: string;
};

export function FollowUpForm({ initialFollowUp, companyId, companyName, contactPerson, contactOptions = [], onSubmit, onCancel, submitLabel }: FollowUpFormProps) {
  const [form, setForm] = useState<FollowUp>(() => ({
    ...createEmptyFollowUp(companyId, companyName, contactPerson),
    id: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as FollowUp));

  useEffect(() => {
    if (initialFollowUp) {
      setForm(initialFollowUp);
      return;
    }

    setForm({
      ...createEmptyFollowUp(companyId, companyName, contactPerson),
      id: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as FollowUp);
  }, [companyId, companyName, contactPerson, initialFollowUp]);

  function updateField(key: keyof FollowUp, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleContactSelection(value: string) {
    const selected = contactOptions.find((option) => option.id === value);
    setForm((current) => ({
      ...current,
      contactId: selected?.id,
      contactPerson: selected?.fullName || current.contactPerson,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const followUp: FollowUp = {
      ...form,
      companyId: form.companyId || companyId || '',
      companyName: form.companyName || companyName || '',
      contactPerson: form.contactPerson || contactPerson || '',
      updatedAt: new Date().toISOString(),
      ...(initialFollowUp ? {} : { createdAt: new Date().toISOString() }),
    };

    onSubmit(followUp);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">الشركة</label>
          <input required readOnly={Boolean(companyName)} value={form.companyName} onChange={(event) => updateField('companyName', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">الشخص المسؤول</label>
          {contactOptions.length > 0 ? (
            <select required value={form.contactId ?? ''} onChange={(event) => handleContactSelection(event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
              <option value="">اختر جهة اتصال</option>
              {contactOptions.map((option) => <option key={option.id} value={option.id}>{option.fullName}</option>)}
            </select>
          ) : (
            <input required value={form.contactPerson} onChange={(event) => updateField('contactPerson', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
          )}
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">نوع المتابعة</label>
          <select required value={form.followUpType} onChange={(event) => updateField('followUpType', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            {followUpTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">الأولوية</label>
          <select required value={form.priority} onChange={(event) => updateField('priority', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            {followUpPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">التاريخ</label>
          <input required type="date" value={form.date} onChange={(event) => updateField('date', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">الوقت</label>
          <input required type="time" value={form.time} onChange={(event) => updateField('time', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">الحالة</label>
          <select required value={form.status} onChange={(event) => updateField('status', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            {followUpStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">الموضوع</label>
          <input required value={form.subject} onChange={(event) => updateField('subject', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">ملاحظات</label>
          <textarea required value={form.notes} onChange={(event) => updateField('notes', event.target.value)} className="min-h-24 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">النتيجة</label>
          <input value={form.result} onChange={(event) => updateField('result', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">الإجراء التالي</label>
          <input required value={form.nextAction} onChange={(event) => updateField('nextAction', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">تاريخ المتابعة القادمة</label>
          <input type="date" value={form.nextFollowUpDate} onChange={(event) => updateField('nextFollowUpDate', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-full border border-[#d8c08d] bg-white px-4 py-2.5 text-sm font-semibold text-[#6f6044]">إلغاء</button>
        <button type="submit" className="rounded-full bg-[#2f2417] px-4 py-2.5 text-sm font-semibold text-[#fef8ec]">{submitLabel}</button>
      </div>
    </form>
  );
}
