import test from 'node:test';
import assert from 'node:assert/strict';
import { accountFitScoreV2, buildBuyingCommittee, contactAccessQuality, decisionAccessNextAction, inferBuyingRoles, pursuitScore } from './revenue-phase1.ts';

const company={id:'c1',company_name:'Factory One',sector:'Factory',city:'Dammam',website:'https://factory.test',business_angle:'industrial civil works'};

test('general company channels never create buying committee access',()=>{
  const committee=buildBuyingCommittee({...company,general_email:'info@factory.test',general_phone:'0130000000'},[]);
  assert.equal(committee.accessScore,0);
  assert.equal(committee.verifiedPeople,0);
});

test('verified procurement person with direct email creates real procurement access',()=>{
  const contact={company_id:'c1',full_name:'Ali',position:'Procurement Manager',department:'المشتريات',email:'ali@factory.test',verification_status:'VERIFIED',source_url:'https://factory.test/team'};
  assert.ok(inferBuyingRoles(contact).includes('PROCUREMENT_GATEKEEPER'));
  assert.equal(contactAccessQuality(contact).status,'CONTACTABLE');
  const committee=buildBuyingCommittee(company,[contact]);
  const procurement=committee.roles.find(item=>item.role==='PROCUREMENT_GATEKEEPER');
  assert.equal(procurement?.status,'CONTACTABLE');
  assert.ok(committee.accessScore>0);
});

test('unverified named person is not counted as verified access',()=>{
  const contact={company_id:'c1',full_name:'Ali',position:'Projects Manager',department:'المشاريع',email:'ali@factory.test',verification_status:'UNVERIFIED'};
  const committee=buildBuyingCommittee(company,[contact]);
  assert.equal(committee.verifiedPeople,0);
  assert.equal(committee.roles.find(item=>item.role==='PROJECT_OWNER')?.status,'UNVERIFIED');
});

test('next action targets a missing buying role instead of generic research',()=>{
  const next=decisionAccessNextAction(company,[]);
  assert.equal(next.code,'FIND_ROLE');
  assert.match(next.label,/ابحث عن/);
});

test('fit score rewards real decision access and pursuit combines fit with timing',()=>{
  const contacts=[
    {position:'Projects Manager',department:'المشاريع',email:'p@factory.test',verification_status:'VERIFIED',source:'official site'},
    {position:'Procurement Manager',department:'المشتريات',email:'b@factory.test',verification_status:'VERIFIED',source:'official site'},
    {position:'Engineering Manager',department:'الهندسة',mobile:'0500000000',verification_status:'VERIFIED',source:'official site'},
  ];
  const fit=accountFitScoreV2({...company,vendor_registration_url:'https://factory.test/vendor'},contacts);
  assert.ok(fit.score>=60);
  assert.ok(fit.breakdown.procurementAccessibility>0);
  assert.ok(fit.breakdown.decisionCoverage>0);
  const pursuit=pursuitScore(company,contacts,{signals:[{signal_type:'RFQ',title:'Warehouse expansion RFQ'}]});
  assert.ok(pursuit.intent.score>=70);
  assert.ok(pursuit.score>=fit.score*.6);
});


test('full buying committee access can reach Account Fit grade A',()=>{
  const full=[
    {position:'General Manager',department:'management',email:'gm@factory.test',verification_status:'VERIFIED',source_url:'https://factory.test/team'},
    {position:'Projects Manager',department:'projects',email:'projects@factory.test',verification_status:'VERIFIED',source_url:'https://factory.test/team'},
    {position:'Engineering Manager',department:'engineering',email:'eng@factory.test',verification_status:'VERIFIED',source_url:'https://factory.test/team'},
    {position:'Procurement Manager',department:'procurement',email:'proc@factory.test',verification_status:'VERIFIED',source_url:'https://factory.test/team'},
    {position:'Contracts Manager',department:'contracts',email:'contracts@factory.test',verification_status:'VERIFIED',source_url:'https://factory.test/team'},
    {position:'Plant Manager',department:'operations',email:'plant@factory.test',verification_status:'VERIFIED',source_url:'https://factory.test/team'},
  ];
  const fit=accountFitScoreV2({...company,vendor_registration_url:'https://factory.test/vendor',company_size:'LARGE'},full);
  assert.equal(fit.breakdown.procurementAccessibility,10);
  assert.equal(fit.breakdown.decisionCoverage,15);
  assert.ok(fit.score>=80,`expected A-capable score, received ${fit.score}`);
  assert.equal(fit.grade,'A');
});

test('application buying roles use SITE_USER and include CHAMPION',()=>{
  const roles=buildBuyingCommittee(company,[{position:'Plant Manager',department:'operations',email:'plant@factory.test',verification_status:'VERIFIED',source_url:'https://factory.test/team'}]);
  assert.equal(roles.roles.some(r=>r.role==='SITE_USER'),true);
});
