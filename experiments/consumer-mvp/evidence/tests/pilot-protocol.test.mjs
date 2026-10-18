import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { createPilotRehearsal, PILOT_BOUNDARY, PILOT_LIMITS, digestBody } from "../tools/pilot-protocol.mjs";
import { START, END, subject, fixturePolicy, fixtureTranscript, fixtureAcquisition, editFixture } from "./pilot-fixtures.mjs";
const require = createRequire(import.meta.url);
const { explainMint, listSupportedMints } = require(resolve(process.env.EVIDENCE_TEST_BUILD, "index.js"));
const { IDENTITIES, CAPTURE } = require(resolve(process.env.EVIDENCE_TEST_BUILD, "catalog.js"));
const root = new URL("../../../../", import.meta.url);
const rehearse = () => createPilotRehearsal({ offlineReview: true });
function admitted(p = fixturePolicy(), identity = subject) {
  const session = rehearse(), r = session.admit(identity.mint, p, START);
  assert.equal(r.state, "admitted"); return { session, lease: r.lease };
}
function complete(t = fixtureTranscript(), p = fixturePolicy(), proof = fixtureAcquisition(t)) {
  const { session, lease } = admitted(p);
  return { session, result: session.finish(lease, t, proof, END) };
}

test("off-by-default boundary has no transport, source calls, permission or public explanation", () => {
  assert.deepEqual(PILOT_BOUNDARY, { version: "consumer-source-pilot/1", activation: "disabled", transport: null, liveRequests: 0 });
  const trap = new Proxy({}, { get() { throw new Error("must_not_inspect"); } });
  const session = createPilotRehearsal();
  assert.equal(session.admit("any", trap, "bad").state, "inactive");
  assert.equal(session.finish(1, trap, trap, "bad").state, "inactive");
  assert.equal(session.status().simulatedRequestsReserved, 0);
});

test("a permission checkbox, genuine-looking unsigned document or old publication never grants admission", () => {
  for (const permission of [null, { approved: true }, { kind: "permission-receipt", licensed: true }, { kind: "already_public_github" }]) {
    assert.equal(rehearse().admit(subject.mint, permission, START).reason, "rights_unverified");
  }
});

test("rights are exact-mint, field, processing, retention and validity scoped", () => {
  for (const mutation of [p => { p.mint = IDENTITIES[1].mint; }, p => { p.access = false; }, p => { p.transientProcessing = false; },
    p => { p.rawRetentionSeconds = 1; }, p => { p.metadataCacheSeconds = 601; }, p => { p.publicFields.push("prices"); },
    p => { p.publicFields.push("tokenIdentity"); }, p => { p.publicFields = []; }, p => { p.validUntil = START; }]) {
    const p = fixturePolicy(); mutation(p); const r = rehearse().admit(subject.mint, p, START);
    assert.equal(r.state, "blocked"); assert.equal(r.preview, null);
  }
});

test("one proof session reserves exactly three receipts atomically before review; no concurrent admission", () => {
  const { session } = admitted();
  assert.equal(session.admit(subject.mint, fixturePolicy(), START).reason, "inflight");
  assert.equal(session.status().simulatedRequestsReserved, 3);
  assert.equal(PILOT_LIMITS.sessionRequests, 3); assert.equal(PILOT_LIMITS.retries, 0);
});

test("successful offline review is explicitly not source attestation, permission, settlement or production support", () => {
  const { result } = complete(); assert.equal(result.state, "offline_checked");
  assert.equal(result.requestsMade, 0); assert.equal(result.rightsVerified, false);
  assert.equal(result.sourceAuthenticity, "not_attested"); assert.equal(result.providerSignatureVerified, false);
  assert.equal(result.publicExplanation, null); assert.equal(result.financialQuantities, null); assert.equal(result.holderReturn, null);
  assert.equal(result.preview.use, "offline_fixture_only");
  assert.equal(result.preview.provenance[2].capturedAt, "2026-10-18T04:00:00.600000Z");
});

test("field-limited fixture scopes project only specifically permitted private-preview fields", () => {
  for (const field of ["tokenIdentity", "labels", "pair", "rewardMode", "provenance"]) {
    const p = fixturePolicy(); p.publicFields = [field];
    const { result } = complete(fixtureTranscript(), p); assert.equal(result.state, "offline_checked");
    for (const key of ["tokenIdentity", "labels", "pair", "rewardMode", "provenance"]) assert.equal(result.preview[key] !== null, key === field);
  }
});

test("warm cache costs zero simulated reservations and cannot outlive the oldest source clock", () => {
  const { session } = complete();
  assert.equal(session.admit(subject.mint, fixturePolicy(), "2026-10-18T04:09:58Z").state, "cache_hit");
  assert.equal(session.status().simulatedRequestsReserved, 3);
  assert.equal(session.admit(subject.mint, fixturePolicy(), "2026-10-18T04:09:59Z").reason, "session_budget");
});

test("permission expiry, scope narrowing or revocation immediately invalidates cached metadata", () => {
  const revoked = complete().session, p = fixturePolicy(); p.access = false;
  assert.equal(revoked.admit(subject.mint, p, "2026-10-18T04:00:02Z").state, "blocked"); assert.equal(revoked.status().cachePresent, false);
  assert.equal(revoked.admit(subject.mint, fixturePolicy(), "2026-10-18T04:01:02Z").reason, "circuit_open");
  const narrower = complete().session, limited = fixturePolicy(); limited.publicFields = ["tokenIdentity"];
  assert.equal(narrower.admit(subject.mint, limited, "2026-10-18T04:00:02Z").reason, "admission_cooldown");
  assert.equal(narrower.status().cachePresent, false);
  const expired = complete().session;
  assert.equal(expired.admit(subject.mint, fixturePolicy(), "2026-10-18T04:10:00Z").reason, "rights_expired_or_invalid");
});

test("pending proof cannot complete after a revocation or permission expiry", () => {
  const { session, lease } = admitted(), revoke = fixturePolicy(); revoke.access = false;
  session.admit(subject.mint, revoke, "2026-10-18T04:00:00.700Z");
  const t = fixtureTranscript(); assert.equal(session.finish(lease, t, fixtureAcquisition(t), END).state, "rejected");
  const p = fixturePolicy(); p.validUntil = "2026-10-18T04:00:00.900Z";
  assert.equal(complete(fixtureTranscript(), p).result.reason, "rights_expired_or_invalid");
  const narrowed = admitted(), limited = fixturePolicy(); limited.publicFields = ["tokenIdentity"];
  assert.equal(narrowed.session.admit(subject.mint, limited, "2026-10-18T04:00:00.700Z").reason, "rights_scope_changed");
  assert.equal(narrowed.session.finish(narrowed.lease, t, fixtureAcquisition(t), END).preview, null);
});

test("an unexpired cache uses the narrower explicit metadata TTL", () => {
  const p = fixturePolicy(); p.metadataCacheSeconds = 1;
  const { session } = complete(fixtureTranscript(), p);
  assert.equal(session.admit(subject.mint, p, "2026-10-18T04:00:01.999Z").state, "cache_hit");
  assert.notEqual(session.admit(subject.mint, p, "2026-10-18T04:00:02Z").state, "cache_hit");
});

test("429, 503, timeout and invalid source open a terminal circuit with no retry or warm fallback", () => {
  for (const [status, outcome, reason] of [[429, "response", "rate_limited"], [503, "response", "source_unavailable"], [0, "timeout", "timeout"], [0, "network_error", "source_unavailable"]]) {
    const t = fixtureTranscript(); Object.assign(t.receipts[0], { status, outcome, body: "SIMULATED_PRIVATE_ERROR" });
    t.receipts[0].headers["retry-after"] = "86400";
    const { session, result } = complete(t); assert.equal(result.reason, reason); assert.equal(result.preview, null);
    assert.equal(session.admit(subject.mint, fixturePolicy(), "2026-10-18T04:01:02Z").reason, "circuit_open");
    assert.equal(session.status().resetAvailable, false); assert.equal(session.status().cachePresent, false);
    assert.ok(!JSON.stringify(result).includes("SIMULATED_PRIVATE"));
  }
});

test("unsigned uploaded data, hashes and TLS booleans are not accepted as actual trusted provenance", () => {
  for (const proof of [null, { tlsVerified: true }, { kind: "live_https", signature: "fake", tlsVerified: true }, { bodySha256: ["0".repeat(64)] }]) {
    assert.equal(complete(fixtureTranscript(), fixturePolicy(), proof).result.reason, "unattested_source");
  }
});

test("offline origin conditions reject unapproved origins, TLS failure and every redirect", () => {
  const t = fixtureTranscript();
  for (const change of [p => { p.requestedOrigin = "http://www.stonkfun.xyz"; }, p => { p.finalOrigin = "https://example.test"; }, p => { p.tlsVerified = false; }, p => { p.redirects = 1; }]) {
    const proof = fixtureAcquisition(t); change(proof); assert.equal(complete(t, fixturePolicy(), proof).result.reason, "source_origin");
  }
});

test("body revisions are recomputed rather than trusted from receipt metadata", () => {
  const t = fixtureTranscript(), proof = fixtureAcquisition(t); proof.bodySha256[1] = "0".repeat(64);
  assert.equal(complete(t, fixturePolicy(), proof).result.reason, "receipt_integrity");
  assert.equal(complete(t, fixturePolicy(), { ...fixtureAcquisition(t), bodySha256: [] }).result.reason, "receipt_integrity");
});

test("completed lease or source interval before admission cannot be replayed as a new proof", () => {
  const { session, lease } = admitted(), t = fixtureTranscript();
  assert.equal(session.finish(lease, t, fixtureAcquisition(t), END).state, "offline_checked");
  assert.equal(session.finish(lease, t, fixtureAcquisition(t), END).reason, "replay");
  assert.equal(session.status().cachePresent, false); assert.equal(session.status().circuit, "replay");
  const replay = fixtureTranscript(); replay.receipts[0].startedAt = "2026-10-18T03:59:59.900000Z";
  assert.equal(complete(replay).result.reason, "replay");
});

test("a proof cannot exceed its admission deadline or regress the protocol clock", () => {
  const a = admitted(), t = fixtureTranscript();
  assert.equal(a.session.finish(a.lease, t, fixtureAcquisition(t), "2026-10-18T04:00:09.000001Z").reason, "deadline");
  const b = admitted(); assert.equal(b.session.finish(b.lease, t, fixtureAcquisition(t), "2026-10-18T03:59:59Z").reason, "invalid_clock");
});

test("real retained source metadata remains genuine and stale; no source clock is retimed", () => {
  const raw = readFileSync(new URL(CAPTURE.path, root)), d = JSON.parse(raw);
  assert.equal(digestBody(raw.toString("utf8")), CAPTURE.documentSha256);
  const indexes = [0, subject.catalogPacket, subject.rewardsPacket], t = { version: "stonkfun-identity-transcript/1", kind: "offline_transcript", receipts: indexes.map(index => {
    const p = d.packets[index]; return { ...p, outcome: "response", responsePath: p.path };
  }) };
  const { result } = complete(t); assert.equal(result.reason, "source_clock"); assert.equal(result.preview, null);
  assert.equal(t.receipts[2].capturedAt, "2026-10-14T22:34:07.070444+00:00");
});

test("stale, missing and invalid provider timestamps are rejected", () => {
  for (const clock of ["2026-10-17T00:00:00Z", undefined, "2026-02-30T00:00:00Z", "2026-10-18T04:00:00.200001Z"]) {
    const t = editFixture(fixtureTranscript(), 0, b => { b.meta.generatedAt = clock; });
    const { result } = complete(t); assert.equal(result.state, "rejected"); assert.equal(result.preview, null);
  }
});

test("source-version, quote, mode, pool, units and nested epoch changes all fail closed", () => {
  for (const [index, mutate] of [[2, b => { b.quote.mint = IDENTITIES[1].quoteMint; }], [2, b => { b.mode = "standard"; }],
    [1, b => { b.data.tokens[0].pool = IDENTITIES[1].poolMint; }], [2, b => { b.quote.decimals = 9; }],
    [2, b => { b.rewards = { epoch: "SIMULATED_EPOCH" }; }], [0, b => { b.meta.schemaVersion = 2; }]]) {
    const { result } = complete(editFixture(fixtureTranscript(), index, mutate)); assert.equal(result.state, "rejected"); assert.equal(result.preview, null);
  }
});

test("duplicate tickers are distinct mints; only the original exact SI can be reviewed", () => {
  const otherSI = "4SsapSJFx7ZqVb2C7z78wKD4nyySjFCBSuajnZdDsx97";
  const t = editFixture(fixtureTranscript(), 1, b => { b.data.tokens.push({ ...b.data.tokens[0], mint: otherSI }); b.data.pagination.total = 2; });
  assert.equal(complete(t).result.state, "offline_checked");
  assert.equal(rehearse().admit(otherSI, fixturePolicy(), START).reason, "not_in_default_three");
  assert.equal(explainMint(otherSI).status, "unsupported");
});

test("out-of-range, partial, error or missing receipt payloads do not escape the existing harness", () => {
  for (const mutate of [t => { t.receipts.pop(); }, t => { t.receipts[0].body = "x".repeat(524289); },
    t => { t.receipts[0].headers.location = "https://example.test"; }, t => { t.receipts[0].body = "SIMULATED_PRIVATE_HTML"; }]) {
    const t = fixtureTranscript(); mutate(t); const { result } = complete(t);
    assert.equal(result.state, "rejected"); assert.equal(result.preview, null);
  }
});

test("zero, null, missing or private financial fields are never inferred or serialized", () => {
  for (const rewards of [undefined, null, { distributedRaw: "0", walletsPaid: 0 }, { distributedRaw: "SIMULATED_PRIVATE_AMOUNT" }]) {
    const t = editFixture(fixtureTranscript(), 2, b => { b.rewards = rewards; b.base = null; });
    editFixture(t, 1, b => { b.data.tokens[0].market = { liquidityUsd: "SIMULATED_PRIVATE_AMOUNT" }; });
    const { session, result } = complete(t); assert.equal(result.state, "offline_checked");
    const json = JSON.stringify([result, session.status()]);
    for (const field of ["distributedRaw", "walletsPaid", "SIMULATED_PRIVATE", "liquidityUsd", '"body":', '"headers":']) assert.ok(!json.includes(field));
    assert.equal(result.financialQuantities, null); assert.equal(result.holderReturn, null);
  }
});

test("the default three remain byte-stable through policy review and candidate activation flags", () => {
  const before = JSON.stringify(listSupportedMints()); assert.equal(listSupportedMints().length, 3);
  complete();
  for (const mint of ["8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS", "11111111111111111111111111111111"]) {
    assert.equal(explainMint(mint, { asOf: END, enabled: true, licensed: true }).status, "unsupported");
    assert.equal(rehearse().admit(mint, fixturePolicy(), START).reason, "not_in_default_three");
  }
  assert.equal(JSON.stringify(listSupportedMints()), before);
});

test("no ambient network, publication or persistent-write capability is called", () => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = () => { calls++; throw new Error("forbidden_network"); };
  try { complete(); assert.equal(calls, 0); } finally { globalThis.fetch = original; }
  const code = readFileSync(new URL("../tools/pilot-protocol.mjs", import.meta.url), "utf8");
  assert.ok(!/node:(?:http|https|net|tls|fs)|\b(?:fetch|writeFile|setInterval|setTimeout)\s*\(/.test(code));
});
