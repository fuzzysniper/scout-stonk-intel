import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const { GET }=await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'app/api/brief/route.js')).href);
const tokens=JSON.parse(fs.readFileSync(new URL('../data/tracked-mints.json',import.meta.url),'utf8'));
const request=query=>({nextUrl:new URL('https://scout.storkcoin.xyz/api/brief'+query)});
test('reject unsupported/repeated date or version before any source access',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not fetch');};
 try{for(const q of ['?date=2026-02-30','?date=2026-10-10&date=2026-10-11','?date=2099-01-01','?v=bad','?v='+ 'a'.repeat(64)+'&v='+'a'.repeat(64),'?source=https://example.invalid']){const r=await GET(request(q));assert.equal(r.status,400);assert.equal(r.headers.get('cache-control'),'no-store');}assert.equal(calls,0);}finally{globalThis.fetch=original;}
});
test('source outage, recovery, exact versioned JSON and changed version refusal expose no private errors or replacement amounts',async()=>{
 const original=globalThis.fetch,originalNow=Date.now;let clock=Date.now(),fail=true,body='';Date.now=()=>clock;
 // Artificial API fixture only: complete closed historical day, confined to this isolated process.
 const date='2026-10-10',start=Date.parse(date+'T00:00:00Z');
 const store=Object.fromEntries(tokens.map(t=>[t.mint,Array.from({length:25},(_,h)=>({observedAt:new Date(start+h*3600000).toISOString(),distributedTokens:h+1,payoutCount:h+1,quoteMint:t.quoteMint,quoteSymbol:t.quoteSymbol,source:t.source}))]));body=JSON.stringify(store);
 globalThis.fetch=async url=>{if(url.includes('/brief-archive/index.json'))return new Response(JSON.stringify({schema:1,dates:{}}));if(fail)throw Error('secret upstream exception');if(url.includes('/reward-snapshots.json'))return new Response(body);return new Response('missing',{status:404});};
 try{
  let r=await GET(request('?date='+date));assert.equal(r.status,503);let b=await r.json();assert.equal(b.dataset.sourceStatus,'unavailable');assert.ok(b.rows.every(row=>row.distributedTokens===null));assert.ok(!JSON.stringify(b).includes('secret upstream'));
  clock+=60001;fail=false;r=await GET(request('?date='+date));assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');b=await r.json();assert.equal(b.verifiedCount,7);assert.equal(b.provisional,true);assert.equal(b.dataset.revision,'sha256:'+createHash('sha256').update(body).digest('hex'));const version=b.version;
  r=await GET(request('?date='+date+'&v='+version));assert.equal(r.status,200);assert.equal((await r.json()).version,version);
  store[tokens[0].mint].at(-1).distributedTokens+=1;body=JSON.stringify(store);clock+=300001;
  r=await GET(request('?date='+date+'&v='+version));assert.equal(r.status,409);b=await r.json();assert.equal(b.status,'revision_changed');assert.equal(b.requestedVersion,version);assert.ok(!('rows' in b));assert.ok(!('distributedTokens' in b));
  r=await GET(request('?date='+date));assert.equal(r.status,200);assert.notEqual((await r.json()).version,version);
 }finally{Date.now=originalNow;globalThis.fetch=original;}
});
