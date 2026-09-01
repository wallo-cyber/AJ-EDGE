'use client';

import { useState } from 'react';

export default function AgentCenterPage() {
  const [role, setRole] = useState('محلل تسعير مقاولات');
  const [task, setTask] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    setLoading(true);
    setResult('');

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, task, context }),
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.response);
      } else {
        setResult(`خطأ: ${data.error}`);
      }
    } catch (err: any) {
      setResult(`حدث خطأ أثناء الاتصال: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-right" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900">مركز العوامل الذكية (Agent Center)</h1>
      <p className="text-sm text-gray-600">وجّه المهام الهندسية والإدارية للعميل الذكي واحتصل على تحليلات فورية.</p>

      <form onSubmit={handleRunAgent} className="space-y-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">دوري العميل (Agent Role)</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500"
          >
            <option value="محلل تسعير مقاولات">محلل تسعير مقاولات وكميات</option>
            <option value="مدير مشاريع هندسية">مدير مشاريع ومتابعة جداول زمنية</option>
            <option value="مستشار شروط ومواصفات">مستشار مواصفات الكود السعودي وMODON</option>
            <option value="مستشار تعاقدات وموردين">مستشار عقود وموردين</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المهمة المطلوبة (Task)</label>
          <textarea
            rows={3}
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="مثال: قارن بين عروض أسعار توريد وتصنيع الهياكل المعدنية لمصنع..."
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">سياق أو بيانات إضافية (Context - اختياري)</label>
          <textarea
            rows={2}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="أدخل أي تفاصيل إضافية مثل الكميات أو الميزانية..."
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? 'جاري التحليل والمعالجة...' : 'تشغيل العميل الذكي'}
        </button>
      </form>

      {result && (
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold mb-3 text-gray-900">نتيجة التحليل:</h2>
          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}