import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });

  const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'انتهت جلسة الدخول.' }, { status: 401 });

  const body = await request.json() as { to?: string; subject?: string; text?: string; idempotencyKey?: string };
  const to = String(body.to || '').trim();
  const subject = String(body.subject || '').trim();
  const text = String(body.text || '').trim();
  if (!emailPattern.test(to) || !subject || !text) return NextResponse.json({ error: 'البريد والعنوان ونص الرسالة مطلوبة.' }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return NextResponse.json({ error: 'خدمة الإرسال غير مهيأة بعد. يلزم RESEND_API_KEY و EMAIL_FROM في Vercel.' }, { status: 503 });

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': body.idempotencyKey || crypto.randomUUID(),
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  const result = await response.json();
  if (!response.ok) return NextResponse.json({ error: result?.message || 'تعذر إرسال البريد.' }, { status: response.status });
  return NextResponse.json({ id: result.id });
}
