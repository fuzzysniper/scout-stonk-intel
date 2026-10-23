import { ACCOUNTS, LIMITS, PIN, U64_MAX, accountsRequest, freeze, integer, keys, layout, need, object, sha, timeRequest, utc } from './policy';
import { rpcJson } from './json';

const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function decode58(s: string): Buffer {
  need(typeof s === 'string' && s.length >= 32 && s.length <= 44, 'PUBLIC_KEY'); let n = 0n;
  for (const c of s) { const d = alphabet.indexOf(c); need(d >= 0, 'PUBLIC_KEY'); n = n * 58n + BigInt(d); }
  const hex = n.toString(16), body = n === 0n ? Buffer.alloc(0) : Buffer.from(hex.padStart(Math.ceil(hex.length / 2) * 2, '0'), 'hex');
  const bytes = Buffer.concat([Buffer.alloc(s.length - s.replace(/^1+/, '').length), body]); need(bytes.length === 32, 'PUBLIC_KEY'); return bytes;
}
export function encode58(b: Uint8Array): string {
  let n = BigInt('0x' + Buffer.from(b).toString('hex')), out = '';
  while (n) { out = alphabet[Number(n % 58n)] + out; n /= 58n; }
  for (const c of b) { if (c) break; out = '1' + out; } return out;
}
/** Seed-hash equality against published fixed addresses, not a general PDA/curve finder. */
function pinnedSeed(seeds: Uint8Array[], bump: number, program: string, expected: string) {
  const digest = Buffer.from(sha(Buffer.concat([...seeds, Buffer.from([bump]), decode58(program), Buffer.from('ProgramDerivedAddress')])), 'hex');
  need(digest.equals(decode58(expected)), 'PDA_SEED_MISMATCH');
}
export type Capture = Readonly<{ endpoint: string; network: string; requestBody: string; requestedAt: string; receivedAt: string; httpDate: string | null; status: number; body: Uint8Array }>;
function packet(c: Capture, request: string, id: bigint) {
  need(c.endpoint === PIN.endpoint && c.network === PIN.network && c.requestBody === request, 'RPC_SCOPE_MISMATCH');
  need(c.httpDate === null || typeof c.httpDate === 'string' && c.httpDate.length <= 128 && !/[\r\n]/.test(c.httpDate), 'HTTP_CLOCK_METADATA');
  const elapsed = utc(c.receivedAt) - utc(c.requestedAt); need(elapsed >= 0n && elapsed <= BigInt(LIMITS.timeoutMs) * 1000n, 'CAPTURE_CLOCK');
  need(c.status === 200, c.status === 429 ? 'RPC_RATE_LIMIT' : 'RPC_HTTP_FAILURE');
  const p = object(rpcJson(c.body)); keys(p, ['jsonrpc', 'id', 'result']); need(p.jsonrpc === '2.0' && p.id === id, 'RPC_ENVELOPE'); return p.result;
}
function bytes(raw: unknown, owner: string, max: number) {
  const a = object(raw); keys(a, ['data', 'executable', 'lamports', 'owner', 'rentEpoch'], ['space']);
  need(a.owner !== PIN.token2022Program, 'TOKEN_2022_UNSUPPORTED');
  need(a.owner === owner && a.executable === false, 'ACCOUNT_OWNER_OR_EXECUTABLE'); const lamports = integer(a.lamports); integer(a.rentEpoch);
  need(lamports > 0n && Array.isArray(a.data) && a.data.length === 2 && a.data[1] === 'base64' && typeof a.data[0] === 'string' && a.data[0].length <= 4 * Math.ceil(max / 3), 'ACCOUNT_DATA');
  const b = Buffer.from(a.data[0], 'base64'); need(b.length <= max && b.toString('base64') === a.data[0], 'CANONICAL_BASE64');
  if (a.space !== undefined) need(integer(a.space) === BigInt(b.length), 'ACCOUNT_SPACE');
  return { b, lamports };
}
const option = (b: Buffer, offset: number) => { const tag = b.readUInt32LE(offset); need(tag === 0 || tag === 1, 'SPL_OPTION_TAG'); return tag; };
function mint(raw: unknown, quote: boolean) {
  const { b } = bytes(raw, PIN.tokenProgram, 82); need(b.length === 82 && b[45] === 1, 'MINT_LAYOUT_OR_INITIALIZATION'); option(b, 0); option(b, 46);
  if (quote) need(b[44] === 9 && option(b, 0) === 0 && option(b, 46) === 0, 'WSOL_MINT');
  return { decimals: b[44], supplyRaw: b.readBigUInt64LE(36).toString(), program: PIN.tokenProgram, byteHash: sha(b) };
}
function vault(raw: unknown, mint: string, quote: boolean) {
  const { b, lamports } = bytes(raw, PIN.tokenProgram, 165); need(b.length === 165, 'VAULT_LAYOUT');
  need(b.subarray(0, 32).equals(decode58(mint)) && b.subarray(32, 64).equals(decode58(PIN.pool)), 'VAULT_MINT_OR_AUTHORITY');
  need(b[108] === 1, 'VAULT_FROZEN_OR_UNINITIALIZED');
  need(option(b, 72) === 0 && option(b, 129) === 0 && b.readBigUInt64LE(121) === 0n, 'VAULT_DELEGATE_OR_CLOSE_AUTHORITY');
  need(option(b, 109) === (quote ? 1 : 0), 'NATIVE_VAULT_FLAG');
  const amount = b.readBigUInt64LE(64);
  if (quote) need(lamports >= b.readBigUInt64LE(113) + amount, 'WSOL_BACKING');
  return { amountRaw: amount.toString(), byteHash: sha(b) };
}
function pool(raw: unknown) {
  const { b } = bytes(raw, PIN.program, layout.maxAcceptedSize);
  need(layout.program === PIN.program && layout.serializedSize === 287, 'PINNED_IDL');
  const legacy = layout.historicalSizes.includes(b.length), extended = b.length >= layout.extendedMinSize;
  need(legacy || b.length === layout.serializedSize || extended, 'UNSUPPORTED_POOL_LENGTH');
  need(b.subarray(0, 8).equals(Buffer.from(layout.discriminator)), 'POOL_DISCRIMINATOR');
  if (extended) need(b.subarray(layout.serializedSize).every(x => x === 0), 'UNKNOWN_POOL_TAIL');
  const padded = Buffer.alloc(layout.serializedSize); b.copy(padded, 0, 0, layout.serializedSize);
  const fields: Record<string, string | number | boolean> = {};
  for (const f of layout.fields) {
    const at = f.offset;
    if (f.type === 'pubkey') fields[f.name] = encode58(padded.subarray(at, at + 32));
    else if (f.type === 'u64') fields[f.name] = padded.readBigUInt64LE(at).toString();
    else if (f.type === 'i128') fields[f.name] = (padded.readBigUInt64LE(at) + (padded.readBigInt64LE(at + 8) << 64n)).toString();
    else if (f.type === 'bool') { need(padded[at] <= 1, 'POOL_BOOL'); fields[f.name] = padded[at] === 1; }
    else fields[f.name] = f.type === 'u16' ? padded.readUInt16LE(at) : padded[at];
  }
  need(fields.pool_bump === PIN.poolBump && fields.index === PIN.index && fields.creator === PIN.creator && fields.base_mint === PIN.baseMint && fields.quote_mint === PIN.quoteMint && fields.lp_mint === PIN.lpMint && fields.pool_base_token_account === PIN.baseVault && fields.pool_quote_token_account === PIN.quoteVault, 'POOL_IDENTITY');
  pinnedSeed([Buffer.from('pool'), Buffer.from([0, 0]), decode58(PIN.creator), decode58(PIN.baseMint), decode58(PIN.quoteMint)], PIN.poolBump, PIN.program, PIN.pool);
  pinnedSeed([decode58(PIN.pool), decode58(PIN.tokenProgram), decode58(PIN.baseMint)], PIN.baseAtaBump, PIN.associatedProgram, PIN.baseVault);
  pinnedSeed([decode58(PIN.pool), decode58(PIN.tokenProgram), decode58(PIN.quoteMint)], PIN.quoteAtaBump, PIN.associatedProgram, PIN.quoteVault);
  pinnedSeed([Buffer.from('pool_lp_mint'), decode58(PIN.pool)], PIN.lpMintBump, PIN.program, PIN.lpMint);
  return { originalLength: b.length, fields, byteHash: sha(b), defaultedFields: layout.fields.filter(f => f.offset >= b.length).map(f => f.name) };
}
const prepared = new WeakSet<object>();
/** Validated layout only. Capture origin is not authenticated by a pure decoder. */
export function prepareAccounts(c: Capture) {
  const result = object(packet(c, accountsRequest(), 1n)); keys(result, ['context', 'value']); const context = object(result.context); keys(context, ['slot'], ['apiVersion']);
  const slot = integer(context.slot); need(slot > 0n, 'EMPTY_SLOT');
  if (context.apiVersion !== undefined) need(typeof context.apiVersion === 'string' && context.apiVersion.length <= 80, 'API_VERSION');
  need(Array.isArray(result.value) && result.value.length === ACCOUNTS.length && result.value.every(x => x !== null), 'MISSING_OR_PARTIAL_ACCOUNTS');
  const [p, bv, qv, bm, qm] = result.value;
  const decoded = { pool: pool(p), baseVault: vault(bv, PIN.baseMint, false), quoteVault: vault(qv, PIN.quoteMint, true), baseMint: mint(bm, false), quoteMint: mint(qm, true) };
  need(BigInt(decoded.baseVault.amountRaw) > 0n && BigInt(decoded.baseMint.supplyRaw) >= BigInt(decoded.baseVault.amountRaw), 'BASE_RESERVE_OR_SUPPLY');
  const effective = BigInt(decoded.quoteVault.amountRaw) + BigInt(decoded.pool.fields.virtual_quote_reserves as string);
  need(effective > 0n && effective <= U64_MAX, 'EFFECTIVE_RESERVE_RANGE');
  const out = freeze({ slot: slot.toString(), apiVersion: context.apiVersion ?? null, effectiveQuoteRaw: effective.toString(), decoded, source: { requestedAt: c.requestedAt, receivedAt: c.receivedAt, httpDate: c.httpDate, responseSha256: sha(c.body), requestSha256: sha(c.requestBody) } });
  prepared.add(out); return out;
}
export type Prepared = ReturnType<typeof prepareAccounts>;
function ratio(n: bigint, d: bigint) {
  const originalN = n, originalD = d; let a = n, b = d;
  while (b) { const r = a % b; a = b; b = r; } n /= a; d /= a;
  const scale = 10n ** 36n, value = n * scale / d, remainder = n * scale % d;
  const decimal = value === 0n ? null : (value / scale).toString() + '.' + (value % scale).toString().padStart(36, '0');
  return { unit: 'wSOL_per_whole_base_token', numerator: n.toString(), denominator: d.toString(), originalNumerator: originalN.toString(), originalDenominator: originalD.toString(), decimal, decimalPlaces: 36, decimalExact: remainder === 0n, decimalRounding: 'truncated_toward_zero', belowDisplayPrecision: value === 0n };
}
export function finishObservation(p: Prepared, c: Capture, checkedAt: string) {
  need(prepared.has(p), 'PREPARED_CAPTURE_REQUIRED');
  need(utc(c.requestedAt) >= utc(p.source.receivedAt) && utc(checkedAt) >= utc(c.receivedAt), 'OUT_OF_ORDER_CAPTURE');
  const seconds = packet(c, timeRequest(p.slot), 2n); need(seconds !== null, 'BLOCK_TIME_UNKNOWN'); integer(seconds, 253402300799n);
  const blockTimeUs = (seconds as bigint) * 1_000_000n, latest = utc(checkedAt);
  need(blockTimeUs <= utc(p.source.receivedAt) + BigInt(LIMITS.futureSkewSeconds) * 1_000_000n && latest - blockTimeUs <= BigInt(LIMITS.maxBlockAgeSeconds) * 1_000_000n, 'STALE_OR_FUTURE_CONTEXT');
  const q = BigInt(p.effectiveQuoteRaw), base = BigInt(p.decoded.baseVault.amountRaw);
  return freeze({ version: 'pumpswap-reserve-observation/1', assurance: 'VALIDATED_LAYOUT_FROM_CAPTURE_NOT_INDEPENDENT_CHAIN_REPLAY', network: PIN.network, networkAssurance: 'fixed_mainnet_https_endpoint_and_published_accounts_not_genesis_verified', rpcHost: new URL(PIN.endpoint).hostname, identity: PIN, finalizedContextSlot: p.slot, estimatedSlotBlockTime: new Date(Number(seconds) * 1000).toISOString(), estimatedSlotBlockTimeUnixSeconds: (seconds as bigint).toString(), freshness: { state: 'within_development_policy_relative_to_local_clock', ageAtCheckMicros: (latest - blockTimeUs).toString(), maxBlockAgeSeconds: LIMITS.maxBlockAgeSeconds, futureSkewSeconds: LIMITS.futureSkewSeconds }, checkedLocalUtc: checkedAt, clockAssurance: 'RPC_block_time_estimate_and_operator_system_clock', idl: { commit: layout.sourceCommit, sha256: layout.idlSha256, metadata: layout.metadata, deployedBytecodeVerified: false }, ...p, spotPrice: ratio(q * 10n ** BigInt(p.decoded.baseMint.decimals), base * 10n ** BigInt(p.decoded.quoteMint.decimals)), blockTimeSource: { requestedAt: c.requestedAt, receivedAt: c.receivedAt, httpDate: c.httpDate, responseSha256: sha(c.body), requestSha256: sha(c.requestBody) }, limits: ['Point-in-time reserve ratio, not an executable fill or return.', 'Raw quote vault includes retained fees; signed virtual reserves applied.', 'No depth, exit capacity, volume, candles, token age, holder quality or market coverage established.', 'No mint/freeze risk assessment, LP-control assessment, fee schedule or sell simulation.', 'Classic SPL Token only. Token-2022 and unknown layouts are rejected.', 'RPC-reported finalized context, not independent chain replay or deployed-program verification.'] });
}
