import 'server-only';
import {isExactPublicKey} from '../onchain-mint/validation';
import type {PublicTrust} from '../../experiments/jupiter-beta-approval/integration/contract.mjs';
import {RESEARCH_BRANCH,RESEARCH_HEADER,RESEARCH_MAX_BODY,researchJson,researchEnvelope} from './jupiter-research-contract';
import {researchPlatformIdentity} from './jupiter-research-platform';
/** Separate code-only holds. Neither a packet, env, cookie nor successful public
 * verification installs trust, a consumption MAC, an authority, or source access. */
export const JUPITER_RESEARCH_SOURCE_ENABLED=false;
export const JUPITER_RESEARCH_PUBLIC_TRUST:PublicTrust|null=null;
const off=()=>Response.json({error:'private_development_off'},{status:503,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
/** Bounded wrapper -> ORIGINAL mint-only body, with all v3 metadata stripped.
 * This is NOT authentication and does not call a verifier, authority or source. */
export async function bindResearchRequest(request:Request,origin:string):Promise<{request:Request;envelope:string;mint:string}|null>{try{
 const u=new URL(request.url),h=request.headers,host=new URL(origin).host;
 if(request.signal.aborted||request.method!=='POST'||u.origin!==origin||u.pathname!=='/api/v4/ca-intelligence'||u.search||u.hash
 ||h.get('host')!==host||h.get('origin')!==origin||h.get(RESEARCH_HEADER)!=='3'||h.get('sec-fetch-site')!=='same-origin'||h.get('x-unfarmd-ca-intent')!=='inspect'
 ||h.get('content-type')!=='application/json'||h.has('content-encoding')||h.has('authorization')||h.has('x-api-key')||h.has('x-unfarmd-native-approval')||h.has('x-unfarmd-jupiter-admission')
 ||h.has('x-forwarded-host')&&h.get('x-forwarded-host')!==host||h.has('x-forwarded-proto')&&h.get('x-forwarded-proto')!=='https'||u.protocol!=='https:'
 ||h.has('content-length')&&!/^(?:0|[1-9][0-9]{0,5})$/.test(h.get('content-length')!)||Number(h.get('content-length')??0)>RESEARCH_MAX_BODY)return null;
 const reader=request.body?.getReader();if(!reader)return null;let total=0,chunks=0,expired=false;const parts:Uint8Array[]=[];
 const timer=setTimeout(()=>{expired=true;void reader.cancel().catch(()=>{});},1000);timer.unref();
 try{for(;;){const c=await reader.read();if(c.done)break;if(expired||request.signal.aborted||++chunks>256)return null;total+=c.value.byteLength;if(total>RESEARCH_MAX_BODY)return null;parts.push(c.value);}}finally{clearTimeout(timer);void reader.cancel().catch(()=>{});reader.releaseLock();}
 if(expired||request.signal.aborted)return null;
 const body=researchJson(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(parts.map(p=>Buffer.from(p)),total)),RESEARCH_MAX_BODY);
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='action,authorization,mint')return null;
 const b=body as {action:unknown;mint:unknown;authorization:unknown},envelope=JSON.stringify(b.authorization);
 if(b.action!=='inspect'||!isExactPublicKey(b.mint)||!researchEnvelope(envelope))return null;
 const headers=new Headers(h);headers.delete(RESEARCH_HEADER);headers.delete('content-length');
 const raw=JSON.stringify({action:'inspect',mint:b.mint});if(Buffer.byteLength(raw)>256)return null;
 return {request:new Request(request,{headers,body:raw}),envelope,mint:b.mint};
}catch{return null;}}
/** The existing producer is reachable ONLY through its original legacy gates.
 * The new branch never invokes it, including after a synthetic/public success. */
export async function withJupiterResearch(request:Request,legacy:(request:Request)=>Promise<Response>):Promise<Response>{
 if(process.env.VERCEL_GIT_COMMIT_REF!==RESEARCH_BRANCH&&!request.headers.has(RESEARCH_HEADER))return legacy(request);
 if(process.env.VERCEL_GIT_COMMIT_REF!==RESEARCH_BRANCH||request.headers.get(RESEARCH_HEADER)!=='3')return off();
 const identity=researchPlatformIdentity();if(!identity||!JUPITER_RESEARCH_SOURCE_ENABLED||!JUPITER_RESEARCH_PUBLIC_TRUST)return off();
 const bound=await bindResearchRequest(request,identity.origin);if(!bound)return off();
 const {researchReview}=await import('./jupiter-research-review.mjs');
 const checked=researchReview({publicTrust:JUPITER_RESEARCH_PUBLIC_TRUST,nativeIdentity:()=>{const current=researchPlatformIdentity();if(!current)throw Error('held');return current;},clock:Date.now});
 if(checked.inspect(bound.envelope,bound.mint).status!=='verified_source_off_contract'||!JUPITER_RESEARCH_SOURCE_ENABLED)return off();
 // No authority/MAC is installed; even this consumption-only result cannot acquire.
 await checked.reserve(bound.envelope,bound.mint);return off();
}
