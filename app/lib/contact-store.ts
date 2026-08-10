import { crmServices } from './crm/services';

export type ContactDepartment =
  | 'الإدارة العامة'
  | 'المشاريع'
  | 'المشتريات'
  | 'الصيانة'
  | 'التشغيل'
  | 'العقود'
  | 'الهندسة'
  | 'المالية';

export type ContactDecisionLevel = 'صاحب قرار' | 'مؤثر' | 'منسق' | 'غير محدد';
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

export const decisionLevels: ContactDecisionLevel[] = ['صاحب قرار', 'مؤثر', 'منسق', 'غير محدد'];
export const preferredMethods: ContactMethod[] = ['واتساب', 'بريد', 'هاتف', 'LinkedIn', 'زيارة'];

export function readContacts(): Contact[] {
  return crmServices.contacts.list() as Contact[];
}

export function writeContacts(contacts: Contact[]) {
  crmServices.contacts.replace(contacts as never);
}

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
    decisionLevel: 'غير محدد',
    preferredContactMethod: 'واتساب',
    notes: '',
  };
}
