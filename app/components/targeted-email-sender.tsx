'use client';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

const s = (value: unknown) => String(value ?? '').trim();
const segmentOf = (company: SimpleRow) => s(company.segment || company.target_segment || company.sector || company.company_type) || 'عام';
const emailOf = (company: SimpleRow, contacts: SimpleRow[]) => s(company.general_email || company.email) || s(contacts.find((contact) => contact.company_id === company.id && s(contact.email))?.email);
const templateFor = (segment: string, companyName: string) => {
  const lower = segment.toLowerCase();
  const angle = /مطور|developer|real estate/.test(lower)
    ? 'دعم مشاريع التطوير من خلال أعمال المقاولات والتنفيذ والتأهيل المبكر للموردين والمقاولين'
    : /استشار|consult/.test(lower)
      ? 'التعاون في تنفيذ الحزم المعمارية والمدنية ودعم متطلبات المشاريع تحت إشرافكم'
      : /مقاول|contract/.test(lower)
        ? 'التعاون كمقاول متخصص أو مورد مؤهل في الحزم المدنية والمعمارية'
        : /مصنع|صناع|industrial|factory/.test(lower)
          ? 'دعم أعمال التوسعة والصيانة والتجهيز للمرافق والمشاريع الصناعية'
          : 'بحث فرص تعاون مناسبة في أعمال المقاولات والتنفيذ والتأهيل للمشاريع';
  return {
    subject: `فرص تعاون مع ${companyName}`,
    body: `السادة/ ${companyName}\n\nتحية طيبة،\n\nنتواصل معكم من ALGAEU للتعارف وبحث ${angle}. يسعدنا مشاركة ملفنا التعريفي والتعرف على آلية التسجيل أو التأهيل والفرص المناسبة لديكم.\n\nمع خالص التحية،\nفريق تطوير الأعمال - ALGAEU`,
  };
};

type Recipient = { company: SimpleRow; email: string; selected: boolean; subject: string; body: string; status?: string };

export function TargetedEmailSender() {
  const [companies, setCompanies] = useState<SimpleRow[]>([]);
  const [contacts, setContacts] = useState<SimpleRow[]>([]);
  const [segment, setSegment] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [preview, setPreview] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => { setCompanyId(new URLSearchParams(window.location.search).get('company_id') || ''); void Promise.all([
    simpleCrud.page('companies', 1, 2000, { order: 'company_name', ascending: true }),
    simpleCrud.page('contacts', 1, 3000),
  ]).then(([companyRows, contactRows]) => { setCompanies(companyRows.rows); setContacts(contactRows.rows); }); }, []);

  const segments = useMemo(() => Array.from(new Set(companies.map(segmentOf))).sort(), [companies]);
  const prepare = () => {
    const selectedCompanies = companies.filter((company) => (!companyId || company.id === companyId) && (!segment || segmentOf(company) === segment));
    setRecipients(selectedCompanies.map((company) => {
      const template = templateFor(segmentOf(company), s(company.company_name));
      return { company, email: emailOf(company, contacts), selected: Boolean(emailOf(company, contacts)), ...template };
    }));
    setNotice('تم تجهيز مسودة مخصصة لكل شركة. راجع البريد والنص قبل الإرسال.');
  };
  const update = (index: number, values: Partial<Recipient>) => setRecipients((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...values } : row));
  const sendSelected = async () => {
    const targets = recipients.map((row, index) => ({ row, index })).filter(({ row }) => row.selected && row.email && row.subject && row.body);
    if (!targets.length) { setNotice('حدد شركة واحدة على الأقل وأدخل بريدًا صحيحًا.'); return; }
    setSending(true); setNotice('');
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    if (!session?.access_token) { setNotice('يجب تسجيل الدخول من جديد.'); setSending(false); return; }
    let sent = 0;
    for (const { row, index } of targets) {
      update(index, { status: 'جارٍ الإرسال…' });
      const response = await fetch('/api/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ to: row.email, subject: row.subject, text: row.body, idempotencyKey: `company-${row.company.id}-${Date.now()}` }) });
      const result = await response.json();
      if (!response.ok) { update(index, { status: result.error || 'فشل الإرسال' }); continue; }
      sent += 1; update(index, { status: 'تم الإرسال' });
      await simpleCrud.create('messages', { company_id: row.company.id, company_name: s(row.company.company_name), recipient: row.email, subject: row.subject, body: row.body, channel: 'Email', status: 'Sent', sent_at: new Date().toISOString() });
      await simpleCrud.create('communication_events', { company_id: row.company.id, subject: row.subject, channel: 'Email', direction: 'OUTBOUND', recipient: row.email, occurred_at: new Date().toISOString(), status: 'Sent', outcome: 'تم الإرسال من مركز البريد' });
    }
    setNotice(`تم إرسال ${sent} من أصل ${targets.length}. راجع حالة كل شركة أدناه.`); setSending(false);
  };

  return <section className="crm-card p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-[#ff9d5c]">إرسال موجه</p><h2 className="text-xl font-bold">إرسال بريد لشركة أو قطاع</h2><p className="mt-1 text-sm text-[#8f96a3]">اختر القطاع، راجع مسودة كل شركة وبريدها، ثم أرسل يدويًا.</p></div><button onClick={prepare} className="btn-secondary">تجهيز المعاينة</button></div>
    <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]"><select value={segment} onChange={(event) => setSegment(event.target.value)} className="rounded-xl border p-2"><option value="">كل القطاعات</option>{segments.map((item) => <option key={item}>{item}</option>)}</select><select value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="rounded-xl border p-2"><option value="">كل شركات القطاع</option>{companies.filter((company) => !segment || segmentOf(company) === segment).map((company) => <option key={s(company.id)} value={s(company.id)}>{s(company.company_name)}</option>)}</select><button disabled={!recipients.length || sending} onClick={() => void sendSelected()} className="btn-primary">{sending ? 'جارٍ الإرسال…' : 'إرسال المحدد'}</button></div>
    {notice && <p className="mt-3 rounded-xl border p-3 text-sm">{notice}</p>}
    {recipients.length > 0 && <div className="mt-4 space-y-2"><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={recipients.every((row) => row.selected)} onChange={(event) => setRecipients((rows) => rows.map((row) => ({ ...row, selected: event.target.checked })))} className="h-5 w-5"/>تحديد الكل</label>{recipients.map((row, index) => <article key={s(row.company.id)} className="rounded-2xl border p-3"><div className="grid gap-2 md:grid-cols-[auto_1fr_1fr_auto] md:items-center"><input type="checkbox" checked={row.selected} onChange={(event) => update(index, { selected: event.target.checked })} className="h-5 w-5"/><strong>{s(row.company.company_name)}</strong><input value={row.email} onChange={(event) => update(index, { email: event.target.value })} placeholder="بريد الشركة" dir="ltr" className="rounded-xl border p-2"/><button onClick={() => setPreview(index)} className="btn-ghost">معاينة وتعديل</button></div>{row.status && <p className="mt-2 text-sm">{row.status}</p>}</article>)}</div>}
    {preview !== null && recipients[preview] && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-3"><div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-3xl bg-[#22252d] p-5"><div className="flex justify-between gap-2"><h3 className="text-xl font-bold">معاينة البريد</h3><button onClick={() => setPreview(null)} className="btn-ghost">إغلاق</button></div><label className="mt-4 block text-sm">إلى<input value={recipients[preview].email} onChange={(event) => update(preview, { email: event.target.value })} dir="ltr" className="mt-1 w-full rounded-xl border p-2"/></label><label className="mt-3 block text-sm">العنوان<input value={recipients[preview].subject} onChange={(event) => update(preview, { subject: event.target.value })} className="mt-1 w-full rounded-xl border p-2"/></label><label className="mt-3 block text-sm">نص الرسالة<textarea value={recipients[preview].body} onChange={(event) => update(preview, { body: event.target.value })} className="mt-1 min-h-80 w-full rounded-xl border p-4 leading-8"/></label><button onClick={() => { update(preview, { selected: true }); setPreview(null); }} className="btn-primary mt-4">حفظ المعاينة وتحديدها</button></div></div>}
  </section>;
}
