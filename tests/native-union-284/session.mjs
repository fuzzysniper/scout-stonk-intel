// LOCAL/SYNTHETIC wire data. Real B state machine + real A via C's actual intake.
// Non-SQL runs use the historical fsync fixture. Required PG runs supply B’s real scenario.
// A filesystem or transcript cannot satisfy the required current PostgreSQL cases.
import {createRequire} from 'node:module';
import {setup,policy,request} from '../native-pilot/fixtures.mjs';
import {fixture,mutateAccount,mutateResponse,token2022,bytes,MINT,hash} from '../oracle-holders-260/fixtures.mjs';
export {MINT,request,hash};
const require=createRequire(import.meta.url),build=process.env.NATIVE_LENS_BUILD;
export const a=require(build+'/lib/native-evidence/index.js');
export const c=require(build+'/lib/native-lens/boundary.js');
export const b=require(build+'/lib/native-pilot/index.js');
export const model=require(build+'/app/lens/native-evidence-model.js');
export const {nativeTake}=require(build+'/app/lens/native-take.js');
export const {nativeClaim}=require(build+'/app/lens/native-claim.js');
const {acquire}=require(build+'/lib/native-pilot/engine.js');
export const {openLedger}=require(build+'/lib/native-pilot/ledger.js');
const METHODS=['getTokenLargestAccounts','getMultipleAccounts','getBlockTime'];
export async function session(mode='sample',{now=Date.now(),count=20,pgScenario=null}={}){
 const p=pgScenario?pgScenario.policy:policy();if(!pgScenario){p.startsAt=now-7000;p.expiresAt=p.startsAt+900000;}
 const f=fixture(count);mutateResponse(f,'clock',r=>r.result=Math.floor((p.startsAt-30000)/1000));
 if(mode==='warning'){
  mutateAccount(f,0,x=>{x.writeUInt32LE(1,0);bytes(2).copy(x,4);});
  mutateAccount(f,1,x=>{x.writeBigUInt64LE(600000n,64);});mutateResponse(f,'selection',r=>r.result.value[0].amount='600000');
 }
 if(mode==='wrong-mint')mutateAccount(f,1,x=>{bytes(9).copy(x,0);});
 if(mode==='wrong-program')mutateResponse(f,'snapshot',r=>r.result.value[0].owner=MINT);
 if(mode==='malformed')mutateResponse(f,'snapshot',r=>r.result.value[0].data[0]='!not-base64!');
 if(mode==='incomplete')mutateResponse(f,'snapshot',r=>r.result.value[2]=null);
 if(mode==='wrong-response-id')mutateResponse(f,'clock',r=>r.id=260004);
 if(mode==='wrong-slot')mutateResponse(f,'snapshot',r=>r.result.context.slot=99);
 if(mode==='null-blocktime')mutateResponse(f,'clock',r=>r.result=null);
 if(mode==='stale-blocktime')mutateResponse(f,'clock',r=>r.result=Math.floor((p.startsAt-121000)/1000));
 if(mode==='unsupported')token2022(f,[[65000,Buffer.from([1])]]);
 const storage=pgScenario?{kind:'actual-postgres-18',ledger:pgScenario.ledger(),read:pgScenario.read,cleanup:()=>pgScenario.close?.()??Promise.resolve(),pgScenario}:{...await setup(p),kind:'historical-local-files'};
 const events=[],receipts=[];let time=p.startsAt,rollback=null,calls=0,intakes=0,analyses=0;const clock=()=>pgScenario?(rollback??Date.now()):time;
 const ports={
  ledger:{...storage.ledger,
   reserve:async(...args)=>{events.push('reserve:start');const r=await storage.ledger.reserve(...args);events.push('reserve:'+r.status);return r;},
   finish:async(...args)=>{events.push('finish:start');const r=await storage.ledger.finish(...args);events.push('finish:'+r.status);return r;},
   stop:async(...args)=>{events.push('stop:start');const r=await storage.ledger.stop(...args);events.push('stop:'+r.status);return r;}
  },
  authorize:async()=>mode!=='owner-denied',identity:()=>mode!=='identity-denied',clock,wait:async ms=>{if(pgScenario)await new Promise(resolve=>setTimeout(resolve,ms));else time+=ms;events.push('wait:'+ms);},
  intake:raw=>{intakes++;events.push('A:intake');const input=c.nativeIntake(mode==='rights-missing'?{...raw,rightsReviewSha256:null}:raw);if(mode==='copied-capability'&&input)return {...input,holderEvidence:JSON.parse(JSON.stringify(input.holderEvidence))};if(mode==='post-qualification-corruption'&&input)raw.snapshot.responseBytes[0]^=1;return input;},
  analyze:input=>{analyses++;events.push('A:analyze');return a.analyzeNativeEvidence(input);},
  wire:async(body,method)=>{
   const index=calls++;events.push('wire:'+method);
   if(index>=3||method!==METHODS[index]||JSON.parse(body).method!==method)throw Error('SYNTHETIC_UNEXPECTED_ATTEMPT');
   const reserved=await storage.ledger.inspect();if(reserved.stopped||reserved.attempts!==index+1||reserved.lease?.fence!==index+1)throw Error('SYNTHETIC_UNRESERVED_WIRE');
   if(mode==='partial'&&index===1)throw Error('SYNTHETIC_PARTIAL_READ');
   const start=clock();if(!pgScenario)time+=100;const received=clock();
   const capture={endpointHost:mode==='mixed-host'&&index===1?'api.mainnet.solana.com':'mainnet.helius-rpc.com',requestBody:body,responseBytes:Buffer.from([f.selection,f.snapshot,f.clock][index].responseBytes),httpStatus:200,requestStartedAt:new Date(start).toISOString(),receivedAt:new Date(received).toISOString()};
   if(mode==='wrong-request'&&index===1){const q=JSON.parse(body);q.params[0].reverse();capture.requestBody=JSON.stringify(q);}
   receipts.push({method,host:capture.endpointHost,requestSha256:hash(body),responseSha256:hash(capture.responseBytes),requestStartedAt:capture.requestStartedAt,receivedAt:capture.receivedAt});
   if(mode==='clock-rollback'&&index===0){if(pgScenario)rollback=p.startsAt-1;else time=p.startsAt-1;}
   return capture;
  }
 };
 return {p,ports,events,receipts,storage,get time(){return clock();},set time(value){if(pgScenario)rollback=value;else time=value;},get calls(){return calls;},get intakes(){return intakes;},get analyses(){return analyses;},run:req=>acquire(p,req??request(p),ports),state:()=>pgScenario?pgScenario.read():storage.ledger.inspect(),close:()=>storage.cleanup()};
}
