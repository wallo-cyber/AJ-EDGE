import test from'node:test';import assert from'node:assert/strict';import{classifyMarketEvent,marketEventScore,shouldReviewMarketEvent,suggestedMarketMove}from'./core.ts';
test('classifies Saudi tender language',()=>assert.equal(classifyMarketEvent('طرح منافسة جديدة لأعمال إنشاء مستودع'),'WAREHOUSE'));
test('classifies RFQ',()=>assert.equal(classifyMarketEvent('New RFQ for civil works'),'RFQ'));
test('trusted fresh relevant event scores high',()=>assert.ok(marketEventScore({sourceQuality:100,eventConfidence:90,geographyConfidence:90,freshnessConfidence:90})>=90));
test('other noise does not enter review queue',()=>assert.equal(shouldReviewMarketEvent(90,'OTHER'),false));
test('award suggests contractor route',()=>assert.match(suggestedMarketMove('CONTRACT_AWARD'),/المقاول/));
