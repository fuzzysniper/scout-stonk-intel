import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {capture} from '../v4-solana-facts/fixtures.mjs';
import {MINT,OTHER,project,TIME} from './fixtures.mjs';
for(const kind of ['synthetic_fixture','recorded_response'])test('immutable original capture across hash await: '+kind,async()=>{
 const c=capture(undefined,{kind}),text=c.text,originalDigest=crypto.subtle.digest;let release;
 crypto.subtle.digest=function(...args){return new Promise(resolve=>{release=()=>resolve(originalDigest.apply(this,args));});};
 try{
  const pending=project(MINT,c);assert.equal(typeof release,'function');
  c.kind='production_rpc';c.text='{}';c.request.id=999;c.request.mint=OTHER;c.request.endpointHost='evil.invalid';c.request.commitment='processed';
  c.requestStartedAt='2099-01-01T00:00:00Z';c.responseReceivedAt=c.requestStartedAt;c.evaluatedAt=c.requestStartedAt;c.httpDate='not a date';c.httpStatus=429;
  release();const r=await pending;
  assert.equal(r.state,'observed');assert.equal(r.provenance.captureKind,kind);assert.equal(r.sourceGo,false);assert.equal(r.requestedMint,MINT);
  assert.equal(r.provenance.providerAuthentication,'not_verified_offline');assert.equal(r.provenance.requestStartedAt,TIME);assert.equal(r.provenance.responseReceivedAt,TIME);assert.equal(r.provenance.evaluatedAt,TIME);assert.equal(r.provenance.httpDate,null);
  assert.equal(r.provenance.responseSha256,createHash('sha256').update(text).digest('hex'));assert.equal(r.provenance.contextSlot,'400000001');
 }finally{crypto.subtle.digest=originalDigest;}
});
test('accessor captures never execute getters or gain admission',async()=>{
 let reads=0;
 for(const field of ['kind','text','requestStartedAt','responseReceivedAt','evaluatedAt','request']){
  const c=capture();Object.defineProperty(c,field,{get(){reads++;return 'production_rpc';},enumerable:true});
  const r=await project(MINT,c);assert.equal(r.reason,'invalid_capture');assert.equal(r.provenance,null);
 }
 const c=capture();Object.defineProperty(c.request,'mint',{get(){reads++;return MINT;},enumerable:true});assert.equal((await project(MINT,c)).reason,'invalid_capture');assert.equal(reads,0);
});
test('symbols, inherited fields, boxed primitives and production labels are not capture provenance',async()=>{
 for(const c of [capture(undefined,{kind:'production_rpc'}),Object.assign(Object.create({kind:'synthetic_fixture'}),capture()),capture(undefined,{text:new String('{}')})]){
  const r=await project(MINT,c);assert.equal(r.provenance,null);assert.equal(r.sourceGo,false);
 }
 const c=capture();c[Symbol('hidden')]='production_rpc';assert.equal((await project(MINT,c)).reason,'invalid_capture');
});
