import test from 'node:test';import assert from 'node:assert/strict';
import {transcript,load,H,R,hash,canonical} from '../fixtures.mjs';
test('TRANSCRIPT only: three ordered reservations/debits with checkpoint ACK, no DB/concurrency claim',async()=>{const f=transcript(),l=f.ledger();for(const method of ['getTokenLargestAccounts','getMultipleAccounts','getBlockTime']){const r=await l.reserve(method,H,f.clock);assert.equal(r.status,'committed');assert.equal(r.state.credits,r.state.attempts);f.clock+=100;await l.finish(r.state.attempts,R,f.clock);f.clock+=3000;}assert.equal(f.state.attempts,3);assert.equal(f.state.receipts.length,3);assert.deepEqual(f.calls.slice(0,3),['checkpoint.read','db.reserve','checkpoint.advance']);});
for(const fault of ['no-anchor','wrong-policy','stale-anchor','commit-unknown','checkpoint-unknown','wrong-ACK','rollback-STOP','state-tamper','wrong-operation','reserve-no-lease','driver-mutation'])test('TRANSCRIPT fail closed / never successful reservation: '+fault,async()=>{
 const f=transcript();const original=f.tx.bind(f);let calls=0;
 if(fault==='no-anchor')f.anchor.current=async()=>{throw Error('SYNTHETIC');};
 if(fault==='wrong-policy')f.anchor.current=async()=>({...f.current,policyHash:hash('OTHER POLICY')});
 if(fault==='stale-anchor')f.anchor.current=async()=>({...f.current,seq:'1'});
 if(fault==='checkpoint-unknown')f.anchor.advance=async()=>{throw Error('SYNTHETIC LOST ACK');};
 if(fault==='wrong-ACK')f.anchor.advance=async(_,next)=>({...next,head:hash('WRONG ACK')});
 f.tx=async(...args)=>{calls++;const r=await original(...args);
  if(fault==='commit-unknown')throw Error('SYNTHETIC COMMIT UNKNOWN');
  if(fault==='rollback-STOP'){r.operation='stop';r.status='stopped';r.state.stopped=true;r.stateHash=hash(canonical(r.state));r.head=hash(f.current.head+':1:stop:'+r.stateHash);}
  if(fault==='state-tamper')r.state.credits=0;
  if(fault==='wrong-operation')r.operation='finish';
  if(fault==='reserve-no-lease'){r.state.lease=null;r.stateHash=hash(canonical(r.state));r.head=hash(f.current.head+':1:reserve:'+r.stateHash);}
  if(fault==='driver-mutation'){const advance=f.anchor.advance;f.anchor.advance=async(...a)=>{r.status='committed';r.state.stopped=false;return advance(...a);};r.operation='stop';r.status='stopped';r.state.stopped=true;r.stateHash=hash(canonical(r.state));r.head=hash(f.current.head+':1:stop:'+r.stateHash);}
  return r;
 };
 const l=f.ledger();let result;try{result=await l.reserve('getTokenLargestAccounts',H,f.clock);}catch{result={status:'held'};}
 assert.notEqual(result.status,'committed');if(['no-anchor','wrong-policy'].includes(fault))assert.equal(calls,0);
 if(['commit-unknown','checkpoint-unknown','wrong-ACK'].includes(fault)){assert.equal(f.state.attempts,1);await assert.rejects(()=>l.reserve('getTokenLargestAccounts',H,f.clock));}
});
test('missing checkpoint permits durable DB STOP attempt but returns UNKNOWN, not success',async()=>{const f=transcript();f.anchor.current=async()=>{throw Error('SYNTHETIC WITNESS OUTAGE');};await assert.rejects(()=>f.ledger().stop(f.clock));assert.equal(f.state.stopped,true);assert.equal(f.calls.filter(x=>x==='db.stop').length,1);});
test('uncertain lease from a previous process is never refunded/replayed by a new adapter',async()=>{const f=transcript();await f.ledger().reserve('getTokenLargestAccounts',H,f.clock);const l=f.ledger();const state=await l.inspect();assert.equal(state.lease.fence,1);assert.equal(state.attempts,1);assert.equal(state.credits,1);});
test('source factory stays OFF before reading any new store, DSN, key or checkpoint config',async()=>{const {createNativePilot}=load('../index');const c=new Proxy({},{get(){throw Error('UNAUTHORIZED_CONFIG_READ');}});assert.equal((await createNativePilot(c).inspect()).status,'held');});
