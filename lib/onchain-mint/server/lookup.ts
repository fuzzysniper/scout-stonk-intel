import "server-only";
import { failure } from "../decoder";
import { disabledHandler, mintJson, parseMintRequest } from "./handler";
import { APPROVED_SITE_ORIGIN } from "./policy";
import { CANARY_DEPLOYMENT_HOST } from "./canary-policy";
import { emptyBody, nativePlatform, productionRuntime, type Platform } from "./production";
import { vercelIdentity } from "./hosting-identity";
import { LOOKUP_APPROVAL, LOOKUP_PROFILE, LOOKUP_PROOF, type LookupApproval } from "./lookup-policy";

/** Same MintFactsV1 GET contract. Trusted construction seam; no request can pick a policy or host. */
export function lookupRuntime(approval: LookupApproval, platform: Platform) {
  let runtime: ReturnType<typeof productionRuntime> | undefined;
  return async (request: Request): Promise<Response> => {
    // Zero configuration, hosting, secret, driver, SQL or RPC reads while source-disabled.
    if(approval.phase!=="proof" && approval.phase!=="public")return disabledHandler(request);
    let mint: string | null=null;
    try {
      const {notBeforeMs:start,expiresAtMs:end}=approval;
      if(!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start!<0 || end!<=start! || end!-start!>86400000)
        return mintJson(failure(null,"disabled"));
      const now=platform.clock.now();
      if(!Number.isSafeInteger(now) || now<start! || now>=end!)return mintJson(failure(null,"disabled"));
      const proof=approval.phase==="proof", url=new URL(request.url);
      if(proof && (request.method!=="POST" || url.origin===APPROVED_SITE_ORIGIN))return disabledHandler(request);
      const normalized=proof ? new Request(request.url,{method:"GET",headers:request.headers,signal:request.signal}) : request;
      const origin=proof ? url.origin : APPROVED_SITE_ORIGIN;
      const parsed=parseMintRequest(normalized,origin);if(parsed instanceof Response)return parsed;
      mint=parsed.mint;
      if(proof && mint!==LOOKUP_PROOF.mint)return mintJson(failure(mint,"disabled"));
      // Ordinary consumer GET uses mode:same-origin; speculative prefetch/navigation is never acquisition.
      if(request.headers.has("content-encoding") || request.headers.get("purpose")?.includes("prefetch") ||
        request.headers.get("sec-purpose")?.includes("prefetch") || request.headers.get("sec-fetch-site")!=="same-origin" ||
        (request.headers.has("sec-fetch-dest") && request.headers.get("sec-fetch-dest")!=="empty"))
        return mintJson(failure(mint,"access_denied"),403);
      if(proof && (request.headers.get("origin")!==origin || request.headers.get("x-scout-lookup-intent")!==LOOKUP_PROOF.intent))
        return mintJson(failure(mint,"access_denied"),403);
      const context=platform.hosting();
      if(context.insecureTls==="0" || context.forceNativePg || !/^[0-9a-f]{40}$/.test(context.commitSha??"") ||
        !context.deploymentUrl || !CANARY_DEPLOYMENT_HOST.test(context.deploymentUrl) ||
        (proof && origin!=="https://"+context.deploymentUrl) ||
        !vercelIdentity(normalized,context,approval.vercelProjectId,origin) ||
        (proof && request.headers.get("x-scout-lookup-commit")!==context.commitSha))return mintJson(failure(mint,"access_denied"),403);
      if(proof)await emptyBody(request);
      runtime??=productionRuntime({enabled:true,storeHost:approval.storeHost,vercelProjectId:approval.vercelProjectId},platform,{
        ...LOOKUP_PROFILE, lookupSession:{purpose:proof?"proof":"public",notBeforeMs:start!,expiresAtMs:end!},
        ...(proof?{canary:{mint:LOOKUP_PROOF.mint,maxLeaseId:1,notBeforeMs:start!,expiresAtMs:end!}}:{}),
      },origin);
      const response=await runtime(normalized);
      response.headers.set("X-SCOUT-Policy",LOOKUP_PROFILE.policy);
      response.headers.set("X-SCOUT-Deployment-Host",context.deploymentUrl);
      response.headers.set("X-SCOUT-Commit",context.commitSha!);
      return response;
    }catch{return mintJson(failure(mint,"upstream_unavailable"));}
  };
}
/** No old-canary route fallback and no old-canary SQL policy, even if its old gate remains true. */
export const lookupHandler=lookupRuntime(LOOKUP_APPROVAL,{
  ...nativePlatform,
  store:async database=>(await import("./postgres-store")).nativePostgresStore(database,"lookup"),
});
