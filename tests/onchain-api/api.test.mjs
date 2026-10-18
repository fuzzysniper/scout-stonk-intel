import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { MINT, OTHER, TIME, ORIGIN, HELIUS_HOST, envelope, token2022, response, system, root, route,
  prepareIsolatedHeliusTarget, SYNTHETIC_KEY, SYNTHETIC_HMAC, privateClientKey, targetUrl, PRODUCTION_RPC_ENABLED } from "./fixtures.mjs";
const require = createRequire(import.meta.url);
const { decodeCapturedMintResponse, decodeResponse } = require(`${root}/lib/onchain-mint/decoder.js`);
async function result(handler, request) { const r = await handler(request); return { response: r, body: await r.json() }; }

test("deployed route is disabled in all environments; poisoned env/fetch prove zero credential/store/RPC reads", async () => {
  const originalEnv = process.env, originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    for (const env of ["production", "development", "test"]) {
      process.env = new Proxy({ NODE_ENV: env }, { get(target, key) {
        if (/HELIUS|MINT_.*KEY|ACTIVATION|RPC_URL/.test(String(key))) throw new Error("must not read credential/flag");
        return target[key];
      } });
      globalThis.fetch = async () => { calls++; throw new Error("must never request"); };
      const { response: r, body } = await result(route.GET, new Request(`${ORIGIN}/api/mint-facts?mint=${MINT}`));
      assert.equal(r.status, 503); assert.equal(body.reason, "disabled"); assert.equal(body.facts, null); assert.equal(body.source, null);
    }
    assert.equal(PRODUCTION_RPC_ENABLED, false); assert.equal(calls, 0);
  } finally { process.env = originalEnv; globalThis.fetch = originalFetch; }
});
test("even the injected fixture handler rejects synthetic success in a production runtime", async () => {
  const s = system(), original = process.env.NODE_ENV;
  try { process.env.NODE_ENV = "production"; const { response: r, body } = await result(s.handler, s.request()); assert.equal(r.status, 503); assert.equal(body.reason, "disabled"); assert.equal(s.calls.rpc.length, 0); assert.equal(s.calls.store.length, 0); }
  finally { process.env.NODE_ENV = original; }
});
test("SYNTHETIC 200: exact MintFactsV1, real Helius host attribution, exact supply and bounded one-method protocol", async () => {
  const s = system(), { response: r, body } = await result(s.handler, s.request());
  assert.equal(r.status, 200); assert.equal(body.version, "mint-facts/1"); assert.equal(body.mint, MINT);
  assert.equal(body.status, "verified_onchain_mint_at_slot"); assert.equal(body.facts.supply.raw, "18446744073709551615");
  assert.equal(body.facts.supply.decimalAmount, "18446744073.709551615");
  assert.equal(body.source.endpointHost, HELIUS_HOST); assert.equal(body.source.acquisition, "synthetic_fixture");
  assert.equal(body.source.slotTime, null); assert.equal(body.source.checkedAt, TIME); assert.equal(body.source.contextSlot, "400000001");
  assert.match(body.source.responseSha256, /^[a-f0-9]{64}$/); assert.equal(body.source.assurance, "rpc_reported_not_independently_replayed");
  const { url, init } = s.calls.rpc[0];
  assert.equal(new URL(url).hostname, HELIUS_HOST); assert.equal(new URL(url).searchParams.get("api-key"), SYNTHETIC_KEY);
  assert.deepEqual(JSON.parse(init.body), { jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [MINT, { encoding: "jsonParsed", commitment: "finalized" }] });
  assert.equal(init.method, "POST"); assert.equal(init.redirect, "error"); assert.equal(init.credentials, "omit"); assert.equal(init.cache, "no-store");
  assert.deepEqual(init.headers, { "content-type": "application/json", accept: "application/json" }); assert.equal(init.referrerPolicy, "no-referrer");
  for (const value of [SYNTHETIC_KEY, SYNTHETIC_HMAC, "api-key=", "203.0.113.8"]) assert.ok(!JSON.stringify(body).includes(value));
  assert.equal(s.calls.rpc.length, 1);
});
test("wire headers disable browser/CDN caching and CORS; unsupported methods have Allow GET", async () => {
  const s = system(), r = await s.handler(s.request());
  assert.match(r.headers.get("cache-control"), /no-store/); assert.equal(r.headers.get("cdn-cache-control"), "no-store"); assert.equal(r.headers.get("vercel-cdn-cache-control"), "no-store");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff"); assert.equal(r.headers.get("access-control-allow-origin"), null);
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]) {
    const res = await route[method](new Request(`${ORIGIN}/api/mint-facts?mint=${MINT}`, { method })); assert.equal(res.status, 405); assert.equal(res.headers.get("allow"), "GET"); assert.equal((await res.json()).status, "unavailable");
  }
});
for (const search of ["", "?mint=", "?mint=SI", "?mint=" + MINT + "&mint=" + OTHER, "?mint=" + MINT + "&mint=" + MINT,
  "?mint=" + MINT + "&rpcUrl=https://evil.test", "?mint=" + MINT + "&api-key=secret", "?m%69nt=" + MINT, "?mint=%44" + MINT.slice(1), "?mint=%20" + MINT, "?mint=" + MINT + "%0A", "?mint=https://evil.test", "?mint=" + "x".repeat(300)]) {
  test(`bad query rejected before dependencies: ${search.slice(0, 70)}`, async () => {
    const s = system(), { response: r, body } = await result(s.handler, new Request(`${ORIGIN}/api/mint-facts${search}`));
    assert.equal(r.status, 400); assert.equal(body.reason, "invalid_mint"); assert.equal(body.mint, null); assert.equal(s.calls.store.length, 0); assert.equal(s.calls.identity, 0); assert.equal(s.calls.rpc.length, 0);
  });
}
for (const headers of [{ origin: "https://evil.test" }, { origin: "null" }, { "sec-fetch-site": "same-site" }, { "sec-fetch-site": "cross-site" },
  { host: "evil.test" }, { "x-forwarded-host": "evil.test" }, { "x-forwarded-proto": "http" }, { "x-rpc-url": "https://evil.test" }, { "x-api-key": "secret" }, { "x-overflow": "x".repeat(16385) }]) {
  test(`origin/header spoof rejected: ${Object.keys(headers)}`, async () => {
    const s = system(), { response: r, body } = await result(s.handler, s.request(MINT, { headers }));
    assert.equal(r.status, 403); assert.equal(body.reason, "access_denied"); assert.equal(s.calls.rpc.length, 0); assert.equal(s.calls.store.length, 0);
  });
}
test("GET body declarations, fragments, path spoof and unapproved canonical origin rejected", async () => {
  for (const [url, headers, code] of [[`${ORIGIN}/api/mint-facts?mint=${MINT}`, { "content-length": "1" }, 400], [`${ORIGIN}/api/mint-facts?mint=${MINT}`, { "transfer-encoding": "chunked" }, 400],
    [`${ORIGIN}/api/mint-facts?mint=${MINT}#x`, {}, 400], [`${ORIGIN}/api/other?mint=${MINT}`, {}, 400], [`https://evil.test/api/mint-facts?mint=${MINT}`, {}, 403]]) {
    const s = system(); assert.equal((await s.handler(new Request(url, { headers }))).status, code); assert.equal(s.calls.rpc.length, 0);
  }
});
test("no trusted identity/store = unavailable; request IP headers never become identity", async () => {
  for (const deps of [{ trustedIdentity: null }, { store: null }]) {
    const s = system({ deps }), { response: r, body } = await result(s.handler, s.request()); assert.equal(r.status, 503); assert.equal(body.facts, null); assert.equal(s.calls.rpc.length, 0);
  }
  const s = system(), req = s.request(MINT, { headers: { "x-forwarded-for": "203.0.113.8", "x-real-ip": "203.0.113.8", forwarded: "for=203.0.113.8" } }, null);
  assert.equal((await s.handler(req)).status, 503); assert.equal(s.calls.rpc.length, 0);
});
test("IP aliases normalize and IP spoofing cannot create new rate buckets", async () => {
  assert.equal(privateClientKey("2001:db8::1", SYNTHETIC_HMAC), privateClientKey("2001:0db8:0:0:0:0:0:1", SYNTHETIC_HMAC));
  assert.equal(privateClientKey("::ffff:203.0.113.8", SYNTHETIC_HMAC), privateClientKey("203.0.113.8", SYNTHETIC_HMAC));
  for (const ip of ["localhost", "203.0.113.8, 203.0.113.9", "127.000.0.1", "::1%eth0", "unknown", null]) assert.equal(privateClientKey(ip, SYNTHETIC_HMAC), null);
  const s = system();
  for (let i = 0; i < 6; i++) assert.equal((await s.handler(s.request(MINT, { headers: { "x-forwarded-for": `198.51.100.${i}`, "x-real-ip": `198.51.100.${i}` } }))).status, 200);
  assert.equal((await s.handler(s.request(MINT))).status, 429); assert.equal(s.state.clients.size, 1); assert.equal(s.calls.rpc.length, 1);
  assert.ok(!JSON.stringify([...s.state.clients]).includes("203.0.113.8"));
});
test("isolated configuration accepts only a key, fixes Helius host/path and never serializes it", () => {
  for (const bad of [null, "short", "https://mainnet.helius-rpc.com/?api-key=SECRET", "../api-key=secret", "KEY with whitespace padded"]) assert.equal(prepareIsolatedHeliusTarget(bad), null);
  const target = prepareIsolatedHeliusTarget(SYNTHETIC_KEY); assert.deepEqual(target, { provider: "helius", host: HELIUS_HOST }); assert.ok(!JSON.stringify(target).includes(SYNTHETIC_KEY));
  assert.throws(() => targetUrl({ provider: "helius", host: HELIUS_HOST }), /invalid_helius_configuration/);
});
test("public captured decoder cannot spoof Helius host; legacy public source remains unchanged", async () => {
  const r = await decodeCapturedMintResponse({ mint: MINT, requestId: 1, text: JSON.stringify(envelope()), requestStartedAt: TIME, responseReceivedAt: TIME, evaluatedAt: TIME, captureKind: "synthetic_fixture", endpointHost: HELIUS_HOST });
  assert.equal(r.source.endpointHost, "api.mainnet-beta.solana.com");
  const rejected = await decodeResponse({ mint: MINT, requestId: 1, text: JSON.stringify(envelope()), requestStartedAt: TIME, responseReceivedAt: TIME, evaluatedAt: TIME, acquisition: "synthetic_fixture", endpointHost: "mainnet.helius-rpc.com.evil.test" });
  assert.equal(rejected.reason, "invalid_response"); assert.equal(rejected.source, null);
});
test("unknown extensions return 200 unsupported with both interpretations withheld; metadata never forwarded", async () => {
  const s = system({ rpc: (_, init) => { const e = token2022(); e.id = JSON.parse(init.body).id; e.result.value.data.space = 500;
    e.result.value.data.parsed.info.extensions = [{ extension: "tokenMetadata", state: { mint: OTHER, name: "FAKE_IDENTITY", uri: "http://169.254.169.254/SECRET" } }]; return response(e); } });
  const { response: r, body } = await result(s.handler, s.request()); assert.equal(r.status, 200); assert.equal(body.status, "unsupported_extensions");
  assert.equal(body.facts.interpretation.minting, "extension_review_required"); assert.equal(body.facts.interpretation.freezing, "extension_review_required");
  assert.ok(!JSON.stringify(body).includes("FAKE_IDENTITY")); assert.ok(!JSON.stringify(body).includes("SECRET")); assert.ok(!JSON.stringify([...s.state.cache]).includes("SECRET"));
});
for (const [edit, reason] of [[e => { e.result.value.owner = OTHER; }, "wrong_owner"], [e => { e.result.value = null; }, "not_found"], [e => { e.result.value.data.parsed.type = "account"; }, "not_mint"], [e => { e.result.value.data.parsed.info.isInitialized = false; }, "uninitialized"]]) {
  test(`404 supported negative: ${reason}`, async () => {
    const s = system({ rpc: (_, init) => { const e = envelope(); e.id = JSON.parse(init.body).id; edit(e); return response(e); } });
    const { response: r, body } = await result(s.handler, s.request()); assert.equal(r.status, 404); assert.equal(body.status, "not_a_supported_mint_account"); assert.equal(body.reason, reason); assert.equal(body.source, null); assert.equal(body.facts, null); assert.equal(s.state.lease, null);
  });
}
for (const [http, reason, status] of [[401, "access_denied", 503], [403, "access_denied", 503], [429, "rate_limited", 429], [503, "upstream_unavailable", 503], [302, "upstream_unavailable", 503]]) {
  test(`upstream ${http} redacted, no retry, shared circuit`, async () => {
    const s = system({ rpc: () => new Response("api-key=SECRET", { status: http, headers: { "retry-after": "9999999999", location: "http://evil.test/SECRET" } }) });
    const { response: r, body } = await result(s.handler, s.request()); assert.equal(r.status, status); assert.equal(body.reason, reason); assert.ok(!JSON.stringify(body).includes("SECRET"));
    assert.equal(r.headers.get("retry-after"), http === 429 ? "60" : null);
    const next = await result(s.replica(), s.request()); assert.equal(next.body.reason, "circuit_open"); assert.equal(s.calls.rpc.length, 1);
  });
}
test("network exception never leaks key, URL, stack or error messages", async () => {
  const s = system({ rpc: () => { throw new Error(`SECRET ${SYNTHETIC_KEY} ${SYNTHETIC_HMAC}`); } });
  const { response: r, body } = await result(s.handler, s.request()); assert.equal(r.status, 503); assert.equal(body.reason, "network_unavailable"); assert.ok(!JSON.stringify(body).includes("SECRET")); assert.equal(s.calls.rpc.length, 1);
});
for (const [headers, reason, status] of [[{ date: "Sun, 18 Oct 2026 12:00:01 GMT" }, "stale_source", 503], [{ date: "Sun, 18 Oct 2026 11:58:00 GMT" }, "stale_source", 503], [{ age: "61" }, "stale_source", 503], [{ "content-length": "65537" }, "response_too_large", 502], [{ "content-type": "text/html" }, "invalid_response", 502]]) {
  test(`RPC source/header restriction: ${reason}`, async () => {
    const s = system({ rpc: () => response(envelope(), { headers: { "content-type": "application/json", ...headers } }) });
    const out = await result(s.handler, s.request()); assert.equal(out.response.status, status); assert.equal(out.body.reason, reason); assert.equal(out.body.facts, null);
  });
}
test("strict mint/slot/epoch/id and JSON duplicate integrity reaches route", async () => {
  for (const edit of [e => { e.result.value.mint = OTHER; }, e => { e.id++; }, e => { e.result.context.epoch = 1; }, e => { e.result.context.commitment = "processed"; }, e => { e.result.context.slot = 9007199254740992; }]) {
    const s = system({ rpc: () => { const e = envelope(); edit(e); return response(e); } }); assert.equal((await s.handler(s.request())).status, 502);
  }
  const s = system({ rpc: () => new Response(JSON.stringify(envelope()).replace('"id":1', '"id":1,"\\u0069d":1'), { headers: { "content-type": "application/json" } }) });
  assert.equal((await s.handler(s.request())).status, 502);
});
test("transport and stream timeouts terminate globally, even when mock ignores abort", async () => {
  for (const rpc of [() => new Promise(() => {}), () => new Response(new ReadableStream({ pull: () => new Promise(() => {}) }), { headers: { "content-type": "application/json" } })]) {
    const s = system({ rpc, deps: { testDeadlineMs: 15 } }), out = await result(s.handler, s.request());
    assert.equal(out.response.status, 504); assert.equal(out.body.reason, "timeout"); assert.equal((await result(s.replica(), s.request())).body.reason, "circuit_open"); assert.equal(s.calls.rpc.length, 1);
  }
});
test("response hash deadline also returns no facts and closes the shared circuit", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  try {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: { subtle: { digest: () => new Promise(() => {}) } } });
    const s = system({ deps: { testDeadlineMs: 15 } }), out = await result(s.handler, s.request());
    assert.equal(out.response.status, 504); assert.equal(out.body.facts, null); assert.equal((await result(s.replica(), s.request())).body.reason, "circuit_open");
  } finally { Object.defineProperty(globalThis, "crypto", original); }
});
test("response byte limit and invalid UTF8/BOM/redirect never produce facts", async () => {
  for (const rpc of [() => new Response("x".repeat(65537), { headers: { "content-type": "application/json" } }), () => new Response(new Uint8Array([0xc0, 0xaf]), { headers: { "content-type": "application/json" } }), () => new Response("\uFEFF" + JSON.stringify(envelope()), { headers: { "content-type": "application/json" } }),
    () => { const r = response(); Object.defineProperty(r, "url", { value: "https://evil.test" }); return r; }]) {
    const s = system({ rpc }), { response: r, body } = await result(s.handler, s.request()); assert.equal(r.status, 502); assert.equal(body.facts, null);
  }
});
test("server-only marker rejects unconditioned browser-style imports", () => {
  const child = spawnSync(process.execPath, ["-e", `require(${JSON.stringify(root + "/lib/onchain-mint/server/helius.js")})`], { encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "" } });
  assert.notEqual(child.status, 0); assert.match(child.stderr, /cannot be imported from a Client Component module/);
});
