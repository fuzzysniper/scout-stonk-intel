// SYNTHETIC OFFLINE ONLY. No authentic mint facts, credentials, identity issuer or durable backend.
import {createRequire} from 'node:module';
import {MINT,OTHER,TIME,envelope} from '../v4-solana-facts/fixtures.mjs';
export {MINT,OTHER,TIME,envelope};
export const THIRD='So11111111111111111111111111111111111111112';
export const KEY='SYNTHETIC_221_NOT_A_REAL_PROVIDER_CREDENTIAL';
export const BASE=Date.parse(TIME);
const require=createRequire(import.meta.url);
export const api=require(process.env.V4_PILOT_BUILD+'/lib/v4-helius-pilot/server/testing.js');
export const {BOUNDS,PILOT_GATE,createHeliusPilot}=require(process.env.V4_PILOT_BUILD+'/lib/v4-helius-pilot/server/index.js');
export const {Rejected}=require(process.env.V4_PILOT_BUILD+'/lib/v4-helius-pilot/server/transport.js');
export const project=require(process.env.V4_PILOT_BUILD+'/lib/v4-solana-facts/projection.js').projectHeliusCapture;
export function profile(){return {id:'synthetic-pilot-221',origin:'https://owner.invalid',ownerSubject:'SYNTHETIC_OWNER_221',identityIssuer:'synthetic-owner-issuer-221',startsAt:BASE,expiresAt:BASE+BOUNDS.windowMs,mints:[MINT,OTHER,THIRD],creditsPerAttempt:1,maxCredits:10};}
const clone=v=>structuredClone(v);
/** A test-only transaction model, NOT production persistence or Vercel-global state.
 * JSON restoration models retained state; does NOT prove WAL/replication/ACK durability. */
export class MockLedger{
 scope='global_atomic_durable';
 constructor(p,restored){this.p=clone(p);this.hash=api.prepareProfile(p).hash;this.s=restored?clone(restored):{attempts:0,credits:0,reads:0,stopped:false,lease:null,lastClock:p.startsAt,highestSlot:0,permits:{},reports:{},events:[]};}
 denied(reason){return {kind:'denied',reason};}
 async transact(c){
  const s=this.s;if(c.kind==='stop'){
   if(c.policyHash!==this.hash||c.ownerSubject!==this.p.ownerSubject)throw Error('SYNTHETIC invalid policy');
   s.stopped=true;s.events.push({kind:'stop'});return {kind:'stopped',policyHash:this.hash};
  }
  if(s.stopped)return this.denied('stopped');
  if(!Number.isSafeInteger(c.now)||c.now<s.lastClock){s.stopped=true;return this.denied('invalid_clock');}s.lastClock=c.now;
  if(c.now<this.p.startsAt||c.now>=this.p.expiresAt)return this.denied('expired');
  if(c.kind==='admit'){
   if(c.policyHash!==this.hash||c.ownerSubject!==this.p.ownerSubject||!this.p.mints.includes(c.mint))throw Error('SYNTHETIC wrong admission');
   if(s.reads>=BOUNDS.authenticatedReads)return this.denied('read_limited');
   const permit={policyHash:this.hash,id:'read-'+(++s.reads),ownerSubject:c.ownerSubject,mint:c.mint,admittedAt:c.now};s.permits[permit.id]={permit,finished:false};return {kind:'permit',permit:clone(permit)};
  }
  const stored=s.permits[c.permit.id];if(!stored||stored.finished||JSON.stringify(stored.permit)!==JSON.stringify(c.permit))throw Error('SYNTHETIC replay/changed permit');
  if(c.kind==='reserve'){
   if(s.lease){if(c.now>=s.lease.expiresAt){s.stopped=true;return this.denied('stopped');}return this.denied('busy');}
   if(s.attempts>=BOUNDS.attempts||s.credits+this.p.creditsPerAttempt>this.p.maxCredits)return this.denied('exhausted');
   const id=++s.attempts;s.credits+=this.p.creditsPerAttempt;
   s.lease={policyHash:this.hash,permitId:c.permit.id,id,mint:c.permit.mint,issuedAt:c.now,expiresAt:Math.min(c.now+BOUNDS.timeoutMs,this.p.expiresAt),attemptsReserved:s.attempts,creditsReserved:s.credits};s.events.push({kind:'reserved',id});return {kind:'lease',lease:clone(s.lease)};
  }
  if(c.kind!=='finish')throw Error('SYNTHETIC unknown command');
  const r=c.report,slot=Number(r.contextSlot),at=r.receivedAt;
  if(!/^[0-9a-f]{64}$/.test(r.responseSha256)||!Number.isSafeInteger(slot)||slot<=0||!Number.isSafeInteger(at)||at>c.now||at<this.p.startsAt||c.now-at>BOUNDS.sourceAgeMs){s.stopped=true;return this.denied('invalid_clock');}
  if(c.lease){
   if(!s.lease||JSON.stringify(s.lease)!==JSON.stringify(c.lease)||c.lease.permitId!==c.permit.id||c.now>=s.lease.expiresAt||slot<s.highestSlot){s.stopped=true;return this.denied('invalid_clock');}
   s.lease=null;s.highestSlot=slot;s.reports[c.permit.mint]=clone(r);s.events.push({kind:'completed',id:c.lease.id});
  }else if(JSON.stringify(s.reports[c.permit.mint])!==JSON.stringify(r)||c.now-at>BOUNDS.cacheMs)throw Error('SYNTHETIC unknown/expired cache');
  stored.finished=true;return {kind:'published',policyHash:this.hash,permitId:c.permit.id,leaseId:c.lease?.id??null,report:clone(r),committedAt:c.now};
 }
}
export function scenario(){
 const p=profile(),ledger=new MockLedger(p),calls={keys:0,rpc:0,identity:0,requests:[]};let wall=BASE,mono=0;
 const ports={now:()=>wall,monotonic:()=>mono,ledger,
  identity:{async authenticate(){calls.identity++;return {subject:p.ownerSubject,issuer:p.identityIssuer,audience:p.origin,sessionId:'SYNTHETIC_SESSION_221',pilotId:p.id,authenticatedAt:BASE,expiresAt:p.expiresAt};}},
  readProviderKey:()=>{calls.keys++;return KEY;},
  transport:async(read)=>{calls.rpc++;calls.requests.push(read);const e=envelope();e.id=read.id;return Response.json(e);}};
 const request=(mint=MINT,extra={})=>new Request(p.origin+'/api/v4/helius-pilot',{method:'POST',headers:{origin:p.origin,'sec-fetch-site':'same-origin','content-type':'application/json','x-unfarmd-v4-pilot-intent':'read',...extra.headers},body:JSON.stringify({action:'read',mint}),...Object.fromEntries(Object.entries(extra).filter(([k])=>k!=='headers'))});
 return {p,ledger,ports,calls,request,advance(ms){wall+=ms;mono+=ms;},wall(ms){wall=ms;},mono(ms){mono=ms;},now:()=>wall,
  make:overrides=>api.createMockPilot(p,{...ports,...overrides})};
}
export const result=async r=>({status:r.status,body:await r.json()});
export const tick=()=>new Promise(resolve=>setImmediate(resolve));
