'use client';

import { useEffect, useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { simpleCrud } from '../../lib/supabase/simple-crud';
import { getSupabaseClient } from '../../lib/supabase/client';

export default function SettingsPage() {
  const [outreach, setOutreach] = useState(10);
  const [followUp, setFollowUp] = useState(15);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void simpleCrud.list('user_settings').then((rows) => { if (rows[0]) { setOutreach(Number(rows[0].daily_outreach_limit)); setFollowUp(Number(rows[0].daily_follow_up_limit)); } }).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)); }, []);

  const save = async () => {
    setSaving(true); setMessage(''); setError('');
    try {
      const { data: { user } } = await getSupabaseClient().auth.getUser();
      if (!user) throw new Error('انتهت جلسة الدخول.');
      const { error: saveError } = await getSupabaseClient().from('user_settings').upsert({ owner_id: user.id, daily_outreach_limit: outreach, daily_follow_up_limit: followUp, updated_at: new Date().toISOString() });
      if (saveError) throw saveError;
      setMessage('تم حفظ حدود العمل اليومية في Supabase.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ الإعدادات.'); }
    finally { setSaving(false); }
  };

  return <CRMPage title="الإعدادات" description="ضبط حدود التشغيل اليومية مع بقاء الإرسال الخارجي معطلاً.">
    {loading ? <div className="crm-empty animate-pulse">جارٍ تحميل الإعدادات...</div> : <div className="max-w-xl rounded-2xl border border-[#ead9b3] bg-[#fdf8ee] p-5"><div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><strong>EXTERNAL SENDING: DISABLED</strong><p className="mt-1 text-xs">المسودات تحتاج اعتماداً وإرسالاً يدوياً.</p></div><label className="block text-sm">الشركات الجديدة يومياً<input type="number" min="1" max="50" value={outreach} onChange={(event) => setOutreach(Number(event.target.value))} className="mt-1 w-full rounded-xl border bg-white p-3" /></label><label className="mt-4 block text-sm">المتابعات اليومية<input type="number" min="1" max="100" value={followUp} onChange={(event) => setFollowUp(Number(event.target.value))} className="mt-1 w-full rounded-xl border bg-white p-3" /></label><button disabled={saving} onClick={() => void save()} className="mt-4 rounded-full bg-[#2f2417] px-5 py-2 text-white disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ'}</button>{message ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-emerald-700">{message}</p> : null}{error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}</div>}
  </CRMPage>;
}
