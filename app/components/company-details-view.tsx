'use client';

import { useEffect, useMemo, useState } from 'react';
import { CompanyIntelligenceWorkspace } from './company-intelligence-workspace';
import { FollowUpForm } from './follow-up-form';
import type { Company } from '../lib/company-store';
import { type Contact } from '../lib/contact-store';
import { type FollowUp } from '../lib/follow-up-store';
import { supabaseCrm } from '../lib/supabase/crm';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

type CompanyDetailsViewProps = {
  company: Company;
};

export function CompanyDetailsView({ company }: CompanyDetailsViewProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [operational, setOperational] = useState<Record<string, SimpleRow[]>>({});
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'intelligence'>('overview');

  useEffect(() => {
    void Promise.all([supabaseCrm.contacts.list(), supabaseCrm.followUps.list(), ...['messages', 'meetings', 'opportunities', 'audit_events', 'agent_logs', 'agent_jobs'].map((table) => simpleCrud.list(table))]).then(([contactItems, followUpItems, messages, meetings, opportunities, auditEvents, agentLogs, agentJobs]) => {
      setContacts(contactItems.filter((contact) => contact.companyId === company.id || contact.companyName === company.companyName) as Contact[]);
      setFollowUps(followUpItems.filter((item) => item.companyId === company.id || item.companyName === company.companyName) as FollowUp[]);
      const companyJobIds = new Set(agentJobs.filter((item) => item.company_id === company.id).map((item) => String(item.id)));
      setOperational({ messages: messages.filter((item) => item.company_id === company.id), meetings: meetings.filter((item) => item.company_id === company.id), opportunities: opportunities.filter((item) => item.company_id === company.id), audit_events: auditEvents.filter((item) => item.company_id === company.id), agent_logs: agentLogs.filter((item) => companyJobIds.has(String(item.job_id ?? ''))) });
    });
  }, [company.companyName, company.id]);

  const upcomingFollowUps = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return followUps.filter((item) => item.status === 'مجدولة' && item.date >= today);
  }, [followUps]);

  async function handleFollowUpSubmit(followUp: FollowUp) {
    const created = await supabaseCrm.followUps.create({ ...followUp, companyId: company.id, companyName: company.companyName });
    setFollowUps((items) => [created as FollowUp, ...items]);
    setIsFollowUpOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-2">
        <button onClick={() => setActiveTab('overview')} className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === 'overview' ? 'bg-[#2f2417] text-[#fef8ec]' : 'bg-white text-[#6f6044]'}`}>ملف الشركة</button>
        <button onClick={() => setActiveTab('intelligence')} className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === 'intelligence' ? 'bg-[#2f2417] text-[#fef8ec]' : 'bg-white text-[#6f6044]'}`}>التحليل الذكي</button>
      </div>

      <section className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5"><div className="grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-[#6f6044]">Priority</p><strong className="text-2xl">{company.priority||'C'}</strong></div><div><p className="text-xs text-[#6f6044]">Lead Score</p><strong className="text-2xl">{company.leadScore||0}/100</strong></div><div><p className="text-xs text-[#6f6044]">Data Completeness</p><strong className="text-2xl">{company.dataCompleteness||0}%</strong></div></div>{company.scoreReasons?.length?<ul className="mt-3 text-sm text-[#6f6044]">{company.scoreReasons.map(reason=><li key={reason}>+ {reason}</li>)}</ul>:null}{company.missingFields?.length?<p className="mt-3 text-sm text-red-700">البيانات الناقصة: {company.missingFields.join('، ')}</p>:null}</section>

      <section className="rounded-[24px] border border-[#ead9b3] bg-white p-5">
        <h3 className="text-lg font-semibold">مركز العمل على الشركة</h3>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <a target="_blank" rel="noreferrer" href={`https://www.google.com/search?q=${encodeURIComponent(company.companyName)}`} className="rounded-full border px-3 py-2">بحث الشركة</a>
          <a target="_blank" rel="noreferrer" href={`https://www.google.com/search?q=${encodeURIComponent(company.companyName)}+procurement+manager`} className="rounded-full border px-3 py-2">مسؤول المشتريات</a>
          <a target="_blank" rel="noreferrer" href={`https://www.google.com/search?q=${encodeURIComponent(company.companyName)}+projects+manager`} className="rounded-full border px-3 py-2">مسؤول المشاريع</a>
          <a target="_blank" rel="noreferrer" href={`https://www.google.com/search?q=${encodeURIComponent(company.companyName)}+vendor+registration`} className="rounded-full border px-3 py-2">تسجيل الموردين</a>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div><p className="text-xs">المسودات</p><strong>{operational.messages?.filter((item) => ['Draft', 'Approved'].includes(String(item.status))).length ?? 0}</strong></div>
          <div><p className="text-xs">الاجتماعات</p><strong>{operational.meetings?.length ?? 0}</strong></div>
          <div><p className="text-xs">الفرص</p><strong>{operational.opportunities?.length ?? 0}</strong></div>
          <div><p className="text-xs">سجل التدقيق</p><strong>{operational.audit_events?.length ?? 0}</strong></div>
        </div>
        {operational.messages?.[0] ? <div className="mt-4 rounded-2xl bg-[#fdf8ee] p-3"><p className="text-xs">أول مسودة جاهزة للمراجعة</p><p className="mt-2 whitespace-pre-wrap text-sm">{String(operational.messages[0].body ?? '')}</p></div> : null}
      </section>

      <section className="rounded-[24px] border border-[#ead9b3] bg-white p-5"><h3 className="text-lg font-semibold">Agent Activity Timeline</h3><div className="mt-3 space-y-2 text-xs">{operational.agent_logs?.slice(0, 10).map((item) => <div key={item.id} className="rounded-xl bg-[#fdf8ee] p-3"><span className="text-[#9a7b2f]">{String(item.created_at ?? '')} · {String(item.agent_name ?? '')}</span><p>{String(item.message ?? '')}</p></div>)}{!operational.agent_logs?.length && <p>لا يوجد نشاط للوكلاء على هذه الشركة بعد.</p>}</div></section>

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
