'use client';

import { useState } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';

export function FeedbackControls({ targetType, targetId, companyId, messageId }: { targetType:'DRAFT'|'BUSINESS_ANGLE'|'NEXT_BEST_ACTION'|'AGENT_RESULT'; targetId:string; companyId?:string; messageId?:string }) {
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const rate = async (rating:'USEFUL'|'NOT_USEFUL') => {
    try {
      const { data: { user } } = await getSupabaseClient().auth.getUser();
      if (!user) throw new Error('انتهت جلسة الدخول.');
      const { error: saveError } = await getSupabaseClient().from('user_feedback').upsert({ owner_id:user.id, target_type:targetType, target_id:targetId, company_id:companyId || null, message_id:messageId || null, rating, reason:reason.trim() }, { onConflict:'owner_id,target_type,target_id' });
      if (saveError) throw new Error('تعذر حفظ التقييم.');
      setSaved(rating); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ التقييم.'); }
  };
  return <div className="flex flex-wrap items-center gap-1 text-xs"><span className="text-[#75664d]">مفيد؟</span><input value={reason} onChange={event=>setReason(event.target.value)} placeholder="السبب (اختياري)" className="min-w-32 rounded-lg border px-2 py-1"/><button type="button" onClick={() => void rate('USEFUL')} className={`rounded-lg border px-2 py-1 ${saved==='USEFUL'?'bg-emerald-50 text-emerald-800':''}`}>نعم</button><button type="button" onClick={() => void rate('NOT_USEFUL')} className={`rounded-lg border px-2 py-1 ${saved==='NOT_USEFUL'?'bg-red-50 text-red-700':''}`}>لا</button>{saved&&<span className="text-emerald-700">تم الحفظ</span>}{error&&<span className="text-red-700">{error}</span>}</div>;
}
