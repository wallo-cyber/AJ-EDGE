import assert from 'node:assert/strict';
import test from 'node:test';
import { AGENT_NAMES, agentRequiresCompany, canRetry, manualResearchLinks, qualifyingOpportunityOutcome } from './orchestrator.ts';

test('registers every required server-side agent', () => assert.equal(AGENT_NAMES.length, 11));
test('supervisor and planners do not require a company', () => { assert.equal(agentRequiresCompany('Supervisor'), false); assert.equal(agentRequiresCompany('Daily Planner'), false); });
test('enrichment agents require a real company', () => assert.equal(agentRequiresCompany('Enrichment'), true));
test('retry is capped at three attempts', () => { assert.equal(canRetry(2), true); assert.equal(canRetry(3), false); });
test('opportunities require a real qualifying outcome', () => { assert.equal(qualifyingOpportunityOutcome('RFQ Received'), true); assert.equal(qualifyingOpportunityOutcome('No Response'), false); });
test('manual research links are encoded and provider-free', () => { const links = manualResearchLinks('شركة اختبار'); assert.match(links.official, /%D8%B4/); assert.match(links.vendor, /registration/); });
