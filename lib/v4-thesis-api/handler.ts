import 'server-only';
import type {PostgresJournalRepository} from '../v4-private-journal/repository';
import type {OwnerAuthority} from '../v4-private-journal/auth';
import {JournalError} from '../v4-private-journal/contract';
import {fields,identity,uuid,hex} from '../v4-private-journal/validation';
import {parsePacket} from '../trader-pulse/validation';
import type {VerifiedOwnerContextPort,VerifiedOwnerContext} from './owner-context';
import type {ThesisRatePort} from './rate';
import type {ThesisHistory} from './client-contract';
const MAX_BODY=16384;
class ApiError extends Error{constructor(readonly status:number,readonly code:string){super(code);}}
const reject=(status:number,code:string):never=>{throw new ApiError(status,code);};
const headers={'Cache-Control':'private, no-store','Vary':'Cookie, Origin','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
function reply(body:unknown,status=200){return Response.json(body,{status,headers});}
async function bounded<T>(p:Promise<T>,ms=1500):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;return Promise.race([p,new Promise<never>((_,r)=>{timer=setTimeout(()=>r(new ApiError(503,'unavailable')),ms);})]).finally(()=>clearTimeout(timer));}
async function body(request:Request){
 const started=Date.now();let chunks=0;
 if(request.headers.get('content-type')!=='application/json'||request.headers.has('content-encoding'))return reject(415,'json_required');
 const length=request.headers.get('content-length');if(length!==null&&(!/^(0|[1-9]\d*)$/.test(length)||Number(length)>MAX_BODY))return reject(413,'body_limit');
 if(!request.body)return reject(400,'invalid_request');const reader=request.body.getReader(),parts:Uint8Array[]=[];let total=0;
 try{for(;;){if(++chunks>256||Date.now()-started>=1500)return reject(413,'body_limit');const n=await bounded(reader.read(),Math.max(1,1500-(Date.now()-started)));if(n.done)break;total+=n.value.byteLength;if(total>MAX_BODY)return reject(413,'body_limit');parts.push(n.value);}return parsePacket(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)));}
 catch(e){if(e instanceof ApiError)throw e;return reject(400,'invalid_request');}finally{void reader.cancel().catch(()=>{});reader.releaseLock();}
}
/** Injected local/review seam only; installed.ts and hosted routes never import it. */
export function createThesisHandler(config:Readonly<{origin:string;owners:VerifiedOwnerContextPort;authority:OwnerAuthority;repository:PostgresJournalRepository;rate:ThesisRatePort}>){
 const origin=new URL(config.origin);if(origin.origin!==config.origin||origin.username||origin.password||(!['https:'].includes(origin.protocol)&&!(origin.protocol==='http:'&&origin.hostname==='127.0.0.1')))throw Error('invalid_origin');
 return async function(request:Request):Promise<Response>{
  try{
   const url=new URL(request.url),item=/^\/api\/v4\/theses\/([0-9a-f-]+)$/.exec(url.pathname),collection=url.pathname==='/api/v4/theses';
   if(url.origin!==config.origin||url.hash||url.username||url.password||(!collection&&!item))return reject(404,'not_found');
   const write=request.method==='POST'||request.method==='PATCH';if(!((collection&&(request.method==='GET'||request.method==='POST'))||(item&&(request.method==='GET'||request.method==='PATCH'))))return reject(405,'method_not_allowed');
   if(item&&!uuid(item[1]))return reject(400,'invalid_request');
   const site=request.headers.get('sec-fetch-site');if(site!==null&&site!=='same-origin'&&site!=='none')return reject(403,'origin_denied');
   if(request.headers.get('origin')!==null&&request.headers.get('origin')!==config.origin)return reject(403,'origin_denied');
   if(write&&request.headers.get('origin')!==config.origin)return reject(403,'origin_denied');
   if(request.headers.has('x-owner-id')||request.headers.has('x-owner-email')||request.headers.has('x-wallet-address'))return reject(400,'owner_override_denied');
   const context=await bounded(config.owners.resolve(request));
   async function current(c:VerifiedOwnerContext|null){
    if(!c||typeof c.sessionTag!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(c.sessionTag)||!Number.isSafeInteger(c.expiresAtMs)||Date.now()>=c.expiresAtMs||!await bounded(config.owners.isCurrent(c)))return reject(401,'session_required');
    config.authority.ownerId(c.principal,Date.now());return c;
   }
   const owner=await current(context);if(write&&!await bounded(config.owners.verifyCsrf(request,owner)))return reject(403,'csrf_denied');
   let input:Record<string,unknown>|undefined;
   if(write){if(url.search)return reject(400,'invalid_request');const parsed=await body(request),deletion=!!parsed&&typeof parsed==='object'&&(parsed as Record<string,unknown>).action==='request_deletion';input=fields(parsed,collection?['journalId','mint','requestId','thesis','invalidation']:deletion?['mint','requestId','expectedHead','action']:['mint','requestId','expectedHead','action','thesis','invalidation']);}
   else{if([...url.searchParams.keys()].some(k=>k!=='mint')||url.searchParams.getAll('mint').length!==1)return reject(400,'invalid_request');}
   const mint=write?input!.mint:url.searchParams.get('mint');identity(item?.[1]??(write?input!.journalId:'11111111-1111-4111-8111-111111111111'),mint);
   if(write){if(!uuid(input!.requestId)||(item&&input!.expectedHead!==null&&!hex(input!.expectedHead)))return reject(400,'invalid_request');
    if(input!.action!=='request_deletion'&&(typeof input!.thesis!=='string'||input!.thesis.length>2000||!input!.thesis.trim()||(input!.invalidation!==null&&(typeof input!.invalidation!=='string'||input!.invalidation.length>1000))))return reject(422,'invalid_thesis');
    if(item&&!['revise','request_deletion'].includes(String(input!.action)))return reject(400,'invalid_request');}
   await current(owner);if(!await bounded(config.rate.reserve(owner.principal,write?'write':'read')))return reply({error:'rate_limited',retryAfterSeconds:3600},429);
   let result:unknown,status=200;
   if(collection&&request.method==='GET'){
    const entries=await config.repository.list(owner.principal,20);result={items:entries.filter(e=>e.mint===mint),coverage:'matching_mint_within_latest_20_owner_journals'};
   }else if(request.method==='GET'){
    const r=await config.repository.read(owner.principal,item![1],mint as string);
    const history:ThesisHistory={journalId:item![1],mint:mint as string,receipt:r.receipt,entries:r.events.map(e=>({sequence:e.sequence,kind:e.change.kind,thesis:e.change.kind==='created'||e.change.kind==='revised'?e.change.content.thesis:null,invalidation:e.change.kind==='created'||e.change.kind==='revised'?e.change.content.invalidation:null,recordedAt:e.recorded_at,hash:e.hash,supersedes:e.supersedes}))};result=history;
   }else{
    const deletion=item&&input!.action==='request_deletion';
    const change=deletion?{kind:'deletion_requested' as const,content:{reason:'Owner requested erasure'},fact_snapshot_refs:[]}:
     {kind:collection?'created' as const:'revised' as const,content:{thesis:input!.thesis as string,invalidation:input!.invalidation as string|null,contradictions:null},fact_snapshot_refs:[]};
    result=await config.repository.append(owner.principal,{journalId:item?.[1]??input!.journalId,mint,requestId:input!.requestId,expectedHead:item?input!.expectedHead:null,change});status=deletion?202:collection?201:200;
   }
   await current(owner);return reply(result,status);
  }catch(e){
   if(e instanceof ApiError)return reply({error:e.code,saveConfirmed:false},e.status);
   if(e instanceof JournalError){const status={unauthenticated:401,invalid_request:422,not_available:410,conflict:409,limit:429,integrity:503,unavailable:503}[e.code];return reply({error:e.code==='not_available'?'expired_revoked_or_missing':e.code==='integrity'?'unavailable':e.code,saveConfirmed:false},status);}
   return reply({error:'unavailable',saveConfirmed:false},503);
  }
 };
}
