import "server-only";
import { failure } from "../decoder";
import { disabledHandler, mintJson, parseMintRequest } from "./handler";
import { APPROVED_SITE_ORIGIN } from "./policy";
import { LIVE_APPROVAL, loadProductionConfig, PRODUCTION_PROFILE, CANARY_PROFILE, type SecretReader, type DatabaseHandle } from "./production-config";
import { vercelIdentity, type HostingContext } from "./hosting-identity";
import type { AtomicMintStore } from "./distributed";
import { deadline, demand, type Clock, type Transport } from "./rpc";
import { mintService, type Profile } from "./service";
import { nativeHeliusTransport } from "./native-transport";
import { CANARY_DEPLOYMENT_HOST, canaryWindow, USDC_CANARY } from "./canary-policy";

export type Platform = Readonly<{
  hosting: () => HostingContext; readSecret: SecretReader;
  store: (database: DatabaseHandle) => Promise<AtomicMintStore>; transport: Transport; clock: Clock;
}>;
/** Internal composition seam, never a request/env flag or an alternate HTTP route. */
export function productionRuntime(approval: typeof LIVE_APPROVAL, platform: Platform,
  profile: Profile = PRODUCTION_PROFILE, origin = APPROVED_SITE_ORIGIN) {
  let service: ReturnType<typeof mintService> | null = null;
  let loading: Promise<ReturnType<typeof mintService>> | null = null;
  return async (request: Request): Promise<Response> => {
    // Before ALL configuration, hosting, credentials, store and fetch work.
    if (!approval.enabled) return disabledHandler(request);
    const parsed = parseMintRequest(request, origin); if (parsed instanceof Response) return parsed;
    try {
      const { storeHost, vercelProjectId } = approval;
      if (!storeHost || !vercelProjectId) return mintJson(failure(parsed.mint, "disabled"));
      if (!vercelIdentity(request, platform.hosting(), vercelProjectId, origin)) return mintJson(failure(parsed.mint, "access_denied"));
      if (!service) {
        // One initialization per isolate. Rejection remains failed until restart.
        loading ??= (async () => {
          const config = loadProductionConfig(platform.readSecret, storeHost);
          return mintService({ target: config.target, hmacKey: config.hmacKey, store: await platform.store(config.database),
            clock: platform.clock, trustedIdentity: async req => vercelIdentity(req, platform.hosting(), vercelProjectId, origin),
            transport: platform.transport }, profile);
        })();
        service = await loading;
      }
      const out = await service(request, parsed.mint), response=mintJson(out.result, undefined, out.retryAfter);
      if(out.delivery)response.headers.set("X-SCOUT-Delivery",out.delivery);
      return response;
    } catch { return mintJson(failure(parsed.mint, "upstream_unavailable")); }
  };
}

export async function emptyBody(request: Request): Promise<void> {
  demand(!request.bodyUsed && !request.signal.aborted, "access_denied");
  if (!request.body) return;
  const reader=request.body.getReader();
  try {
    await deadline((async()=>{
      for(let chunks=0;chunks<4;chunks++) {
        const part=await reader.read(); if(part.done)return;
        demand(part.value.byteLength===0, "access_denied");
      }
      demand(false,"access_denied");
    })(),100,"access_denied");
  } finally { void reader.cancel().catch(()=>undefined); }
}

/** Existing normal production deployment only. No disposable function, new route or alias change.
 * Unique deployment URLs are protected by the project's existing Vercel Authentication policy;
 * owner must verify effective protection/no exceptions before approving the single POST.
 */
export function productionCanaryRuntime(approval: typeof LIVE_APPROVAL, platform: Platform,
  window: Readonly<{notBeforeMs:number;expiresAtMs:number}> = USDC_CANARY) {
  let runtime: ReturnType<typeof productionRuntime> | null=null, selectedOrigin: string | null=null;
  return async(request: Request): Promise<Response> => {
    // Public/UI GET and every non-POST remain inert, even with live credentials configured.
    if(!approval.enabled || request.method!=="POST")return disabledHandler(request);
    let mint: string | null=null;
    try {
      const url=new URL(request.url);
      if(url.origin===APPROVED_SITE_ORIGIN)return disabledHandler(request);
      const normalized=new Request(request.url,{method:"GET",headers:request.headers,signal:request.signal});
      const parsed=parseMintRequest(normalized,url.origin);if(parsed instanceof Response)return parsed;
      mint=parsed.mint;
      if(mint!==USDC_CANARY.mint || !canaryWindow(platform.clock.now(),window))return mintJson(failure(mint,"disabled"));
      if(request.headers.get("origin")!==url.origin || request.headers.get("sec-fetch-site")!=="same-origin" ||
        request.headers.get("x-scout-canary-intent")!==USDC_CANARY.intent || request.headers.has("content-encoding"))
        return mintJson(failure(mint,"access_denied"),403);
      const context=platform.hosting(), host=context.deploymentUrl;
      // Runtime-provided unique URL, never caller Host/forwarding or a mutable production alias.
      if(context.insecureTls==="0" || context.forceNativePg || !host || !CANARY_DEPLOYMENT_HOST.test(host) || !/^[0-9a-f]{40}$/.test(context.commitSha??"") ||
        url.origin!=="https://"+host || !approval.vercelProjectId ||
        !vercelIdentity(normalized,context,approval.vercelProjectId,url.origin))
        return mintJson(failure(mint,"access_denied"),403);
      await emptyBody(request);
      if(!canaryWindow(platform.clock.now(),window))return mintJson(failure(mint,"disabled"));
      demand(selectedOrigin===null || selectedOrigin===url.origin,"access_denied");
      selectedOrigin=url.origin;
      runtime??=productionRuntime(approval,platform,{...CANARY_PROFILE,canary:{...USDC_CANARY,
        notBeforeMs:window.notBeforeMs,expiresAtMs:window.expiresAtMs}},url.origin);
      const response=await runtime(normalized);
      response.headers.set("X-SCOUT-Canary",USDC_CANARY.intent);
      response.headers.set("X-SCOUT-Deployment-Host",host);
      response.headers.set("X-SCOUT-Commit",context.commitSha!);
      return response;
    } catch { return mintJson(failure(mint,"upstream_unavailable")); }
  };
}

/** Native route: no configuration/credential/driver read at import or build time. */
export const nativePlatform: Platform = {
  hosting: () => ({ vercel: process.env.VERCEL, environment: process.env.VERCEL_ENV, projectId: process.env.VERCEL_PROJECT_ID,
    deploymentUrl: process.env.VERCEL_URL, commitSha: process.env.VERCEL_GIT_COMMIT_SHA,
    insecureTls: process.env.NODE_TLS_REJECT_UNAUTHORIZED, forceNativePg: process.env.NODE_PG_FORCE_NATIVE }),
  readSecret: name => process.env[name],
  // Lazy import also avoids pg's ambient defaults during disabled imports/builds/requests.
  store: async database => (await import("./postgres-store")).nativePostgresStore(database),
  transport: nativeHeliusTransport,
  clock: { now: () => Date.now(), monotonic: () => performance.now() },
};
export const productionHandler = productionCanaryRuntime(LIVE_APPROVAL, nativePlatform);
