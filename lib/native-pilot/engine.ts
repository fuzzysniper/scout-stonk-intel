import 'server-only';
import {freeze} from '../onchain-mint/validation';
import {largestRequest} from '../v4-oracle/holders/requests';
import {hash,need,LIMITS,METHODS,type Policy,type Method} from './plan';
import {nextRequest} from './recipe';
import type {Ledger} from './ledger';
import type {NativeEvidenceInputV1,NativeEvidenceV1} from './evidence-contract';
export type Capture=Readonly<{endpointHost:'mainnet.helius-rpc.com';requestBody:string;responseBytes:Uint8Array;httpStatus:200;requestStartedAt:string;receivedAt:string}>;
export type RawBatch=Readonly<{kind:'synthetic_fixture'|'recorded_response';mint:string;evaluatedAt:string;selection:Capture;snapshot:Capture;clock:Capture;rightsReviewSha256:string}>;
export type Intake=(raw:RawBatch)=>NativeEvidenceInputV1|null;
export type Analyze=(input:NativeEvidenceInputV1)=>NativeEvidenceV1;
export type Ports=Readonly<{ledger:Ledger;authorize:(request:Request)=>Promise<boolean>;identity:()=>boolean;wire:(body:string,method:Method)=>Promise<Capture>;clock:()=>number;wait:(ms:number)=>Promise<void>;intake:Intake;analyze:Analyze}>;
async function bodyText(request:Request){
 need(request.body);const reader=request.body.getReader(),chunks:Uint8Array[]=[];let bytes=0,timer:NodeJS.Timeout|undefined;
 try{return await Promise.race([(async()=>{while(true){const r=await reader.read();if(r.done)break;need(!request.signal.aborted);bytes+=r.value.byteLength;need(bytes<=256);chunks.push(r.value);}return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));})(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('native_pilot_held')),1000);timer.unref();})]);}
 finally{clearTimeout(timer);void reader.cancel().catch(()=>{});}
}
/** Shared executable state machine. A caller-injected wire is ALWAYS a synthetic candidate.
 * Production uses only the private fixed-host assembly, which is hard OFF in this revision. */
export async function acquire(p:Policy,request:Request,ports:Ports,kind:RawBatch['kind']='synthetic_fixture'){
 let at=ports.clock(),body=largestRequest(p.mint),selected:readonly string[]|undefined,selectionSlot:number|undefined;
 const captures:Capture[]=[],owned:Uint8Array[]=[];
 const permitted=async()=>ports.identity()&&await ports.authorize(request)&&ports.identity()&&!request.signal.aborted;
 try{
  need(request.headers.get('x-unfarmd-native-intent')==='inspect'&&await permitted());
  const text=await bodyText(request);need(text===JSON.stringify({mint:p.mint}));
  need((await ports.ledger.inspect()).attempts===0);
  for(let i=0;i<3;i++){
   if(i)await ports.wait(LIMITS.spacingMs);
   need(await permitted());at=ports.clock();const start=at;
   const reserved=await ports.ledger.reserve(METHODS[i],hash(body),at);
   need(reserved.status==='committed'&&!reserved.state.stopped&&reserved.state.lease?.fence===i+1);
   // Reserve + independent anchor must ACK before key read/TLS dispatch; no retry on uncertainty.
   need(await permitted());const before=await ports.ledger.inspect();
   need(!before.stopped&&before.lease?.fence===i+1&&before.lease.requestHash===hash(body));
   const capture=await ports.wire(body,METHODS[i]),bytes=Buffer.from(capture.responseBytes);owned.push(capture.responseBytes,bytes);
   at=ports.clock();need(at>=start&&at-start<=LIMITS.timeoutMs&&capture.endpointHost==='mainnet.helius-rpc.com'&&capture.httpStatus===200&&capture.requestBody===body&&bytes.length>0&&bytes.length<=LIMITS.responseBytes
    &&Date.parse(capture.requestStartedAt)>=start&&Date.parse(capture.requestStartedAt)<=Date.parse(capture.receivedAt)&&Date.parse(capture.receivedAt)<=at&&Date.parse(capture.receivedAt)-Date.parse(capture.requestStartedAt)<=LIMITS.timeoutMs);
   const finished=await ports.ledger.finish(i+1,hash(bytes),at);need(finished.status==='committed'&&!finished.state.stopped&&finished.state.completed===i+1&&await permitted());
   captures.push({...capture,responseBytes:bytes});
   if(i<2){const next=nextRequest(bytes,i as 0|1,p.mint,selected,selectionSlot);body=next.body;if(i===0){selected=next.addresses;selectionSlot=next.slot;}}
  }
  // Full byte, mint, program, slot, blockTime and unsupported-extension rules are A's gate.
  const raw:RawBatch={kind,mint:p.mint,evaluatedAt:new Date(at).toISOString(),selection:captures[0],snapshot:captures[1],clock:captures[2],rightsReviewSha256:p.rightsReviewSha256};
  const input=ports.intake(raw);need(input&&input.mint===p.mint);const evidence=ports.analyze(input);
  need(evidence.version==='native-evidence/1'&&evidence.mint===p.mint&&evidence.state==='candidate'&&evidence.origin.status==='candidate_only'&&evidence.origin.providerAuthenticated===false);
  // The typed analytics port does NOT attest origin. Bind every cited source to this exact batch.
  need(Array.isArray(evidence.references)&&evidence.references.length>=3&&evidence.references.length<=128);
  for(const ref of evidence.references){
   const c=captures.find(c=>hash(c.responseBytes)===ref.responseSha256&&hash(c.requestBody)===ref.requestSha256);
   need(c&&ref.providerHost===c.endpointHost&&ref.method===JSON.parse(c.requestBody).method&&ref.requestStartedAt===c.requestStartedAt&&ref.receivedAt===c.receivedAt);
  }
  need(METHODS.every(method=>evidence.references.some(ref=>ref.method===method)));
  need(await permitted()&&!(await ports.ledger.inspect()).stopped);
  return freeze({status:'candidate' as const,activate:false as const,providerAuthenticated:false as const,evidence});
 }catch{
  // STOP ACK is not provider success. Failed STOP is uncertainty/HOLD, never refund/retry.
  try{await ports.ledger.stop(ports.clock());}catch{/* Existing lock/history preserved. */}
  return Object.freeze({status:'held' as const,activate:false as const,providerAuthenticated:false as const});
 }finally{for(const bytes of owned)bytes.fill(0);}
}
