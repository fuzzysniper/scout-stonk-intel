import 'server-only';
import type { PulseReport } from './contract';
import { LIMITS } from './contract';
import { decodeObservation, endpointFor } from './decoder';
import { evaluatePulse } from './engine';
import { isExactMint, validTime } from './validation';

/** A trusted caller's recorded OWNER approval, not proof of a provider license.
 * Never accepted from HTTP input. Public route has no adapter dependency. */
export type PrivateResearchApproval = Readonly<{
  purpose: 'private_source_qualification'; reference: string;
  exactMints: readonly string[]; expiresMs: number; maxRequests: 1 | 2 | 3;
  sourceUseReviewed: true; publicRedistribution: false;
}>;
export type ObservationResult =
  { state: 'ready'; report: PulseReport } |
  { state: 'blocked' | 'unavailable' | 'rate_limited'; reason: string; retryAt: string | null };
type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** Fixed source. No I/O on construction. Per-adapter PRIVATE research budget only:
 * not a global production limiter and not deployable public admission. */
export function createPrivateResearchAdapter(options: {
  approval?: PrivateResearchApproval | null;
  fetcher?: Fetcher; now?: () => number;
} = {}): { observe(mint: string, intent: 'explicit_user_action'): Promise<ObservationResult> } {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  // Copy trusted configuration; callers cannot mutate the budget or mint list after construction.
  const a = options.approval;
  const approval = a && Array.isArray(a.exactMints) ? { ...a, exactMints: [...a.exactMints] } : null;
  let spent = 0, busy = false, nextAt = 0, stopped = false, lastTime = -1;
  const denied = (state: 'blocked' | 'unavailable' | 'rate_limited', reason: string, retryAt: string | null = null): ObservationResult => ({ state, reason, retryAt });
  return { async observe(mint, intent) {
    if (!isExactMint(mint) || intent !== 'explicit_user_action') return denied('blocked', 'invalid_input_or_intent');
    const started = now();
    if (!validTime(started) || started < lastTime) { stopped = true; return denied('blocked', 'clock_invalid'); }
    lastTime = started;
    if (!approval || approval.purpose !== 'private_source_qualification' || approval.sourceUseReviewed !== true ||
      approval.publicRedistribution !== false || typeof approval.reference !== 'string' || !/^[A-Za-z0-9#:/._ -]{8,160}$/.test(approval.reference) ||
      !validTime(approval.expiresMs) || started >= approval.expiresMs || approval.expiresMs - started > 86400000 ||
      !Number.isInteger(approval.maxRequests) || approval.maxRequests < 1 || approval.maxRequests > LIMITS.maxResearchRequests ||
      approval.exactMints.length < 1 || approval.exactMints.length > 3 ||
      new Set(approval.exactMints).size !== approval.exactMints.length || !approval.exactMints.every(isExactMint) || !approval.exactMints.includes(mint)) {
      return denied('blocked', 'owner_source_review_required');
    }
    if (stopped) return denied('blocked', 'adapter_stopped');
    if (busy) return denied('blocked', 'request_in_flight');
    if (spent >= approval.maxRequests) return denied('blocked', 'research_budget_exhausted');
    if (started < nextAt) return denied('rate_limited', 'manual_cooldown', new Date(nextAt).toISOString());
    busy = true; spent++; nextAt = started + LIMITS.spacingMs;
    const abort = new AbortController(); let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let response: Response | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { abort.abort(); reject(new Error('deadline')); }, LIMITS.deadlineMs);
    });
    const bound = <T>(promise: Promise<T>): Promise<T> => Promise.race([promise, deadline]);
    const stopBody = () => {
      try { if (reader) void reader.cancel().catch(() => {}); else if (response?.body) void response.body.cancel().catch(() => {}); } catch { /* no body/error disclosure */ }
    };
    try {
      response = await bound(fetcher(endpointFor(mint), {
        method: 'GET', headers: { Accept: 'application/json', 'Accept-Encoding': 'identity' },
        credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer', signal: abort.signal,
      }));
      let headerBytes = 0;
      response.headers.forEach((v, k) => { headerBytes += Buffer.byteLength(k) + Buffer.byteLength(v) + 4; });
      if (headerBytes > 16384) throw new Error('headers_limit');
      // An injected/nonconforming transport cannot silently change source or follow redirects.
      if (response.redirected || response.url !== endpointFor(mint)) throw new Error('source_mismatch');
      if (response.status === 429) {
        const received = now(); if (!validTime(received) || received < started) throw new Error('clock');
        const retry = response.headers.get('retry-after');
        let delay = 60000;
        if (retry !== null) {
          const ms = /^\d{1,6}$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - received;
          // Never shorten an unbounded/malformed provider cooldown into an allowed request.
          if (!Number.isFinite(ms) || ms < 0 || ms > 86400000) stopped = true;
          else delay = Math.max(delay, ms);
        }
        nextAt = received + delay;
        return denied('rate_limited', stopped ? 'provider_cooldown_unqualified_stop' : 'provider_429', stopped ? null : new Date(nextAt).toISOString());
      }
      if (response.status !== 200) {
        stopped = true;
        return denied('unavailable', response.status === 503 ? 'provider_503_stop' : 'provider_status_stop');
      }
      const type = response.headers.get('content-type');
      const encoding = response.headers.get('content-encoding');
      const length = response.headers.get('content-length');
      if (!type || !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(type) ||
        (encoding !== null && encoding !== 'identity') ||
        (length !== null && (!/^(?:0|[1-9]\d{0,8})$/.test(length) || Number(length) > LIMITS.bytes)) || !response.body) throw new Error('invalid_response');
      reader = response.body.getReader(); const chunks: Uint8Array[] = [];
      let size = 0, count = 0;
      while (true) {
        const part = await bound(reader.read());
        if (part.done) break;
        if (!(part.value instanceof Uint8Array) || ++count > LIMITS.chunks || (size += part.value.length) > LIMITS.bytes) throw new Error('response_limit');
        chunks.push(part.value);
      }
      if (length !== null && size !== Number(length)) throw new Error('length_mismatch');
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const retrieved = now();
      if (retrieved < lastTime) throw new Error('clock'); lastTime = retrieved;
      const snapshot = decodeObservation({ mint, bytes, requestStartedMs: started, retrievedMs: retrieved });
      // Recheck approval expiry after response, not only at dispatch.
      if (retrieved >= approval.expiresMs) throw new Error('expired_approval');
      return { state: 'ready', report: evaluatePulse(snapshot, retrieved) };
    } catch {
      stopped = true;
      return denied('unavailable', 'source_validation_or_transport_failed_stop');
    } finally {
      if (timer) clearTimeout(timer); abort.abort(); stopBody(); busy = false;
    }
  } };
}
