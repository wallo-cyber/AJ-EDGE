export type CompanyPriority = 'A' | 'B' | 'C';

export type CompanyProject = {
  id: string;
  projectName: string;
  city: string;
  status: string;
  estimatedValue: string;
  startDate: string;
  expectedFinish: string;
  notes: string;
};

export type DecisionMaker = {
  id: string;
  name: string;
  position: string;
  department: string;
  decisionLevel: string;
  mobile: string;
  email: string;
  linkedIn: string;
  relationshipStrength: string;
  lastContact: string;
};

export type BusinessOpportunity = {
  id: string;
  service: string;
  probability: string;
  estimatedValue: string;
  stage: string;
  priority: string;
  owner: string;
  notes: string;
};

export type Competitor = {
  id: string;
  company: string;
  reason: string;
  notes: string;
};

export type AiAnalysis = {
  bestService: string;
  bestPerson: string;
  recommendedNextAction: string;
  winningProbability: string;
  risks: string;
  opportunities: string;
};

export type NewsItem = {
  id: string;
  date: string;
  title: string;
  source: string;
  notes: string;
};

export type DocumentRecord = {
  id: string;
  fileName: string;
  category: string;
  uploadDate: string;
  notes: string;
};

export type TimelineEntry = {
  id: string;
  date: string;
  type: 'اجتماع' | 'مكالمة' | 'بريد' | 'واتساب' | 'عرض سعر' | 'متابعة';
  title: string;
  notes: string;
};

import { getSupabaseClient } from './supabase/client';

export type CompanyIntelligenceData = {
  overview: {
    companyPriority: CompanyPriority;
    businessPotential: string;
    relationshipScore: string;
    opportunityScore: string;
    overallRecommendation: string;
  };
  activity: {
    mainActivity: string;
    secondaryActivities: string;
    industrialSector: string;
    companySize: string;
    estimatedEmployees: string;
    headquarters: string;
    branches: string;
    currentStatus: string;
  };
  projects: CompanyProject[];
  decisionMakers: DecisionMaker[];
  businessOpportunities: BusinessOpportunity[];
  competitors: Competitor[];
  aiAnalysis: AiAnalysis;
  news: NewsItem[];
  documents: DocumentRecord[];
  timeline: TimelineEntry[];
};

export function createEmptyCompanyIntelligenceData(): CompanyIntelligenceData {
  return {
    overview: {
      companyPriority: 'B',
      businessPotential: '',
      relationshipScore: '',
      opportunityScore: '',
      overallRecommendation: '',
    },
    activity: {
      mainActivity: '',
      secondaryActivities: '',
      industrialSector: '',
      companySize: '',
      estimatedEmployees: '',
      headquarters: '',
      branches: '',
      currentStatus: '',
    },
    projects: [],
    decisionMakers: [],
    businessOpportunities: [],
    competitors: [],
    aiAnalysis: {
      bestService: '',
      bestPerson: '',
      recommendedNextAction: '',
      winningProbability: '',
      risks: '',
      opportunities: '',
    },
    news: [],
    documents: [],
    timeline: [],
  };
}

export function createEmptyProject(): CompanyProject {
  return {
    id: '',
    projectName: '',
    city: '',
    status: '',
    estimatedValue: '',
    startDate: '',
    expectedFinish: '',
    notes: '',
  };
}

export function createEmptyDecisionMaker(): DecisionMaker {
  return {
    id: '',
    name: '',
    position: '',
    department: '',
    decisionLevel: '',
    mobile: '',
    email: '',
    linkedIn: '',
    relationshipStrength: '',
    lastContact: '',
  };
}

export function createEmptyBusinessOpportunity(): BusinessOpportunity {
  return {
    id: '',
    service: '',
    probability: '',
    estimatedValue: '',
    stage: '',
    priority: '',
    owner: '',
    notes: '',
  };
}

export function createEmptyCompetitor(): Competitor {
  return {
    id: '',
    company: '',
    reason: '',
    notes: '',
  };
}

export function createEmptyNewsItem(): NewsItem {
  return {
    id: '',
    date: '',
    title: '',
    source: '',
    notes: '',
  };
}

export function createEmptyDocumentRecord(): DocumentRecord {
  return {
    id: '',
    fileName: '',
    category: '',
    uploadDate: '',
    notes: '',
  };
}

export function createEmptyTimelineEntry(): TimelineEntry {
  return {
    id: '',
    date: '',
    type: 'متابعة',
    title: '',
    notes: '',
  };
}

export async function readCompanyIntelligence(companyId: string): Promise<CompanyIntelligenceData> {
  const { data: row, error } = await getSupabaseClient().from('company_intelligence').select('data').eq('company_id', companyId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) {
    return createEmptyCompanyIntelligenceData();
  }
  const parsed = row.data as CompanyIntelligenceData;
  return parsed && typeof parsed === 'object' ? { ...createEmptyCompanyIntelligenceData(), ...parsed, overview: { ...createEmptyCompanyIntelligenceData().overview, ...(parsed.overview ?? {}) }, activity: { ...createEmptyCompanyIntelligenceData().activity, ...(parsed.activity ?? {}) }, aiAnalysis: { ...createEmptyCompanyIntelligenceData().aiAnalysis, ...(parsed.aiAnalysis ?? {}) }, projects: Array.isArray(parsed.projects) ? parsed.projects : [], decisionMakers: Array.isArray(parsed.decisionMakers) ? parsed.decisionMakers : [], businessOpportunities: Array.isArray(parsed.businessOpportunities) ? parsed.businessOpportunities : [], competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [], news: Array.isArray(parsed.news) ? parsed.news : [], documents: Array.isArray(parsed.documents) ? parsed.documents : [], timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [] } : createEmptyCompanyIntelligenceData();
}

export async function writeCompanyIntelligence(companyId: string, companyName: string, data: CompanyIntelligenceData) {
  const supabase = getSupabaseClient();
  const { data: existing, error: readError } = await supabase.from('company_intelligence').select('id').eq('company_id', companyId).maybeSingle();
  if (readError) throw new Error(readError.message);
  const query = existing
    ? supabase.from('company_intelligence').update({ data, company_name: companyName, updated_at: new Date().toISOString() }).eq('id', existing.id)
    : supabase.from('company_intelligence').insert({ company_id: companyId, company_name: companyName, data });
  const { error } = await query;
  if (error) throw new Error(error.message);
}
