// Actual pinned A controller + actual local TLS/PostgreSQL B port. Synthetic source/assurances ONLY.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {fixture} from './fixtures.mjs';
import {POLICY_HASH,SOURCE_HASH,hash} from '../../lib/scout-continuous/policy.mjs';
import {browserFeed} from '../../lib/scout-continuous/http.mjs';
const require=createRequire(import.meta.url),{Continuous}=require(process.env.CONTINUOUS_BUILD+'/controller.js');
const policy=require(process.env.CONTINUOUS_BUILD+'/policy.js');
const {decodeFeed}=require(process.env.CONTINUOUS_A_TREE+'/build/app/consumer/live-model.js');
const {fixture:sourceFixture,ack}=await import(pathToFileURL(process.env.CONTINUOUS_A_TREE+'/experiments/live-stream/tests/fixtures.mjs'));
let f;before(async()=>{f=await fixture();});after(async()=>{await f?.close();});
test('A canonical policy and typed wire contract match B exactly',()=>{
 assert.equal(policy.POLICY_HASH,POLICY_HASH);assert.equal(policy.POLICY.sourcePolicyHash,SOURCE_HASH);
 const a=readFileSync(process.env.CONTINUOUS_A_TREE+'/experiments/continuous-stream/contract.ts','utf8').split('\n').slice(3).join('\n');
 const b=readFileSync('lib/scout-continuous/contract.ts','utf8').split('\n').slice(3).join('\n');assert.equal(b,a);
});
test('actual controller renews past200 with irreversible SQL budgets, mobile STOP and native closure',async()=>{
 const g=await f.reset();await f.assure(g);const port=f.store(),stats={opens:0,reads:0,active:0,maxActive:0,created:0};let last,emitted=0,stopPromise;
 const wrapped={version:port.version,async transact(c,o){const r=await port.transact(c,o);last=r;if(c.op==='append'&&r.disposition==='inserted'&&r.usage.auditRecords>=220&&!stopPromise)stopPromise=f.store('stop').transact({parent:g.parent,grantHash:hash(g)});return r;},close:()=>port.close()};
 const fixtures=new Map();
 const sourceFactory=()=>{stats.created++;return {
  open(h,signal,allowed){
   assert.ok(allowed());assert.equal(last.connected,true);assert.ok(last.usage.connections>stats.opens);stats.opens++;stats.active++;stats.maxActive=Math.max(stats.maxActive,stats.active);
   let finish,closed=false,timer;const connection=new Promise(r=>finish=r);
   const close=()=>{if(closed)return;closed=true;clearTimeout(timer);stats.active--;h.close('OFFLINE_CLOSED');finish();};signal.addEventListener('abort',close,{once:true});
   queueMicrotask(()=>{h.open();h.frame(ack);const next=()=>{if(closed||signal.aborted||emitted>=220)return;const r=sourceFixture({seed:++emitted,fields:{timestamp:String(Math.floor(Date.now()/1000))}});r.tx.result.blockTime=Math.floor(Date.now()/1000);fixtures.set(r.signature,r);h.frame(r.raw);timer=setTimeout(next,20);};timer=setTimeout(next,10);});return {closed:connection,close};
  },
  async read(body,signal,allowed){assert.ok(allowed());assert.equal(signal.aborted,false);assert.ok(last.usage.rpc>stats.reads);stats.reads++;const q=JSON.parse(body),signature=q.id===10?q.params[0]:q.params[0][0],r=fixtures.get(signature);return JSON.stringify(q.id===10?r.tx:r.status);},
 };};
 const clock={now:()=>Date.now(),mono:()=>performance.now(),sleep:(ms,s)=>new Promise((r,j)=>{if(s.aborted)return j(Error('OFFLINE_ABORT'));const timer=setTimeout(r,ms);s.addEventListener('abort',()=>{clearTimeout(timer);j(Error('OFFLINE_ABORT'));},{once:true});})};
 const controller=new Continuous(g,wrapped,sourceFactory,clock);const timeout=setTimeout(()=>controller.stop('OFFLINE_TEST_TIMEOUT'),15000);
 let result;try{result=await controller.run();}finally{clearTimeout(timeout);}if(stopPromise)await stopPromise;
 assert.equal(result.sourceConnected,false);assert.equal(result.durableStopConfirmed,true);assert.ok(result.completedChildren>=1,JSON.stringify(result));assert.equal(stats.opens,2);assert.equal(stats.maxActive,1);assert.equal(stats.active,0);
 const snap=await f.store('reader').transact(null);assert.equal(snap.stopped,true);assert.equal(snap.worker,null);assert.equal(snap.child,null);assert.equal(snap.usage.auditRecords,220);assert.equal(snap.usage.children,2);assert.equal(snap.usage.connections,2);assert.equal(snap.usage.credits,200+stats.reads);assert.equal(snap.usage.rpc,stats.reads);assert.ok(snap.counts.finalized>0);assert.equal(snap.events.length,20);
 assert.equal((await f.db.owner.query('SELECT count(*) FROM scout_continuous.events')).rows[0].count,'200');assert.ok(snap.health.gaps>=1);
 assert.ok(decodeFeed(browserFeed(snap).feed),'actual C strict decoder accepts nested parent feed without UI changes');
});
test('missing genuine independent assurances cause zero source construction against the real DB',async()=>{
 const g=await f.reset();let factories=0;const controller=new Continuous(g,f.store(),()=>{factories++;throw Error('NO_SOURCE_PERMITTED');},{now:()=>Date.now(),mono:()=>performance.now(),sleep:async()=>{}});
 const r=await controller.run();assert.equal(factories,0);assert.equal(r.renewalAllowed,false);const snap=await f.store('reader').transact(null);assert.equal(snap.usage.credits,0);assert.equal(snap.usage.connections,0);assert.equal(snap.assurance.backupsExcluded,false);assert.equal(snap.assurance.notificationHealthy,false);
});
