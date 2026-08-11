'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { simpleCrud } from '../../lib/supabase/simple-crud';
import { getSupabaseClient } from '../../lib/supabase/client';

type FormState = { companyProfileName: string; targetSectors: string; targetCities: string; outreach: number; followUp: number; aThreshold: number; bThreshold: number; initialDays: number; intervalDays: number };
const initial: FormState = { companyProfileName: '', targetSectors: 'الصناعة، المقاولات، التطوير العقاري', targetCities: 'الدمام، الخبر، الظهران، الجبيل، رأس تنورة، القطيف', outreach: 10, followUp: 15, aThreshold: 80, bThreshold: 60, initialDays: 3, intervalDays: 7 };
const split = (value: string) => value.split(/[،,]/).map((part) => part.trim()).filter(Boolean);

export default function SettingsPage() {
  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => { void simpleCrud.list('user_settings').then((rows) => { const row = rows[0]; if (!row) return; setForm({ companyProfileName: String(row.company_profile_name ?? ''), targetSectors: Array.isArray(row.target_sectors) ? row.target_sectors.join('، ') : initial.targetSectors, targetCities: Array.isArray(row.target_cities) ? row.target_cities.join('، ') : initial.targetCities, outreach: Number(row.daily_outreach_limit ?? 10), followUp: Number(row.daily_follow_up_limit ?? 15), aThreshold: Number(row.priority_a_threshold ?? 80), bThreshold: Number(row.priority_b_threshold ?? 60), initialDays: Number(row.initial_follow_up_days ?? 3), intervalDays: Number(row.follow_up_interval_days ?? 7) }); }).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)); }, []);
  const save = async () => {
    setSaving(true); setMessage(''); setError('');
    try {
      const { data: { user } } = await getSupabaseClient().auth.getUser();
      if (!user) throw new Error('انتهت جلسة الدخول.');
      if (form.bThreshold >= form.aThreshold) throw new Error('حد Priority B يجب أن يكون أقل من Priority A.');
      const { error: saveError } = await getSupabaseClient().from('user_settings').upsert({ owner_id: user.id, company_profile_name: form.companyProfileName, target_sectors: split(form.targetSectors), target_cities: split(form.targetCities), daily_outreach_limit: form.outreach, daily_follow_up_limit: form.followUp, priority_a_threshold: form.aThreshold, priority_b_threshold: form.bThreshold, initial_follow_up_days: form.initialDays, follow_up_interval_days: form.intervalDays, updated_at: new Date().toISOString() });
      if (saveError) throw saveError;
      setMessage('تم حفظ إعدادات التشغيل في Supabase.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ الإعدادات.'); }
    finally { setSaving(false); }
  };
  const numberField = (label: string, key: keyof FormState, min: number, max: number) => <label className="block text-sm">{label}<input type="number" min={min} max={max} value={Number(form[key])} onChange={(event) => set(key, Number(event.target.value))} className="mt-1 w-full rounded-xl border bg-white p-3"/></label>;
  return <CRMPage title="الإعدادات" description="إعدادات تطوير الأعمال الضرورية وحالة التكاملات الخارجية.">
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      {loading ? <div className="crm-empty animate-pulse">جارٍ تحميل الإعدادات...</div> : <section className="crm-card p-5"><h3 className="font-bold">ملف الشركة والاستهداف</h3><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="block text-sm md:col-span-2">اسم/وصف الشركة<input value={form.companyProfileName} onChange={(event) => set('companyProfileName', event.target.value)} placeholder="الاسم الذي يظهر في مسودات العمل" className="mt-1 w-full rounded-xl border bg-white p-3"/></label><label className="block text-sm">القطاعات المستهدفة<input value={form.targetSectors} onChange={(event) => set('targetSectors', event.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3"/></label><label className="block text-sm">المدن المستهدفة<input value={form.targetCities} onChange={(event) => set('targetCities', event.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3"/></label>{numberField('حد Priority A', 'aThreshold', 1, 100)}{numberField('حد Priority B', 'bThreshold', 0, 99)}{numberField('الشركات الجديدة يومياً', 'outreach', 1, 50)}{numberField('المتابعات اليومية', 'followUp', 1, 100)}{numberField('أيام المتابعة الأولى', 'initialDays', 1, 90)}{numberField('الفاصل بين المتابعات', 'intervalDays', 1, 90)}</div><button disabled={saving} onClick={() => void save()} className="mt-5 rounded-full bg-[#2f2417] px-5 py-2.5 text-white disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</button>{message ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-emerald-700">{message}</p> : null}{error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}</section>}
      <aside className="space-y-4"><section className="crm-card p-5"><h3 className="font-bold">التكاملات</h3><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span>Supabase</span><strong className="text-emerald-700">CONNECTED</strong></div><div className="flex justify-between"><span>البحث الخارجي</span><strong className="text-amber-700">PAUSED</strong></div><div className="flex justify-between"><span>الإرسال الخارجي</span><strong className="text-red-700">DISABLED</strong></div></div></section><section className="crm-card p-5"><h3 className="font-bold">التحكم التشغيلي</h3><div className="mt-4 grid gap-2"><Link href="/agent-center" className="rounded-xl border p-3 text-sm">فتح مركز الوكلاء</Link><Link href="/system-status" className="rounded-xl border p-3 text-sm">عرض حالة النظام</Link></div></section></aside>
    </div>
  </CRMPage>;
}
