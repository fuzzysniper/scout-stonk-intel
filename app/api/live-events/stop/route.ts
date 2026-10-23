import "server-only";
import { liveHandler } from "@/lib/live-ledger/http.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const POST = liveHandler("stop");
