export type ContactDepartment =
  | 'الإدارة العامة'
  | 'المشاريع'
  | 'المشتريات'
  | 'الصيانة'
  | 'التشغيل'
  | 'العقود'
  | 'الهندسة'
  | 'المالية';

export type ContactDecisionLevel = 'Primary' | 'Influencer' | 'Procurement' | 'Projects' | 'Engineering' | 'Management' | 'Unknown';
export type ContactMethod = 'واتساب' | 'بريد' | 'هاتف' | 'LinkedIn' | 'زيارة';

export type Contact = {
  id: string;
  companyId: string;
  companyName: string;
  fullName: string;
  position: string;
  department: ContactDepartment;
  mobile: string;
  email: string;
  linkedIn: string;
  decisionLevel: ContactDecisionLevel;
  preferredContactMethod: ContactMethod;
  source: string;
  sourceUrl: string;
  confidence: number;
  verificationStatus: string;
  decisionMaker: boolean;
  verifiedAt: string;
  archivedAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export const contactDepartments: ContactDepartment[] = [
  'الإدارة العامة',
  'المشاريع',
  'المشتريات',
  'الصيانة',
  'التشغيل',
  'العقود',
  'الهندسة',
  'المالية',
];

export const decisionLevels: ContactDecisionLevel[] = ['Primary', 'Influencer', 'Procurement', 'Projects', 'Engineering', 'Management', 'Unknown'];
export const preferredMethods: ContactMethod[] = ['واتساب', 'بريد', 'هاتف', 'LinkedIn', 'زيارة'];

export function createEmptyContact(companyId?: string, companyName = ''): Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    companyId: companyId ?? '',
    companyName,
    fullName: '',
    position: '',
    department: 'المشاريع',
    mobile: '',
    email: '',
    linkedIn: '',
    decisionLevel: 'Unknown',
    preferredContactMethod: 'واتساب',
    source: '',
    sourceUrl: '',
    confidence: 0,
    verificationStatus: 'Needs Verification',
    decisionMaker: false,
    verifiedAt: '',
    archivedAt: '',
    notes: '',
  };
}
