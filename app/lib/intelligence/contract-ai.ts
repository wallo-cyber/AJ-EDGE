export type ContractDecision = 'RENEW_NOW' | 'EXPIRING_SOON' | 'EXPIRED' | 'ACTIVE' | 'DRAFT_INCOMPLETE';

type Row = Record<string, unknown>;
const text = (value: unknown) => String(value ?? '').trim();
const daysUntil = (value: unknown, now = new Date()) => {
  const date = new Date(text(value));
  return Number.isNaN(date.getTime()) ? null : Math.floor((date.getTime() - now.getTime()) / 86400000);
};

export function contractDecision(contract: Row, now = new Date()) {
  const status = text(contract.status).toUpperCase();
  const remaining = daysUntil(contract.end_date, now);

  if (status === 'DRAFT') {
    return { decision: 'DRAFT_INCOMPLETE' as const, reason: 'العقد ما زال مسودة ولم يُفعّل بعد.', daysRemaining: null };
  }
  if (['CANCELLED', 'EXPIRED'].includes(status) || (remaining !== null && remaining < 0)) {
    return { decision: 'EXPIRED' as const, reason: 'انتهت مدة العقد ويحتاج تجديداً أو أرشفة.', daysRemaining: remaining };
  }
  if (remaining !== null && remaining <= 30) {
    return { decision: 'RENEW_NOW' as const, reason: `العقد ينتهي خلال ${remaining} يوماً، يحتاج قرار تجديد فوري.`, daysRemaining: remaining };
  }
  if (remaining !== null && remaining <= 60) {
    return { decision: 'EXPIRING_SOON' as const, reason: `العقد ينتهي خلال ${remaining} يوماً، ابدأ تحضير التجديد.`, daysRemaining: remaining };
  }
  return { decision: 'ACTIVE' as const, reason: 'العقد ساري ولا يحتاج إجراءً حالياً.', daysRemaining: remaining };
}