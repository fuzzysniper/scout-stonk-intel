import 'server-only';
import {need,hash,type Policy} from '../plan';
import {NATIVE_SETUP_RUNTIME_ENABLED} from './gates';
import {freeze} from '../../onchain-mint/validation';
import {canonical,controlPlan,identity,setupCandidate,sourceCandidate,type ControlPlan,type Context,type Identity,type Setup,type Source} from './contract';
import {githubReader,listingPath,publication,configurationPath,privateManifest,evidencePaths,verifyEvidence,type Read} from './github';
/** No environment flag, request packet or issue comment can populate these compiled pins.
 * A later owner-approved build emits its actual checked-out identity, not a self-referential Git literal. */
export const NATIVE_ADMISSION_PLAN:ControlPlan|null=null;
export const NATIVE_ADMISSION_BUILD:Readonly<{commit:string;tree:string}>|null=null;
declare const setupBrand:unique symbol,sourceBrand:unique symbol;
export type NativeSetupAdmission=Readonly<{readonly [setupBrand]:true}>;
export type NativeSourceAdmission=Readonly<{readonly [sourceBrand]:true}>;
type S={record:Setup;sha256:string;identity:Identity;last:number;dead:boolean};
type L={record:Source;setup:NativeSetupAdmission;created:number;last:number;dead:boolean};
const setups=new WeakMap<object,S>(),sources=new WeakMap<object,L>();
function runtime(build:Readonly<{commit:string;tree:string}>,plan:ControlPlan):Identity{
 const e=process.env;need(e.VERCEL==='1'&&e.VERCEL_ENV==='preview'&&e.VERCEL_PROJECT_ID==='prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q'&&e.VERCEL_GIT_PROVIDER==='github'&&e.VERCEL_GIT_REPO_OWNER==='fuzzysniper'&&e.VERCEL_GIT_REPO_SLUG==='scout-stonk-intel'&&e.VERCEL_GIT_COMMIT_SHA===build.commit&&e.VERCEL_GIT_COMMIT_REF===plan.branch);
 return identity({commit:build.commit,tree:build.tree,branch:plan.branch,project:e.VERCEL_PROJECT_ID,deployment:e.VERCEL_DEPLOYMENT_ID??'',origin:'https://'+(e.VERCEL_URL??'')});
}
function current(){need(NATIVE_ADMISSION_PLAN&&NATIVE_ADMISSION_BUILD);return {plan:controlPlan(NATIVE_ADMISSION_PLAN),identity:runtime(NATIVE_ADMISSION_BUILD,NATIVE_ADMISSION_PLAN)};}
async function stage(read:Read,c:Context,which:'setup'|'source',now:number,s?:Setup){
 const p=publication(await read(listingPath(which,c)),which,c);
 const text=privateManifest(await read(configurationPath(which,c)),p,which,c);
 const record=which==='setup'?setupCandidate(text,c,now):sourceCandidate(text,s!,c,now);
 const entries=await Promise.all(Object.entries(evidencePaths(record,which,p)).map(async([k,path])=>[k,await read(path)] as const));
 verifyEvidence(Object.fromEntries(entries),record,which,c,Date.now());return record;
}
/** Actual fixed-host authenticated reader ONLY. No injected transport/time/test-cap constructor.
 * Current default returns before token, config, database, checkpoint or source access. */
export async function loadNativeAdmissions(requireSource:boolean){
 if(!NATIVE_SETUP_RUNTIME_ENABLED||!NATIVE_ADMISSION_PLAN||!NATIVE_ADMISSION_BUILD)return null;
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),4000);let setup:NativeSetupAdmission|undefined;
 try{
  const context=current(),started=Date.now(),token=process.env.UNFARMD_NATIVE_GITHUB_READ_TOKEN;
  need(token);const read=githubReader(token,abort.signal),s=await stage(read,context,'setup',started) as Setup;
  const checked=Date.now();need(checked>=started&&checked-started<=4000&&canonical(current())===canonical(context));
  setup=Object.freeze({}) as NativeSetupAdmission;setups.set(setup,{record:s,sha256:hash(canonical(s)),identity:context.identity,last:Date.now(),dead:false});
  if(!requireSource)return Object.freeze({setup,source:null});
  const r=await stage(read,context,'source',Date.now(),s) as Source,now=Date.now();need(now>=started&&now-started<=4000&&canonical(current())===canonical(context));
  const source=Object.freeze({}) as NativeSourceAdmission;sources.set(source,{record:r,setup,created:now,last:now,dead:false});return Object.freeze({setup,source});
 }catch{if(setup)setups.get(setup)!.dead=true;return null;}finally{clearTimeout(timer);abort.abort();}
}
/** Opaque native authority, not the original signed Neon capability. No compatibility conversion. */
export function nativeSetupRecord(cap:NativeSetupAdmission,p:Policy){
 const x=cap&&setups.get(cap),now=Date.now();need(x);if(now<x.last||now>=x.record.expiresAt)x.dead=true;x.last=now;
 need(!x.dead&&now>=x.record.startsAt&&canonical(current().identity)===canonical(x.identity)&&hash(canonical(p))===hash(canonical(x.record.policy)));
 return freeze({record:x.record,sha256:x.sha256});
}
export function nativeSourcePermitted(cap:NativeSourceAdmission,setup:NativeSetupAdmission,p:Policy){
 try{const x=cap&&sources.get(cap),now=Date.now();need(x);if(now<x.last||now>=x.record.expiresAt||now-x.created>30000)x.dead=true;x.last=now;
  need(!x.dead&&x.setup===setup&&now>=x.record.startsAt);const s=nativeSetupRecord(setup,p);need(x.record.setupSha256===s.sha256&&x.record.policySha256===hash(canonical(p)));return true;
 }catch{return false;}
}

export function approvedNativePolicy(cap:NativeSetupAdmission){const x=cap&&setups.get(cap);need(x);return nativeSetupRecord(cap,x.record.policy).record.policy;}
