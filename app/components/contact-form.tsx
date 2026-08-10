'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { contactDepartments, decisionLevels, preferredMethods, createEmptyContact, type Contact } from '../lib/contact-store';

type ContactFormProps = {
  initialContact?: Contact;
  companyId?: string;
  companyName?: string;
  onSubmit: (contact: Contact) => void;
  onCancel: () => void;
  submitLabel: string;
};

export function ContactForm({ initialContact, companyId, companyName, onSubmit, onCancel, submitLabel }: ContactFormProps) {
  const [form, setForm] = useState<Contact>(() => {
    const base = createEmptyContact(companyId, companyName);
    return {
      ...base,
      id: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Contact;
  });

  useEffect(() => {
    if (initialContact) {
      setForm(initialContact);
      return;
    }

    setForm({
      ...createEmptyContact(companyId, companyName),
      id: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Contact);
  }, [companyId, companyName, initialContact]);

  function updateField(key: keyof Contact, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const contact: Contact = {
      ...form,
      companyId: form.companyId || companyId || '',
      companyName: form.companyName || companyName || '',
      fullName: form.fullName.trim(),
      position: form.position.trim(),
      updatedAt: new Date().toISOString(),
      ...(initialContact ? {} : { createdAt: new Date().toISOString() }),
    };

    onSubmit(contact);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">الاسم الكامل</label>
          <input required value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">الشركة</label>
          <input value={form.companyName} onChange={(event) => updateField('companyName', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">المنصب</label>
          <input value={form.position} onChange={(event) => updateField('position', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">القسم</label>
          <select value={form.department} onChange={(event) => updateField('department', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            {contactDepartments.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">الجوال</label>
          <input value={form.mobile} onChange={(event) => updateField('mobile', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">البريد الإلكتروني</label>
          <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">LinkedIn</label>
          <input value={form.linkedIn} onChange={(event) => updateField('linkedIn', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">مستوى القرار</label>
          <select value={form.decisionLevel} onChange={(event) => updateField('decisionLevel', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            {decisionLevels.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2f2417]">طريقة التواصل المفضلة</label>
          <select value={form.preferredContactMethod} onChange={(event) => updateField('preferredContactMethod', event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            {preferredMethods.map((method) => <option key={method} value={method}>{method}</option>)}
          </select>
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
