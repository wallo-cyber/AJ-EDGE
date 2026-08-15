export type ContractStatus = 'Draft' | 'Active' | 'Expiring' | 'Expired' | 'Cancelled' | 'Renewed';

export type Contract = {
  id: string;
  companyId: string;
  companyName: string;
  contractNumber: string;
  title: string;
  value: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  renewalReminderDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export const contractStatuses: ContractStatus[] = ['Draft', 'Active', 'Expiring', 'Expired', 'Cancelled', 'Renewed'];

export function createEmptyContract(companyId = '', companyName = ''): Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    companyId, companyName, contractNumber: '', title: '', value: '',
    startDate: '', endDate: '', status: 'Draft', renewalReminderDate: '', notes: '',
  };
}