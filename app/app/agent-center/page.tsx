'use client';

import { useState } from 'react';
import { CRMPage } from '../../components/crm-shell';
import { getSupabaseClient } from '../../lib/supabase/client';

const ROLES = [
  'محلل تسعير مقاولات وكميات',
  'مدير مشاريع ومتابعة جداول زمنية',
  'مستشار مواصفات الكود السعودي وMODON',
  'مستشار عقود وموردين',
] as const;

export default function AgentCenterPage() {
  const [role, setRole] = useState<string>(ROLES[0]);
  const [task, setTask] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  async function run() {
    if (!task.trim()) return;
    setLoading(true);
    setError('');
    setResult('');
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError('انتهت جلستك — سجّل الدخول من جديد.');
        return;
      }

      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, task, context }),
      });
      const data2 = await res.json();
      if (data2.success) setResult(data2.response);
      else setError(data2.error || 'تعذر تنفيذ المهمة.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الاتصال بالوكيل.');
    } finally {
      setLoading(false);
    }
  }

  const field =
    'w-full rounded-xl border border-[var(--nav-border)] bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--nav-secondary)] focus:border-[var(--nav-accent)]';
  const label = 'mb-1 block text-xs font-semibold text-[var(--nav-secondary)]';
  const panel = 'rounded-2xl border border-[var(--nav-border)] p-5';

  return (
    <CRMPage
      title="مركز الوكلاء الذكيين"
      description="وجّه مهمة تحليلية للوكيل الذكي واحصل على رد فوري — لا يقرأ بيانات النظام تلقائيًا، فألصق ما تحتاجه في خانة السياق."
    >
      {error && (
        <div className="rounded-xl border border-rose-400/60 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      <section className={panel}>
        <div className="grid gap-4">
          <div>
            <label className={label}>دور الوكيل</label>
            <select className={field} value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={label}>المهمة *</label>
            <textarea
              className={`${field} min-h-[90px]`}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="مثال: قارن بين عروض توريد وتصنيع الهياكل المعدنية لمصنع..."
            />
          </div>

          <div>
            <label className={label}>سياق إضافي (اختياري)</label>
            <textarea
              className={`${field} min-h-[70px]`}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="ألصق هنا أي أرقام أو تفاصيل من النظام يحتاجها الوكيل — الكميات، الميزانية، عروض الأسعار..."
            />
          </div>

          <button className="btn-primary" onClick={() => void run()} disabled={loading || !task.trim()}>
            {loading ? 'جارٍ التحليل...' : 'تشغيل الوكيل'}
          </button>
        </div>
      </section>

      {result && (
        <section className={panel}>
          <h3 className="mb-3 text-base font-bold">نتيجة التحليل</h3>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{result}</div>
        </section>
      )}
    </CRMPage>
  );
}
