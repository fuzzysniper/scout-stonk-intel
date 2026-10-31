import 'server-only';
import {createOwnerIssuer} from '../../v4-owner-preview/auth';
import {prepareNativeMintSource,verifiedNativeMintObservation,type Config,type Source} from '../native-mint';
import {qualify} from '../native-mint/qualification';
import {composeOracle} from '../../../app/api/v4/ca-intelligence/compose-oracle';
import {unavailableView} from '../../v4-owner-preview/view-contract';
import {isExactPublicKey} from '../../onchain-mint/validation';
import {parsePacket} from '../../trader-pulse/validation';
import {inspectMountPlan,type MountPlan} from './admission';
import {safeNativeRequest,canonicalRequest,nativeError,nativeHeaders} from './http';
import type {NativeReply,NativeAccountDetails} from '../../../app/lens/native-session';
async function body(request:Request):Promise<{action:'inspect'|'stop';mint:string}>{
 const r=request.body?.getReader();if(!r)throw Error('invalid_body');const parts:Uint8Array[]=[];let size=0,chunks=0;const end=Date.now()+1000;
 try{for(;;){let t:ReturnType<typeof setTimeout>|undefined;const n=await Promise.race([r.read(),new Promise<never>((_,no)=>{t=setTimeout(()=>no(Error('body_limit')),Math.max(1,end-Date.now()));})]).finally(()=>clearTimeout(t));if(n.done)break;size+=n.value.byteLength;if(size>256||++chunks>32||Date.now()>end)throw Error('body_limit');parts.push(n.value);}}
 finally{void r.cancel().catch(()=>{});r.releaseLock();}
 const v=parsePacket(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(parts)));if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!=='action,mint')throw Error('invalid_body');
 const p=v as Record<string,unknown>;if((p.action!=='inspect'&&p.action!=='stop')||!isExactPublicKey(p.mint))throw Error('invalid_body');return p as {action:'inspect'|'stop';mint:string};
}
/** Actual issuer + original producer; no caller authorization/session/ledger/wire callbacks. */
export function createNativeRuntime(plan:MountPlan,config:Config,fixtureSource?:Source){
 const p=inspectMountPlan(plan),fixture=p?.record.identity.kind==='local_fixture';
 if(!p||fixture&&(process.env.NODE_ENV!=='test'||config.tlsHost!=='localhost')||fixtureSource&&!fixture
  ||config.ownerAuthority!==p.ownerAuthority||config.release!==p.release||config.authority!==p.authority||config.approval!==p.approval
  ||!qualify(config,fixture))throw Error('native_mount_not_admitted');
 const issuer=createOwnerIssuer({authority:config.ownerAuthority,release:config.release,pool:config.issuerPool,tlsHost:config.tlsHost,secret:config.authSecret});
 const source=fixtureSource??prepareNativeMintSource(config);
 const current=(stop=false)=>inspectMountPlan(plan,stop);
 const reply=(v:NativeReply)=>Response.json(v,{headers:nativeHeaders});
 return Object.freeze({
  async owner(request:Request):Promise<Response>{const q=current(true);if(!q)return nativeError('native_owner_not_admitted');if(!safeNativeRequest(request,q.record.identity.origin,true))return nativeError('native_request_denied',403);
   const suffix=new URL(request.url).pathname.slice('/api/v4/native-owner'.length);return issuer.handler(canonicalRequest(request,q.record.identity.origin,'/api/v4/owner'+suffix));},
  async inspect(request:Request):Promise<Response>{
   const q=current(true);if(!q)return nativeError('native_not_admitted');if(!safeNativeRequest(request,q.record.identity.origin))return nativeError('native_request_denied',403);
   let input:Awaited<ReturnType<typeof body>>;try{input=await body(request);}catch{return nativeError('invalid_native_request',400);}
   if(!q.review.mints.includes(input.mint))return nativeError('native_mint_not_admitted',403);
   const payload=JSON.stringify(input),headers=new Headers(request.headers);headers.delete('x-unfarmd-native-approval');headers.set('content-length',String(Buffer.byteLength(payload)));
   const canonical=new Request(q.record.identity.origin+'/api/v4/ca-intelligence',{method:'POST',headers,signal:request.signal,body:payload});
   if(input.action==='stop'){
    if(request.headers.get('x-unfarmd-native-intent')!=='stop')return nativeError('native_stop_intent_denied',403);
    const stopped=await source.stop(canonical,input.mint);
    if(stopped.reason==='admission_denied')return nativeError('owner_session_required',401);
    return reply({version:'oracle-native-session/1',outcome:stopped.reason==='stopped'?'stopped':'stop_unknown',view:null,details:null});
   }
   if(request.headers.has('x-unfarmd-native-intent'))return nativeError('native_request_denied',403);
   if(!current())return reply({version:'oracle-native-session/1',outcome:'unavailable',view:null,details:null});
   // Verify the real issuer before invoking the producer. A independently re-verifies
   // throughout admit/reserve/finish and owns all key/wire/budget/STOP operations.
   if(!await issuer.session(canonical))return nativeError('owner_session_required',401);
   const result=await source.inspect(canonical,input.mint),native=verifiedNativeMintObservation(result.observation);
   if(!current()||!await issuer.session(canonical))return nativeError('native_observation_not_admitted');
   const view=composeOracle(unavailableView(input.mint,'No Jupiter request was made by this independently admitted native function.'),new Date().toISOString(),{nativeMint:result.observation});
   let details:NativeAccountDetails|null=null;
   if(native&&native.source.account===input.mint&&view.oracleEvidence.nativeMint.state==='observed')details={mint:input.mint,responseSha256:native.source.responseSha256,accountDataSha256:native.source.accountDataSha256,contextSlot:native.source.contextSlot,rawSupply:native.controls.rawSupply,decimals:native.controls.decimals};
   return reply({version:'oracle-native-session/1',outcome:details?'observed':result.reason==='stopped'?'stopped':result.reason==='stop_uncertain'||result.reason==='uncertain'?'stop_unknown':'unavailable',view:details||result.reason!=='stopped'&&result.reason!=='stop_uncertain'&&result.reason!=='uncertain'?view:null,details});
  }
 });
}
export type NativeRuntime=ReturnType<typeof createNativeRuntime>;
