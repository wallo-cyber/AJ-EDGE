import test from 'node:test';
import assert from 'node:assert/strict';
import { businessAngle,classifySegment,followUpDraft,generateMessage,messageQuality,nextBestAction,weightedCompleteness } from './core.ts';

test('classifies five business segments without inventing facts',()=>{
 assert.equal(classifySegment({sector:'Petrochemicals',company_type:'Factory'}).segment,'INDUSTRIAL_FACTORY');
 assert.equal(classifySegment({sector:'Real Estate Development'}).segment,'REAL_ESTATE_DEVELOPER');
 assert.equal(classifySegment({sector:'Construction',company_type:'Main Contractor'}).segment,'MAIN_CONTRACTOR');
 assert.equal(classifySegment({sector:'Engineering Consultant'}).segment,'ENGINEERING_CONSULTANT');
 assert.equal(classifySegment({sector:'Unknown'}).segment,'OTHER');
});
test('recommends a role rather than fabricating a contact',()=>{const result=businessAngle({sector:'Real Estate Development'});assert.match(result.role,/المشاريع|العقود/);assert.equal('contact' in result,false);});
test('generates distinct Arabic and English segment messages',()=>{const base={companyName:'شركة اختبار',recipientName:'أحمد',angle:'تأهيل المقاولين وحزم التنفيذ',role:'مدير المشاريع',style:'OPPORTUNITY_LED' as const,type:'PROJECT_OPPORTUNITY' as const,channel:'Email' as const,segment:'REAL_ESTATE_DEVELOPER' as const};const ar=generateMessage({...base,language:'ARABIC'}),en=generateMessage({...base,language:'ENGLISH'});assert.match(ar,/تأهيل المقاولين/);assert.match(en,/qualification route/i);assert.notEqual(ar,en);});
test('quality rejects generic and duplicate drafts',()=>{const message='يسعدنا أن نقدم لكم خدماتنا المتميزة';const result=messageQuality(message,{companyName:'شركة ألف',angle:'تأهيل المقاولين',channel:'Email'},[message]);assert.equal(result.status,'WEAK');assert.ok(result.maxSimilarity>=80);});
test('weighted completeness prioritizes decision-maker evidence',()=>{const empty=weightedCompleteness({company_name:'ألف'},[]),covered=weightedCompleteness({company_name:'ألف',website:'https://a.test',sector:'Factory',city:'Dammam',source_url:'https://a.test'},[{decision_maker:true,verification_status:'VERIFIED',source_url:'https://a.test'}]);assert.ok(covered.score>empty.score);assert.ok(empty.missingCritical.includes('صانع قرار موثق'));});
test('next action stops at missing verified decision maker',()=>{assert.equal(nextBestAction({id:'1'},[],[],[],[],[]).code,'FIND_DECISION_MAKER');});
test('follow-up is contextual and not a copy of the initial message',()=>{assert.match(followUpDraft({language:'ARABIC',companyName:'ألف',kind:'VENDOR'}),/المستند|الخطوة/);});
