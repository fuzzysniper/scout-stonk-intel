import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NextRequest } from 'next/server.js';
const { GET }=await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'app/api/radar/route.js')).href);
const request=query=>new NextRequest('http://localhost/api/radar'+query);
test('radar endpoint rejects unsafe or repeated sort before source access',async()=>{
 for(const query of ['?sort=yield','?sort=name&sort=freshness']){
  const response=await GET(request(query));assert.equal(response.status,400);assert.equal(response.headers.get('cache-control'),'no-store');
 }
});
test('source outages expose dated allowlist with no invented observations and recover safely',async()=>{
 const original=globalThis.fetch,originalNow=Date.now;let clock=Date.now(),fail=true;
 Date.now=()=>clock;
 globalThis.fetch=async()=>{if(fail)throw Error('private provider error');return new Response(await fs.readFile(new URL('../data/reward-snapshots.json',import.meta.url),'utf8'));};
 try{
  let response=await GET(request(''));assert.equal(response.status,503);let r=await response.json();assert.equal(r.status,'unavailable');assert.equal(r.rows.length,7);
  for(const row of r.rows){assert.equal(row.pointChange.distributedTokens,null);assert.equal(row.observationCount,0);}
  assert.ok(!JSON.stringify(r).includes('private'));
  fail=false;clock+=60000;response=await GET(request('?sort=freshness'));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');r=await response.json();
  assert.equal(r.sort,'freshness');assert.equal(r.rows.length,7);assert.match(r.dataset.revision,/^sha256:[a-f0-9]{64}$/);
 }finally{globalThis.fetch=original;Date.now=originalNow;}
});
