import 'server-only';
import { createHash } from 'node:crypto';
import { decodeResponse } from '../onchain-mint/decoder';
import type { MintFactsV1 } from '../onchain-mint/contract';
import { isExactPublicKey,strictJson } from '../onchain-mint/validation';
import { boundedBody } from '../v4-helius-pilot/server/transport';
import { data,time } from '../v4-helius-pilot/server/profile';
import { CA_SOURCE } from './index';
import type { CaLookup,UnknownReason,MarketEvidence } from './contract';
import { emptyMarket,parseJupiterCapture } from './market';
import { assemble,unavailable } from './result';
import { preparePolicy,type DynamicLedger,type SourceAuthorization,type VerifiedSourceGrant,type Command,type Reply } from './admission';
import { isBinding,type BoundWire } from './wire';
function nativeMarket(market:MarketEvidence):MarketEvidence {
 const walk=(x:unknown):unknown=>{if(Array.isArray(x))return x.map(walk);if(x&&typeof x==='object'){const o=Object.fromEntries(Object.entries(x).map(([k,v])=>[k,walk(v)]));if(o.provider==='jupiter_tokens_v2'&&o.captureKind==='recorded_response')o.captureKind='native_https';return Object.freeze(o);}return x;};
 return walk(market) as MarketEvidence;
}
export type Ports=Readonly<{ authorization:SourceAuthorization;ledger:DynamicLedger;keys:(provider:'jupiter'|'helius')=>unknown;now:()=>number;monotonic:()=>number }>;
class Reject extends Error { constructor(readonly reason:UnknownReason){super(reason);} }
function need(x:unknown,reason:UnknownReason='invalid_response'):asserts x {if(!x)throw new Reject(reason);}
/** Code-only dynamic-mint policy. Never touches or widens the reviewed3-mint Helius profile/budget. */
export function prepareLookup(input:unknown,ports:Ports,wire:BoundWire,deadlineMs=10000):CaLookup {
 const prepared=preparePolicy(input);if(!prepared||!isBinding(wire)||!Number.isSafeInteger(deadlineMs)||deadlineMs<1||deadlineMs>10000)return {lookup:async(_r,m)=>unavailable(m,'admission_denied')};
 const {policy:p,hash}=prepared;
 let terminal=false,active=false,highest=0,credits=0,lastWall=0,lastMono=0,stopAttempt:Promise<unknown>|undefined;
 let inFlight:AbortController|undefined;
 const cooldown=new Map<string,number>(),leases=new Set<string>(),lookups=new Set<string>();
 const stop=(now:number)=>{terminal=true;inFlight?.abort();stopAttempt??=Promise.resolve().then(()=>ports.ledger.transact({kind:'stop',policyHash:hash,reason:'uncertain',now})).catch(()=>undefined);};
 return Object.freeze({lookup:async(request,mint)=>{
  if(!isExactPublicKey(mint))return assemble(mint,emptyMarket('not_observed'),null);
  if(wire.kind==='native_https'&&!CA_SOURCE.enabled)return unavailable(mint,'sources_off');
  if(terminal)return unavailable(mint,'stopped');if(active)return unavailable(mint,'admission_denied');active=true;
  const controller=new AbortController();inFlight=controller;let timer:ReturnType<typeof setTimeout>|undefined,grant:VerifiedSourceGrant|null=null,session='';let known=false,charged=false,wall=0,startMono:number|undefined;
  const clock=()=>{const w=ports.now(),m=ports.monotonic();need(time(w)&&Number.isFinite(m)&&m>=0&&w>=lastWall&&m>=lastMono&&(!lastWall||Math.abs(w-lastWall-(m-lastMono))<=1000),'uncertain');lastWall=wall=w;lastMono=m;startMono??=m;need(!terminal&&!controller.signal.aborted&&m-startMono<=deadlineMs,'uncertain');need(w>=p.startsAt&&w<p.expiresAt,'admission_denied');return w;};
  const cancelled=()=>{controller.abort();if(known)stop(wall);};request.signal.addEventListener('abort',cancelled,{once:true});
  const auth=async()=>{const next=grant?await ports.authorization.reverify(request,grant):await ports.authorization.verify(request,mint,hash);clock();need(next,'admission_denied');const c=ports.authorization.inspect(next);need(c&&c.ownerSubject===p.ownerSubject&&c.mint===mint&&c.policyHash===hash&&typeof c.sessionId==='string'&&/^[A-Za-z0-9_-]{16,128}$/.test(c.sessionId)&&c.expiresAt>wall&&c.expiresAt<=p.expiresAt&&(!session||c.sessionId===session),'admission_denied');session=c.sessionId;grant=next;known=true;};
  const call=async(c:Command):Promise<Reply>=>{need(ports.ledger?.scope==='global_atomic_durable_ca_policy_v1','admission_denied');const r=await ports.ledger.transact(c);clock();need(data(r,['kind'],['reason','policyHash','mint','lookupId','lookupsReserved','committedAt','provider','leaseId','attemptsReserved','creditsReserved','expiresAt','nextAllowedAt','responseSha256','receivedAt']),'uncertain');
    if(r.kind==='denied'){need(data(r,['kind','reason'])&&['stopped','exhausted','busy','rate_limited','expired'].includes(r.reason),'uncertain');throw new Reject(r.reason==='stopped'?'stopped':r.reason==='rate_limited'?'rate_limited':'admission_denied');}
    need('policyHash'in r&&r.policyHash===hash,'uncertain');return Object.freeze(structuredClone(r));};
  const work=async()=>{
   clock();need(!request.signal.aborted,'admission_denied');const u=new URL(request.url);
   need(request.method==='POST'&&u.origin===p.origin&&u.pathname==='/api/v4/ca-intelligence'&&!u.search&&!u.hash&&!u.username&&!u.password,'admission_denied');
   need(/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')??''),'admission_denied');
   const requestLength=request.headers.get('content-length');need(requestLength===null||/^\d{1,6}$/.test(requestLength)&&Number(requestLength)<=256,'admission_denied');
   need(['host','x-forwarded-host'].every(h=>!request.headers.has(h)||request.headers.get(h)===u.host)&&(!request.headers.has('x-forwarded-proto')||request.headers.get('x-forwarded-proto')==='https'),'admission_denied');
   need(request.headers.get('origin')===p.origin&&request.headers.get('sec-fetch-site')==='same-origin'&&request.headers.get('x-unfarmd-ca-intent')==='inspect'&&!['purpose','sec-purpose','x-api-key','helius-api-key','x-rpc-url','content-encoding'].some(h=>request.headers.has(h)),'admission_denied');
   let n=0;request.headers.forEach((v,k)=>n+=Buffer.byteLength(v+k)+4);need(n<=16384,'admission_denied');
   await auth();
   const requestText=await boundedBody(new Response(request.body),controller.signal,256);clock();const body:unknown=strictJson(requestText);need(data(body,['action','mint'])&&body.action==='inspect'&&body.mint===mint,'admission_denied');
   const admitted=await call({kind:'admit',policyHash:hash,ownerSubject:p.ownerSubject,mint,now:clock()});
   need(admitted.kind==='admitted'&&data(admitted,['kind','policyHash','mint','lookupId','lookupsReserved','committedAt'])&&admitted.mint===mint&&typeof admitted.lookupId==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(admitted.lookupId)&&!lookups.has(admitted.lookupId)&&Number.isSafeInteger(admitted.lookupsReserved)&&admitted.lookupsReserved>0&&admitted.lookupsReserved<=p.maxLookups&&time(admitted.committedAt)&&admitted.committedAt<=clock(),'uncertain');lookups.add(admitted.lookupId);
   const lookupId=admitted.lookupId;let market=emptyMarket('not_observed'),onchain:MintFactsV1|null=null;
   for(const provider of p.providers){
    await auth();need(clock()>=(cooldown.get(provider)??0),'rate_limited');
    const keyed=provider==='helius'||p.jupiterAccess==='server_key';const key=keyed?ports.keys(provider):null;
    need(!keyed||typeof key==='string'&&/^[A-Za-z0-9_-]{16,128}$/.test(key),'admission_denied');
    const reserveAt=clock(),r=await call({kind:'reserve',policyHash:hash,lookupId,mint,provider,debit:p.debit[provider],now:reserveAt});
    need(r.kind==='reserved'&&data(r,['kind','policyHash','lookupId','mint','provider','leaseId','attemptsReserved','creditsReserved','expiresAt','nextAllowedAt','committedAt'])&&r.lookupId===lookupId&&r.mint===mint&&r.provider===provider&&typeof r.leaseId==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(r.leaseId)&&!leases.has(r.leaseId)
      &&Number.isSafeInteger(r.attemptsReserved)&&r.attemptsReserved>highest&&r.attemptsReserved<=p.maxAttempts&&r.creditsReserved===credits+p.debit[provider]&&r.creditsReserved<=p.maxCredits&&r.committedAt===reserveAt&&r.expiresAt===Math.min(reserveAt+5000,p.expiresAt)&&time(r.nextAllowedAt)&&r.nextAllowedAt>=reserveAt+2500,'uncertain');
    highest=r.attemptsReserved;credits=r.creditsReserved;charged=true;leases.add(r.leaseId);cooldown.set(provider,r.nextAllowedAt);
    await auth();const started=clock();need(started<r.expiresAt,'uncertain');
    const url=provider==='jupiter'?'https://api.jup.ag/tokens/v2/search?query='+mint:'https://mainnet.helius-rpc.com/?api-key='+key;
    const sourceController=new AbortController(),abortSource=()=>sourceController.abort();controller.signal.addEventListener('abort',abortSource,{once:true});
    const sourceTimer=setTimeout(abortSource,Math.max(1,r.expiresAt-clock()));
    let incoming:Response|undefined;
    try {
    incoming=await wire[provider](url,{method:provider==='jupiter'?'GET':'POST',redirect:'error',credentials:'omit',cache:'no-store',signal:sourceController.signal,
      headers:keyed&&provider==='jupiter'?{'x-api-key':key as string}:{},...(provider==='helius'?{body:JSON.stringify({jsonrpc:'2.0',id:highest,method:'getAccountInfo',params:[mint,{encoding:'jsonParsed',commitment:'finalized'}]})}:{})});
    clock();need(!sourceController.signal.aborted,'uncertain');
      need(clock()<r.expiresAt,'uncertain');if(incoming.status!==200)throw new Reject(incoming.status===429?'rate_limited':'unavailable');
      need(!incoming.redirected&&(!incoming.url||incoming.url===url),'invalid_response');let headers=0;incoming.headers.forEach((v,k)=>headers+=Buffer.byteLength(v+k)+4);need(headers<=16384&&/^application\/json(?:;\s*charset=utf-8)?$/i.test(incoming.headers.get('content-type')??''),'invalid_response');
      const age=incoming.headers.get('age'),length=incoming.headers.get('content-length'),limit=provider==='jupiter'?131072:65536;
      need(length===null||/^\d{1,8}$/.test(length)&&Number(length)<=limit,'invalid_response');need(age===null||/^\d{1,6}$/.test(age)&&Number(age)<=60,'stale');
      const date=incoming.headers.get('date');const text=await boundedBody(incoming,sourceController.signal,limit),received=clock();need(received<r.expiresAt,'uncertain');
      need(!keyed||!text.includes(key as string)&&!JSON.stringify(strictJson(text)).includes(key as string),'invalid_response');
      const digest=createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex');
      if(provider==='jupiter'){
        market=parseJupiterCapture({mint,text,kind:wire.kind==='synthetic_fixture'?'synthetic_fixture':'recorded_response',requestStartedAt:new Date(started).toISOString(),receivedAt:new Date(received).toISOString(),evaluatedAt:new Date(clock()).toISOString(),httpDate:date});
        if(wire.kind==='native_https')market=nativeMarket(market);
        need(market.state==='provider_reported'||market.reason==='not_indexed',market.reason??'invalid_response');
      }else{
        onchain=await decodeResponse({mint,requestId:highest,text,requestStartedAt:new Date(started).toISOString(),responseReceivedAt:new Date(received).toISOString(),evaluatedAt:new Date(clock()).toISOString(),httpDate:date,endpointHost:'mainnet.helius-rpc.com',acquisition:wire.kind==='synthetic_fixture'?'synthetic_fixture':'production_rpc'});
        need(onchain.source!==null||onchain.status==='not_a_supported_mint_account','invalid_response');
        if(onchain.source)need(onchain.source.responseSha256===digest,'uncertain');
      }
      await auth();const doneAt=clock();need(doneAt<r.expiresAt,'uncertain');
      const ack=await call({kind:'finish',policyHash:hash,lookupId,leaseId:r.leaseId,mint,provider,responseSha256:digest,receivedAt:received,now:doneAt});
      need(ack.kind==='published'&&data(ack,['kind','policyHash','lookupId','leaseId','provider','responseSha256','receivedAt','committedAt'])&&ack.lookupId===lookupId&&ack.leaseId===r.leaseId&&ack.provider===provider&&ack.responseSha256===digest&&ack.receivedAt===received&&ack.committedAt===doneAt,'uncertain');
      await auth();
    }finally{clearTimeout(sourceTimer);controller.signal.removeEventListener('abort',abortSource);sourceController.abort();void incoming?.body?.cancel().catch(()=>undefined);}
   }
   clock();return assemble(mint,market,onchain,wire.kind==='synthetic_fixture');
  };
  try{return await Promise.race([work(),new Promise<ReturnType<typeof unavailable>>(resolve=>{timer=setTimeout(()=>{controller.abort();if(known)stop(wall);resolve(unavailable(mint,'uncertain'));},deadlineMs);})]);}
  catch(e){const reason=e instanceof Reject?e.reason:'uncertain';if(charged||!['admission_denied','rate_limited','stopped'].includes(reason))stop(wall);return unavailable(mint,reason);}
  finally{clearTimeout(timer);request.signal.removeEventListener('abort',cancelled);controller.abort();inFlight=undefined;active=false;}
 }});
}
