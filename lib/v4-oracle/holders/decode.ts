import 'server-only';
import { numericJson, integer } from '../../v4-ca-intelligence/decimal';
import { data } from '../../v4-helius-pilot/server/profile';
import { freeze, isExactPublicKey } from '../../onchain-mint/validation';
import { clock, raw } from '../farming/validation';
import { analyzeFarmEvidence } from '../farming';
import { decodeMintBytes, requireValue as need } from '../onchain/bytes';
import { accountBytes, decodeTokenAccount, hash } from './accounts';
import { accountsRequest, clockRequest, HOLDER_BOUNDS as B, largestRequest } from './requests';
import type { HolderCapture, HolderEvidence, HolderResult, HolderSample, RpcCapture, SourceRef } from './contract';
import type { HolderData, Observation } from '../farming/contract';
const admitted = new WeakMap<HolderEvidence, HolderResult>();
const seal = (r: HolderResult): HolderEvidence => { const key = Object.freeze({}) as HolderEvidence; admitted.set(key, freeze(r)); return key; };
export function inspectHolderEvidence(value: unknown): HolderResult | null { return value && typeof value === 'object' ? admitted.get(value as HolderEvidence) ?? null : null; }
type ReadCapture = { c: Omit<RpcCapture, 'responseBytes'>; root: Record<string, unknown>; lexemes: Record<string, unknown>; source: SourceRef };
function capture(input: unknown, method: SourceRef['method'], id: number, now: number): ReadCapture {
  need(data(input, ['endpointHost','requestBody','responseBytes','httpStatus','requestStartedAt','receivedAt']));
  const i = input as RpcCapture;
  need(['api.mainnet.solana.com','api.mainnet-beta.solana.com'].includes(i.endpointHost) && i.httpStatus === 200 && typeof i.requestBody === 'string' && i.requestBody.length <= 2048);
  need(i.responseBytes instanceof Uint8Array && i.responseBytes.byteLength > 0 && i.responseBytes.byteLength <= B.maxResponseBytes);
  // Own an immediate copy before decoding or hashing. No caller hash, providerAuthenticated flag or native label is accepted.
  const bytes = Buffer.from(i.responseBytes), text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const c = Object.freeze({ endpointHost: i.endpointHost, requestBody: i.requestBody, httpStatus: i.httpStatus, requestStartedAt: i.requestStartedAt, receivedAt: i.receivedAt });
  const start = clock(c.requestStartedAt), received = clock(c.receivedAt);
  need(start <= received && received <= now && received - start <= B.timeoutMs && now - received <= B.freshnessMs);
  const p = numericJson(text); need(data(p.value, ['jsonrpc','id','result']) && data(p.lexemes, ['jsonrpc','id','result']));
  const root = p.value as Record<string, unknown>, lexemes = p.lexemes as Record<string, unknown>;
  need(root.jsonrpc === '2.0' && typeof root.id === 'number' && root.id === id && lexemes.id === String(id));
  return { c, root, lexemes, source: { endpointHost: c.endpointHost, method, requestBody: c.requestBody, requestSha256: hash(c.requestBody), responseSha256: hash(bytes), requestStartedAt: c.requestStartedAt, receivedAt: c.receivedAt, contextSlot: null, fieldPath: '$.result' } };
}
function context(r: ReadCapture): { slot: number; values: unknown[]; lexemes: unknown[] } {
  need(data(r.root.result, ['context','value']) && data(r.lexemes.result, ['context','value']));
  const result = r.root.result as Record<string, unknown>, lex = r.lexemes.result as Record<string, unknown>;
  need(data(result.context, ['slot'], ['apiVersion']) && data(lex.context, ['slot'], ['apiVersion']));
  const c = result.context as Record<string, unknown>, l = lex.context as Record<string, unknown>;
  need(typeof c.slot === 'number' && Number.isSafeInteger(c.slot) && c.slot > 0 && integer(l.slot) === String(c.slot));
  if (c.apiVersion !== undefined) need(typeof c.apiVersion === 'string' && /^[0-9A-Za-z.+-]{1,32}$/.test(c.apiVersion));
  need(Array.isArray(result.value) && Array.isArray(lex.value));
  return { slot: c.slot as number, values: result.value as unknown[], lexemes: lex.value as unknown[] };
}
/** Offline original-byte qualification. Native origin/admission is NEVER inferred from caller metadata or hashes. */
export function decodeHolderCapture(input: unknown): HolderEvidence {
  try {
    need(data(input, ['kind','network','mint','evaluatedAt','rights','selection','snapshot','clock']));
    const i = input as HolderCapture;
    need(['synthetic_fixture','recorded_response'].includes(i.kind) && i.network === 'solana-mainnet-beta' && isExactPublicKey(i.mint));
    const now = clock(i.evaluatedAt);
    need(data(i.rights, ['analysis','reviewSha256']) && i.rights.analysis === 'approved_private' && typeof i.rights.reviewSha256 === 'string' && /^[a-f0-9]{64}$/.test(i.rights.reviewSha256));
    const selection = capture(i.selection, 'getTokenLargestAccounts', 260001, now);
    need(selection.c.requestBody === largestRequest(i.mint)); const s = context(selection);
    need(s.values.length <= B.maxAccounts);
    const chosen: { account: string; amountRaw: string; decimals: number }[] = []; let last = (1n << 64n) - 1n;
    for (let n = 0; n < s.values.length; n++) {
      const v = s.values[n], l = s.lexemes[n];
      need(data(v, ['address','amount','decimals'], ['uiAmount','uiAmountString']) && data(l, ['address','amount','decimals'], ['uiAmount','uiAmountString']));
      const value = v as Record<string, unknown>, lex = l as Record<string, unknown>;
      need(isExactPublicKey(value.address) && typeof value.amount === 'string' && raw(value.amount) <= last && typeof value.decimals === 'number' && Number.isInteger(value.decimals) && value.decimals >= 0 && value.decimals <= 255 && integer(lex.decimals) === String(value.decimals));
      chosen.push({ account: value.address as string, amountRaw: value.amount as string, decimals: value.decimals as number }); last = raw(value.amount);
    }
    need(new Set(chosen.map(a => a.account)).size === chosen.length);
    const snapshot = capture(i.snapshot, 'getMultipleAccounts', 260002, now);
    need(snapshot.c.requestBody === accountsRequest(i.mint, chosen.map(a => a.account), s.slot)); const m = context(snapshot);
    need(m.slot >= s.slot && m.slot - s.slot <= B.maxSlotAdvance && m.values.length === chosen.length + 1);
    const mint = accountBytes(m.values[0], m.lexemes[0]), controls = decodeMintBytes(mint.bytes, mint.program);
    need(chosen.every(a => a.decimals === controls.decimals));
    const accounts = chosen.map((a, n) => {
      const decoded = accountBytes(m.values[n + 1], m.lexemes[n + 1], mint.program);
      const result = decodeTokenAccount(decoded.bytes, decoded.program, i.mint, a.account, a.amountRaw, `$.result.value[${n + 1}].data`);
      if (m.slot === s.slot) need(result.amountRaw === a.amountRaw);
      return result;
    });
    const time = capture(i.clock, 'getBlockTime', 260003, now); need(time.c.requestBody === clockRequest(m.slot));
    need([snapshot, time].every(r => r.c.endpointHost === selection.c.endpointHost));
    need(clock(selection.c.receivedAt) <= clock(snapshot.c.requestStartedAt) && clock(snapshot.c.receivedAt) <= clock(time.c.requestStartedAt));
    need(clock(snapshot.c.requestStartedAt) - clock(selection.c.requestStartedAt) >= 2500 && clock(time.c.requestStartedAt) - clock(snapshot.c.requestStartedAt) >= 2500);
    need(clock(time.c.receivedAt) - clock(selection.c.requestStartedAt) <= B.batchMs);
    const seconds = integer(time.lexemes.result, 253402300799n);
    need(typeof time.root.result === 'number' && seconds !== null);
    const sourceMs = Number(BigInt(seconds!) * 1000n); need(sourceMs <= clock(snapshot.c.receivedAt) && now - sourceMs <= B.blockAgeMs);
    const sourceAt = new Date(sourceMs).toISOString();
    const native = i.mint === 'So11111111111111111111111111111111111111112' || accounts.some(a => a.native);
    const supported = controls.decimals <= 18 && controls.extensionTypes.length === 0 && accounts.every(a => a.unsupportedExtensions.length === 0) && !native;
    const total = accounts.reduce((sum, a) => sum + BigInt(a.amountRaw), 0n);
    if (supported) need(total <= BigInt(controls.rawSupply));
    const refs: SourceRef[] = [ { ...selection.source, contextSlot: String(s.slot), fieldPath: '$.result.value' }, { ...snapshot.source, contextSlot: String(m.slot), fieldPath: '$.result.value' }, { ...time.source, contextSlot: String(m.slot) } ];
    let candidate: Observation<HolderData> | null = null;
    if (supported && BigInt(controls.rawSupply) > 0n && accounts.length > 0) candidate = {
      mint: i.mint,
      evidence: { provider: 'solana_rpc', captureKind: i.kind, network: 'solana-mainnet-beta', commitment: 'finalized', responseSha256: snapshot.source.responseSha256, fieldPath: '$.result.value', clockKind: 'finalized_block_time', clockResponseSha256: time.source.responseSha256, clockFieldPath: '$.result', sourceAt, receivedAt: snapshot.c.receivedAt, contextSlot: m.slot, rights: { ...i.rights } },
      // Complete ONLY for the requested selected list, never all token accounts or current top-N ranking.
      window: { from: sourceAt, to: sourceAt, firstSlot: m.slot, lastSlot: m.slot, status: 'complete' },
      data: { supplyRaw: controls.rawSupply, decimals: controls.decimals, snapshotSlot: m.slot, population: 'largest_token_accounts', accounts: accounts.map(a => ({ account: a.account, mint: a.mint, owner: a.tokenOwner, amountRaw: a.amountRaw })), exclusions: [] }
    };
    const analysis = candidate ? analyzeFarmEvidence({ mint: i.mint, asOf: i.evaluatedAt, holders: candidate }) : null;
    need(!analysis || analysis.details.concentration.status === 'reported');
    const sample: HolderSample = { mint: i.mint, kind: i.kind, providerAuthenticated: false, assurance: 'captured_request_binding_not_authenticated_native', coverage: 'selected_token_accounts_only', fullHolderCoverage: false, beneficialOwnership: 'unknown', supplyRaw: controls.rawSupply, decimals: controls.decimals, mintProgram: mint.program, mintAccountDataSha256: hash(mint.bytes), mintExtensionTypes: controls.extensionTypes, supportedBalanceSemantics: supported,
      selectionSlot: String(s.slot), snapshotSlot: String(m.slot), sourceAt, clockKind: 'finalized_block_time_estimate', atomicAcrossCalls: false, minContextSlotIsLowerBoundOnly: true, selectionAmountsChanged: accounts.filter(a => a.amountRaw !== a.selectionAmountRaw).length, accounts, exclusions: [], source: refs, candidate, analysis };
    return seal({ state: 'candidate_sample', reason: candidate ? 'decoded_sample_native_source_admission_required' : 'unsupported_balance_semantics_or_empty_denominator', sample });
  } catch { return seal({ state: 'unavailable', reason: 'missing_stale_restricted_inconsistent_or_malformed_capture', sample: null }); }
}
