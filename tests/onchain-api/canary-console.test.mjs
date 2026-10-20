// SYNTHETIC OFFLINE packet/hosting/classification tests. Never actual Vercel or Helius evidence.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {root,envelope,OTHER as MINT} from './fixtures.mjs';
const {decodeResponse}=createRequire(import.meta.url)(root+'/lib/onchain-mint/decoder.js');
const source=readFileSync('scripts/ops/usdc-canary-console.js','utf8');
const NOW=Date.parse('2026-10-20T12:00:00.000Z'),HOST='scout-stonk-intel-synthetic9-riskledgerapp.vercel.app',SHA='c'.repeat(40);
async function facts(){const e=envelope();e.result.value.data.parsed.info.decimals=6;return decodeResponse({mint:MINT,requestId:1,text:JSON.stringify(e),
 requestStartedAt:new Date(NOW).toISOString(),responseReceivedAt:new Date(NOW).toISOString(),evaluatedAt:new Date(NOW).toISOString(),
 endpointHost:'mainnet.helius-rpc.com',acquisition:'production_rpc'});}
function context(options={}) {
 const calls=[],memory=new Map();class Clock extends Date {static now(){return options.now??NOW;}}
 const body=options.body,headers={'content-type':'application/json','x-scout-canary':'usdc-read-once-v1','x-scout-deployment-host':HOST,
 'x-scout-commit':SHA,'x-scout-delivery':'rpc','x-vercel-id':'SYNTHETIC_LOCAL_ONLY',...options.headers};
 const env={Date:Clock,location:{origin:options.origin??'https://'+HOST},sessionStorage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},
  setTimeout:options.shortDeadline?fn=>setTimeout(fn,15):setTimeout,clearTimeout,AbortController,TextDecoder,TextEncoder,Uint8Array,crypto:webcrypto,
  fetch:async(url,init)=>{calls.push({url,init});return options.fetch?options.fetch(url,init):new Response(JSON.stringify(body),{status:options.status??200,headers});}};
 runInNewContext(source,env);return{env,calls,memory,run:opts=>env.scoutUsdcCanary({deploymentHost:HOST,commitSha:SHA,go:'ONE_USDC_POST',...opts})};
}
test('loading console tool is inert; explicit go/host/commit/window checks precede any request',async()=>{
 const c=context({body:await facts()});assert.equal(c.calls.length,0);
 for(const patch of [{go:undefined},{deploymentHost:'evil.invalid'},{commitSha:'bad'}])await assert.rejects(c.run(patch),/STOP_NO_RETRY/);
 for(const options of [{origin:'https://scout.storkcoin.xyz'},{now:Date.parse('2026-10-21T00:00:00Z')}]) {
  const s=context(options);await assert.rejects(s.run(),/STOP_NO_RETRY/);assert.equal(s.calls.length,0);
 }
 assert.equal(c.calls.length,0);
});
test('one deliberate POST yields exact facts, source hash and independently hashed API receipt',async()=>{
 const body=await facts(),c=context({body}),receipt=await c.run();
 assert.equal(c.calls.length,1);const {url,init}=c.calls[0];assert.equal(url,'/api/mint-facts?mint='+MINT);assert.equal(init.method,'POST');
 assert.equal(init.body,undefined);assert.equal(init.redirect,'error');assert.equal(init.mode,'same-origin');assert.equal(init.credentials,'same-origin');
 assert.equal(receipt.ok,true);assert.equal(receipt.mint,MINT);assert.equal(receipt.contextSlot,'400000001');assert.equal(receipt.slotTime,null);
 assert.equal(receipt.sourceRpcResponseSha256,body.source.responseSha256);
 assert.equal(receipt.apiResponseSha256,createHash('sha256').update(JSON.stringify(body)).digest('hex'));
 assert.match(receipt.hashScope,/server-reported raw RPC bytes/);assert.equal(receipt.action,'STOP_NO_RETRY');
 await assert.rejects(c.run(),/STOP_NO_RETRY/);assert.equal(c.calls.length,1);
});
test('non-200 error returns only a sanitized stop result and cannot retry',async()=>{
 const c=context({status:503,body:{version:'mint-facts/1',mint:MINT,status:'unavailable',facts:null,source:null,reason:'upstream_unavailable',extra:'SYNTHETIC_SECRET'}});
 const r=await c.run();assert.equal(r.ok,false);assert.equal(r.action,'STOP_NO_RETRY');assert.ok(!JSON.stringify(r).includes('SECRET'));
 await assert.rejects(c.run(),/STOP_NO_RETRY/);assert.equal(c.calls.length,1);
});
test('wrong source/runtime/slot/hash/supply or stale capture cannot become a verified receipt',async()=>{
 const base=await facts();
 for(const edit of [b=>{b.source.acquisition='synthetic_fixture';},b=>{b.source.contextSlot='0';},b=>{b.source.responseSha256='bad';},
  b=>{b.source.requestStartedAt=new Date(NOW-2000).toISOString();},b=>{b.facts.supply.raw='-1';},b=>{b.facts.supply.decimals=9;},
  b=>{b.facts.program='token_2022';},b=>{b.mint='11111111111111111111111111111111';},b=>{b.facts.freezeAuthority={state:'present',address:'not-a-key'};}]) {
  const body=structuredClone(base);edit(body);const c=context({body});await assert.rejects(c.run(),/STOP_NO_RETRY/);assert.equal(c.calls.length,1);
 }
 for(const headers of [{'x-scout-delivery':'cache'},{'x-scout-commit':'d'.repeat(40)},{'x-scout-deployment-host':'evil.invalid'},{'x-vercel-id':''}]) {
  const c=context({body:base,headers});await assert.rejects(c.run(),/STOP_NO_RETRY/);assert.equal(c.calls.length,1);
 }
});
test('HTTP/auth redirect, oversized bytes and uncooperative network/body stalls fail within deadline',async()=>{
 const options=[{fetch:()=>new Response('LOGIN',{status:401,headers:{'content-type':'text/html'}})},
  {fetch:()=>new Response('x'.repeat(32769),{headers:{'content-type':'application/json'}})},
  {fetch:()=>new Promise(()=>{}),shortDeadline:true},
  {fetch:()=>new Response(new ReadableStream({pull:()=>new Promise(()=>{})}),{headers:{'content-type':'application/json'}}),shortDeadline:true}];
 for(const option of options){const c=context(option),start=performance.now();await assert.rejects(c.run(),/STOP_NO_RETRY/);assert.ok(performance.now()-start<1000);assert.equal(c.calls.length,1);}
});
