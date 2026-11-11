import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { MINT, OTHER, TOKEN, TOKEN2022, TIME, envelope, token2022, info, capture } from './fixtures.mjs';
const require = createRequire(import.meta.url);
const { projectHeliusCapture: project, readHeliusFacts, HELIUS_FACT_POLICY } = require(`${process.env.V4_FACT_BUILD}/lib/v4-solana-facts/index.js`);
const grey = r => {
  for (const c of Object.values(r.checks)) { assert.equal(c.color, 'grey'); assert.deepEqual(c.evidenceFields, []); }
};
const rejected = async (c, reason, state = 'unavailable') => {
  const r = await project(MINT, c); assert.equal(r.state, state); assert.equal(r.reason, reason);
  assert.equal(r.sourceGo, false); assert.equal(r.observations, null); assert.equal(r.provenance, null); grey(r); return r;
};

test('SYNTHETIC: precise source facts separate from interpretation, original clocks/hash and request identity', async () => {
  const c = capture(); const r = await project(MINT, c);
  assert.equal(r.version, 'unfarmd-solana-facts/1'); assert.equal(r.sourceGo, false); assert.equal(r.state, 'observed');
  assert.equal(r.requestedMint, MINT); assert.equal(r.observations.mint, MINT); assert.equal(r.observations.ownerProgram, TOKEN);
  assert.equal(r.observations.program, 'spl_token'); assert.equal(r.observations.initialized, true);
  assert.deepEqual(r.observations.supply, { raw: '18446744073709551615', decimals: 9, decimalAmount: '18446744073.709551615' });
  assert.equal(r.observations.interpretation, undefined);
  assert.equal(r.checks.mintAuthority.color, 'red'); assert.equal(r.checks.freezeAuthority.color, 'green');
  assert.equal(r.checks.supply.color, 'green'); assert.deepEqual(r.checks.mintAuthority.evidenceFields, ['mintAuthority']);
  assert.deepEqual(r.provenance, { provider: 'helius-solana-rpc', endpointHost: 'mainnet.helius-rpc.com', method: 'getAccountInfo', encoding: 'jsonParsed',
    requestedCommitment: 'finalized', contextSlot: '400000001', slotTime: null, requestStartedAt: TIME, responseReceivedAt: TIME,
    evaluatedAt: TIME, httpDate: null, responseSha256: createHash('sha256').update(c.text).digest('hex'),
    freshness: 'bounded_acquisition_age_only', maxAgeMs: 60000, captureKind: 'synthetic_fixture', providerAuthentication: 'not_verified_offline',
    assurance: 'rpc_reported_not_independently_replayed', identityBinding: 'captured_request_not_echoed_by_account_response' });
  assert.ok(Object.isFrozen(r)); assert.ok(Object.isFrozen(r.observations.supply)); assert.ok(Object.isFrozen(r.checks));
  assert.match(r.limitations.join(' '), /not rug-proof/); assert.match(r.limitations.join(' '), /not circulating supply/);
  assert.equal(r.score, undefined); assert.equal(r.verdict, undefined); assert.equal(r.observations.marketCap, undefined);
  for (const u of r.unknowns) { assert.equal(u.state, 'unknown'); assert.equal(u.color, 'grey'); assert.deepEqual(u.evidenceFields, []); }
  assert.match(r.unknowns[0].explanation, /not distinct wallets/);
});
for (const mintPresent of [true, false]) for (const freezePresent of [true, false]) {
  test(`SYNTHETIC: independent base permissions mint=${mintPresent} freeze=${freezePresent}`, async () => {
    const e = envelope(); info(e).mintAuthority = mintPresent ? OTHER : null; info(e).freezeAuthority = freezePresent ? OTHER : null;
    const r = await project(MINT, capture(e));
    assert.equal(r.checks.mintAuthority.color, mintPresent ? 'red' : 'green');
    assert.equal(r.checks.freezeAuthority.color, freezePresent ? 'red' : 'green');
    assert.equal(r.observations.mintAuthority.address, mintPresent ? OTHER : null);
    assert.equal(r.observations.freezeAuthority.address, freezePresent ? OTHER : null);
  });
}
for (const [raw, decimals, expected] of [['0', 0, '0'], ['0', 9, '0.000000000'], ['1', 255, '0.'+'0'.repeat(254)+'1']]) {
  test(`SYNTHETIC: exact decimal supply ${raw} / ${decimals}`, async () => {
    const e = envelope(); info(e).supply = raw; info(e).decimals = decimals;
    const r = await project(MINT, capture(e)); assert.equal(r.observations.supply.decimalAmount, expected);
  });
}
test('SYNTHETIC: Token-2022 base kept distinct; only exact metadata-pointer-only layout yields yellow', async () => {
  const e = token2022(); let r = await project(MINT, capture(e));
  assert.equal(r.state, 'observed'); assert.equal(r.observations.ownerProgram, TOKEN2022); assert.equal(r.observations.program, 'token_2022');
  e.result.value.data.space = 234; info(e).extensions = [{ extension: 'metadataPointer', state: { authority: null, metadataAddress: OTHER } }];
  r = await project(MINT, capture(e)); assert.equal(r.checks.extensions.color, 'yellow'); assert.equal(r.state, 'observed');
  assert.match(r.checks.extensions.explanation, /does not verify metadata/);
});
for (const extension of [null, 'permanentDelegate', 'transferFeeConfig', 'transferHook', 'pausableConfig', 'futureExtension']) {
  test(`SYNTHETIC: Token-2022 unreviewed ${extension} is grey despite absent base authorities`, async () => {
    const e = token2022(); e.result.value.data.space = 512; info(e).mintAuthority = null; info(e).freezeAuthority = null;
    info(e).extensions = extension === null ? [] : [{ extension, state: { dangerousMetadata: 'DO_NOT_ECHO_SECRET_OR_URL' } }];
    const r = await project(MINT, capture(e)); assert.equal(r.state, 'unsupported'); assert.equal(r.reason, 'unreviewed_extensions');
    grey(r); assert.equal(r.observations.supply.raw, '18446744073709551615'); // base fields for audit, not admitted checks
    assert.equal(r.observations.program, 'token_2022'); assert.ok(!JSON.stringify(r).includes('DO_NOT_ECHO'));
  });
}
for (const [field, value] of [['network', 'solana-devnet'], ['endpointHost', 'evil.example'], ['endpointHost', 'mainnet.helius-rpc.com/?api-key=SECRET'],
  ['method', 'getTokenLargestAccounts'], ['method', 'sendTransaction'], ['encoding', 'base64'], ['commitment', 'confirmed'], ['mint', OTHER], ['id', 0], ['id', '1']]) {
  test(`request contract rejects ${field}=${value}`, async () => {
    const c = capture(); c.request[field] = value; await rejected(c, 'invalid_capture');
  });
}
for (const [name, edit, reason, state] of [
  ['missing slot', e => { delete e.result.context.slot; }, 'invalid_response'],
  ['zero slot', e => { e.result.context.slot = 0; }, 'invalid_response'],
  ['unsafe slot', e => { e.result.context.slot = 9007199254740992; }, 'invalid_response'],
  ['wrong response id', e => { e.id = 2; }, 'invalid_response'],
  ['wrong owner', e => { e.result.value.owner = OTHER; }, 'wrong_owner', 'unsupported'],
  ['missing account', e => { e.result.value = null; }, 'not_found', 'unsupported'],
  ['not mint', e => { e.result.value.data.parsed.type = 'account'; }, 'not_mint', 'unsupported'],
  ['uninitialized', e => { info(e).isInitialized = false; }, 'uninitialized', 'unsupported'],
  ['owner parser mismatch', e => { e.result.value.data.program = 'spl-token-2022'; }, 'invalid_response'],
  ['missing authority', e => { delete info(e).mintAuthority; }, 'invalid_response'],
  ['malformed freeze authority', e => { info(e).freezeAuthority = ''; }, 'invalid_response'],
  ['executable', e => { e.result.value.executable = true; }, 'invalid_response'],
  ['raw supply overflow', e => { info(e).supply = '18446744073709551616'; }, 'invalid_response'],
  ['numeric raw supply', e => { info(e).supply = 1000; }, 'invalid_response'],
  ['fractional decimals', e => { info(e).decimals = 1.1; }, 'invalid_response'],
  ['original token with extensions', e => { info(e).extensions = [{ extension: 'metadataPointer' }]; }, 'invalid_response'],
]) {
  test(`malformed/unsupported account: ${name}`, async () => { const e = envelope(); edit(e); await rejected(capture(e), reason, state); });
}
for (const [name, extra, reason, state] of [
  ['stale by one microsecond', { evaluatedAt: '2026-10-18T12:01:00.000001Z' }, 'stale_source', 'unknown'],
  ['future received', { responseReceivedAt: '2026-10-18T12:00:00.000001Z' }, 'invalid_clock'],
  ['start after receipt', { requestStartedAt: '2026-10-18T12:00:01.000Z' }, 'invalid_clock'],
  ['missing evaluation clock', { evaluatedAt: null }, 'invalid_clock'],
  ['invalid clock', { evaluatedAt: 'yesterday' }, 'invalid_clock'],
  ['elapsed timeout', { requestStartedAt: '2026-10-18T11:59:54.999Z' }, 'timeout'],
  ['stale HTTP clock', { httpDate: 'Sun, 18 Oct 2026 11:58:59 GMT' }, 'stale_source', 'unknown'],
  ['future HTTP clock', { httpDate: 'Sun, 18 Oct 2026 12:00:01 GMT' }, 'stale_source', 'unknown'],
]) {
  test(`clock admission: ${name}`, () => rejected(capture(undefined, extra), reason, state));
}
test('original acquisition clocks never renewed by evaluation; exactly 60 seconds admitted', async () => {
  const r = await project(MINT, capture(undefined, { evaluatedAt: '2026-10-18T12:01:00.000Z' }));
  assert.equal(r.state, 'observed'); assert.equal(r.provenance.responseReceivedAt, TIME); assert.equal(r.provenance.evaluatedAt, '2026-10-18T12:01:00.000Z');
});
for (const [status, reason] of [[401, 'access_denied'], [403, 'access_denied'], [429, 'rate_limited'], [503, 'upstream_unavailable'], [302, 'upstream_unavailable']]) {
  test(`HTTP ${status}: redacted code, no fallback/sample substitution`, async () => {
    const r = await rejected(capture(undefined, { httpStatus: status, text: 'SECRET upstream echo https://bad/?api-key=secret' }), reason);
    assert.deepEqual(r.providerError, { httpStatus: status, rpcCode: null }); assert.ok(!JSON.stringify(r).includes('SECRET'));
  });
}
for (const [code, reason, retainedCode] of [[429, 'rate_limited', 429], [-32005, 'upstream_unavailable', -32005], [-32601, 'rpc_error', -32601], [99999, 'rpc_error', null]]) {
  test(`RPC code ${code} redacted and bounded`, async () => {
    const e = { jsonrpc: '2.0', id: 1, error: { code, message: 'SECRET', data: { url: 'https://secret/' } } };
    const r = await rejected(capture(e), reason); assert.deepEqual(r.providerError, { httpStatus: 200, rpcCode: retainedCode });
    assert.ok(!JSON.stringify(r).includes('SECRET')); assert.ok(!JSON.stringify(r).includes('https://secret'));
  });
}
for (const text of ['{}', 'not json', '{"jsonrpc":"2.0","jsonrpc":"2.0","id":1}', JSON.stringify(envelope()).replace('400000001', '400000001.0000000001'),
  JSON.stringify({ jsonrpc: '2.0', id: 1, result: {}, error: { code: 429, message: 'no' } })]) {
  test(`malformed JSON/schema never becomes observations: ${text.slice(0, 50)}`, () => rejected(capture(undefined, { text }), 'invalid_response'));
}
test('response size, unknown extra fields, missing capture kind, fake production labeling and key configuration reject', async () => {
  await rejected(capture(undefined, { text: ' '.repeat(65537) }), 'response_too_large');
  await rejected(capture(undefined, { text: 'é'.repeat(32769) }), 'response_too_large');
  for (const extra of [{ kind: 'production_rpc' }, { kind: undefined }, { apiKey: 'DO_NOT_ECHO' }, { url: 'https://evil/' }, { httpStatus: '200' }]) await rejected(capture(undefined, extra), 'invalid_capture');
  const c = capture(); c.request.headers = { authorization: 'DO_NOT_ECHO' }; await rejected(c, 'invalid_capture');
  for (const v of [null, [], false, 'fixture']) await rejected(v, 'invalid_capture');
});
test('recorded label is only a replay claim, never production/authenticated/live', async () => {
  // This input is still invented. Changing the test label does not create an authentic observation.
  const r = await project(MINT, capture(undefined, { kind: 'recorded_response' }));
  assert.equal(r.provenance.captureKind, 'recorded_response'); assert.equal(r.provenance.providerAuthentication, 'not_verified_offline'); assert.equal(r.sourceGo, false);
});
test('invalid exact address is rejected without trimming or lookup', async () => {
  for (const mint of [null, {}, 'SOL', MINT+' ', ' '+MINT, MINT.toLowerCase(), 'https://rpc.example/', '1'.repeat(31)]) {
    // Lowercase is either a different valid mint or invalid; never silently canonicalize it.
    const r = await project(mint, capture()); assert.equal(r.observations, null); assert.equal(r.provenance, null);
    assert.notEqual(r.reason, null);
  }
});
test('OFF is immutable: valid/invalid read attempts and even JS-supplied activation/key/transport have zero calls', async () => {
  let attempts = 0; const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { attempts++; throw Error('network forbidden'); };
  try {
    for (const options of [undefined, { enabled: true }, { sourceGo: true, apiKey: 'NOT_A_REAL_KEY', transport: globalThis.fetch }]) {
      assert.equal((await readHeliusFacts(MINT, options)).reason, 'disabled');
      assert.equal((await readHeliusFacts('not a mint', options)).reason, 'invalid_mint');
    }
    await project(MINT, capture()); await project(MINT, capture(undefined, { httpStatus: 429 }));
    assert.equal(attempts, 0); assert.equal(HELIUS_FACT_POLICY.runtimeAttempts, 0); assert.equal(HELIUS_FACT_POLICY.sourceGo, false);
    assert.ok(Object.isFrozen(HELIUS_FACT_POLICY));
  } finally { globalThis.fetch = originalFetch; }
});
