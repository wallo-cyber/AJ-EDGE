'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { getSupabaseClient } from '../../lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void getSupabaseClient().auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/dashboard');
    });
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(''); setMessage('');
    const supabase = getSupabaseClient();
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (result.error) { setError(result.error.message); return; }
    if (result.data.session) router.replace('/dashboard');
    else setMessage('تم إنشاء الحساب. تحقق من بريدك لتأكيده ثم سجل الدخول.');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#fffdf9_0%,_#f7ebd2_45%,_#f4e6c8_100%)] p-4 text-[#2f2417]">
      <form onSubmit={submit} className="w-full max-w-md rounded-[28px] border border-[#e8d9b7] bg-white p-6 shadow-xl sm:p-8">
        <p className="text-sm font-semibold tracking-[0.25em] text-[#9a7b2f]">ALGAEU</p>
        <p className="mt-1 text-xs text-[#75664d]">Business Development Intelligence</p>
        <h1 className="mt-3 text-2xl font-semibold">{mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}</h1>
        <div className="mt-6 space-y-4">
          <label className="block text-sm">البريد الإلكتروني<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-2xl border border-[#ead9b3] px-3 py-3" /></label>
          <label className="block text-sm">كلمة المرور<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-2xl border border-[#ead9b3] px-3 py-3" /></label>
        </div>
        {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{message}</p> : null}
        <button disabled={loading} className="mt-6 w-full rounded-full bg-[#2f2417] px-5 py-3 font-semibold text-[#fef8ec] disabled:opacity-50">{loading ? 'جارٍ التنفيذ...' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}</button>
        <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="mt-3 w-full text-sm text-[#6f6044]">{mode === 'login' ? 'ليس لديك حساب؟ أنشئ حساباً' : 'لديك حساب؟ سجل الدخول'}</button>
        <Link href="/" className="mt-4 block text-center text-sm text-[#9a7b2f]">العودة للرئيسية</Link>
      </form>
    </main>
  );
}
