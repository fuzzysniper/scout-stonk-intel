import "server-only";
import type { MintFactsV1 } from "../contract";
import { failure } from "../decoder";
import { freeze, isExactPublicKey, utcMicros } from "../validation";
import type { AtomicMintStore, CacheEntry, Command, Lease, Reply } from "./distributed";
import { knownFailure } from "./distributed";
import { authentic, privateClientKey, sign, type IsolatedHeliusTarget } from "./helius";
import { API_LIMITS as L, HELIUS_HOST, POLICY_ID } from "./policy";
import { BoundaryError, deadline, demand, syntheticHeliusRead, type Clock, type Transport } from "./rpc";

export type Outcome = Readonly<{ result: MintFactsV1; retryAfter?: number }>;
export type SyntheticDependencies = Readonly<{
  target: IsolatedHeliusTarget; hmacKey: string; store: AtomicMintStore | null;
  /** Requires hosting-authenticated context, NOT caller-supplied forwarding headers. Missing => deny. */
  trustedIdentity: ((request: Request) => Promise<{ ip: string } | null>) | null;
  transport: Transport; clock: Clock;
  testDeadlineMs?: number; testStoreDeadlineMs?: number;
}>;
const cacheMessage = (e: Omit<CacheEntry, "mac">) => JSON.stringify(["cache-v1", POLICY_ID, e.mint, e.checkedAt, e.expiresAt, e.slot, e.json]);
function cachedFacts(e: CacheEntry, mint: string, now: number, highestSlot: string, secret: string): MintFactsV1 {
  demand(e && e.mint === mint && Number.isSafeInteger(e.checkedAt) && e.checkedAt <= now && e.expiresAt === e.checkedAt + L.cacheMs && now < e.expiresAt, "stale_source");
  demand(typeof e.json === "string" && e.json.length <= L.cacheBytes && new TextEncoder().encode(e.json).length <= L.cacheBytes && authentic(secret, cacheMessage(e), e.mac));
  const r = JSON.parse(e.json) as MintFactsV1;
  demand(r && r.version === "mint-facts/1" && (r.status === "verified_onchain_mint_at_slot" || r.status === "unsupported_extensions") && r.mint === mint);
  demand(r.source && r.facts.mint === mint && r.source.endpointHost === HELIUS_HOST && r.source.acquisition === "synthetic_fixture" && r.source.freshness === "fresh");
  demand(r.source.method === "getAccountInfo" && r.source.encoding === "jsonParsed" && r.source.commitment === "finalized" && r.source.slotTime === null);
  demand(utcMicros(r.source.checkedAt) === BigInt(e.checkedAt) * 1000n && r.source.checkedAt === r.source.responseReceivedAt);
  demand(/^[1-9]\d{0,15}$/.test(e.slot) && r.source.contextSlot === e.slot && /^[1-9]\d{0,15}$/.test(highestSlot) && BigInt(e.slot) <= BigInt(highestSlot));
  return freeze({ ...r, source: { ...r.source, evaluatedAt: new Date(now).toISOString() } });
}

/** Only constructed by the test-only adapter. No default transport, native fetch, env or store fallback. */
export function syntheticService(d: SyntheticDependencies): (request: Request, mint: string) => Promise<Outcome> {
  let lastWall: number | null = null, lastMono: number | null = null, locallyStopped = false;
  const wall = () => {
    const now = d.clock.now(), mono = d.clock.monotonic();
    demand(Number.isSafeInteger(now) && now >= 0 && now <= 253402300799999 && Number.isFinite(mono) && mono >= 0, "invalid_clock");
    if (lastWall !== null && lastMono !== null) demand(now >= lastWall && mono >= lastMono && Math.abs(now - lastWall - mono + lastMono) <= 1000, "invalid_clock");
    lastWall = now; lastMono = mono; return now;
  };
  const transact = async (command: Command): Promise<Reply> => {
    demand(d.store, "upstream_unavailable");
    let r: Reply;
    try { r = await deadline(d.store.transact(command), d.testStoreDeadlineMs ?? L.storeTimeoutMs, "upstream_unavailable"); }
    catch { throw new BoundaryError("upstream_unavailable"); }
    demand(r && r.policy === POLICY_ID && Number.isSafeInteger(r.now) && r.now >= 0, "invalid_response");
    const now = wall(); demand(r.now <= now && now - r.now <= 1000, "invalid_clock");
    demand(["denied", "lease", "cached", "committed"].includes(r.kind));
    if (r.kind === "denied") demand(knownFailure(r.reason) && (r.retryAfter === null || Number.isSafeInteger(r.retryAfter) && r.retryAfter >= 1 && r.retryAfter <= 3600));
    return r;
  };
  return async (request, mint) => {
    if (locallyStopped) return { result: failure(mint, "circuit_open") };
    let lease: Lease | null = null, admitted = false;
    try {
      demand(isExactPublicKey(mint), "invalid_mint"); wall(); demand(!request.signal.aborted, "timeout");
      demand(d.store, "upstream_unavailable"); demand(d.trustedIdentity, "access_denied");
      demand(typeof d.hmacKey === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(d.hmacKey), "access_denied");
      const identity = await deadline(d.trustedIdentity(request), L.storeTimeoutMs, "access_denied");
      const client = privateClientKey(identity?.ip, d.hmacKey); demand(client, "access_denied");
      const admission = await transact({ kind: "admit", policy: POLICY_ID, mint, client });
      if (admission.kind === "denied") return { result: failure(mint, admission.reason), ...(admission.retryAfter === null ? {} : { retryAfter: admission.retryAfter }) };
      admitted = true;
      if (admission.kind === "cached") return { result: cachedFacts(admission.entry, mint, admission.now, admission.highestSlot, d.hmacKey) };
      demand(admission.kind === "lease"); lease = admission.lease;
      demand(lease && Number.isSafeInteger(lease.id) && lease.id > 0 && lease.mint === mint && lease.expiresAt === admission.now + L.leaseMs);
      const observed = await syntheticHeliusRead({ mint, requestId: lease.id, target: d.target, transport: d.transport, clock: d.clock,
        signal: request.signal, deadlineMs: d.testDeadlineMs });
      let cache: CacheEntry | null = null;
      if (observed.result.source) {
        const e = { mint, json: JSON.stringify(observed.result), checkedAt: Date.parse(observed.result.source.checkedAt),
          expiresAt: Date.parse(observed.result.source.checkedAt) + L.cacheMs, slot: observed.slot };
        cache = { ...e, mac: sign(d.hmacKey, cacheMessage(e)) };
      }
      const completed = await transact({ kind: "complete", policy: POLICY_ID, lease, slot: observed.slot, cache });
      if (completed.kind === "denied") throw new BoundaryError(completed.reason);
      demand(completed.kind === "committed" && completed.leaseId === lease.id);
      return { result: cache ? cachedFacts(cache, mint, completed.now, observed.slot, d.hmacKey) : observed.result };
    } catch (error) {
      locallyStopped = true;
      const reason = error instanceof BoundaryError ? error.reason : "invalid_response";
      if (lease) {
        try { await transact({ kind: "fail", policy: POLICY_ID, lease, reason }); } catch { /* No retry/fallback; the durable lease expires into a terminal circuit. */ }
      } else if (admitted) {
        try { await transact({ kind: "stop", policy: POLICY_ID, reason }); } catch { /* No source fallback. */ }
      }
      return { result: failure(mint, reason), ...(reason === "rate_limited" ? { retryAfter: 60 } : {}) };
    }
  };
}
