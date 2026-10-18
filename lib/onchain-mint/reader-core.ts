import type { MintFactsReader, MintFactsV1, MintFailure } from "./contract";
import { decodeResponse, failure } from "./decoder";
import { LIMITS, PUBLIC_RPC_ENDPOINT } from "./policy";
import { freeze, isExactPublicKey } from "./validation";

/** Internal transport seam. Not a production endpoint configuration interface. */
export type Dependencies = Readonly<{
  transport: (url: string, init: RequestInit) => Promise<Response>;
  now: () => number;
  monotonic: () => number;
  acquisition: "development_rpc" | "synthetic_fixture";
  deadlineMs?: number;
}>;
export type Admission = {
  attempts: number; active: boolean; stopped: boolean;
  lastStart: number | null; wall: number | null; mono: number | null;
  highestSlot: bigint;
  cache: Map<string, { result: MintFactsV1; at: number }>;
};
export function newAdmission(): Admission {
  return { attempts: 0, active: false, stopped: false, lastStart: null, wall: null, mono: null, highestSlot: 0n, cache: new Map() };
}
class Stop extends Error { constructor(readonly reason: MintFailure) { super(reason); } }
function requireValue(ok: unknown, reason: MintFailure = "invalid_response"): asserts ok { if (!ok) throw new Stop(reason); }

function clock(d: Dependencies, a: Admission): { wall: number; mono: number } {
  const wall = d.now(), mono = d.monotonic();
  requireValue(Number.isSafeInteger(wall) && wall >= 0 && wall <= 8640000000000000 && Number.isFinite(mono) && mono >= 0, "invalid_clock");
  if (a.wall !== null && a.mono !== null) {
    // A backwards clock or significant wall/elapsed divergence cannot renew source freshness.
    requireValue(wall >= a.wall && mono >= a.mono && Math.abs((wall - a.wall) - (mono - a.mono)) <= 1000, "invalid_clock");
  }
  a.wall = wall; a.mono = mono;
  return { wall, mono };
}

async function bodyText(response: Response, signal: AbortSignal): Promise<string> {
  requireValue(!response.redirected && (!response.url || response.url === PUBLIC_RPC_ENDPOINT));
  let headerBytes = 0;
  response.headers.forEach((v, k) => { headerBytes += new TextEncoder().encode(k + v).byteLength; });
  requireValue(headerBytes <= LIMITS.headerBytes, "response_too_large");
  requireValue(/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get("content-type") ?? ""));
  const length = response.headers.get("content-length");
  if (length !== null) requireValue(/^\d{1,10}$/.test(length) && Number(length) <= LIMITS.bytes, "response_too_large");
  const age = response.headers.get("age");
  if (age !== null) requireValue(/^\d{1,6}$/.test(age) && Number(age) * 1000 <= LIMITS.maxSourceAgeMs, "stale_source");
  requireValue(response.body);
  const reader = response.body.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0, text = "";
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      requireValue(!signal.aborted, "timeout");
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      requireValue(bytes <= LIMITS.bytes, "response_too_large");
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) { cancel(); throw error; }
  finally { signal.removeEventListener("abort", cancel); }
}

/** Serial, no retries, fixed-method fixed-host bounded development reader. */
export function boundedReader(d: Dependencies, a: Admission): MintFactsReader {
  return Object.freeze({ async readMint(mint: string): Promise<MintFactsV1> {
    if (!isExactPublicKey(mint)) return failure(null, "invalid_mint");
    if (a.stopped) return failure(mint, "circuit_open");
    if (a.active) return failure(mint, "admission_limited");
    let start: { wall: number; mono: number };
    try { start = clock(d, a); }
    catch { a.stopped = true; a.cache.clear(); return failure(mint, "invalid_clock"); }
    const cached = a.cache.get(mint);
    if (cached && start.wall - cached.at <= LIMITS.cacheMs && cached.result.source) {
      return freeze({ ...cached.result, source: { ...cached.result.source, evaluatedAt: new Date(start.wall).toISOString() } });
    }
    a.cache.delete(mint);
    if (a.attempts >= LIMITS.requestsPerDevelopmentProcess) return failure(mint, "development_budget");
    if (a.lastStart !== null && start.mono - a.lastStart < LIMITS.minimumIntervalMs) return failure(mint, "admission_limited");
    a.active = true; a.attempts++; a.lastStart = start.mono;
    const id = a.attempts, controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { reject(new Stop("timeout")); controller.abort(); }, d.deadlineMs ?? LIMITS.timeoutMs);
    });
    const acquisition = async (): Promise<MintFactsV1> => {
      let response: Response;
      try {
        response = await d.transport(PUBLIC_RPC_ENDPOINT, {
          method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id, method: "getAccountInfo", params: [mint, { encoding: "jsonParsed", commitment: "finalized" }] }),
          signal: controller.signal, redirect: "error", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer",
        });
      } catch { throw new Stop(controller.signal.aborted ? "timeout" : "network_unavailable"); }
      if (controller.signal.aborted) { void response.body?.cancel().catch(() => undefined); throw new Stop("timeout"); }
      if (response.status !== 200) {
        void response.body?.cancel().catch(() => undefined);
        throw new Stop(response.status === 429 ? "rate_limited" : response.status === 401 || response.status === 403 ? "access_denied" : "upstream_unavailable");
      }
      const text = await bodyText(response, controller.signal);
      const end = clock(d, a);
      requireValue(end.mono - start.mono <= LIMITS.timeoutMs, "timeout");
      const result = await decodeResponse({ mint, requestId: id, text, requestStartedAt: new Date(start.wall).toISOString(),
        responseReceivedAt: new Date(end.wall).toISOString(), evaluatedAt: new Date(end.wall).toISOString(),
        httpDate: response.headers.get("date"), acquisition: d.acquisition });
      return result;
    };
    try {
      const result = await Promise.race([acquisition(), timeout]);
      if (result.status === "unavailable") { a.stopped = true; a.cache.clear(); }
      if (result.source) {
        const slot = BigInt(result.source.contextSlot);
        requireValue(slot >= a.highestSlot, "stale_source"); a.highestSlot = slot;
        if (a.cache.size >= LIMITS.cacheEntries) a.cache.delete(a.cache.keys().next().value!);
        a.cache.set(mint, { result, at: Date.parse(result.source.responseReceivedAt) });
      }
      return result;
    } catch (error) {
      a.stopped = true; a.cache.clear();
      return failure(mint, error instanceof Stop ? error.reason : "invalid_response");
    } finally {
      clearTimeout(timer); controller.abort(); a.active = false;
    }
  } });
}
