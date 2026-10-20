import "server-only";
import type { MintFactsV1 } from "../contract";
import { failure } from "../decoder";
import { freeze, isExactPublicKey, utcMicros } from "../validation";
import type { AtomicMintStore, CacheEntry, Command, Lease, Reply } from "./distributed";
import { knownFailure } from "./distributed";
import { authentic, privateClientKey, sign, type IsolatedHeliusTarget } from "./helius";
import { API_LIMITS as L, HELIUS_HOST, POLICY_ID } from "./policy";
import { BoundaryError, deadline, demand, heliusRead, type Clock, type Transport } from "./rpc";
import { TOKEN_PROGRAM } from "../policy";

export type Outcome = Readonly<{ result: MintFactsV1; retryAfter?: number; delivery?: "rpc" | "cache" }>;
export type SyntheticDependencies = Readonly<{
  target: IsolatedHeliusTarget; hmacKey: string; store: AtomicMintStore | null;
  /** Requires hosting-authenticated context, NOT caller-supplied forwarding headers. Missing => deny. */
  trustedIdentity: ((request: Request) => Promise<{ ip: string } | null>) | null;
  transport: Transport; clock: Clock;
  testDeadlineMs?: number; testStoreDeadlineMs?: number;
}>;
export type Profile = Readonly<{ policy: string; acquisition: "synthetic_fixture" | "production_rpc"; leaseMs: number; storeTimeoutMs: number;
  lookupSession?: Readonly<{ purpose: "proof" | "public"; notBeforeMs: number; expiresAtMs: number }>;
  canary?: Readonly<{ mint: string; maxLeaseId: number; notBeforeMs: number; expiresAtMs: number }> }>;
function canaryGate(profile: Profile, mint: string, now: number, lease?: Lease): void {
  const session=profile.lookupSession;
  if(session)demand(now>=session.notBeforeMs && now<session.expiresAtMs,"disabled");
  const c=profile.canary; if(!c)return;
  demand(mint===c.mint, "disabled");
  demand(now>=c.notBeforeMs && now<c.expiresAtMs, "disabled");
  if(lease)demand(lease.id<=c.maxLeaseId, "admission_limited");
}
function canaryFacts(profile: Profile, result: MintFactsV1): void {
  if(!profile.canary)return;
  demand(result.status==="verified_onchain_mint_at_slot", "invalid_response");
  demand(result.mint===profile.canary.mint && result.facts.program==="spl_token" && result.facts.ownerProgram===TOKEN_PROGRAM &&
    result.facts.supply.decimals===6 && result.facts.extensions.assessment==="none", "invalid_response");
}
const cacheMessage = (e: Omit<CacheEntry, "mac">, policy: string) => JSON.stringify(["cache-v1", policy, e.mint, e.checkedAt, e.expiresAt, e.slot, e.json]);
function cachedFacts(e: CacheEntry, mint: string, now: number, highestSlot: string, secret: string, profile: Profile): MintFactsV1 {
  demand(e && e.mint === mint && Number.isSafeInteger(e.checkedAt) && e.checkedAt <= now && e.expiresAt === e.checkedAt + L.cacheMs && now < e.expiresAt, "stale_source");
  demand(typeof e.json === "string" && e.json.length <= L.cacheBytes && new TextEncoder().encode(e.json).length <= L.cacheBytes && authentic(secret, cacheMessage(e, profile.policy), e.mac));
  const r = JSON.parse(e.json) as MintFactsV1;
  demand(r && r.version === "mint-facts/1" && (r.status === "verified_onchain_mint_at_slot" || r.status === "unsupported_extensions") && r.mint === mint);
  demand(r.source && r.facts.mint === mint && r.source.endpointHost === HELIUS_HOST && r.source.acquisition === profile.acquisition && r.source.freshness === "fresh");
  demand(r.source.method === "getAccountInfo" && r.source.encoding === "jsonParsed" && r.source.commitment === "finalized" && r.source.slotTime === null);
  demand(utcMicros(r.source.checkedAt) === BigInt(e.checkedAt) * 1000n && r.source.checkedAt === r.source.responseReceivedAt);
  demand(/^[1-9]\d{0,15}$/.test(e.slot) && r.source.contextSlot === e.slot && /^[1-9]\d{0,15}$/.test(highestSlot) && BigInt(e.slot) <= BigInt(highestSlot));
  return freeze({ ...r, source: { ...r.source, evaluatedAt: new Date(now).toISOString() } });
}

/** Explicit server construction only. No default transport, env or store fallback. */
export function mintService(d: SyntheticDependencies, profile: Profile): (request: Request, mint: string) => Promise<Outcome> {
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
    try { r = await deadline(d.store.transact(command), d.testStoreDeadlineMs ?? profile.storeTimeoutMs, "upstream_unavailable"); }
    catch { throw new BoundaryError("upstream_unavailable"); }
    demand(r && r.policy === profile.policy && Number.isSafeInteger(r.now) && r.now >= 0, "invalid_response");
    const now = wall(); demand(r.now <= now && now - r.now <= 1000, "invalid_clock");
    demand(["denied", "lease", "cached", "committed"].includes(r.kind));
    if (r.kind === "denied") demand(knownFailure(r.reason) && (r.retryAfter === null || Number.isSafeInteger(r.retryAfter) && r.retryAfter >= 1 && r.retryAfter <= 3600));
    return r;
  };
  return async (request, mint) => {
    if (locallyStopped) return { result: failure(mint, "circuit_open") };
    let lease: Lease | null = null, admitted = false;
    try {
      demand(isExactPublicKey(mint), "invalid_mint"); canaryGate(profile,mint,wall()); demand(!request.signal.aborted, "timeout");
      demand(d.store, "upstream_unavailable"); demand(d.trustedIdentity, "access_denied");
      demand(typeof d.hmacKey === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(d.hmacKey), "access_denied");
      const identity = await deadline(d.trustedIdentity(request), L.storeTimeoutMs, "access_denied");
      const client = privateClientKey(identity?.ip, d.hmacKey); demand(client, "access_denied");
      const admission = await transact({ kind: "admit", policy: profile.policy, mint, client,
        ...(profile.lookupSession ? {authorization:profile.lookupSession} : {}) });
      if (admission.kind === "denied") return { result: failure(mint, admission.reason), ...(admission.retryAfter === null ? {} : { retryAfter: admission.retryAfter }) };
      admitted = true;
      if(profile.lookupSession)canaryGate(profile,mint,wall());
      if (admission.kind === "cached") {
        const result=cachedFacts(admission.entry, mint, admission.now, admission.highestSlot, d.hmacKey, profile);
        canaryFacts(profile,result); return {result,delivery:"cache"};
      }
      demand(admission.kind === "lease"); lease = admission.lease;
      demand(lease && Number.isSafeInteger(lease.id) && lease.id > 0 && lease.mint === mint && lease.expiresAt === admission.now + profile.leaseMs);
      // The SQL sequence is durable, monotonic and never reset by UTC rollover/cache expiry.
      // Rejecting lease >1 here can charge admission, but can NEVER authorize a second RPC.
      canaryGate(profile,mint,wall(),lease);
      const observed = await heliusRead({ mint, requestId: lease.id, target: d.target, transport: d.transport, clock: d.clock,
        signal: request.signal, acquisition: profile.acquisition, deadlineMs: d.testDeadlineMs });
      if(profile.lookupSession)canaryGate(profile,mint,wall(),lease);
      canaryFacts(profile,observed.result);
      let cache: CacheEntry | null = null;
      if (observed.result.source) {
        const e = { mint, json: JSON.stringify(observed.result), checkedAt: Date.parse(observed.result.source.checkedAt),
          expiresAt: Date.parse(observed.result.source.checkedAt) + L.cacheMs, slot: observed.slot };
        cache = { ...e, mac: sign(d.hmacKey, cacheMessage(e, profile.policy)) };
      }
      const completed = await transact({ kind: "complete", policy: profile.policy, lease, slot: observed.slot, cache });
      if (completed.kind === "denied") throw new BoundaryError(completed.reason);
      demand(completed.kind === "committed" && completed.leaseId === lease.id);
      if(profile.lookupSession)canaryGate(profile,mint,wall(),lease);
      return { result: cache ? cachedFacts(cache, mint, completed.now, observed.slot, d.hmacKey, profile) : observed.result, delivery:"rpc" };
    } catch (error) {
      locallyStopped = true;
      const reason = error instanceof BoundaryError ? error.reason : "invalid_response";
      if (lease) {
        try { await transact({ kind: "fail", policy: profile.policy, lease, reason }); } catch { /* No retry/fallback; the durable lease expires into a terminal circuit. */ }
      } else if (admitted) {
        try { await transact({ kind: "stop", policy: profile.policy, reason }); } catch { /* No source fallback. */ }
      }
      return { result: failure(mint, reason), ...(reason === "rate_limited" ? { retryAfter: 60 } : {}) };
    }
  };
}
export const syntheticService = (d: SyntheticDependencies) => mintService(d, { policy: POLICY_ID, acquisition: "synthetic_fixture", leaseMs: L.leaseMs, storeTimeoutMs: L.storeTimeoutMs });
