'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { simpleCrud } from '../../lib/supabase/simple-crud';
import { getSupabaseClient } from '../../lib/supabase/client';
import { cachedLogoUrl, fetchLogoUrl, resizeImageToDataUrl, saveLogoUrl } from '../../lib/supabase/branding';

type FormState = { companyProfileName: string; targetSectors: string; targetCities: string; outreach: number; followUp: number; aThreshold: number; bThreshold: number; initialDays: number; intervalDays: number };
const initial: FormState = { companyProfileName: '', targetSectors: 'العملاء الصناعيون، المقاولون الرئيسيون، المطورون العقاريون', targetCities: 'الدمام، الخبر، الظهران، الجبيل', outreach: 10, followUp: 15, aThreshold: 80, bThreshold: 60, initialDays: 3, intervalDays: 7 };
const split = (value: string) => value.split(/[،,]/).map((part) => part.trim()).filter(Boolean);

export default function SettingsPage() {
  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState('');
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => { setLogoUrl(cachedLogoUrl()); void fetchLogoUrl().then(setLogoUrl).catch(() => {}); }, []);
  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoBusy(true); setLogoError('');
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      await saveLogoUrl(dataUrl);
      setLogoUrl(dataUrl);
    } catch (reason) { setLogoError(reason instanceof Error ? reason.message : 'تعذر رفع الشعار.'); }
    finally { setLogoBusy(false); }
  };
  const resetLogo = async () => {
    setLogoBusy(true); setLogoError('');
    try { await saveLogoUrl(null); setLogoUrl(null); }
    catch (reason) { setLogoError(reason instanceof Error ? reason.message : 'تعذر إعادة الشعار الافتراضي.'); }
    finally { setLogoBusy(false); }
  };
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
      <aside className="space-y-4">
        <section className="crm-card p-5">
          <h3 className="font-bold">شعار الشركة</h3>
          <p className="mt-1 text-xs text-[#75664d]">ارفع شعارك الخاص ليحل محل شعار نوفاويرك الافتراضي في كل الواجهة.</p>
          <div className="mt-4 flex items-center justify-center rounded-xl border border-dashed border-[#e0d2b0] bg-[#fffdf9] p-4">
            {logoUrl ? <img src={logoUrl} alt="الشعار الحالي" className="h-16 max-w-full object-contain" /> : <span className="text-xs text-[#9c8b64]">لا يوجد شعار مرفوع — يُستخدم شعار نوفاويرك الافتراضي</span>}
          </div>
          <label className="mt-3 block w-full cursor-pointer rounded-full bg-[#2f2417] px-4 py-2.5 text-center text-sm text-white">
            {logoBusy ? 'جارٍ الرفع...' : 'رفع شعار جديد'}
            <input type="file" accept="image/*" className="hidden" disabled={logoBusy} onChange={(event) => { void uploadLogo(event.target.files?.[0]); event.target.value = ''; }} />
          </label>
          {logoUrl && <button disabled={logoBusy} onClick={() => void resetLogo()} className="mt-2 w-full rounded-full border border-[#e0d2b0] px-4 py-2 text-sm text-[#75664d] disabled:opacity-50">الرجوع لشعار نوفاويرك الافتراضي</button>}
          {logoError && <p className="mt-2 text-xs text-red-700">{logoError}</p>}
          <p className="mt-2 text-[11px] text-[#9c8b64]">PNG أو JPG أو SVG أو WEBP. يظهر التغيير فورًا هنا، وفي بقية الصفحات بعد الانتقال إليها.</p>
        </section>
        <section className="crm-card p-5"><h3 className="font-bold">مستوى أتمتة التواصل</h3><div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3"><strong className="block text-amber-900">LEVEL 0 — Draft Only</strong><p className="mt-1 text-xs text-amber-800">مقفل حالياً. لا إرسال آلي ولا متابعة آلية حتى ربط مزود معتمد لاحقاً.</p></div></section><section className="crm-card p-5"><h3 className="font-bold">التكاملات</h3><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span>Supabase</span><strong className="text-emerald-700">CONNECTED</strong></div><div className="flex justify-between"><span>البحث الخارجي</span><strong className="text-emerald-700">BRAVE ACTIVE</strong></div><div className="flex justify-between"><span>الإرسال الخارجي</span><strong className="text-red-700">DISABLED</strong></div></div></section><section className="crm-card p-5"><h3 className="font-bold">التحكم التشغيلي</h3><div className="mt-4 grid gap-2"><Link href="/agent-center" className="rounded-xl border p-3 text-sm">فتح مركز الوكلاء</Link><Link href="/system-status" className="rounded-xl border p-3 text-sm">عرض حالة النظام</Link></div></section></aside>
    </div>
  </CRMPage>;
}
