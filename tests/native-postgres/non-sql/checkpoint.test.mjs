import test from 'node:test';import assert from 'node:assert/strict';
import {load,transcript,hash} from '../fixtures.mjs';
const {remoteCheckpoint,checkpointBoundary,createCheckpointCustodian}=load('checkpoint');
const key=Buffer.alloc(32,91); // SYNTHETIC MAC key, no account/signer/credential.
function fixture(){const f=transcript(),c={origin:'https://synthetic-custodian.invalid',keySha256:hash(key),reviewSha256:hash('SYNTHETIC INDEPENDENT CUSTODY'),policyHash:f.current.policyHash};const server=checkpointBoundary(c,key,f.anchor,()=>f.clock);let calls=0;
 return {f,c,server,get calls(){return calls;},dispatch:async(url,options)=>{calls++;return new Response(JSON.stringify(await server(new URL(url).pathname,JSON.parse(options.body))),{status:200,headers:{'content-type':'application/json'}});}};}
test('actual request/reply MAC client and protocol boundary bind fresh nonce, namespace, policy and custody',async()=>{const x=fixture(),a=remoteCheckpoint(x.c,key,x.dispatch,()=>x.f.clock);assert.equal((await a.current()).seq,'0');assert.equal(x.calls,1);});
for(const damage of ['wrong-key','wrong-policy','wrong-custody','wrong-nonce','reply-reflection','untrusted-value','old-reply','rollback-clock','redirect','503'])test('non-SQL checkpoint protocol holds on '+damage,async()=>{
 const x=fixture();let captured;
 const dispatch=async(url,options)=>{if(damage==='redirect')return new Response('',{status:302});if(damage==='503')return new Response('',{status:503});const packet=JSON.parse(options.body);const original=structuredClone(await x.server(new URL(url).pathname,packet));captured=original;
  if(damage==='wrong-key')original.stamp.mac='0'.repeat(64);
  if(damage==='wrong-policy')original.reply.policyHash=hash('OTHER');
  if(damage==='wrong-custody')original.reply.custodySha256=hash('OTHER');
  if(damage==='wrong-nonce')original.reply.operationId='11111111-1111-4111-8111-111111111111';
  if(damage==='reply-reflection')return new Response(JSON.stringify({reply:packet.request,stamp:packet.stamp,activate:false,sourceCalls:false}));
  if(damage==='untrusted-value')original.reply.value.seq='8';
  if(damage==='old-reply')original.reply.timestamp-=60001;
  if(damage==='rollback-clock')x.f.clock--;
  return new Response(JSON.stringify(original));};
 // Simulate network mutation AFTER the actual immutable boundary generated its MAC.
 await assert.rejects(()=>remoteCheckpoint(x.c,key,dispatch,()=>x.f.clock).current());assert.equal(captured?.sourceCalls??false,false);
});
test('no current anchor/auto-bootstrap path: disabled actual custodian returns null before touching config or files',()=>{const bomb=new Proxy({},{get(){throw Error('CONFIG_READ');}});assert.equal(createCheckpointCustodian(bomb,key,'/never/read',bomb),null);});
test('other protocol/old signer request cannot reach checkpoint state even with same synthetic MAC key',async()=>{const x=fixture();await assert.rejects(()=>x.server('/submit',{request:{protocol:'unfarmd-jupiter-beta-authorization/3'},stamp:{role:'consumer',mac:'0'.repeat(64)}}));assert.equal(x.f.calls.length,0);});
