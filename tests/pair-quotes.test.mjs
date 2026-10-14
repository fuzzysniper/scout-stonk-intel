import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { AT, address, rows, registry } from './pair-quotes-fixtures.mjs';
import { sourceGraph, T } from './pairs-fixtures.mjs';
const load=async file=>import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'lib',file+'.js')).href);
const {parseQuoteRegistry,createQuoteRegistrySource,createPairSources,PAIR_REGISTRY_URL}=await load('pairs-source');
const {parsePairQuoteSearch,pairQuoteRegistryReport}=await load('pairs');
const provenance={source:PAIR_REGISTRY_URL,fetchedAt:new Date(AT).toISOString(),providerGeneratedAt:new Date(AT).toISOString(),revision:'sha256:synthetic-test-only'};
const parse=q=>parsePairQuoteSearch(new URLSearchParams(q));
const source=value=>({value:parseQuoteRegistry(value,provenance),sourceStatus:'available'});

test('full registry validation preserves exact identity, case ambiguity, Unicode and deterministic ordering',()=>{
 const result=parseQuoteRegistry(registry(),provenance),reverse=parseQuoteRegistry(registry([...rows].reverse()),provenance);
 assert.deepEqual(result,reverse);assert.equal(result.quotes.length,5);assert.equal(result.providerAmbiguousSymbolCount,1);
 const stonk=result.quotes.filter(q=>q.quoteSymbol.toLowerCase()==='stonk');
 assert.equal(stonk.length,2);assert.ok(stonk.every(q=>q.symbolAmbiguous && q.providerSymbolAmbiguous && q.symbolMatchCount===2));
 assert.notEqual(stonk[0].quoteMint,stonk[1].quoteMint);assert.ok(result.quotes.some(q=>q.quoteSymbol==='熊猫'));
 const compatibility=source(registry([rows[0],{...rows[1],symbol:'ＳＴＯＮＫ'}]));
 assert.ok(compatibility.value.quotes.every(q=>q.symbolAmbiguous && !q.providerSymbolAmbiguous && q.symbolMatchCount===2));
});
test('local search/list is bounded; exact mint selection never folds mint case or turns names into identity',()=>{
 const s=source(registry());
 for(const q of ['query= StOnK ','query=ＳＴＯＮＫ']) {
  const report=pairQuoteRegistryReport(s,parse(q),new Date(AT));assert.equal(report.quotes.length,2);
  assert.equal(report.dataset.coverage.registryCount,5);assert.equal(report.dataset.coverage.matchedCount,2);
  assert.equal(report.dataset.coverage.tokenCatalogComplete,false);
 }
 for(const q of ['query=モモ太','query=熊猫','query=boiúna'])assert.equal(pairQuoteRegistryReport(s,parse(q),new Date(AT)).quotes.length,1);
 assert.equal(pairQuoteRegistryReport(s,parse('query=Synthetic one'),new Date(AT)).quotes.length,2);
 let r=pairQuoteRegistryReport(s,parse('limit=2'),new Date(AT));assert.equal(r.quotes.length,2);assert.equal(r.dataset.coverage.nextOffset,2);assert.equal(r.dataset.coverage.resultTruncated,true);
 const next=pairQuoteRegistryReport(s,parse('limit=2&offset=2'),new Date(AT));assert.ok(!next.quotes.some(q=>r.quotes.some(first=>first.quoteMint===q.quoteMint)));
 r=pairQuoteRegistryReport(s,parse('mint='+address(3)),new Date(AT));assert.equal(r.status,'available');assert.equal(r.quotes[0].quoteMint,address(3));
 r=pairQuoteRegistryReport(s,parse('query='+address(3)),new Date(AT));assert.equal(r.quotes[0].quoteMint,address(3));
 r=pairQuoteRegistryReport(s,parse('mint='+address(99)),new Date(AT));assert.equal(r.status,'not_found');assert.equal(r.dataset.coverage.matchedCount,0);
 r=pairQuoteRegistryReport(s,parse('query='+address(99)),new Date(AT));assert.equal(r.status,'available');assert.deepEqual(r.quotes,[]);
 assert.equal(pairQuoteRegistryReport(s,parse('query=no-matches'),new Date(AT)).dataset.coverage.matchedCount,0);
 const exactMint=address(100).slice(0,-1)+'a',otherCase=exactMint.slice(0,-1)+'A';
 const exactSource=source(registry([{...rows[0],mint:exactMint}]));
 assert.equal(pairQuoteRegistryReport(exactSource,parse('mint='+exactMint),new Date(AT)).quotes.length,1);
 assert.equal(pairQuoteRegistryReport(exactSource,parse('mint='+otherCase),new Date(AT)).status,'not_found');
 assert.deepEqual(pairQuoteRegistryReport(exactSource,parse('query='+otherCase),new Date(AT)).quotes,[]);
});
test('invalid/excessive/repeated/URL/regex-shaped parameters cannot choose provider URLs or evade response limits',()=>{
 for(const q of ['url=https://evil.invalid','path=/wallets','query=a&query=b','query=&mint='+address(1),'mint=','mint=%20'+address(1),
  'limit=0','limit=101','limit=1e2','limit=01','offset=-1','offset=1025','offset=1.5','query=%00','query=%C2%85','query='+('a'.repeat(65)),
  'query='+('㍿'.repeat(20)),'query='+('a'.repeat(3000))])assert.equal(parse(q),null,q);
 assert.equal(parse('query=   ').query,'');assert.equal(parse('limit=100&offset=1024').limit,100);
 assert.equal(parse('query=%5Ba-z%5D%2B').query,'[a-z]+'); // Literal substring; never a client-defined regular expression.
});
test('partial/paginated/empty/count or ambiguity conflicts and forged/duplicate identities reject the entire registry',()=>{
 const invalid=[
  v=>v.data.pairs=[],v=>v.data.pagination={page:1,totalPages:2},v=>v.meta.nextCursor='more',v=>v.data.hasMore=true,
  v=>v.data.partial=true,v=>v.meta.complete=false,v=>v.data.total=6,v=>v.data.selectBy='symbol',v=>v.error={code:'source_unavailable'},
  v=>v.data.ambiguousSymbolCount=0,v=>v.data.pairs[0].symbolAmbiguous=false,v=>v.data.pairs[0].mint=' '+address(1),
  v=>v.data.pairs[1].mint=v.data.pairs[0].mint,v=>v.data.pairs[0].tokenProgram='forged',v=>v.data.pairs[0].decimals=19,
  v=>v.data.pairs[0].name='bad\u0085name',v=>v.data.pairs[0].symbol=' STONK',v=>v.data.pairs[0].name='\ud800',
  v=>v.data.pairs=Array.from({length:1025},(_,i)=>({...rows[0],mint:address(i)})),
 ];
 for(const mutate of invalid){const v=registry();mutate(v);assert.throws(()=>parseQuoteRegistry(v,provenance));}
});
test('one fixed registry GET coalesces excessive different searches; cache/provenance never fetches tokens or advances timestamps',async()=>{
 let now=AT,calls=0;const payload=JSON.stringify(registry());
 const read=createQuoteRegistrySource(async(url,opts)=>{calls++;assert.equal(url,PAIR_REGISTRY_URL);assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');return new Response(payload,{headers:{'content-type':'application/json'}});},()=>now);
 const reports=await Promise.all(Array.from({length:100},async(_,i)=>pairQuoteRegistryReport(await read(),parse('query='+i),new Date(now))));
 assert.equal(calls,1);assert.ok(reports.every(r=>r.dataset.coverage.registryCount===5));
 assert.equal(reports[0].dataset.provenance.revision,'sha256:'+createHash('sha256').update(payload).digest('hex'));
 now+=1000;const cached=pairQuoteRegistryReport(await read(),parse(''),new Date(now));
 assert.equal(cached.dataset.sourceStatus,'cached');assert.equal(calls,1);assert.equal(cached.dataset.dataFetchedAt,new Date(AT).toISOString());assert.equal(cached.dataset.fetchedAt,new Date(now).toISOString());
});
test('outage/stale source is unknown, never an empty healthy registry; recovery follows cooldown without fallback',async()=>{
 let now=AT,failed=false,calls=0;
 const read=createQuoteRegistrySource(()=>{calls++;return failed?Promise.reject(Error('private-upstream-error')):Promise.resolve(Response.json(registry(rows,now)));},()=>now);
 assert.equal((await read()).sourceStatus,'available');now+=300001;failed=true;
 let r=pairQuoteRegistryReport(await read(),parse('query=STONK'),new Date(now));assert.equal(r.status,'unavailable');assert.equal(r.dataset.coverage.registryCount,null);assert.equal(r.dataset.coverage.matchedCount,null);assert.equal(r.dataset.provenance,null);
 assert.ok(!JSON.stringify(r).includes('private'));await read();assert.equal(calls,2);
 now+=60001;failed=false;assert.equal((await read()).sourceStatus,'available');
 // Use a separate clock closure to prove cache cannot outlive provider freshness.
 let clock=AT;const aging=createQuoteRegistrySource(()=>Promise.resolve(Response.json(registry(rows,AT-3*3600000+1000))),()=>clock);
 await aging();clock+=1001;assert.equal((await aging()).sourceStatus,'unavailable');
});
test('oversized/partial/invalid transport, JSON and UTF8 fail closed within a bounded deadline',async()=>{
 const responses=[
  ()=>new Response(null,{status:503}),()=>new Response(null,{status:302,headers:{location:'https://evil.invalid'}}),
  ()=>Response.json(registry(),{status:206}),()=>Response.json(registry(),{headers:{'content-length':'524289'}}),
  ()=>Response.json(registry(),{headers:{'content-range':'items 0-24/587'}}),()=>Response.json(registry(),{headers:{link:'<https://evil.invalid>; rel="next"'}}),
  ()=>Response.json(registry(),{headers:{link:'<https://evil.invalid>; rel="prev next"'}}),()=>Response.json(registry(),{headers:{link:"<https://evil.invalid>; rel='next'"}}),
  ()=>Response.json(registry(),{headers:{age:'301'}}),()=>Response.json(registry(),{headers:{'source-age':'broken'}}),
  ()=>new Response('{bad',{headers:{'content-type':'application/json'}}),()=>new Response(new Uint8Array([255]),{headers:{'content-type':'application/json'}}),
  ()=>new Response('x'.repeat(512*1024+1),{headers:{'content-type':'application/json'}}),()=>Response.json(registry(rows,AT+60001)),
 ];
 for(const response of responses)assert.equal((await createQuoteRegistrySource(()=>Promise.resolve(response()),()=>AT)()).sourceStatus,'unavailable');
 const start=Date.now();assert.equal((await createQuoteRegistrySource(()=>new Promise(()=>{}),()=>AT,20)()).sourceStatus,'unavailable');assert.ok(Date.now()-start<1000);
 const stream=new ReadableStream({pull:()=>new Promise(()=>{})});
 assert.equal((await createQuoteRegistrySource(()=>Promise.resolve(new Response(stream,{headers:{'content-type':'application/json'}})),()=>AT,20)()).sourceStatus,'unavailable');
});
test('429 registry/global/scoped cooldown is shared; cached identities remain dated and unsupported waits are never shortened',async()=>{
 for(const origin of ['quotes','global','scoped'])for(const delay of ['600','7200','tomorrow']) {
  let now=AT,calls=0,failed=true;const graph=sourceGraph({now:()=>now});
  const sources=createPairSources((url,opts)=>{calls++;if(failed)return Promise.resolve(new Response(null,{status:429,headers:{'retry-after':delay}}));return String(url)===PAIR_REGISTRY_URL?Promise.resolve(Response.json(registry(rows,now))):graph.fetcher(url,opts);},()=>now);
  assert.equal((await (origin==='scoped'?sources.scoped(T.quoteMint):sources[origin]())).sourceStatus,'unavailable');
  failed=false;now+=599999;await sources.quotes();await sources.global();await sources.scoped(T.quoteMint);assert.equal(calls,1);
  now+=60001;
  if(delay==='600')assert.equal((await sources.quotes()).sourceStatus,'available');
  else {now+=24*3600000;assert.equal((await sources.quotes()).sourceStatus,'unavailable');assert.equal(calls,1);}
 }
 let now=AT,calls=0,fail=false;const sources=createPairSources(()=>{calls++;return Promise.resolve(fail?new Response(null,{status:429,headers:{'retry-after':'600'}}):Response.json(registry(rows,now)));},()=>now);
 await sources.quotes();fail=true;now+=60000;await sources.global();const before=calls;
 assert.equal((await sources.quotes()).sourceStatus,'cached');assert.equal(calls,before);
});
