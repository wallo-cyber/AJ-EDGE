'use client';

import { useEffect, useMemo, useState } from 'react';
import { CompanyIntelligenceWorkspace } from './company-intelligence-workspace';
import { FollowUpForm } from './follow-up-form';
import type { Company } from '../lib/company-store';
import { readContacts, type Contact } from '../lib/contact-store';
import { readFollowUps, writeFollowUps, type FollowUp } from '../lib/follow-up-store';

type CompanyDetailsViewProps = {
  company: Company;
};

export function CompanyDetailsView({ company }: CompanyDetailsViewProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'intelligence'>('overview');

  useEffect(() => {
    setContacts(readContacts().filter((contact) => contact.companyId === company.id || contact.companyName === company.companyName));
    setFollowUps(readFollowUps().filter((item) => item.companyId === company.id || item.companyName === company.companyName));
  }, [company.companyName, company.id]);

  const upcomingFollowUps = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return followUps.filter((item) => item.status === 'مجدولة' && item.date >= today);
  }, [followUps]);

  function handleFollowUpSubmit(followUp: FollowUp) {
    const nextFollowUps = [
      { ...followUp, id: followUp.id || crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ...followUps,
    ];

    setFollowUps(nextFollowUps);
    writeFollowUps(nextFollowUps);
    window.dispatchEvent(new CustomEvent('follow-ups:updated', { detail: nextFollowUps }));
    setIsFollowUpOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-2">
        <button onClick={() => setActiveTab('overview')} className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === 'overview' ? 'bg-[#2f2417] text-[#fef8ec]' : 'bg-white text-[#6f6044]'}`}>ملف الشركة</button>
        <button onClick={() => setActiveTab('intelligence')} className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === 'intelligence' ? 'bg-[#2f2417] text-[#fef8ec]' : 'bg-white text-[#6f6044]'}`}>التحليل الذكي</button>
      </div>

      {activeTab === 'intelligence' ? (
        <CompanyIntelligenceWorkspace company={company} />
      ) : (
        <>
      <section className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">معلومات الشركة</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div><p className="text-sm text-[#9a7b2f]">اسم الشركة</p><p className="mt-1 font-semibold text-[#2f2417]">{company.companyName}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">النوع</p><p className="mt-1 font-semibold text-[#2f2417]">{company.companyType}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">القطاع</p><p className="mt-1 font-semibold text-[#2f2417]">{company.sector || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">المدينة</p><p className="mt-1 font-semibold text-[#2f2417]">{company.city}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">الموقع الإلكتروني</p><p className="mt-1 font-semibold text-[#2f2417]">{company.website || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">البريد الإلكتروني العام</p><p className="mt-1 font-semibold text-[#2f2417]">{company.generalEmail || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">الهاتف العام</p><p className="mt-1 font-semibold text-[#2f2417]">{company.generalPhone || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">الحالة</p><p className="mt-1 font-semibold text-[#2f2417]">{company.status}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">آخر تواصل</p><p className="mt-1 font-semibold text-[#2f2417]">{company.lastContact || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">المتابعة القادمة</p><p className="mt-1 font-semibold text-[#2f2417]">{company.nextFollowUp || '—'}</p></div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#ead9b3] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[#2f2417]">جهات الاتصال</h3>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-3 py-1.5 text-xs font-semibold text-[#6f6044]">إضافة جهة اتصال</button>
            <button onClick={() => setIsFollowUpOpen(true)} className="rounded-full border border-[#d8c08d] bg-[#f8efe0] px-3 py-1.5 text-xs font-semibold text-[#2f2417]">إضافة متابعة</button>
            <button className="rounded-full border border-[#d8c08d] bg-[#fff0e0] px-3 py-1.5 text-xs font-semibold text-[#9a4b2d]">إنشاء رسالة</button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div><p className="text-sm text-[#9a7b2f]">الشخص المسؤول</p><p className="mt-1 font-semibold text-[#2f2417]">{company.contactPerson || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">المنصب</p><p className="mt-1 font-semibold text-[#2f2417]">{company.position || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">الجوال</p><p className="mt-1 font-semibold text-[#2f2417]">{company.mobile || '—'}</p></div>
          <div><p className="text-sm text-[#9a7b2f]">LinkedIn</p><p className="mt-1 font-semibold text-[#2f2417]">{company.linkedIn || '—'}</p></div>
        </div>
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-[#2f2417]">الجهات المرتبطة</h4>
          <ul className="mt-3 space-y-2 text-sm text-[#6f6044]">
            {contacts.length > 0 ? contacts.map((contact) => <li key={contact.id} className="rounded-2xl border border-[#ead9b3] bg-[#fdf8ee] p-3">{contact.fullName} • {contact.department} • {contact.mobile || '—'}</li>) : <li>لا توجد جهات اتصال مرتبطة بعد.</li>}
          </ul>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#ead9b3] bg-white p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">السجل التواصل</h3>
        <ul className="mt-3 space-y-2 text-sm text-[#6f6044]">
          {company.communicationHistory.length > 0 ? company.communicationHistory.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-[#ead9b3] bg-[#fdf8ee] p-3">{entry.date} • {entry.type}: {entry.content}</li>
          )) : <li>لا توجد سجلات تواصل بعد.</li>}
        </ul>
      </section>

      <section className="rounded-[24px] border border-[#ead9b3] bg-white p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">المتابعات القادمة</h3>
        <ul className="mt-3 space-y-2 text-sm text-[#6f6044]">
          {upcomingFollowUps.length > 0 ? upcomingFollowUps.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-[#ead9b3] bg-[#fdf8ee] p-3">{entry.date} • {entry.followUpType} • {entry.subject || 'بدون موضوع'}</li>
          )) : <li>لا توجد متابعات قادمة بعد.</li>}
        </ul>
      </section>

      {isFollowUpOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2f2417]/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[30px] border border-[#ead9b3] bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-[#2f2417]">إضافة متابعة</h3>
              <button onClick={() => setIsFollowUpOpen(false)} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-3 py-1.5 text-sm text-[#6f6044]">إغلاق</button>
            </div>
            <FollowUpForm
              companyId={company.id}
              companyName={company.companyName}
              contactPerson={company.contactPerson}
              contactOptions={contacts}
              onSubmit={handleFollowUpSubmit}
              onCancel={() => setIsFollowUpOpen(false)}
              submitLabel="حفظ المتابعة"
            />
          </div>
        </div>
      ) : null}

      <section className="rounded-[24px] border border-[#ead9b3] bg-white p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">الفرص</h3>
        <ul className="mt-3 space-y-2 text-sm text-[#6f6044]">
          {company.opportunities.length > 0 ? company.opportunities.map((item, index) => <li key={`${item}-${index}`} className="rounded-2xl border border-[#ead9b3] bg-[#fdf8ee] p-3">{item}</li>) : <li>لا توجد فرص بعد.</li>}
        </ul>
      </section>

      <section className="rounded-[24px] border border-[#ead9b3] bg-white p-5">
        <h3 className="text-lg font-semibold text-[#2f2417]">ملاحظات</h3>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#6f6044]">{company.notes || '—'}</p>
      </section>
        </>
      )}
    </div>
  );
}
