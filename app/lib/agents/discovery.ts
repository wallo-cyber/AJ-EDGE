import { supabaseCrm } from '../supabase/crm';

export type DiscoveryProviderType = 'manual' | 'csv' | 'web';

export type DiscoveryQuery = {
  companyType: string;
  city: string;
  sector: string;
  resultsCount: number;
};

export type DiscoveryCandidate = {
  id: string;
  companyName: string;
  companyType: string;
  sector: string;
  city: string;
  website: string;
  email: string;
  phone: string;
  source: string;
  reasonForTargeting: string;
  suggestedService: string;
  recommendedContactPosition: string;
  priority: 'عالية' | 'متوسطة' | 'منخفضة';
  agentNotes: string;
  reviewStatus: 'review' | 'approved' | 'ignored';
  provider: DiscoveryProviderType;
  createdAt: string;
  updatedAt: string;
};

export type ImportSummary = {
  totalRows: number;
  valid: number;
  rejected: number;
  duplicates: number;
  approved: number;
};

export interface DiscoveryProvider {
  type: DiscoveryProviderType;
  name: string;
  description: string;
  discover(query: DiscoveryQuery): Promise<DiscoveryCandidate[]>;
}

export const allowedCompanyTypes = ['مصنع', 'مطور عقاري', 'مقاول رئيسي', 'مكتب استشاري', 'شركة صناعية'];
export const allowedCities = ['الدمام', 'الخبر', 'الظهران', 'الجبيل', 'رأس تنورة', 'القطيف', 'بقيق', 'الخفجي', 'النعيرية'];

function createCandidateFromSeed(seed: Partial<DiscoveryCandidate>, query: DiscoveryQuery): DiscoveryCandidate {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    companyName: '',
    companyType: query.companyType,
    sector: query.sector,
    city: query.city,
    website: '',
    email: '',
    phone: '',
    source: 'إدخال يدوي',
    reasonForTargeting: `مناسب لقطاع ${query.sector || 'غير محدد'} في ${query.city}`,
    suggestedService: 'خطة توجيهية أولية لعملاء المنطقة الشرقية',
    recommendedContactPosition: 'مدير المشتريات',
    priority: 'متوسطة',
    agentNotes: 'في انتظار مراجعة البيانات قبل الاعتماد',
    reviewStatus: 'review',
    provider: 'manual',
    createdAt: now,
    updatedAt: now,
    ...seed,
  };
}

export class ManualProvider implements DiscoveryProvider {
  type: DiscoveryProviderType = 'manual';
  name = 'إدخال يدوي';
  description = 'يُنشئ نتائج مراجعة جاهزة للإدخال اليدوي دون حفظ أي شركة بشكل تلقائي.';

  async discover(query: DiscoveryQuery): Promise<DiscoveryCandidate[]> {
    const count = Math.max(1, query.resultsCount);
    return Array.from({ length: count }, (_, index) =>
      createCandidateFromSeed(
        {
          id: crypto.randomUUID(),
          companyName: '',
          source: `إدخال يدوي #${index + 1}`,
          reasonForTargeting: `تتوافق مع ${query.companyType} في ${query.city}`,
          agentNotes: 'تمت إضافة بطاقة مراجعة جديدة، ويجب إكمال البيانات قبل الاعتماد.',
        },
        query,
      ),
    );
  }
}

export class CsvImportProvider implements DiscoveryProvider {
  type: DiscoveryProviderType = 'csv';
  name = 'استيراد CSV';
  description = 'يستقبل بيانات CSV من ملف أو نص وتحوّل الصفوف إلى نتائج مراجعة بعد التحقق من المدينة والنوع والتكرار.';

  private rawCsv = '';
  private lastSummary: ImportSummary = {
    totalRows: 0,
    valid: 0,
    rejected: 0,
    duplicates: 0,
    approved: 0,
  };

  setCsv(rawCsv: string) {
    this.rawCsv = rawCsv;
  }

  getSummary() {
    return this.lastSummary;
  }

  async discover(query: DiscoveryQuery): Promise<DiscoveryCandidate[]> {
    const rows = this.parseRows(this.rawCsv);
    const existingCompanies = await supabaseCrm.companies.list();
    const seenKeys = new Set<string>();
    const candidates: DiscoveryCandidate[] = [];

    this.lastSummary = {
      totalRows: rows.length,
      valid: 0,
      rejected: 0,
      duplicates: 0,
      approved: 0,
    };

    rows.forEach((row, index) => {
      const companyName = normalizeValue(row.companyName);
      const website = normalizeValue(row.website);
      const email = normalizeValue(row.email);
      const phone = normalizeValue(row.phone);
      const city = normalizeValue(row.city) || query.city;
      const companyType = normalizeValue(row.type) || query.companyType;
      const sector = normalizeValue(row.sector) || query.sector;
      const reason = normalizeValue(row.reason) || `مناسب لقطاع ${query.sector || 'غير محدد'}`;
      const suggestedService = normalizeValue(row.suggestedService) || 'خطة توجيهية أولية';
      const recommendedContactPosition = normalizeValue(row.recommendedContactPosition) || 'مدير المشتريات';
      const sourceValue = normalizeValue(row.source) || 'CSV';
      const priorityValue = normalizeValue(row.priority) === 'عالية' || normalizeValue(row.priority) === 'متوسطة' || normalizeValue(row.priority) === 'منخفضة' ? normalizeValue(row.priority) as DiscoveryCandidate['priority'] : 'متوسطة';

      const normalizedCompanyName = normalizeComparisonValue(companyName);
      const normalizedWebsite = normalizeComparisonValue(website);
      const normalizedEmail = normalizeComparisonValue(email);
      const normalizedPhone = normalizeComparisonValue(phone);
      const normalizedCity = normalizeComparisonValue(city);
      const normalizedType = normalizeComparisonValue(companyType);
      const duplicateKey = [normalizedCompanyName, normalizedWebsite, normalizedEmail, normalizedPhone].filter(Boolean).join('|');
      const duplicateMatch = [
        ...existingCompanies.map((company) => [normalizeComparisonValue(company.companyName), normalizeComparisonValue(company.website), normalizeComparisonValue(company.generalEmail), normalizeComparisonValue(company.generalPhone)].filter(Boolean).join('|')),
        ...Array.from(seenKeys),
      ].some((candidateKey) => candidateKey && duplicateKey && candidateKey === duplicateKey);

      if (!companyName) {
        this.lastSummary.rejected += 1;
        return;
      }

      if (!allowedCompanyTypes.some((item) => normalizeComparisonValue(item) === normalizedType)) {
        this.lastSummary.rejected += 1;
        return;
      }

      if (!allowedCities.some((item) => normalizeComparisonValue(item) === normalizedCity)) {
        this.lastSummary.rejected += 1;
        return;
      }

      if (duplicateMatch) {
        this.lastSummary.rejected += 1;
        this.lastSummary.duplicates += 1;
        return;
      }

      if (duplicateKey) {
        seenKeys.add(duplicateKey);
      }

      this.lastSummary.valid += 1;
      candidates.push(createCandidateFromSeed({
        id: crypto.randomUUID(),
        companyName,
        companyType,
        website,
        email,
        phone,
        sector,
        city,
        source: `CSV #${index + 1}`,
        reasonForTargeting: reason,
        suggestedService,
        recommendedContactPosition,
        priority: priorityValue,
        agentNotes: `تمت قراءة ${sourceValue} ومرشحها جاهز للمراجعة.`,
      }, query));
    });

    return candidates.slice(0, query.resultsCount);
  }

  private parseRows(rawCsv: string): Array<Record<string, string>> {
    if (!rawCsv.trim()) {
      return [];
    }

    const lines = rawCsv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      return [];
    }

    const headers = parseCsvLine(lines[0]).map((value) => value.trim().replace(/^\uFEFF/, ''));
    return lines.slice(1).map((line) => {
      const values = parseCsvLine(line).map((value) => value.trim());
      return headers.reduce<Record<string, string>>((accumulator, header, index) => {
        accumulator[header] = values[index] || '';
        return accumulator;
      }, {});
    });
  }
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
}

function normalizeValue(value: string | undefined) {
  return (value || '').trim().replace(/^"|"$/g, '');
}

function normalizeComparisonValue(value: string | undefined) {
  return normalizeValue(value).toLowerCase();
}

export class WebSearchProvider implements DiscoveryProvider {
  type: DiscoveryProviderType = 'web';
  name = 'بحث ويب';
  description = 'مُجهز للاتصال بواجهة بحث مستقبلية عبر API دون التأثير على الصفحة الحالية.';

  async discover(query: DiscoveryQuery): Promise<DiscoveryCandidate[]> {
    return [
      createCandidateFromSeed(
        {
          companyName: '',
          source: 'بحث ويب',
          agentNotes: 'الواجهة جاهزة لاستخدام API خارجي لاحقاً.',
          reasonForTargeting: `ترتيب جاهز للبحث الخارجي في ${query.city}`,
        },
        query,
      ),
    ];
  }
}
