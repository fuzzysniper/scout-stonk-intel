import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import {AT,T,OTHER,quote,registry,token,page,reward,address,sourceGraph,history,point} from './pairs-fixtures.mjs';
const load=async file=>import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'lib',file)).href);
const {createPairSource,createPairSources,parsePairRegistry,parseCatalogPage,verifyMode}=await load('pairs-source.js');
const {pairCatalogReport}=await load('pairs.js');
const provenance={source:'https://www.stonkfun.xyz/api/public/v1/tokens?sort=marketCap&page=1&pageSize=25',fetchedAt:new Date(AT).toISOString(),providerGeneratedAt:new Date(AT).toISOString(),revision:'sha256:synthetic'};
test('fixed pagination/body/request bounds, max12 mode checks, coalescing and cache do not imply complete coverage',async()=>{
 const rows=Array.from({length:75},(_,i)=>token(address(i))),g=sourceGraph({rows,total:178026});
 const read=createPairSource(g.fetcher,()=>AT);
 const responses=await Promise.all([read(),read(),read()]);
 assert.equal(g.calls.length,15);assert.ok(responses.every(r=>r.value===responses[0].value));
 const r=responses[0];assert.equal(r.value.tokens.length,50);assert.equal(r.value.pagesFetched,2);assert.equal(r.value.modeChecks,12);
 assert.equal(await read().then(r=>r.sourceStatus),'cached');assert.equal(g.calls.length,15);
 for(const c of g.calls) {assert.equal(c.options.method,'GET');assert.equal(c.options.redirect,'error');assert.equal(new URL(c.url).origin,'https://www.stonkfun.xyz');assert.equal(c.options.cache,'no-store');}
 const out=pairCatalogReport(r,history(),new Date(AT));assert.equal(out.dataset.coverage.complete,false);assert.equal(out.dataset.coverage.atomic,false);
 assert.equal(out.dataset.coverage.providerReportedTotal,178026);assert.equal(out.dataset.coverage.modeCheckLimit,12);
 assert.ok(r.value.sources.every(s=>/^sha256:[a-f0-9]{64}$/.test(s.revision)));
});
test('registry/catalog require exact quote mint+symbol, valid pool, network, page and program; ticker aliases never merge',async()=>{
 const q=[quote(),quote(OTHER.quoteMint,T.quoteSymbol)];
 const rows=[token(),token(OTHER.mint,OTHER.quoteMint,T.quoteSymbol),token(address(1),OTHER.quoteMint,'FORGED'),token(address(2),address(3),'STONK'),{...token(address(4)),pool:'bad'}];
 const g=sourceGraph({quotes:q,rows});const r=await createPairSource(g.fetcher,()=>AT)();
 assert.equal(r.value.tokens.length,2);assert.equal(r.value.rejectedRecords,3);
 const out=pairCatalogReport(r,history(),new Date(AT));assert.equal(out.groups.length,2);assert.ok(out.groups.every(g=>g.quoteSymbol==='STONK'));assert.notEqual(out.groups[0].quoteMint,out.groups[1].quoteMint);
 assert.throws(()=>parsePairRegistry(registry([quote(),quote()])),/invalid_registry/);
 assert.throws(()=>parsePairRegistry(registry([{...quote(),tokenProgram:'arbitrary'}])),/invalid_registry/);
 for(const mutate of [x=>x.data.pagination.page=2,x=>x.data.pagination.pageSize=100,x=>x.data.pagination.totalPages=999,x=>x.data.network='devnet',x=>x.data.tokens=Array(26).fill(token())]) {
  const x=page();mutate(x);assert.throws(()=>parseCatalogPage(x,1,q,provenance));
 }
});
test('mode checks fail closed on forged mint/quote/mode and never imply a payout or holder ROI',async()=>{
 assert.equal(verifyMode(reward(),{...token(),quoteMint:T.quoteMint,quoteSymbol:T.quoteSymbol}),'verified_reward');
 const g=sourceGraph({modeTransform:r=>({...r,quote:{mint:OTHER.quoteMint,symbol:'NVDAX'}})});
 const r=await createPairSource(g.fetcher,()=>AT)();assert.equal(r.sourceStatus,'degraded');assert.equal(r.value.tokens.length,0);assert.equal(r.value.rejectedRecords,1);
 const good=await createPairSource(sourceGraph().fetcher,()=>AT)();
 const out=pairCatalogReport(good,history({[T.mint]:[point()]}),new Date(AT)),t=out.groups[0].tokens[0];
 assert.equal(t.rewardModeVerified,true);assert.equal(t.observationCount,1);assert.equal(t.lastObservedAt,new Date(AT).toISOString());
 assert.equal(t.comparisonStatus,'unavailable');for(const k of ['quoteRelativePriceReturn','quoteAssetBenchmarkReturn','holderAttributedReward'])assert.equal(t.comparisons[k],null);
 assert.equal(t.market.priceUsd,0);assert.equal(t.market.liquidityUsd,null);assert.equal(t.market.observedAt,null);assert.equal(t.market.unit,'USD');
});
test('standard launches are not holder-reward launches and awaiting/missing checks are explicit',async()=>{
 const row={...token(),mode:'standard'};
 const g=sourceGraph({rows:[row],modeTransform:r=>({...r,rewards:null})});
 const r=await createPairSource(g.fetcher,()=>AT)();const out=pairCatalogReport(r,history(),new Date(AT));
 assert.equal(out.groups[0].tokens[0].modeVerification,'verified_standard');assert.equal(out.groups[0].tokens[0].rewardModeVerified,false);
 assert.equal(out.groups[0].tokens[0].historyStatus,'identity_mismatch');
});
test('empty filtered registry group, untracked/missing/stale histories and provider times never invent observations',async()=>{
 const r=await createPairSource(sourceGraph({rows:[token(address(1))]}).fetcher,()=>AT)();
 let out=pairCatalogReport(r,history(),new Date(AT),OTHER.quoteMint);
 assert.equal(out.groups[0].tokens.length,0);assert.equal(out.groups[0].availability,'no_tokens_in_bounded_sample');assert.equal(out.groups[0].verification,'official_registry_only');
 out=pairCatalogReport(r,history(),new Date(AT));assert.equal(out.groups[0].tokens[0].historyStatus,'not_tracked');assert.equal(out.groups[0].tokens[0].observationCount,null);
 const tracked=await createPairSource(sourceGraph().fetcher,()=>AT)();
 for(const status of ['unavailable','degraded']) {
  const t=pairCatalogReport(tracked,history({[T.mint]:[point()]},status),new Date(AT)).groups[0].tokens[0];
  assert.equal(t.observationCount,null);assert.equal(t.lastObservedAt,null);assert.equal(t.historyStatus,'source_unavailable');
 }
 const stale=pairCatalogReport(tracked,history({[T.mint]:[point(AT-4*3600000)]}),new Date(AT)).groups[0].tokens[0];
 assert.equal(stale.historyFreshness,'stale');assert.equal(stale.lastObservedAt,new Date(AT-4*3600000).toISOString());
 const empty=pairCatalogReport(tracked,history(),new Date(AT)).groups[0].tokens[0];assert.equal(empty.observationCount,0);assert.equal(empty.lastObservedAt,null);
 const mismatch=pairCatalogReport(tracked,history({[T.mint]:[{...point(),quoteMint:OTHER.quoteMint}]}),new Date(AT)).groups[0].tokens[0];
 assert.equal(mismatch.historyStatus,'identity_mismatch');assert.equal(mismatch.observationCount,null);
});
test('source failures, oversized data, stale/future timestamps, invalid JSON/UTF8, redirect and transport age expose no raw errors',async()=>{
 const invalid=[
  ()=>{throw Error('synthetic-private-response')},()=>new Response(null,{status:503}),()=>new Response(null,{status:302,headers:{location:'https://evil.invalid'}}),
  ()=>Response.json(registry(),{headers:{'content-length':'600000'}}),()=>new Response('{bad'),
  ()=>new Response(new Uint8Array([255])),()=>Response.json(registry(undefined,AT-3*3600000-1)),
  ()=>Response.json(registry(undefined,AT+60001)),()=>Response.json(registry(),{headers:{age:'301'}}),
  ()=>new Response('x'.repeat(512*1024+1)),
 ];
 for(const fetcher of invalid) {
  const r=await createPairSource(fetcher,()=>AT)();assert.equal(r.sourceStatus,'unavailable');assert.equal(r.value,null);assert.doesNotMatch(JSON.stringify(r),/private|evil/);
 }
});
test('partial page outage stays bounded and degraded; conflicting identities and shifting totals are disclosed',async()=>{
 const rows=Array.from({length:30},(_,i)=>token(address(i))),g=sourceGraph({rows});
 const fetcher=(url,opts)=>String(url).includes('page=2')?Promise.resolve(new Response(null,{status:503})):g.fetcher(url,opts);
 const r=await createPairSource(fetcher,()=>AT)();assert.equal(r.sourceStatus,'degraded');assert.equal(r.value.pagesFetched,1);assert.equal(r.value.tokens.length,25);assert.ok(r.value.warnings.includes('catalog_page_unavailable'));
 const conflict=sourceGraph({rows:[token(),{...token(),pool:OTHER.poolMint}]});
 const c=await createPairSource(conflict.fetcher,()=>AT)();assert.equal(c.value.tokens.length,0);assert.ok(c.value.warnings.includes('conflicting_catalog_identity'));
});
test('429 honors cooldown without retries, recovers later and overall deadline bounds even noncompliant fetch/body',async()=>{
 let now=AT,calls=0,fail=true;
 const g=sourceGraph({now:()=>now});
 const read=createPairSource((url,opts)=>{calls++;return fail?Promise.resolve(new Response(null,{status:429,headers:{'retry-after':'600'}})):g.fetcher(url,opts)},()=>now);
 assert.equal((await read()).sourceStatus,'unavailable');now+=599999;await read();assert.equal(calls,1);
 fail=false;now+=2;assert.equal((await read()).sourceStatus,'available');
 const start=Date.now();const hang=await createPairSource(()=>new Promise(()=>{}),()=>AT,20)();
 assert.equal(hang.sourceStatus,'unavailable');assert.ok(Date.now()-start<1000);
 const stream=new ReadableStream({pull:()=>new Promise(()=>{})});
 assert.equal((await createPairSource(()=>Promise.resolve(new Response(stream)),()=>AT,20)()).sourceStatus,'unavailable');
});
test('cached provider data cannot cross its stale threshold; stable output is identity ordering rather than payout ranking',async()=>{
 let now=AT;const g=sourceGraph({rows:[token(OTHER.mint,OTHER.quoteMint,'NVDAX'),token()],now:()=>AT-3*3600000+1000});
 const read=createPairSource(g.fetcher,()=>now);assert.equal((await read()).sourceStatus,'available');
 now+=1001;assert.equal((await read()).sourceStatus,'unavailable');
 const live=await createPairSource(sourceGraph({rows:[token(OTHER.mint,OTHER.quoteMint,'NVDAX'),token()]}).fetcher,()=>AT)();
 const first=pairCatalogReport(live,history(),new Date(AT)),second=pairCatalogReport(live,history(),new Date(AT));
 assert.deepEqual(first,second);assert.deepEqual(first.groups.map(g=>g.quoteSymbol),['NVDAX','STONK']);
});
test('mode outages retain catalog-only evidence, pause safely on unsupported rate delays, and reject mode/mint forgery',async()=>{
 const g=sourceGraph();
 const bad=await createPairSource((url,opts)=>String(url).includes('/api/v2/')?Promise.resolve(new Response(null,{status:503})):g.fetcher(url,opts),()=>AT)();
 assert.equal(bad.sourceStatus,'degraded');assert.equal(bad.value.tokens.length,1);assert.equal(bad.value.tokens[0].modeVerification,'source_unavailable');
 assert.equal(pairCatalogReport(bad,history(),new Date(AT)).groups[0].tokens[0].rewardModeVerified,false);
 for(const mutation of [r=>({...r,mint:OTHER.mint}),r=>({...r,mode:'standard'})]) {
  const forged=sourceGraph({modeTransform:mutation}),r=await createPairSource(forged.fetcher,()=>AT)();
  assert.equal(r.value.tokens.length,0);assert.ok(r.value.warnings.includes('reward_identity_mismatch'));
 }
 for(const delay of ['7200','tomorrow']) {
  let calls=0,now=AT;
  const read=createPairSource(()=>{calls++;return Promise.resolve(new Response(null,{status:429,headers:{'retry-after':delay}}))},()=>now);
  await read();now+=24*3600000;assert.equal((await read()).sourceStatus,'unavailable');assert.equal(calls,1,'Do not shorten an unsupported upstream wait');
 }
});
test('mode network concurrency is at most3 and totals/page-order drift cannot become completeness',async()=>{
 const rows=Array.from({length:50},(_,i)=>token(address(i))),g=sourceGraph({rows,total:50});let active=0,peak=0;
 const read=createPairSource(async(url,opts)=>{
  if(String(url).includes('/api/v2/')) {
   active++;peak=Math.max(peak,active);
   await new Promise(resolve=>setTimeout(resolve,2));
   try{return await g.fetcher(url,opts);}finally{active--;}
  }
  const response=await g.fetcher(url,opts);
  if(String(url).includes('page=2')) {
   const value=await response.json();value.data.pagination.total=51;value.data.pagination.totalPages=3;
   return Response.json(value);
  }
  return response;
 },()=>AT);
 const r=await read();assert.equal(peak,3);assert.ok(r.value.warnings.includes('pagination_total_changed'));
 assert.equal(pairCatalogReport(r,history(),new Date(AT)).dataset.coverage.complete,false);
});

test('malformed recorded history stays invalid_data rather than fabricated empty history',async()=>{
 const r=await createPairSource(sourceGraph().fetcher,()=>AT)();
 const report=pairCatalogReport(r,history({[T.mint]:[{...point(),observedAt:'not-a-time'}]}),new Date(AT));
 const t=report.groups[0].tokens[0];assert.equal(t.historyStatus,'invalid_data');
 assert.equal(t.observationCount,null);assert.equal(t.lastObservedAt,null);
 assert.ok(t.historyIssues.includes('malformed_timestamp'));assert.equal(t.comparisonStatus,'unavailable');
});

test('opt-in scoped discovery finds out-of-global-sample records with exact upstream query and unchanged bounds',async()=>{
 const global=sourceGraph({rows:[token(OTHER.mint,OTHER.quoteMint,'NVDAX')]});
 const rows=Array.from({length:75},(_,i)=>token(address(i))),scoped=sourceGraph({rows});
 const fetcher=(url,opts)=>String(url).includes('quoteMint=') || (String(url).includes('/api/v2/') && !String(url).includes(OTHER.mint)) ? scoped.fetcher(url,opts) : global.fetcher(url,opts);
 const sources=createPairSources(fetcher,()=>AT);
 const baseline=await sources.global();assert.equal(baseline.value.tokens.length,1);
 const results=await Promise.all([sources.scoped(T.quoteMint),sources.scoped(T.quoteMint),sources.scoped(T.quoteMint)]);
 const r=results[0];assert.ok(results.every(result=>result.value===r.value));
 assert.equal(r.value.tokens.length,50);assert.equal(r.value.modeChecks,12);assert.equal(scoped.calls.length,14);
 const report=pairCatalogReport(r,history(),new Date(AT),T.quoteMint);
 assert.equal(report.groups.length,1);assert.equal(report.groups[0].tokens.length,50);
 assert.deepEqual(report.dataset.coverage.discovery,{strategy:'provider_quote_mint',quoteMint:T.quoteMint,providerReportedTotalScope:'quote_mint'});
 assert.equal(report.dataset.coverage.complete,false);assert.equal(report.dataset.coverage.atomic,false);
 assert.equal(report.dataset.coverage.providerReportedTotal,75);
 for(const source of r.value.sources.filter(s=>s.source.includes('/v1/tokens'))) {
  assert.equal(new URL(source.source).searchParams.get('quoteMint'),T.quoteMint);
  assert.match(source.revision,/^sha256:[a-f0-9]{64}$/);assert.equal(source.fetchedAt,new Date(AT).toISOString());
 }
 const calls=scoped.calls.length;assert.equal((await sources.scoped(T.quoteMint)).sourceStatus,'cached');assert.equal(scoped.calls.length,calls);
 assert.equal((await sources.global()).sourceStatus,'cached');
});
test('ignored filter, same-symbol wrong mint, malformed quote and incomplete provider pages cannot masquerade as scoped discovery',async()=>{
 for(const row of [token(OTHER.mint,OTHER.quoteMint,T.quoteSymbol),{...token(),quote:null}]) {
  const graph=sourceGraph({quotes:[quote(),quote(OTHER.quoteMint,T.quoteSymbol)],rows:[token(),row]});
  const result=await createPairSource(graph.fetcher,()=>AT,10000,T.quoteMint)();
  assert.equal(result.sourceStatus,'unavailable');assert.equal(result.value,null);
  assert.equal(graph.calls.filter(c=>c.url.includes('/api/v2/')).length,0);
 }
 const short=sourceGraph({rows:[token()],total:100});
 assert.equal((await createPairSource(short.fetcher,()=>AT,10000,T.quoteMint)()).sourceStatus,'unavailable');
 assert.throws(()=>parseCatalogPage(page([token(OTHER.mint,OTHER.quoteMint,T.quoteSymbol)]),1,[quote(),quote(OTHER.quoteMint,T.quoteSymbol)],provenance,T.quoteMint),/pair_filter_mismatch/);
});
test('second-page mismatch/outage and changing totals retain only validated scoped pages with partial/degraded provenance',async()=>{
 const rows=Array.from({length:60},(_,i)=>token(address(i)));
 for(const fail of ['wrong_quote','outage','total_change']) {
  const graph=sourceGraph({rows});
  const fetcher=async(url,opts)=>{
   const response=await graph.fetcher(url,opts);
   if(!String(url).includes('page=2'))return response;
   if(fail==='outage')return new Response(null,{status:503});
   const value=await response.json();
   if(fail==='wrong_quote')value.data.tokens[0].quote={mint:OTHER.quoteMint,symbol:'NVDAX'};
   else value.data.pagination.total=61;
   return Response.json(value);
  };
  const r=await createPairSource(fetcher,()=>AT,10000,T.quoteMint)();
  assert.equal(r.sourceStatus,'degraded');assert.equal(r.value.pagesFetched,fail==='total_change'?2:1);
  assert.ok(r.value.tokens.every(row=>row.quoteMint===T.quoteMint));
  assert.ok(r.value.warnings.includes(fail==='wrong_quote'?'pair_filter_mismatch':fail==='total_change'?'pagination_total_changed':'catalog_page_unavailable'));
  assert.equal(pairCatalogReport(r,history(),new Date(AT)).dataset.coverage.complete,false);
 }
});
test('scoped admission is one cold refresh per minute, four retained scopes, no cache churn or hidden enumeration',async()=>{
 let now=AT;const quotes=Array.from({length:5},(_,i)=>quote(address(i),i<2?'SAME':'TEST'+i));
 const graph=sourceGraph({quotes,rows:[],now:()=>now}),sources=createPairSources(graph.fetcher,()=>now);
 let r=await sources.scoped(quotes[0].mint);assert.equal(r.sourceStatus,'available');assert.equal(graph.calls.length,2);
 assert.equal(pairCatalogReport(r,history(),new Date(now),quotes[0].mint).groups[0].availability,'no_tokens_in_bounded_sample');
 assert.equal((await sources.scoped(quotes[1].mint)).sourceStatus,'unavailable');assert.equal(graph.calls.length,2);
 assert.equal((await sources.scoped('invalid')).sourceStatus,'unavailable');assert.equal(graph.calls.length,2);
 for(let i=1;i<4;i++){now+=60000;assert.equal((await sources.scoped(quotes[i].mint)).sourceStatus,'available');}
 const calls=graph.calls.length;now+=60000;
 assert.equal((await sources.scoped(quotes[4].mint)).sourceStatus,'unavailable');assert.equal(graph.calls.length,calls);
 assert.equal((await sources.scoped(quotes[0].mint)).sourceStatus,'cached');assert.equal(graph.calls.length,calls);
 now=AT+300001;assert.equal((await sources.scoped(quotes[4].mint)).sourceStatus,'available');assert.equal(graph.calls.length,calls+2);
});
test('scope capacity uses completed snapshot time so slow reads cannot evict a still-warm entry',async()=>{
 let now=AT;const quotes=Array.from({length:5},(_,i)=>quote(address(i),'TEST'+i));
 const graph=sourceGraph({quotes,rows:[],now:()=>now});
 const sources=createPairSources(async(url,opts)=>{
  const response=await graph.fetcher(url,opts);
  if(String(url).endsWith('/pairs'))now+=5000;
  return response;
 },()=>now);
 for(let i=0;i<4;i++){if(i)now+=60000;assert.equal((await sources.scoped(quotes[i].mint)).sourceStatus,'available');}
 const calls=graph.calls.length;now=AT+300001;
 assert.equal((await sources.scoped(quotes[4].mint)).sourceStatus,'unavailable');assert.equal(graph.calls.length,calls);
 assert.equal((await sources.scoped(quotes[0].mint)).sourceStatus,'cached');assert.equal(graph.calls.length,calls);
 now=AT+305001;assert.equal((await sources.scoped(quotes[4].mint)).sourceStatus,'available');assert.equal(graph.calls.length,calls+2);
});
test('429 cooldown is shared between scopes and global source without shortening provider waits',async()=>{
 for(const first of ['global','scoped'])for(const delay of ['600','7200','tomorrow']) {
  let now=AT,failed=true,calls=0;const graph=sourceGraph({now:()=>now});
  const sources=createPairSources((url,opts)=>{calls++;return failed?Promise.resolve(new Response(null,{status:429,headers:{'retry-after':delay}})):graph.fetcher(url,opts);},()=>now);
  const initial=first==='global'?sources.global():sources.scoped(T.quoteMint);
  assert.equal((await initial).sourceStatus,'unavailable');assert.equal(calls,1);
  failed=false;now+=599999;
  assert.equal((await sources.scoped(OTHER.quoteMint)).sourceStatus,'unavailable');
  assert.equal((await sources.global()).sourceStatus,'unavailable');assert.equal(calls,1);
  now+=2;
  if(delay==='600')assert.equal((await sources.scoped(T.quoteMint)).sourceStatus,'available');
  else {now+=24*3600000;assert.equal((await sources.scoped(T.quoteMint)).sourceStatus,'unavailable');assert.equal(calls,1);}
 }
});
test('scoped quote absent from registry stops after registry proof; source failure never substitutes global sample',async()=>{
 const graph=sourceGraph(),sources=createPairSources(graph.fetcher,()=>AT);
 const unknown=await sources.scoped(address(99));
 assert.equal(unknown.sourceStatus,'available');assert.equal(unknown.value.pagesFetched,0);assert.equal(graph.calls.length,1);
 assert.equal(unknown.value.sources[0].source,'https://www.stonkfun.xyz/api/public/v1/pairs');
 const mixed=sourceGraph({rows:[token(),token(OTHER.mint,OTHER.quoteMint,'NVDAX')]}),second=createPairSources(mixed.fetcher,()=>AT);
 assert.equal((await second.global()).sourceStatus,'available');
 assert.equal((await second.scoped(T.quoteMint)).sourceStatus,'unavailable');
});
