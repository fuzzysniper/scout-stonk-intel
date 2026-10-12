import { summarizeHistory, MAX_GAP_MS } from './history';
import type { HistoryWindow } from './history';
import type { Dataset } from './history-source';
import type { TrackedToken } from './tracked-tokens';
export type RadarRow = TrackedToken & {
 observationCount: number; latestObservedAt: string | null;
 freshness: 'fresh' | 'stale' | 'unavailable'; quality: string[];
 pointChange: { status: string; distributedTokens: number | null; startAt: string | null; endAt: string | null; observedSeconds: number | null };
 windows: { '24h': HistoryWindow; '7d': HistoryWindow };
 dossier: string; evidence: string; onchain: string;
};
export type RadarReport = {
 status: 'available' | 'degraded' | 'unavailable'; fetchedAt: string; dataset: Dataset;
 sort: 'name' | 'freshness'; rows: RadarRow[];
};
export function summarizeRadar(store: unknown, tokens: TrackedToken[], dataset: Dataset, sort: RadarReport['sort'] = 'name', now = new Date()): RadarReport {
 const sourceGood = dataset.sourceStatus === 'available' || dataset.sourceStatus === 'cached';
 const rows = tokens.map(token => {
  const history = summarizeHistory(store ?? {}, token.mint, now);
  const change = history.changes.at(-1);
  let status = 'insufficient_history';
  // Explicit quote identity is required; do not retrofit old symbol-only records.
  const identity = history.quote?.mint === token.quoteMint && history.quote?.symbol === token.quoteSymbol;
  if (!sourceGood) status = 'source_unavailable';
  else if (history.freshness.status === 'stale') status = 'stale_data';
  else if (history.status === 'invalid_data') status = 'invalid_data';
  else if (history.observationCount === 0) status = 'no_history';
  else if (!identity) status = 'quote_unverified';
  else if (change) {
   status = change.status;
   if (change.quote?.mint !== token.quoteMint || change.quote?.symbol !== token.quoteSymbol) status = 'quote_unverified';
   if (change.observedSeconds > MAX_GAP_MS / 1000) status = 'long_interval';
  }
  const windows = history.windows;
  for (const window of Object.values(windows)) {
   if (!sourceGood) { window.status = 'source_unavailable'; window.distributedTokens = null; }
   else if (window.status === 'available' && (!identity || (change && change.quote?.mint !== token.quoteMint))) { window.status = 'invalid_data'; window.distributedTokens = null; }
  }
  // Require every window point's quote mint to match the allowlist, not just latest endpoints.
  const raw = store && typeof store === 'object' ? (store as Record<string, unknown>)[token.mint] : null;
  for (const window of Object.values(windows)) {
   if (window.status === 'available' && Array.isArray(raw) && raw.some(point => point && typeof point === 'object' &&
    Date.parse(point.observedAt) >= Date.parse(window.startAt!) && (point.quoteMint !== token.quoteMint || point.quoteSymbol !== token.quoteSymbol))) {
    window.status = 'invalid_data'; window.distributedTokens = null;
   }
  }
  return { ...token, observationCount: history.observationCount, latestObservedAt: history.latestObservedAt,
   freshness: history.freshness.status, quality: [...history.issues, ...(!identity && history.observationCount ? ['quote_unverified'] : [])],
   pointChange: { status, distributedTokens: status === 'available' ? change?.distributedTokens ?? null : null,
    startAt: change?.startAt ?? null, endAt: change?.endAt ?? null, observedSeconds: change?.observedSeconds ?? null },
   windows, dossier: '/?mint=' + encodeURIComponent(token.mint), evidence: history.evidence,
   onchain: 'https://solscan.io/token/' + token.mint,
  };
 });
 rows.sort((a, b) => (sort === 'freshness' ? (Date.parse(b.latestObservedAt ?? '') || 0) - (Date.parse(a.latestObservedAt ?? '') || 0) : 0) || a.name.localeCompare(b.name) || a.mint.localeCompare(b.mint));
 return { status: sourceGood ? 'available' : dataset.sourceStatus === 'degraded' ? 'degraded' : 'unavailable',
  fetchedAt: now.toISOString(), dataset, sort, rows };
}
