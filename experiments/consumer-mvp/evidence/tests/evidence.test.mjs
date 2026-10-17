import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { Script, createContext } from "node:vm";
import { hash, projectDocument, renderMetadata, root, verifyRetainedCapture } from "../tools/captures.mjs";

const require = createRequire(import.meta.url);
const build = process.env.EVIDENCE_TEST_BUILD;
const { explainMint, listSupportedMints } = require(resolve(build, "index.js"));
const { IDENTITIES, CAPTURE } = require(resolve(build, "catalog.js"));
const { utcMicros, isExactSolanaMint } = require(resolve(build, "guards.js"));
const { validateReceipts } = require(resolve(build, "receipts.js"));
const { RETAINED } = require(resolve(build, "retained.js"));
const capturedAsOf = "2026-10-14T22:34:18Z";
const staleAsOf = "2026-10-17T12:00:00Z";
const raw = readFileSync(resolve(root, CAPTURE.path));
const original = JSON.parse(raw);
const clone = () => structuredClone(original);
// Corruptions are SIMULATED test-only edits to an in-memory retained document.
// They are never written to fixtures or represented as genuine source responses.
function change(document, index, mutate) {
  const p = document.packets[index], body = JSON.parse(p.body);
  mutate(body);
  p.body = JSON.stringify(body); p.bytes = Buffer.byteLength(p.body); p.bodySha256 = hash(p.body);
}
function answer(mint = IDENTITIES[0].mint, asOf = staleAsOf) {
  const result = explainMint(mint, { asOf });
  assert.equal(result.status, "supported");
  return result.explanation;
}

test("original document and generated metadata reproduce exactly offline", () => {
  assert.equal(hash(raw), CAPTURE.documentSha256);
  assert.deepEqual(verifyRetainedCapture(), RETAINED);
  assert.equal(readFileSync(resolve(root, "experiments/consumer-mvp/evidence/retained.ts"), "utf8"), renderMetadata(RETAINED));
});

test("exactly three independently cross-checked base/quote examples, no enrollment", () => {
  assert.equal(listSupportedMints().length, 3);
  for (const i of IDENTITIES) {
    const a = answer(i.mint);
    assert.equal(a.network, "solana"); assert.equal(a.token.mint, i.mint);
    assert.equal(a.quote.mint, i.quoteMint); assert.equal(a.quote.decimals, i.quoteDecimals);
    assert.equal(a.economicMechanism.settings, "verified_at_capture");
    assert.equal(a.economicMechanism.settlement, "not_verified");
    assert.equal(a.economicMechanism.holderEntitlement, "unknown");
  }
});

test("malformed original strings are visibly unsupported, never normalized or reflected", () => {
  for (const mint of ["SI", "", " " + IDENTITIES[0].mint, IDENTITIES[0].mint + "\n", "https://example.test/" + IDENTITIES[0].mint, "0".repeat(44), "1".repeat(31), "1".repeat(33), null, {}, 42]) {
    assert.equal(explainMint(mint).reason, "invalid_mint");
  }
});

test("valid unknowns, quote mints and wrong-case identities stay unsupported", () => {
  for (const mint of ["11111111111111111111111111111111", ...IDENTITIES.map(i => i.quoteMint), IDENTITIES[0].mint.toLowerCase()]) {
    assert.equal(explainMint(mint).status, "unsupported");
  }
  assert.equal(isExactSolanaMint("11111111111111111111111111111111"), true);
});

test("the second genuine SI symbol is not an alias for reviewed SI", () => {
  const rows = JSON.parse(original.packets[3].body).data.tokens.filter(t => t.symbol === "SI");
  assert.equal(rows.length, 2);
  const second = rows.find(t => t.mint !== IDENTITIES[0].mint);
  assert.equal(explainMint(second.mint).reason, "not_in_supported_set");
});

test("all explanation facts cite real receipts; source clocks and hashes remain original", () => {
  for (const i of IDENTITIES) {
    const a = answer(i.mint), ids = new Set(a.sources.map(s => s.id));
    for (const f of [a.whatItIs, a.whatUserOwns, a.pairRelationship, a.economicMechanism.conclusion, ...a.risksAndUnknowns]) {
      assert.ok(f.sourceIds.length > 0); assert.ok(f.sourceIds.every(id => ids.has(id)));
    }
    for (const s of a.sources) {
      const p = original.packets[s.retained.packetIndex];
      assert.equal(s.capturedAt, p.capturedAt);
      assert.equal(s.generatedAt, JSON.parse(p.body).generatedAt ?? JSON.parse(p.body).meta.generatedAt);
      assert.equal(s.bodySha256, hash(p.body));
      assert.notEqual(s.capturedAt, s.generatedAt);
    }
  }
});

test("stale clocks never become current and evaluation never retimes evidence", () => {
  const historical = answer(IDENTITIES[0].mint, capturedAsOf), stale = answer();
  assert.equal(historical.freshness.state, "captured"); assert.equal(stale.freshness.state, "stale");
  assert.equal(historical.freshness.currentValueClaim, false); assert.equal(stale.freshness.currentValueClaim, false);
  assert.deepEqual(stale.sources, historical.sources);
  assert.equal(stale.freshness.oldestCapturedAt, original.packets[0].capturedAt);
});

test("freshness checks oldest provider generation at an exact microsecond boundary", () => {
  assert.equal(answer(IDENTITIES[0].mint, "2026-10-14T22:38:32.776000Z").freshness.state, "captured");
  assert.equal(answer(IDENTITIES[0].mint, "2026-10-14T22:38:32.776001Z").freshness.state, "stale");
  assert.equal(utcMicros("2026-10-14T22:34:07.070444+00:00") - utcMicros("2026-10-14T22:34:07.070443Z"), 1n);
});

test("invalid, future-to-evaluation and normalized-overflow clocks fail closed", () => {
  for (const asOf of ["bad", "2026-02-30T12:00:00Z", "2026-10-17T25:00:00Z", "2026-10-17", "2026-10-17T12:00:00+01:00", "2026-10-14T22:34:07.070443Z", null]) {
    assert.equal(explainMint(IDENTITIES[0].mint, { asOf }).reason, "invalid_clock");
  }
  assert.equal(explainMint(IDENTITIES[0].mint, null).reason, "invalid_clock");
});

test("source lookup unavailable/429/503 never yields a usable evidence record", () => {
  for (const status of [429, 503, 401, 206]) {
    const d = clone(); d.packets[8].status = status;
    assert.throws(() => projectDocument(d), /^Error: source_unavailable$/);
  }
});

test("provider error payloads fail closed with fixed errors, no body leakage", () => {
  const d = clone(); change(d, 8, b => { b.error = "SIMULATED_PRIVATE_ERROR_DO_NOT_EXPOSE"; });
  assert.throws(() => projectDocument(d), /^Error: source_error$/);
});

test("malformed JSON returns a fixed diagnostic without reflecting provider contents", () => {
  const d = clone(), p = d.packets[8];
  p.body = "SIMULATED_PRIVATE_NON_JSON"; p.bytes = Buffer.byteLength(p.body); p.bodySha256 = hash(p.body);
  assert.throws(() => projectDocument(d), /^Error: source_json$/);
});

test("wrong provider base mint or mode cannot inherit another explanation", () => {
  for (const key of ["mint", "mode"]) {
    const d = clone(); change(d, 8, b => { b[key] = key === "mint" ? IDENTITIES[1].mint : "standard"; });
    assert.throws(() => projectDocument(d), /^Error: reward_identity$/);
  }
});

test("same ticker with wrong reward quote mint or decimals is rejected", () => {
  for (const [key, value] of [["mint", IDENTITIES[1].quoteMint], ["decimals", 9], ["decimals", "8"], ["symbol", "GLDX"]]) {
    const d = clone(); change(d, 8, b => { b.quote[key] = value; });
    assert.throws(() => projectDocument(d), /^Error: reward_identity$/);
  }
});

test("quote-switch or false server filtering anywhere in catalog invalidates sample", () => {
  const d = clone(); change(d, 3, b => { b.data.tokens.at(-1).quote.mint = IDENTITIES[1].quoteMint; });
  assert.throws(() => projectDocument(d), /^Error: pair_filter_mismatch$/);
});

test("wrong selected pool or token identity rejected even when ticker agrees", () => {
  for (const key of ["pool", "mint", "mode", "name"]) {
    const d = clone(); change(d, 3, b => { b.data.tokens.find(t => t.mint === IDENTITIES[0].mint)[key] = "SIMULATED"; });
    assert.throws(() => projectDocument(d), /Error: (token_identity|pair_filter_mismatch)/);
  }
});

test("registry units, category, token program and duplicated exact mints are verified", () => {
  for (const [key, value] of [["decimals", 9], ["tokenProgram", "SIMULATED"], ["category", "custom"]]) {
    const d = clone(); change(d, 0, b => { b.data.pairs.find(q => q.mint === IDENTITIES[0].quoteMint)[key] = value; });
    assert.throws(() => projectDocument(d), /^Error: quote_identity$/);
  }
  const d = clone(); change(d, 0, b => b.data.pairs.push(b.data.pairs[0]));
  assert.throws(() => projectDocument(d), /^Error: registry_identity$/);
});

test("stale or future provider clocks and invalid original fetch clocks reject capture", () => {
  for (const generatedAt of ["2026-10-14T20:00:00Z", "2026-10-14T22:34:07.070445Z", "2026-02-30T00:00:00Z", null]) {
    const d = clone(); change(d, 8, b => { b.generatedAt = generatedAt; });
    assert.throws(() => projectDocument(d), /^Error: source_clock$/);
  }
  const d = clone(); d.packets[8].capturedAt = "SIMULATED";
  assert.throws(() => projectDocument(d), /^Error: source_clock$/);
});

test("body hash, byte lengths, cache age and partial transport are fail closed", () => {
  for (const mutate of [p => { p.bytes++; }, p => { p.bodySha256 = "0".repeat(64); }, p => { p.headers.age = "601"; }, p => { p.headers.link = "SIMULATED"; }]) {
    const d = clone(); mutate(d.packets[8]);
    assert.throws(() => projectDocument(d), /Error: (receipt_integrity|cache_age|partial_or_redirect)/);
  }
});

test("sampling/pagination corruption does not become universal coverage", () => {
  for (const mutate of [b => { b.data.pagination.page = 2; }, b => { b.data.tokens.pop(); }, b => { b.data.network = "devnet"; }]) {
    const d = clone(); change(d, 3, mutate);
    assert.throws(() => projectDocument(d), /^Error: sample_shape$/);
  }
  assert.match(answer().risksAndUnknowns.map(f => f.text).join(" "), /market-cap-selected.*not complete market coverage/);
});

test("missing, null and simulated zero counters never become public zero or a payout claim", () => {
  for (const rewards of [undefined, null, { distributedRaw: "0", payoutCount: 0, walletsPaid: 0, lastPayoutAt: null }]) {
    const d = clone(); change(d, 8, b => { b.rewards = rewards; delete b.base; });
    const projected = projectDocument(d);
    assert.equal(projected.length, 3);
    assert.ok(!JSON.stringify(projected).includes("distributedRaw"));
  }
  const a = answer();
  for (const q of [a.economicMechanism.lifetimeDistribution, a.economicMechanism.coveredIntervalFlow, a.economicMechanism.holderReturns, a.marketContext.liquidityUsd, a.marketContext.volume24hUsd]) assert.equal(q.value, null);
});

test("permission unavailable has no toggle; rights flags or financial leakage cannot bypass metadata gate", () => {
  const changed = structuredClone(RETAINED[0].sources);
  changed[0].rights.permission = "approved";
  assert.equal(validateReceipts(changed, IDENTITIES[0]), null);
  const a = explainMint(IDENTITIES[0].mint, { asOf: staleAsOf, approved: true, permission: "approved" }).explanation;
  assert.equal(a.economicMechanism.lifetimeDistribution.state, "withheld_rights");
  for (const s of a.sources) assert.deepEqual(s.rights, { publication: "metadata_only", financialQuantities: "withheld", permission: "unverified" });
});

test("wrong endpoint, retained hash, quote identity or absent receipts cannot enter consumer projection", () => {
  for (const mutate of [s => { s[0].url = "https://example.test/"; }, s => { s[0].retained.documentSha256 = "0".repeat(64); }, s => { s[0].generatedAt = null; }, s => { s.pop(); }]) {
    const sources = structuredClone(RETAINED[0].sources); mutate(sources);
    assert.equal(validateReceipts(sources, IDENTITIES[0]), null);
  }
  assert.equal(validateReceipts(RETAINED[1].sources, IDENTITIES[0]), null);
});

test("ownership/mechanism copy does not confuse stock exposure, paid holders or holder ROI", () => {
  for (const i of IDENTITIES) {
    const a = answer(i.mint);
    assert.match(a.whatUserOwns.text, /not .*underlying company shares/);
    assert.match(a.economicMechanism.conclusion.text, /recorded setting, not that a holder was paid/);
    assert.equal(a.economicMechanism.holderReturns.state, "unsupported");
    assert.equal(a.economicMechanism.coveredIntervalFlow.state, "not_observed");
    assert.match(a.risksAndUnknowns.map(f => f.text).join(" "), /lifetime counters are not recent earning rates/);
  }
});

test("JSON serialization has only metadata, no raw reward/base bodies, amounts, headers or unsafe errors", () => {
  const text = JSON.stringify(IDENTITIES.map(i => explainMint(i.mint, { asOf: staleAsOf })));
  for (const key of ["distributedRaw", "distributedTokens", "walletsPaid", "payoutCount", "lastPayoutAt", '"body":', '"headers":', "SIMULATED_PRIVATE"]) assert.ok(!text.includes(key), key);
  const injected = structuredClone(RETAINED[0].sources);
  injected[0].body = "SIMULATED_PRIVATE";
  assert.ok(!JSON.stringify(validateReceipts(injected, IDENTITIES[0])).includes("SIMULATED_PRIVATE"));
});

test("results cannot mutate future requests and deterministic calls serialize identically", () => {
  const a = answer();
  assert.throws(() => { a.sources[0].rights.permission = "approved"; }, TypeError);
  assert.throws(() => { listSupportedMints().push({}); }, TypeError);
  assert.equal(JSON.stringify(answer()), JSON.stringify(a));
});

test("portable runtime executes without Node, DOM, network, process or wallet globals", () => {
  const context = createContext({});
  const loaded = new Map();
  function load(name) {
    if (loaded.has(name)) return loaded.get(name);
    assert.match(name, /^\.\/[a-z-]+$/);
    const loadedModule = { exports: {} }; loaded.set(name, loadedModule.exports);
    new Script(`(function(exports,require,module){${readFileSync(resolve(build, name + ".js"), "utf8")}\n})`).runInContext(context)(loadedModule.exports, load, loadedModule);
    loaded.set(name, loadedModule.exports); return loadedModule.exports;
  }
  const portable = load("./index");
  assert.equal(portable.explainMint(IDENTITIES[0].mint, { asOf: staleAsOf }).status, "supported");
  assert.equal(portable.explainMint("SIMULATED").status, "unsupported");
});

test("missing or altered bundled record gives unavailable instead of partial positive claims", () => {
  function withRecords(records) {
    const loadedModule = { exports: {} };
    new Script(`(function(exports,require,module){${readFileSync(resolve(build, "index.js"), "utf8")}\n})`).runInNewContext({})(loadedModule.exports, name => name === "./retained" ? { RETAINED: records } : require(resolve(build, name + ".js")), loadedModule);
    return loadedModule.exports.explainMint(IDENTITIES[0].mint, { asOf: staleAsOf });
  }
  assert.equal(withRecords([]).reason, "evidence_integrity");
  const switched = structuredClone(RETAINED); switched[0].quoteMint = IDENTITIES[1].quoteMint;
  assert.equal(withRecords(switched).reason, "evidence_integrity");
  assert.equal(withRecords([...RETAINED, RETAINED[0]]).reason, "evidence_integrity");
});

test("runtime import graph stays isolated from production and financial source bodies", () => {
  for (const file of readdirSync(build).filter(f => f.endsWith(".js"))) {
    const code = readFileSync(resolve(build, file), "utf8");
    assert.ok(!/require\(["'](?:node:|@\/|\.\.\/)/.test(code), file);
    assert.ok(!/\b(?:fetch|process|Buffer|WebSocket|XMLHttpRequest)\b/.test(code), file);
  }
});
