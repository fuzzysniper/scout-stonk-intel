import { disabledHandler } from "../../../lib/onchain-mint/server/handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Explicitly disabled in EVERY environment. No production activation/secret/store/transport path exists.
export const GET = disabledHandler;
export const HEAD = disabledHandler;
export const POST = disabledHandler;
export const PUT = disabledHandler;
export const PATCH = disabledHandler;
export const DELETE = disabledHandler;
export const OPTIONS = disabledHandler;
