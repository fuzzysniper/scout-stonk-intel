import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NextRequest } from 'next/server.js';
import { AT, address, registry } from './pair-quotes-fixtures.mjs';
const {GET}=await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'app/api/pair-quotes/route.js')).href);
const request=q=>new NextRequest('http://localhost/api/pair-quotes'+q);
test('quote API rejects invalid parameters before provider access',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('not allowed');};
 try {
  for(const q of ['?url=https://evil.invalid','?query=a&query=b','?limit=101','?mint=bad','?query=&mint='+address(1),'?offset=1025','?query=%00']) {
   const response=await GET(request(q));assert.equal(response.status,400);assert.equal(response.headers.get('cache-control'),'no-store');
  }
  assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});
test('registry-only API exposes unknown source, recovers, searches/paginates and selects exact mint without catalog/history fanout',async()=>{
 const original=globalThis.fetch,originalNow=Date.now;let now=AT,calls=0,failed=true;
 Date.now=()=>now;globalThis.fetch=async(url,opts)=>{
  calls++;assert.equal(url,'https://www.stonkfun.xyz/api/public/v1/pairs');assert.equal(opts.method,'GET');
  if(failed)throw Error('private-key-shaped-test-error');return Response.json(registry(undefined,now));
 };
 try {
  let response=await GET(request('?query=STONK'));assert.equal(response.status,503);let r=await response.json();
  assert.equal(r.status,'unavailable');assert.equal(r.dataset.coverage.registryCount,null);assert.equal(r.dataset.coverage.matchedCount,null);assert.ok(!JSON.stringify(r).includes('private'));
  failed=false;now+=60001;response=await GET(request('?query=StOnK&limit=1'));assert.equal(response.status,200);r=await response.json();
  assert.equal(r.quotes.length,1);assert.equal(r.quotes[0].symbolMatchCount,2);assert.equal(r.dataset.coverage.registryCount,5);
  assert.equal(r.dataset.coverage.nextOffset,1);assert.equal(r.dataset.coverage.resultTruncated,true);assert.equal(r.dataset.coverage.tokenCatalogComplete,false);
  const before=calls;response=await GET(request('?query=stonk&limit=1&offset=1'));r=await response.json();assert.equal(r.dataset.sourceStatus,'cached');assert.equal(calls,before);
  response=await GET(request('?mint='+address(3)));r=await response.json();assert.equal(response.status,200);assert.equal(r.quotes[0].quoteSymbol,'熊猫');
  response=await GET(request('?mint='+address(99)));assert.equal(response.status,404);assert.equal((await response.json()).status,'not_found');
  response=await GET(request('?query='+address(99)));assert.equal(response.status,200);assert.deepEqual((await response.json()).quotes,[]);
  response=await GET(request('?query=no-match'));assert.equal(response.status,200);assert.equal((await response.json()).dataset.coverage.matchedCount,0);
  assert.equal(calls,before);assert.equal(response.headers.get('cache-control'),'no-store');
 } finally {globalThis.fetch=original;Date.now=originalNow;}
});
