import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {AT,TOKEN,event,feed,disabled} from './fixtures.mjs';
const require=createRequire(import.meta.url),root=process.env.LIVE_FEED_TEST_BUILD;
const {decodeFeed,decodeStop,feedClock}=require(root+'/app/consumer/live-model.js');
const {readLiveFeed,stopLiveFeed}=require(root+'/app/consumer/live-client.js');
const now=Date.parse(AT);
test('canonical disabled remains unknown rather than a fabricated empty feed',()=>{assert.equal(decodeFeed(disabled()).counts,null);assert.equal(decodeFeed({...disabled(),counts:{provisional:0,finalized:0}}),null);});
test('bounded original provisional/finalized receipt and native SOL identities are preserved',()=>{const f=feed();assert.strictEqual(decodeFeed(f),f);assert.equal(f.events[0].mint,null);assert.equal(f.events[1].quoteMint,'11111111111111111111111111111111');assert.equal(decodeFeed(feed('observing',Array.from({length:20},(_,i)=>event(i,i%2===0)))).events.length,20);});
for(const [name,change] of Object.entries({unknownSource:e=>({...e,source:'synthetic_fixture'}),provisionalMint:e=>({...e,mint:'1'.repeat(31)+'2'}),wrongProgram:e=>({...e,program:'x'}),unsafeSlot:e=>({...e,slot:Number.MAX_SAFE_INTEGER+1}),wrongHash:e=>({...e,notificationHash:'bad'}),prematureTime:e=>({...e,receivedAt:'2026-10-24T00:00:00.000Z'}),extraRaw:e=>({...e,raw:'private source payload'})}))test('rejects '+name,()=>{const f=feed();f.events[0]=change(f.events[0]);assert.equal(decodeFeed(f),null);});
test('wrong quote/program, incomplete finality and duplicate/oversized feeds fail closed',()=>{
 for(const fields of [{quoteMint:'So11111111111111111111111111111111111111112'},{tokenProgram:'bad'},{verificationHash:null},{checkedAt:'2026-10-23T17:59:40.000Z'}]){const f=feed();Object.assign(f.events[1],fields);assert.equal(decodeFeed(f),null);}
 assert.equal(decodeFeed(feed('observing',[event(),event()])),null);assert.equal(decodeFeed(feed('observing',Array.from({length:21},(_,i)=>event(i)))),null);
});
test('version, health STOP contradictions, retention, counters and raw fields cannot masquerade as the contract',()=>{
 for(const f of [{...feed(),version:'scout-live/2'},{...feed(),raw:'ignored?'},{...feed(),counts:{provisional:null,finalized:1}},{...feed(),retention:{seconds:999,maxRecords:200,expiresOnRead:true}},{...feed(),health:{...feed().health,stopped:true}}])assert.equal(decodeFeed(f),null);
});
test('new DB snapshots never renew provider clocks; lease and client-time jumps withhold freshness',()=>{
 const f=feed(),snapshot={feed:f,receivedAt:now};assert.equal(feedClock(snapshot,now).status,'observing');assert.equal(feedClock(snapshot,now+13000).status,'stale');assert.equal(feedClock(snapshot,now-1).status,'stale');
 const refreshed={feed:{...f,observedAt:'2026-10-23T18:01:00.000Z'},receivedAt:now+60000};assert.equal(feedClock(refreshed,now+60000).status,'stale');assert.equal(refreshed.feed.health.lastFrameAt,f.health.lastFrameAt);
 assert.equal(feedClock({feed:feed('stopped'),receivedAt:now},now+3600000).status,'stopped');
 assert.equal(feedClock({feed:disabled(),receivedAt:now},now+3600000).status,'disabled');
});
test('GET uses exact private same-origin auth transport and STOP is a distinct intent-only empty POST',async()=>{
 for(const stop of [false,true]){let calls=0;const fn=async(url,options)=>{calls++;assert.equal(url,stop?'/api/live-events/stop':'/api/live-events');assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.mode,'same-origin');assert.equal(options.headers.authorization,'Bearer '+TOKEN);assert.equal(options.body,undefined);assert.equal(options.method,stop?'POST':'GET');assert.equal(options.headers['X-Scout-Live-Intent'],stop?'STOP_SCOUT_LIVE':undefined);return Response.json(stop?{version:'scout-live/1',status:'stopped',observedAt:AT}:feed());};const r=await (stop?stopLiveFeed:readLiveFeed)(TOKEN,new AbortController().signal,fn);assert.equal(r.ok,true);assert.equal(calls,1);}
});
test('malformed token never causes a request; unauthorized hosting HTML is not a feed',async()=>{
 let calls=0;assert.equal((await readLiveFeed('not-a-token',new AbortController().signal,async()=>{calls++;})).ok,false);assert.equal(calls,0);
 for(const status of [401,403])assert.deepEqual(await readLiveFeed(TOKEN,new AbortController().signal,async()=>new Response('<html>Login</html>',{status})),{ok:false,reason:'denied'});
});
test('HTTP errors, wrong content type, malformed and oversized replies never become fresh records or STOP acknowledgment',async()=>{
 for(const response of [new Response('not json',{headers:{'content-type':'application/json'}}),new Response('x'.repeat(100000),{headers:{'content-type':'application/json'}}),Response.json(feed(),{status:503}),new Response('<html>login</html>')])assert.equal((await readLiveFeed(TOKEN,new AbortController().signal,async()=>response)).ok,false);
 for(const status of [200,503])assert.equal((await stopLiveFeed(TOKEN,new AbortController().signal,async()=>Response.json(disabled(),{status}))).ok,false);
 assert.equal(decodeStop({...feed('stopped')}),null);assert.equal(decodeStop({version:'scout-live/1',status:'stopped',observedAt:AT}).status,'stopped');
});
test('production page has no fixtures, token persistence, arbitrary-mint lookup, source connections or activation controls',()=>{
 const page=readFileSync('app/page.tsx','utf8');assert.match(page,/LiveHome/);assert.doesNotMatch(page,/ConsumerHome|evaluateInput|mint-facts|searchParams/);
 const files=['app/consumer/live-home.tsx','app/consumer/live-client.ts','app/consumer/live-model.ts'].map(p=>readFileSync(p,'utf8')).join('\n');
 assert.doesNotMatch(files,/localStorage|sessionStorage|document\.cookie|console\.|process\.env|WebSocket|https:\/\/|fixtures|synthetic_fixture|api\/mint-facts/);
});
