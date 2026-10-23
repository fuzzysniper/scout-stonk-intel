import { createHash, timingSafeEqual } from 'node:crypto';
import { nativeStore } from './database.mjs';
export const PROJECT='prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q';
const headers={'Cache-Control':'private, no-store, max-age=0','Vary':'Authorization, Cookie','Content-Type':'application/json','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const response=(value,status)=>new Response(JSON.stringify(value),{status,headers});
const empty=(status)=>({version:'scout-live/1',status,observedAt:new Date().toISOString(),events:null,counts:null,health:null,budget:null,retention:null});
function authenticated(req,env) {
  const expected=env.SCOUT_LIVE_OWNER_TOKEN;
  const provided=req.headers.get('authorization');
  if(typeof expected!=='string'||!/^[A-Za-z0-9_-]{43,128}$/.test(expected)||typeof provided!=='string'||!/^Bearer [A-Za-z0-9_-]{43,128}$/.test(provided))return false;
  return timingSafeEqual(createHash('sha256').update(provided.slice(7)).digest(),createHash('sha256').update(expected).digest());
}
function origin(req,env,stop) {
  if(env.VERCEL!=='1'||env.VERCEL_ENV!=='production'||env.VERCEL_PROJECT_ID!==PROJECT||!/^[a-f0-9]{40}$/.test(env.VERCEL_GIT_COMMIT_SHA??''))return false;
  const host=env.VERCEL_URL;
  if(typeof host!=='string'||!/^scout-stonk-intel-[a-z0-9-]+\.vercel\.app$/.test(host))return false;
  const u=new URL(req.url);
  // Unique reviewed production deployment only; no origin aliases/bypass headers or arbitrary forwarded-host trust.
  if(u.origin!=='https://'+host||u.search||u.username||u.password||u.hash)return false;
  if(req.headers.get('sec-fetch-site')!=='same-origin')return false;
  if((stop||req.headers.has('origin'))&&req.headers.get('origin')!==u.origin)return false;
  return true;
}
/** Dependency-injected offline test seam; actual route uses only server-side production environment and native PG. */
export function liveHandler(kind,{env=()=>process.env,storeFactory=nativeStore}={}) {
  let store;
  return async req=>{
    const config=env();
    if(config.SCOUT_LIVE_API_ENABLED!=='true')return response(empty('disabled'),503);
    const stop=kind==='stop';
    if(req.method!==(stop?'POST':'GET'))return response({error:'method_not_allowed'},405);
    if(!origin(req,config,stop)||!authenticated(req,config))return response({error:'access_denied'},403);
    if(req.headers.has('transfer-encoding')||req.body!==null||req.headers.get('content-length')&&!['0'].includes(req.headers.get('content-length'))||stop&&req.headers.get('x-scout-live-intent')!=='STOP_SCOUT_LIVE')return response({error:'invalid_request'},400);
    try {
      store??=storeFactory(stop?'stop':'reader',config);
      const result=await store.transact(null,{signal:req.signal});
      return response(result,200);
    } catch {return response(empty('unavailable'),503);}
  };
}
