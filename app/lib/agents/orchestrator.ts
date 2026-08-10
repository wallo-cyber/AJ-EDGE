export const AGENT_NAMES = ['Supervisor', 'Verification', 'Enrichment', 'Decision Maker', 'Qualification', 'Vendor Registration', 'Outreach Draft', 'Follow-up', 'Opportunity', 'Daily Planner', 'Discovery adapter'] as const;
export type AgentName = (typeof AGENT_NAMES)[number];

export function agentRequiresCompany(name: AgentName) {
  return !['Supervisor', 'Daily Planner', 'Discovery adapter'].includes(name);
}

export function canRetry(attempts: number, maxAttempts = 3) {
  return attempts < Math.min(3, maxAttempts);
}

export function qualifyingOpportunityOutcome(outcome: unknown) {
  return ['RFQ Expected', 'RFQ Received', 'Opportunity Identified', 'Requested Meeting'].includes(String(outcome ?? ''));
}

export function manualResearchLinks(companyName: unknown, role = 'procurement projects manager') {
  const company = String(companyName ?? '').trim();
  const query = encodeURIComponent(company);
  return {
    official: `https://www.google.com/search?q=${query}+official`,
    linkedIn: `https://www.google.com/search?q=site%3Alinkedin.com%2Fcompany+${query}`,
    decisionMaker: `https://www.google.com/search?q=site%3Alinkedin.com%2Fin+${query}+${encodeURIComponent(role)}`,
    vendor: `https://www.google.com/search?q=${query}+vendor+supplier+contractor+registration+prequalification`,
  };
}
