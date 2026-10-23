import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker,OfflineStore,OfflineSource,testClock,grant,fixture,ack,stopSoon,policy,MINT,AT} from './fixtures.mjs';

test('offline ledger captures one instant, never inventing a lease longer than the real guard',async()=>{
  let tick=0;const clock={now:()=>Date.parse(AT)+tick++};
  const r=await new OfflineStore(clock).transact({op:'claim',approval:grant()});
  assert.equal(r.state.leaseUntilMs-r.state.serverNowMs,policy.SCOPE.leaseMs);
});

test('durable claim/reservations precede every source call; raw payloads never reach store',async()=>{
  const clock=testClock(),store=new OfflineStore(clock),source=new OfflineSource(store,(h,s)=>{h.frame(ack);h.frame(s.fixture.raw);});
  const worker=new Worker(grant(),store,source,clock);store.after=c=>{if(c.op==='append'&&c.record.finality==='finalized')stopSoon(worker);};
  const health=await worker.run();assert.equal(health.finalized,1);assert.equal(source.reads.length,2);assert.equal(store.connections,1);assert.equal(store.rpc,2);
  assert.equal(store.records.values().next().value.mint,MINT);
  assert.equal(health.state,'STOPPED');assert.ok(store.stopped);assert.equal(store.leased,false);
  const serialized=JSON.stringify(store.commands);assert.doesNotMatch(serialized,/Program log:|SYNTHETIC OFFLINE|token_amount|api-key/);
  const positions=store.commands.map(c=>c.op);assert.ok(positions.indexOf('claim')<positions.indexOf('reserve'));
});
test('duplicate creation does not acquire again; no migrations/trade sampling',async()=>{
  const clock=testClock(),store=new OfflineStore(clock),source=new OfflineSource(store,(h,s)=>{h.frame(ack);h.frame(s.fixture.raw);h.frame(s.fixture.raw);h.frame(fixture({hint:'Migrate'}).raw);h.frame(fixture({hint:'Buy'}).raw);});
  const worker=new Worker(grant(),store,source,clock);store.after=c=>{if(c.op==='append'&&c.record.finality==='finalized')stopSoon(worker);};
  const h=await worker.run();assert.equal(h.duplicates,1);assert.equal(h.ignored,2);assert.equal(h.finalized,1);assert.equal(source.reads.length,2);
});
test('reconnects require confirmed close and a new durable envelope, with explicit gaps and bounded delays',async()=>{
  const clock=testClock(),store=new OfflineStore(clock),source=new OfflineSource(store,(h,_s,close)=>{h.frame(ack);setTimeout(close,0);});
  const h=await new Worker(grant(),store,source,clock).run();
  assert.equal(source.opens,3);assert.equal(store.connections,3);assert.equal(h.reason,'CONNECTION_BUDGET_EXHAUSTED');
  assert.ok(clock.delays.includes(2000));assert.equal(store.commands.filter(c=>c.op==='connectionClosed').length,3);
  assert.ok(store.commands.filter(c=>c.op==='gap').length>=6);
});
for(const [name,change] of [
  ['claim denied',s=>{s.fail=async()=>({ok:false,reason:'STOP'});}],
  ['STOP attestation',s=>{s.edit=r=>{r.state.stop=true;};}],
  ['wrong scope',s=>{s.edit=r=>{r.state.scopeHash='0'.repeat(64);};}],
  ['expired lease',s=>{s.edit=r=>{r.state.leaseUntilMs=r.state.serverNowMs;};}],
  ['changed approval expiry',s=>{s.edit=r=>{r.state.sessionUntilMs++;};}],
  ['unconfirmed ticket',s=>{s.edit=(r,c)=>{if(c.op==='reserve')delete r.ticketId;};}],
])test(`${name} causes zero provider/key capability use`,async()=>{
  const clock=testClock(),store=new OfflineStore(clock);change(store);const source=new OfflineSource(store);
  const h=await new Worker(grant(),store,source,clock).run();assert.equal(source.opens,0);assert.equal(source.reads.length,0);assert.equal(h.state,'STOPPED');
});
test('store heartbeat failure closes source; restart cannot reset durable STOP/budget',async()=>{
  const clock=testClock(),store=new OfflineStore(clock),source=new OfflineSource(store,h=>h.frame(ack));
  store.fail=async c=>{if(c.op==='heartbeat')throw Error('OFFLINE STORE OUTAGE');const f=store.fail;store.fail=null;try{return await store.transact(c);}finally{store.fail=f;}};
  const h=await new Worker(grant(),store,source,clock).run();assert.equal(h.state,'STOPPED');assert.equal(source.opens,1);assert.equal(store.connections,1);
  store.fail=null;const second=new OfflineSource(store);await new Worker(grant(),store,second,clock).run();assert.equal(second.opens,0);assert.equal(store.connections,1);
});
test('expired cached lease blocks a frame/RPC even before heartbeat callback runs',async()=>{
  const clock=testClock(),store=new OfflineStore(clock),source=new OfflineSource(store,(h,s)=>{h.frame(ack);clock.jump(policy.SCOPE.leaseMs+1);h.frame(s.fixture.raw);});
  const h=await new Worker(grant(),store,source,clock).run();assert.equal(source.reads.length,0);assert.equal(h.state,'STOPPED');assert.equal(h.reason,'LEASE_INVALID_AT_FRAME');
});
test('provider read failure is not retried; budget is spent before failed request',async()=>{
  const clock=testClock(),store=new OfflineStore(clock),source=new OfflineSource(store,(h,s)=>{h.frame(ack);h.frame(s.fixture.raw);});
  source.read=async()=>{source.reads.push({failed:true});throw Error('OFFLINE 429');};
  const h=await new Worker(grant(),store,source,clock).run();assert.equal(source.reads.length,1);assert.equal(store.rpc,1);assert.equal(h.finalized,0);assert.equal(source.opens,1);
});
test('source revisions and bounded callback backlog stop rather than fabricate or silently drop',async()=>{
  const clock=testClock(),store=new OfflineStore(clock),source=new OfflineSource(store,(h,s)=>{
    h.frame(ack);h.frame(s.fixture.raw);const revised=JSON.parse(s.fixture.raw);revised.params.result.context.slot++;h.frame(JSON.stringify(revised));
  });const h=await new Worker(grant(),store,source,clock).run();assert.equal(h.reason,'SOURCE_REVISION');assert.equal(h.finalized,0);
});
test('backlog cap is a hard stop, not an unbounded pending promise queue',async()=>{
  const clock=testClock(),store=new OfflineStore(clock),source=new OfflineSource(store,h=>{
    h.frame(ack);for(let i=1;i<=policy.SCOPE.maxQueue+1;i++)h.frame(fixture({seed:i}).raw);
  });const health=await new Worker(grant(),store,source,clock).run();assert.equal(health.reason,'QUEUE_CAP');assert.equal(source.reads.length,0);
});

test('slow HTTP corroboration does not block subsequent provisional receipt persistence',async()=>{
  const clock=testClock(),store=new OfflineStore(clock);let finishRead,worker;
  const source=new OfflineSource(store,(h,s)=>{
    h.frame(ack);h.frame(s.fixture.raw);
    setTimeout(()=>h.frame(fixture({seed:2}).raw),5);
  });
  source.read=async(body,_signal,allowed)=>{
    assert.ok(allowed());source.reads.push(JSON.parse(body));
    if(JSON.parse(body).id===10)await new Promise(r=>{finishRead=r;});
    return JSON.stringify(JSON.parse(body).id===10?source.fixture.tx:source.fixture.status);
  };
  store.after=c=>{
    if(c.op==='append'&&store.records.size===2&&c.record.finality==='provisional'){
      assert.equal(source.reads.length,1);finishRead();
    }
    if(c.op==='append'&&c.record.finality==='finalized')stopSoon(worker);
  };
  worker=new Worker(grant(),store,source,clock);const h=await worker.run();
  assert.equal(h.provisional,2);assert.equal(h.finalized,1);assert.equal(source.reads.length,2);
});
test('claim seeds persisted cumulative counters; reconnect cannot report a reset',async()=>{
  const clock=testClock(),store=new OfflineStore(clock),source=new OfflineSource(store,h=>{h.frame(ack);});
  const old=store.transact.bind(store);store.transact=async c=>{const r=await old(c);if(c.op==='claim')r.committedCounters={frames:30,bytes:4000};return r;};
  const worker=new Worker(grant(),store,source,clock);setTimeout(()=>worker.stop(),35);
  const h=await worker.run();assert.equal(h.frames,31);assert.equal(h.bytes,4000+Buffer.byteLength(ack));
  assert.ok(store.commands.filter(c=>c.op==='heartbeat').every(c=>c.health.frames>=31));
});

test('uncertain native closure stays quarantined and never reports confirmed closed or releases lease',async()=>{
  const clock=testClock(),store=new OfflineStore(clock);let worker;
  const source={open(h){queueMicrotask(()=>{h.open();h.frame(ack);worker.stop('OWNER_SIGNAL');});return {closed:new Promise(()=>{}),close(){}};},read(){throw Error('NO_RPC');}};
  worker=new Worker(grant(),store,source,clock);const h=await worker.run();
  assert.equal(h.reason,'SOURCE_CLOSE_UNCONFIRMED');assert.equal(h.sourceState,'open');
  assert.equal(store.commands.filter(c=>c.op==='release'||c.op==='connectionClosed').length,0);
  assert.ok(store.stopped);assert.equal(store.leased,true);
});
