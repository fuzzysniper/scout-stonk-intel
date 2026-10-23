import {PROJECT} from '../live-ledger/http.mjs';
export const CANONICAL_ORIGIN='https://unfarmd.com';
/** Native project identity is mandatory for BOTH hosts. No forwarded-host trust. */
export function requestOrigin(req,env,kind){
 if(env.VERCEL!=='1'||env.VERCEL_ENV!=='production'||env.VERCEL_PROJECT_ID!==PROJECT||!/^[a-f0-9]{40}$/.test(env.VERCEL_GIT_COMMIT_SHA??'')||!/^scout-stonk-intel-[a-z0-9-]+\.vercel\.app$/.test(env.VERCEL_URL??''))return null;
 const url=new URL(req.url),immutable='https://'+env.VERCEL_URL;
 // This reviewed SHA pin records the OWNER's protection check; it is not an
 // assertion that an application can independently inspect Vercel's SSO cookie.
 const canonical=kind!=='maintenance'&&env.SCOUT_CONTINUOUS_CANONICAL_ENABLED==='true'&&env.SCOUT_CONTINUOUS_PROTECTION_REVIEW_SHA===env.VERCEL_GIT_COMMIT_SHA&&url.origin===CANONICAL_ORIGIN;
 if(url.origin!==immutable&&!canonical)return null;
 const path='/api/live-events/continuous'+(kind==='reader'?'':'/'+kind);
 const navigation=kind==='control',site=req.headers.get('sec-fetch-site');
 if(url.pathname!==path||url.search||url.hash||url.username||url.password||!(navigation?['same-origin','none'].includes(site)&&req.headers.get('sec-fetch-mode')==='navigate':site==='same-origin')||((!['reader','control'].includes(kind)||req.headers.has('origin'))&&req.headers.get('origin')!==url.origin))return null;
 return url.origin;
}
