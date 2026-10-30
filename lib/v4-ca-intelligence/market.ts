import 'server-only';
import { createHash } from 'node:crypto';
import { freeze, isExactPublicKey } from '../onchain-mint/validation';
import { TOKEN_PROGRAM, TOKEN_2022_PROGRAM } from '../onchain-mint/policy';
import type { Evidence, MarketEvidence, SourceRef, TradingWindow, UnknownReason, Window } from './contract';
import { decimal, integer, numericJson, share } from './decimal';
export type Capture = Readonly<{ mint: string; text: string; requestStartedAt: string; receivedAt: string; evaluatedAt: string;
  httpDate: string | null; kind: 'synthetic_fixture' | 'recorded_response' }>;
export const missing = <T>(unit: string, reason: UnknownReason = 'not_observed', source: SourceRef | null = null, paths: readonly string[] = []): Evidence<T> => ({ state: 'unknown', value: null, unit, reason, source, paths });
const obj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
function at(x: unknown, path: string): unknown { for (const p of path.split('.')) { if (!obj(x)) return undefined; x = x[p]; } return x; }
/** Preserve original RFC3339 nanoseconds. Never Date-round a future source time into the present. */
export function nanos(s: unknown): bigint | null {
  if (typeof s !== 'string') return null;
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/.exec(s); if (!m) return null;
  const base = m[1] + '.000Z', t = Date.parse(base);
  if (!Number.isFinite(t) || new Date(t).toISOString() !== base) return null;
  return BigInt(t) * 1000000n + BigInt((m[2] ?? '').padEnd(9, '0'));
}
function windowEmpty(label: Window, reason: UnknownReason): TradingWindow {
  return { label, seconds: label === '5m' ? 300 : label === '1h' ? 3600 : 86400, observedStartAt: null, observedEndAt: null,
    priceChangePercent: missing('percent', reason), buys: missing('transactions', reason), sells: missing('transactions', reason),
    reportedTraders: missing('provider_reported_traders', reason), buyVolume: missing('provider_volume_unit_unconfirmed', reason), sellVolume: missing('provider_volume_unit_unconfirmed', reason),
    buyTransactionShare: missing('ratio', reason), volumeToLiquidity: missing('ratio', reason) };
}
const LIMITATIONS = [
  'Jupiter metadata and statistics are provider reports, not proof of onchain identity, backing or project legitimacy.',
  'updatedAt is the provider record-update clock, not an independently verified timestamp/cutoff for each metric or a guarantee of current market price.',
  'Labelled rolling windows have unknown exact boundaries, aggregation coverage and wash-trading treatment; price change is not an executable return or forecast.',
  'Holder count is provider-reported; distinct wallets, insider concentration and beneficial ownership are not verified.',
  'firstPool is historical first-pool metadata, not a canonical/current/executable pool, complete pool list or mint creation time. No quote mint or exit capacity is established.',
  'Buy/sell volume units are not explicit in the reviewed schema/guide; USD volumes and volume/liquidity ratios are withheld pending confirmation.',
] as const;
export function emptyMarket(reason: UnknownReason): MarketEvidence {
  return freeze({ state: 'unknown', reason, name: missing('text', reason), symbol: missing('ticker', reason), decimals: missing('decimals', reason), tokenProgram: missing('solana_program', reason),
    priceUsd: missing('USD/token', reason), marketCapUsd: missing('USD', reason), fdvUsd: missing('USD', reason), liquidityUsd: missing('USD', reason),
    holders: missing('provider_reported_holders', reason), reportedTokenCreatedAt: missing('UTC', reason), priceBlockId: missing('provider_reported_block_id', reason),
    firstPool: { address: missing('solana_pool_address', reason), createdAt: missing('UTC', reason) }, canonicalPool: null, alternativePools: [],
    poolCoverage: 'not_enumerated_first_pool_is_not_canonical_or_execution_pool', windows: { '5m': windowEmpty('5m', reason), '1h': windowEmpty('1h', reason), '24h': windowEmpty('24h', reason) }, limitations: [...LIMITATIONS] });
}
/** Offline raw-response parser. NO transport, credential, env, legacy catalog or caller-supplied provider hash. */
export function parseJupiterCapture(input: Capture): MarketEvidence {
  try {
    // Snapshot all primitives before using any input again; closed shape excludes fabricated live labels/hashes.
    if (!obj(input) || Reflect.ownKeys(input).some(k => typeof k !== 'string' || !['mint','text','requestStartedAt','receivedAt','evaluatedAt','httpDate','kind'].includes(k) || !('value' in Object.getOwnPropertyDescriptor(input,k)!))) return emptyMarket('invalid_response');
    const c = { ...input }; if (!isExactPublicKey(c.mint) || typeof c.text !== 'string' || !['synthetic_fixture','recorded_response'].includes(c.kind)) return emptyMarket('invalid_response');
    const start = nanos(c.requestStartedAt), received = nanos(c.receivedAt), evaluated = nanos(c.evaluatedAt);
    if (start === null || received === null || evaluated === null || start > received || received > evaluated || received - start > 5000000000n) return emptyMarket('invalid_response');
    if (evaluated - received > 60000000000n) return emptyMarket('stale');
    if (c.httpDate !== null) {
      if (typeof c.httpDate !== 'string' || c.httpDate.length > 64) return emptyMarket('invalid_response');
      const d = Date.parse(c.httpDate); if (!Number.isFinite(d) || new Date(d).toUTCString() !== c.httpDate) return emptyMarket('invalid_response');
      if (BigInt(d) * 1000000n > received || evaluated - BigInt(d) * 1000000n > 60000000000n) return emptyMarket('stale');
    }
    const { value, lexemes } = numericJson(c.text);
    if (!Array.isArray(value) || !Array.isArray(lexemes) || value.length > 20 || !value.every(obj)) return emptyMarket('invalid_response');
    if (!value.length) return emptyMarket('not_indexed');
    // Exact-mint search is not symbol/name matching. Reject extra results rather than silently picking one.
    if (value.length !== 1 || value[0].id !== c.mint) return emptyMarket('identity_mismatch');
    const row = value[0], raw = lexemes[0];
    if (!obj(raw) || ![TOKEN_PROGRAM,TOKEN_2022_PROGRAM].includes(String(row.tokenProgram)) || ['chain','chainId','network'].some(k => row[k] !== undefined && !['solana','solana-mainnet'].includes(String(row[k])))) return emptyMarket('identity_mismatch');
    const update = nanos(row.updatedAt);
    if (update === null) return emptyMarket('clock_unknown');
    if (update > received || evaluated - update > 60000000000n) return emptyMarket('stale');
    const source: SourceRef = freeze({ provider: 'jupiter_tokens_v2', endpointHost: 'api.jup.ag', responseSha256: createHash('sha256').update(Buffer.from(c.text,'utf8')).digest('hex'),
      captureKind: c.kind, requestStartedAt: c.requestStartedAt, receivedAt: c.receivedAt, evaluatedAt: c.evaluatedAt, sourceUpdatedAt: row.updatedAt as string, httpDate: c.httpDate,
      clockBasis: 'provider_record_update_not_each_metric', independentReplay: false });
    const field = (path: string, unit: string, mode: 'decimal' | 'signed' | 'integer' | 'text' | 'time' = 'decimal'): Evidence<string> => {
      const v = at(row, path), lex = at(raw, path), paths = [path];
      if (v === undefined || v === null) return missing(unit, 'missing', source, paths);
      let result: string | null = null;
      if (mode === 'text') result = typeof v === 'string' && v.length >= 1 && v.length <= 100 && !/[\u0000-\u001f\u007f-\u009f<>\u202a-\u202e\u2066-\u2069]/.test(v) ? v : null;
      else if (mode === 'time') { const t = nanos(v); result = t !== null && t <= received ? v as string : null; }
      else if (typeof v === 'number') result = mode === 'integer' ? integer(lex) : decimal(lex, mode === 'signed');
      return result === null ? missing(unit, 'invalid_response', source, paths) : { state: 'provider_reported', value: result, unit, reason: null, source, paths };
    };
    const decimals = field('decimals','decimals','integer');
    if (decimals.value === null || BigInt(decimals.value) > 255n) return emptyMarket('identity_mismatch');
    const windows = {} as Record<Window, TradingWindow>;
    for (const label of ['5m','1h','24h'] as const) {
      const p = 'stats' + label, buys = field(p+'.numBuys','transactions','integer'), sells = field(p+'.numSells','transactions','integer');
      const ratio = buys.value !== null && sells.value !== null ? share(buys.value, sells.value) : null;
      windows[label] = { ...windowEmpty(label,'missing'), buys, sells, reportedTraders: field(p+'.numTraders','provider_reported_traders','integer'),
        priceChangePercent: field(p+'.priceChange','percent','signed'),
        buyVolume: missing('provider_volume_unit_unconfirmed','unit_unconfirmed',source,[p+'.buyVolume']), sellVolume: missing('provider_volume_unit_unconfirmed','unit_unconfirmed',source,[p+'.sellVolume']),
        buyTransactionShare: ratio === null ? missing('ratio',buys.value !== null && sells.value !== null ? 'zero_denominator' : 'missing',source,[p+'.numBuys',p+'.numSells'])
          : {state:'derived',value:ratio,unit:'ratio',reason:null,source,paths:[p+'.numBuys',p+'.numSells']},
        volumeToLiquidity: missing('ratio','unit_unconfirmed',source,[p+'.buyVolume',p+'.sellVolume','liquidity']) };
    }
    const pool = field('firstPool.id','solana_pool_address','text');
    if (pool.value !== null && (!isExactPublicKey(pool.value) || pool.value === c.mint)) return emptyMarket('identity_mismatch');
    return freeze({ state:'provider_reported',reason:null, name:field('name','text','text'),symbol:field('symbol','ticker','text'),decimals,tokenProgram:field('tokenProgram','solana_program','text'),
      priceUsd:field('usdPrice','USD/token'),marketCapUsd:field('mcap','USD'),fdvUsd:field('fdv','USD'),liquidityUsd:field('liquidity','USD'),holders:field('holderCount','provider_reported_holders','integer'),
      reportedTokenCreatedAt:field('createdAt','UTC','time'),priceBlockId:field('priceBlockId','provider_reported_block_id','integer'),
      firstPool:{address:pool,createdAt:field('firstPool.createdAt','UTC','time')},canonicalPool:null,alternativePools:[],poolCoverage:'not_enumerated_first_pool_is_not_canonical_or_execution_pool',windows,limitations:[...LIMITATIONS] });
  } catch { return emptyMarket('invalid_response'); }
}
