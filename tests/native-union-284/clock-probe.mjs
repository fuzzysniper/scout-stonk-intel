// SYNTHETIC TEST OBSERVATION ONLY. No application mutation, provider call or credentials.
import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
const hash=b=>createHash('sha256').update(b).digest('hex');
const require=createRequire(import.meta.url);
export function classifyClock({status,readError,schemaValid,handledAt,evaluatedAt,deadline,pureTone,displayedTone,abortName,observedAt,previouslyExpired=false}){
 if(status===503||status===401)return 'acquisition_denial';
 if(handledAt===null&&abortName==='TimeoutError')return 'acquisition_timeout';
 if(status===undefined||readError)return 'missing_or_incomplete_response';
 if(!schemaValid)return 'invalid_evidence';
 if(handledAt===null)return 'handling_sample_unavailable';
 if(handledAt<evaluatedAt)return 'future_dated_at_handling';
 if(deadline!==null&&handledAt>=deadline)return 'expired_at_handling';
 if(deadline!==null&&observedAt>=deadline)return 'expired_after_handling';
 if(previouslyExpired&&displayedTone==='gray')return 'withdrawal_retained_after_rollback';
 if(pureTone==='red'&&displayedTone!=='red')return 'rendering_or_later_withdrawal';
 return displayedTone==='red'?'current_red':'other_withheld_state';
}
export function deliveryClock(evidence,status,deliveryAt){
 const evaluatedAt=Date.parse(evidence?.evaluatedAt),deadlines=Array.isArray(evidence?.references)?evidence.references.map(r=>Date.parse(r?.receivedAt)+60000):[];
 const eligible=status===200&&evidence?.state==='candidate'&&evidence?.origin?.label==='SYNTHETIC OFFLINE'&&Number.isSafeInteger(deliveryAt)&&Number.isFinite(evaluatedAt)&&evaluatedAt<=deliveryAt&&deadlines.length>0&&deadlines.every(Number.isFinite)&&deliveryAt<Math.min(...deadlines);
 return {deliveryAt,evaluatedAt:Number.isFinite(evaluatedAt)?evaluatedAt:null,deadline:deadlines.length&&deadlines.every(Number.isFinite)?Math.min(...deadlines):null,eligible,source:'same_host_wall_clock_before_delivery',bodyChanged:false};
}
export function clockProbe(page,info){
 const exchanges=[],pending=[];let synchronization=null,closed=false,previouslyExpired=false;
 const onResponse=response=>{
  if(new URL(response.url()).pathname!=='/api/native-pilot'||response.request().headers()['x-unfarmd-native-intent']!=='inspect')return;
  const item={httpStatus:response.status(),requestMint:response.request().postDataJSON()?.mint??null,headers:response.headers(),hostReceivedAt:Date.now(),body:null,bodySha256:null,readError:null};exchanges.push(item);
  pending.push((async()=>{try{const text=await response.text();if(Buffer.byteLength(text)>131072)throw Error('BODY_BOUND');item.body=JSON.parse(text);item.bodySha256=hash(text);}catch{item.readError='unreadable_or_invalid_body';}})());
 };
 page.on('response',onResponse);
 return {
  async install({synchronize=false}={}){
   await page.evaluate(()=>{
    const now=Date.now.bind(Date),state={samples:[],mutations:[],fetches:[],aborts:[]};window.__nativeClockProbe=state;
    Date.now=function(){const at=now();if(state.samples.length<2048){const stack=(new Error().stack??'').split('\n').slice(2,6);state.samples.push({at,caller:stack[0]??'',stack});}return at;};
    const originalFetch=window.fetch;window.fetch=function(input,init){
     if(String(input)==='/api/native-pilot'&&init?.headers?.['X-UNFARMD-NATIVE-INTENT']==='inspect'){
      state.fetches.push({at:now(),intent:'inspect'});init.signal?.addEventListener('abort',()=>state.aborts.push({at:now(),name:['TimeoutError','AbortError'].includes(init.signal.reason?.name)?init.signal.reason.name:'other'}),{once:true});
     }
     return Reflect.apply(originalFetch,this,arguments);
    };
    new MutationObserver(()=>{const row=document.querySelector('[data-oracle-take] [data-take-part="take"]');if(!row)return;const value={at:now(),tone:row.getAttribute('data-tone'),lead:row.querySelector('summary>strong')?.textContent??null};if(state.mutations.length<128&&JSON.stringify(value)!==JSON.stringify(state.mutations.at(-1)))state.mutations.push(value);}).observe(document.getElementById('root'),{subtree:true,childList:true,attributes:true,attributeFilter:['data-tone']});
   });
   if(synchronize)await page.route('**/api/native-pilot',async route=>{
    // Forward the REAL request to the REAL local PG/B/A path, once; never synthesize success.
    const response=await route.fetch({maxRetries:0,maxRedirects:0,timeout:10000}),body=await response.body();
    if(body.length>131072)throw Error('SYNTHETIC_CLOCK_BODY_BOUND');
    let evidence;try{evidence=JSON.parse(body.toString('utf8'));}catch{evidence=null;}
    synchronization={...deliveryClock(evidence,response.status(),Date.now()),forwardedBodySha256:hash(body)};
    if(synchronization.eligible)await page.clock.setSystemTime(new Date(synchronization.deliveryAt));
    // Denied, stale, future, malformed or uncertain data stays unchanged and cannot be made current.
    await route.fulfill({response,body});
   });
  },
  async snapshot(label){
   await Promise.all(pending);
   const browser=await page.evaluate(()=>({at:Date.now(),probe:window.__nativeClockProbe??null,tone:document.querySelector('[data-oracle-take] [data-take-part="take"]')?.getAttribute('data-tone')??null,lead:document.querySelector('[data-oracle-take] [data-take-part="take"]>summary>strong')?.textContent??null,explanation:document.querySelector('[data-oracle-take]')?.textContent??null,error:document.querySelector('#native-inspect-error')?.textContent??null}));
   const countsResponse=await page.request.get('/__counts'),counts=await countsResponse.json(),exchange=exchanges.at(-1),e=exchange?.body;
   const samples=browser.probe?.samples?.filter(s=>/\bat inspect\b/.test(s.caller))??[],handledAt=samples.at(-1)?.at??null,evaluatedAt=Date.parse(e?.evaluatedAt),references=Array.isArray(e?.references)?e.references:[],deadlines=references.map(r=>Date.parse(r?.receivedAt)+60000),deadline=deadlines.length&&deadlines.every(Number.isFinite)?Math.min(...deadlines):null;
   let schemaValid=false,atHandled=null,atHost=null;
   if(e){const model=require(process.env.NATIVE_LENS_BUILD+'/app/lens/native-evidence-model.js'),{nativeTake}=require(process.env.NATIVE_LENS_BUILD+'/app/lens/native-take.js');schemaValid=model.isNativeEvidence(e,exchange?.requestMint);if(schemaValid){if(handledAt!==null)atHandled=nativeTake(e,handledAt).take;atHost=nativeTake(e,Date.now()).take;}}
   const classification=classifyClock({status:exchange?.httpStatus,readError:exchange?.readError,schemaValid,handledAt,evaluatedAt,deadline,pureTone:atHandled?.tone,displayedTone:browser.tone,abortName:browser.probe?.aborts.at(-1)?.name,observedAt:browser.at,previouslyExpired});
   if(schemaValid&&deadline!==null&&browser.at>=deadline)previouslyExpired=true;
   const report={version:'synthetic-native-clock-probe/1',label,project:info.project.name,storageKind:counts.storageKind,http:exchanges,browser,cachedHandlingAt:handledAt,evidenceState:e?.state??null,evaluatedAt:Number.isFinite(evaluatedAt)?evaluatedAt:null,expiryDeadline:deadline,receiptDeadlines:references.map(r=>({id:r?.id??null,deadline:Date.parse(r?.receivedAt)+60000})),receipts:counts.receipts,counts,synchronization,schemaValid,atHandled,atHost,classification,providerCalls:false,activate:false};
   await info.attach('SYNTHETIC-clock-'+label,{body:Buffer.from(JSON.stringify(report,null,2)),contentType:'application/json'});
   console.log('SYNTHETIC_CLOCK_PROBE '+JSON.stringify({label,project:info.project.name,status:exchange?.httpStatus,bodySha256:exchange?.bodySha256,evidenceState:report.evidenceState,schemaValid,classification,handledAt,evaluatedAt:report.evaluatedAt,deadline,observedBrowserAt:browser.at,tone:browser.tone,pureAtHandling:atHandled?.tone,pureAtHost:atHost?.tone,explanation:browser.explanation?.slice(0,3000),receipts:counts.receipts,reads:counts.reads,inspections:counts.inspections,attempts:counts.state?.attempts,credits:counts.state?.credits,synchronization,activate:false}));
   return report;
  },
  async finish(){if(closed)return;closed=true;try{await this.snapshot('final');}finally{page.off('response',onResponse);}}
 };
}
