export type DiscoveryStatus = 'جديد' | 'بحاجة تحقق' | 'مؤهل' | 'غير مناسب' | 'تمت إضافته للـ CRM';

export type DiscoveryInput = {
  companyName: string; companyType: string; sector: string; city: string;
  website: string; generalPhone: string; generalEmail: string;
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

export function calculateLeadScore(item: DiscoveryInput) {
  const haystack = `${item.companyType} ${item.sector}`.toLowerCase();
  const typeScore = /مصنع|صناع/.test(haystack) ? 20 : /مطور|عقار/.test(haystack) ? 18 : /مقاول|إنشاء/.test(haystack) ? 20 : 6;
  const fitScore = /مقاول|إنشاء|بناء|صناع|مصنع|عقار|تطوير|بنية/.test(haystack) ? 25 : 8;
  const geoScore = easternCities.some((city) => item.city.includes(city)) ? 20 : item.city ? 8 : 0;
  const projectsScore = item.projectSignal || /مشروع|توسع|تنفيذ|تطوير/.test(item.notes) ? 20 : 7;
  const contactScore = Math.min(15, (item.generalPhone ? 5 : 0) + (item.generalEmail ? 5 : 0) + (item.website ? 5 : 0));
  return Math.min(100, typeScore + fitScore + geoScore + projectsScore + contactScore);
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
    companyName: ['companyname', 'name', 'اسمالشركة', 'الاسم'], companyType: ['companytype', 'type', 'نوعالشركة', 'النوع'],
    sector: ['sector', 'القطاع'], city: ['city', 'المدينة'], website: ['website', 'الموقع', 'الموقعالإلكتروني'],
    generalPhone: ['phone', 'generalphone', 'الهاتف'], generalEmail: ['email', 'generalemail', 'البريد'],
    discoverySource: ['source', 'discoverysource', 'المصدر'], sourceUrl: ['sourceurl', 'رابطالمصدر'],
    notes: ['notes', 'ملاحظات'], verificationStatus: ['verificationstatus', 'حالةالتحقق'],
  };
  const value = (cells: string[], key: keyof typeof aliases) => {
    const index = headers.findIndex((header) => aliases[key].includes(header)); return index >= 0 ? cells[index] ?? '' : '';
  };
  return lines.slice(1).map(splitCsvLine).map((cells) => ({
    companyName: value(cells, 'companyName'), companyType: value(cells, 'companyType'), sector: value(cells, 'sector'),
    city: value(cells, 'city'), website: value(cells, 'website'), generalPhone: value(cells, 'generalPhone'),
    generalEmail: value(cells, 'generalEmail'), discoverySource: value(cells, 'discoverySource') || 'CSV',
    sourceUrl: value(cells, 'sourceUrl'), notes: value(cells, 'notes'), projectSignal: false,
    verificationStatus: value(cells, 'verificationStatus') || 'بحاجة تحقق',
  })).filter((row) => row.companyName);
}
