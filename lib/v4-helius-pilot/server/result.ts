import "server-only";
import type { PilotReason, PilotResult } from "./contract";
export function response(reason: PilotReason | null, status = 503, observation: PilotResult["observation"] = null, mockOnly = true): Response {
  const body: PilotResult = { version: "unfarmd-helius-pilot/1", sourceGo: false, mockOnly, reason, observation };
  return Response.json(body, { status, headers: {
    "Cache-Control": "private, no-store, max-age=0", "CDN-Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'", "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer", Vary: "Origin, Cookie",
  } });
}
