import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { test } from "node:test";
import { MINT, OTHER, TOKEN, TIME, envelope, token2022, capture } from "./fixtures.mjs";
const require = createRequire(import.meta.url);
const { decodeCapturedMintResponse: decode, isExactPublicKey } = require(`${process.env.MINT_TEST_BUILD}/index.js`);
const info = e => e.result.value.data.parsed.info;
const withInfo = edit => { const e = envelope(); edit(info(e)); return e; };
const reject = async (e, reason = "invalid_response", extra = {}) => {
  const r = await decode(capture(e, extra)); assert.equal(r.status, "unavailable"); assert.equal(r.reason, reason);
  assert.equal(r.facts, null); assert.equal(r.source, null); return r;
};

test("SYNTHETIC SPL: exact u64, owner, base authorities, source clocks/hash and no market inference", async () => {
  const c = capture(), r = await decode(c);
  assert.equal(r.status, "verified_onchain_mint_at_slot");
  assert.deepEqual(r.facts.supply, { raw: "18446744073709551615", decimals: 9, decimalAmount: "18446744073.709551615" });
  assert.equal(r.facts.ownerProgram, TOKEN); assert.equal(r.facts.mint, MINT);
  assert.deepEqual(r.facts.mintAuthority, { state: "present", address: OTHER });
  assert.deepEqual(r.facts.freezeAuthority, { state: "absent", address: null });
  assert.equal(r.facts.interpretation.minting, "authority_present"); assert.equal(r.facts.interpretation.freezing, "authority_absent");
  assert.equal(r.source.contextSlot, "400000001"); assert.equal(r.source.slotTime, null);
  assert.equal(r.source.checkedAt, TIME); assert.equal(r.source.httpDate, null);
  assert.equal(r.source.acquisition, "synthetic_fixture"); assert.equal(r.source.assurance, "rpc_reported_not_independently_replayed");
  assert.equal(r.source.responseSha256, createHash("sha256").update(c.text).digest("hex"));
  assert.ok(Object.isFrozen(r.facts.supply)); assert.match(r.warnings.join(" "), /holder returns are not established/);
  assert.equal(r.facts.lamports, undefined); assert.equal(r.facts.rentEpoch, undefined); assert.equal(r.facts.name, undefined);
});
test("exact 32-byte base58: no trimming, ticker lookup, URLs, invalid alphabet or length", () => {
  assert.equal(isExactPublicKey(MINT), true);
  for (const v of [null, {}, "SI", " " + MINT, MINT + "\n", MINT.replace("D", "0"), "1".repeat(31), "1".repeat(33), "https://rpc.example/?key=secret"]) assert.equal(isExactPublicKey(v), false);
});
test("zero and decimals 0/255 are exact, never unknown or floating-point", async () => {
  for (const [raw, decimals, amount] of [["0", 0, "0"], ["0", 9, "0.000000000"], ["1", 255, "0." + "0".repeat(254) + "1"]]) {
    const r = await decode(capture(withInfo(i => { i.supply = raw; i.decimals = decimals; })));
    assert.equal(r.facts.supply.decimalAmount, amount);
  }
});
for (const value of [null, 0, 123, "01", "-1", "1.1", "1e9", "18446744073709551616", "9".repeat(21)]) {
  test(`invalid raw supply ${JSON.stringify(value)}`, () => reject(withInfo(i => { i.supply = value; })));
}
for (const value of [null, -1, 256, 1.5, "9"]) test(`invalid decimals ${JSON.stringify(value)}`, () => reject(withInfo(i => { i.decimals = value; })));
test("missing authority is unknown, not absent; invalid authority never accepted", async () => {
  for (const key of ["mintAuthority", "freezeAuthority"]) {
    await reject(withInfo(i => { delete i[key]; }));
    for (const bad of ["", "unknown", 0, " " + OTHER]) await reject(withInfo(i => { i[key] = bad; }));
  }
});
test("missing/not a mint/wrong owner/uninitialized stay distinct from fake", async () => {
  const edits = [
    [e => { e.result.value = null; }, "not_found"],
    [e => { e.result.value.owner = OTHER; }, "wrong_owner"],
    [e => { e.result.value.data.parsed.type = "account"; }, "not_mint"],
    [e => { e.result.value.data.parsed.type = "multisig"; }, "not_mint"],
    [e => { info(e).isInitialized = false; }, "uninitialized"],
  ];
  for (const [edit, reason] of edits) { const e = envelope(); edit(e); const r = await decode(capture(e)); assert.equal(r.status, "not_a_supported_mint_account"); assert.equal(r.reason, reason); }
  const e = envelope(); e.result.value.data = ["AA==", "base64"]; await reject(e, "unparsed_account");
});
test("Token-2022 base 82 is supported; extended empty/omitted parser output is NOT extension-free", async () => {
  const e = token2022(); assert.equal((await decode(capture(e))).facts.program, "token_2022");
  for (const extensions of [undefined, []]) {
    e.result.value.data.space = 166; info(e).extensions = extensions;
    const r = await decode(capture(e)); assert.equal(r.status, "unsupported_extensions");
    assert.deepEqual(r.facts.extensions.names, ["unlisted_or_unparseable_extensions"]);
    assert.equal(r.facts.interpretation.minting, "extension_review_required");
    assert.equal(r.facts.interpretation.freezing, "extension_review_required");
  }
});
test("only exact MetadataPointer layout supported; pointer never establishes metadata identity", async () => {
  const e = token2022(); e.result.value.data.space = 234;
  info(e).extensions = [{ extension: "metadataPointer", state: { authority: null, metadataAddress: OTHER } }];
  const r = await decode(capture(e)); assert.equal(r.status, "verified_onchain_mint_at_slot");
  assert.equal(r.facts.extensions.assessment, "reviewed_metadata_pointer"); assert.equal(r.facts.extensions.metadataPointer.metadataAddress, OTHER);
  e.result.value.data.space++; assert.equal((await decode(capture(e))).status, "unsupported_extensions");
  info(e).extensions[0].state.metadataAddress = "https://evil.test"; await reject(e);
});
for (const extension of ["permanentDelegate", "transferFeeConfig", "defaultAccountState", "transferHook", "confidentialTransferMint", "interestBearingConfig", "scaledUiAmountConfig", "pausableConfig", "futureExtension"]) {
  test(`unreviewed ${extension} cannot give reassuring authority interpretations`, async () => {
    const e = token2022(); e.result.value.data.space = 512;
    info(e).extensions = [{ extension, state: { ignored: "DO_NOT_ECHO_METADATA_OR_PROVIDER_SECRET" } }];
    const r = await decode(capture(e)); assert.equal(r.status, "unsupported_extensions");
    assert.equal(r.facts.interpretation.minting, "extension_review_required"); assert.equal(r.facts.interpretation.freezing, "extension_review_required");
    assert.ok(!JSON.stringify(r).includes("DO_NOT_ECHO")); assert.ok(!JSON.stringify(r).includes("futureExtension"));
  });
}
test("tokenMetadata spoofing not adopted/fetched; mixed pointers remain unreviewed", async () => {
  const e = token2022(); e.result.value.data.space = 500;
  info(e).extensions = [{ extension: "tokenMetadata", state: { mint: OTHER, name: "Official Stock", symbol: "REAL", uri: "http://169.254.169.254/secret" } }];
  const r = await decode(capture(e)); assert.equal(r.status, "unsupported_extensions");
  for (const text of ["Official Stock", "REAL", "169.254", "uri"]) assert.ok(!JSON.stringify(r).includes(text));
  await reject(withInfo(i => { i.name = "spoof"; }));
});
test("malformed/duplicate/legacy extensions and impossible account sizes fail closed", async () => {
  for (const size of [81, 83, 165, 65537, 234.5]) { const e = token2022(); e.result.value.data.space = size; await reject(e); }
  const e = token2022(); e.result.value.data.space = 234;
  const p = { extension: "metadataPointer", state: { authority: null, metadataAddress: null } };
  info(e).extensions = [p, p]; await reject(e);
  info(e).extensions = Array(33).fill(p); await reject(e);
  info(e).extensions = [{ extension: "<script>" }]; await reject(e);
  await reject(withInfo(i => { i.extensions = [{ extension: "nonTransferable" }]; }));
});
test("RPC envelope identity/finality context/epoch/owner labels must be exact", async () => {
  const edits = [e => { e.id = 2; }, e => { e.jsonrpc = "1.0"; }, e => { e.result.context.slot = 0; },
    e => { e.result.context.slot = 9007199254740992; }, e => { e.result.context.slot = "400000001"; },
    e => { e.result.context.commitment = "processed"; }, e => { e.result.context.epoch = 123; },
    e => { e.result.value.executable = true; }, e => { e.result.value.data.program = "spl-token-2022"; },
    e => { e.result.value.space = 83; }, e => { e.result.value.mint = OTHER; }];
  for (const edit of edits) { const e = envelope(); edit(e); await reject(e); }
  const e = envelope(); e.error = { message: "https://rpc.secret/?key=SECRET" }; const r = await reject(e, "rpc_error"); assert.ok(!JSON.stringify(r).includes("SECRET"));
});
test("duplicate escaped keys, malformed/deep JSON, extra fields and oversized bodies rejected", async () => {
  const base = JSON.stringify(envelope());
  for (const text of [base.replace('"id":1', '"id":1,"\\u0069d":1'), base.replace('"id":1', '"id":1,"__proto__":{}'), "[".repeat(20) + "0" + "]".repeat(20), base + "x", "{", "[" + base + "]"]) {
    await reject(envelope(), "invalid_response", { text });
  }
  await reject(envelope(), "response_too_large", { text: " ".repeat(65537) });
});
test("integer lexemes validated before rounding; irrelevant genuine u64 sentinel is accepted without projection", async () => {
  const text = JSON.stringify(envelope());
  for (const [original, changed] of [['"slot":400000001', '"slot":400000001.000000001'], ['"decimals":9', '"decimals":9.0000000000000001'], ['"id":1', '"id":1.00000000000000001'], ['"space":82', '"space":8.2e1'], ['"rentEpoch":0', '"rentEpoch":18446744073709551616']]) {
    await reject(envelope(), "invalid_response", { text: text.replace(original, changed) });
  }
  const r = await decode(capture(envelope(), { text: text.replace('"rentEpoch":0', '"rentEpoch":18446744073709551615') }));
  assert.equal(r.status, "verified_onchain_mint_at_slot"); assert.equal(r.facts.rentEpoch, undefined);
});
test("original source clock stays explicit; stale/future/invalid calendars fail without facts", async () => {
  await reject(envelope(), "stale_source", { evaluatedAt: "2026-10-18T12:01:00.001Z" });
  for (const extra of [{ responseReceivedAt: "2026-10-18T11:59:59Z" }, { evaluatedAt: "2026-10-18T11:59:59Z" }, { requestStartedAt: "2026-02-30T12:00:00Z" }, { evaluatedAt: "2026-10-18T12:00:00-01:00" }]) await reject(envelope(), "invalid_clock", extra);
  await reject(envelope(), "timeout", { requestStartedAt: "2026-10-18T11:59:54Z" });
  await reject(envelope(), "stale_source", { httpDate: "Sun, 18 Oct 2026 11:58:59 GMT" });
  await reject(envelope(), "stale_source", { httpDate: "Sun, 18 Oct 2026 12:00:01 GMT" });
  await reject(envelope(), "invalid_clock", { httpDate: "tomorrow" });
  const r = await decode(capture(envelope(), { httpDate: "Sun, 18 Oct 2026 12:00:00 GMT", evaluatedAt: "2026-10-18T12:00:01.123456Z" }));
  assert.equal(r.source.checkedAt, TIME); assert.equal(r.source.slotTime, null);
});
test("explicit recorded/synthetic capture is required and never upgrades replay to newly acquired", async () => {
  for (const input of [null, undefined, "json"]) assert.equal((await decode(input)).reason, "invalid_response");
  for (const captureKind of [undefined, "development_rpc"]) await reject(envelope(), "invalid_response", { captureKind });
  assert.equal((await decode(capture(envelope(), { captureKind: "recorded_response" }))).source.acquisition, "recorded_response");
  assert.equal((await decode(capture(envelope(), { mint: " " + MINT }))).reason, "invalid_mint");
});
