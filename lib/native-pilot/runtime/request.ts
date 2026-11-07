import 'server-only';
import {identity,controlPlan} from '../admission/contract';
import {NATIVE_RUNTIME_INSTALLED,NATIVE_RUNTIME_PLAN,NATIVE_RUNTIME_BUILD} from './build';
/** Early conservative filter, BEFORE metadata/secret/SQL. Original B owner checks
 * still run unchanged. Vercel edge protection is a separate installation requirement. */
export function nativeRequestAllowed(request:Request,owner=false){
 try{
  if(!NATIVE_RUNTIME_INSTALLED||!NATIVE_RUNTIME_PLAN||!NATIVE_RUNTIME_BUILD)return false;
  const e=process.env,b=NATIVE_RUNTIME_BUILD,p=controlPlan(NATIVE_RUNTIME_PLAN);
  if(e.VERCEL!=='1'||e.VERCEL_ENV!=='preview'||e.VERCEL_GIT_PROVIDER!=='github'||e.VERCEL_GIT_REPO_OWNER!=='fuzzysniper'||e.VERCEL_GIT_REPO_SLUG!=='scout-stonk-intel'||e.VERCEL_GIT_COMMIT_SHA!==b.commit||e.VERCEL_GIT_COMMIT_REF!==p.branch)return false;
  const i=identity({commit:b.commit,tree:b.tree,branch:p.branch,project:e.VERCEL_PROJECT_ID??'',deployment:e.VERCEL_DEPLOYMENT_ID??'',origin:'https://'+(e.VERCEL_URL??'')}),u=new URL(request.url),h=request.headers;
  if(request.signal.aborted||u.origin!==i.origin||u.search||u.hash||h.get('sec-fetch-site')!=='same-origin'||h.has('origin')&&h.get('origin')!==i.origin||request.method==='POST'&&h.get('origin')!==i.origin)return false;
  if(['authorization','x-owner-id','x-owner-subject','x-owner-email','x-api-key','purpose','sec-purpose'].some(k=>h.has(k))||['host','x-forwarded-host'].some(k=>h.has(k)&&h.get(k)!==u.host)||h.has('x-forwarded-proto')&&h.get('x-forwarded-proto')!=='https'||h.has('sec-fetch-dest')&&h.get('sec-fetch-dest')!=='empty')return false;
  let bytes=0;h.forEach((v,k)=>bytes+=Buffer.byteLength(v+k)+4);if(bytes>16384)return false;
  if(!owner)return u.pathname==='/api/native-pilot'&&request.method==='POST'&&/^application\/json(?:;\s*charset=utf-8)?$/i.test(h.get('content-type')??'')&&['inspect','stop'].includes(h.get('x-unfarmd-native-intent')??'');
  const status=u.pathname==='/api/native-pilot/owner/status',login=u.pathname==='/api/native-pilot/owner/sign-in/email',logout=u.pathname==='/api/native-pilot/owner/sign-out';
  return (status||login||logout)&&request.method===(status?'GET':'POST')&&h.get('x-unfarmd-owner-intent')===(status?'status':login?'login':'logout')&&(status||h.get('content-type')==='application/json');
 }catch{return false;}
}
