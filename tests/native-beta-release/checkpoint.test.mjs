// Actual local fsync/CAS/MAC + HTTP adapter. SYNTHETIC local scope; not hosted custody.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {randomBytes,createHash} from 'node:crypto';import {createRequire} from 'node:module';
import {fileAnchor} from '../../experiments/jupiter-beta-approval/integration/durable/anchor.mjs';
const require=createRequire(import.meta.url),root=process.env.ADMISSION_BUILD,{checkpointBoundary,remoteCheckpoint}=require(root+'/lib/native-pilot/postgres/checkpoint.js'),{nativeCheckpointRequest,createNativeCheckpointEndpoint}=require(root+'/lib/native-pilot/runtime/custodian.js'),{canonical}=require(root+'/lib/native-pilot/postgres/protocol.js');
const sha=x=>createHash('sha256').update(x).digest('hex');
async function fixture(){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'native-http-anchor-')),key=randomBytes(32),c={origin:'https://synthetic-native-checkpoint.onrender.com',policyHash:sha('SYNTHETIC POLICY'),reviewSha256:sha('SYNTHETIC CUSTODY'),keySha256:sha(key)},bootstrap={seq:'0',head:'0'.repeat(64),policyHash:c.policyHash,stateHash:sha('SYNTHETIC INITIAL STATE')};
 await fs.writeFile(path.join(dir,'beta-anchor.jsonl'),canonical(bootstrap)+'\n',{mode:0o600});const anchor=fileAnchor({directory:dir,bootstrap}),store={current:()=>anchor.current(),async advance(a,b){await anchor.advance(a,b);return anchor.current();}},handler=nativeCheckpointRequest(c,checkpointBoundary(c,key,store));return {dir,key,c,bootstrap,handler,store,close:()=>fs.rm(dir,{recursive:true,force:true})};}
test('real local MAC/read/advance crosses new HTTP adapter into original fsync anchor; no retry/reset and lost ACK keeps spend witness',async()=>{
 const f=await fixture();let lost=false,calls=0;
 try{const peer=remoteCheckpoint(f.c,f.key,async(url,init)=>{calls++;const response=await f.handler(new Request(url,init));if(lost)throw Error('SYNTHETIC LOST ACK');return response;}),first=await peer.current(),next={...first,seq:'1',head:sha('SYNTHETIC COMMITTED DB HEAD'),stateHash:sha('SYNTHETIC COMMITTED STATE')};lost=true;await assert.rejects(()=>peer.advance(first,next));assert.equal(calls,2);lost=false;const current=await peer.current();assert.equal(current.seq,'1');assert.equal(current.head,next.head);assert.notEqual(current.recordHash,first.recordHash);assert.equal(calls,3);
  await assert.rejects(()=>peer.advance(first,next));assert.equal(calls,4);await assert.rejects(()=>peer.current());assert.ok(await fs.stat(path.join(f.dir,'beta-anchor.lock'))); // ambiguous/stale attempt never reclaims lock
 }finally{await f.close();}
});
test('checkpoint HTTP rejects wrong origin/path/method/encoding/MAC/body before state change; no bootstrap endpoint',async()=>{
 const f=await fixture();try{for(const [url,method,headers,body]of [[f.c.origin+'/bootstrap','POST',{},'{}'],[f.c.origin+'/native-checkpoint/read','GET',{},null],['https://evil.invalid/native-checkpoint/read','POST',{},'{}'],[f.c.origin+'/native-checkpoint/read','POST',{'content-encoding':'gzip'},'{}'],[f.c.origin+'/native-checkpoint/read','POST',{},'{}'],[f.c.origin+'/native-checkpoint/read','POST',{},'x'.repeat(4097)]]){
   const r=await f.handler(new Request(url,{method,headers:{origin:f.c.origin,'content-type':'application/json',...headers},...(body?{body}:{})}));assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'native_checkpoint_held'});
  }assert.equal((await f.store.current()).seq,'0');assert.deepEqual(await fs.readdir(f.dir),['beta-anchor.jsonl']);
 }finally{await f.close();}
});
test('custodian construction pins persistent path and refuses tmp/Vercel/same arbitrary filesystem; no seeding',()=>{
 const key=Buffer.alloc(32,8),c={origin:'https://synthetic-native-checkpoint.onrender.com',policyHash:sha('POLICY'),reviewSha256:sha('CUSTODY'),keySha256:sha(key)},bootstrap={seq:'0',head:'0'.repeat(64),policyHash:c.policyHash,stateHash:sha('STATE')};
 for(const dir of ['/tmp/anchor','/workspace/anchor','/var/data/x','relative'])assert.throws(()=>createNativeCheckpointEndpoint(c,key,dir,bootstrap));assert.equal(typeof createNativeCheckpointEndpoint(c,key,'/var/data/synthetic-checkpoint',bootstrap),'function');
});
