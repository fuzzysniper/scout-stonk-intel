/** Pure, observed counter comparisons. No prediction, currency conversion or holder-profit inference. */
import { normalizeHistory, selectObservedInterval, compareHistoryPoints, parseHistoryTimestamp, MAX_GAP_MS, STALE_AFTER_MS } from './history';
import type { Observation } from './history';
import type { Dataset } from './history-source';
import { isSolanaMint } from './solana';
export const SIGNAL_PERIOD_MS = 24 * 60 * 60 * 1000;
export const MATCH_TOLERANCE_MS = 60 * 1000;
export type SignalPeriod = {
 requestedStartAt: string | null; requestedEndAt: string | null;
 startAt: string | null; endAt: string | null;
 startBoundaryOffsetSeconds: number | null; endBoundaryOffsetSeconds: number | null;
 observedSeconds: number | null; observationCount: number; maxGapSeconds: number | null;
 timing: 'exact' | 'nearest_snapshot' | null;
 distributedTokens: number | null; tokensPerHour: number | null; payoutCountChange: number | null;
};
export type SignalReport = {
 status: 'available' | 'unavailable'; confidence: 'coverage_passed' | 'withheld'; reasons: string[]; warnings: string[];
 current: SignalPeriod; previous: SignalPeriod;
 accelerationPercent: number | null;
 category: 'increased_velocity' | 'decreased_velocity' | 'unchanged_velocity' | 'new_activity' | 'no_activity' | 'unavailable';
 payoutCountStatus: 'available' | 'unavailable'; payoutCountReason: string | null;
 latestObservedAt: string | null; evaluatedAt: string | null;
};
function period(points: Observation[], anchor: number | null) {
 const selected = anchor === null ? { index: -1, endIndex: -1, segment: [] as Observation[], gaps: [] as number[], maxGapSeconds: null } : selectObservedInterval(points, anchor - SIGNAL_PERIOD_MS, anchor);
 const first = selected.segment[0], last = selected.segment.at(-1);
 const metadata: SignalPeriod = {
  requestedStartAt: anchor === null ? null : new Date(anchor - SIGNAL_PERIOD_MS).toISOString(), requestedEndAt: anchor === null ? null : new Date(anchor).toISOString(),
  startAt: first?.observedAt ?? null, endAt: last?.observedAt ?? null,
  startBoundaryOffsetSeconds: anchor !== null && first ? (first.timestamp - (anchor - SIGNAL_PERIOD_MS)) / 1000 : null,
  endBoundaryOffsetSeconds: anchor !== null && last ? (last.timestamp - anchor) / 1000 : null,
  observedSeconds: first && last ? (last.timestamp - first.timestamp) / 1000 : null,
  observationCount: selected.segment.length, maxGapSeconds: selected.maxGapSeconds,
  timing: selected.index >= 0 && first && anchor !== null ? first.timestamp === anchor - SIGNAL_PERIOD_MS ? 'exact' : 'nearest_snapshot' : null,
  distributedTokens: null, tokensPerHour: null, payoutCountChange: null,
 };
 return { ...selected, metadata };
}
export function calculateSignals(store: unknown, mint: string, quote: { mint: string; symbol: string } | null, sourceStatus: Dataset['sourceStatus'], now = new Date()): SignalReport {
 const normalized = normalizeHistory(store, mint, now);
 const latest = normalized.unique.at(-1);
 const current = period(normalized.unique, latest?.timestamp ?? null);
 // The actual shared boundary anchors the previous target: no overlap, no gap, no double-counted counter delta.
 const shared = current.index >= 0 ? current.segment[0] : null;
 const previous = period(normalized.unique, shared?.timestamp ?? null);
 const reasons = new Set<string>();
 const warnings = normalized.issues.has('duplicate_timestamp') ? ['duplicate_timestamp'] : [];
 if (!Number.isFinite(now.getTime())) reasons.add('invalid_reference_time');
 if (typeof mint !== 'string' || !isSolanaMint(mint) || !quote || typeof quote.mint !== 'string' || !isSolanaMint(quote.mint) || typeof quote.symbol !== 'string' || !/^[A-Za-z0-9._-]{1,32}$/.test(quote.symbol)) reasons.add('invalid_verified_quote');
 if (sourceStatus !== 'available' && sourceStatus !== 'cached') reasons.add('source_unavailable');
 if (!latest) reasons.add(normalized.raw.length || normalized.issues.size ? 'invalid_data' : 'no_history');
 if (latest && now.getTime() - latest.timestamp > STALE_AFTER_MS) reasons.add('stale_data');
 for (const issue of normalized.orderingIssues) reasons.add(issue);
 for (const [label, window] of [['current', current], ['previous', previous]] as const) {
  if (window.index < 0 || window.segment.length < 2) reasons.add('insufficient_' + label + '_history');
  if (window.metadata.startBoundaryOffsetSeconds !== null && -window.metadata.startBoundaryOffsetSeconds * 1000 > MAX_GAP_MS) reasons.add('missing_' + label + '_boundary');
  // Signal Lab is deliberately stricter than archived history: exactly 2h gaps fail.
  if (window.gaps.some(gap => gap >= MAX_GAP_MS)) reasons.add('gapped_' + label + '_history');
  if (window.index >= 0 && window.metadata.observedSeconds !== null && (window.metadata.observedSeconds * 1000 < SIGNAL_PERIOD_MS || window.metadata.observedSeconds * 1000 > SIGNAL_PERIOD_MS + MATCH_TOLERANCE_MS)) reasons.add('unmatched_duration');
  for (let i = 1; i < window.segment.length; i++) for (const issue of compareHistoryPoints(window.segment[i - 1], window.segment[i]).issues) reasons.add(issue);
  for (const point of window.segment) {
   if (point.quote?.mint !== quote?.mint || point.quote?.symbol !== quote?.symbol) reasons.add('inconsistent_verified_quote');
  }
 }
 // Validate optional provider metadata at every compared point; historical generation times are compared to their own observation time.
 const earliest = previous.segment[0]?.timestamp ?? current.segment[0]?.timestamp ?? Infinity;
 for (const raw of normalized.raw) {
  if (!raw || typeof raw !== 'object') continue;
  const row = raw as Record<string, unknown>;
  const observed = parseHistoryTimestamp(row.observedAt);
  if (observed === null || observed < earliest || observed > (latest?.timestamp ?? -Infinity)) continue;
  if (row.mode !== undefined && row.mode !== 'reward') reasons.add('invalid_metadata');
  if (row.providerGeneratedAt !== undefined) {
   const generated = parseHistoryTimestamp(row.providerGeneratedAt);
   if (generated === null || generated > observed + 60000) reasons.add('invalid_metadata');
   else if (observed - generated > STALE_AFTER_MS || (observed === latest?.timestamp && now.getTime() - generated > STALE_AFTER_MS)) reasons.add('stale_provider');
  }
 }
 const result: SignalReport = {
  status: 'unavailable', confidence: 'withheld', reasons: [...reasons], warnings,
  current: current.metadata, previous: previous.metadata,
  accelerationPercent: null, category: 'unavailable', payoutCountStatus: 'unavailable', payoutCountReason: 'comparison_withheld',
  latestObservedAt: latest?.observedAt ?? null, evaluatedAt: Number.isFinite(now.getTime()) ? now.toISOString() : null,
 };
 if (reasons.size) return result;
 const values = [current, previous].map(window => {
  const first = window.segment[0], last = window.segment.at(-1)!;
  const distributed = last.distributedTokens! - first.distributedTokens!;
  return { distributed, velocity: distributed / (window.metadata.observedSeconds! / 3600) };
 });
 const acceleration = values[1].velocity > 0 ? (values[0].velocity / values[1].velocity - 1) * 100 : null;
 if (values.some(value => !Number.isFinite(value.distributed) || !Number.isFinite(value.velocity) || (value.distributed > 0 && value.velocity === 0)) || (acceleration !== null && !Number.isFinite(acceleration))) {
  result.reasons = ['non_finite_calculation']; return result;
 }
 result.status = 'available'; result.confidence = 'coverage_passed';
 result.accelerationPercent = acceleration;
 result.category = values[1].distributed === 0 ? values[0].distributed > 0 ? 'new_activity' : 'no_activity' : acceleration! > 0 ? 'increased_velocity' : acceleration! < 0 ? 'decreased_velocity' : 'unchanged_velocity';
 for (const [index, window] of [current, previous].entries()) {
  window.metadata.distributedTokens = values[index].distributed;
  window.metadata.tokensPerHour = values[index].velocity;
 }
 const payoutAvailable = [...previous.segment, ...current.segment].every(point => point.payoutCount !== null);
 result.payoutCountReason = payoutAvailable ? null : 'missing_or_invalid_payout_count';
 if (payoutAvailable) {
  result.payoutCountStatus = 'available';
  for (const window of [current, previous]) window.metadata.payoutCountChange = window.segment.at(-1)!.payoutCount! - window.segment[0].payoutCount!;
 }
 return result;
}
