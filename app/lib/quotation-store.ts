export type QuotationStatus = 'Draft' | 'Sent' | 'UnderReview' | 'Accepted' | 'Rejected' | 'Expired';

export type Quotation = {
  id: string;
  companyId: string;
  companyName: string;
  quotationNumber: string;
  title: string;
  value: string;
  issueDate: string;
  validUntil: string;
  status: QuotationStatus;
  followUpDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export const quotationStatuses: QuotationStatus[] = ['Draft', 'Sent', 'UnderReview', 'Accepted', 'Rejected', 'Expired'];

export function createEmptyQuotation(companyId = '', companyName = ''): Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    companyId, companyName, quotationNumber: '', title: '', value: '',
    issueDate: '', validUntil: '', status: 'Draft', followUpDate: '', notes: '',
  };
}