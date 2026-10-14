import type { RadarReport, RadarRow } from '../../lib/radar';
import type { TrackedToken } from '../../lib/tracked-tokens';

// Day 1 #38 handoff. Optional metrics deliberately have no UI mapping until
// their source, interval and attribution gates are agreed and tested.
export type PairCatalog = {
 groups: {
  quoteMint: string; quoteSymbol: string; verifiedAt: string; source: string;
  tokens: {
   mint: string; symbol: string; name: string; quoteMint: string; quoteSymbol: string;
   rewardModeVerified: boolean; observationCount?: number; lastObservedAt?: string | null;
   comparisonStatus?: string;
  }[];
 }[];
 dataset: { sourceStatus: string; fetchedAt: string; scope: string; coverage: string };
};
export type PairToken = Pick<TrackedToken, 'mint' | 'name' | 'symbol' | 'quoteMint' | 'quoteSymbol'> & {
 rewardModeVerified: boolean; observationCount: number | null; lastObservedAt: string | null;
 radar: RadarRow | null;
};
export type PairGroup = {
 quoteMint: string; quoteSymbol: string; verifiedAt: string; source: string; tokens: PairToken[];
};
const mintPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const symbolPattern = /^[A-Za-z0-9._-]{1,32}$/;
const date = (v: string | null | undefined) => v && Number.isFinite(Date.parse(v)) ? v : null;
const count = (v: number | undefined) => Number.isSafeInteger(v) && v! >= 0 ? v! : null;

export function fromCatalog(catalog: PairCatalog): PairGroup[] {
 const seen = new Set<string>();
 return catalog.groups.filter(group => mintPattern.test(group.quoteMint) && symbolPattern.test(group.quoteSymbol) &&
  date(group.verifiedAt) && /^https:\/\//.test(group.source)).map(group => ({
  quoteMint: group.quoteMint, quoteSymbol: group.quoteSymbol, verifiedAt: group.verifiedAt, source: group.source,
  tokens: group.tokens.filter(token => {
   const valid = mintPattern.test(token.mint) && token.quoteMint === group.quoteMint && token.quoteSymbol === group.quoteSymbol &&
    symbolPattern.test(token.symbol) && token.name.length > 0 && token.name.length <= 80 && !seen.has(token.mint);
   if (valid) seen.add(token.mint);
   return valid;
  }).map(token => ({ ...token, observationCount: count(token.observationCount),
   lastObservedAt: date(token.lastObservedAt), radar: null })),
 })).sort((a,b) => a.quoteSymbol.localeCompare(b.quoteSymbol) || a.quoteMint.localeCompare(b.quoteMint));
}

export function fromTracked(tokens: TrackedToken[], report: RadarReport | null): PairGroup[] {
 const catalog: PairCatalog = { groups: [], dataset: { sourceStatus: 'tracked_sample', fetchedAt: '', scope: 'tracked sample', coverage: 'not exhaustive' } };
 for (const token of tokens) {
  let group = catalog.groups.find(group => group.quoteMint === token.quoteMint);
  if (!group) { group = { quoteMint: token.quoteMint, quoteSymbol: token.quoteSymbol, verifiedAt: token.verifiedAt, source: token.discoverySource, tokens: [] }; catalog.groups.push(group); }
  group.tokens.push({ ...token, rewardModeVerified: true });
 }
 return fromCatalog(catalog).map(group => ({ ...group, tokens: group.tokens.map(token => {
  const row = report?.rows.find(row => row.mint === token.mint && row.quoteMint === token.quoteMint && row.quoteSymbol === token.quoteSymbol);
  return { ...token, radar: row ?? null, observationCount: count(row?.observationCount), lastObservedAt: date(row?.latestObservedAt) };
 }).sort((a,b) => a.symbol.localeCompare(b.symbol) || a.mint.localeCompare(b.mint)) }));
}

export function searchPairs(groups: PairGroup[], query: string) {
 const search = query.trim().toLowerCase();
 return groups.filter(group => [group.quoteSymbol, group.quoteMint, ...group.tokens.flatMap(token => [token.symbol, token.name, token.mint])]
  .some(value => value.toLowerCase().includes(search)));
}
