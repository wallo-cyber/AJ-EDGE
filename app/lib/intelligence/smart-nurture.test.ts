import test from 'node:test'; import assert from 'node:assert/strict'; import { exclusionReason,nurtureDecision } from './smart-nurture.ts';
test('open opportunity uses direct follow-up rather than nurture',()=>assert.equal(nurtureDecision({priority:'A'},{opportunities:[{stage:'QUALIFIED'}]}).decision,'FOLLOW_UP'));
test('priority C waits without a real signal',()=>assert.equal(nurtureDecision({priority:'C'},{now:new Date('2026-08-11')}).decision,'WAIT'));
test('exclusion blocks unverified email channels',()=>assert.equal(exclusionReason({general_email:''},{contacts:[{email:'a@x.test',verification_status:'UNVERIFIED'}]}),'NO_VERIFIED_EMAIL_CHANNEL'));
