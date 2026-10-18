import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { root, hash, catalogPin, projectCandidates, renderExpansion, verifyExpansionCapture } from "../tools/expansion-captures.mjs";
const require = createRequire(import.meta.url);
const compiled = name => require(resolve(process.env.EVIDENCE_TEST_BUILD, name + ".js"));
const { explainMint, listSupportedMints } = compiled("index");
const { listExpansionCandidates, reviewExpansionCandidate, evaluateFreshnessTranscript } = compiled("expansion");
const { EXPANSION_CANDIDATES, REVIEW_SUBJECTS, OFFLINE_LIMITS, subjectPaths } = compiled("expansion-catalog");
const { EXPANSION_RETAINED } = compiled("expansion-retained");
const { strictJson } = compiled("strict-json");
const { CAPTURE } = compiled("catalog");
const asOf = "2026-10-17T20:00:01Z";
const opts = { offlineReview: true, asOf };
const unknownMint = "11111111111111111111111111111111";
const document = JSON.parse(readFileSync(resolve(root, CAPTURE.path), "utf8"));
const candidateCatalog = JSON.parse(readFileSync(resolve(root, catalogPin.path), "utf8"));

// Every response below is SIMULATED, not a retimed capture or real observation.
function simulated(subject = EXPANSION_CANDIDATES[0]) {
  const quote = { mint: subject.quoteMint, symbol: subject.quoteSymbol, name: subject.quoteName,
    decimals: subject.quoteDecimals, tokenProgram: subject.quoteTokenProgram,
    category: subject.quoteCategory, symbolAmbiguous: subject.quoteSymbolAmbiguous };
  const registry = { data: { pairs: [quote], selectBy: "mint", ambiguousSymbolCount: subject.quoteSymbolAmbiguous ? 1 : 0, standardV2Enabled: false }, meta: { generatedAt: "2026-10-17T19:59:59Z" } };
  if (subject.quoteSymbolAmbiguous) registry.data.pairs.push({ ...quote, mint: unknownMint });
  const catalog = { data: { tokens: [{ mint: subject.mint, pool: subject.poolMint, name: subject.name,
    symbol: subject.symbol, quote: { mint: quote.mint, symbol: quote.symbol, name: quote.name }, mode: "reward" }],
    pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 }, network: "mainnet-beta" }, meta: { generatedAt: "2026-10-17T20:00:00.100Z" } };
  const rewards = { mint: subject.mint, mode: "reward", quote: { mint: quote.mint, symbol: quote.symbol, decimals: quote.decimals }, basis: "ledger", generatedAt: "2026-10-17T20:00:00.300Z" };
  const bodies = [registry, catalog, rewards];
  return { version: "stonkfun-identity-transcript/1", kind: "offline_transcript", receipts: subjectPaths(subject).map((path, i) => ({
    path, responsePath: path, outcome: "response", status: 200,
    startedAt: `2026-10-17T20:00:00.${i * 2}00000Z`, capturedAt: `2026-10-17T20:00:00.${i * 2 + 1}00001Z`,
    headers: { "content-type": "application/json; charset=utf-8", age: "0" }, body: JSON.stringify(bodies[i]),
  })) };
}
function edit(transcript, index, mutate) {
  const body = JSON.parse(transcript.receipts[index].body); mutate(body);
  transcript.receipts[index].body = JSON.stringify(body); return transcript;
}
const evaluate = (transcript, options = opts, subject = EXPANSION_CANDIDATES[0]) => evaluateFreshnessTranscript(subject.mint, transcript, options);
const rejected = (transcript, reason, options) => {
  const r = evaluate(transcript, options); assert.equal(r.state, "rejected"); assert.equal(r.reason, reason);
  assert.equal(r.evidence, null); assert.equal(r.requestsMade, 0); return r;
};

test("both original documents are pinned and all three candidate metadata rows reproduce", () => {
  assert.equal(hash(readFileSync(resolve(root, catalogPin.path))), catalogPin.sha256);
  assert.deepEqual(verifyExpansionCapture(), EXPANSION_RETAINED);
  assert.equal(readFileSync(resolve(root, "experiments/consumer-mvp/evidence/expansion-retained.ts"), "utf8"), renderExpansion(EXPANSION_RETAINED));
});

test("production defaults remain exactly three before and after every offline review", () => {
  const before = JSON.stringify(listSupportedMints());
  assert.equal(listSupportedMints().length, 3);
  for (const c of listExpansionCandidates()) {
    assert.equal(explainMint(c.mint).reason, "not_in_supported_set");
    reviewExpansionCandidate(c.mint, opts); evaluateFreshnessTranscript(c.mint, simulated(c), opts);
    assert.equal(explainMint(c.mint, { asOf, approved: true, expansion: true }).reason, "not_in_supported_set");
  }
  assert.equal(JSON.stringify(listSupportedMints()), before);
});

test("offline review is disabled by default and does not inspect transcript inputs", () => {
  const trap = new Proxy({}, { get() { throw new Error("must_not_read"); } });
  assert.equal(evaluateFreshnessTranscript("bad", trap).state, "inactive");
  assert.equal(reviewExpansionCandidate("bad").state, "inactive");
  assert.equal(evaluateFreshnessTranscript("bad", trap, { asOf, enabled: true, ownerApproved: true }).state, "inactive");
});

test("candidate review remains blocked with original clocks and explicit rights/owner/current blockers", () => {
  for (const c of EXPANSION_CANDIDATES) {
    const r = reviewExpansionCandidate(c.mint, opts);
    assert.equal(r.state, "blocked"); assert.equal(r.activation, "disabled");
    assert.equal(r.evidence.freshness, "stale"); assert.equal(r.evidence.currentMechanism, "not_verified");
    assert.equal(r.evidence.publication, "not_authorized"); assert.equal(r.publicExplanation, null);
    assert.ok(r.blockers.includes("metadata_publication_permission_unverified"));
    assert.ok(r.blockers.includes("owner_enrollment_not_approved"));
    for (const s of r.evidence.sources) {
      const p = document.packets[s.retained.packetIndex]; assert.equal(s.capturedAt, p.capturedAt);
      assert.equal(s.bodySha256, hash(p.body)); assert.equal(s.retained.documentSha256, CAPTURE.documentSha256);
    }
  }
});

test("replaying near capture never confers current mechanism, permission or support", () => {
  const r = reviewExpansionCandidate(EXPANSION_CANDIDATES[0].mint, { offlineReview: true, asOf: "2026-10-14T22:34:22Z" });
  assert.equal(r.state, "blocked"); assert.equal(r.evidence.freshness, "captured");
  assert.equal(r.evidence.currentMechanism, "not_verified"); assert.equal(r.publicExplanation, null);
});

test("invalid mints, tickers, quote identities, unknowns and wrong case never auto-enroll", () => {
  for (const mint of ["KNOTS", " " + EXPANSION_CANDIDATES[0].mint, "0".repeat(44), unknownMint, EXPANSION_CANDIDATES[0].quoteMint, EXPANSION_CANDIDATES[0].mint.toLowerCase()]) {
    assert.equal(reviewExpansionCandidate(mint, opts).state, "unsupported");
    assert.equal(evaluateFreshnessTranscript(mint, simulated(), opts).state, "unsupported");
  }
});

test("invalid evaluation clocks fail closed for candidate and transcript review", () => {
  for (const clock of ["bad", "2026-02-30T00:00:00Z", "2026-10-17T20:00:00+01:00", null]) {
    const options = { offlineReview: true, asOf: clock };
    assert.equal(reviewExpansionCandidate(EXPANSION_CANDIDATES[0].mint, options).reason, "invalid_clock");
    rejected(simulated(), "invalid_clock", options);
  }
});

test("complete simulated fresh transcripts validate only offline, for six known review subjects", () => {
  for (const c of REVIEW_SUBJECTS) {
    const r = evaluateFreshnessTranscript(c.mint, simulated(c), opts);
    assert.equal(r.state, "offline_validated"); assert.equal(r.requestsMade, 0);
    assert.equal(r.publication, "not_authorized"); assert.equal(r.currentMechanism, "not_live_verified");
    assert.equal(r.evidence.sourceAuthenticity, "not_attested"); assert.equal(r.evidence.completeMarketCoverage, false);
    assert.equal(r.economicEpoch, "unknown"); assert.equal(r.continuity, "not_established");
    assert.equal(r.financialQuantities, null); assert.equal(r.holderReturn, null);
  }
});

test("genuine old packets cannot be presented as fresh at the current review clock", () => {
  const c = EXPANSION_CANDIDATES[0];
  const t = { version: "stonkfun-identity-transcript/1", kind: "offline_transcript", receipts: [0, c.catalogPacket, c.rewardsPacket].map(index => {
    const p = document.packets[index]; return { ...p, responsePath: p.path, outcome: "response" };
  }) };
  rejected(t, "source_clock");
});

test("wrong request count never permits paging, retries or per-token fan-out", () => {
  const t = simulated(); t.receipts.push(t.receipts[2]); rejected(t, "request_budget");
  rejected({ ...simulated(), receipts: [] }, "request_budget");
  assert.deepEqual([OFFLINE_LIMITS.requests, OFFLINE_LIMITS.retries, OFFLINE_LIMITS.liveRequests], [3, 0, 0]);
});

test("unreviewed versions, kind changes and legacy response envelopes fail closed", () => {
  rejected({ ...simulated(), version: "stonkfun-identity-transcript/2" }, "transcript_version");
  rejected({ ...simulated(), kind: "live" }, "transcript_version");
  rejected(edit(simulated(), 2, b => { b.data = { mint: b.mint }; }), "schema_drift");
  rejected(edit(simulated(), 0, b => { b.meta.version = 2; }), "schema_drift");
});

test("fixed paths reject arbitrary URLs, quote aliases, query expansion and redirects", () => {
  for (const path of ["http://127.0.0.1/", "https://example.test/private", "/api/public/v1/tokens", subjectPaths(EXPANSION_CANDIDATES[0])[1] + "&page=2"]) {
    const t = simulated(); t.receipts[1].path = path; rejected(t, "source_mismatch");
  }
  const t = simulated(); t.receipts[2].responsePath += "?redirect=1"; rejected(t, "source_mismatch");
});

test("429/503/timeouts stop immediately, never retry and never expose provider bodies", () => {
  for (const [status, outcome, reason] of [[429, "response", "rate_limited"], [503, "response", "source_unavailable"], [0, "timeout", "timeout"], [0, "network_error", "source_unavailable"]]) {
    const t = simulated(); Object.assign(t.receipts[0], { status, outcome, body: "SIMULATED_PRIVATE_ERROR" });
    Object.defineProperty(t.receipts, 1, { get() { throw new Error("later_receipt_must_not_be_read"); } });
    const r = rejected(t, reason); assert.equal(r.retryAllowed, false); assert.ok(!JSON.stringify(r).includes("SIMULATED_PRIVATE"));
  }
});

test("non-JSON, source error and duplicated JSON identity keys are rejected without payload leakage", () => {
  const t = simulated(); t.receipts[0].body = "SIMULATED_PRIVATE_NON_JSON"; rejected(t, "source_json");
  rejected(edit(simulated(), 0, b => { b.error = "SIMULATED_PRIVATE"; }), "schema_drift");
  const d = simulated(); d.receipts[2].body = d.receipts[2].body.replace('"mode":"reward"', '"mode":"standard","mode":"reward"');
  rejected(d, "source_json");
});

test("body-byte limits include UTF-8 and reject oversized input before parsing", () => {
  const a = simulated(); a.receipts[0].body = "x".repeat(OFFLINE_LIMITS.registryBytes + 1); rejected(a, "body_budget");
  const b = simulated(); b.receipts[0].body = '"' + "界".repeat(180000) + '"'; rejected(b, "body_budget");
});

test("request deadlines, batch deadlines and concurrency are bounded from transcript clocks", () => {
  const a = simulated(); a.receipts[0].startedAt = "2026-10-17T19:59:57Z"; rejected(a, "deadline");
  const b = simulated(); b.receipts[2].startedAt = "2026-10-17T20:00:09Z"; b.receipts[2].capturedAt = "2026-10-17T20:00:09.100Z";
  rejected(b, "deadline", { offlineReview: true, asOf: "2026-10-17T20:00:10Z" });
  const c = simulated(); c.receipts[1].startedAt = "2026-10-17T20:00:00Z"; rejected(c, "deadline");
});

test("provider clocks, receipt clocks and cache ages have independent strict gates", () => {
  rejected(edit(simulated(), 0, b => { b.meta.generatedAt = "2026-10-17T19:49:59Z"; }), "source_clock");
  rejected(edit(simulated(), 0, b => { b.meta.generatedAt = "2026-10-17T20:00:00.100002Z"; }), "source_clock");
  const a = simulated(); a.receipts[0].capturedAt = "2026-10-17T20:00:02Z"; rejected(a, "source_clock");
  for (const [key, value] of [["age", "601"], ["source-age", "-1"], ["location", "SIMULATED"], ["Content-Type", "application/json"]]) {
    const t = simulated(); t.receipts[0].headers[key] = value; rejected(t, "transport");
  }
});

test("exact microsecond source-age boundary is enforced without retiming receipts", () => {
  const a = edit(simulated(), 0, b => { b.meta.generatedAt = "2026-10-17T19:50:01Z"; });
  assert.equal(evaluate(a).state, "offline_validated");
  const b = edit(simulated(), 0, b => { b.meta.generatedAt = "2026-10-17T19:50:00.999999Z"; });
  rejected(b, "source_clock");
});

test("wrong exact base, quote, pool, mode and units cannot inherit a reviewed identity", () => {
  for (const [index, mutate] of [
    [2, b => { b.mint = unknownMint; }], [2, b => { b.mode = "standard"; }],
    [2, b => { b.quote.mint = unknownMint; }], [2, b => { b.quote.decimals = 6; }],
    [2, b => { b.quote.decimals = "9"; }], [1, b => { b.data.tokens[0].pool = unknownMint; }],
    [0, b => { b.data.pairs[0].tokenProgram = unknownMint; }],
  ]) rejected(edit(simulated(), index, mutate), "identity_mismatch");
});

test("same STONK ticker with different mint is rejected; ambiguity is not silently erased", () => {
  rejected(edit(simulated(), 2, b => { b.quote.mint = "Qirqk4cXB3txQmdqwB7R9o5KVkNzj5ZCT9BHsuLpump"; }), "identity_mismatch");
  rejected(edit(simulated(), 0, b => { b.data.pairs[0].symbolAmbiguous = false; }), "identity_mismatch");
});

test("multiple same token symbols are permitted only as distinct original exact identities", () => {
  const t = edit(simulated(), 1, b => { b.data.tokens.push({ ...b.data.tokens[0], mint: unknownMint }); b.data.pagination.total = 2; });
  assert.equal(evaluate(t).state, "offline_validated");
  assert.equal(evaluateFreshnessTranscript(unknownMint, t, opts).state, "unsupported");
  rejected(edit(simulated(), 1, b => { b.data.tokens.push(b.data.tokens[0]); b.data.pagination.total = 2; }), "identity_mismatch");
});

test("sample absence means unproven, not delisted; false quote filtering is rejected", () => {
  rejected(edit(simulated(), 1, b => { b.data.tokens[0].mint = unknownMint; }), "candidate_absent_from_sample");
  rejected(edit(simulated(), 1, b => { b.data.tokens[0].quote.mint = unknownMint; }), "identity_mismatch");
});

test("reward/config/program epoch fields always require review; no continuity is inferred", () => {
  for (const key of ["epoch", "rewardEpoch", "configVersion", "programVersion"]) {
    rejected(edit(simulated(), 2, b => { b[key] = "SIMULATED_NEW_EPOCH"; }), "epoch_requires_review");
  }
  rejected(edit(simulated(), 1, b => { b.data.tokens[0].configurationVersion = "SIMULATED"; }), "epoch_requires_review");
  rejected(edit(simulated(), 2, b => { b.rewards = { epoch: "SIMULATED_CHANGED_EPOCH" }; }), "epoch_requires_review");
  rejected(edit(simulated(), 1, b => { b.data.tokens[0].transferFee = { epoch: "SIMULATED_CHANGED_EPOCH" }; }), "epoch_requires_review");
  rejected(edit(simulated(), 2, b => { b.basis = "snapshot"; }), "identity_mismatch");
  assert.equal(evaluate(simulated()).economicEpoch, "unknown");
});

test("missing, null and simulated zero quantities remain wholly unobserved/withheld", () => {
  for (const rewards of [undefined, null, { distributedRaw: "0", distributedTokens: 0, payoutCount: 0, walletsPaid: 0 }]) {
    const r = evaluate(edit(simulated(), 2, b => { b.rewards = rewards; b.base = null; }));
    assert.equal(r.state, "offline_validated"); assert.equal(r.financialQuantities, null); assert.equal(r.holderReturn, null);
    assert.ok(!JSON.stringify(r).includes("distributedRaw"));
  }
});

test("permission/owner flags cannot authorize public output, requests or enrollment", () => {
  const flags = { ...opts, approved: true, ownerApproved: true, enableNetwork: true, rights: "licensed" };
  const r = evaluate(simulated(), flags);
  assert.equal(r.publication, "not_authorized"); assert.equal(r.requestsMade, 0);
  const c = reviewExpansionCandidate(EXPANSION_CANDIDATES[0].mint, flags);
  assert.equal(c.publicExplanation, null); assert.equal(c.state, "blocked");
});

test("no numeric counter, market figure, raw body, headers, private error or arbitrary provider field escapes", () => {
  const t = edit(simulated(), 2, b => { b.rewards = { distributedRaw: "SIMULATED_HIDDEN_PRIVATE_COUNTER", walletsPaid: 0 }; });
  edit(t, 1, b => { b.data.tokens[0].market = { liquidityUsd: "SIMULATED_HIDDEN_MARKET" }; b.data.tokens[0].links = { website: "https://example.test/private" }; });
  const json = JSON.stringify(evaluate(t));
  for (const fragment of ["SIMULATED_", '"body":', '"headers":', "distributedRaw", "walletsPaid", "liquidityUsd", "https://example"]) assert.ok(!json.includes(fragment));
});

test("pinned catalog/receipt corruption and rights changes fail offline provenance audit", () => {
  const c = structuredClone(candidateCatalog); c.rights.commercialUse = "approved";
  assert.throws(() => projectCandidates(document, c), /rights_unverified_required/);
  const d = structuredClone(document); d.packets[20].bodySha256 = "0".repeat(64);
  assert.throws(() => projectCandidates(d, candidateCatalog), /receipt_integrity/);
  const e = structuredClone(candidateCatalog); e.candidates.find(c => c.mint === EXPANSION_CANDIDATES[0].mint).quoteDecimals = 8;
  assert.throws(() => projectCandidates(document, e), /candidate_identity/);
});

test("duplicate-key/prototype/depth/invalid calendar defenses do not leak source strings", () => {
  for (const raw of ['{"mint":"a","mint":"b"}', '{"mint":"a","m\\u0069nt":"b"}', "[".repeat(30) + "0" + "]".repeat(30), '{"a":1e999}', '{"a":1,}', '[1,]']) assert.throws(() => strictJson(raw), /^Error: source_json$/);
  assert.equal(Object.getPrototypeOf(strictJson('{"__proto__":{"x":true}}')), null);
});

test("results and candidate descriptors are immutable and evaluation is deterministic", () => {
  const r = evaluate(simulated());
  assert.throws(() => { r.evidence.sources[0].generatedAt = asOf; }, TypeError);
  assert.throws(() => { listExpansionCandidates()[0].quoteMint = unknownMint; }, TypeError);
  assert.equal(JSON.stringify(evaluate(simulated())), JSON.stringify(r));
});

test("prototype never calls an ambient HTTP API even during explicit offline review", () => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = () => { calls++; throw new Error("forbidden_network"); };
  try { evaluate(simulated()); reviewExpansionCandidate(EXPANSION_CANDIDATES[0].mint, opts); assert.equal(calls, 0); }
  finally { globalThis.fetch = original; }
});

test("default runtime import graph remains disconnected from expansion", () => {
  for (const file of ["index", "catalog", "contract", "guards", "receipts", "retained"]) {
    const code = readFileSync(resolve(process.env.EVIDENCE_TEST_BUILD, file + ".js"), "utf8");
    assert.ok(!/require\(["'].\/(?:expansion|freshness|identity-review|strict-json)/.test(code));
  }
});
