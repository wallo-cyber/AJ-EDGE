import { createCrudService } from './crud';
import type { Company, Contact, Contract, DocumentRecord, FollowUp, Intelligence, Meeting, Message, NewsItem, Opportunity, Quotation, TimelineEntry } from './types';

const companyService = createCrudService<Company>('aj-edge-companies');
const contactService = createCrudService<Contact>('aj-edge-contacts');
const meetingService = createCrudService<Meeting>('aj-edge-meetings');
const messageService = createCrudService<Message>('aj-edge-messages');
const followUpService = createCrudService<FollowUp>('aj-edge-follow-ups');
const opportunityService = createCrudService<Opportunity>('aj-edge-opportunities');
const quotationService = createCrudService<Quotation>('aj-edge-quotations');
const contractService = createCrudService<Contract>('aj-edge-contracts');
const documentService = createCrudService<DocumentRecord>('aj-edge-documents');
const newsService = createCrudService<NewsItem>('aj-edge-news');
const intelligenceService = createCrudService<Intelligence>('aj-edge-intelligence');
const timelineService = createCrudService<TimelineEntry>('aj-edge-timeline');

export const crmServices = {
  companies: companyService,
  contacts: contactService,
  meetings: meetingService,
  messages: messageService,
  followUps: followUpService,
  opportunities: opportunityService,
  quotations: quotationService,
  contracts: contractService,
  documents: documentService,
  news: newsService,
  intelligence: intelligenceService,
  timeline: timelineService,
};

export function getEntityService<T>(entity: keyof typeof crmServices) {
  return crmServices[entity] as unknown as T;
}
