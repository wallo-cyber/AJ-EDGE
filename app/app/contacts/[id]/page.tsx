'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CRMPage } from '../../../components/crm-shell';
import type { Contact } from '../../../lib/contact-store';
import { supabaseCrm } from '../../../lib/supabase/crm';

export default function ContactDetailPage() {
  const params = useParams();
  const id = String(params.id ?? '');
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void supabaseCrm.contacts.list()
      .then(rows => {
        const found = (rows as Contact[]).find(row => row.id === id) ?? null;
        setContact(found);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'تعذر تحميل جهة الاتصال.'))
      .finally(() => setLoading(false));
  }, [id]);

  const phoneOf = (c: Contact) => c.mobile || (c as unknown as { phone?: string }).phone || '';

  return (
    <CRMPage title={contact?.fullName || 'جهة اتصال'} description="التفاصيل الكاملة لجهة الاتصال.">
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <div className="crm-empty animate-pulse">جارٍ التحميل...</div>
      ) : !contact ? (
        <div className="crm-empty">لم يتم العثور على جهة الاتصال.</div>
      ) : (
        <section className="crm-card p-5">
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <div><dt className="text-[#75664d]">الاسم</dt><dd className="font-bold">{contact.fullName}</dd></div>
            <div><dt className="text-[#75664d]">الشركة</dt><dd>{contact.companyName || '—'}</dd></div>
            <div><dt className="text-[#75664d]">المنصب</dt><dd>{contact.position || '—'}</dd></div>
            <div><dt className="text-[#75664d]">القسم</dt><dd>{contact.department || '—'}</dd></div>
            <div><dt className="text-[#75664d]">البريد</dt><dd dir="ltr">{contact.email || '—'}</dd></div>
            <div><dt className="text-[#75664d]">الجوال</dt><dd dir="ltr">{phoneOf(contact) || '—'}</dd></div>
            <div><dt className="text-[#75664d]">صانع قرار</dt><dd>{contact.decisionMaker ? 'نعم' : 'لا'}</dd></div>
            <div><dt className="text-[#75664d]">حالة التحقق</dt><dd>{contact.verificationStatus || 'UNVERIFIED'}</dd></div>
            <div><dt className="text-[#75664d]">المصدر</dt><dd>{contact.source || '—'}</dd></div>
            <div><dt className="text-[#75664d]">رابط الدليل</dt><dd>{contact.sourceUrl ? <a href={contact.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">فتح الرابط</a> : '—'}</dd></div>
            <div><dt className="text-[#75664d]">الثقة</dt><dd>{contact.confidence || 0}%</dd></div>
          </dl>
        </section>
      )}
    </CRMPage>
  );
}
