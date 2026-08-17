'use client';
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ContactForm } from '../../components/contact-form';
import { CRMPage } from '../../components/crm-shell';
import type { Company } from '../../lib/company-store';
import type { Contact, ContactDepartment, ContactDecisionLevel } from '../../lib/contact-store';
import { supabaseCrm } from '../../lib/supabase/crm';

const ALL = 'الكل';

export default function ContactsPage() {
  const params = useSearchParams();
  const requestedCompanyId = params.get('company_id') ?? '';
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState(ALL);
  const [department, setDepartment] = useState<ContactDepartment | typeof ALL>(ALL);
  const [decisionLevel, setDecisionLevel] = useState<ContactDecisionLevel | typeof ALL>(ALL);
  const [verification, setVerification] = useState(ALL);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { void supabaseCrm.companies.list().then(rows => { const loaded=rows as Company[]; setCompanies(loaded); if(requestedCompanyId&&loaded.some(company=>company.id===requestedCompanyId)){setCompanyId(requestedCompanyId);setShowForm(true);} }).catch(reason => setError(reason.message)); }, [requestedCompanyId]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true); setError('');
      void supabaseCrm.contacts.page(page, 25, { search, companyId: companyId === ALL ? '' : companyId, department: department === ALL ? '' : department, decisionLevel: decisionLevel === ALL ? '' : decisionLevel, verificationStatus: verification === ALL ? '' : verification })
        .then(result => { setContacts(result.rows as Contact[]); setTotal(result.count); })
        .catch(reason => setError(reason.message)).finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [companyId, decisionLevel, department, page, search, verification]);

  const refresh = async () => { const result = await supabaseCrm.contacts.page(page, 25, { search, companyId: companyId === ALL ? '' : companyId, department: department === ALL ? '' : department, decisionLevel: decisionLevel === ALL ? '' : decisionLevel, verificationStatus: verification === ALL ? '' : verification }); setContacts(result.rows as Contact[]); setTotal(result.count); };
  const save = async (contact: Contact) => {
    if (contact.decisionMaker && contact.verificationStatus === 'VERIFIED' && !contact.sourceUrl?.trim() && !contact.source?.trim()) {
      setError('لا يمكن اعتماد صانع قرار كموثق دون مصدر أو رابط دليل.');
      return;
    }
    const company = companies.find(item => item.id === contact.companyId || item.companyName === contact.companyName);
    const payload = { ...contact, companyId: company?.id ?? contact.companyId, companyName: company?.companyName ?? contact.companyName };
    try { if (editing) await supabaseCrm.contacts.update(editing.id, payload); else await supabaseCrm.contacts.create(payload); setNotice('تم حفظ جهة الاتصال في Supabase.'); setShowForm(false); setEditing(null); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ جهة الاتصال.'); }
  };
  const archive = async (contact: Contact) => { if (!window.confirm('أرشفة جهة الاتصال مع الاحتفاظ بسجلها؟')) return; try { await supabaseCrm.contacts.update(contact.id, { ...contact, archivedAt: new Date().toISOString() }); setNotice('تمت الأرشفة دون حذف.'); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذرت الأرشفة.'); } };
  const pages = Math.max(1, Math.ceil(total / 25));

  return <CRMPage title="جهات الاتصال" description="الأشخاص المرتبطون بالشركات، مع حالة مستقلة لصانع القرار والتحقق ومصدر الدليل." action={<button onClick={() => { setEditing(null); setShowForm(true); }} className="rounded-full bg-[#2f2417] px-5 py-3 text-sm font-semibold text-white">إضافة جهة اتصال</button>}>
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    <div className="crm-card grid gap-3 p-4 md:grid-cols-5">
      <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="بحث بالاسم أو البريد أو المنصب" className="rounded-xl border p-2.5" />
      <select value={companyId} onChange={event => { setCompanyId(event.target.value); setPage(1); }} className="rounded-xl border p-2.5"><option value={ALL}>الشركة: الكل</option>{companies.map(company => <option key={company.id} value={company.id}>{company.companyName}</option>)}</select>
      <select value={department} onChange={event => { setDepartment(event.target.value as ContactDepartment | typeof ALL); setPage(1); }} className="rounded-xl border p-2.5"><option value={ALL}>القسم: الكل</option>{['الإدارة العامة','المشاريع','المشتريات','الصيانة','التشغيل','العقود','الهندسة','المالية'].map(value => <option key={value}>{value}</option>)}</select>
      <select value={decisionLevel} onChange={event => { setDecisionLevel(event.target.value as ContactDecisionLevel | typeof ALL); setPage(1); }} className="rounded-xl border p-2.5"><option value={ALL}>مستوى القرار: الكل</option>{['Primary','Influencer','Procurement','Projects','Engineering','Management','Unknown'].map(value => <option key={value}>{value}</option>)}</select>
      <select value={verification} onChange={event => { setVerification(event.target.value); setPage(1); }} className="rounded-xl border p-2.5"><option value={ALL}>التحقق: الكل</option><option>VERIFIED</option><option>PARTIALLY_VERIFIED</option><option>UNVERIFIED</option></select>
    </div>
    {showForm && <ContactForm initialContact={editing ?? undefined} companyId={editing?.companyId||(companyId===ALL?'':companyId)} companyName={editing?.companyName||companies.find(company=>company.id===companyId)?.companyName} onSubmit={save} onCancel={() => { setShowForm(false); setEditing(null); }} submitLabel={editing ? 'حفظ التعديلات' : 'إضافة جهة اتصال'} />}
    {loading ? <div className="crm-empty animate-pulse">جارٍ تحميل جهات الاتصال...</div> : contacts.length === 0 ? <div className="crm-empty"><h3 className="font-bold text-[#2f2417]">لا توجد جهات اتصال موثقة بعد</h3><p className="mx-auto mt-2 max-w-2xl text-sm">لن ينشئ نوفافيرك أشخاصاً أو صناع قرار دون مصدر ودليل. ابدأ من شركة محددة ثم وثّق الشخص الصحيح.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary">إضافة جهة اتصال</button><a href="/companies?view=missing-dm" className="btn-secondary">الشركات التي تحتاج صانع قرار</a><a href="/research?tab=manual" className="btn-ghost">بدء بحث يدوي</a></div></div> : <>
      <div className="hidden overflow-x-auto rounded-2xl border bg-white md:block"><table className="min-w-full text-right text-sm"><thead><tr><th className="p-3">الاسم</th><th className="p-3">الشركة</th><th className="p-3">المنصب</th><th className="p-3">صانع قرار</th><th className="p-3">التحقق</th><th className="p-3">الإجراءات</th></tr></thead><tbody>{contacts.map(contact => <tr key={contact.id} className="border-t"><td className="p-3 font-bold">{contact.fullName}</td><td className="p-3">{contact.companyName || '—'}</td><td className="p-3">{contact.position || '—'}</td><td className="p-3">{contact.decisionMaker ? 'نعم' : 'لا'}</td><td className="p-3"><span className="crm-chip bg-amber-50">{contact.verificationStatus || 'UNVERIFIED'}</span></td><td className="p-3"><Actions contact={contact} view={setSelected} edit={value => { setEditing(value); setShowForm(true); }} archive={archive} /></td></tr>)}</tbody></table></div>
      <div className="grid gap-3 md:hidden">{contacts.map(contact => <article key={contact.id} className="crm-card p-4"><div className="flex items-start justify-between gap-2"><div><strong>{contact.fullName}</strong><p className="text-xs text-[#75664d]">{contact.companyName || 'بدون شركة'} · {contact.position || 'بدون منصب'}</p></div><span className="crm-chip bg-amber-50">{contact.verificationStatus || 'UNVERIFIED'}</span></div><p className="mt-3 text-sm">صانع قرار موثق: {contact.decisionMaker && contact.verificationStatus === 'VERIFIED' ? 'نعم' : 'لا'}</p><div className="mt-3"><Actions contact={contact} view={setSelected} edit={value => { setEditing(value); setShowForm(true); }} archive={archive} /></div></article>)}</div>
    </>}
    <div className="flex items-center justify-between text-sm"><span>{total} جهة اتصال · صفحة {page} من {pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="rounded-xl border px-4 py-2 disabled:opacity-40">السابق</button><button disabled={page >= pages} onClick={() => setPage(value => value + 1)} className="rounded-xl border px-4 py-2 disabled:opacity-40">التالي</button></div></div>
    {selected && <section className="crm-card p-5"><div className="flex justify-between"><h3 className="font-bold">{selected.fullName}</h3><button onClick={() => setSelected(null)}>إغلاق</button></div><dl className="mt-4 grid gap-3 text-sm md:grid-cols-2"><div><dt className="text-[#75664d]">البريد</dt><dd dir="ltr">{selected.email || '—'}</dd></div><div><dt className="text-[#75664d]">الجوال</dt><dd dir="ltr">{selected.mobile || '—'}</dd></div><div><dt className="text-[#75664d]">المصدر</dt><dd>{selected.source || '—'}</dd></div><div><dt className="text-[#75664d]">الثقة</dt><dd>{selected.confidence || 0}%</dd></div></dl></section>}
  </CRMPage>;
}

function Actions({ contact, view, edit, archive }: { contact: Contact; view: (contact: Contact) => void; edit: (contact: Contact) => void; archive: (contact: Contact) => Promise<void> }) {
  return <div className="flex flex-wrap gap-2"><button onClick={() => view(contact)} className="rounded-lg border px-3 py-1.5">عرض</button><button onClick={() => edit(contact)} className="rounded-lg border px-3 py-1.5">تعديل</button><button onClick={() => void archive(contact)} className="rounded-lg border px-3 py-1.5 text-red-700">أرشفة</button></div>;
}
