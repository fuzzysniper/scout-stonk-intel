import 'server-only';
import type {Pool} from 'pg';
import {createPublicKey,type KeyObject} from 'node:crypto';
import {createOwnerIssuer} from './auth';
import {OwnerReleaseAuthority,type OwnerRelease} from './release';
import {createVerifiedOwnerBoundary} from '../v4-owner-ledger/auth';
import {OwnerAuthority} from '../v4-private-journal/auth';
import {PostgresJournalRepository} from '../v4-private-journal/repository';
import {PostgresThesisRate} from '../v4-thesis-api/rate';
import {createOwnerThesisBridge} from '../v4-owner-thesis/bridge';
import {createThesisHandler} from '../v4-thesis-api/handler';
import type {OwnerKeys} from '../v4-private-journal/crypto';
import {createCaLookup,type CaLookup} from '../v4-ca-intelligence';
import {isExactPublicKey} from '../onchain-mint/validation';
import {parsePacket} from '../trader-pulse/validation';
import {presentIntelligence} from './presentation';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie, Origin','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const error=(code:string,status=503)=>Response.json({error:code},{status,headers});
type Config=Readonly<{authority:OwnerReleaseAuthority;release:OwnerRelease;issuerPool:Pool;readerPool:Pool;journalPool:Pool;ratePool:Pool;tlsHost:string;secret:string;csrfKey:Uint8Array;delegationKey:KeyObject;keys:OwnerKeys;localSource?:CaLookup}>;
/** Complete admitted runtime; no secret/env loader, fake sessions, old-pilot expansion or source activation. */
export function createOwnerPreview(config:Config){
 const admitted=()=>config.authority.inspect(config.release),r=admitted();if(!r)throw Error('owner_preview_not_admitted');
 if(config.localSource&&(r.identity.kind!=='local_fixture'||process.env.NODE_ENV!=='test'))throw Error('fixture_source_forbidden');
 const issuer=createOwnerIssuer({authority:config.authority,release:config.release,pool:config.issuerPool,tlsHost:config.tlsHost,secret:config.secret});
 const boundary=createVerifiedOwnerBoundary({ownerSubject:r.ownerSubject,journalOwnerId:r.journalOwnerId,issuer:r.issuer,audience:r.identity.origin},config.secret,config.readerPool,config.tlsHost);
 // The journal repository and bridge use this SAME cryptographic authority instance.
 const kid='owner-preview-243',delegationIssuer=r.identity.origin+'/journal-delegation';
 const authority=new OwnerAuthority({issuer:delegationIssuer,audience:'unfarmd-private-journal',keys:new Map([[kid,createPublicKey(config.delegationKey)]])});
 const repository=new PostgresJournalRepository(config.journalPool,config.keys,authority),rate=new PostgresThesisRate(config.ratePool,authority),bridge=createOwnerThesisBridge({boundary,authority,delegationIssuer,kid,signingKey:config.delegationKey,csrfKey:config.csrfKey,csrfRate:rate});
 const thesis=createThesisHandler({origin:r.identity.origin,owners:bridge.owners,authority,repository,rate}),source=config.localSource??createCaLookup();
 return Object.freeze({issuer,boundary,repository,bridge,available:()=>!!admitted(),
  async handler(request:Request):Promise<Response>{try{
   const current=admitted();if(!current)return new URL(request.url).pathname.startsWith('/api/v4/theses')?Response.json({error:'storage_off',saved:false},{status:503,headers}):error('private_preview_not_admitted');
   const url=new URL(request.url);if(url.origin!==current.identity.origin)return error('origin_denied',403);
   if(url.pathname.startsWith('/api/v4/owner/'))return issuer.handler(request);
   if(url.pathname==='/api/v4/theses'&&request.method==='GET'&&request.headers.get('x-unfarmd-journal-capability')==='session'){
    const capability=await bridge.issueCsrf(request);return capability?Response.json({kind:'verified_owner',...capability},{headers}):error('owner_session_required',401);
   }
   if(url.pathname==='/api/v4/theses'||url.pathname.startsWith('/api/v4/theses/'))return thesis(request);
   if(url.pathname!=='/api/v4/ca-intelligence')return error('not_found',404);
   if(request.method!=='POST')return error('method_not_allowed',405);
   if(url.search||url.hash||request.headers.get('origin')!==current.identity.origin||request.headers.get('sec-fetch-site')!=='same-origin'||request.headers.get('x-unfarmd-ca-intent')!=='inspect'||['purpose','sec-purpose','content-encoding','x-api-key','x-owner-id'].some(h=>request.headers.has(h)))return error('source_intent_denied',403);
   if(!await issuer.session(request))return error('owner_session_required',401);
   if(request.headers.get('content-type')!=='application/json')return error('json_required',415);
   // Read a bounded CLONE. The exact original Request, method, Origin and body reach A unchanged.
   const clone=request.clone(),reader=clone.body?.getReader();if(!reader)return error('invalid_source_request',400);let size=0,count=0;const parts:Uint8Array[]=[];const deadline=Date.now()+1000;
   try{for(;;){let timer:ReturnType<typeof setTimeout>|undefined;const n=await Promise.race([reader.read(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('source_body_timeout')),Math.max(1,deadline-Date.now()));})]).finally(()=>clearTimeout(timer));if(n.done)break;size+=n.value.byteLength;if(size>256||++count>32||Date.now()>deadline)return error('source_body_limit',413);parts.push(n.value);}}finally{void reader.cancel().catch(()=>{});reader.releaseLock();}
   const body=parsePacket(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(parts)));if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='action,mint'||(body as {action?:unknown}).action!=='inspect'||!isExactPublicKey((body as {mint?:unknown}).mint))return error('invalid_mint_request',400);
   const mint=(body as {mint:string}).mint,result=await source.lookup(request,mint);if(!admitted()||!await issuer.session(request))return error('owner_session_required',401);
   if(result.mint!==mint)return error('source_identity_mismatch');if(current.identity.kind==='private_preview'&&['offline_fixture','offline_replay'].includes(result.state))return error('fixture_source_forbidden');
   return Response.json(presentIntelligence(result),{headers});
  }catch{return error('private_preview_unavailable');}},
 });
}
export type OwnerPreview=ReturnType<typeof createOwnerPreview>;
