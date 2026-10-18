import "server-only";
import type { MintFactsV1 } from "../contract";
import { failure } from "../decoder";
import { isExactPublicKey } from "../validation";
import { API_LIMITS as L, APPROVED_SITE_ORIGIN } from "./policy";
import type { Outcome } from "./service";

function status(result: MintFactsV1): number {
  if (!("reason" in result)) return 200;
  if (result.status === "not_a_supported_mint_account") return 404;
  if (result.reason === "invalid_mint") return 400;
  if (result.reason === "admission_limited" || result.reason === "rate_limited") return 429;
  if (result.reason === "timeout") return 504;
  if (["invalid_response", "response_too_large", "rpc_error", "unparsed_account"].includes(result.reason)) return 502;
  return 503;
}
function json(result: MintFactsV1, code = status(result), retryAfter?: number): Response {
  return Response.json(result, { status: code, headers: {
    "Cache-Control": "private, no-store, max-age=0", "CDN-Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'", "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer", Vary: "Origin, Sec-Fetch-Site",
    ...(code === 405 ? { Allow: "GET" } : {}),
    ...(code === 429 && Number.isSafeInteger(retryAfter) && retryAfter! >= 1 && retryAfter! <= 3600 ? { "Retry-After": String(retryAfter) } : {}),
  } });
}
function parse(request: Request, origin: string): { mint: string } | Response {
  if (request.method !== "GET") return json(failure(null, "access_denied"), 405);
  if (request.url.length > L.maxRequestUrlBytes || new TextEncoder().encode(request.url).length > L.maxRequestUrlBytes) return json(failure(null, "invalid_mint"), 400);
  let url: URL; try { url = new URL(request.url); } catch { return json(failure(null, "invalid_mint"), 400); }
  const reject = () => json(failure(null, "access_denied"), 403);
  if (url.origin !== origin || url.username || url.password) return reject();
  const host = request.headers.get("host"), forwardedHost = request.headers.get("x-forwarded-host"), forwardedProto = request.headers.get("x-forwarded-proto");
  if (host !== null && host !== url.host || forwardedHost !== null && forwardedHost !== url.host || forwardedProto !== null && forwardedProto !== url.protocol.slice(0, -1)) return reject();
  const callerOrigin = request.headers.get("origin"), site = request.headers.get("sec-fetch-site");
  if (callerOrigin !== null && callerOrigin !== origin || site !== null && site !== "same-origin" && site !== "none") return reject();
  let headerSize = 0;
  request.headers.forEach((value, name) => {
    if (headerSize > L.maxRequestHeadersBytes) return;
    if (value.length + name.length > L.maxRequestHeadersBytes) { headerSize = L.maxRequestHeadersBytes + 1; return; }
    headerSize += new TextEncoder().encode(name + value).length + 4;
  });
  if (headerSize > L.maxRequestHeadersBytes) return reject();
  if (["x-rpc-url", "x-api-key", "helius-api-key"].some(h => request.headers.has(h))) return reject();
  if (request.headers.has("transfer-encoding") || request.headers.has("content-length") && request.headers.get("content-length") !== "0") return json(failure(null, "invalid_mint"), 400);
  const values = url.searchParams.getAll("mint"), mint = values[0];
  if (url.pathname !== "/api/mint-facts" || url.hash || values.length !== 1 || !isExactPublicKey(mint) || url.search !== "?mint=" + mint) return json(failure(null, "invalid_mint"), 400);
  return { mint };
}

/** Public deployed handler: no feature flag, env/credential read, RPC transport or state store. */
export function disabledHandler(request: Request): Response {
  const parsed = parse(request, APPROVED_SITE_ORIGIN);
  return parsed instanceof Response ? parsed : json(failure(parsed.mint, "disabled"), 503);
}

/** Internal shared request/serialization path, invoked only by the mandatory synthetic test constructor. */
export function offlineHandler(origin: string, service: (request: Request, mint: string) => Promise<Outcome>) {
  return async (request: Request): Promise<Response> => {
    // Runtime guard rechecked per request: synthetic success is impossible in production.
    if (process.env.NODE_ENV !== "test") return disabledHandler(request);
    const parsed = parse(request, origin); if (parsed instanceof Response) return parsed;
    try { const out = await service(request, parsed.mint); return json(out.result, undefined, out.retryAfter); }
    catch { return json(failure(parsed.mint, "upstream_unavailable")); }
  };
}
