/** Deterministic calendar-day research. Actual endpoints only; no inferred payouts or cross-asset totals. */
import { createHash } from 'node:crypto';
import { normalizeHistory, selectObservedInterval, compareHistoryPoints, parseHistoryTimestamp, MAX_GAP_MS, STALE_AFTER_MS } from './history';
import type { Dataset } from './history-source';
import type { TrackedToken } from './tracked-tokens';
import type { HealthReport } from './data-health';
export const BRIEF_METHOD = 'utc-day-v1';
const DAY = 86400000;
export function validBriefDate(value: string, now = new Date()): boolean {
 return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '2020-01-01' && value <= now.toISOString().slice(0, 10) &&
  parseHistoryTimestamp(value + 'T00:00:00Z') !== null;
}
export type BriefRow = {
 mint: string; name: string; symbol: string; quoteMint: string; quoteSymbol: string;
 status: 'verified' | 'withheld'; reasons: string[]; warnings: string[];
 pointsInDay: number; comparisonPointCount: number; latestObservedAt: string | null;
 requestedStartAt: string; requestedEndAt: string; startAt: string | null; endAt: string | null;
 startOffsetSeconds: number | null; endOffsetSeconds: number | null; observedSeconds: number | null; maxGapSeconds: number | null;
 distributedTokens: number | null; payoutCountChange: number | null; payoutCountReason: string | null;
 baselineCounter: number | null; endCounter: number | null;
 evidence: { brief: string; history: string; dossier: string; official: string; identity: string };
};
export type BriefReport = {
 date: string; method: typeof BRIEF_METHOD; provisional: true; dayClosed: boolean; evaluatedAt: string;
 canonicalPath: string; version: string | null; sharePath: string | null; dataset: Dataset;
 headline: string; findingCount: number; verifiedCount: number; rows: BriefRow[];
 quality: { checkedAt: string; sourceStatus: Dataset['sourceStatus']; auditOrigin: HealthReport['collector']['auditOrigin']; auditState: string;
  auditCheckedAt: string; scheduledRunCount: number | null; attemptState: string; attemptOverall: string | null; attemptFinishedAt: string | null;
  diagnosticSources: HealthReport['collector']['diagnosticSources']; rows: { mint: string; symbol: string; state: string; latestObservedAt: string | null; ageSeconds: number | null; missedScheduledSlots: number | null; estimateCapped: boolean; attempt: HealthReport['rows'][number]['attempt'] }[] };
};
export function buildBrief(store: unknown, tokens: TrackedToken[], dataset: Dataset, health: HealthReport, date: string, now = new Date()): BriefReport {
 if (!validBriefDate(date, now)) throw Error('Invalid brief date');
 const start = Date.parse(date + 'T00:00:00Z'), end = start + DAY;
 const canonicalPath = '/brief/' + date;
 const evidenceQuery = '?date=' + date;
 const rows: BriefRow[] = [...tokens].sort((a,b) => a.name.localeCompare(b.name) || a.mint.localeCompare(b.mint)).map(token => {
  const normalized = normalizeHistory(store, token.mint, now);
  const selected = selectObservedInterval(normalized.unique, start, end);
  const first = selected.segment[0], last = selected.segment.at(-1);
  const reasons = new Set<string>();
  if (dataset.sourceStatus !== 'available' && dataset.sourceStatus !== 'cached') reasons.add('source_unavailable');
  if (now.getTime() < end) reasons.add('day_in_progress');
  if (!normalized.unique.length) reasons.add(normalized.raw.length || normalized.issues.size ? 'invalid_data' : 'no_history');
  for (const issue of normalized.orderingIssues) reasons.add(issue);
  if (selected.index < 0 || selected.segment.length < 2) reasons.add('insufficient_history');
  if (first && start - first.timestamp > MAX_GAP_MS) reasons.add('missing_start_boundary');
  if (now.getTime() >= end && last && end - last.timestamp > STALE_AFTER_MS) reasons.add('stale_period_end');
  else if (now.getTime() >= end && last && end - last.timestamp > MAX_GAP_MS) reasons.add('missing_end_boundary');
  if (selected.gaps.some(gap => gap >= MAX_GAP_MS)) reasons.add('gapped_history');
  const span = first && last ? last.timestamp - first.timestamp : null;
  if (selected.index >= 0 && span !== null && (span < DAY || span > DAY + 60000)) reasons.add('unmatched_duration');
  for (const point of selected.segment) {
   if (point.quote?.mint !== token.quoteMint || point.quote?.symbol !== token.quoteSymbol) reasons.add('quote_identity_mismatch');
   if (point.distributedTokens === null || point.conflict || !point.source) reasons.add('invalid_data');
  }
  for (let i=1;i<selected.segment.length;i++) for (const issue of compareHistoryPoints(selected.segment[i-1], selected.segment[i]).issues) reasons.add(issue);
  for (const raw of normalized.raw) {
   if (!raw || typeof raw !== 'object') continue;
   const row = raw as Record<string, unknown>, observed = parseHistoryTimestamp(row.observedAt);
   if (observed === null || !first || !last || observed < first.timestamp || observed > last.timestamp) continue;
   if (row.mode !== undefined && row.mode !== 'reward') reasons.add('invalid_provider_metadata');
   if (row.providerGeneratedAt !== undefined) {
    const generated = parseHistoryTimestamp(row.providerGeneratedAt);
    if (generated === null || generated > observed + 60000) reasons.add('invalid_provider_metadata');
    else if (observed - generated > STALE_AFTER_MS) reasons.add('stale_provider');
   }
  }
  const distributed = !reasons.size && first && last ? last.distributedTokens! - first.distributedTokens! : null;
  if (distributed !== null && !Number.isFinite(distributed)) reasons.add('non_finite_calculation');
  const passed = reasons.size === 0;
  const payoutAvailable = passed && selected.segment.every(point => point.payoutCount !== null);
  return { mint: token.mint, name: token.name, symbol: token.symbol, quoteMint: token.quoteMint, quoteSymbol: token.quoteSymbol,
   status: passed ? 'verified' : 'withheld', reasons: [...reasons], warnings: normalized.issues.has('duplicate_timestamp') ? ['duplicate_timestamp'] : [],
   pointsInDay: normalized.unique.filter(point => point.timestamp >= start && point.timestamp < end).length,
   comparisonPointCount: selected.segment.length, latestObservedAt: normalized.unique.filter(point => point.timestamp < end && point.timestamp >= start).at(-1)?.observedAt ?? null,
   requestedStartAt: new Date(start).toISOString(), requestedEndAt: new Date(end).toISOString(),
   startAt: first?.observedAt ?? null, endAt: last?.observedAt ?? null,
   startOffsetSeconds: first ? (first.timestamp-start)/1000 : null, endOffsetSeconds: last ? (last.timestamp-end)/1000 : null,
   observedSeconds: span === null ? null : span/1000, maxGapSeconds: selected.maxGapSeconds,
   distributedTokens: passed ? distributed : null, payoutCountChange: payoutAvailable ? last!.payoutCount! - first!.payoutCount! : null,
   payoutCountReason: payoutAvailable ? null : passed ? 'missing_or_invalid_payout_count' : 'comparison_withheld',
   baselineCounter: passed ? first!.distributedTokens : null, endCounter: passed ? last!.distributedTokens : null,
   evidence: { brief: '/api/brief' + evidenceQuery, history: '/api/history?mint=' + token.mint, dossier: '/?mint=' + token.mint,
    official: token.source, identity: '/evidence/reward-verification.json' },
  };
 });
 // Version published claim gates as well as inputs: day closure, future records becoming valid,
 // or source degradation must not silently change claims under the same version.
 const version = dataset.revision ? createHash('sha256').update(JSON.stringify({ method: BRIEF_METHOD, date, dataset: dataset.revision,
  dayClosed: now.getTime() >= end, tokens: [...tokens].sort((a,b) => a.mint.localeCompare(b.mint)),
  claims: rows.map(row => { const { evidence: _evidence, ...claim } = row; void _evidence; return claim; }),
 })).digest('hex') : null;
 const sharePath = version ? canonicalPath + '?v=' + version : null;
 for (const row of rows) row.evidence.brief += version ? '&v=' + version : '';
 const findingCount = rows.filter(row => row.status === 'verified' && row.distributedTokens! > 0).length;
 const collector = health.collector;
 return { date, method: BRIEF_METHOD, provisional: true, dayClosed: now.getTime() >= end, evaluatedAt: now.toISOString(),
  canonicalPath, version, sharePath, dataset, headline: findingCount ? 'Recorded reward distributions, with evidence' : 'No verified change to report',
  findingCount, verifiedCount: rows.filter(row => row.status === 'verified').length, rows,
  quality: { checkedAt: health.checkedAt, sourceStatus: dataset.sourceStatus, auditOrigin: collector.auditOrigin, auditState: collector.auditState,
   auditCheckedAt: collector.audit.checkedAt, scheduledRunCount: collector.audit.scheduledRunCount, attemptState: collector.attemptState,
   attemptOverall: collector.attempt?.overall ?? null, attemptFinishedAt: collector.attempt?.finishedAt ?? null, diagnosticSources: collector.diagnosticSources,
   rows: health.rows.map(row => ({ mint: row.mint, symbol: row.symbol, state: row.state, latestObservedAt: row.latestObservedAt, ageSeconds: row.ageSeconds,
    missedScheduledSlots: row.missedScheduledSlots, estimateCapped: row.estimateCapped, attempt: row.attempt })) },
 };
}
