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
  for(const q of ['?quoteMint=bad','?quoteMint='+T.quoteMint+'&quoteMint='+T.quoteMint,'?sort=yield','?page=999','?url=https://evil.invalid','?quoteMint=']) {
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
