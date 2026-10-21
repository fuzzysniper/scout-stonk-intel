import { lookupHandler } from "../../../lib/onchain-mint/server/lookup";
import { PREFLIGHT_QUERY, productionConfigPreflight } from "../../../lib/onchain-mint/server/config-preflight";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

// New separately budgeted exact-mint path. Source-disabled; never retries the old canary.
export const GET = lookupHandler;
export const HEAD = lookupHandler;
export const POST = (request:Request) => {
  // Separate, default-disabled categorical configuration check. Never dispatches a mint lookup.
  try{if(new URL(request.url).search===PREFLIGHT_QUERY)return productionConfigPreflight(request)}catch{ /* Existing strict parser rejects. */ }
  return lookupHandler(request);
};
export const PUT = lookupHandler;
export const PATCH = lookupHandler;
export const DELETE = lookupHandler;
export const OPTIONS = lookupHandler;
