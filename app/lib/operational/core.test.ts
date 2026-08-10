import assert from 'node:assert/strict';
import test from 'node:test';
import { addBusinessDays, outcomeActions, personalizedDraft, rankDailyItems, toCsv } from './core.ts';

test('schedules three business days without Friday or Saturday', () => assert.equal(addBusinessDays(new Date('2026-08-06T08:00:00Z'), 3), '2026-08-11'));
test('no response creates a three-day follow-up', () => assert.equal(outcomeActions('No Response').followUpBusinessDays, 3));
test('wrong contact returns to enrichment', () => assert.equal(outcomeActions('Wrong Contact').needsEnrichment, true));
test('meeting request creates a meeting', () => assert.equal(outcomeActions('Requested Meeting').createMeeting, true));
test('RFQ creates an opportunity', () => assert.equal(outcomeActions('RFQ Received').createOpportunity, true));
test('vendor request creates a registration task', () => assert.equal(outcomeActions('Requested Vendor Registration').createVendorTask, true));
test('not interested stops outreach', () => assert.equal(outcomeActions('Not Interested').stopOutreach, true));
test('draft is personalized by company and type', () => { const draft = personalizedDraft({ name: 'مصنع ألف', type: 'Factory', city: 'Dammam' }, 'Email'); assert.match(draft, /مصنع ألف/); assert.match(draft, /التوسعات/); });
test('daily ranking puts A before B and caps at 20', () => { const rows = Array.from({ length: 25 }, (_, index) => ({ priority: index === 24 ? 'A' : 'B', lead_score: index })); const ranked = rankDailyItems(rows, 30); assert.equal(ranked.length, 20); assert.equal(ranked[0].priority, 'A'); });
test('CSV export excludes ownership and escapes quotes', () => { const csv = toCsv([{ name: 'A "Co"', owner_id: 'secret' }]); assert.doesNotMatch(csv, /owner_id|secret/); assert.match(csv, /A ""Co""/); });
