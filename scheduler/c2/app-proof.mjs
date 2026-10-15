// Inactive auth-only core. The existing private key is read ONLY by a future
// separately approved hosted invocation. No runner, file, console or state output.
import { appJwt } from '../worker.ts';
export const PUBLIC = Object.freeze({app:5310753,installation:171233795,repository:1415026436,owner:58099771,workflow:382300817});
export const REPOSITORY='fuzzysniper/scout-stonk-intel';
export const WORKFLOW='scout-stage-c2-auth-only';
export const SINGLETON='stage-c2-auth-once';
const API='https://api.github.com';
const WORKFLOW_PATH='/repos/'+REPOSITORY+'/actions/workflows/reward-snapshots.yml';
const INSTALL='/app/installations/'+PUBLIC.installation;
const positive=v=>typeof v==='string' && /^[1-9]\d{0,15}$/.test(v) && Number.isSafeInteger(Number(v));
export const utc=v=>typeof v==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.000Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString()===v;
export function permitted(env,event,now=Date.now()) {
 if(env.ACTIVATION!=='disabled' || env.C2_ARMED!=='true' || env.C2_GATE_DISABLED_ATTESTED!=='true' ||
    env.APP_ID!==String(PUBLIC.app) || env.INSTALLATION_ID!==String(PUBLIC.installation) || env.REPOSITORY_ID!==String(PUBLIC.repository) ||
    !positive(env.C2_APP_ACTOR_ID) || [PUBLIC.app,PUBLIC.installation,PUBLIC.repository,PUBLIC.owner].includes(Number(env.C2_APP_ACTOR_ID)) ||
    typeof env.C2_INSTANCE_ID!=='string' || !/^c2-[a-f0-9]{40}$/.test(env.C2_INSTANCE_ID) ||
    !utc(env.C2_NOT_BEFORE) || !utc(env.C2_EXPIRES_AT) || !Number.isSafeInteger(now) || now<0 || now>=253402300800000)return false;
 const start=Date.parse(env.C2_NOT_BEFORE),end=Date.parse(env.C2_EXPIRES_AT);
 if(end<=start || end-start>600000 || now<start || now>=end)return false;
 return !!event && typeof event==='object' && !Array.isArray(event) && Object.keys(event).sort().join(',')==='createdAt,instanceId,workflowName' && event.instanceId===env.C2_INSTANCE_ID && event.workflowName===WORKFLOW &&
  Number.isSafeInteger(event.createdAt) && event.createdAt>=start && event.createdAt<=now && now-event.createdAt<=600000;
}
export function receipt(proofId=null,now=Date.now()) {
 return {version:1,kind:'stage_c2_app_auth_only',proofId:typeof proofId==='string' && /^c2-[a-f0-9]{40}$/.test(proofId)?proofId:null,
  checkedAt:Number.isSafeInteger(now) && now>=0 && now<253402300800000?new Date(now).toISOString():null,
  passed:false,exitCode:1,appId:PUBLIC.app,installationId:PUBLIC.installation,repositoryId:PUBLIC.repository,workflowId:PUBLIC.workflow,appActorId:null,
  appIdentityVerified:false,installationVerified:false,repositoryVerified:false,appActorVerified:false,workflowReadVerified:false,
  tokenIssuanceAttempted:false,tokenIssuanceUncertain:false,temporaryTokenRevoked:false,revokeUncertain:false,
  dispatches:0,collectionClaims:0,providerQueries:0,repositoryWrites:0,workflowTokenVerified:false,pilotReady:false};
}
const grants=(value,actions)=>value && typeof value==='object' && !Array.isArray(value) && value.actions===actions &&
 Object.entries(value).every(([k,v])=>k==='actions' || k==='metadata' && v==='read');
async function boundedJson(response,deadline) {
 if(!response.body || Number(response.headers.get('content-length'))>32768)throw Error('c2_unavailable');
 const reader=response.body.getReader(),chunks=[];let length=0;
 try{while(true){
  let timer;const budget=Math.min(5000,deadline-Date.now());if(budget<=0)throw Error('c2_unavailable');
  let part;try{part=await Promise.race([reader.read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('c2_unavailable')),budget);})]);}finally{clearTimeout(timer);}
  const {done,value}=part;if(done)break;length+=value.length;if(length>32768)throw Error('c2_unavailable');chunks.push(value);
 }}
 finally{void reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(length);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}
 const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(!value || typeof value!=='object' || Array.isArray(value))throw Error('c2_unavailable');return value;
}
/** All request capabilities are literal method/path pairs. No URL from a response
 * is followed; no retries, redirects, dispatch endpoint or provider origin exists. */
function transport(deadline) {
 const allowed=new Set(['GET /app','GET '+INSTALL,'POST '+INSTALL+'/access_tokens','GET /installation/repositories?per_page=2','GET '+WORKFLOW_PATH,'DELETE /installation/token']);
 return async(path,token,method='GET',body=undefined)=>{
  const bot=method==='GET' && /^\/users\/[a-z0-9-]{1,100}%5Bbot%5D$/.test(path);
  if(!allowed.has(method+' '+path) && !bot)throw Error('c2_unavailable');
  const issuing=method==='POST';
  if(issuing && JSON.stringify(body)!==JSON.stringify({repository_ids:[PUBLIC.repository],permissions:{actions:'read'}}) || !issuing && body!==undefined)throw Error('c2_unavailable');
  const remaining=method==='DELETE'?8000:Math.min(5000,deadline-Date.now());
  if(remaining<=0)throw Error('c2_unavailable');
  return fetch(API+path,{method,redirect:'manual',signal:AbortSignal.timeout(remaining),
   headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10',Authorization:'Bearer '+token,'User-Agent':'SCOUT-C2-Auth-Only','Content-Type':'application/json'},
   body:issuing?JSON.stringify(body):undefined});
 };
}
export async function inspectHostedApp(env,event,clock=()=>Date.now()) {
 const out=receipt(event?.instanceId,clock());let issued;
 const deadline=Date.now()+35000,send=transport(deadline);
 const get=async(path,token)=>{const response=await send(path,token);if(response.status!==200)throw Error('c2_unavailable');return boundedJson(response,deadline);};
 try {
  if(!permitted(env,event,clock()))return out;
  // Do not enumerate env or touch the binding before every nonsecret guard passes.
  const key=env.APP_PRIVATE_KEY;
  if(typeof key!=='string' || !key || key.length>8192)return out;
  const jwt=await appJwt(key,PUBLIC.app,clock());
  const app=await get('/app',jwt);
  if(app.id!==PUBLIC.app || !/^[a-z0-9-]{1,100}$/.test(app.slug??'') || app.owner?.id!==PUBLIC.owner || app.owner?.login!=='fuzzysniper' || !grants(app.permissions,'write'))return out;
  out.appIdentityVerified=true;
  const installation=await get(INSTALL,jwt);
  if(installation.id!==PUBLIC.installation || installation.app_id!==PUBLIC.app || installation.account?.id!==PUBLIC.owner || installation.account?.login!=='fuzzysniper' || installation.repository_selection!=='selected' || installation.suspended_at!==null || !grants(installation.permissions,'write'))return out;
  out.installationVerified=true;
  if(!permitted(env,event,clock()))return out;
  out.tokenIssuanceAttempted=true;out.tokenIssuanceUncertain=true;
  const response=await send(INSTALL+'/access_tokens',jwt,'POST',{repository_ids:[PUBLIC.repository],permissions:{actions:'read'}});
  // A lost, malformed or oversized issuance response can leave an unknown token.
  if(response.status!==201)throw Error('c2_unavailable');
  const value=await boundedJson(response,deadline);
  if(typeof value.token==='string' && value.token.length>0 && value.token.length<=8192 && !/[\r\n\u0000]/.test(value.token))issued=value.token;
  if(!issued)throw Error('c2_unavailable');
  out.tokenIssuanceUncertain=false;
  const expiry=typeof value.expires_at==='string'?Date.parse(value.expires_at):NaN;
  if(!Number.isFinite(expiry) || expiry<clock()+60000 || expiry>clock()+3900000 || !grants(value.permissions,'read'))throw Error('c2_unavailable');
  const scope=await get('/installation/repositories?per_page=2',issued),list=scope.repositories;
  if(scope.total_count!==1 || !Array.isArray(list) || list.length!==1 || list[0].id!==PUBLIC.repository || list[0].full_name!==REPOSITORY || list[0].default_branch!=='main')throw Error('c2_unavailable');
  out.repositoryVerified=true;
  const bot=await get('/users/'+app.slug+'%5Bbot%5D',issued);
  if(bot.id!==Number(env.C2_APP_ACTOR_ID) || bot.type!=='Bot' || bot.login!==app.slug+'[bot]')throw Error('c2_unavailable');
  out.appActorVerified=true;out.appActorId=bot.id;
  const workflow=await get(WORKFLOW_PATH,issued);
  if(workflow.id!==PUBLIC.workflow || workflow.path!=='.github/workflows/reward-snapshots.yml' || workflow.state!=='active')throw Error('c2_unavailable');
  out.workflowReadVerified=true;
 }catch { /* Only the fixed receipt leaves this trust boundary. */ }
 finally {
  if(issued){try{out.temporaryTokenRevoked=(await send('/installation/token',issued,'DELETE')).status===204;}catch{/* uncertain stays fail-closed */}
   out.revokeUncertain=!out.temporaryTokenRevoked;}
 }
 out.passed=out.appIdentityVerified && out.installationVerified && out.repositoryVerified && out.appActorVerified && out.workflowReadVerified && out.temporaryTokenRevoked && !out.tokenIssuanceUncertain;
 out.exitCode=out.passed?0:1;return out;
}
