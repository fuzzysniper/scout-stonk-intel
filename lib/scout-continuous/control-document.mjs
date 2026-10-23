// No private data/credential/SQL in this shell. Vercel Authentication remains
// mandatory; all data and STOP actions additionally require the owner capability.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {requestOrigin} from './origin.mjs';
const script=readFileSync(join(process.cwd(),'scripts/ops/continuous-mobile-console.js'),'utf8');
if(/<\/script/i.test(script))throw Error('unsafe_control_script');
const scriptHash=createHash('sha256').update(script).digest('base64');
export function controlHandler({env=()=>process.env}={}){
 return req=>{
  const e=env(),headers={'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',
   'Content-Security-Policy':`default-src 'none'; script-src 'sha256-${scriptHash}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`};
  if(e.SCOUT_CONTINUOUS_CONTROL_ENABLED!=='true'||e.SCOUT_CONTINUOUS_API_ENABLED!=='true')return new Response('Control disabled',{status:503,headers});
  if(req.method!=='GET')return new Response('Method not allowed',{status:405,headers});
  if(!requestOrigin(req,e,'control')||e.SCOUT_CONTINUOUS_PROTECTION_REVIEW_SHA!==e.VERCEL_GIT_COMMIT_SHA)return new Response('Access denied',{status:403,headers});
  return new Response(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UNFARMD private parent control</title><body><main><h1>UNFARMD private control</h1><p>Parent STOP only. This page cannot start a source.</p></main><script>${script}</script></body></html>`,{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
 };
}
