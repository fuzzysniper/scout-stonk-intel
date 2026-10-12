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
  let response=await GET(request(''));assert.equal(response.status,503);let r=await response.json();assert.equal(r.status,'unavailable');assert.equal(r.sort,'coverage');assert.equal(r.rows.length,7);
  for(const row of r.rows){assert.equal(row.pointChange.distributedTokens,null);assert.equal(row.observationCount,0);}
  assert.ok(!JSON.stringify(r).includes('private'));
  fail=false;clock+=60000;response=await GET(request('?sort=freshness'));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');r=await response.json();
  assert.equal(r.sort,'freshness');assert.equal(r.rows.length,7);assert.match(r.dataset.revision,/^sha256:[a-f0-9]{64}$/);
 }finally{globalThis.fetch=original;Date.now=originalNow;}
});

test('quote filters use allowlisted mint identity and expose only matching currency rows',async()=>{
 const configured=JSON.parse(await fs.readFile(new URL('../data/tracked-mints.json',import.meta.url),'utf8'));
 const zec=configured.find(token=>token.symbol==='ZCAT').quoteMint;
 const response=await GET(request('?quoteMint='+zec));assert.equal(response.status,200);
 const report=await response.json();assert.equal(report.rows.length,2);assert.equal(report.quoteMint,zec);
 for(const row of report.rows){assert.equal(row.quoteMint,zec);assert.equal(row.signals.status,'unavailable');assert.equal(row.signals.accelerationPercent,null);}
 assert.equal(report.quotes.length,6);
 for(const query of ['?quoteMint=bad','?quoteMint='+zec+'&quoteMint='+zec,'?quoteMint=So11111111111111111111111111111111111111112']){
  const invalid=await GET(request(query));assert.equal(invalid.status,400);
 }
});
