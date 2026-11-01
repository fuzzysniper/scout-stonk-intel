import 'server-only';
import {AsyncLocalStorage} from 'node:async_hooks';
import {createPublicKey,verify,type KeyObject} from 'node:crypto';
import {parsePacket} from '../trader-pulse/validation';
import {OWNER_RELEASE_PUBLIC_KEY_PEM,VERCEL_PROJECT_ID} from '../v4-owner-preview/trust';
import {JUPITER_BETA_BRANCH,JUPITER_BETA_HEADER,JUPITER_BETA_MAX_BYTES,isJupiterBetaEnvelope,isJupiterBetaRecord,type JupiterBetaRecord} from './jupiter-beta-contract';

/** Independent source HOLD. No environment, packet or header can enable this draft.
 * Lifting requires a separately reviewed code change/owner GO, then a NEW Ready
 * identity and post-Ready public signature. No redeployment is needed to carry it.
 */
export const JUPITER_BETA_SOURCE_ENABLED=false;
export type BetaIdentity=Readonly<{project:string;repository:string;branch:string;commit:string;deployment:string;origin:string}>;
declare const brand:unique symbol;
export type JupiterBetaAdmission=Readonly<{[brand]:true}>;
const same=(a:BetaIdentity,b:BetaIdentity)=>['project','repository','branch','commit','deployment','origin'].every(k=>a[k as keyof BetaIdentity]===b[k as keyof BetaIdentity]);
const frozen=(r:JupiterBetaRecord):JupiterBetaRecord=>Object.freeze({...r,identity:Object.freeze({...r.identity}),source:Object.freeze({...r.source}),rights:Object.freeze({...r.rights}),edge:Object.freeze({...r.edge})});
/** Pure verifier with a trusted SERVER constructor, following the existing authority pattern.
 * Runtime below constructs it ONLY from the immutable pre-established trust.ts key.
 * Test-only authorities use ephemeral synthetic fixture keys, never runtime/owner keys.
 */
export class JupiterBetaAuthority{
 private caps=new WeakMap<object,JupiterBetaRecord>();private last=0;private terminal=false;
 constructor(private readonly key:KeyObject,private readonly identity:BetaIdentity){
  if(key.type!=='public'||key.asymmetricKeyType!=='ed25519')throw Error('invalid_beta_trust');
  this.identity=Object.freeze({...identity});
 }
 private clock(now:number){if(this.terminal||!Number.isSafeInteger(now)||now<0||now<this.last){this.terminal=true;return false;}this.last=now;return true;}
 admit(envelope:unknown,now=Date.now()):JupiterBetaAdmission|null{try{
  if(!this.clock(now)||!envelope||typeof envelope!=='object')return null;
  const descriptors=Object.getOwnPropertyDescriptors(envelope);
  if(Reflect.ownKeys(descriptors).length!==2||!descriptors.payload||!descriptors.signature||!('value'in descriptors.payload)||!('value'in descriptors.signature))return null;
  const signed={payload:descriptors.payload.value,signature:descriptors.signature.value};
  if(!isJupiterBetaEnvelope(signed))return null;
  const signature=Buffer.from(signed.signature,'base64url');
  if(signature.length!==64||signature.toString('base64url')!==signed.signature||!verify(null,Buffer.from(signed.payload,'utf8'),this.key,signature))return null;
  const record=parsePacket(signed.payload);
  if(!isJupiterBetaRecord(record)||JSON.stringify(record)!==signed.payload||!same(record.identity,this.identity)||now<record.startsAt||now>=record.expiresAt)return null;
  const cap=Object.freeze({})as JupiterBetaAdmission;this.caps.set(cap,frozen(record));return cap;
 }catch{return null;}}
 inspect(cap:unknown,now=Date.now()):JupiterBetaRecord|null{
  if(!this.clock(now))return null;const r=cap&&typeof cap==='object'?this.caps.get(cap):null;
  return r&&now>=r.startsAt&&now<r.expiresAt?r:null;
 }
}
/** Only platform-supplied metadata. No request/header/env pin can choose a trust root. */
export function betaPlatformIdentity():BetaIdentity|null{
 const e=process.env,host=e.VERCEL_URL,commit=e.VERCEL_GIT_COMMIT_SHA,deployment=e.VERCEL_DEPLOYMENT_ID;
 if(e.VERCEL_ENV!=='preview'||e.VERCEL_PROJECT_ID!==VERCEL_PROJECT_ID||e.VERCEL_GIT_COMMIT_REF!==JUPITER_BETA_BRANCH
 ||e.VERCEL_GIT_PROVIDER!=='github'||e.VERCEL_GIT_REPO_OWNER!=='fuzzysniper'||e.VERCEL_GIT_REPO_SLUG!=='scout-stonk-intel'
 ||!commit||!/^[a-f0-9]{40}$/.test(commit)||commit==='0'.repeat(40)||!deployment||!/^dpl_[A-Za-z0-9]{8,100}$/.test(deployment)
 ||!host||!/^scout-stonk-intel-[a-z0-9-]+-riskledgerapp\.vercel\.app$/.test(host)||host.startsWith('scout-stonk-intel-git-')
 ||(e.UNFARMD_OWNER_RELEASE||'').trim())return null;
 return Object.freeze({project:VERCEL_PROJECT_ID,repository:'fuzzysniper/scout-stonk-intel',branch:JUPITER_BETA_BRANCH,commit,deployment,origin:'https://'+host});
}
export function decodeBetaCarrier(encoded:unknown):unknown{
 try{if(typeof encoded!=='string'||encoded.length>11000||!/^[A-Za-z0-9_-]+$/.test(encoded))return null;
  const bytes=Buffer.from(encoded,'base64url');if(bytes.length>JUPITER_BETA_MAX_BYTES||bytes.toString('base64url')!==encoded)return null;
  const text=new TextDecoder('utf8',{fatal:true}).decode(bytes),value=parsePacket(text);
  return isJupiterBetaEnvelope(value)&&JSON.stringify(value)===text?value:null;
 }catch{return null;}
}
/** Preserve original fixed request contract AND bind it to the admitted exact mint.
 * Reads at most256 bytes. The original source receives the IDENTICAL bytes/headers
 * and still independently enforces Host/Origin/intent/size/schema before transport.
 */
export async function bindBetaRequest(request:Request,authority:JupiterBetaAuthority,envelope:unknown,identity:BetaIdentity):Promise<{cap:JupiterBetaAdmission;request:Request}|null>{
 try{
  const cap=authority.admit(envelope),r=cap&&authority.inspect(cap);if(!cap||!r||!same(r.identity,identity)||request.signal.aborted)return null;
  const u=new URL(request.url),host=new URL(identity.origin).host,h=request.headers;
  if(request.method!=='POST'||u.pathname!=='/api/v4/ca-intelligence'||u.search||u.hash||h.get('host')!==host
   ||h.get('x-forwarded-host')!==null&&h.get('x-forwarded-host')!==host
   ||(h.get('x-forwarded-proto')!==null?h.get('x-forwarded-proto')!=='https':u.protocol!=='https:')
   ||h.get('origin')!==identity.origin||h.get('sec-fetch-site')!=='same-origin'||h.get('x-unfarmd-ca-intent')!=='inspect'
   ||h.get('content-type')!=='application/json'||h.has('authorization')||h.has('x-api-key')||h.has('content-encoding')
   ||h.has('x-unfarmd-native-approval')||Number(h.get('content-length')??0)>256)return null;
  const reader=request.body?.getReader();if(!reader)return null;
  let total=0,chunks=0,expired=false;const parts:Uint8Array[]=[];
  const timer=setTimeout(()=>{expired=true;void reader.cancel().catch(()=>{});},1000);timer.unref();
  try{for(;;){const c=await reader.read();if(c.done)break;if(expired||request.signal.aborted||++chunks>256)return null;total+=c.value.byteLength;if(total>256)return null;parts.push(c.value);}}
  finally{clearTimeout(timer);void reader.cancel().catch(()=>{});reader.releaseLock();}
  if(expired||request.signal.aborted)return null;
  const raw=Buffer.concat(parts.map(p=>Buffer.from(p)),total),body=parsePacket(new TextDecoder('utf8',{fatal:true}).decode(raw));
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='action,mint'
   ||(body as {action:unknown}).action!=='inspect'||(body as {mint:unknown}).mint!==r.source.mint||!authority.inspect(cap))return null;
  return {cap,request:new Request(request,{body:raw})};
 }catch{return null;}
}
type Context={authority:JupiterBetaAuthority;cap:JupiterBetaAdmission;identity:BetaIdentity;active:boolean};
const context=new AsyncLocalStorage<Context>();
export function betaPreviewCurrent():boolean{
 const c=context.getStore(),identity=betaPlatformIdentity();
 return JUPITER_BETA_SOURCE_ENABLED&&!!c?.active&&!!identity&&same(c.identity,identity)&&!!c.authority.inspect(c.cap);
}
const off=()=>Response.json({error:'private_development_off'},{status:503,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
/** Post-Ready per-request PUBLIC carrier; never writes environment/DB/session state.
 * Effective founder-only Vercel edge rejection is an EXTERNAL prerequisite, not
 * authentication inferred from this header, a cookie, or a signed reviewer claim.
 * Source HOLD remains absolute even for a correctly signed/bound record.
 */
export async function withJupiterBeta(request:Request,run:(request:Request)=>Promise<Response>):Promise<Response>{
 if(process.env.VERCEL_GIT_COMMIT_REF!==JUPITER_BETA_BRANCH)return run(request);
 const identity=betaPlatformIdentity();if(!identity||!OWNER_RELEASE_PUBLIC_KEY_PEM)return off();
 const envelope=decodeBetaCarrier(request.headers.get(JUPITER_BETA_HEADER));if(!envelope)return off();
 let bound:Awaited<ReturnType<typeof bindBetaRequest>>,authority:JupiterBetaAuthority;
 try{authority=new JupiterBetaAuthority(createPublicKey(OWNER_RELEASE_PUBLIC_KEY_PEM),identity);if(!authority.admit(envelope)||!JUPITER_BETA_SOURCE_ENABLED)return off();bound=await bindBetaRequest(request,authority,envelope,identity);}catch{return off();}
 if(!bound||!JUPITER_BETA_SOURCE_ENABLED)return off();
 const c:Context={authority,cap:bound.cap,identity,active:true};
 return context.run(c,async()=>{try{if(!betaPreviewCurrent())return off();const response=await run(bound.request);return betaPreviewCurrent()?response:off();}finally{c.active=false;}});
}
