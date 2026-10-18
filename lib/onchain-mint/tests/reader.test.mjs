import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { MINT, OTHER, THIRD, FOURTH, TIME, envelope, response } from "./fixtures.mjs";
const require = createRequire(import.meta.url);
const { createMintFactsReader } = require(`${process.env.MINT_TEST_BUILD}/index.js`);
const { syntheticReader } = require(`${process.env.MINT_TEST_BUILD}/testing.js`);
const { LIMITS, PUBLIC_RPC_ENDPOINT } = require(`${process.env.MINT_TEST_BUILD}/policy.js`);
const { boundedReader, newAdmission } = require(`${process.env.MINT_TEST_BUILD}/reader-core.js`);
function harness(transport) {
  let wall = Date.parse(TIME), mono = 0;
  const calls = [];
  const deps = { now: () => wall, monotonic: () => mono, transport: async (url, init) => {
    calls.push({ url, init });
    if (transport) return transport(url, init);
    const e = envelope(); e.id = JSON.parse(init.body).id; return response(e);
  } };
  return { reader: syntheticReader(deps), calls, deps,
    advance(ms) { wall += ms; mono += ms; }, wallJump(ms) { wall += ms; }, monoJump(ms) { mono += ms; } };
}
test("disabled default/production/unset/test and browser profiles perform zero I/O", async () => {
  const originalEnv = process.env.NODE_ENV, originalFetch = globalThis.fetch;
  let calls = 0; globalThis.fetch = async () => { calls++; throw new Error("must not fetch"); };
  try {
    for (const env of [undefined, "test", "production", "development"]) {
      if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env;
      assert.equal((await createMintFactsReader().readMint(MINT)).reason, "disabled");
      if (env !== "development") assert.equal((await createMintFactsReader({ developmentFeasibility: true }).readMint(MINT)).reason, "disabled");
    }
    for (const value of ["true", 1, {}, false]) assert.equal((await createMintFactsReader({ developmentFeasibility: value }).readMint(MINT)).reason, "disabled");
    globalThis.window = {}; process.env.NODE_ENV = "development";
    assert.equal((await createMintFactsReader({ developmentFeasibility: true }).readMint(MINT)).reason, "server_only");
    assert.equal(calls, 0);
  } finally { delete globalThis.window; globalThis.fetch = originalFetch; if (originalEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalEnv; }
});
test("only one exact input and fixed finalized jsonParsed POST, no auth/cookies/redirects/transactions", async () => {
  const h = harness(), r = await h.reader.readMint(MINT);
  assert.equal(r.status, "verified_onchain_mint_at_slot"); assert.equal(r.source.acquisition, "synthetic_fixture");
  assert.equal(h.calls.length, 1);
  const { url, init } = h.calls[0]; assert.equal(url, "https://api.mainnet-beta.solana.com/");
  assert.deepEqual(JSON.parse(init.body), { jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [MINT, { encoding: "jsonParsed", commitment: "finalized" }] });
  assert.equal(init.method, "POST"); assert.equal(init.redirect, "error"); assert.equal(init.credentials, "omit"); assert.equal(init.cache, "no-store");
  assert.equal(init.referrerPolicy, "no-referrer"); assert.deepEqual(init.headers, { "content-type": "application/json", accept: "application/json" });
  assert.ok(init.signal instanceof AbortSignal); assert.equal(r.source.endpointHost, "api.mainnet-beta.solana.com");
});
test("mint injection/ticker/case/URL/batch invalid before any admission or network", async () => {
  const h = harness();
  for (const mint of ["SI", "https://evil.test/?key=SECRET", MINT + "?endpoint=evil", [MINT], {}, null, " " + MINT, MINT + "\n", "STORKCOIN"]) {
    assert.equal((await h.reader.readMint(mint)).reason, "invalid_mint");
  }
  assert.equal(h.calls.length, 0); assert.equal((await h.reader.readMint(MINT)).status, "verified_onchain_mint_at_slot");
});
test("serial admission prevents overlapping requests, including same mint", async () => {
  let release; const h = harness(() => new Promise(resolve => { release = resolve; }));
  const first = h.reader.readMint(MINT);
  assert.equal((await h.reader.readMint(OTHER)).reason, "admission_limited");
  assert.equal((await h.reader.readMint(MINT)).reason, "admission_limited");
  release(response()); await first; assert.equal(h.calls.length, 1);
});
test("10s rate spacing and three attempts hard cap even across reader instances sharing process admission", async () => {
  const h = harness(), admission = newAdmission();
  const first = boundedReader({ ...h.deps, acquisition: "synthetic_fixture" }, admission);
  const second = boundedReader({ ...h.deps, acquisition: "synthetic_fixture" }, admission);
  await first.readMint(MINT);
  assert.equal((await second.readMint(OTHER)).reason, "admission_limited");
  h.advance(9999); assert.equal((await second.readMint(OTHER)).reason, "admission_limited");
  h.advance(1); assert.equal((await second.readMint(OTHER)).status, "verified_onchain_mint_at_slot");
  h.advance(10000); await first.readMint(THIRD);
  h.advance(10000); assert.equal((await second.readMint(FOURTH)).reason, "development_budget");
  assert.equal(h.calls.length, 3); assert.equal(admission.attempts, 3); assert.ok(admission.cache.size <= 3);
});
test("cache preserves source receipt/hash/slot, updates evaluation only, expires without stale fallback", async () => {
  const h = harness(); const one = await h.reader.readMint(MINT);
  h.advance(30000); const hit = await h.reader.readMint(MINT);
  assert.equal(hit.source.checkedAt, one.source.checkedAt); assert.equal(hit.source.responseSha256, one.source.responseSha256);
  assert.equal(hit.source.contextSlot, one.source.contextSlot); assert.notEqual(hit.source.evaluatedAt, one.source.evaluatedAt);
  assert.equal(h.calls.length, 1);
  h.advance(1); const refresh = await h.reader.readMint(MINT); assert.equal(h.calls.length, 2);
  assert.notEqual(refresh.source.checkedAt, one.source.checkedAt);
});
test("source error clears warm cache; circuit cannot be bypassed by another cached mint", async () => {
  let count = 0; const h = harness((_, init) => { count++; if (count === 2) return new Response("secret", { status: 503 }); const e = envelope(); e.id = JSON.parse(init.body).id; return response(e); });
  await h.reader.readMint(MINT); h.advance(10000);
  assert.equal((await h.reader.readMint(OTHER)).reason, "upstream_unavailable");
  assert.equal((await h.reader.readMint(MINT)).reason, "circuit_open"); assert.equal(h.calls.length, 2);
});
for (const [status, reason] of [[401, "access_denied"], [403, "access_denied"], [429, "rate_limited"], [503, "upstream_unavailable"], [500, "upstream_unavailable"], [302, "upstream_unavailable"]]) {
  test(`HTTP ${status}: redacted fail-closed, terminal circuit, no retries`, async () => {
    const h = harness(() => new Response("credential=SECRET", { status, headers: { "retry-after": "120", location: "https://evil.test/SECRET" } }));
    const r = await h.reader.readMint(MINT); assert.equal(r.reason, reason); assert.equal(r.facts, null);
    assert.ok(!JSON.stringify(r).includes("SECRET")); h.advance(999999); assert.equal((await h.reader.readMint(MINT)).reason, "circuit_open"); assert.equal(h.calls.length, 1);
  });
}
test("network error redaction and stop, regardless of raw exception body", async () => {
  const h = harness(() => { throw new Error("https://private.rpc/?key=SECRET\nstack=SECRET"); });
  const r = await h.reader.readMint(MINT); assert.equal(r.reason, "network_unavailable"); assert.ok(!JSON.stringify(r).includes("SECRET"));
  assert.equal((await h.reader.readMint(MINT)).reason, "circuit_open");
});
test("timeout returns even when transport ignores abort; no later request allowed", async () => {
  let called = 0;
  const reader = syntheticReader({ transport: () => { called++; return new Promise(() => {}); }, now: () => Date.parse(TIME), monotonic: () => 0, deadlineMs: 15 });
  const r = await reader.readMint(MINT); assert.equal(r.reason, "timeout"); assert.equal((await reader.readMint(OTHER)).reason, "circuit_open"); assert.equal(called, 1);
});
test("stream timeout cancels hanging response; body deadline includes stream", async () => {
  let cancelled = false;
  const reader = syntheticReader({ transport: async () => new Response(new ReadableStream({ pull: () => new Promise(() => {}), cancel() { cancelled = true; } }), { headers: { "content-type": "application/json" } }), now: () => Date.parse(TIME), monotonic: () => 0, deadlineMs: 15 });
  assert.equal((await reader.readMint(MINT)).reason, "timeout"); assert.equal(cancelled, true);
});
test("deadline also covers asynchronous response hashing, no incomplete facts escape", async () => {
  const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  try {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: { subtle: { digest: () => new Promise(() => {}) } } });
    const reader = syntheticReader({ transport: async () => response(), now: () => Date.parse(TIME), monotonic: () => 0, deadlineMs: 15 });
    const r = await reader.readMint(MINT); assert.equal(r.reason, "timeout"); assert.equal(r.facts, null);
    assert.equal((await reader.readMint(OTHER)).reason, "circuit_open");
  } finally { Object.defineProperty(globalThis, "crypto", originalCrypto); }
});
test("response byte bound applies incrementally with cancellation, not only content-length", async () => {
  let cancelled = false;
  const h = harness(() => new Response(new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(40000)); }, cancel() { cancelled = true; } }), { headers: { "content-type": "application/json" } }));
  assert.equal((await h.reader.readMint(MINT)).reason, "response_too_large"); assert.equal(cancelled, true);
});
for (const [headers, reason] of [
  [{ "content-type": "text/html" }, "invalid_response"],
  [{ "content-type": "application/json", "content-length": "65537" }, "response_too_large"],
  [{ "content-type": "application/json", "content-length": "wrong" }, "response_too_large"],
  [{ "content-type": "application/json", "x-large": "x".repeat(16384) }, "response_too_large"],
  [{ "content-type": "application/json", age: "61" }, "stale_source"],
  [{ "content-type": "application/json", age: "-1" }, "stale_source"],
  [{ "content-type": "application/json", date: "Sun, 18 Oct 2026 12:00:01 GMT" }, "stale_source"],
]) test(`transport header gate ${Object.keys(headers).join("/")}: ${reason}`, async () => {
  const h = harness(() => response(envelope(), { headers })); assert.equal((await h.reader.readMint(MINT)).reason, reason);
});
test("invalid UTF-8 and changed response URL/redirect fail closed", async () => {
  const h = harness(() => new Response(new Uint8Array([0xc0, 0xaf]), { headers: { "content-type": "application/json" } }));
  assert.equal((await h.reader.readMint(MINT)).reason, "invalid_response");
  for (const property of ["url", "redirected"]) {
    const h = harness(() => { const r = response(); Object.defineProperty(r, property, { value: property === "url" ? "http://127.0.0.1/secret" : true }); return r; });
    assert.equal((await h.reader.readMint(MINT)).reason, "invalid_response");
  }
});
test("negative account outcome consumes budget without falsely calling it a source outage", async () => {
  const h = harness((_, init) => { const e = envelope(); e.id = JSON.parse(init.body).id; e.result.value = null; return response(e); });
  assert.equal((await h.reader.readMint(MINT)).reason, "not_found"); h.advance(10000);
  assert.equal((await h.reader.readMint(OTHER)).reason, "not_found"); assert.equal(h.calls.length, 2);
});
test("wall/monotonic backwards or divergent clocks stop even warm cache", async () => {
  for (const jump of [h => h.wallJump(-1), h => h.wallJump(1001), h => h.monoJump(-1)]) {
    const h = harness(); await h.reader.readMint(MINT); jump(h);
    assert.equal((await h.reader.readMint(MINT)).reason, "invalid_clock"); assert.equal(h.calls.length, 1);
  }
});
test("response slot regression stops rather than presenting fresh acquisition as newer chain state", async () => {
  let slot = 400000001;
  const h = harness((_, init) => { const e = envelope(); e.id = JSON.parse(init.body).id; e.result.context.slot = slot--; return response(e); });
  await h.reader.readMint(MINT); h.advance(10000);
  assert.equal((await h.reader.readMint(OTHER)).reason, "stale_source"); assert.equal((await h.reader.readMint(MINT)).reason, "circuit_open");
});
test("all hard production limits are immutable and no endpoint configurable through reader options", async () => {
  assert.equal(PUBLIC_RPC_ENDPOINT, "https://api.mainnet-beta.solana.com/");
  assert.equal(LIMITS.requestsPerDevelopmentProcess, 3); assert.equal(LIMITS.timeoutMs, 5000); assert.equal(LIMITS.minimumIntervalMs, 10000);
  assert.ok(Object.isFrozen(LIMITS));
  const r = await createMintFactsReader({ endpoint: "http://169.254.169.254", developmentFeasibility: true }).readMint(MINT);
  assert.equal(r.reason, "disabled");
});
test("public development factories share their cap; mocks only; switching to production disables an existing reader", async () => {
  const originalFetch = globalThis.fetch, originalEnv = process.env.NODE_ENV, originalNow = Date.now;
  const originalPerformance = Object.getOwnPropertyDescriptor(globalThis, "performance");
  let wall = Date.parse(TIME), mono = 0, calls = 0;
  try {
    process.env.NODE_ENV = "development"; Date.now = () => wall;
    Object.defineProperty(globalThis, "performance", { configurable: true, value: { now: () => mono } });
    globalThis.fetch = async (url, init) => { calls++; assert.equal(url, PUBLIC_RPC_ENDPOINT); const e = envelope(); e.id = JSON.parse(init.body).id; return response(e); };
    const one = createMintFactsReader({ developmentFeasibility: true });
    const two = createMintFactsReader({ developmentFeasibility: true, endpoint: "http://evil.test" });
    process.env.NODE_ENV = "production";
    assert.equal((await one.readMint(MINT)).reason, "disabled"); assert.equal(calls, 0);
    process.env.NODE_ENV = "development";
    for (const [reader, mint] of [[one, MINT], [two, OTHER], [one, THIRD]]) {
      assert.equal((await reader.readMint(mint)).status, "verified_onchain_mint_at_slot"); wall += 10000; mono += 10000;
    }
    assert.equal((await two.readMint(FOURTH)).reason, "development_budget"); assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch; Date.now = originalNow;
    Object.defineProperty(globalThis, "performance", originalPerformance);
    if (originalEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalEnv;
  }
});
