export type TimestampedEntity = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type Company = {
  id: string;
  companyName: string;
  companyType: string;
  sector: string;
  city: string;
  website: string;
  generalEmail: string;
  generalPhone: string;
  contactPerson: string;
  position: string;
  mobile: string;
  linkedIn: string;
  serviceOpportunity: string;
  status: string;
  lastContact: string;
  nextFollowUp: string;
  notes: string;
  priority?: string; leadScore?: number; dataCompleteness?: number; dataQualityStatus?: string; missingFields?: string[]; scoreReasons?: string[]; sourceName?: string;
  qualificationStatus?: string; qualificationReason?: string; contractingAngle?: string; nextAction?: string;
  vendorRegistrationUrl?: string; vendorRegistrationStatus?: string; vendorRegistrationRequirements?: string; vendorRegistrationAccountStatus?: string; vendorRegistrationLastChecked?: string; vendorRegistrationNextAction?: string; vendorRegistrationNotes?: string; outreachStatus?: string; verificationStatus?: string; sourceUrl?: string; archivedAt?: string;
  communicationHistory: CommunicationEntry[];
  followUps: FollowUpEntry[];
  opportunities: string[];
  createdAt: string;
  updatedAt: string;
};

export type Contact = {
  id: string;
  companyId: string;
  companyName: string;
  fullName: string;
  position: string;
  department: string;
  mobile: string;
  email: string;
  linkedIn: string;
  decisionLevel: string;
  preferredContactMethod: string;
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

export type Meeting = TimestampedEntity & {
  title: string;
  companyId: string;
  companyName: string;
  contactPerson: string;
  scheduledAt: string;
  location: string;
  notes: string;
  status: string;
};

export type Message = TimestampedEntity & {
  companyId: string;
  companyName: string;
  direction: 'incoming' | 'outgoing';
  channel: string;
  subject: string;
  body: string;
  sentAt: string;
};

export type FollowUp = TimestampedEntity & {
  companyId: string;
  companyName: string;
  contactPerson: string;
  contactId?: string;
  followUpType: string;
  date: string;
  time: string;
  priority: string;
  status: string;
  subject: string;
  notes: string;
  result: string;
  nextAction: string;
  nextFollowUpDate: string;
};

export type Opportunity = TimestampedEntity & {
  companyId: string;
  companyName: string;
  title: string;
  service: string;
  probability: string;
  estimatedValue: string;
  stage: string;
  priority: string;
  owner: string;
  notes: string;
};

export type Quotation = TimestampedEntity & {
  companyId: string;
  companyName: string;
  quotationNumber: string;
  title: string;
  value: string;
  status: string;
  issueDate: string;
  expiresAt: string;
  notes: string;
};

export type Contract = TimestampedEntity & {
  companyId: string;
  companyName: string;
  contractNumber: string;
  title: string;
  value: string;
  status: string;
  startDate: string;
  endDate: string;
  notes: string;
};

export type DocumentRecord = TimestampedEntity & {
  companyId: string;
  companyName: string;
  fileName: string;
  category: string;
  uploadDate: string;
  notes: string;
};

export type NewsItem = TimestampedEntity & {
  companyId: string;
  companyName: string;
  title: string;
  source: string;
  date: string;
  notes: string;
};

export type Intelligence = TimestampedEntity & {
  companyId: string;
  companyName: string;
  companyPriority: string;
  businessPotential: string;
  relationshipScore: string;
  opportunityScore: string;
  overallRecommendation: string;
  mainActivity: string;
  secondaryActivities: string;
  industrialSector: string;
  companySize: string;
  estimatedEmployees: string;
  headquarters: string;
  branches: string;
  currentStatus: string;
  aiSummary: string;
};

export type TimelineEntry = TimestampedEntity & {
  companyId: string;
  companyName: string;
  date: string;
  type: string;
  title: string;
  notes: string;
};

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

export type SortDirection = 'asc' | 'desc';

export type FilterValue = string | null | undefined;

export type EntityName = 'companies' | 'contacts' | 'meetings' | 'messages' | 'followUps' | 'opportunities' | 'quotations' | 'contracts' | 'documents' | 'news' | 'intelligence' | 'timeline';
