import test from'node:test';import assert from'node:assert/strict';import{bidScore,bidRecommendation,lifecyclePhase,PLAYBOOKS,strongestEdges,dueState}from'./core.ts';

test('bid score weights produce full 100 for perfect pursuit',()=>{const x={project_fit:100,scope_fit:100,timing:100,access:100,qualification:100,relationship:100,competition:100,commercial_attractiveness:100,delivery_capability:100};assert.equal(bidScore(x),100);assert.equal(bidRecommendation(100),'PURSUE')});
test('weak pursuit is not recommended to chase',()=>assert.equal(bidRecommendation(30),'PASS'));
test('lifecycle recognizes design before bidding',()=>assert.equal(lifecyclePhase({id:'p',stage:'CANDIDATE'},[{id:'u1',update_type:'DESIGN'}],[]),'DESIGN'));
test('subcontract and consultant playbooks are operationally different',()=>assert.notDeepEqual(PLAYBOOKS.SUBCONTRACT,PLAYBOOKS.CONSULTANT_REFERRAL));
test('relationship intelligence only ranks verified edges',()=>{const rows=strongestEdges([{id:'1',verification_status:'verified',strength:70},{id:'2',verification_status:'needs_research',strength:100}]);assert.equal(rows.length,1);assert.equal(rows[0].id,'1')});
test('missing due date is safe',()=>assert.equal(dueState(null),'NO_DUE'));
