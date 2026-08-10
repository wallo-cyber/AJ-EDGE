export type OutreachOutcome = 'No Response' | 'Wrong Contact' | 'Requested Company Profile' | 'Requested Vendor Registration' | 'Requested Call' | 'Requested Meeting' | 'Requested More Information' | 'Follow-up Later' | 'RFQ Expected' | 'RFQ Received' | 'Opportunity Identified' | 'Not Interested';

export function addBusinessDays(from: Date, count: number) {
  const date = new Date(from);
  while (count > 0) { date.setDate(date.getDate() + 1); if (date.getDay() !== 5 && date.getDay() !== 6) count -= 1; }
  return date.toISOString().slice(0, 10);
}

export function outcomeActions(outcome: OutreachOutcome) {
  return {
    stopOutreach: outcome === 'Not Interested',
    needsEnrichment: outcome === 'Wrong Contact',
    createMeeting: outcome === 'Requested Meeting',
    createOpportunity: ['RFQ Expected', 'RFQ Received', 'Opportunity Identified'].includes(outcome),
    createVendorTask: outcome === 'Requested Vendor Registration',
    followUpBusinessDays: outcome === 'No Response' ? 3 : ['Requested Company Profile', 'Requested Vendor Registration', 'Requested Call', 'Requested More Information', 'Follow-up Later'].includes(outcome) ? 5 : null,
  };
}

export function personalizedDraft(company: { name?: unknown; type?: unknown; city?: unknown; activity?: unknown }, channel: 'Email' | 'WhatsApp' | 'LinkedIn' | 'Phone') {
  const name = String(company.name ?? '').trim();
  const type = String(company.type ?? '').trim();
  const city = String(company.city ?? '').trim();
  const activity = String(company.activity ?? '').trim();
  const focus = type === 'Main Contractor' ? 'حزم المقاولات الباطنة' : type === 'Real Estate Developer' ? 'التسجيل كمقاول والمشاريع المقبلة' : 'الأعمال المدنية والتوسعات والصيانة الإنشائية';
  const context = [activity, city].filter(Boolean).join(' في ');
  return `${channel}: تواصل مهني مع ${name} بشأن ${focus}${context ? ` بما يلائم ${context}` : ''}. يمكننا مشاركة الملف التعريفي عند الطلب.`;
}

export function rankDailyItems<T extends { priority?: unknown; lead_score?: unknown }>(items: T[], limit = 20) {
  return [...items].sort((a, b) => String(a.priority ?? 'C').localeCompare(String(b.priority ?? 'C')) || Number(b.lead_score ?? 0) - Number(a.lead_score ?? 0)).slice(0, Math.min(20, Math.max(0, limit)));
}

export function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return '';
  const headers = [...new Set(rows.flatMap(Object.keys))].filter((key) => key !== 'owner_id');
  const cell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [headers.join(','), ...rows.map((row) => headers.map((key) => cell(row[key])).join(','))].join('\r\n');
}
