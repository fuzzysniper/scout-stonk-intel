/** Recorded cumulative counters only. No interpolation, summation across resets, or live API calls. */
import { isSolanaMint } from './solana';
import type { Dataset } from './history-source';
export const MAX_GAP_MS = 2 * 60 * 60 * 1000;
export const STALE_AFTER_MS = 3 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

type Issue = 'missing_data' | 'malformed_timestamp' | 'duplicate_timestamp' | 'conflicting_duplicate' | 'counter_decrease' | 'inconsistent_quote_asset' | 'unverified_source' | 'stale_data' | 'future_timestamp';
type Quote = { symbol: string; mint: string | null };
export type Observation = { observedAt: string; timestamp: number; distributedTokens: number | null; payoutCount: number | null; quote: Quote | null; source: string | null; conflict: boolean };
type Change = { startAt: string; endAt: string; observedSeconds: number; distributedTokens: number | null; quote: Quote | null; status: 'available' | 'invalid_data'; issues: Issue[] };
export type HistoryWindow = {
 status: 'available' | 'insufficient_history' | 'invalid_data' | 'stale_data' | 'source_unavailable';
 requestedSeconds: number;
 requestedStartAt: string | null;
 startAt: string | null;
 endAt: string | null;
 observedSeconds: number | null;
 boundaryOffsetSeconds: number | null;
 timing: 'exact' | 'nearest_snapshot' | null;
 observationCount: number;
 maxGapSeconds: number | null;
 distributedTokens: number | null;
 issues: Issue[];
};
export type HistorySummary = {
 mint: string;
 status: 'recorded' | 'no_history' | 'invalid_data';
 fetchedAt: string;
 latestObservedAt: string | null;
 source: string;
 evidence: string;
 recordedCount: number;
 observationCount: number;
 startAt: string | null;
 endAt: string | null;
 quote: Quote | null;
 latestLifetimeTotal: number | null;
 freshness: { status: 'fresh' | 'stale' | 'unavailable'; ageSeconds: number | null; staleAfterSeconds: number };
 issues: Issue[];
 changes: Change[];
 windows: { '24h': HistoryWindow; '7d': HistoryWindow };
};

export type HistoryReport = HistorySummary & { dataset: Dataset; dataFetchedAt: string | null };

function object(value: unknown): value is Record<string, unknown> {
 return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function amount(value: unknown): number | null {
 return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
export function parseHistoryTimestamp(value: unknown): number | null {
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|\+00:00)$/.test(value)) return null;
 const parsed = Date.parse(value);
 return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 19) === value.slice(0, 19) ? parsed : null;
}
function quote(value: Record<string, unknown>): Quote | null {
 if (typeof value.quoteSymbol !== 'string' || !/^[A-Za-z0-9._-]{1,32}$/.test(value.quoteSymbol)) return null;
 if (value.quoteMint != null && (typeof value.quoteMint !== 'string' || !isSolanaMint(value.quoteMint))) return null;
 return { symbol: value.quoteSymbol, mint: typeof value.quoteMint === 'string' ? value.quoteMint : null };
}
function sameQuote(a: Quote | null, b: Quote | null): boolean {
 return a !== null && b !== null && a.symbol === b.symbol && a.mint === b.mint;
}
function usable(point: Observation): boolean {
 return point.distributedTokens !== null && point.quote !== null && point.source !== null && !point.conflict;
}
export function compareHistoryPoints(a: Observation, b: Observation): Change {
 const issues: Issue[] = [];
 if (!usable(a) || !usable(b)) issues.push('missing_data');
 if (a.conflict || b.conflict) issues.push('conflicting_duplicate');
 if (a.quote && b.quote && !sameQuote(a.quote, b.quote)) issues.push('inconsistent_quote_asset');
 if ((a.distributedTokens !== null && b.distributedTokens !== null && b.distributedTokens < a.distributedTokens) ||
     (a.payoutCount !== null && b.payoutCount !== null && b.payoutCount < a.payoutCount)) issues.push('counter_decrease');
 return {
  startAt: a.observedAt, endAt: b.observedAt, observedSeconds: (b.timestamp - a.timestamp) / 1000,
  distributedTokens: issues.length === 0 ? b.distributedTokens! - a.distributedTokens! : null,
  quote: sameQuote(a.quote, b.quote) ? b.quote : null,
  status: issues.length === 0 ? 'available' : 'invalid_data', issues,
 };
}

export function normalizeHistory(store: unknown, mint: string, now = new Date()) {
 const source = 'https://www.stonkfun.xyz/api/public/v1/tokens/' + encodeURIComponent(mint) + '/rewards';
 const issues = new Set<Issue>();
 const rows = object(store) && Object.hasOwn(store, mint) ? store[mint] : undefined;
 const raw: unknown[] = Array.isArray(rows) ? rows : [];
 if (!object(store) || (rows !== undefined && !Array.isArray(rows))) issues.add('missing_data');
 const points: Observation[] = [];
 const orderingIssues = new Set<Issue>();
 for (const row of raw) {
  const time = object(row) ? parseHistoryTimestamp(row.observedAt) : null;
  if (time === null) { issues.add('malformed_timestamp'); orderingIssues.add('malformed_timestamp'); continue; }
  if (time > now.getTime()) { issues.add('future_timestamp'); orderingIssues.add('future_timestamp'); continue; }
  const r = row as Record<string, unknown>;
  const total = amount(r.distributedTokens);
  const asset = quote(r);
  const provenance = r.source === source ? source : null;
  if (total === null || asset === null) issues.add('missing_data');
  if (provenance === null) issues.add('unverified_source');
  points.push({ observedAt: new Date(time).toISOString(), timestamp: time, distributedTokens: total,
   payoutCount: Number.isSafeInteger(r.payoutCount) && amount(r.payoutCount) !== null ? r.payoutCount as number : null,
   quote: asset, source: provenance, conflict: false });
 }
 points.sort((a, b) => a.timestamp - b.timestamp);
 const unique: Observation[] = [];
 for (const point of points) {
  const previous = unique.at(-1);
  if (previous?.timestamp === point.timestamp) {
   issues.add('duplicate_timestamp');
   if (previous.distributedTokens !== point.distributedTokens || previous.payoutCount !== point.payoutCount ||
       !sameQuote(previous.quote, point.quote) || previous.source !== point.source) {
    previous.conflict = true; issues.add('conflicting_duplicate');
   }
  } else unique.push(point);
 }
 return { source, issues, orderingIssues, unique, raw, rows };
}

/** Select actual points at/before requested boundaries; never interpolate missing samples. */
export function selectObservedInterval(points: Observation[], requestedStart: number, requestedEnd: number) {
 const endIndex = points.findLastIndex(point => point.timestamp <= requestedEnd);
 const index = points.findLastIndex(point => point.timestamp <= requestedStart);
 const segment = endIndex < 0 ? [] : points.slice(index >= 0 ? index : 0, endIndex + 1);
 const gaps = segment.slice(1).map((point, i) => point.timestamp - segment[i].timestamp);
 return { index, endIndex, segment, gaps, maxGapSeconds: gaps.length ? Math.max(...gaps) / 1000 : null };
}

export function summarizeHistory(store: unknown, mint: string, now = new Date()): HistorySummary {
 const { source, issues, orderingIssues, unique, raw, rows } = normalizeHistory(store, mint, now);
 const first = unique[0] ?? null;
 const last = unique.at(-1) ?? null;
 const ageSeconds = last ? (now.getTime() - last.timestamp) / 1000 : null;
 const stale = ageSeconds !== null && ageSeconds > STALE_AFTER_MS / 1000;
 if (stale) issues.add('stale_data');
 if (!last) issues.add('missing_data');
 const changes: Change[] = [];
 for (let i = 1; i < unique.length; i++) {
  const change = compareHistoryPoints(unique[i - 1], unique[i]);
  for (const issue of change.issues) issues.add(issue);
  if (orderingIssues.size) { change.status = 'invalid_data'; change.distributedTokens = null; change.issues.push(...orderingIssues); }
  changes.push(change);
 }
 function window(hours: number): HistoryWindow {
  const requestedMs = hours * HOUR_MS;
  const target = last ? last.timestamp - requestedMs : null;
  const result: HistoryWindow = {
   status: 'insufficient_history', requestedSeconds: requestedMs / 1000,
   requestedStartAt: target === null ? null : new Date(target).toISOString(),
   startAt: null, endAt: last?.observedAt ?? null, observedSeconds: null, boundaryOffsetSeconds: null,
   timing: null, observationCount: 0, maxGapSeconds: null, distributedTokens: null, issues: [],
  };
  if (!last || target === null) return result;
  // At or before the boundary only: never present a shorter period as a full window.
  const { index, segment, gaps, maxGapSeconds } = selectObservedInterval(unique, target, last.timestamp);
  const baseline = segment[0];
  result.observationCount = segment.length;
  if (baseline) {
   result.startAt = baseline.observedAt;
   result.observedSeconds = (last.timestamp - baseline.timestamp) / 1000;
   result.boundaryOffsetSeconds = (baseline.timestamp - target) / 1000;
  }
  result.maxGapSeconds = maxGapSeconds;
  // Stale observations cannot claim current windows, even with incomplete coverage.
  if (stale) { result.status = 'stale_data'; result.issues = ['stale_data']; return result; }
  if (index < 0 || !baseline || target - baseline.timestamp > MAX_GAP_MS || gaps.some(gap => gap > MAX_GAP_MS)) return result;
  result.timing = baseline.timestamp === target ? 'exact' : 'nearest_snapshot';
  const invalid = new Set<Issue>();
  for (const issue of orderingIssues) invalid.add(issue);
  for (let i = 1; i < segment.length; i++) for (const issue of compareHistoryPoints(segment[i - 1], segment[i]).issues) invalid.add(issue);
  if (invalid.size) { result.status = 'invalid_data'; result.issues = [...invalid]; return result; }
  result.status = 'available';
  result.distributedTokens = last.distributedTokens! - baseline.distributedTokens!;
  return result;
 }
 return {
  mint, status: last ? (usable(last) && orderingIssues.size === 0 ? 'recorded' : 'invalid_data') : raw.length > 0 || !object(store) || (rows !== undefined && !Array.isArray(rows)) ? 'invalid_data' : 'no_history',
  fetchedAt: now.toISOString(), source, evidence: '/api/history?mint=' + encodeURIComponent(mint),
  latestObservedAt: last?.observedAt ?? null,
  recordedCount: raw.length, observationCount: unique.length,
  startAt: first?.observedAt ?? null, endAt: last?.observedAt ?? null,
  quote: last && usable(last) ? last.quote : null,
  latestLifetimeTotal: last && usable(last) ? last.distributedTokens : null,
  freshness: { status: last ? (stale ? 'stale' : 'fresh') : 'unavailable', ageSeconds, staleAfterSeconds: STALE_AFTER_MS / 1000 },
  issues: [...issues], changes, windows: { '24h': window(24), '7d': window(168) },
 };
}
