export type QuotationDecision = 'FOLLOW_UP_NOW' | 'EXPIRING_SOON' | 'EXPIRED' | 'WAITING' | 'CLOSED';

type Row = Record<string, unknown>;
const text = (value: unknown) => String(value ?? '').trim();
const daysUntil = (value: unknown, now = new Date()) => {
  const date = new Date(text(value));
  return Number.isNaN(date.getTime()) ? null : Math.floor((date.getTime() - now.getTime()) / 86400000);
};
const daysSince = (value: unknown, now = new Date()) => {
  const date = new Date(text(value));
  return Number.isNaN(date.getTime()) ? Infinity : Math.floor((now.getTime() - date.getTime()) / 86400000);
};

export function quotationDecision(quotation: Row, now = new Date()) {
  const status = text(quotation.status).toUpperCase();
  const remaining = daysUntil(quotation.valid_until, now);

  if (['ACCEPTED', 'REJECTED'].includes(status)) {
    return { decision: 'CLOSED' as const, reason: 'تم حسم العرض ولا حاجة لمتابعة إضافية.', daysRemaining: remaining };
  }
  if (status === 'EXPIRED' || (remaining !== null && remaining < 0)) {
    return { decision: 'EXPIRED' as const, reason: 'انتهت صلاحية العرض دون رد.', daysRemaining: remaining };
  }
  if (status === 'SENT' && daysSince(quotation.issue_date, now) >= 5) {
    return { decision: 'FOLLOW_UP_NOW' as const, reason: 'مضى أكثر من 5 أيام على إرسال العرض دون متابعة.', daysRemaining: remaining };
  }
  if (remaining !== null && remaining <= 7) {
    return { decision: 'EXPIRING_SOON' as const, reason: `صلاحية العرض تنتهي خلال ${remaining} يوماً.`, daysRemaining: remaining };
  }
  return { decision: 'WAITING' as const, reason: 'العرض قيد الانتظار ولم يحن وقت المتابعة بعد.', daysRemaining: remaining };
}