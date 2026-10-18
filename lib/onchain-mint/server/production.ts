import "server-only";
import { failure } from "../decoder";
import { disabledHandler, mintJson, parseMintRequest } from "./handler";
import { APPROVED_SITE_ORIGIN } from "./policy";
import { LIVE_APPROVAL, loadProductionConfig, PRODUCTION_PROFILE } from "./production-config";
import { vercelIdentity } from "./hosting-identity";
import { mintService } from "./service";
let service: ReturnType<typeof mintService> | null = null;

/** Production-capable native path; immutable reviewed code gate is OFF before ALL env/secrets/I/O. */
export async function productionHandler(request: Request): Promise<Response> {
  if (!LIVE_APPROVAL.enabled) return disabledHandler(request);
  const parsed = parseMintRequest(request, APPROVED_SITE_ORIGIN); if (parsed instanceof Response) return parsed;
  try {
    if (!LIVE_APPROVAL.storeHost || !LIVE_APPROVAL.vercelProjectId) return mintJson(failure(parsed.mint, "disabled"));
    const context = { vercel: process.env.VERCEL, environment: process.env.VERCEL_ENV, projectId: process.env.VERCEL_PROJECT_ID };
    const identity = vercelIdentity(request, context, LIVE_APPROVAL.vercelProjectId);
    if (!identity) return mintJson(failure(parsed.mint, "access_denied"));
    if (!service) {
      const config = loadProductionConfig(name => process.env[name], LIVE_APPROVAL.storeHost);
      // Lazy import prevents pg defaults from consulting ambient PG* env on disabled builds/requests.
      const { nativePostgresStore } = await import("./postgres-store");
      service = mintService({ ...config, store: nativePostgresStore(config.database), clock: { now: () => Date.now(), monotonic: () => performance.now() },
        trustedIdentity: async req => vercelIdentity(req, context, LIVE_APPROVAL.vercelProjectId!),
        transport: (url, init) => globalThis.fetch(url, init) }, PRODUCTION_PROFILE);
    }
    const out = await service(request, parsed.mint); return mintJson(out.result, undefined, out.retryAfter);
  } catch { return mintJson(failure(parsed.mint, "upstream_unavailable")); }
}
