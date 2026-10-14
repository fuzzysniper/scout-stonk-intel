import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { NextRequest } from 'next/server.js';
import {AT,T,OTHER,quote,sourceGraph,address} from './pairs-fixtures.mjs';
const {GET}=await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'app/api/pairs/route.js')).href);
const request=q=>new NextRequest('http://localhost/api/pairs'+q);
test('pairs GET validates all parameters before any provider access',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('not allowed');};
 try {
  for(const q of ['?quoteMint=bad','?quoteMint='+T.quoteMint+'&quoteMint='+T.quoteMint,'?sort=yield','?page=999','?url=https://evil.invalid','?quoteMint=',
    '?discovery=pair','?quoteMint='+T.quoteMint+'&discovery=local','?quoteMint='+T.quoteMint+'&discovery=pair&discovery=pair']) {
   const r=await GET(request(q));assert.equal(r.status,400);assert.equal(r.headers.get('cache-control'),'no-store');
  }
  assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});

test('cold 503 is structured/sanitized, recovers, filters exact mint, and known empty sample differs from unknown registry mint',async()=>{
 const original=globalThis.fetch,originalNow=Date.now;let now=AT,fail=true;
 Date.now=()=>now;
 const graph=sourceGraph({quotes:[quote(),quote(OTHER.quoteMint,'NVDAX')],now:()=>now});
 globalThis.fetch=async(url,opts)=>{
  if(fail)throw Error('private-key-shaped-upstream-error');
  if(String(url).startsWith('https://raw.githubusercontent.com/'))return Response.json({});
  return graph.fetcher(url,opts);
 };
 try {
  let response=await GET(request(''));assert.equal(response.status,503);let r=await response.json();
  assert.equal(r.schemaVersion,1);assert.deepEqual(r.groups,[]);assert.equal(r.dataset.sourceStatus,'unavailable');assert.equal(r.dataset.dataFetchedAt,null);
  assert.doesNotMatch(JSON.stringify(r),/private|upstream-error/);
  fail=false;now+=60001;response=await GET(request(''));assert.equal(response.status,200);r=await response.json();
  assert.equal(r.groups[0].quoteMint,T.quoteMint);assert.equal(r.groups[0].tokens[0].rewardModeVerified,true);
  assert.equal(r.dataset.coverage.complete,false);assert.equal(r.dataset.coverage.historyScope,'tracked_sample');
  response=await GET(request('?quoteMint='+OTHER.quoteMint));r=await response.json();assert.equal(response.status,200);
  assert.equal(r.groups[0].availability,'no_tokens_in_bounded_sample');assert.equal(r.groups[0].verification,'official_registry_only');assert.deepEqual(r.groups[0].tokens,[]);
  response=await GET(request('?quoteMint='+address(90)));assert.equal(response.status,404);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal((await response.json()).status,'not_found');
 }finally {globalThis.fetch=original;Date.now=originalNow;}
});

test('explicit pair discovery forwards exact mint while existing query behavior remains a local global-sample filter',async()=>{
 const original=globalThis.fetch,originalNow=Date.now;let now=AT+20*3600000;
 Date.now=()=>now;
 const unfiltered=sourceGraph({rows:[tokenForOther()],now:()=>now});
 const pair=sourceGraph({rows:[{...tokenForOther(),mint:address(41),quote:{mint:T.quoteMint,symbol:T.quoteSymbol}}],now:()=>now});
 const calls=[];
 globalThis.fetch=async(url,opts)=>{
  calls.push(String(url));
  if(String(url).startsWith('https://raw.githubusercontent.com/'))return Response.json({});
  return String(url).includes('quoteMint=') || String(url).includes('/api/v2/') ? pair.fetcher(url,opts) : unfiltered.fetcher(url,opts);
 };
 try {
  let response=await GET(request('?quoteMint='+T.quoteMint));let report=await response.json();
  assert.equal(response.status,200);assert.equal(report.groups[0].tokens.length,0);
  assert.equal(report.dataset.coverage.discovery.strategy,'global_sample');
  assert.ok(!calls.some(url=>url.includes('&quoteMint=')));
  response=await GET(request('?quoteMint='+T.quoteMint+'&discovery=pair'));report=await response.json();
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(report.groups[0].tokens[0].mint,address(41));
  assert.equal(report.dataset.coverage.discovery.strategy,'provider_quote_mint');
  assert.equal(report.dataset.coverage.discovery.providerReportedTotalScope,'quote_mint');
  assert.equal(report.dataset.coverage.complete,false);assert.equal(report.schemaVersion,1);
  const before=calls.length;await GET(request('?quoteMint='+T.quoteMint+'&discovery=pair'));assert.equal(calls.length,before);
  now+=60000;response=await GET(request('?quoteMint='+address(89)+'&discovery=pair'));
  assert.equal(response.status,404);assert.equal((await response.json()).status,'not_found');
 } finally {globalThis.fetch=original;Date.now=originalNow;}
});
function tokenForOther() {
 return {mint:OTHER.mint,pool:OTHER.poolMint,symbol:'TEST',name:'Synthetic API fixture',mode:'reward',quote:{mint:OTHER.quoteMint,symbol:'NVDAX'},market:{}};
}
