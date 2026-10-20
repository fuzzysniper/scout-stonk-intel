import { productionHandler } from "../../../lib/onchain-mint/server/production";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

// Reviewed USDC-only POST canary; ordinary GETs and all other mints stay disabled.
export const GET = productionHandler;
export const HEAD = productionHandler;
export const POST = productionHandler;
export const PUT = productionHandler;
export const PATCH = productionHandler;
export const DELETE = productionHandler;
export const OPTIONS = productionHandler;
