export type FollowUpType = 'اتصال' | 'بريد إلكتروني' | 'واتساب' | 'زيارة' | 'اجتماع' | 'LinkedIn';
export type FollowUpPriority = 'عالية' | 'متوسطة' | 'منخفضة';
export type FollowUpStatus = 'مجدولة' | 'مكتملة' | 'متأخرة' | 'ملغاة';

export type FollowUp = {
  id: string;
  companyId: string;
  companyName: string;
  contactPerson: string;
  contactId?: string;
  followUpType: FollowUpType;
  date: string;
  time: string;
  priority: FollowUpPriority;
  status: FollowUpStatus;
  subject: string;
  notes: string;
  result: string;
  nextAction: string;
  nextFollowUpDate: string;
  createdAt: string;
  updatedAt: string;
};

export const followUpTypes: FollowUpType[] = ['اتصال', 'بريد إلكتروني', 'واتساب', 'زيارة', 'اجتماع', 'LinkedIn'];
export const followUpPriorities: FollowUpPriority[] = ['عالية', 'متوسطة', 'منخفضة'];
export const followUpStatuses: FollowUpStatus[] = ['مجدولة', 'مكتملة', 'متأخرة', 'ملغاة'];

export function createEmptyFollowUp(companyId = '', companyName = '', contactPerson = ''): Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    companyId,
    companyName,
    contactPerson,
    followUpType: 'اتصال',
    date: '',
    time: '',
    priority: 'متوسطة',
    status: 'مجدولة',
    subject: '',
    notes: '',
    result: '',
    nextAction: '',
    nextFollowUpDate: '',
  };
}
