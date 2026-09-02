import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runAgent } from '@/lib/google/agent-runner';

/** يتحقق من توكن المستخدم المُرسَل من المتصفح مباشرة — لا كوكيز خادم */
async function verifyToken(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function POST(req: Request) {
  try {
    const user = await verifyToken(req);
    if (!user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول لاستخدام الوكيل الذكي.' }, { status: 401 });
    }

    const { role, task, context } = await req.json();

    if (!role || !task) {
      return NextResponse.json({ error: 'الدور والمهمة مطلوبان.' }, { status: 400 });
    }
    if (String(task).length > 4000) {
      return NextResponse.json({ error: 'المهمة طويلة جدًا — اختصرها إلى أقل من 4000 حرف.' }, { status: 400 });
    }

    const result = await runAgent({ role, task, context });

    return NextResponse.json({ success: true, response: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'تعذر تنفيذ مهمة الوكيل.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
