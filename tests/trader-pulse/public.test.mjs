import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import {MINT,QUOTE} from './fixtures.mjs';
const require=createRequire(import.meta.url);
const base='https://scout.example/api/trader-pulse';
const build=process.env.PULSE_BUILD;
const {publicPulse}=require(build+'/lib/trader-pulse/public.js');
// Initialize Node's lazy fetch primitives before trapping application credential access.
const request=new Request(`${base}?mint=${MINT}`);
new Response(null);

test('production public route is inert: poison fetch and secrets; financial output disabled, no fabricated match/time',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=()=>{calls++;throw Error('forbidden upstream')};
 const oldEnv=process.env;process.env=new Proxy(oldEnv,{get(target,name){
  if(/SCOUT|HELIUS|NEON|DATABASE|^PG|SECRET|API_KEY/i.test(String(name)))throw Error('forbidden credential read');
  return Reflect.get(target,name);
 }});
 try{
  const route=require(`${build}/app/api/trader-pulse/route.js`);
  assert.equal(route.runtime,'nodejs');
  const r=await route.GET(request);assert.equal(r.status,200);
  const value=await r.json();assert.equal(value.status,'source_review_required');assert.equal(value.financial,null);assert.equal(value.signals,null);
  assert.deepEqual(value.policy,{sourceObservation:false,financialPublication:false});
  assert.equal(value.identity.onchainMintVerified,false);assert.equal(value.identity.marketMatch,'not_queried');
  assert.deepEqual(value.clocks,{retrievedAt:null,providerObservedAt:null,underlyingTradeAt:null});
  assert.equal(value.sources[0].url,`https://dexscreener.com/solana/${MINT}`);
  assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('access-control-allow-origin'),null);
  assert.equal(calls,0);
 }finally{process.env=oldEnv;globalThis.fetch=original;}
});
for(const query of ['', '?mint=USDC',`?mint=%20${MINT}`,`?mint=${MINT}%20`,`?mint=${MINT}&mint=${QUOTE}`,`?mint=${MINT}&live=true`,`?%6dint=${MINT}`,`?mint=${MINT}%26x=1`,`?mint=${MINT}#fragment`,`?mint=${MINT},${QUOTE}`,`?mint=${MINT}&provider=https://evil.test`])test(`public query fails closed: ${query}`,async()=>{
 assert.equal(publicPulse(new Request(base+query)).status,400);
});
test('all non-read methods reject without body read or I/O; endpoint path exact',()=>{
 for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS','HEAD'])assert.equal(publicPulse(new Request(`${base}?mint=${MINT}`,{method})).status,405);
 assert.equal(publicPulse(new Request(`https://scout.example/api/other?mint=${MINT}`)).status,400);
});
test('isolation/source gate invariant: no existing backend, UI, config/env, scheduler or SDK dependency',()=>{
 const files=fs.readdirSync('lib/trader-pulse').filter(f=>f.endsWith('.ts'));
 for(const file of files){
  const s=fs.readFileSync('lib/trader-pulse/'+file,'utf8');
  assert.doesNotMatch(s,/from ['"](?:\.\.\/|@\/)|process\.env|helius-rpc|neon\.tech|node:fs|setInterval\(/);
 }
 const route=fs.readFileSync('app/api/trader-pulse/route.ts','utf8');assert.doesNotMatch(route,/adapter|onchain-mint|consumer|api\/token/);
 const pub=fs.readFileSync('lib/trader-pulse/public.ts','utf8');assert.doesNotMatch(pub,/from ['"].*(?:adapter|decoder|engine)|\bfetch\s*\(/);
});
