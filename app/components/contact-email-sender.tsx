'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';
import { simpleCrud } from '../lib/supabase/simple-crud';
import { supabaseCrm } from '../lib/supabase/crm';
import type { Contact } from '../lib/crm/types';

export const MAIL_CONTACTS_KEY = 'novawerk:mail-contacts';
const BATCH_LIMIT = 50;
const SEND_DELAY_MS = 1200;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (value: unknown) => String(value ?? '').trim();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const defaultSubject = 'تعريف بشركة نوفاويرك للمقاولات العامة';
const defaultBody = `السيد/ {{name}}

تحية طيبة،

يسعدني أن أعرّفكم بشركة نوفاويرك للمقاولات العامة في الدمام، وأتولى رئاسة مجلس إدارتها. نعمل على بناء علاقات تعاون قائمة على الثقة والجودة والالتزام بالمواعيد، ويسعدنا التواصل معكم والتعرف على فرص التعاون المناسبة بين {{company}} ونوفاويرك.

مع خالص التحية،
وليد بامحرز
رئيس مجلس الإدارة - نوفاويرك للمقاولات العامة

إذا لم ترغبوا بتلقي رسائل منا، يُرجى الرد بكلمة «إيقاف» وسنحذف بريدكم من قائمتنا.`;

const render = (template: string, contact: Contact) =>
  template.replaceAll('{{name}}', s(contact.fullName) || 'الكريم').replaceAll('{{company}}', s(contact.companyName) || 'شركتكم');

type Row = { contact: Contact; email: string; subject: string; body: string; selected: boolean; status: string };

export function ContactEmailSender() {
  const [ids, setIds] = useState<string[] | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [preview, setPreview] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let stored: string[] = [];
    try { stored = JSON.parse(window.sessionStorage.getItem(MAIL_CONTACTS_KEY) || '[]') as string[]; } catch { stored = []; }
    if (!Array.isArray(stored) || stored.length === 0) { setLoading(false); return; }
    setIds(stored);
    const wanted = new Set(stored);
    void supabaseCrm.contacts.list()
      .then((all) => {
        const picked = all.filter((contact) => wanted.has(contact.id));
        setRows(picked.map((contact) => {
          const email = s(contact.email);
          return { contact, email, subject: render(defaultSubject, contact), body: render(defaultBody, contact), selected: emailPattern.test(email), status: '' };
        }));
      })
      .catch((error: unknown) => setNotice(error instanceof Error ? error.message : 'تعذر تحميل جهات الاتصال المحددة.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!ids || ids.length === 0) return null;

  const update = (index: number, values: Partial<Row>) => setRows((current) => current.map((row, i) => (i === index ? { ...row, ...values } : row)));
  const applyTemplate = () => {
    if (!window.confirm('تطبيق القالب على كل الرسائل؟ ستُستبدل أي تعديلات فردية.')) return;
    setRows((current) => current.map((row) => ({ ...row, subject: render(subject, row.contact), body: render(body, row.contact) })));
    setNotice('تم تطبيق القالب على الجميع. راجع الرسائل قبل الإرسال.');
  };
  const clear = () => { try { window.sessionStorage.removeItem(MAIL_CONTACTS_KEY); } catch { /* ignore */ } setIds(null); setRows([]); };
  const selected = rows.filter((row) => row.selected && emailPattern.test(row.email));

  const saveDrafts = async () => {
    if (!selected.length) { setNotice('حدد مستلماً واحداً على الأقل ببريد صحيح.'); return; }
    setBusy(true); let saved = 0; let failed = 0;
    for (const row of selected) {
      try {
        await simpleCrud.create('messages', {
          company_id: row.contact.companyId || null,
          company_name: s(row.contact.companyName),
          contact_id: row.contact.id,
          recipient: `${s(row.contact.fullName)} <${row.email}>`,
          subject: row.subject,
          body: row.body,
          channel: 'Email',
          language: 'ARABIC',
          status: 'Draft',
          draft_classification: 'PERSONALIZED',
        });
        saved += 1;
      } catch { failed += 1; }
    }
    setNotice(`تم حفظ ${saved} مسودة${failed ? `، وتعذر حفظ ${failed}` : ''}. تجدها في تبويب المسودات.`);
    setBusy(false);
  };

  const sendBatch = async () => {
    const targets = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.selected && emailPattern.test(row.email) && row.status !== 'تم الإرسال').slice(0, BATCH_LIMIT);
    if (!targets.length) { setNotice('لا توجد رسائل محددة للإرسال.'); return; }
    if (!window.confirm(`سيتم إرسال ${targets.length} رسالة منفصلة (رسالة لكل شخص). هل راجعت النص؟`)) return;
    setBusy(true); setNotice('');
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    if (!session?.access_token) { setNotice('يجب تسجيل الدخول من جديد.'); setBusy(false); return; }
    let sent = 0;
    for (const { row, index } of targets) {
      update(index, { status: 'جارٍ الإرسال…' });
      try {
        const response = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ to: row.email, subject: row.subject, text: row.body, idempotencyKey: `contact-${row.contact.id}-${new Date().toISOString().slice(0, 10)}` }),
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) { update(index, { status: result.error || 'فشل الإرسال' }); continue; }
        sent += 1; update(index, { status: 'تم الإرسال' });
        try {
          const when = new Date().toISOString();
          await simpleCrud.create('messages', { company_id: row.contact.companyId || null, company_name: s(row.contact.companyName), contact_id: row.contact.id, recipient: row.email, subject: row.subject, body: row.body, channel: 'Email', status: 'Sent', sent_at: when });
          await simpleCrud.create('communication_events', { company_id: row.contact.companyId || null, subject: row.subject, channel: 'Email', direction: 'OUTBOUND', recipient: row.email, occurred_at: when, status: 'Sent', outcome: 'تم الإرسال من قائمة جهات الاتصال' });
        } catch { /* log failure must not hide that the email was sent */ }
      } catch { update(index, { status: 'فشل الاتصال' }); }
      await wait(SEND_DELAY_MS);
    }
    const remaining = rows.filter((row) => row.selected && emailPattern.test(row.email) && row.status !== 'تم الإرسال').length - (targets.length - sent);
    setNotice(`تم إرسال ${sent} من ${targets.length}.${remaining > 0 ? ` بقي ${remaining} محدد، أرسلهم في دفعة لاحقة (الحد ${BATCH_LIMIT} للدفعة).` : ''}`);
    setBusy(false);
  };

  return <section className="crm-card p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold text-[var(--nav-accent)]">من قائمة جهات الاتصال</p>
        <h2 className="text-xl font-bold">رسالة إلى {rows.length} جهة اتصال محددة</h2>
        <p className="mt-1 text-sm text-[#8f96a3]">عدّل القالب، راجع كل رسالة، ثم احفظ كمسودات أو أرسل. تُرسل رسالة منفصلة لكل شخص.</p>
      </div>
      <button onClick={clear} className="btn-ghost">إغلاق القائمة</button>
    </div>
    <div className="mt-4 grid gap-3">
      <label className="block text-sm">قالب العنوان<input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 w-full rounded-xl border p-2" /></label>
      <label className="block text-sm">قالب الرسالة <span className="text-xs text-[#8f96a3]">(المتغيرات: {'{{name}}'} و {'{{company}}'})</span>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} className="mt-1 min-h-64 w-full rounded-xl border p-4 leading-8" /></label>
      <div className="flex flex-wrap gap-2">
        <button onClick={applyTemplate} disabled={busy} className="btn-secondary">تطبيق القالب على الجميع</button>
        <button onClick={() => void saveDrafts()} disabled={busy || !selected.length} className="btn-secondary">حفظ المحدد كمسودات ({selected.length})</button>
        <button onClick={() => void sendBatch()} disabled={busy || !selected.length} className="btn-primary">{busy ? 'جارٍ التنفيذ…' : `إرسال المحدد (حتى ${BATCH_LIMIT})`}</button>
      </div>
    </div>
    {notice && <p className="mt-3 rounded-xl border p-3 text-sm">{notice}</p>}
    <div className="mt-4 space-y-2">
      <label className="flex items-center gap-2 font-bold"><input type="checkbox" className="h-5 w-5"
        checked={rows.length > 0 && rows.filter((row) => emailPattern.test(row.email)).every((row) => row.selected)}
        onChange={(event) => setRows((current) => current.map((row) => ({ ...row, selected: event.target.checked && emailPattern.test(row.email) })))} />تحديد الكل</label>
      {rows.map((row, index) => <article key={row.contact.id} className="rounded-2xl border p-3">
        <div className="grid gap-2 md:grid-cols-[auto_1fr_1fr_auto] md:items-center">
          <input type="checkbox" className="h-5 w-5" checked={row.selected} disabled={!emailPattern.test(row.email)} onChange={(event) => update(index, { selected: event.target.checked })} />
          <div><strong>{s(row.contact.fullName) || row.email}</strong><p className="text-xs text-[#8f96a3]">{s(row.contact.companyName) || 'بدون شركة'}</p></div>
          <input value={row.email} onChange={(event) => update(index, { email: event.target.value, selected: emailPattern.test(event.target.value) })} dir="ltr" placeholder="البريد" className="rounded-xl border p-2" />
          <button onClick={() => setPreview(index)} className="btn-ghost">معاينة وتعديل</button>
        </div>
        {row.status && <p className="mt-2 text-sm">{row.status}</p>}
      </article>)}
    </div>
    {preview !== null && rows[preview] && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-3"><div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-3xl bg-[#22252d] p-5">
      <div className="flex justify-between gap-2"><h3 className="text-xl font-bold">معاينة الرسالة</h3><button onClick={() => setPreview(null)} className="btn-ghost">إغلاق</button></div>
      <label className="mt-4 block text-sm">إلى<input value={rows[preview].email} onChange={(event) => update(preview, { email: event.target.value })} dir="ltr" className="mt-1 w-full rounded-xl border p-2" /></label>
      <label className="mt-3 block text-sm">العنوان<input value={rows[preview].subject} onChange={(event) => update(preview, { subject: event.target.value })} className="mt-1 w-full rounded-xl border p-2" /></label>
      <label className="mt-3 block text-sm">نص الرسالة<textarea value={rows[preview].body} onChange={(event) => update(preview, { body: event.target.value })} className="mt-1 min-h-80 w-full rounded-xl border p-4 leading-8" /></label>
      <button onClick={() => { update(preview, { selected: emailPattern.test(rows[preview].email) }); setPreview(null); }} className="btn-primary mt-4">حفظ وتحديد</button>
    </div></div>}
  </section>;
}
