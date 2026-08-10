import { crmServices } from './crm/services';

export type CompanyType = 'مصنع' | 'مطور عقاري' | 'مقاول رئيسي' | 'مكتب استشاري' | 'شركة صناعية';
export type CompanyCity =
  | 'الدمام'
  | 'الخبر'
  | 'الظهران'
  | 'الجبيل'
  | 'رأس تنورة'
  | 'القطيف'
  | 'بقيق'
  | 'الخفجي'
  | 'النعيرية';
export type CompanyStatus = 'نشط' | 'في المتابعة' | 'مؤجل' | 'مكتمل' | 'مرفوض';

export type CommunicationEntry = {
  id: string;
  type: 'رسالة' | 'مكالمة' | 'اجتماع' | 'مذكرة';
  content: string;
  date: string;
};

export type FollowUpEntry = {
  id: string;
  date: string;
  note: string;
};

export type Company = {
  id: string;
  companyName: string;
  companyType: CompanyType;
  sector: string;
  city: CompanyCity;
  website: string;
  generalEmail: string;
  generalPhone: string;
  contactPerson: string;
  position: string;
  mobile: string;
  linkedIn: string;
  serviceOpportunity: string;
  status: CompanyStatus;
  lastContact: string;
  nextFollowUp: string;
  notes: string;
  priority?: string;
  leadScore?: number;
  dataCompleteness?: number;
  dataQualityStatus?: string;
  missingFields?: string[];
  scoreReasons?: string[];
  sourceName?: string;
  communicationHistory: CommunicationEntry[];
  followUps: FollowUpEntry[];
  opportunities: string[];
  createdAt: string;
  updatedAt: string;
};

export const companyTypes: CompanyType[] = ['مصنع', 'مطور عقاري', 'مقاول رئيسي', 'مكتب استشاري', 'شركة صناعية'];
export const companyCities: CompanyCity[] = ['الدمام', 'الخبر', 'الظهران', 'الجبيل', 'رأس تنورة', 'القطيف', 'بقيق', 'الخفجي', 'النعيرية'];
export const companyStatuses: CompanyStatus[] = ['نشط', 'في المتابعة', 'مؤجل', 'مكتمل', 'مرفوض'];

export function readCompanies(): Company[] {
  return crmServices.companies.list() as Company[];
}

export function writeCompanies(companies: Company[]) {
  crmServices.companies.replace(companies as never);
}

export function createEmptyCompany(): Omit<Company, 'id' | 'communicationHistory' | 'followUps' | 'opportunities' | 'createdAt' | 'updatedAt'> {
  return {
    companyName: '',
    companyType: 'مصنع',
    sector: '',
    city: 'الدمام',
    website: '',
    generalEmail: '',
    generalPhone: '',
    contactPerson: '',
    position: '',
    mobile: '',
    linkedIn: '',
    serviceOpportunity: '',
    status: 'نشط',
    lastContact: '',
    nextFollowUp: '',
    notes: '',
  };
}
