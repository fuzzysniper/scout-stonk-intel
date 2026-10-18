import "server-only";
import { failure } from "../decoder";
import { disabledHandler, mintJson, parseMintRequest } from "./handler";
import { APPROVED_SITE_ORIGIN } from "./policy";
import { LIVE_APPROVAL, loadProductionConfig, PRODUCTION_PROFILE, type SecretReader, type DatabaseHandle } from "./production-config";
import { vercelIdentity, type HostingContext } from "./hosting-identity";
import type { AtomicMintStore } from "./distributed";
import type { Clock, Transport } from "./rpc";
import { mintService } from "./service";
import { nativeHeliusTransport } from "./native-transport";

type Platform = Readonly<{
  hosting: () => HostingContext; readSecret: SecretReader;
  store: (database: DatabaseHandle) => Promise<AtomicMintStore>; transport: Transport; clock: Clock;
}>;
/** Internal composition seam, never a request/env flag or an alternate HTTP route. */
export function productionRuntime(approval: typeof LIVE_APPROVAL, platform: Platform) {
  let service: ReturnType<typeof mintService> | null = null;
  let loading: Promise<ReturnType<typeof mintService>> | null = null;
  return async (request: Request): Promise<Response> => {
    // Before ALL configuration, hosting, credentials, store and fetch work.
    if (!approval.enabled) return disabledHandler(request);
    const parsed = parseMintRequest(request, APPROVED_SITE_ORIGIN); if (parsed instanceof Response) return parsed;
    try {
      const { storeHost, vercelProjectId } = approval;
      if (!storeHost || !vercelProjectId) return mintJson(failure(parsed.mint, "disabled"));
      if (!vercelIdentity(request, platform.hosting(), vercelProjectId)) return mintJson(failure(parsed.mint, "access_denied"));
      if (!service) {
        // One initialization per isolate. Rejection remains failed until restart.
        loading ??= (async () => {
          const config = loadProductionConfig(platform.readSecret, storeHost);
          return mintService({ target: config.target, hmacKey: config.hmacKey, store: await platform.store(config.database),
            clock: platform.clock, trustedIdentity: async req => vercelIdentity(req, platform.hosting(), vercelProjectId),
            transport: platform.transport }, PRODUCTION_PROFILE);
        })();
        service = await loading;
      }
      const out = await service(request, parsed.mint); return mintJson(out.result, undefined, out.retryAfter);
    } catch { return mintJson(failure(parsed.mint, "upstream_unavailable")); }
  };
}

/** Native route path, shipped OFF. Configuration is not read at import/build time. */
export const productionHandler = productionRuntime(LIVE_APPROVAL, {
  hosting: () => ({ vercel: process.env.VERCEL, environment: process.env.VERCEL_ENV, projectId: process.env.VERCEL_PROJECT_ID }),
  readSecret: name => process.env[name],
  // Lazy import also avoids pg's ambient defaults during disabled imports/builds/requests.
  store: async database => (await import("./postgres-store")).nativePostgresStore(database),
  transport: nativeHeliusTransport,
  clock: { now: () => Date.now(), monotonic: () => performance.now() },
});
