import test from 'node:test';
import assert from 'node:assert/strict';
import { companyOutreachState, isVerifiedDecisionMaker } from './business.ts';

const company = { id: 'company-1', general_email: 'info@example.com' };
const verified = { id: 'contact-1', company_id: 'company-1', decision_maker: true, verification_status: 'VERIFIED' };

test('generic channel is never a verified decision maker', () => {
  assert.equal(isVerifiedDecisionMaker({ email: 'info@example.com', verification_status: 'VERIFIED' }), false);
  assert.equal(companyOutreachState(company, [], [], []), 'CONTACT_NEEDED');
});

test('decision maker verification is independent from draft and contact events', () => {
  assert.equal(companyOutreachState(company, [verified], [], []), 'DECISION_MAKER_VERIFIED');
});

test('generic or unlinked approved drafts are not ready', () => {
  assert.equal(companyOutreachState(company, [], [{ company_id: 'company-1', status: 'Approved' }], []), 'CONTACT_NEEDED');
});

test('approved requires a linked verified decision maker', () => {
  assert.equal(companyOutreachState(company, [verified], [{ company_id: 'company-1', contact_id: 'contact-1', status: 'Approved' }], []), 'APPROVED');
});

test('contacted and replied derive only from direction-specific communication events', () => {
  assert.equal(companyOutreachState(company, [verified], [], [{ company_id: 'company-1', direction: 'OUTBOUND' }]), 'CONTACTED');
  assert.equal(companyOutreachState(company, [verified], [], [{ company_id: 'company-1', direction: 'INBOUND' }]), 'REPLIED');
});


test('PARTIALLY_VERIFIED never crosses the decision-maker gate', () => {
  assert.equal(isVerifiedDecisionMaker({ decision_maker:true, contact_classification:'Decision Maker', verification_status:'PARTIALLY_VERIFIED' }), false);
  assert.equal(isVerifiedDecisionMaker({ decision_maker:true, contact_classification:'Decision Maker', verification_status:'Public Source Verified' }), false);
});
