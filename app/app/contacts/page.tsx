'use client';

import { useEffect, useMemo, useState } from 'react';
import { ContactForm } from '../../components/contact-form';
import { CRMPage } from '../../components/crm-shell';
import { type Company } from '../../lib/company-store';
import { type Contact, type ContactDepartment, type ContactDecisionLevel } from '../../lib/contact-store';
import { filterItems, searchItems, sortItems } from '../../lib/crm/search';
import { supabaseCrm } from '../../lib/supabase/crm';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('الكل');
  const [departmentFilter, setDepartmentFilter] = useState<ContactDepartment | 'الكل'>('الكل');
  const [decisionFilter, setDecisionFilter] = useState<ContactDecisionLevel | 'الكل'>('الكل');
  const [verificationFilter, setVerificationFilter] = useState('الكل');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    void Promise.all([supabaseCrm.contacts.list(), supabaseCrm.companies.list()]).then(([contactItems, companyItems]) => {
      setContacts(contactItems as Contact[]);
      setCompanies(companyItems as Company[]);
    }).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, []);

  const filteredContacts = useMemo(() => {
    const searched = searchItems(contacts, searchTerm, ['fullName', 'companyName', 'position', 'email']);
    const filtered = filterItems(searched, {
      companyName: companyFilter === 'الكل' ? '' : companyFilter,
      department: departmentFilter === 'الكل' ? '' : departmentFilter,
      decisionLevel: decisionFilter === 'الكل' ? '' : decisionFilter,
    });
    const verified = (filtered as Contact[]).filter((contact) => verificationFilter === 'الكل' || contact.verificationStatus === verificationFilter);
    return sortItems(verified, 'fullName' as keyof Contact, 'asc');
  }, [companyFilter, contacts, decisionFilter, departmentFilter, searchTerm, verificationFilter]);

  const openNewForm = () => {
    setEditingContactId(null);
    setIsFormOpen(true);
    setSelectedContact(null);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingContactId(null);
    setSelectedContact(null);
  };

  const handleSubmit = async (contact: Contact) => {
    const selectedCompany = companies.find((company) => company.id === contact.companyId || company.companyName === contact.companyName);
    const linkedContact = { ...contact, companyId: selectedCompany?.id ?? contact.companyId, companyName: selectedCompany?.companyName ?? contact.companyName };
    setError(''); setSuccess('');
    try {
      if (editingContactId) {
        const updated = await supabaseCrm.contacts.update(editingContactId, linkedContact);
        setContacts((items) => items.map((item) => item.id === editingContactId ? updated as Contact : item));
      } else {
        const created = await supabaseCrm.contacts.create(linkedContact);
        setContacts((items) => [created as Contact, ...items]);
      }
      setSuccess('تم حفظ جهة الاتصال.'); closeForm();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر الحفظ.'); }
  };

  const handleDelete = async (contactId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف جهة الاتصال؟')) return;
    try { await supabaseCrm.contacts.remove(contactId); setContacts((items) => items.filter((contact) => contact.id !== contactId)); setSuccess('تم الحذف.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر الحذف.'); }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContactId(contact.id);
    setSelectedContact(contact);
    setIsFormOpen(true);
  };

  const editingContact = contacts.find((contact) => contact.id === editingContactId) ?? selectedContact ?? undefined;

  return (
    <CRMPage
      title="جهات الاتصال"
      description="إدارة جهات الاتصال المرتبطة بالشركات المستهدفة والموقعين الرئيسيين في الأعمال."
      action={
        <button onClick={openNewForm} className="rounded-full bg-[#2f2417] px-5 py-3 text-sm font-semibold text-[#fef8ec]">إضافة جهة اتصال</button>
      }
    >
      {error ? <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-2xl bg-green-50 p-3 text-sm text-green-700">{success}</div> : null}
      {loading ? <div className="rounded-2xl bg-white p-6 text-center text-[#6f6044]">جارٍ تحميل جهات الاتصال...</div> : null}
      <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="بحث بالاسم أو البريد أو المنصب" className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
          <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            <option value="الكل">الشركة: الكل</option>
            {companies.map((company) => <option key={company.id} value={company.companyName}>{company.companyName}</option>)}
          </select>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value as ContactDepartment | 'الكل')} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            <option value="الكل">القسم: الكل</option>
            <option value="الإدارة العامة">الإدارة العامة</option>
            <option value="المشاريع">المشاريع</option>
            <option value="المشتريات">المشتريات</option>
            <option value="الصيانة">الصيانة</option>
            <option value="التشغيل">التشغيل</option>
            <option value="العقود">العقود</option>
            <option value="الهندسة">الهندسة</option>
            <option value="المالية">المالية</option>
          </select>
          <select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value as ContactDecisionLevel | 'الكل')} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            <option value="الكل">مستوى القرار: الكل</option>
            <option value="Primary">Primary</option>
            <option value="Influencer">Influencer</option>
            <option value="Procurement">Procurement</option>
            <option value="Projects">Projects</option>
            <option value="Engineering">Engineering</option>
            <option value="Management">Management</option>
            <option value="Unknown">Unknown</option>
          </select>
          <select value={verificationFilter} onChange={(event) => setVerificationFilter(event.target.value)} className="rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
            <option value="الكل">التحقق: الكل</option>
            <option value="Verified">Verified</option>
            <option value="Needs Verification">Needs Verification</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {isFormOpen ? <ContactForm initialContact={editingContact} companyId={editingContact?.companyId} companyName={editingContact?.companyName} onSubmit={handleSubmit} onCancel={closeForm} submitLabel={editingContact ? 'حفظ التعديلات' : 'إضافة جهة اتصال'} /> : null}

      <div className="overflow-x-auto rounded-[24px] border border-[#ead9b3] bg-white p-3">
        <table className="min-w-full text-right text-sm text-[#2f2417]">
          <thead>
            <tr className="border-b border-[#ead9b3] text-[#9a7b2f]">
              <th className="px-3 py-3">الاسم</th>
              <th className="px-3 py-3">الشركة</th>
              <th className="px-3 py-3">القسم</th>
              <th className="px-3 py-3">مستوى القرار</th>
              <th className="px-3 py-3">الجوال</th>
              <th className="px-3 py-3">المصدر</th>
              <th className="px-3 py-3">الثقة</th>
              <th className="px-3 py-3">التحقق</th>
              <th className="px-3 py-3">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-[#6f6044]">لا توجد جهات اتصال تطابق هذه المعايير بعد.</td></tr>
            ) : filteredContacts.map((contact) => (
              <tr key={contact.id} className="border-b border-[#f4ebd7]">
                <td className="px-3 py-3">
                  <div className="font-semibold">{contact.fullName}</div>
                  <div className="mt-1 text-xs text-[#6f6044]">{contact.position || '—'}</div>
                </td>
                <td className="px-3 py-3">{contact.companyName || '—'}</td>
                <td className="px-3 py-3">{contact.department}</td>
                <td className="px-3 py-3">{contact.decisionLevel}</td>
                <td className="px-3 py-3">{contact.mobile || '—'}</td>
                <td className="px-3 py-3">{contact.source || '—'}</td>
                <td className="px-3 py-3">{contact.confidence || 0}%</td>
                <td className="px-3 py-3"><span className={`crm-chip ${contact.verificationStatus === 'Verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{contact.verificationStatus || 'Needs Verification'}</span></td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelectedContact(contact)} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-3 py-1.5 text-xs font-semibold text-[#6f6044]">عرض</button>
                    <button onClick={() => handleEdit(contact)} className="rounded-full border border-[#d8c08d] bg-[#f8efe0] px-3 py-1.5 text-xs font-semibold text-[#2f2417]">تعديل</button>
                    <button onClick={() => handleDelete(contact.id)} className="rounded-full border border-[#d8c08d] bg-[#fff0e0] px-3 py-1.5 text-xs font-semibold text-[#9a4b2d]">حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedContact ? (
        <div className="rounded-[24px] border border-[#ead9b3] bg-white p-5">
          <h3 className="text-lg font-semibold text-[#2f2417]">تفاصيل جهة الاتصال</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div><p className="text-sm text-[#9a7b2f]">الاسم</p><p className="mt-1 font-semibold text-[#2f2417]">{selectedContact.fullName}</p></div>
            <div><p className="text-sm text-[#9a7b2f]">الشركة</p><p className="mt-1 font-semibold text-[#2f2417]">{selectedContact.companyName}</p></div>
            <div><p className="text-sm text-[#9a7b2f]">المنصب</p><p className="mt-1 font-semibold text-[#2f2417]">{selectedContact.position || '—'}</p></div>
            <div><p className="text-sm text-[#9a7b2f]">القسم</p><p className="mt-1 font-semibold text-[#2f2417]">{selectedContact.department}</p></div>
            <div><p className="text-sm text-[#9a7b2f]">الجوال</p><p className="mt-1 font-semibold text-[#2f2417]">{selectedContact.mobile || '—'}</p></div>
            <div><p className="text-sm text-[#9a7b2f]">البريد</p><p className="mt-1 font-semibold text-[#2f2417]">{selectedContact.email || '—'}</p></div>
            <div><p className="text-sm text-[#9a7b2f]">LinkedIn</p><p className="mt-1 font-semibold text-[#2f2417]">{selectedContact.linkedIn || '—'}</p></div>
            <div><p className="text-sm text-[#9a7b2f]">طريقة التواصل</p><p className="mt-1 font-semibold text-[#2f2417]">{selectedContact.preferredContactMethod}</p></div>
            <div><p className="text-sm text-[#9a7b2f]">المصدر</p><p className="mt-1 font-semibold text-[#2f2417]">{selectedContact.source || '—'}</p></div>
            <div><p className="text-sm text-[#9a7b2f]">الثقة والتحقق</p><p className="mt-1 font-semibold text-[#2f2417]">{selectedContact.confidence || 0}% · {selectedContact.verificationStatus || 'Needs Verification'}</p></div>
            <div className="md:col-span-2"><p className="text-sm text-[#9a7b2f]">رابط المصدر</p>{selectedContact.sourceUrl ? <a href={selectedContact.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all font-semibold text-[#8d6926] underline">فتح المصدر</a> : <p className="mt-1 font-semibold">—</p>}</div>
            <div className="md:col-span-2"><p className="text-sm text-[#9a7b2f]">ملاحظات</p><p className="mt-1 font-semibold text-[#2f2417]">{selectedContact.notes || '—'}</p></div>
          </div>
        </div>
      ) : null}
    </CRMPage>
  );
}
