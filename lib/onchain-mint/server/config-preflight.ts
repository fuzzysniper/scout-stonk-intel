import "server-only";
import { databaseCompatibility, type DatabaseCompatibility } from "./production-config";
import { LOOKUP_APPROVAL } from "./lookup-policy";
import { CANARY_DEPLOYMENT_HOST } from "./canary-policy";
import { vercelIdentity, type HostingContext } from "./hosting-identity";

export const PREFLIGHT_QUERY="?preflight=neon-dsn-v1";
export const PREFLIGHT_INTENT="neon-dsn-configuration-v1";
export type PreflightApproval=Readonly<{enabled:boolean;notBeforeMs:number|null;expiresAtMs:number|null}>;
/** Independent review gate. No env/query/header can enable it. Does NOT authorize mint acquisition. */
// Proposed preflight-only session: 2026-10-21 21:45:00Z inclusive to 21:50:00Z exclusive.
// Release and the single protected POST require separate founder approvals. No rolling expiry.
export const PREFLIGHT_APPROVAL:PreflightApproval=Object.freeze({enabled:true,notBeforeMs:1792619100000,expiresAtMs:1792619400000});
type Status=DatabaseCompatibility|"disabled"|"access_denied"|"preflight_unavailable";
type Platform=Readonly<{hosting:()=>HostingContext;readDsn:()=>unknown;now:()=>number}>;
const reply=(status:Status,code=200)=>Response.json({status},{status:code,headers:{
  "Cache-Control":"private, no-store, max-age=0","CDN-Cache-Control":"no-store","Vercel-CDN-Cache-Control":"no-store",
  "Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'","X-Content-Type-Options":"nosniff",
  "Referrer-Policy":"no-referrer",Vary:"Origin, Sec-Fetch-Site",
}});
/** No SQL/admission/transport/secret-writer dependency. Exactly one scoped env read after ALL gates.
 * Effective Vercel Authentication must be verified externally BEFORE approving this temporary window.
 * Idempotent classification; no fake distributed one-shot counter (SQL is intentionally forbidden).
 */
export function configPreflight(approval:PreflightApproval,platform:Platform) {
  const inWindow=()=>{
    const start=approval.notBeforeMs,end=approval.expiresAtMs,now=platform.now();
    return Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start!>=0&&end!>start!&&end!-start!<=300000&&
      Number.isSafeInteger(now)&&now>=start!&&now<end!;
  };
  return async(request:Request):Promise<Response>=>{
    // No hosting/env reads at import or while disabled; existing mint gate must remain source-disabled.
    if(!approval.enabled || LOOKUP_APPROVAL.phase!=="disabled" || LOOKUP_APPROVAL.notBeforeMs!==null || LOOKUP_APPROVAL.expiresAtMs!==null)
      return reply("disabled",503);
    try {
      if(!inWindow())return reply("disabled",503);
      if(request.method!=="POST" || request.url.length>256)return reply("access_denied",403);
      const url=new URL(request.url);
      if(url.pathname!=="/api/mint-facts" || url.search!==PREFLIGHT_QUERY || url.hash || url.username || url.password ||
        request.headers.get("x-scout-preflight-intent")!==PREFLIGHT_INTENT || request.headers.get("origin")!==url.origin ||
        request.headers.get("sec-fetch-site")!=="same-origin" || request.headers.get("sec-fetch-dest")!=="empty")return reply("access_denied",403);
      let bytes=0;request.headers.forEach((v,k)=>{bytes+=new TextEncoder().encode(k+v).byteLength+4});
      if(bytes>16384 || ["transfer-encoding","content-encoding","x-rpc-url","x-api-key","helius-api-key"].some(h=>request.headers.has(h)) ||
        request.headers.has("content-length")&&request.headers.get("content-length")!=="0")return reply("access_denied",403);
      const context=platform.hosting(),host=context.deploymentUrl;
      if(!host || !CANARY_DEPLOYMENT_HOST.test(host) || url.origin!=="https://"+host ||
        request.headers.has("host")&&request.headers.get("host")!==host ||
        !/^[0-9a-f]{40}$/.test(context.commitSha??"") || request.headers.get("x-scout-preflight-commit")!==context.commitSha ||
        context.insecureTls==="0" || context.forceNativePg!==undefined ||
        !vercelIdentity(request,context,LOOKUP_APPROVAL.vercelProjectId,url.origin))return reply("access_denied",403);
      if(request.signal.aborted || request.bodyUsed)return reply("access_denied",403);
      // Fail closed on any body bytes or stalled stream, before touching the scoped DSN.
      if(request.body){
        const reader=request.body.getReader();let timer:ReturnType<typeof setTimeout>|undefined;
        try{
          const empty=(async()=>{for(let n=0;n<4;n++){const c=await reader.read();if(c.done)return true;if(c.value.byteLength)return false}return false})();
          if(!await Promise.race([empty,new Promise<boolean>(resolve=>{timer=setTimeout(()=>resolve(false),100)})]))return reply("access_denied",403);
        }finally{clearTimeout(timer);void reader.cancel().catch(()=>undefined)}
      }
      if(request.signal.aborted || !inWindow())return reply("disabled",503);
      const status=databaseCompatibility(platform.readDsn(),LOOKUP_APPROVAL.storeHost,{role:"scout_mint_app",database:"neondb"});
      return inWindow()?reply(status):reply("disabled",503);
    }catch{return reply("preflight_unavailable",503)}
  };
}
export const productionConfigPreflight=configPreflight(PREFLIGHT_APPROVAL,{
  hosting:()=>({vercel:process.env.VERCEL,environment:process.env.VERCEL_ENV,projectId:process.env.VERCEL_PROJECT_ID,
    deploymentUrl:process.env.VERCEL_URL,commitSha:process.env.VERCEL_GIT_COMMIT_SHA,
    insecureTls:process.env.NODE_TLS_REJECT_UNAUTHORIZED,forceNativePg:process.env.NODE_PG_FORCE_NATIVE}),
  readDsn:()=>process.env.SCOUT_MINT_STORE_DATABASE_URL,
  now:()=>Date.now(),
});
