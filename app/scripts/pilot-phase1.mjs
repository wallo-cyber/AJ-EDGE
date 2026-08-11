import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const envText=await readFile(new URL('../.env.local',import.meta.url),'utf8');
const env=Object.fromEntries(envText.split(/\r?\n/).flatMap(line=>{const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);return m?[[m[1],m[2].replace(/^(['"])(.*)\1$/,'$2')]]:[]}));
if(!env.NEXT_PUBLIC_SUPABASE_URL||!env.SUPABASE_SECRET_KEY)throw new Error('Missing server-only Supabase configuration.');
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const apply=process.argv.includes('--apply');
const pilotKey='real-world-pilot-phase-1';
const safe=v=>String(v??'').trim();
const all=async(table,columns)=>{const rows=[];for(let from=0;;from+=1000){const {data,error}=await db.from(table).select(columns).range(from,from+999);if(error)throw new Error(`${table}: ${error.message}`);rows.push(...(data??[]));if((data??[]).length<1000)return rows;}};

const [companies,contacts,jobs,messages,events,audit]=await Promise.all([
 all('companies','*'),all('contacts','*'),all('agent_jobs','*'),all('messages','*'),all('communication_events','*'),all('audit_events','id,company_id,created_at')
]);
const relevant=company=>{const text=`${safe(company.company_type)} ${safe(company.sector)} ${safe(company.activity)}`.toLowerCase();return /(contract|construction|industrial|manufactur|real estate|developer|engineering|facility|oil|gas|petro|مقاول|إنشاء|صناع|عقار|تطوير|هندس|نفط|غاز)/i.test(text)?20:0};
const ranked=companies.filter(c=>!c.archived_at).sort((a,b)=>(a.priority==='A'?0:a.priority==='B'?1:2)-(b.priority==='A'?0:b.priority==='B'?1:2)||(Number(b.lead_score??0)+Number(b.data_completeness??0)/5+relevant(b))-(Number(a.lead_score??0)+Number(a.data_completeness??0)/5+relevant(a)));
const top=ranked.slice(0,20);
if(top.length!==20)throw new Error(`Expected 20 active companies, found ${top.length}.`);
const isVerifiedDm=c=>c.decision_maker===true&&safe(c.verification_status).toUpperCase()==='VERIFIED'&&Boolean(safe(c.source_url)||safe(c.source));
const summaries=[];let jobsCreated=0,tasksCreated=0,tasksUpdated=0,draftsCreated=0;
for(const [index,company] of top.entries()){
 const ownContacts=contacts.filter(x=>x.company_id===company.id&&!x.archived_at),dm=ownContacts.find(isVerifiedDm);
 const ownJobs=jobs.filter(x=>x.company_id===company.id&&x.status==='manual_research_required');
 const ownDrafts=messages.filter(x=>x.company_id===company.id&&!x.archived_at&&['Draft','Approved'].includes(safe(x.status)));
 const ownEvents=events.filter(x=>x.company_id===company.id&&!x.archived_at);
 const vendor=Boolean(safe(company.vendor_registration_url)),contactVerified=Boolean(ownContacts.find(x=>safe(x.verification_status).toUpperCase()==='VERIFIED'&&(safe(x.source_url)||safe(x.source))));
 const status=!dm?'NEEDS DECISION MAKER':!contactVerified?'NEEDS CONTACT VERIFICATION':!vendor?'NEEDS VENDOR REGISTRATION':ownDrafts.some(x=>x.contact_id===dm.id)?'READY FOR REVIEW':'READY FOR DRAFT';
 const workflowId=`${pilotKey}:${company.id}`;
 if(apply){
  if(ownJobs.length){for(const job of ownJobs){const {error}=await db.from('agent_jobs').update({priority:200-index,payload:{...(job.payload??{}),pilot:pilotKey,pilot_rank:index+1,pilot_workflow_id:workflowId,work_queue_status:status,external_research:'PAUSED',manual_research_required:true}}).eq('id',job.id);if(error)throw error;tasksUpdated++;}}
  else {const {error}=await db.from('agent_jobs').insert({owner_id:company.owner_id,company_id:company.id,agent_name:'Decision Maker',status:'manual_research_required',priority:200-index,payload:{pilot:pilotKey,pilot_rank:index+1,pilot_workflow_id:workflowId,work_queue_status:'NEEDS DECISION MAKER',external_research:'PAUSED',manual_research_required:true},result:{reason:'Verified decision maker required; complete manually with evidence. No external provider will be called.'},last_error:'Manual research required',idempotency_key:`${pilotKey}:decision-maker`});if(error)throw error;tasksCreated++;}
  const qualificationKey=`${pilotKey}:qualification`;
  if(!jobs.some(x=>x.company_id===company.id&&x.agent_name==='Qualification'&&x.idempotency_key===qualificationKey)) {const {error}=await db.from('agent_jobs').insert({owner_id:company.owner_id,company_id:company.id,agent_name:'Qualification',status:'queued',priority:300-index,payload:{pilot:pilotKey,pilot_rank:index+1,source:'current_supabase_data_only'},idempotency_key:qualificationKey});if(error)throw error;jobsCreated++;}
  if(dm&&!ownDrafts.some(x=>x.contact_id===dm.id)){
   const focus=safe(company.sector||company.activity||company.company_type)||'مشاريع الإنشاء والتطوير';
   const {error}=await db.from('messages').insert({owner_id:company.owner_id,company_id:company.id,company_name:company.company_name,contact_id:dm.id,direction:'outgoing',channel:'Email',subject:`تعارف مهني وفرص تعاون مع ${company.company_name}`,body:`تحية طيبة، نتواصل معكم نظراً لعمل ${company.company_name} في ${focus}. نرغب في التعارف وفهم آلية التأهيل للمشاريع ذات الصلة بخدمات المقاولات والأعمال الإنشائية، ومشاركة ملفنا التعريفي عند الطلب. هذه مسودة للمراجعة الداخلية ولم يتم إرسالها.`,status:'Draft',template_name:'Pilot tailored introduction',draft_classification:'PREPARATION'});if(error)throw error;draftsCreated++;
  }
 }
 const lastActivity=safe([...audit.filter(x=>x.company_id===company.id).map(x=>x.created_at),...ownEvents.map(x=>x.occurred_at)].sort().at(-1));
 summaries.push({rank:index+1,id:company.id,name:company.company_name,sector:company.sector,city:company.city,website:company.website,vendor_registration:vendor?'AVAILABLE':'NEEDS REVIEW',decision_maker:dm?'VERIFIED':'MISSING',contact:contactVerified?'VERIFIED':ownContacts.length?'UNVERIFIED':'MISSING',lead_score:company.lead_score,completeness:company.data_completeness,status,drafts:ownDrafts.length+(dm&&!ownDrafts.some(x=>x.contact_id===dm.id)&&apply?1:0),research_tasks:Math.max(ownJobs.length,apply?1:0),last_activity:lastActivity,next_best_action:status==='NEEDS DECISION MAKER'?'Complete manual decision-maker research with evidence':status==='NEEDS CONTACT VERIFICATION'?'Verify contact source':status==='NEEDS VENDOR REGISTRATION'?'Review official vendor registration channel':status==='READY FOR DRAFT'?'Prepare tailored draft':'Review approved contact-linked draft'});
}
if(apply){for(let pass=0;pass<10;pass++){const {data,error}=await db.rpc('agent_worker_tick',{p_batch_size:20});if(error)throw error;if(Number(data?.processed??data??0)===0)break;}}
const finalJobs=apply?await all('agent_jobs','id,company_id,agent_name,status,idempotency_key,payload'):jobs;
console.log(JSON.stringify({mode:apply?'APPLIED':'DRY_RUN',pilot:pilotKey,priorityAAvailable:top.filter(c=>c.priority==='A').length,cohortNote:'All active Priority A companies followed by the highest-ranked remaining companies; stored business priority is unchanged.',companies:summaries,writes:{jobsCreated,tasksCreated,tasksUpdated,draftsCreated},pilotJobs:finalJobs.filter(x=>top.some(c=>c.id===x.company_id)&&safe(x.payload?.pilot)===pilotKey).reduce((a,x)=>(a[x.status]=(a[x.status]??0)+1,a),{})},null,2));
