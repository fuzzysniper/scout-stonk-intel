import { lookupHandler } from "../../../lib/onchain-mint/server/lookup";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

// New separately budgeted exact-mint path. Source-disabled; never retries the old canary.
export const GET = lookupHandler;
export const HEAD = lookupHandler;
export const POST = lookupHandler;
export const PUT = lookupHandler;
export const PATCH = lookupHandler;
export const DELETE = lookupHandler;
export const OPTIONS = lookupHandler;
