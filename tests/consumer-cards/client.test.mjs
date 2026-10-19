import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import path from 'node:path';import {catalog,market,MINT,CARDS,AT} from './fixtures.mjs';
const require=createRequire(import.meta.url),client=require(path.join(process.env.CARDS_TEST_BUILD,'app/consumer/cards/client.js'));
const originalFetch=global.fetch,originalNow=Date.now;let now=Date.parse(AT);Date.now=()=>now;
const signal=()=>new AbortController().signal;
test('fixed same-origin bounded GETs validate exact scope and omit credentials, redirects and referrer',async t=>{
 t.after(()=>{global.fetch=originalFetch;Date.now=originalNow;});let calls=[];
 global.fetch=async(url,options)=>{calls.push({url,options});return Response.json(url.includes('/api/token')?market():catalog());};
 assert.equal((await client.readCards(signal())).state,'ready');assert.equal((await client.readWatch(MINT,signal())).state,'ready');
 assert.equal(calls[0].url,'/api/pairs?quoteMint='+CARDS+'&discovery=pair');assert.equal(calls[1].url,'/api/token?mint='+MINT);
 for(const {options:o} of calls){assert.equal(o.method,'GET');assert.equal(o.credentials,'omit');assert.equal(o.redirect,'error');assert.equal(o.cache,'no-store');assert.equal(o.referrerPolicy,'no-referrer');}
 assert.throws(()=>client.readWatch(' '+MINT,signal()));
 global.fetch=async()=>new Response('<html>oops</html>',{headers:{'content-type':'text/html'}});assert.equal((await client.readCards(signal())).state,'invalid_response');
 global.fetch=async()=>Response.json(market({mint:CARDS}));assert.equal((await client.readWatch(MINT,signal())).state,'invalid_response');
 global.fetch=async()=>new Response('x'.repeat(2*1024*1024+1),{headers:{'content-type':'application/json'}});assert.equal((await client.readCards(signal())).state,'invalid_response');
 global.fetch=async()=>new Response('',{status:404});assert.equal((await client.readCards(signal())).state,'not_found');
 let count=0;global.fetch=async()=>{count++;return new Response('',{status:429,headers:{'retry-after':'2'}});};let result=await client.readCards(signal());assert.equal(result.state,'rate_limited');assert.equal(result.retryAt,now+2000);assert.equal((await client.readCards(signal())).state,'rate_limited');assert.equal(count,1);
 now+=2001;global.fetch=async()=>Response.json(catalog());assert.equal((await client.readCards(signal())).state,'ready');
 global.fetch=async()=>new Response('',{status:503,headers:{'retry-after':new Date(now+5000).toUTCString()}});result=await client.readWatch(MINT,signal());assert.equal(result.state,'unavailable');assert.ok(result.retryAt>now);assert.equal((await client.readWatch(CARDS,signal())).state,'rate_limited');
 now+=6000;global.fetch=async()=>new Response('',{status:429,headers:{'retry-after':'999999999999999'}});assert.equal((await client.readWatch(MINT,signal())).retryAt,Infinity);assert.equal((await client.readWatch(CARDS,signal())).retryAt,Infinity);
});
