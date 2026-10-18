import assert from "node:assert/strict";
import { test } from "node:test";
import { system, MINT, OTHER, THIRD, FOURTH, envelope, response, L, POLICY_ID, initialReferenceState, referenceTransaction, TIME } from "./fixtures.mjs";
const read = async (h, request) => { const r = await h(request); return { status: r.status, body: await r.json(), retry: r.headers.get("retry-after") }; };
test("two horizontally distinct workers share ONE atomic lease; concurrent cold misses never duplicate RPC", async () => {
  let release;
  const s = system({ rpc: (_, init) => new Promise(resolve => { release = () => { const e = envelope(); e.id = JSON.parse(init.body).id; resolve(response(e)); }; }) });
  const a = read(s.handler, s.request());
  while (!release) await new Promise(resolve => setImmediate(resolve));
  const b = await read(s.replica(), s.request(OTHER));
  assert.equal(b.status, 429); assert.equal(b.body.reason, "admission_limited"); assert.equal(b.retry, "7");
  assert.equal(s.calls.rpc.length, 1); release(); assert.equal((await a).status, 200); assert.equal(s.state.lease, null);
});
test("warm cache crosses workers, preserves hash/receipt/slot, advances evaluation without renewing expiry", async () => {
  const s = system(), a = await read(s.handler, s.request()); const entry = s.state.cache.get(MINT);
  s.advance(29999); const b = await read(s.replica(), s.request());
  assert.equal(a.status, 200); assert.equal(b.status, 200); assert.equal(s.calls.rpc.length, 1);
  for (const key of ["checkedAt", "responseReceivedAt", "contextSlot", "responseSha256"]) assert.equal(a.body.source[key], b.body.source[key]);
  assert.notEqual(a.body.source.evaluatedAt, b.body.source.evaluatedAt); assert.equal(s.state.cache.get(MINT).expiresAt, entry.expiresAt);
});
test("cache expires at its exact deadline; expiry causes bounded reacquisition, never stale fallback", async () => {
  const s = system(); await s.handler(s.request()); s.advance(L.cacheMs);
  const b = await read(s.replica(), s.request()); assert.equal(b.status, 200); assert.equal(s.calls.rpc.length, 2);
  assert.equal(b.body.source.checkedAt, new Date(Date.parse(TIME) + L.cacheMs).toISOString());
});
test("newer slot accepted; later lower slot rejected, never cached or published as fresh", async () => {
  let slot = 400000001;
  const s = system({ rpc: (_, init) => { const e = envelope(); e.id = JSON.parse(init.body).id; e.result.context.slot = slot; return response(e); } });
  await s.handler(s.request()); s.advance(10000); slot++;
  const newer = await read(s.replica(), s.request(OTHER)); assert.equal(newer.status, 200); assert.equal(newer.body.source.contextSlot, String(slot));
  s.advance(10000); slot--; const older = await read(s.replica(), s.request(THIRD));
  assert.equal(older.status, 503); assert.equal(older.body.reason, "stale_source"); assert.equal(older.body.facts, null); assert.equal(s.state.cache.size, 0);
  assert.equal((await read(s.handler, s.request())).body.reason, "circuit_open");
});
test("a bounded earlier cached snapshot is truthful with its original clock even after another mint advances slot", async () => {
  let slot = 400000001;
  const s = system({ rpc: (_, init) => { const e = envelope(); e.id = JSON.parse(init.body).id; e.result.context.slot = slot++; return response(e); } });
  await s.handler(s.request()); s.advance(10000); await s.replica()(s.request(OTHER));
  const cached = await read(s.replica(), s.request()); assert.equal(cached.status, 200); assert.equal(cached.body.source.contextSlot, "400000001"); assert.equal(cached.body.source.checkedAt, TIME);
});
test("per-client + global RPC windows, 10s spacing and shared admission survive creation of new workers", async () => {
  const s = system(); await s.handler(s.request());
  let r = await read(s.replica(), s.request(OTHER)); assert.equal(r.status, 429); assert.equal(r.retry, "10");
  s.advance(9999); r = await read(s.replica(), s.request(OTHER)); assert.equal(r.retry, "1");
  s.advance(1); assert.equal((await read(s.replica(), s.request(OTHER))).status, 200);
  s.advance(10000); assert.equal((await read(s.replica(), s.request(THIRD))).status, 200);
  s.advance(10000); r = await read(s.replica(), s.request(FOURTH)); assert.equal(r.status, 429); assert.equal(s.calls.rpc.length, 3);
});
test("failed source refresh clears cache across workers and never serves stale-on-error", async () => {
  let bad = false;
  const s = system({ rpc: (_, init) => { if (bad) return new Response("SECRET", { status: 503 }); const e = envelope(); e.id = JSON.parse(init.body).id; return response(e); } });
  await s.handler(s.request()); s.advance(30000); bad = true;
  assert.equal((await read(s.replica(), s.request())).status, 503); assert.equal(s.state.cache.size, 0);
  assert.equal((await read(s.handler, s.request())).body.reason, "circuit_open"); assert.equal(s.calls.rpc.length, 2);
});
test("cache corruption/MAC, mint/clock swap, future timestamp or oversized payload fail closed globally", async () => {
  for (const mutate of [e => ({ ...e, mac: "0".repeat(64) }), e => ({ ...e, mint: OTHER }), e => ({ ...e, checkedAt: e.checkedAt + 1, expiresAt: e.expiresAt + 1 }), e => ({ ...e, json: "x".repeat(L.cacheBytes + 1) }), e => ({ ...e, json: e.json.replace("18446744073709551615", "0") })]) {
    const s = system(); await s.handler(s.request()); s.state.cache.set(MINT, mutate(s.state.cache.get(MINT)));
    const out = await read(s.replica(), s.request()); assert.equal(out.status >= 500, true); assert.equal(out.body.facts, null); assert.equal(s.calls.rpc.length, 1);
    assert.equal((await read(s.handler, s.request())).body.reason, "circuit_open");
  }
});
test("missing/failing/unresponsive store denies before any RPC, no memory fallback", async () => {
  for (const store of [() => { throw new Error("SECRET"); }, () => new Promise(() => {})]) {
    const s = system({ store, deps: { testStoreDeadlineMs: 15 } }), out = await read(s.handler, s.request());
    assert.equal(out.status, 503); assert.equal(out.body.reason, "upstream_unavailable"); assert.equal(s.calls.rpc.length, 0); assert.ok(!JSON.stringify(out.body).includes("SECRET"));
  }
});
test("ambiguous reserve can consume quota but NEVER authorizes RPC; expired reservation stops all workers", async () => {
  const s = system({ store: (c, state, now) => { referenceTransaction(state, c, now); return new Promise(() => {}); }, deps: { testStoreDeadlineMs: 15 } });
  assert.equal((await read(s.handler, s.request())).status, 503); assert.equal(s.calls.rpc.length, 0); assert.equal(s.state.rpcDay, 1);
  s.advance(L.leaseMs);
  const out = referenceTransaction(s.state, { kind: "admit", policy: POLICY_ID, mint: OTHER, client: "a".repeat(64) }, Date.parse(TIME) + L.leaseMs);
  assert.equal(out.kind, "denied"); assert.equal(out.reason, "circuit_open"); assert.equal(s.state.lease, null);
});
test("expired lease fencing rejects late completion and prevents overlapping retry", async () => {
  const state = initialReferenceState(), now = Date.parse(TIME);
  const a = referenceTransaction(state, { kind: "admit", policy: POLICY_ID, mint: MINT, client: "a".repeat(64) }, now);
  const b = referenceTransaction(state, { kind: "admit", policy: POLICY_ID, mint: OTHER, client: "b".repeat(64) }, now + L.leaseMs);
  assert.equal(b.kind, "denied"); assert.equal(b.reason, "circuit_open");
  const late = referenceTransaction(state, { kind: "complete", policy: POLICY_ID, lease: a.lease, slot: "400000001", cache: null }, now + L.leaseMs);
  assert.equal(late.kind, "denied"); assert.equal(state.highestSlot, "0"); assert.equal(state.rpcDay, 1);
});
test("wrong lease/epoch, backward authoritative store clock or corrupt counter fail closed", () => {
  for (const kind of ["lease", "policy", "clock", "sequence"]) {
    const s = initialReferenceState(), now = Date.parse(TIME), c = { kind: "admit", policy: POLICY_ID, mint: MINT, client: "a".repeat(64) };
    if (kind === "sequence") { s.sequence = Number.MAX_SAFE_INTEGER; assert.equal(referenceTransaction(s, c, now).kind, "denied"); continue; }
    const a = referenceTransaction(s, c, now);
    const r = kind === "lease" ? referenceTransaction(s, { kind: "complete", policy: POLICY_ID, lease: { ...a.lease, id: 99 }, slot: "400000001", cache: null }, now)
      : referenceTransaction(s, { ...c, policy: kind === "policy" ? "wrong-epoch" : POLICY_ID }, kind === "clock" ? now - 1 : now);
    assert.equal(r.kind, "denied"); assert.equal(s.cache.size, 0); assert.equal(s.lease, null);
  }
});
test("malformed or forged distributed replies never authorize I/O or leak arbitrary reason", async () => {
  for (const store of [() => null, () => ({ policy: "wrong", now: Date.parse(TIME), kind: "lease", lease: { id: 1, mint: MINT, expiresAt: Date.parse(TIME) + L.leaseMs } }),
    () => ({ policy: POLICY_ID, now: Date.parse(TIME), kind: "denied", reason: "SECRET_URL", retryAfter: null }),
    () => ({ policy: POLICY_ID, now: Date.parse(TIME), kind: "lease", lease: { id: 1, mint: OTHER, expiresAt: Date.parse(TIME) + L.leaseMs } })]) {
    const s = system({ store }), out = await read(s.handler, s.request()); assert.equal(out.status, 502); assert.equal(s.calls.rpc.length, 0); assert.ok(!JSON.stringify(out.body).includes("SECRET_URL"));
  }
});
test("ambiguous completion is withheld from caller even if source response was valid", async () => {
  const s = system({ store: (c, state, now) => { const r = referenceTransaction(state, c, now); if (c.kind === "complete") throw new Error("lost response"); return r; } });
  const out = await read(s.handler, s.request()); assert.equal(out.status, 503); assert.equal(out.body.facts, null); assert.equal(s.calls.rpc.length, 1);
  assert.equal((await read(s.replica(), s.request())).body.reason, "circuit_open");
});
test("clock faults fail before refresh or cached serving, never renew check time", async () => {
  for (const jump of [s => s.wallJump(-1), s => s.wallJump(1001), s => s.monoJump(-1)]) {
    const s = system(); await s.handler(s.request()); jump(s); const out = await read(s.handler, s.request());
    assert.equal(out.status, 503); assert.equal(out.body.reason, "invalid_clock"); assert.equal(out.body.facts, null); assert.equal(s.calls.rpc.length, 1);
  }
});
test("future/old authoritative store clocks denied before source request", async () => {
  for (const difference of [-1001, 1]) {
    const s = system({ store: (c, state, now) => referenceTransaction(state, c, now + difference) });
    const out = await read(s.handler, s.request()); assert.equal(out.status, 503); assert.equal(out.body.reason, "invalid_clock"); assert.equal(s.calls.rpc.length, 0);
  }
});
test("day budget and request/bucket/cache bounds are explicit, no refill on worker restart", () => {
  const now = Date.parse(TIME), command = { kind: "admit", policy: POLICY_ID, mint: MINT, client: "a".repeat(64) };
  const daily = initialReferenceState(); daily.lastClock = now; daily.day = Math.floor(now / 86400000); daily.rpcDay = L.rpcPerUtcDay;
  assert.equal(referenceTransaction(daily, command, now).reason, "admission_limited"); assert.equal(daily.lease, null);
  const reads = initialReferenceState(); reads.lastClock = now; reads.minute = Math.floor(now / 60000); reads.reads = L.globalReadsPerMinute;
  assert.equal(referenceTransaction(reads, command, now).reason, "admission_limited");
  const capacity = initialReferenceState();
  capacity.lastClock = now;
  for (let i = 0; i < L.clients; i++) capacity.clients.set(i.toString(16).padStart(64, "0"), { minute: Math.floor(now / 60000), reads: 0, lastSeen: now });
  assert.equal(referenceTransaction(capacity, command, now).kind, "denied"); assert.equal(capacity.clients.size, L.clients);
  const later = referenceTransaction(capacity, command, now + L.clientRetentionMs); assert.equal(later.kind, "lease"); assert.equal(capacity.clients.size, 1);
  const bounded = initialReferenceState(); bounded.lastClock = now; bounded.highestSlot = "400000001";
  for (let i = 0; i < L.cacheEntries; i++) { const mint = "1".repeat(31) + "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"[i]; bounded.cache.set(mint, { mint, json: "{}", mac: "a".repeat(64), slot: "400000001", checkedAt: now, expiresAt: now + L.cacheMs }); }
  const admitted = referenceTransaction(bounded, command, now);
  const cache = { mint: MINT, json: "{}", mac: "a".repeat(64), slot: "400000002", checkedAt: now, expiresAt: now + L.cacheMs };
  referenceTransaction(bounded, { kind: "complete", policy: POLICY_ID, lease: admitted.lease, slot: cache.slot, cache }, now);
  assert.equal(bounded.cache.size, L.cacheEntries);
});
test("corrupt durable counters/types cannot reset quota or authorize a source call", () => {
  for (const [key, value] of [["rpcDay", NaN], ["rpcDay", -1], ["rpcMinute", 99], ["reads", -1], ["lastClock", Infinity], ["highestSlot", "SECRET"], ["minute", 999999999999999], ["cache", null], ["clients", null]]) {
    const state = initialReferenceState(); state[key] = value;
    const r = referenceTransaction(state, { kind: "admit", policy: POLICY_ID, mint: MINT, client: "a".repeat(64) }, Date.parse(TIME));
    assert.equal(r.kind, "denied"); assert.equal(r.reason, "invalid_response"); assert.equal(state.lease, null);
  }
});
test("aborted request does not reach provider; identity timeout fails closed", async () => {
  const controller = new AbortController(); controller.abort();
  const s = system(), out = await read(s.handler, s.request(MINT, { signal: controller.signal }));
  assert.equal(out.status, 504); assert.equal(s.calls.rpc.length, 0);
  const identity = system({ deps: { trustedIdentity: () => new Promise(() => {}) } });
  assert.equal((await read(identity.handler, identity.request())).status, 503); assert.equal(identity.calls.rpc.length, 0);
});
