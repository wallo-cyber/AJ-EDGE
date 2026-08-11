export type FollowUpType = 'Call' | 'Email' | 'WhatsApp' | 'LinkedIn' | 'Meeting' | 'Proposal Follow-up' | 'General' | 'اتصال' | 'بريد إلكتروني' | 'واتساب' | 'زيارة' | 'اجتماع';
export type FollowUpPriority = 'High' | 'Medium' | 'Low' | 'عالية' | 'متوسطة' | 'منخفضة';
export type FollowUpStatus = 'Pending' | 'Due Today' | 'Overdue' | 'Completed' | 'Cancelled' | 'مجدولة' | 'مكتملة' | 'متأخرة' | 'ملغاة';

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

export const followUpTypes: FollowUpType[] = ['Call', 'Email', 'WhatsApp', 'LinkedIn', 'Meeting', 'Proposal Follow-up', 'General'];
export const followUpPriorities: FollowUpPriority[] = ['High', 'Medium', 'Low'];
export const followUpStatuses: FollowUpStatus[] = ['Pending', 'Due Today', 'Overdue', 'Completed', 'Cancelled'];

export function createEmptyFollowUp(companyId = '', companyName = '', contactPerson = ''): Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    companyId,
    companyName,
    contactPerson,
    followUpType: 'Call',
    date: '',
    time: '',
    priority: 'Medium',
    status: 'Pending',
    subject: '',
    notes: '',
    result: '',
    nextAction: '',
    nextFollowUpDate: '',
  };
}
