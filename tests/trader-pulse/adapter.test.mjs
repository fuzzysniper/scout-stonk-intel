import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {MINT,QUOTE,AT,pool,approval,response,encode} from './fixtures.mjs';
const require=createRequire(import.meta.url);
const {createPrivateResearchAdapter}=require(process.env.PULSE_BUILD+'/lib/trader-pulse/adapter.js');
const endpoint=`https://api.dexscreener.com/token-pairs/v1/solana/${MINT}`;
const opts=(extra={})=>({approval:approval(),now:()=>AT,fetcher:async()=>response(),...extra});

test('construction and missing rights approval cause zero source I/O',async()=>{
 let calls=0;const a=createPrivateResearchAdapter({fetcher:async()=>{calls++;throw Error('NEVER')}});
 assert.equal(calls,0);const r=await a.observe(MINT,'explicit_user_action');
 assert.equal(r.reason,'owner_source_review_required');assert.equal(calls,0);
});
for(const bad of [null,{},approval({purpose:'public_signals'}),approval({sourceUseReviewed:false}),approval({publicRedistribution:true}),approval({reference:''}),approval({expiresMs:AT}),approval({expiresMs:AT+86400001}),approval({maxRequests:0}),approval({maxRequests:4}),approval({exactMints:[QUOTE]}),approval({exactMints:[MINT,MINT]}),approval({exactMints:['USDC']}),approval({exactMints:[]})]){
 test(`bad/expired/private scope review denies before fetch: ${JSON.stringify(bad).slice(0,75)}`,async()=>{
  let calls=0;const a=createPrivateResearchAdapter(opts({approval:bad,fetcher:async()=>{calls++;return response()}}));
  assert.equal((await a.observe(MINT,'explicit_user_action')).state,'blocked');assert.equal(calls,0);
 });
}
test('one exact-source GET, no keys, redirect, credential, retry, fanout or cache',async()=>{
 let calls=0,request;const a=createPrivateResearchAdapter(opts({fetcher:async(url,init)=>{calls++;request={url,init};return response()}}));
 const r=await a.observe(MINT,'explicit_user_action');assert.equal(r.state,'ready');assert.equal(calls,1);
 assert.equal(request.url,endpoint);assert.equal(request.init.method,'GET');assert.equal(request.init.credentials,'omit');
 assert.equal(request.init.redirect,'error');assert.equal(request.init.cache,'no-store');
 assert.deepEqual(request.init.headers,{Accept:'application/json','Accept-Encoding':'identity'});
 assert.equal(request.init.body,undefined);assert.equal(r.report.source.clock.providerObservedAt,null);
 assert.equal(r.report.priceImpulse.value,null);assert.equal(r.report.liquidity.state,'uncertain');
 assert.equal(request.init.signal.aborted,true);
});
test('intent, mint and arbitrary target injection are rejected before I/O',async()=>{
 let calls=0;const a=createPrivateResearchAdapter(opts({fetcher:async()=>{calls++;return response()}}));
 for(const [mint,intent] of [['USDC','explicit_user_action'],[MINT,'homepage_load'],[MINT,undefined],[endpoint,'explicit_user_action'],[`${MINT},${QUOTE}`,'explicit_user_action']])assert.equal((await a.observe(mint,intent)).state,'blocked');
 assert.equal(calls,0);
});
test('atomic in-instance admission rejects concurrency, then enforces spacing and lifetime three-attempt cap',async()=>{
 let now=AT,calls=0,release;
 const a=createPrivateResearchAdapter(opts({now:()=>now,fetcher:async()=>{calls++;await new Promise(r=>release=r);return response()}}));
 const pending=a.observe(MINT,'explicit_user_action');assert.equal((await a.observe(MINT,'explicit_user_action')).reason,'request_in_flight');
 release();assert.equal((await pending).state,'ready');
 assert.equal((await a.observe(MINT,'explicit_user_action')).reason,'manual_cooldown');
 for(let i=0;i<2;i++){now+=2000;const p=a.observe(MINT,'explicit_user_action');release();assert.equal((await p).state,'ready');}
 now+=86400000;
 assert.equal((await a.observe(MINT,'explicit_user_action')).state,'blocked');assert.equal(calls,3);
});
test('budget never replenishes after spacing (three max) and approval is copied',async()=>{
 let now=AT,calls=0;const permit=approval({maxRequests:1});const a=createPrivateResearchAdapter(opts({approval:permit,now:()=>now,fetcher:async()=>{calls++;return response()}}));
 permit.maxRequests=3;permit.exactMints.push(QUOTE);
 assert.equal((await a.observe(MINT,'explicit_user_action')).state,'ready');now+=2000;
 assert.equal((await a.observe(MINT,'explicit_user_action')).reason,'research_budget_exhausted');assert.equal(calls,1);
});
for(const [retry,wait] of [[null,60000],['0',60000],['120',120000],['Tue, 20 Oct 2026 12:02:00 GMT',120000]]){
 test(`429 observes cooldown without retry: ${retry}`,async()=>{
  let now=AT,calls=0;const a=createPrivateResearchAdapter(opts({now:()=>now,fetcher:async()=>{calls++;return response(null,{status:429,headers:retry===null?{}:{'retry-after':retry}})}}));
  const r=await a.observe(MINT,'explicit_user_action');assert.equal(r.reason,'provider_429');assert.equal(r.retryAt,new Date(AT+wait).toISOString());
  now+=wait-1;assert.equal((await a.observe(MINT,'explicit_user_action')).reason,'manual_cooldown');assert.equal(calls,1);
 });
}
for(const retry of ['garbage','9999999999','-1','Tue, 20 Oct 2026 11:00:00 GMT'])test(`unqualified 429 cooldown stops rather than shortening it: ${retry}`,async()=>{
 let now=AT,calls=0;const a=createPrivateResearchAdapter(opts({now:()=>now,fetcher:async()=>{calls++;return response(null,{status:429,headers:{'retry-after':retry}})}}));
 assert.equal((await a.observe(MINT,'explicit_user_action')).reason,'provider_cooldown_unqualified_stop');
 now+=3600000;assert.equal((await a.observe(MINT,'explicit_user_action')).state,'blocked');assert.equal(calls,1);
});
for(const [name,make] of [
 ['503',()=>response(null,{status:503})],['500',()=>response('secret provider diagnostic',{status:500})],
 ['HTTP redirect',()=>response(null,{status:302})],['followed redirect',()=>response([pool()],{redirected:true})],
 ['different source',()=>response([pool()],{url:'https://evil.test/'})],['wrong chain',()=>response([pool({chainId:'ethereum'})])],
 ['wrong mint',()=>response([pool({baseToken:{address:QUOTE}})])],['HTML',()=>response('<html>',{headers:{'content-type':'text/html'}})],
 ['compression',()=>response([pool()],{headers:{'content-type':'application/json','content-encoding':'gzip'}})],
 ['declared huge body',()=>response([pool()],{headers:{'content-type':'application/json','content-length':'262145'}})],
 ['huge body',()=>response(' '.repeat(262145))],['huge headers',()=>response([pool()],{headers:{'content-type':'application/json','x-large':'x'.repeat(16384)}})],
 ['length mismatch',()=>response([pool()],{headers:{'content-type':'application/json','content-length':'1'}})],
 ['malformed JSON',()=>response('[oops')],['missing body',()=>response(null)],
 ['transport exception',()=>{throw Error('secret diagnostic https://secret@provider.invalid/')}],
])test(`source/transport failure stops without retries or diagnostic leak: ${name}`,async()=>{
 let calls=0,now=AT;const a=createPrivateResearchAdapter(opts({now:()=>now,fetcher:async()=>{calls++;return make()}}));
 const r=await a.observe(MINT,'explicit_user_action');assert.equal(r.state,'unavailable');
 assert.doesNotMatch(JSON.stringify(r),/secret|provider.invalid|<html>/);now+=2000;
 assert.equal((await a.observe(MINT,'explicit_user_action')).state,'blocked');assert.equal(calls,1);
});
test('UTF8 and chunk flood bounded before decode',async()=>{
 for(const mode of ['invalid_utf8','chunk_flood']){
  let count=0;const body=new ReadableStream({pull(controller){
   if(mode==='invalid_utf8'){controller.enqueue(new Uint8Array([0xff]));controller.close();}
   else if(count++<1025)controller.enqueue(encode(' '));else controller.close();
  }});
  const r=new Response(body,{headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:endpoint});
  const a=createPrivateResearchAdapter(opts({fetcher:async()=>r}));
  assert.equal((await a.observe(MINT,'explicit_user_action')).state,'unavailable');
 }
});
test('no response/network task can exceed the bounded source deadline (uncooperative mocks)',{timeout:7000},async()=>{
 let calls=0;const a=createPrivateResearchAdapter(opts({fetcher:async()=>{calls++;return new Promise(()=>{})}}));
 const start=performance.now();const r=await a.observe(MINT,'explicit_user_action');
 assert.equal(r.state,'unavailable');assert.ok(performance.now()-start<6000);assert.equal(calls,1);
 assert.equal((await a.observe(MINT,'explicit_user_action')).state,'blocked');
});
test('hung streaming body is also bounded by the same total deadline',{timeout:7000},async()=>{
 const r=new Response(new ReadableStream({pull(){return new Promise(()=>{})}}),{headers:{'content-type':'application/json'}});
 Object.defineProperty(r,'url',{value:endpoint});const a=createPrivateResearchAdapter(opts({fetcher:async()=>r}));
 const start=performance.now();assert.equal((await a.observe(MINT,'explicit_user_action')).state,'unavailable');assert.ok(performance.now()-start<6000);
});
test('backwards clocks, response after approval expiry and late acquisition are unavailable',async()=>{
 for(const delta of [-1,4001,100]){
  let now=AT;const a=createPrivateResearchAdapter(opts({approval:approval({expiresMs:AT+100}),now:()=>now,fetcher:async()=>{now+=delta;return response()}}));
  assert.equal((await a.observe(MINT,'explicit_user_action')).state,'unavailable');
 }
 let now=AT;const a=createPrivateResearchAdapter(opts({now:()=>now}));
 assert.equal((await a.observe(MINT,'explicit_user_action')).state,'ready');now=AT-1;
 assert.equal((await a.observe(MINT,'explicit_user_action')).reason,'clock_invalid');
});
test('HTTP Date, Age and Last-Modified are never substituted for market/source clocks',async()=>{
 const a=createPrivateResearchAdapter(opts({fetcher:async()=>response([pool()],{headers:{'content-type':'application/json',date:'Tue, 20 Oct 2026 12:00:00 GMT','last-modified':'Tue, 20 Oct 2026 12:00:00 GMT',age:'0'}})}));
 const r=await a.observe(MINT,'explicit_user_action');assert.equal(r.state,'ready');
 assert.equal(r.report.source.clock.providerObservedAt,null);assert.equal(r.report.source.clock.underlyingTradeAt,null);
 assert.equal(r.report.priceImpulse.value,null);
});
