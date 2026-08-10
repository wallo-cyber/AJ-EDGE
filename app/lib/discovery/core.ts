export type DiscoveryStatus = 'جديد' | 'بحاجة تحقق' | 'مؤهل' | 'غير مناسب' | 'تمت إضافته للـ CRM';

export type DiscoveryInput = {
  companyName: string; companyType: string; sector: string; city: string;
  activity?: string; address?: string; tags?: string;
  website: string; generalPhone: string; generalEmail: string;
  contactName: string; contactPosition: string; linkedIn: string;
  contactEmail?: string; contactPhone?: string;
  discoverySource: string; sourceUrl: string; notes: string;
  projectSignal: boolean; verificationStatus?: string;
};

const easternCities = ['الدمام', 'الخبر', 'الظهران', 'الجبيل', 'رأس تنورة', 'راس تنورة', 'القطيف', 'الشرقية'];

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/[\s\-_.,،/\\()]+/g, '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('966') ? digits.slice(3) : digits.replace(/^0/, '');
}

export function isDuplicate(a: DiscoveryInput, b: DiscoveryInput) {
  const nameA = normalizeText(a.companyName);
  const nameB = normalizeText(b.companyName);
  if (nameA && nameB && nameA === nameB) return true;
  const siteA = normalizeText(a.website);
  const siteB = normalizeText(b.website);
  if (siteA && siteB && siteA === siteB) return true;
  const phoneA = normalizePhone(a.generalPhone);
  const phoneB = normalizePhone(b.generalPhone);
  return phoneA.length >= 7 && phoneA === phoneB;
}

function domain(value: string) { return normalizeText(value).replace(/^www\./, '').split('/')[0].split('@').pop() ?? ''; }
function nameTokens(value: string) { return new Set(value.toLowerCase().replace(/شركة|مؤسسة|مصنع|للمقاولات|والتجارة/g, '').split(/\s+/).filter((part) => part.length > 2)); }
export type DuplicateStatus = 'Exact Duplicate' | 'Possible Duplicate' | 'New Lead';
export function duplicateStatus(a: DiscoveryInput, b: DiscoveryInput): DuplicateStatus {
  if (isDuplicate(a, b) || (domain(a.generalEmail) && domain(a.generalEmail) === domain(b.generalEmail))) return 'Exact Duplicate';
  const left = nameTokens(a.companyName); const right = nameTokens(b.companyName);
  const overlap = [...left].filter((token) => right.has(token)).length;
  if ((a.city && a.city === b.city && overlap >= Math.max(1, Math.min(left.size, right.size) - 1)) || (domain(a.website) && domain(a.website) === domain(b.website))) return 'Possible Duplicate';
  return 'New Lead';
}

export function calculateLeadScore(item: DiscoveryInput) {
  const haystack = `${item.companyType} ${item.sector}`.toLowerCase();
  const typeScore = /مصنع|صناع/.test(haystack) ? 20 : /مطور|عقار/.test(haystack) ? 18 : /مقاول|إنشاء/.test(haystack) ? 20 : 6;
  const fitScore = /مقاول|إنشاء|بناء|صناع|مصنع|عقار|تطوير|بنية/.test(haystack) ? 25 : 8;
  const geoScore = easternCities.some((city) => item.city.includes(city)) ? 20 : item.city ? 8 : 0;
  const projectsScore = item.projectSignal || /مشروع|توسع|تنفيذ|تطوير/.test(item.notes) ? 20 : 7;
  const contactScore = Math.min(15, (item.generalPhone ? 5 : 0) + (item.generalEmail ? 5 : 0) + (item.website ? 5 : 0));
  return Math.min(100, typeScore + fitScore + geoScore + projectsScore + contactScore);
}

export function scoreDetails(item: DiscoveryInput) {
  const reasons: string[] = []; const missing: string[] = [];
  const score = calculateLeadScore(item);
  if (/مصنع|صناع|مقاول|عقار|تطوير/.test(`${item.companyType} ${item.sector} ${item.activity ?? ''}`)) reasons.push('نشاط ملائم للمقاولات');
  if (easternCities.some((city) => item.city.includes(city))) reasons.push(`ضمن النطاق الجغرافي: ${item.city}`);
  if (item.projectSignal) reasons.push('مؤشرات مشاريع أو توسع');
  if (item.contactName) reasons.push('مسؤول تواصل متوفر'); else missing.push('مسؤول تواصل');
  if (item.website) reasons.push('موقع إلكتروني متوفر'); else missing.push('الموقع الإلكتروني');
  if (!item.generalEmail && !item.contactEmail) missing.push('البريد الإلكتروني');
  if (!item.generalPhone && !item.contactPhone) missing.push('الهاتف');
  return { score, reasons, missing };
}

export function dataCompleteness(item: DiscoveryInput) {
  const values = [item.companyName,item.companyType,item.sector,item.activity,item.city,item.website,item.generalPhone,item.generalEmail,item.contactName,item.contactPosition,item.linkedIn,item.discoverySource,item.sourceUrl];
  return Math.round(values.filter(Boolean).length / values.length * 100);
}

function splitCsvLine(line: string) {
  const cells: string[] = []; let current = ''; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { current += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { cells.push(current.trim()); current = ''; }
    else current += char;
  }
  cells.push(current.trim()); return cells;
}

export function parseDiscoveryCsv(csv: string): DiscoveryInput[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map(normalizeText);
  const aliases: Record<keyof Omit<DiscoveryInput, 'projectSignal'>, string[]> = {
    companyName: ['companyname', 'name', 'اسمالشركة', 'الاسم'], companyType: ['companytype', 'type', 'نوعالشركة', 'النوع', 'الفئة'],
    sector: ['sector', 'القطاع', 'النشاط'], city: ['city', 'المدينة'], website: ['website', 'الموقع', 'الموقعالإلكتروني'],
    generalPhone: ['phone', 'generalphone', 'الهاتف'], generalEmail: ['email', 'generalemail', 'البريد', 'البريدالإلكتروني'],
    contactName: ['contactname', 'اسممسؤولالتواصل', 'مسؤولالتواصل'], contactPosition: ['contactposition','contacttitle', 'منصبمسؤولالتواصل', 'المنصب'],
    linkedIn: ['linkedin', 'لينكدإن', 'لينكدان'],
    activity: ['activity','النشاط'], address: ['address','العنوان'], tags: ['tags','الوسوم'],
    contactEmail: ['contactemail','بريدالمسؤول'], contactPhone: ['contactphone','هاتفالمسؤول'],
    discoverySource: ['source','sourcename', 'discoverysource', 'المصدر', 'مصدرالبيانات'], sourceUrl: ['sourceurl', 'رابطالمصدر'],
    notes: ['notes', 'ملاحظات'], verificationStatus: ['verificationstatus', 'حالةالتحقق'],
  };
  const value = (cells: string[], key: keyof typeof aliases) => {
    const index = headers.findIndex((header) => aliases[key].includes(header)); return index >= 0 ? cells[index] ?? '' : '';
  };
  return lines.slice(1).map(splitCsvLine).map((cells) => ({
    companyName: value(cells, 'companyName'), companyType: value(cells, 'companyType'), sector: value(cells, 'sector'),
    city: value(cells, 'city'), website: value(cells, 'website'), generalPhone: value(cells, 'generalPhone'),
    generalEmail: value(cells, 'generalEmail'), discoverySource: value(cells, 'discoverySource') || 'CSV',
    contactName: value(cells, 'contactName'), contactPosition: value(cells, 'contactPosition'), linkedIn: value(cells, 'linkedIn'),
    activity: value(cells, 'activity'), address: value(cells, 'address'), tags: value(cells, 'tags'), contactEmail: value(cells, 'contactEmail'), contactPhone: value(cells, 'contactPhone'),
    sourceUrl: value(cells, 'sourceUrl'), notes: value(cells, 'notes'), projectSignal: false,
    verificationStatus: value(cells, 'verificationStatus') || 'بحاجة تحقق',
  })).filter((row) => row.companyName);
}

export type ImportReport = { total: number; accepted: DiscoveryInput[]; duplicates: number; needsReview: number; rejected: number };
export function prepareImport(items: DiscoveryInput[], existing: DiscoveryInput[]): ImportReport {
  const accepted: DiscoveryInput[] = []; let duplicates = 0; let rejected = 0; let needsReview = 0;
  for (const item of items) {
    if (!item.companyName.trim() || !item.companyType.trim() || !item.city.trim()) { rejected += 1; continue; }
    if ([...existing, ...accepted].some((candidate) => duplicateStatus(item, candidate) === 'Exact Duplicate')) { duplicates += 1; continue; }
    if (!item.website && !item.generalPhone && !item.generalEmail) needsReview += 1;
    accepted.push(item);
  }
  return { total: items.length, accepted, duplicates, needsReview, rejected };
}

export const discoveryCsvTemplate = '\uFEFFcompany_name,company_type,sector,activity,city,website,general_phone,general_email,contact_name,contact_title,contact_email,contact_phone,linkedin,source_name,source_url,notes\r\n';
