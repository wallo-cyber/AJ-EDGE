import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

type Row=Record<string,unknown>;
type SearchResult={title?:string;url?:string;content?:string;score?:number;provider?:string;rank?:number};
const s=(v:unknown)=>String(v??'').trim();
/** نص نظيف من مزودي البحث: يزيل وسوم HTML (Brave يغلّف كلمات الاستعلام بـ<strong>) ويفكّ الكيانات. */
const plain=(v:unknown)=>String(v??'').replace(/<[^>]*>/g,'').replace(/&nbsp;/gi,' ').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const n=(v:unknown)=>Number(v||0)||0;
const domainOf=(value:string)=>{try{return new URL(value.startsWith('http')?value:`https://${value}`).hostname.replace(/^www\./,'').toLowerCase()}catch{return''}};
const allowedOrigin=(origin:string)=> {
  if (!origin) return '';
  if (origin==='https://aj-edge.vercel.app'||origin==='https://aj-edge-wallo-8917.vercel.app') return origin;
  if (/^https:\/\/aj-edge-[a-z0-9-]+-wallo-8917\.vercel\.app$/i.test(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return origin;
  return '';
};
const corsFor=(req:Request)=>({
 'Access-Control-Allow-Origin':allowedOrigin(req.headers.get('Origin')??''),
 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
 'Vary':'Origin'
});

async function braveSearch(query:string):Promise<SearchResult[]>{
 const key=Deno.env.get('BRAVE_SEARCH_API_KEY'); if(!key) throw new Error('BRAVE_SEARCH_API_KEY missing');
 const url=new URL('https://api.search.brave.com/res/v1/web/search');
 url.searchParams.set('q',query.slice(0,390)); url.searchParams.set('count','12');
 const r=await fetch(url,{headers:{Accept:'application/json','X-Subscription-Token':key}});
 if(!r.ok) throw new Error(`Brave ${r.status}`);
 const body=await r.json();
 return (body?.web?.results??[]).map((x:Record<string,unknown>,i:number)=>({title:plain(x.title),url:s(x.url),content:plain(x.description),score:Math.max(.55,.92-i*.03),provider:'brave',rank:i+1}));
}
async function tavilySearch(query:string):Promise<SearchResult[]>{
 const key=Deno.env.get('TAVILY_API_KEY'); if(!key)return[];
 const r=await fetch('https://api.tavily.com/search',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({query,search_depth:'advanced',max_results:10,include_answer:false})});
 if(!r.ok) throw new Error(`Tavily ${r.status}`);
 const body=await r.json();
 return (body.results??[]).map((x:Record<string,unknown>,i:number)=>({title:plain(x.title),url:s(x.url),content:plain(x.content),score:Number(x.score??.6),provider:'tavily',rank:i+1}));
}
async function search(query:string){
 const errors:string[]=[];
 try{const r=await braveSearch(query);if(r.length)return{results:r,provider:'brave',errors}}catch(e){errors.push(e instanceof Error?e.message:String(e))}
 try{const r=await tavilySearch(query);if(r.length)return{results:r,provider:'tavily',errors}}catch(e){errors.push(e instanceof Error?e.message:String(e))}
 return{results:[] as SearchResult[],provider:'none',errors};
}
function classify(text:string){
 const t=text.toLowerCase();
 if(/new factory|مصنع جديد|new plant/.test(t))return'NEW_FACTORY';
 if(/expansion|توسعة/.test(t))return'EXPANSION';
 if(/warehouse|مستودع|logistics hub/.test(t))return'WAREHOUSE';
 if(/new facility|facility project|منشأة جديدة/.test(t))return'NEW_FACILITY';
 if(/contract award|awarded|ترسية|إسناد/.test(t))return'CONTRACT_AWARD';
 if(/consultant appointed|consultancy award|استشاري/.test(t))return'CONSULTANT_APPOINTED';
 if(/main contractor|general contractor|epc award/.test(t))return'GC_APPOINTED';
 if(/industrial land|land allocation|أرض صناعية/.test(t))return'LAND_ALLOCATION';
 if(/permit|رخصة|تصريح/.test(t))return'PERMIT';
 if(/vendor registration|supplier registration|تسجيل المورد/.test(t))return'VENDOR_REGISTRATION';
 if(/prequal|pre-qualification|تأهيل مسبق/.test(t))return'PREQUALIFICATION';
 if(/\brfq\b/.test(t))return'RFQ';
 if(/\brfp\b/.test(t))return'RFP';
 if(/tender|مناقصة|منافسة/.test(t))return'TENDER';
 if(/hiring|recruiting|project manager vacancy|procurement manager vacancy/.test(t))return'HIRING_SIGNAL';
 return'OTHER';
}
function scoreResult(result:SearchResult,source:Row){
 const text=`${s(result.title)} ${s(result.content)} ${s(result.url)}`.toLowerCase();
 const officialDomain=s(source.search_domain);
 const sourceQuality=domainOf(s(result.url)).endsWith(officialDomain)?n(source.trust_score):Math.max(45,n(source.trust_score)-30);
 const eventConfidence=classify(text)==='OTHER'?45:85;
 const geo=/saudi|ksa|السعود|الرياض|الدمام|الخبر|الظهران|الجبيل|eastern province/.test(text)?90:55;
 const freshness=/2026|2025|today|recent|latest|جديد|اليوم|حديث/.test(text)?80:55;
 const overall=Math.round(sourceQuality*.35+eventConfidence*.30+geo*.20+freshness*.15);
 return{sourceQuality,eventConfidence,geo,freshness,overall,eventType:classify(text)};
}
function duplicateKey(sourceKey:string,url:string,title:string){
 return `${sourceKey}|${url.toLowerCase().replace(/[?#].*$/,'')}|${title.toLowerCase().slice(0,160)}`;
}
Deno.serve(async(req)=>{
 const cors=corsFor(req);
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return new Response('POST required',{status:405,headers:cors});
 const auth=req.headers.get('Authorization')??'';
 if(!auth)return Response.json({ok:false,error:'Unauthorized'},{status:401,headers:cors});
 const userClient=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
 const {data:userData}=await userClient.auth.getUser();
 const ownerId=userData.user?.id; if(!ownerId)return Response.json({ok:false,error:'Unauthorized'},{status:401,headers:cors});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const body=await req.json().catch(()=>({}));
 const requested=Array.isArray(body.source_keys)?body.source_keys.map(s):[];
 let subQ=admin.from('market_source_subscriptions').select('*, market_source_catalog(*)').eq('owner_id',ownerId).eq('enabled',true);
 if(requested.length)subQ=subQ.in('source_key',requested);
 const {data:subs,error:subErr}=await subQ;
 if(subErr)throw subErr;
 let effective=Array.isArray(subs)?subs:[];
 if(!effective.length){
   let catQ=admin.from('market_source_catalog').select('*').eq('active',true);
   if(requested.length)catQ=catQ.in('source_key',requested);
   const {data:catalog}=await catQ;
   effective=(catalog??[]).map((c:Row)=>({source_key:c.source_key,query_override:'',cities:[],sectors:[],market_source_catalog:c}));
 }
 const {data:run,error:runErr}=await admin.from('market_radar_runs').insert({owner_id:ownerId,status:'RUNNING',sources_requested:effective.length}).select('*').single();
 if(runErr)throw runErr;
 let completed=0,queries=0,seen=0,inserted=0;const errors:string[]=[];const providers:string[]=[];
 for(const sub of effective as Row[]){
   const source=(sub.market_source_catalog??{}) as Row;
   const domain=s(source.search_domain),baseQuery=s(sub.query_override)||s(source.default_query);
   const cities=Array.isArray(sub.cities)&&sub.cities.length?` ${sub.cities.join(' OR ')}`:' Saudi Arabia';
   const sectors=Array.isArray(sub.sectors)&&sub.sectors.length?` ${sub.sectors.join(' OR ')}`:'';
   const query=`site:${domain} (${baseQuery})${cities}${sectors}`.trim();
   const sr=await search(query);queries++;providers.push(sr.provider);errors.push(...sr.errors);
   seen+=sr.results.length;
   for(const result of sr.results){
     if(!s(result.url)||!domainOf(s(result.url)).endsWith(domain))continue;
     const scored=scoreResult(result,source);
     if(scored.overall<45)continue;
     const key=duplicateKey(s(source.source_key),s(result.url),s(result.title));
     const {error}=await admin.from('raw_market_events').insert({
       owner_id:ownerId,source_key:s(source.source_key),run_id:run.id,event_type:scored.eventType,
       title:s(result.title)||scored.eventType,summary:s(result.content).slice(0,1400),source_url:s(result.url),
       source_quality:scored.sourceQuality,event_confidence:scored.eventConfidence,geography_confidence:scored.geo,
       freshness_confidence:scored.freshness,overall_score:scored.overall,verification_status:'needs_research',
       review_status:'NEW',duplicate_key:key,raw_metadata:{query,provider:sr.provider,rank:result.rank??null}
     });
     if(!error)inserted++;
     else if(!String(error.message??'').toLowerCase().includes('duplicate'))errors.push(String(error.message??error));
   }
   completed++;
   await admin.from('market_source_subscriptions').update({last_run_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('owner_id',ownerId).eq('source_key',s(source.source_key));
 }
 await admin.from('market_radar_runs').update({status:errors.length?'PARTIAL':'COMPLETED',sources_completed:completed,queries_executed:queries,results_seen:seen,events_inserted:inserted,provider:[...new Set(providers)].join(','),errors,completed_at:new Date().toISOString()}).eq('id',run.id).eq('owner_id',ownerId);
 return Response.json({ok:true,run_id:run.id,sources:completed,queries,results_seen:seen,events_inserted:inserted,errors},{headers:cors});
});
