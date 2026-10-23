import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptStore} from '../store-adapter.mjs';
import {grant,UUID,FENCE,AT,fixture,notice,corroborate,policy} from './fixtures.mjs';
const signal=()=>new AbortController().signal;
function rawPort(){
  const commands=[];let busy=false,active=0,maxActive=0;
  return {commands,get maxActive(){return maxActive;},async transact(c){
    if(busy)throw Error('NO_SECOND_PG_WAITER');busy=true;maxActive=Math.max(maxActive,++active);
    commands.push(c);await new Promise(r=>setTimeout(r,2));busy=false;active--;
    return {v:1,ok:true,reason:c.op==='append'?c.event.finality==='provisional'?'inserted':'promoted':null,
      session:c.session,scope:c.scope,head:c.head,worker:c.op==='release'&&c.terminal?null:c.worker,
      fence:c.op==='release'&&c.terminal?null:FENCE,stopped:c.op==='stop',serverTime:AT,
      leaseUntil:c.op==='release'&&c.terminal?null:'2026-10-22T12:00:22.000Z',ticket:commands.length,framesReceived:7,bytesReceived:1000};
  },async close(){}};
}
const identity={runId:UUID,scopeHash:policy.SCOPE_HASH,leaseId:UUID,fence:FENCE};
test('B envelope preserves native SOL identity and original receipts on promotion; single SQL queue',async()=>{
  const raw=rawPort(),s=adaptStore(raw,grant(),UUID),first=await s.transact({op:'claim'},{signal:signal()});
  assert.deepEqual(first.committedCounters,{frames:7,bytes:1000});
  const f=fixture(),row=notice(f.raw,AT,9).row,final=corroborate(row,JSON.stringify(f.tx),JSON.stringify(f.status),AT);
  await Promise.all([
    s.transact({...identity,op:'append',record:row},{signal:signal()}),
    s.transact({...identity,op:'append',record:final},{signal:signal()}),
    s.transact({...identity,op:'heartbeat',health:{state:'SUBSCRIBED',sourceState:'open',frames:8,bytes:1100,lastFrameAt:AT,lastPongAt:null,lastRpcRoundTripMs:10}},{signal:signal()}),
  ]);
  assert.equal(raw.maxActive,1);const a=raw.commands[1].event,b=raw.commands[2].event;
  assert.equal(a.finality,'provisional');assert.equal(a.mint,null);
  assert.equal(b.finality,'rpc_reported_finalized');assert.equal(b.quoteMint,'11111111111111111111111111111111');
  assert.equal(b.blockTime,'2026-10-22T12:00:00.000Z');assert.equal(b.notificationHash,a.notificationHash);assert.equal(b.receivedAt,a.receivedAt);
  assert.deepEqual(Object.keys(b).sort(),['signature','slot','receivedAt','source','program','notificationHash','finality','mint','quoteMint','tokenProgram','transactionHash','verificationHash','checkedAt','blockTime'].sort());
  assert.equal(raw.commands[3].sourceState,'open');assert.equal(raw.commands[3].lastRpcElapsedMs,10);
  const released=await s.transact({...identity,op:'release'},{signal:signal()});assert.equal(released.ok,true);assert.equal(released.state.leaseUntilMs,Date.parse(AT));
});
test('cancelled queued SQL is never sent and counter regression cannot reach ledger',async()=>{
  const raw=rawPort(),s=adaptStore(raw,grant(),UUID);await s.transact({op:'claim'},{signal:signal()});
  const health={state:'CONNECTING',sourceState:'connecting',frames:7,bytes:1000,lastFrameAt:null,lastPongAt:null,lastRpcRoundTripMs:null};
  const first=s.transact({...identity,op:'heartbeat',health},{signal:signal()}),abort=new AbortController();
  const cancelled=s.transact({...identity,op:'reserve',kind:'rpc'},{signal:abort.signal});abort.abort();
  await first;await assert.rejects(cancelled,/STORE_ABORTED/);
  await assert.rejects(s.transact({...identity,op:'heartbeat',health:{...health,frames:0}},{signal:signal()}),/COUNTERS_REGRESSED/);
  assert.equal(raw.commands.length,2);
});
test('missing persisted counters, changed fence and unconfirmed append are fatal',async()=>{
  for(const alter of [r=>{delete r.framesReceived;},r=>{r.fence='bad';},r=>{r.reason='unknown';}]){
    const raw=rawPort(),s=adaptStore(raw,grant(),UUID);await s.transact({op:'claim'},{signal:signal()});
    const original=raw.transact;raw.transact=async c=>{const r=await original(c);alter(r);return r;};
    await assert.rejects(s.transact({...identity,op:'append',record:notice(fixture().raw,AT,9).row},{signal:signal()}));
  }
});
