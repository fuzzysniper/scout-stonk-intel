import "server-only";
import type { FixedRpcRead, PilotReason, RpcTarget } from "./contract";
import { BOUNDS } from "./policy";
const targets = new WeakMap<RpcTarget, string>();
export function target(key: string): RpcTarget {
  const value = Object.freeze({ host: BOUNDS.host }); targets.set(value, `https://${BOUNDS.host}/?api-key=${key}`); return value;
}
/** Internal server capability only. Never re-exported by the production entry. */
export function targetUrl(read: FixedRpcRead): string {
  const url = targets.get(read.target); if (!url) throw new Rejected("invalid_response"); return url;
}
export function dispose(read: FixedRpcRead) { targets.delete(read.target); }
export class Rejected extends Error { constructor(readonly reason: PilotReason) { super(reason); } }
export function need(condition: unknown, reason: PilotReason = "invalid_response"): asserts condition { if (!condition) throw new Rejected(reason); }
/** Bounded streaming used for the synthetic port; no native network function exists here. */
export async function boundedBody(response: Response, signal: AbortSignal, limit: number): Promise<string> {
  need(response.body);
  const reader = response.body.getReader(), decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", cancel, { once: true });
  let bytes = 0, text = "";
  try {
    while (true) {
      need(!signal.aborted, "timeout"); const item = await reader.read(); need(!signal.aborted, "timeout");
      if (item.done) break; bytes += item.value.byteLength; need(bytes <= limit, "response_too_large");
      text += decoder.decode(item.value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) { cancel(); throw error; }
  finally { signal.removeEventListener("abort", cancel); }
}
export function inspectResponse(response: Response, read: FixedRpcRead) {
  need(!response.redirected && (!response.url || response.url === targetUrl(read)));
  let bytes = 0;
  response.headers.forEach((v, k) => { bytes += new TextEncoder().encode(k + v).byteLength + 4; need(bytes <= BOUNDS.headerBytes, "response_too_large"); });
  need(/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get("content-type") ?? ""));
  const length = response.headers.get("content-length"), age = response.headers.get("age");
  if (length !== null) need(/^\d{1,10}$/.test(length) && Number(length) <= BOUNDS.responseBytes, "response_too_large");
  if (age !== null) need(/^\d{1,6}$/.test(age) && Number(age) * 1000 <= BOUNDS.sourceAgeMs, "stale_source");
}
