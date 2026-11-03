import test from 'node:test';import assert from 'node:assert/strict';
import {load,setup,policy,request,ports,MINT,hash,stubEvidence} from './fixtures.mjs';
const {acquire}=load('engine'),{createNativePilot,verifiedNativeObservation,NATIVE_PILOT_ENABLED,NATIVE_PILOT_BUILD}=load('index');
test('actual production constructor HARD OFF does not touch config, credential loader, SQL, filesystem or network',async()=>{
 const bomb=new Proxy({},{get(){throw Error('OFF CONFIG MUST NOT BE INSPECTED');}});assert.equal(NATIVE_PILOT_ENABLED,false);assert.equal(NATIVE_PILOT_BUILD,null);const p=createNativePilot(bomb);assert.equal((await p.inspect()).status,'held');assert.equal((await p.stop()).status,'held');
 for(const fake of [{},null,{providerAuthenticated:true},{acquisition:'native_fixed_host_tls',responseSha256:hash('FAKE')}])assert.equal(await verifiedNativeObservation(fake),null);
});
for(const damage of ['response-hash','request-hash','host','method','clock','missing-reference','unavailable'])test('A boundary cannot promote unrelated or relabeled evidence: '+damage,async()=>{
 const f=await setup(),p=policy(),x=ports(f,p);try{x.analyze=()=>{const e=stubEvidence(x.input.at(-1));if(damage==='response-hash')e.references[0].responseSha256='f'.repeat(64);if(damage==='request-hash')e.references[0].requestSha256='f'.repeat(64);if(damage==='host')e.references[0].providerHost='api.mainnet.solana.com';if(damage==='method')e.references[0].method='getTransaction';if(damage==='clock')e.references[0].receivedAt='2020-01-01T00:00:00.000Z';if(damage==='missing-reference')e.references.pop();if(damage==='unavailable')e.state='unavailable';return e;};assert.equal((await acquire(p,request(p),x)).status,'held');assert.equal((await f.ledger.inspect()).stopped,true);}finally{await f.cleanup();}
});
test('actual engine + actual fsync ledger runs exactly largest20/accounts+mint/blockTime; stub A is NOT genuine analytics',async()=>{
 const f=await setup(),p=policy(),x=ports(f,p);try{const r=await acquire(p,request(p),x);assert.equal(r.status,'candidate');assert.equal(r.activate,false);assert.equal(r.providerAuthenticated,false);assert.equal(x.calls,3);const s=await f.ledger.inspect();assert.equal(s.attempts,3);assert.equal(s.credits,3);assert.equal(s.completed,3);
 assert.equal(x.input[0].selection.endpointHost,'mainnet.helius-rpc.com');assert.equal(x.input[0].kind,'synthetic_fixture');assert.equal(JSON.parse(x.input[0].snapshot.requestBody).params[0].length,21);assert.deepEqual(JSON.parse(x.input[0].clock.requestBody).params,[100]);assert.equal(await verifiedNativeObservation(r),null);
 }finally{await f.cleanup();}
});
for(const fault of ['owner-denied','identity-denied','aborted','wrong-mint','bad-body','missing-anchor','uncertain-existing-lease'])test('no dispatch on '+fault,async()=>{
 const f=await setup(),p=policy(),x=ports(f,p);let req=request(p);try{
 if(fault==='owner-denied')x.authorize=async()=>false;
 if(fault==='identity-denied')x.identity=()=>false;
 if(fault==='aborted'){const c=new AbortController();req=new Request(req,{signal:c.signal});c.abort();}
 if(fault==='wrong-mint')req=new Request(req,{body:JSON.stringify({mint:'11111111111111111111111111111111'})});
 if(fault==='bad-body')req=new Request(req,{body:'{"mint":"'+MINT+'","allow":true}'});
 if(fault==='missing-anchor'){const fs=await import('node:fs/promises');await fs.unlink(f.anchor);}
 if(fault==='uncertain-existing-lease')await f.ledger.reserve('getTokenLargestAccounts',hash('prior uncertain'),p.startsAt);
 assert.equal((await acquire(p,req,x)).status,'held');assert.equal(x.calls,0);
 }finally{await f.cleanup();}
});
for(const fault of ['429','503','timeout','oversize','wrong-host','wrong-request','future-clock','null-selection','duplicates','wrong-slot','block-clock-null','intake-held','fake-native','finish-ack-lost','clock-rollback','STOP-after-reserve','identity-after-reserve','owner-after-reserve'])test('fail closed, spent history and zero retries: '+fault,async()=>{
 const f=await setup(),p=policy(),x=ports(f,p),original=x.wire;try{
 if(['429','503','timeout'].includes(fault))x.wire=async()=>{x.input.push('synthetic attempted');throw Error('SYNTHETIC '+fault);};
 else x.wire=async(...args)=>{const c=await original(...args);if(x.calls===1){
  if(fault==='oversize')return {...c,responseBytes:Buffer.alloc(131073)};
  if(fault==='wrong-host')return {...c,endpointHost:'api.mainnet-beta.solana.com'};
  if(fault==='wrong-request')return {...c,requestBody:'getTransaction'};
  if(fault==='future-clock')return {...c,receivedAt:new Date(x.now+100).toISOString()};
  if(fault==='null-selection')return {...c,responseBytes:Buffer.from(JSON.stringify({jsonrpc:'2.0',id:260001,result:null}))};
  if(fault==='duplicates'){const r=JSON.parse(c.responseBytes);r.result.value[1]=r.result.value[0];return {...c,responseBytes:Buffer.from(JSON.stringify(r))};}
  if(fault==='clock-rollback')x.now=p.startsAt-1;
 }if(fault==='wrong-slot'&&x.calls===2){const r=JSON.parse(c.responseBytes);r.result.context.slot=99;return {...c,responseBytes:Buffer.from(JSON.stringify(r))};}
 if(fault==='block-clock-null'&&x.calls===3){return {...c,responseBytes:Buffer.from('{"jsonrpc":"2.0","id":260003,"result":null}')};}
 return c;};
 if(fault==='block-clock-null'||fault==='intake-held')x.intake=()=>null; // A's full qualifier rejects null block time; no B relabel.
 if(fault==='fake-native')x.analyze=()=>({version:'native-evidence/1',mint:MINT,origin:{status:'candidate_only',providerAuthenticated:true}});
 if(fault==='finish-ack-lost'){const l=f.ledger;x.ledger={...l,finish:async(...args)=>{await l.finish(...args);throw Error('SYNTHETIC LOST ACK');}};}
 if(['STOP-after-reserve','identity-after-reserve','owner-after-reserve'].includes(fault)){const l=f.ledger;let denied=false;x.identity=()=>!denied;x.ledger={...l,reserve:async(...args)=>{const r=await l.reserve(...args);if(fault==='STOP-after-reserve')await l.stop(x.now);else if(fault==='identity-after-reserve')denied=true;else x.authorize=async()=>false;return r;}};}
 const r=await acquire(p,request(p),x);assert.equal(r.status,'held');assert.equal(r.activate,false);assert.ok(x.calls<=3);const s=await f.ledger.inspect();assert.equal(s.stopped,true);assert.ok(s.attempts>=1);assert.equal(s.credits,s.attempts);
 if(['STOP-after-reserve','identity-after-reserve','owner-after-reserve'].includes(fault))assert.equal(x.calls,0);
 const before=s.attempts;assert.equal((await acquire(p,request(p),x)).status,'held');assert.equal((await f.ledger.inspect()).attempts,before);
 }finally{await f.cleanup();}
});
