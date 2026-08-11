'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { getSupabaseClient } from '../../lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { void getSupabaseClient().auth.getUser().then(({ data }) => { if (data.user) router.replace('/daily'); }); }, [router]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    const { error: authError } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) { setError('تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.'); return; }
    router.replace('/daily');
  }
  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#fffdf9_0%,_#f7ebd2_45%,_#f4e6c8_100%)] p-4 text-[#2f2417]">
    <form onSubmit={submit} className="w-full max-w-md rounded-[28px] border border-[#e8d9b7] bg-white p-6 shadow-xl sm:p-8">
      <p className="text-sm font-semibold tracking-[0.25em] text-[#9a7b2f]">ALGAEU</p><p className="mt-1 text-xs text-[#75664d]">Business Development Platform</p>
      <h1 className="mt-3 text-2xl font-semibold">تسجيل الدخول</h1><p className="mt-2 text-sm text-[#75664d]">الدخول مخصص للحسابات المدعوة فقط.</p>
      <div className="mt-6 space-y-4"><label className="block text-sm">البريد الإلكتروني<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded-2xl border border-[#ead9b3] px-3 py-3" /></label><label className="block text-sm">كلمة المرور<input required minLength={6} type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-2xl border border-[#ead9b3] px-3 py-3" /></label></div>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={loading} className="mt-6 w-full rounded-full bg-[#2f2417] px-5 py-3 font-semibold text-[#fef8ec] disabled:opacity-50">{loading ? 'جارٍ تسجيل الدخول...' : 'دخول'}</button>
    </form>
  </main>;
}
