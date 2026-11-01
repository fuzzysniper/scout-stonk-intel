// Independent semantic validator. No key generation, signing, environment or HTTP.
import {canonical,parse,request,ownerProof,approval,validatorProof,verifyEnvelope,trust,need,hash,ENVELOPE,MODE,activityFingerprint,fields} from './protocol.mjs';
const denied=()=>Object.freeze({status:'denied',activate:false,sourceCalls:false});
async function bounded(fn,ms){let timer;try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,no)=>{timer=setTimeout(()=>no(Error('prototype_timeout')),ms);})]);}finally{clearTimeout(timer);}}
export function independentValidator({context,provider,credential,ledger,clock,timeoutMs=250}){
 const t=trust(context);need(provider.mode===MODE&&credential.mode===MODE&&timeoutMs>0&&timeoutMs<=1000);
 return Object.freeze({async approve({request:rawRequest,ownerStamp,fingerprint}){
  let id=null,prepared=false;
  try{
   // Snapshot caller values once before any async boundary. Only canonical strings proceed.
   const input=parse(canonical({request:rawRequest,ownerStamp,fingerprint})),now=clock();const data=request(input.request,t,now,true);need(input.fingerprint===activityFingerprint(input.request)&&ownerProof(input.ownerStamp,input.request,t));id=data.r.grantId;
   const observed=parse(await bounded(()=>provider.read(input.fingerprint),timeoutMs));
   need(fields(observed,['mode','status','fingerprint','request','ownerStamp'])&&observed.mode===MODE&&observed.status==='PENDING'&&observed.fingerprint===input.fingerprint&&observed.request===input.request&&canonical(observed.ownerStamp)===canonical(input.ownerStamp));
   request(input.request,t,clock(),true);
   need(ledger.prepare(data.r,data.requestHash,clock()).status==='prepared_simulation_only');prepared=true;
   const body=canonical({type:'ACTIVITY_TYPE_APPROVE_ACTIVITY',timestampMs:String(clock()),organizationId:'org_TEST_ONLY',parameters:{fingerprint:input.fingerprint}});
   const stamp=parse(canonical(await bounded(()=>credential.approve(body),timeoutMs)));approval(body,input.request,t,clock());need(validatorProof(stamp,body,t));
   const returned=parse(await bounded(()=>provider.complete(input.fingerprint,body,stamp),timeoutMs));
   request(input.request,t,clock(),true);need(fields(returned,['mode','status','request','ownerStamp','approval','validatorStamp','signature'])&&returned.status==='COMPLETED'&&returned.mode===MODE&&returned.request===input.request&&returned.approval===body&&canonical(returned.ownerStamp)===canonical(input.ownerStamp)&&canonical(returned.validatorStamp)===canonical(stamp));
   const envelope=canonical({version:ENVELOPE,mode:MODE,request:input.request,ownerStamp:input.ownerStamp,approval:body,validatorStamp:stamp,signature:returned.signature});
   need(verifyEnvelope(envelope,t,clock()).status==='verified_simulation_only');
   need(ledger.publish(id,hash(envelope),clock()).status==='published_simulation_only');
   return Object.freeze({status:'approved_simulation_only',activate:false,sourceCalls:false,envelope});
  }catch{if(prepared)ledger.uncertain(id);return denied();}
 }});
}
export function researchConsumer({context,ledger,clock}){
 const t=trust(context);
 return Object.freeze({
  verify(envelope){const v=verifyEnvelope(envelope,t,clock());return ledger.check(v,clock()).status==='current_simulation_only'?v:denied();},
  reserve(envelope,mint,operationId){const v=verifyEnvelope(envelope,t,clock());return ledger.reserve(v,mint,operationId,clock());},
  stop:()=>ledger.stop(),
 });
}
