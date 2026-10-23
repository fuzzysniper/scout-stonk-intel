import test from 'node:test';
import assert from 'node:assert/strict';
import {grant,clock,Model,feedFactory,Continuous,Client,parseGrant,POLICY,AT,hash} from './fixtures.mjs';

const waitStop=(runtime,model,predicate)=>{model.after=(c)=>{if(predicate(c,model.state))setImmediate(()=>runtime.stop('OWNER_STOP'));};};
test('exact owner period, source/time/budget evidence required; no subscription defaults',()=>{
  const g=grant(),parse=x=>parseGrant(JSON.stringify(x),g.head,g.service,Date.parse(AT));assert.equal(parse(g).parent,g.parent);
  for(const k of ['sourceGo','hostingGo','rightsGo','spendGo','retentionGo','notificationGo','mobileGo'])assert.throws(()=>parse({...g,[k]:false}));
  for(const patch of [{endsAt:'2026-11-22T00:00:00.000Z'},{resetAt:AT},{limits:{...g.limits,credits:1000001}},{accountHash:'0'.repeat(64)},{sourcePolicyHash:'0'.repeat(64)},{extra:true}])assert.throws(()=>parse({...g,...patch}));
  assert.equal(hash(g),hash(Object.fromEntries(Object.entries(g).reverse())));
});
test('one source is durably charged; finalized evidence, STOP and closed parent retain reservations',async()=>{
  const time=clock(),g=grant(),model=new Model(g,time),feed=feedFactory(model),run=new Continuous(g,model,feed.factory,time);
  waitStop(run,model,c=>c.op==='append'&&c.record.finality==='finalized');const r=await run.run();
  assert.equal(r.sourceConnected,false);assert.equal(r.reason,'OWNER_STOP');assert.equal(feed.stats.maxActive,1);assert.equal(feed.stats.reads,2);
  assert.equal(model.state.usage.connections,1);assert.equal(model.state.usage.rpc,2);assert.equal(model.state.usage.credits,102);assert.ok(model.state.stopped);assert.equal(model.state.worker,null);
  assert.equal(Object.values(model.state.recent)[0].verification,'rpc_reported_finalized_same_provider');
});
test('rolling children pass 200 total records without lifetime stop, preserve first-seen index and parent spend',async()=>{
  const time=clock(),g=grant(),model=new Model(g,time),feed=feedFactory(model,{count:220}),run=new Continuous(g,model,feed.factory,time);
  waitStop(run,model,(_c,s)=>s.usage.auditRecords===220);const r=await run.run();
  assert.ok(r.completedChildren>=1);assert.equal(model.state.usage.children,2);assert.equal(model.state.usage.auditRecords,220);
  assert.equal(Object.keys(model.state.recent).length,200);assert.equal(Object.keys(model.state.first).length,220);assert.equal(feed.stats.maxActive,1);
  assert.ok(model.state.usage.credits>=200);assert.ok(model.state.journal.every((s,i,a)=>i===0||s.usage.credits>=a[i-1].usage.credits));
});
for(const [name,edit] of [
  ['meter stale',r=>{r.assurance.meterAt='2026-10-22T11:00:00.000Z';}],
  ['meter unattributed',r=>{r.assurance.meterAttributed=false;}],
  ['meter mismatch',r=>{r.assurance.meterMismatch=true;}],
  ['balance insufficient',r=>{r.assurance.meterBalance=1;}],
  ['physical purge stale',r=>{r.assurance.purgeThrough='2026-10-22T11:00:00.000Z';}],
  ['backup exclusion unproven',r=>{r.assurance.backupsExcluded=false;}],
  ['notification unavailable',r=>{r.assurance.notificationHealthy=false;}],
  ['watchdog missing',r=>{r.assurance.independentWatchdog=false;}],
  ['legacy source not retired',r=>{r.assurance.legacyRetired=false;}],
  ['provider hard cap expires early',r=>{r.assurance.hardCapUntil=AT;}],
  ['counter malformed',r=>{r.usage.bytes=-1;}],
])test(`${name}: zero source factories/key capability calls`,async()=>{
  const time=clock(),g=grant(),model=new Model(g,time),feed=feedFactory(model);model.edit=edit;
  const r=await new Continuous(g,model,feed.factory,time).run();assert.equal(feed.stats.factories,0);assert.equal(feed.stats.opens,0);assert.equal(r.state,'STOPPED');
});
test('lost committed reservation acknowledgment never opens source and is never refunded',async()=>{
  const time=clock(),g=grant(),model=new Model(g,time),feed=feedFactory(model);
  model.after=c=>{if(c.op==='reserve')throw Error('SYNTHETIC_LOST_COMMIT_ACK');};
  await new Continuous(g,model,feed.factory,time).run();assert.equal(feed.stats.opens,0);assert.equal(model.state.usage.credits,100);assert.equal(model.state.usage.connections,1);assert.ok(model.state.stopped);
});
test('concurrent claims and replay after stop cannot reset or reuse an occupied/uncertain parent',async()=>{
  const time=clock(),g=grant(),model=new Model(g,time),a=new Client(g,model,time),b=new Client(g,model,time);
  await a.command({op:'claim'});await assert.rejects(b.command({op:'claim'}));
  time.jump(13000);const restart=new Model(g,time,structuredClone(model.state)),feed=feedFactory(restart);
  await new Continuous(g,restart,feed.factory,time).run();assert.equal(feed.stats.opens,0);assert.ok(restart.state.stopped);
});
test('uncertain native close quarantines parent; no renewal/release and no false closed result',async()=>{
  const time=clock(),g=grant(),model=new Model(g,time),feed=feedFactory(model,{uncertain:true}),run=new Continuous(g,model,feed.factory,time);
  waitStop(run,model,c=>c.op==='append');const r=await run.run();assert.equal(r.sourceConnected,null);assert.equal(feed.stats.opens,1);assert.equal(model.state.usage.children,1);
  assert.ok(model.state.stopped);assert.notEqual(model.state.worker,null);assert.equal(model.commands.filter(c=>c.op==='release').length,0);
});
test('parent caps deny second child connection without resetting first envelope',async()=>{
  const time=clock(),g=grant();g.limits.connections=1;const model=new Model(g,time),feed=feedFactory(model,{count:200});
  const r=await new Continuous(g,model,feed.factory,time).run();assert.ok(r.completedChildren>=1);assert.equal(feed.stats.opens,1);assert.equal(model.state.usage.connections,1);assert.ok(model.state.stopped);
});

test('unconfirmed durable STOP never releases parent fence even after confirmed source close',async()=>{
  const time=clock(),g=grant(),model=new Model(g,time),feed=feedFactory(model),run=new Continuous(g,model,feed.factory,time);
  waitStop(run,model,c=>c.op==='append');model.before=c=>{if(c.op==='stop')throw Error('MODEL_STORAGE_OUTAGE');};
  const r=await run.run();assert.equal(r.durableStopConfirmed,false);assert.equal(model.commands.filter(c=>c.op==='release').length,0);assert.notEqual(model.state.worker,null);
});
test('malformed or replayed reservation acknowledgment is fatal before any dial',async()=>{
  for(const change of [r=>{r.ticket=0;},r=>{r.usage.credits--;},r=>{r.child=null;},r=>{r.fence='33333333-3333-4333-8333-333333333333';}]){
    const time=clock(),g=grant(),model=new Model(g,time),feed=feedFactory(model);model.edit=(r,c)=>{if(c.op==='reserve')change(r);};
    await new Continuous(g,model,feed.factory,time).run();assert.equal(feed.stats.opens,0);assert.ok(model.state.usage.credits>=100);
  }
});
test('assurance lost during an active source closes it and prevents renewal',async()=>{
  for(const field of ['purgeHealthy','meterAttributed','notificationHealthy']){
    const time=clock(),g=grant(),model=new Model(g,time),feed=feedFactory(model,{count:0});let seen=false;
    model.edit=(r,c)=>{if(c.op==='heartbeat'){seen=true;r.assurance[field]=false;}};
    const r=await new Continuous(g,model,feed.factory,time).run();assert.ok(seen);assert.equal(feed.stats.opens,1);assert.equal(feed.stats.active,0);assert.equal(r.completedChildren,0);assert.ok(model.state.stopped);
  }
});
test('unavailable store and permanent STOP both deny acquisition on a fresh process',async()=>{
  for(const stop of [false,true]){
    const time=clock(),g=grant(),model=new Model(g,time),feed=feedFactory(model);model.state.stopped=stop;
    if(!stop)model.before=()=>{throw Error('STORE_OFFLINE');};
    await new Continuous(g,model,feed.factory,time).run();assert.equal(feed.stats.factories,0);assert.equal(feed.stats.opens,0);
  }
});

test('lost assurance latches local denial; a later healthy reply cannot silently resume the parent',async()=>{
  const time=clock(),g=grant(),model=new Model(g,time),client=new Client(g,model,time);
  await client.command({op:'claim'});model.edit=r=>{r.assurance.purgeHealthy=false;};
  await assert.rejects(client.command({op:'notify',reason:'TEST'}));assert.equal(client.valid(),false);
  model.edit=null;const before=model.commands.length;
  await assert.rejects(client.command({op:'claim'}));assert.equal(model.commands.length,before);
  const stopped=await client.command({op:'stop',reason:'ASSURANCE_FAILURE'},true);assert.equal(stopped.stopped,true);
});

test('counter reset at renewal, wrong child lifetime and missing commit all deny new source',async()=>{
  const time=clock(),g=grant(),model=new Model(g,time),feed=feedFactory(model,{count:200});
  model.edit=(r,c)=>{if(c.op==='beginChild'&&r.usage.children===2)r.usage.credits=0;};
  await new Continuous(g,model,feed.factory,time).run();assert.equal(feed.stats.opens,1);assert.ok(model.state.stopped);
  const time2=clock(),model2=new Model(g,time2),feed2=feedFactory(model2);
  model2.edit=(r,c)=>{if(c.op==='beginChild')r.child.endsAt='2026-10-25T00:00:00.000Z';};
  await new Continuous(g,model2,feed2.factory,time2).run();assert.equal(feed2.stats.factories,0);
});
test('bounded reconnects keep cumulative reservations and explicit gaps, then STOP',async()=>{
  const time=clock(),g=grant(),model=new Model(g,time),feed=feedFactory(model,{disconnect:true});
  const r=await new Continuous(g,model,feed.factory,time).run();assert.equal(feed.stats.opens,3);assert.equal(model.state.usage.connections,3);assert.equal(model.state.usage.credits,300);
  assert.ok(model.commands.filter(c=>c.op==='gap'&&c.phase==='begin').length>=3);assert.ok(model.state.stopped);assert.equal(r.completedChildren,0);
});
test('unresponsive durable store times out without any source factory or key use',async()=>{
  const time=clock(),g=grant(),port={version:POLICY.version,transact:()=>new Promise(()=>{}),close:async()=>{} };let calls=0;
  const r=await new Continuous(g,port,()=>{calls++;throw Error('MUST_NOT_ACCESS_SOURCE');},time).run();
  assert.equal(calls,0);assert.equal(r.reason,'STORE_TIMEOUT');assert.equal(r.durableStopConfirmed,false);
});
