import 'server-only';
import {request as httpsRequest,type RequestOptions} from 'node:https';
import type {ClientRequest,IncomingMessage} from 'node:http';
import {randomUUID} from 'node:crypto';
import {freeze,isExactPublicKey,strictJson} from '../../onchain-mint/validation';
import {data,time} from '../../v4-helius-pilot/server/profile';
import {SourcePolicyAuthority} from '../../v4-owner-preview/source-policy';
import {createSourceLedger} from '../../v4-owner-preview/source-ledger';
import {createOwnerIssuer} from '../../v4-owner-preview/auth';
import {createSourceOwner} from '../../v4-owner-preview/source-owner';
import {decodeMintBytes,strictBase64} from '../onchain/bytes';
import type {Command,Reply,VerifiedSourceGrant} from '../../v4-ca-intelligence/admission';
import type {Config,Source,Result,Reason,NativeMintObservation,ObservationView,Provenance} from './contract';
import {qualify,digest} from './qualification';

export type LocalWire=(options:RequestOptions,cb:(message:IncomingMessage)=>void)=>ClientRequest;
const observations=new WeakMap<NativeMintObservation,{view:ObservationView;valid:()=>boolean}>();
class Rejected extends Error{constructor(readonly reason:Reason){super(reason);}}
function need(v:unknown,r:Reason='invalid_response'):asserts v{if(!v)throw new Rejected(r);}
const gray=(reason:Reason):Result=>freeze({state:reason==='sources_off'?'sources_off':'gray',reason,observation:null});
export const offSource=():Source=>Object.freeze({inspect:async()=>gray('sources_off'),stop:async()=>gray('sources_off')});
/** Reads admitted producer capability only. Caller objects/copies/hashes never create observations. */
export function inspectNativeObservation(value:unknown):ObservationView|null{
 try{const bound=value&&typeof value==='object'?observations.get(value as NativeMintObservation):null;return bound?.valid()?bound.view:null;}catch{return null;}
}
/** C's production display gate: local TLS fixtures/replays/caller JSON can NEVER return a view here. */
export function verifiedNativeMintObservation(value:unknown):ObservationView|null{
 const view=inspectNativeObservation(value);return view?.source.acquisition==='native_https'&&view.source.transportAuthentication==='fixed_host_tls_validated'&&view.source.admission==='owner_verified_global_reserve_and_finish'?view:null;
}
function decode(bytes:Buffer,mint:string,id:string){
 const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes),root=strictJson(text);
 need(data(root,['jsonrpc','id','result'])&&root.jsonrpc==='2.0'&&root.id===id
  &&data(root.result,['context','value'])&&data(root.result.context,['slot'],['apiVersion'])
  &&Number.isSafeInteger(root.result.context.slot)&&Number(root.result.context.slot)>0);
 if(root.result.context.apiVersion!==undefined)need(typeof root.result.context.apiVersion==='string'&&/^[0-9A-Za-z.+-]{1,32}$/.test(root.result.context.apiVersion));
 const v=root.result.value;
 need(data(v,['data','owner','executable','lamports','rentEpoch'],['space'])&&v.executable===false&&typeof v.owner==='string'
  &&typeof v.lamports==='number'&&Number.isInteger(v.lamports)&&v.lamports>=0
  &&typeof v.rentEpoch==='number'&&Number.isInteger(v.rentEpoch)&&v.rentEpoch>=0
  &&Array.isArray(v.data)&&v.data.length===2&&v.data[1]==='base64');
 const account=strictBase64(v.data[0]);need(v.space===undefined||v.space===account.length);
 const controls=decodeMintBytes(account,v.owner);
 return {mint,controls,contextSlot:String(root.result.context.slot),accountDataSha256:digest(account),accountBytes:account.length,text};
}
/** No URL/Fetch/receipt/body/hash argument from a caller. Fixed HTTPS host, SNI and payload below.
 * Never exported; only the admitted producer can invoke it after irreversible reserve ACK.
 */
async function originalBytes(wire:LocalWire,key:string,mint:string,id:string,signal:AbortSignal,timeoutMs:number){
 const payload=JSON.stringify({jsonrpc:'2.0',id,method:'getAccountInfo',params:[mint,{encoding:'base64',commitment:'finalized'}]});
 const message=await new Promise<IncomingMessage>((resolve,reject)=>{
  let req:ClientRequest|undefined;
  const fail=()=>{req?.destroy();reject(new Rejected(signal.aborted?'timeout':'unavailable'));};
  try{
   req=wire({protocol:'https:',hostname:'mainnet.helius-rpc.com',servername:'mainnet.helius-rpc.com',port:443,
    path:'/?api-key='+key,method:'POST',agent:false,rejectUnauthorized:true,minVersion:'TLSv1.2',
    maxHeaderSize:16384,insecureHTTPParser:false,timeout:timeoutMs,signal,
    headers:{accept:'application/json','content-type':'application/json','accept-encoding':'identity','content-length':Buffer.byteLength(payload)}},resolve);
   req.once('error',fail);req.once('timeout',fail);req.end(payload);
  }catch{fail();}
 });
 try{
  if(message.statusCode!==200)throw new Rejected(message.statusCode===429?'rate_limited':'unavailable');
  const headers=new Headers();let headerBytes=0;
  for(let i=0;i<message.rawHeaders.length;i+=2){headerBytes+=Buffer.byteLength(message.rawHeaders[i]+message.rawHeaders[i+1])+4;need(headerBytes<=16384);headers.append(message.rawHeaders[i],message.rawHeaders[i+1]);}
  need(/^application\/json(?:;\s*charset=utf-8)?$/i.test(headers.get('content-type')??''));
  need(!headers.has('content-encoding')||headers.get('content-encoding')==='identity');
  const length=headers.get('content-length'),age=headers.get('age');
  need(length===null||/^\d{1,8}$/.test(length)&&Number(length)<=65536);
  need(age===null||/^\d{1,6}$/.test(age)&&Number(age)<=60);
  const httpDate=headers.get('date');need(httpDate&&httpDate.length<=64);
  const date=Date.parse(httpDate!);need(Number.isFinite(date)&&new Date(date).toUTCString()===httpDate);
  const chunks:Buffer[]=[];let size=0,count=0;
  for await(const chunk of message){need(!signal.aborted,'timeout');need(Buffer.isBuffer(chunk)||chunk instanceof Uint8Array);size+=chunk.byteLength;need(size<=65536&&++count<=512);chunks.push(Buffer.from(chunk));}
  need(!signal.aborted,'timeout');if(length!==null)need(size===Number(length));
  const bytes=Buffer.concat(chunks,size);
  // Hash EXACT bounded wire bytes before JSON parsing/normalization or account decoding.
  const responseSha256=digest(bytes);
  return {bytes,responseSha256,httpDate:httpDate!,requestSha256:digest(Buffer.from(payload,'utf8'))};
 }finally{message.destroy();}
}
/** Canonicalize ONLY after signed deployment qualification; origin comes from that release, never a forwarding header.
 * A real uncached owner session is still required. HTTP proxy metadata is not owner authentication.
 */
function canonicalRequest(raw:Request,origin:string):Request|null{
 try{const u=new URL(raw.url),host=new URL(origin).host;
  if(raw.method!=='POST'||u.pathname!=='/api/v4/ca-intelligence'||u.search||u.hash||u.username||u.password
   ||raw.headers.get('host')!==host||raw.headers.has('x-forwarded-host')&&raw.headers.get('x-forwarded-host')!==host
   ||raw.headers.has('x-forwarded-proto')&&raw.headers.get('x-forwarded-proto')!=='https'
   ||!(u.protocol==='https:'&&u.origin===origin||u.protocol==='http:'&&raw.headers.get('x-forwarded-proto')==='https')
   ||raw.headers.get('origin')!==origin||raw.headers.get('sec-fetch-site')!=='same-origin'||raw.headers.get('x-unfarmd-ca-intent')!=='inspect'
   ||raw.signal.aborted)return null;
  return new Request(origin+u.pathname,{method:'POST',headers:new Headers(raw.headers),signal:raw.signal,...(raw.body?{body:raw.body,duplex:'half'}:{})});
 }catch{return null;}
}
function build(config:Config,fixtureWire?:LocalWire,fixtureClock?:{now:()=>number;monotonic:()=>number}):Source{
 const fixture=!!fixtureWire,q=qualify(config,fixture);if(!q||fixture&&process.env.NODE_ENV!=='test')return offSource();
 // Immutable primitive/function references before any await; never freeze/modify peers' caller object.
 config=Object.freeze({...config,review:q.review});
 const {policy:p,hash}=q.approved;
 // Construct the ORIGINAL real issuer here: no caller-supplied session/auth port can claim an owner.
 const issuer=createOwnerIssuer({authority:config.ownerAuthority,release:config.release,pool:config.issuerPool,tlsHost:config.tlsHost,secret:config.authSecret});
 const durable=createSourceLedger(config),owner=createSourceOwner(issuer,config.authority,config.approval,durable);
 const now=fixtureClock?.now??Date.now,mono=fixtureClock?.monotonic??(()=>performance.now());
 const wire=fixtureWire??httpsRequest;
 let terminal=false,active=false,known=false,charged=false,lastWall=0,lastMono=0;
 const published=new Set<NativeMintObservation>();
 let inFlight:AbortController|undefined,stopping:Promise<'confirmed'|'unknown'>|undefined;
 const halt=()=>{
  terminal=true;inFlight?.abort();for(const cap of published)observations.delete(cap);published.clear();
  stopping??=Promise.resolve().then(async()=>{const r=await durable.ledger.transact({kind:'stop',policyHash:hash,reason:'uncertain',now:Date.now()});return r.kind==='stopped'&&r.policyHash===hash?'confirmed' as const:'unknown' as const;}).catch(()=>'unknown' as const);
  return stopping;
 };
 const still=()=>!terminal&&!!qualify(config,fixture)&&(!fixture||process.env.NODE_ENV==='test');
 const inspect:Source['inspect']=async(request,mint)=>{
  if(!still())return gray(terminal?'stopped':'admission_denied');
  if(!isExactPublicKey(mint)||!q.review.mints.includes(mint)||active)return gray('admission_denied');
  const canonical=canonicalRequest(request,p.origin);if(!canonical)return gray('admission_denied');request=canonical;
  active=true;known=false;charged=false;
  const abort=new AbortController();inFlight=abort;let timeout:ReturnType<typeof setTimeout>|undefined;
  let transientBytes:Buffer|undefined;
  let sourceTimer:ReturnType<typeof setTimeout>|undefined,grant:VerifiedSourceGrant|null=null,session='';
  let startMono:number|undefined;
  const clock=()=>{const w=now(),m=mono();need(time(w)&&Number.isFinite(m)&&m>=0&&w>=lastWall&&m>=lastMono
   &&(!lastWall||Math.abs(w-lastWall-(m-lastMono))<=1000),'uncertain');lastWall=w;lastMono=m;startMono??=m;
   need(still()&&!abort.signal.aborted&&m-startMono<=10000,'uncertain');need(w>=p.startsAt&&w<p.expiresAt,'admission_denied');return w;};
  const cancelled=()=>{abort.abort();if(known||charged)void halt();};request.signal.addEventListener('abort',cancelled,{once:true});
  const auth=async()=>{
   const n=grant?await owner.reverify(request,grant):await owner.verify(request,mint,hash);clock();
   need(n,'admission_denied');const c=owner.inspect(n);need(c&&c.ownerSubject===p.ownerSubject&&c.policyHash===hash&&c.mint===mint
    &&c.expiresAt>clock()&&c.expiresAt<=p.expiresAt&&(!session||session===c.sessionId),'admission_denied');
   session=c.sessionId;grant=n;known=true;
  };
  const call=async(c:Command)=>{let r:Reply;try{r=await durable.ledger.transact(c);}catch{throw new Rejected('uncertain');}clock();
   need(data(r,['kind'],['reason','policyHash','mint','lookupId','lookupsReserved','committedAt','provider','leaseId','attemptsReserved','creditsReserved','expiresAt','nextAllowedAt','responseSha256','receivedAt']),'uncertain');
   if(r.kind==='denied')throw new Rejected(r.reason==='stopped'?'stopped':r.reason==='rate_limited'?'rate_limited':r.reason==='exhausted'?'exhausted':'admission_denied');
   need('policyHash'in r&&r.policyHash===hash,'uncertain');return r as Reply;
  };
  const work=async():Promise<Result>=>{
   clock();need(!request.signal.aborted,'admission_denied');
   const u=new URL(request.url),host=new URL(p.origin).host;
   // Canonical origin is bound above to the signed deployment, never to the internal proxy URL.
   need(request.method==='POST'&&u.origin===p.origin&&u.pathname==='/api/v4/ca-intelligence'&&!u.search&&!u.hash&&!u.username&&!u.password,'admission_denied');
   need(request.headers.get('host')===host&&(!request.headers.has('x-forwarded-host')||request.headers.get('x-forwarded-host')===host)
    &&(!request.headers.has('x-forwarded-proto')||request.headers.get('x-forwarded-proto')==='https')
    &&request.headers.get('origin')===p.origin&&request.headers.get('sec-fetch-site')==='same-origin'&&request.headers.get('x-unfarmd-ca-intent')==='inspect'
    &&request.headers.get('content-type')==='application/json'
    &&!['purpose','sec-purpose','authorization','x-api-key','helius-api-key','x-rpc-url','content-encoding'].some(h=>request.headers.has(h)),'admission_denied');
   let h=0;request.headers.forEach((v,k)=>h+=Buffer.byteLength(k+v)+4);need(h<=16384,'admission_denied');
   const declared=request.headers.get('content-length');need(declared===null||/^\d{1,4}$/.test(declared)&&Number(declared)<=256,'admission_denied');
   await auth();
   need(request.body,'admission_denied');const reader=request.body!.getReader(),parts:Buffer[]=[];let n=0,chunks=0;
   const cancelReader=()=>{void reader.cancel().catch(()=>{});};abort.signal.addEventListener('abort',cancelReader,{once:true});
   try{for(;;){const r=await reader.read();clock();if(r.done)break;n+=r.value.byteLength;need(n<=256&&++chunks<=32,'admission_denied');parts.push(Buffer.from(r.value));}}
   finally{abort.signal.removeEventListener('abort',cancelReader);void reader.cancel().catch(()=>{});reader.releaseLock();}
   const body=strictJson(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(parts,n)));
   need(data(body,['action','mint'])&&body.action==='inspect'&&body.mint===mint,'admission_denied');
   const a=await call({kind:'admit',policyHash:hash,ownerSubject:p.ownerSubject,mint,now:clock()});
   need(a.kind==='admitted'&&data(a,['kind','policyHash','mint','lookupId','lookupsReserved','committedAt'])&&a.mint===mint
    &&typeof a.lookupId==='string'&&/^[a-f0-9-]{36}$/.test(a.lookupId)&&Number.isSafeInteger(a.lookupsReserved)&&a.lookupsReserved>=1&&a.lookupsReserved<=3
    &&time(a.committedAt)&&a.committedAt<=clock(),'uncertain');
   const lookupId=a.lookupId;await auth();const reservedAt=clock();
   const r=await call({kind:'reserve',policyHash:hash,lookupId,mint,provider:'helius',debit:p.debit.helius,now:reservedAt});
   need(r.kind==='reserved'&&data(r,['kind','policyHash','lookupId','mint','provider','leaseId','attemptsReserved','creditsReserved','expiresAt','nextAllowedAt','committedAt'])
    &&r.lookupId===lookupId&&r.mint===mint&&r.provider==='helius'&&typeof r.leaseId==='string'&&/^[a-f0-9-]{36}$/.test(r.leaseId)
    &&Number.isSafeInteger(r.attemptsReserved)&&r.attemptsReserved>=1&&r.attemptsReserved<=3&&r.creditsReserved===r.attemptsReserved*p.debit.helius&&r.creditsReserved<=p.maxCredits
    &&r.committedAt===reservedAt&&r.expiresAt===Math.min(reservedAt+5000,p.expiresAt)&&r.nextAllowedAt===reservedAt+2500,'uncertain');
   charged=true;await auth();
   // First and only credential read occurs after owner + rights + durable reserve ACK.
   const key=config.readKey();need(typeof key==='string'&&/^[A-Za-z0-9_-]{16,128}$/.test(key)&&digest(key)===q.review.keySha256,'admission_denied');
   const started=clock();need(started<r.expiresAt,'timeout');const id=randomUUID();
   sourceTimer=setTimeout(()=>abort.abort(),r.expiresAt-started);
   const packet=await originalBytes(wire,key,mint,id,abort.signal,r.expiresAt-started),received=clock();
   need(received<r.expiresAt,'timeout');const date=Date.parse(packet.httpDate);
   need(date<=received+1000&&received-date<=60000,'invalid_response');
   transientBytes=packet.bytes;const decoded=decode(packet.bytes,mint,id);clock();
   need(!decoded.text.includes(key)&&!JSON.stringify(strictJson(decoded.text)).includes(key),'invalid_response');
   decoded.text='';packet.bytes.fill(0);
   await auth();const finished=clock();need(finished<r.expiresAt,'timeout');
   const f=await call({kind:'finish',policyHash:hash,lookupId,leaseId:r.leaseId,mint,provider:'helius',responseSha256:packet.responseSha256,receivedAt:received,now:finished});
   need(f.kind==='published'&&data(f,['kind','policyHash','lookupId','leaseId','provider','responseSha256','receivedAt','committedAt'])
    &&f.lookupId===lookupId&&f.leaseId===r.leaseId&&f.provider==='helius'&&f.responseSha256===packet.responseSha256&&f.receivedAt===received&&f.committedAt===finished,'uncertain');
   await auth();const evaluated=clock();need(evaluated<r.expiresAt,'timeout');
   const source:Provenance={version:'oracle-native-mint/1',acquisition:fixture?'synthetic_fixture':'native_https',
    transportAuthentication:fixture?'local_fixture_only':'fixed_host_tls_validated',host:'mainnet.helius-rpc.com',network:'solana-mainnet',account:mint,
    method:'getAccountInfo',encoding:'base64',commitment:'requested_finalized',contextSlot:decoded.contextSlot,slotTime:null,
    requestId:id,requestSha256:packet.requestSha256,responseSha256:packet.responseSha256,accountDataSha256:decoded.accountDataSha256,
    responseBytes:packet.bytes.length,accountBytes:decoded.accountBytes,requestStartedAt:new Date(started).toISOString(),receivedAt:new Date(received).toISOString(),evaluatedAt:new Date(evaluated).toISOString(),httpDate:packet.httpDate,
    policyHash:hash,reviewHash:digest(JSON.stringify(q.review)),lookupId,leaseId:r.leaseId,
    finalityAssurance:'rpc_reported_under_finalized_request_not_independent_replay',identityBinding:'server_request_account_not_echoed_by_response',
    admission:'owner_verified_global_reserve_and_finish',decoder:'oracle-onchain/1',maxResponseBytes:65536,maxAccountBytes:8192,maxTlvs:32};
   const observation=Object.freeze({}) as NativeMintObservation;
   published.add(observation);const expiry=setTimeout(()=>{observations.delete(observation);published.delete(observation);},Math.max(1,received+60000-Date.now()));expiry.unref();
   observations.set(observation,{view:freeze({controls:decoded.controls,source}),valid:()=>still()&&Date.now()>=received&&Date.now()-received<=60000});
   return freeze({state:fixture?'synthetic_fixture':'observed',reason:null,observation});
  };
  try{return await Promise.race([work(),new Promise<Result>(resolve=>{timeout=setTimeout(()=>{terminal=true;abort.abort();if(known||charged)void halt();resolve(gray('timeout'));},10000);})]);}
  catch(e){if(charged||known&&!(e instanceof Rejected&&['admission_denied','rate_limited','exhausted','stopped'].includes(e.reason)))void halt();return gray(e instanceof Rejected?e.reason:'invalid_response');}
  finally{transientBytes?.fill(0);clearTimeout(timeout);clearTimeout(sourceTimer);request.signal.removeEventListener('abort',cancelled);abort.abort();active=false;if(inFlight===abort)inFlight=undefined;}
 };
 const stop:Source['stop']=async(request,mint)=>{
  try{if(!isExactPublicKey(mint)||request.headers.get('x-unfarmd-native-intent')!=='stop'||request.signal.aborted)return gray('admission_denied');
   const canonical=canonicalRequest(request,p.origin);if(!canonical)return gray('admission_denied');request=canonical;
   const u=new URL(request.url),host=new URL(p.origin).host;
   if(u.origin!==p.origin||u.pathname!=='/api/v4/ca-intelligence'||u.search||u.hash||request.headers.get('host')!==host
    ||request.headers.has('x-forwarded-host')&&request.headers.get('x-forwarded-host')!==host||request.headers.has('x-forwarded-proto')&&request.headers.get('x-forwarded-proto')!=='https')return gray('admission_denied');
   // STOP must remain available after an uncertain source ACK or expired source window.
   // Verify the ORIGINAL issuer directly; SourceOwner.snapshot intentionally denies a stopped ledger.
   const approved=SourcePolicyAuthority.prototype.inspect.call(config.authority,config.approval,true),session=await issuer.session(request);
   if(!approved||approved.hash!==hash||!session||session.ownerSubject!==p.ownerSubject||session.expiresAt<=Date.now())return gray('admission_denied');
   return gray(await halt()==='confirmed'?'stopped':'stop_uncertain');
  }catch{return gray('stop_uncertain');}
 };
 return Object.freeze({inspect,stop});
}
/** Real native producer, UNMOUNTED. No config/grant => OFF; no arbitrary wire/clock/source/URL ports. */
export function prepareNativeMintSource(config?:Config):Source{try{return config?build(config):offSource();}catch{return offSource();}}
/** LOCAL test seam. Never native; no runtime import from product. */
export function localNativeMintSource(config:Config,wire:LocalWire,clock?:{now:()=>number;monotonic:()=>number}):Source{
 if(process.env.NODE_ENV!=='test')throw Error('local_fixture_only');return build(config,wire,clock);
}
