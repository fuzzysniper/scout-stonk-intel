// LOCAL/SYNTHETIC ONLY. Ephemeral in-memory test keys; never the owner trust key.
// No operator signing, key setup, credentials, SQL or provider requests.
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
export const require=createRequire(import.meta.url),build=process.env.JUPITER_BETA_BUILD;
export const MINT='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const HOST='scout-stonk-intel-synthetic-beta-riskledgerapp.vercel.app';
export const BRANCH='beta/276-jupiter-founder-only';
export const identity=()=>({project:'prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q',repository:'fuzzysniper/scout-stonk-intel',branch:BRANCH,commit:'a'.repeat(40),deployment:'dpl_SYNTHETICBETAONLY',origin:'https://'+HOST});
export const env=()=>({VERCEL_ENV:'preview',VERCEL_PROJECT_ID:identity().project,VERCEL_GIT_COMMIT_REF:BRANCH,VERCEL_GIT_COMMIT_SHA:identity().commit,VERCEL_DEPLOYMENT_ID:identity().deployment,VERCEL_URL:HOST,VERCEL_GIT_PROVIDER:'github',VERCEL_GIT_REPO_OWNER:'fuzzysniper',VERCEL_GIT_REPO_SLUG:'scout-stonk-intel',UNFARMD_OWNER_RELEASE:''});
export function record(now=Date.now()){return {version:'unfarmd-jupiter-beta/1',identity:identity(),source:{provider:'jupiter_tokens_v2',host:'api.jup.ag',path:'/tokens/v2/search',access:'keyless',mint:MINT,audience:'founder_only_internal_testing',automaticRequests:false,native:false,holders:false,save:false,publicDisplay:false},rights:{decision:'approved_internal_testing_private_interpretive_display',agreementSha256:'b'.repeat(64),customerBasisSha256:'c'.repeat(64),interpretationSha256:'d'.repeat(64),attributionSha256:'e'.repeat(64),receiptPolicySha256:'f'.repeat(64),reviewedAt:now-2000},edge:{authentication:'vercel_authentication',founderOnly:true,anonymousDenied:true,forgedCookieDenied:true,unapprovedDenied:true,exceptionsReviewed:true,controlPlaneSha256:'1'.repeat(64),negativeEvidenceSha256:'2'.repeat(64),ownerAccessSha256:'3'.repeat(64),reviewedAt:now-2000},issuedAt:now-1000,startsAt:now-500,expiresAt:now+60000};}
export function fixture(now=Date.now()){
 const keys=generateKeyPairSync('ed25519');
 const envelope=(value=record(now))=>{const payload=typeof value==='string'?value:JSON.stringify(value);return {payload,signature:sign(null,Buffer.from(payload),keys.privateKey).toString('base64url')};};
 return {now,publicKey:keys.publicKey,envelope,encode:value=>Buffer.from(JSON.stringify(envelope(value))).toString('base64url'),fingerprint:createHash('sha256').update(keys.publicKey.export({type:'spki',format:'der'})).digest('hex')};
}
export const request=(headers={},body=JSON.stringify({action:'inspect',mint:MINT}))=>new Request('https://'+HOST+'/api/v4/ca-intelligence',{method:'POST',headers:{host:HOST,origin:'https://'+HOST,'sec-fetch-site':'same-origin','x-unfarmd-ca-intent':'inspect','content-type':'application/json',...headers},body});
export async function scopedEnv(patch,run){const before=process.env;process.env={...before,...env(),...patch};try{return await run();}finally{process.env=before;}}
