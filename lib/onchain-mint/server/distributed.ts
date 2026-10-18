import "server-only";
import type { MintFailure } from "../contract";
import { isExactPublicKey } from "../validation";
import { API_LIMITS as L, POLICY_ID } from "./policy";

export type CacheEntry = Readonly<{
  mint: string; json: string; mac: string; checkedAt: number; expiresAt: number; slot: string;
}>;
export type Lease = Readonly<{ id: number; mint: string; expiresAt: number }>;
export type Command =
  | Readonly<{ kind: "admit"; policy: string; mint: string; client: string }>
  | Readonly<{ kind: "complete"; policy: string; lease: Lease; slot: string; cache: CacheEntry | null }>
  | Readonly<{ kind: "fail"; policy: string; lease: Lease; reason: MintFailure }>
  | Readonly<{ kind: "stop"; policy: string; reason: MintFailure }>;
export type Reply = Readonly<{ policy: string; now: number }> & (
  | Readonly<{ kind: "denied"; reason: MintFailure; retryAfter: number | null }>
  | Readonly<{ kind: "lease"; lease: Lease }>
  | Readonly<{ kind: "cached"; entry: CacheEntry; highestSlot: string }>
  | Readonly<{ kind: "committed"; leaseId: number }>
);
/** A real adapter MUST serialize commands durably and use authoritative store time per command.
 * Production uses PostgreSQL row locking + synchronous commit; missing/ambiguous state => no RPC.
 * Enforced expiry, fencing and budgets must span ALL instances/regions; memory is insufficient.
 */
export type AtomicMintStore = Readonly<{ transact(command: Command): Promise<Reply> }>;

export type ReferenceState = {
  policy: string; lastClock: number; circuit: MintFailure | null; sequence: number;
  lease: Lease | null; highestSlot: string; lastRpc: number | null;
  minute: number; reads: number; rpcMinute: number; day: number; rpcDay: number;
  clients: Map<string, { minute: number; reads: number; lastSeen: number }>;
  cache: Map<string, CacheEntry>;
};
/** SYNTHETIC REFERENCE MODEL only, not a distributed service or a production fallback. */
export function initialReferenceState(): ReferenceState {
  return { policy: POLICY_ID, lastClock: 0, circuit: null, sequence: 0, lease: null, highestSlot: "0", lastRpc: null,
    minute: -1, reads: 0, rpcMinute: 0, day: -1, rpcDay: 0, clients: new Map(), cache: new Map() };
}
const integer = (n: number, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n >= 0 && n <= max;
const slot = (value: string) => /^(?:0|[1-9]\d{0,15})$/.test(value) && BigInt(value) <= BigInt(Number.MAX_SAFE_INTEGER);
const CIRCUITS = new Set<MintFailure>(["disabled", "server_only", "invalid_mint", "admission_limited", "development_budget", "circuit_open", "timeout", "access_denied", "rate_limited", "upstream_unavailable", "network_unavailable", "invalid_response", "response_too_large", "rpc_error", "stale_source", "invalid_clock", "not_found", "wrong_owner", "not_mint", "uninitialized", "unparsed_account"]);
export function knownFailure(value: unknown): value is MintFailure { return typeof value === "string" && CIRCUITS.has(value as MintFailure); }
function validState(s: ReferenceState): boolean {
  if (!integer(s.lastClock, 253402300799999) || !integer(s.sequence) || !slot(s.highestSlot) || s.circuit !== null && !CIRCUITS.has(s.circuit)) return false;
  if (!Number.isSafeInteger(s.minute) || s.minute < -1 || s.minute > Math.floor(s.lastClock / 60000) || !Number.isSafeInteger(s.day) || s.day < -1 || s.day > Math.floor(s.lastClock / 86400000)) return false;
  if (!integer(s.reads, L.globalReadsPerMinute) || !integer(s.rpcMinute, L.rpcPerMinute) || !integer(s.rpcDay, L.rpcPerUtcDay) || s.lastRpc !== null && (!integer(s.lastRpc) || s.lastRpc > s.lastClock)) return false;
  if (!(s.clients instanceof Map) || s.clients.size > L.clients || !(s.cache instanceof Map) || s.cache.size > L.cacheEntries) return false;
  for (const [key, c] of s.clients) if (!/^[a-f0-9]{64}$/.test(key) || !integer(c.minute, Math.floor(s.lastClock / 60000)) || !integer(c.reads, L.clientReadsPerMinute) || !integer(c.lastSeen, s.lastClock)) return false;
  for (const [mint, e] of s.cache) if (!isExactPublicKey(mint) || e.mint !== mint || !slot(e.slot) || BigInt(e.slot) > BigInt(s.highestSlot) || !integer(e.checkedAt, s.lastClock) || e.expiresAt !== e.checkedAt + L.cacheMs || typeof e.json !== "string" || e.json.length > L.cacheBytes || new TextEncoder().encode(e.json).length > L.cacheBytes || !/^[a-f0-9]{64}$/.test(e.mac)) return false;
  const lease = s.lease;
  return lease === null || integer(lease.id) && lease.id > 0 && lease.id === s.sequence && isExactPublicKey(lease.mint) && s.lastRpc !== null && lease.expiresAt === s.lastRpc + L.leaseMs;
}
/** Execute atomically with store-owned UTC milliseconds. Tests serialize through one reference service. */
export function referenceTransaction(s: ReferenceState, c: Command, now: number): Reply {
  const base = { policy: POLICY_ID, now };
  const deny = (reason: MintFailure, retryAfter: number | null = null): Reply => ({ ...base, kind: "denied", reason, retryAfter });
  const trip = (reason: MintFailure): Reply => { s.circuit = reason; s.cache = new Map(); s.lease = null; return deny(reason); };
  if (s.policy !== POLICY_ID || c.policy !== POLICY_ID) return trip("invalid_response");
  try { if (!validState(s)) return trip("invalid_response"); } catch { return trip("invalid_response"); }
  if (!Number.isSafeInteger(now) || now < s.lastClock || now > 253402300799999) return trip("invalid_clock");
  s.lastClock = now;
  for (const [mint, entry] of s.cache) if (now >= entry.expiresAt) s.cache.delete(mint);
  for (const [client, value] of s.clients) if (now - value.lastSeen >= L.clientRetentionMs) s.clients.delete(client);
  if (s.circuit) return deny("circuit_open");
  if (c.kind === "stop") return trip(CIRCUITS.has(c.reason) ? c.reason : "invalid_response");
  // Never reclaim an ambiguous expired lease: a prior worker may still have an outstanding RPC.
  if (s.lease && now >= s.lease.expiresAt) return trip("circuit_open");
  if (c.kind === "fail") {
    if (!s.lease || s.lease.id !== c.lease.id || s.lease.mint !== c.lease.mint) return trip("invalid_response");
    return trip(knownFailure(c.reason) ? c.reason : "invalid_response");
  }
  if (c.kind === "complete") {
    if (!s.lease || s.lease.id !== c.lease.id || s.lease.mint !== c.lease.mint || s.lease.expiresAt !== c.lease.expiresAt) return trip("invalid_response");
    if (!/^[1-9]\d{0,15}$/.test(c.slot) || BigInt(c.slot) > BigInt(Number.MAX_SAFE_INTEGER)) return trip("invalid_response");
    if (BigInt(c.slot) < BigInt(s.highestSlot)) return trip("stale_source");
    if (c.cache) {
      const e = c.cache;
      if (e.mint !== s.lease.mint || e.slot !== c.slot || !Number.isSafeInteger(e.checkedAt) || e.checkedAt > now || now - e.checkedAt > L.cacheMs || e.expiresAt !== e.checkedAt + L.cacheMs || now >= e.expiresAt || typeof e.json !== "string" || e.json.length > L.cacheBytes || new TextEncoder().encode(e.json).length > L.cacheBytes || !/^[a-f0-9]{64}$/.test(e.mac)) return trip("stale_source");
      if (s.cache.size >= L.cacheEntries) s.cache.delete(s.cache.keys().next().value!);
      s.cache.set(e.mint, e);
    }
    s.highestSlot = c.slot; s.lease = null;
    return { ...base, kind: "committed", leaseId: c.lease.id };
  }
  const minute = Math.floor(now / 60000), day = Math.floor(now / 86400000);
  if (!isExactPublicKey(c.mint)) return deny("invalid_response");
  if (s.minute !== minute) { s.minute = minute; s.reads = 0; s.rpcMinute = 0; }
  if (s.day !== day) { s.day = day; s.rpcDay = 0; }
  if (s.reads >= L.globalReadsPerMinute) return deny("admission_limited", 60 - Math.floor(now % 60000 / 1000));
  let client = s.clients.get(c.client);
  if (!/^[a-f0-9]{64}$/.test(c.client)) return deny("access_denied");
  if (!client) {
    if (s.clients.size >= L.clients) return deny("admission_limited", 120);
    client = { minute, reads: 0, lastSeen: now }; s.clients.set(c.client, client);
  }
  if (client.minute !== minute) { client.minute = minute; client.reads = 0; }
  if (client.reads >= L.clientReadsPerMinute) return deny("admission_limited", 60 - Math.floor(now % 60000 / 1000));
  client.reads++; client.lastSeen = now; s.reads++;
  const entry = s.cache.get(c.mint);
  if (entry) return { ...base, kind: "cached", entry, highestSlot: s.highestSlot };
  if (s.lease) return deny("admission_limited", 7);
  if (s.rpcDay >= L.rpcPerUtcDay) return deny("admission_limited", 3600);
  if (s.rpcMinute >= L.rpcPerMinute) return deny("admission_limited", 60 - Math.floor(now % 60000 / 1000));
  if (s.lastRpc !== null && now - s.lastRpc < L.minimumRpcIntervalMs) return deny("admission_limited", Math.ceil((L.minimumRpcIntervalMs - now + s.lastRpc) / 1000));
  if (!Number.isSafeInteger(s.sequence + 1)) return trip("invalid_response");
  const lease = { id: ++s.sequence, mint: c.mint, expiresAt: now + L.leaseMs };
  s.lease = lease; s.lastRpc = now; s.rpcMinute++; s.rpcDay++;
  return { ...base, kind: "lease", lease };
}
