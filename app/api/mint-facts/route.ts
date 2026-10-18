import { productionHandler } from "../../../lib/onchain-mint/server/production";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// LIVE_APPROVAL is immutable OFF in reviewed source; no env/query flag can enable it.
export const GET = productionHandler;
export const HEAD = productionHandler;
export const POST = productionHandler;
export const PUT = productionHandler;
export const PATCH = productionHandler;
export const DELETE = productionHandler;
export const OPTIONS = productionHandler;
