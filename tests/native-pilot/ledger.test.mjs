import test,{mock} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';import {pathToFileURL} from 'node:url';
import {load,setup,policy,hash} from './fixtures.mjs';
const {openLedger}=load('ledger'),H=hash('SYNTHETIC REQUEST'),R=hash('SYNTHETIC RESPONSE');
test('real fsync reservation, restart, ordered completion, full budget exhaustion; no reset/refund/renew API',async()=>{
 const f=await setup(),p=policy();try{let l=f.ledger;for(const[i,method]of ['getTokenLargestAccounts','getMultipleAccounts','getBlockTime'].entries()){
 const at=p.startsAt+i*3000,r=await l.reserve(method,H,at);assert.equal(r.status,'committed');assert.equal(r.state.attempts,i+1);assert.equal(r.state.credits,i+1);l=openLedger(f.options);const done=await l.finish(i+1,R,at+100);assert.equal(done.status,'committed');}
 const r=await l.reserve('getTokenLargestAccounts',H,p.startsAt+12000);assert.equal(r.status,'held');assert.equal(r.state.attempts,3);assert.equal(r.state.credits,3);assert.equal(r.state.receipts.length,3);assert.equal(l.reset,undefined);
 }finally{await f.cleanup();}
});
test('20 concurrent instances cannot overspend a single outstanding lease',async()=>{const f=await setup();try{const rs=await Promise.allSettled(Array.from({length:20},()=>openLedger(f.options).reserve('getTokenLargestAccounts',H,policy().startsAt)));assert.equal(rs.filter(r=>r.status==='fulfilled'&&r.value.status==='committed').length,1);const s=await f.ledger.inspect();assert.equal(s.attempts,1);assert.equal(s.credits,1);}finally{await f.cleanup();}});
test('12 actual local Node processes contend on the same durable lock; exactly one reservation',async()=>{
 const f=await setup();try{const script=`import {load} from ${JSON.stringify(pathToFileURL(path.resolve('tests/native-pilot/fixtures.mjs')).href)};const o=JSON.parse(process.argv[1]);try{const r=await load('ledger').openLedger(o).reserve('getTokenLargestAccounts',${JSON.stringify(H)},o.policy.startsAt);console.log(r.status);}catch{console.log('held');}`;
 const output=await Promise.all(Array.from({length:12},()=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--conditions=react-server','--input-type=module','-e',script,JSON.stringify(f.options)],{env:process.env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.on('error',reject);child.on('close',code=>code===0?resolve(stdout.trim()):reject(Error(stderr)));})));
 assert.equal(output.filter(x=>x==='committed').length,1);const s=await f.ledger.inspect();assert.equal(s.attempts,1);assert.equal(s.credits,1);
 }finally{await f.cleanup();}
});
for(const reason of ['rollback','expiry','lease'])test(`${reason} commits permanent STOP and never a successful reservation`,async()=>{const f=await setup(),p=policy();try{if(reason==='lease')await f.ledger.reserve('getTokenLargestAccounts',H,p.startsAt);const at=reason==='rollback'?p.startsAt-1:reason==='expiry'?p.expiresAt:p.startsAt+3000;const r=await f.ledger.reserve('getTokenLargestAccounts',H,at);assert.equal(r.status,'stopped');assert.equal(r.state.stopped,true);const after=await openLedger(f.options).reserve('getTokenLargestAccounts',H,p.startsAt+6000);assert.notEqual(after.status,'committed');assert.equal(after.state.stopped,true);}finally{await f.cleanup();}});
test('fencing, late/unknown completion cannot reclaim uncertain lease or spent counters',async()=>{const f=await setup(),p=policy();try{await f.ledger.reserve('getTokenLargestAccounts',H,p.startsAt);assert.equal((await f.ledger.finish(2,R,p.startsAt+100)).status,'stopped');const s=await f.ledger.inspect();assert.equal(s.attempts,1);assert.equal(s.credits,1);assert.equal(s.lease.fence,1);assert.equal((await f.ledger.finish(1,R,p.startsAt+200)).status,'held');}finally{await f.cleanup();}});
test('replay and wrong method cannot consume another stage; stop after completion survives restart',async()=>{const f=await setup(),p=policy();try{assert.equal((await f.ledger.reserve('getBlockTime',H,p.startsAt)).status,'held');await f.ledger.reserve('getTokenLargestAccounts',H,p.startsAt);await f.ledger.finish(1,R,p.startsAt+100);assert.equal((await f.ledger.reserve('getTokenLargestAccounts',H,p.startsAt+3000)).status,'held');await f.ledger.stop(p.startsAt+3100);assert.equal((await openLedger(f.options).inspect()).stopped,true);}finally{await f.cleanup();}});
for(const damage of ['missing-anchor','anchor-rollback','target-rollback','truncation','stop-removal','wrong-policy','symlink','permissions','lock','anchor-outage'])test(`independent currentness fails closed: ${damage}`,async()=>{
 const f=await setup(),p=policy();try{const oldFile=await fs.readFile(f.file),oldAnchor=await fs.readFile(f.anchor);await f.ledger.reserve('getTokenLargestAccounts',H,p.startsAt);await f.ledger.finish(1,R,p.startsAt+100);await f.ledger.stop(p.startsAt+200);
 if(damage==='missing-anchor')await fs.unlink(f.anchor);
 if(damage==='anchor-rollback')await fs.writeFile(f.anchor,oldAnchor);
 if(damage==='target-rollback')await fs.writeFile(f.file,oldFile);
 if(damage==='truncation'){const lines=(await fs.readFile(f.file,'utf8')).trimEnd().split('\n');await fs.writeFile(f.file,lines.slice(0,-1).join('\n')+'\n');}
 if(damage==='stop-removal'){const text=await fs.readFile(f.file,'utf8');await fs.writeFile(f.file,text.replaceAll('"stopped":true','"stopped":false'));}
 if(damage==='wrong-policy'){assert.throws(()=>openLedger({...f.options,policy:{...p,id:'different-policy'}}));return;}
 if(damage==='symlink'){await fs.rename(f.file,f.file+'.old');await fs.symlink(f.file+'.old',f.file);}
 if(damage==='permissions')await fs.chmod(f.file,0o644);
 if(damage==='lock')await fs.writeFile(path.join(f.directory,'native-pilot.lock'),'UNCERTAIN',{mode:0o600});
 if(damage==='anchor-outage')await fs.rename(f.anchorDirectory,f.anchorDirectory+'.offline');
 await assert.rejects(()=>openLedger(f.options).inspect());await assert.rejects(()=>openLedger(f.options).reserve('getTokenLargestAccounts',H,p.startsAt+6000));
 }finally{await f.cleanup();}
});
test('lost ACK between journal and anchor leaves persistent lock and HOLD; never repair or resend',async()=>{
 const f=await setup(),p=policy(),original=fs.open;try{const patch=mock.method(fs,'open',async function(file,...args){if(file===path.join(f.anchorDirectory,'beta-anchor.lock'))throw Error('SYNTHETIC ANCHOR OUTAGE');return original.call(this,file,...args);});await assert.rejects(()=>f.ledger.reserve('getTokenLargestAccounts',H,p.startsAt));patch.mock.restore();await assert.rejects(()=>openLedger(f.options).inspect());assert.match(await fs.readFile(f.file,'utf8'),/"attempts":1/);assert.ok(await fs.stat(path.join(f.directory,'native-pilot.lock')));}finally{mock.restoreAll();await f.cleanup();}
});
