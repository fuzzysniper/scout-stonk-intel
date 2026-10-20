import "server-only";
import type { MintFactsV1, MintFailure } from "../contract";
import { decodeResponse } from "../decoder";
import { LIMITS } from "../policy";
import { API_LIMITS, HELIUS_HOST } from "./policy";
import { targetUrl, type IsolatedHeliusTarget } from "./helius";

export class BoundaryError extends Error { constructor(readonly reason: MintFailure) { super(reason); } }
export function demand(ok: unknown, reason: MintFailure = "invalid_response"): asserts ok { if (!ok) throw new BoundaryError(reason); }
export type Transport = (url: string, init: RequestInit) => Promise<Response>;
export type Clock = Readonly<{ now: () => number; monotonic: () => number }>;
export async function deadline<T>(work: Promise<T>, ms: number, reason: MintFailure, abort?: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => { reject(new BoundaryError(reason)); abort?.(); }, ms);
    })]);
  } finally { clearTimeout(timer); }
}
async function boundedText(response: Response, url: string, signal: AbortSignal): Promise<string> {
  demand(!response.redirected && (!response.url || response.url === url));
  let size = 0;
  response.headers.forEach((v, k) => {
    demand(v.length + k.length <= LIMITS.headerBytes, "response_too_large");
    size += new TextEncoder().encode(k + v).length + 4; demand(size <= LIMITS.headerBytes, "response_too_large");
  });
  demand(size <= LIMITS.headerBytes, "response_too_large");
  demand(/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get("content-type") ?? ""));
  const length = response.headers.get("content-length"), age = response.headers.get("age");
  if (length !== null) demand(/^\d{1,10}$/.test(length) && Number(length) <= LIMITS.bytes, "response_too_large");
  if (age !== null) demand(/^\d{1,6}$/.test(age) && Number(age) * 1000 <= LIMITS.maxSourceAgeMs, "stale_source");
  demand(response.body);
  const reader = response.body.getReader(), decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", cancel, { once: true });
  let bytes = 0, text = "";
  try {
    while (true) {
      demand(!signal.aborted, "timeout"); const chunk = await reader.read(); if (chunk.done) break;
      bytes += chunk.value.length; demand(bytes <= LIMITS.bytes, "response_too_large");
      text += decoder.decode(chunk.value, { stream: true });
    }
    demand(!signal.aborted, "timeout"); return text + decoder.decode();
  } catch (error) { cancel(); throw error; }
  finally { signal.removeEventListener("abort", cancel); }
}

/** Shared bounded protocol; acquisition comes from trusted server construction, never HTTP input. */
export async function heliusRead(input: Readonly<{
  mint: string; requestId: number; target: IsolatedHeliusTarget; transport: Transport; clock: Clock;
  signal: AbortSignal; acquisition: "synthetic_fixture" | "production_rpc"; deadlineMs?: number;
}>): Promise<{ result: MintFactsV1; slot: string }> {
  const controller = new AbortController();
  const abort = () => controller.abort(); input.signal.addEventListener("abort", abort, { once: true });
  const work = async () => {
    demand(!input.signal.aborted, "timeout");
    const start = input.clock.now(), mono = input.clock.monotonic();
    demand(Number.isSafeInteger(start) && start >= 0 && start <= 253402300799999 && Number.isFinite(mono) && mono >= 0, "invalid_clock");
    const url = targetUrl(input.target);
    let response: Response;
    try {
      response = await input.transport(url, { method: "POST", redirect: "error", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer",
        signal: controller.signal, headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: input.requestId, method: "getAccountInfo", params: [input.mint, { encoding: "jsonParsed", commitment: "finalized" }] }) });
    } catch { throw new BoundaryError(controller.signal.aborted ? "timeout" : "network_unavailable"); }
    if (controller.signal.aborted) { void response.body?.cancel().catch(() => undefined); throw new BoundaryError("timeout"); }
    if (response.status !== 200) {
      void response.body?.cancel().catch(() => undefined);
      throw new BoundaryError(response.status === 429 ? "rate_limited" : response.status === 401 || response.status === 403 ? "access_denied" : "upstream_unavailable");
    }
    const text = await boundedText(response, url, controller.signal);
    // Even a syntactically valid authority/context field must not echo the scoped key.
    const key = new URL(url).searchParams.get("api-key");
    demand(key && !text.includes(key), "invalid_response");
    const received = input.clock.now(), elapsed = input.clock.monotonic() - mono;
    demand(received >= start && elapsed >= 0 && Math.abs(received - start - elapsed) <= 1000, "invalid_clock");
    demand(elapsed <= API_LIMITS.timeoutMs, "timeout");
    const result = await decodeResponse({ mint: input.mint, requestId: input.requestId, text,
      requestStartedAt: new Date(start).toISOString(), responseReceivedAt: new Date(received).toISOString(), evaluatedAt: new Date(received).toISOString(),
      httpDate: response.headers.get("date"), acquisition: input.acquisition, endpointHost: HELIUS_HOST });
    demand(!JSON.stringify(result).includes(key), "invalid_response"); // Also catch JSON-escaped reflection after decoding.
    if (result.status === "unavailable") throw new BoundaryError(result.reason);
    // A supported negative also passed the strict envelope/context checks. Preserve monotonic context admission.
    const slot = result.source?.contextSlot ?? String((JSON.parse(text) as { result: { context: { slot: number } } }).result.context.slot);
    return { result, slot };
  };
  try { return await deadline(work(), input.deadlineMs ?? API_LIMITS.timeoutMs, "timeout", abort); }
  finally { abort(); input.signal.removeEventListener("abort", abort); }
}
export const syntheticHeliusRead = (input: Omit<Parameters<typeof heliusRead>[0], "acquisition">) => heliusRead({ ...input, acquisition: "synthetic_fixture" });
