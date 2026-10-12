/** Observation integrity only. No signal, yield, uptime or provider-success inference. */
import { normalizeHistory, summarizeHistory, parseHistoryTimestamp } from './history';
import type { Dataset } from './history-source';
import type { TrackedToken } from './tracked-tokens';
import type { Attempt, Audit } from './collector-diagnostics';
export const EXPECTED_INTERVAL_SECONDS = 3600;
export const DELAYED_AFTER_SECONDS = 75 * 60;
export const STALE_AFTER_SECONDS = 3 * 3600;
export type HealthRow = TrackedToken & {
 state: 'current' | 'delayed' | 'stale' | 'missing' | 'quality_issue' | 'source_unavailable';
 latestObservedAt: string | null; observationCount: number; storedCount: number; ageSeconds: number | null;
 missedScheduledSlots: number | null; estimateCapped: boolean;
 issues: string[]; attempt: Attempt['results'][number] | null;
 coverage: { '24h': Coverage; '7d': Coverage };
 evidence: string; dossier: string;
};
type Coverage = { status: string; observationCount: number; observedSeconds: number | null; maxGapSeconds: number | null; startAt: string | null; endAt: string | null };
export type HealthReport = {
 status: 'available' | 'degraded' | 'unavailable'; checkedAt: string; dataset: Dataset;
 collector: { audit: Audit; auditOrigin: 'github' | 'dated_investigation'; auditAgeSeconds: number | null; auditState: 'recent' | 'overdue' | 'unavailable' | 'invalid_time';
  diagnosticSources?: { audit: Dataset; attempt: Dataset }; attempt: Attempt | null; attemptState: 'matched_dataset' | 'unconfirmed' | 'missing' | 'overdue' | 'invalid_time'; commitMatchesDataset: boolean | null };
 rows: HealthRow[];
};
/** Expected cron minute 17, with 15m scheduling grace. Estimates absent records, not confirmed failed jobs. */
export function missedObservationSlots(observedMs: number, nowMs: number) {
 const hour = 3600000, minute17 = 17 * 60000, grace = 15 * 60000;
 let first = Math.floor(observedMs / hour) * hour + minute17;
 if (first <= observedMs) first += hour;
 const last = Math.floor((nowMs - grace - minute17) / hour) * hour + minute17;
 const count = Math.max(0, Math.floor((last - first) / hour) + 1);
 return { count: Math.min(168, count), capped: count > 168 };
}
export function summarizeHealth(store: unknown, tokens: TrackedToken[], dataset: Dataset, audit: Audit, attempt: Attempt | null, auditOrigin: HealthReport['collector']['auditOrigin'], now = new Date()): HealthReport {
 const sourceGood = dataset.sourceStatus === 'available' || dataset.sourceStatus === 'cached';
 const auditAge = (now.getTime() - Date.parse(audit.checkedAt)) / 1000;
 const auditState = !Number.isFinite(auditAge) || auditAge < -60 ? 'invalid_time' : audit.state !== 'checked' ? 'unavailable' : auditAge > 26 * 3600 ? 'overdue' : 'recent';
 const attemptAge = attempt ? (now.getTime() - Date.parse(attempt.finishedAt)) / 1000 : null;
 const attemptState = !attempt ? 'missing' : attemptAge === null || !Number.isFinite(attemptAge) || attemptAge < -60 ? 'invalid_time' : attemptAge > 3 * 3600 ? 'overdue' :
  sourceGood && attempt.expectedDatasetRevision !== null && attempt.expectedDatasetRevision === dataset.revision ? 'matched_dataset' : 'unconfirmed';
 const usableAttempt = attemptState !== 'invalid_time' ? attempt : null;
 const rows = tokens.map(token => {
  const h = summarizeHistory(store ?? {}, token.mint, now);
  const normalized = normalizeHistory(store ?? {}, token.mint, now);
  const latest = normalized.unique.at(-1);
  const quoteVerified = latest?.quote?.mint === token.quoteMint && latest?.quote?.symbol === token.quoteSymbol;
  const issues: string[] = [...h.issues];
  if (latest && !quoteVerified) issues.push('quote_identity_unverified');
  const latestRaw = normalized.raw.find(row => row && typeof row === 'object' && parseHistoryTimestamp((row as Record<string, unknown>).observedAt) === latest?.timestamp) as Record<string, unknown> | undefined;
  if (latestRaw?.providerGeneratedAt !== undefined) {
   const generated = parseHistoryTimestamp(latestRaw.providerGeneratedAt);
   if (generated === null || generated > latest!.timestamp + 60000) issues.push('invalid_provider_metadata');
   else if (now.getTime() - generated > STALE_AFTER_SECONDS * 1000) issues.push('stale_provider');
  }
  const ageSeconds = h.freshness.ageSeconds;
  const state: HealthRow['state'] = !sourceGood ? 'source_unavailable' : h.status === 'invalid_data' || (latest && !quoteVerified) || issues.includes('invalid_provider_metadata') ? 'quality_issue' :
   !latest ? 'missing' : ageSeconds! > STALE_AFTER_SECONDS || issues.includes('stale_provider') ? 'stale' : ageSeconds! > DELAYED_AFTER_SECONDS ? 'delayed' : 'current';
  const coverage = {} as HealthRow['coverage'];
  for (const key of ['24h', '7d'] as const) {
   const w = h.windows[key];
   let status: string = w.status === 'available' ? 'complete' : w.status;
   const relevant = normalized.unique.filter(point => w.startAt && point.timestamp >= Date.parse(w.startAt));
   if (status === 'complete' && relevant.some(point => point.quote?.mint !== token.quoteMint || point.quote?.symbol !== token.quoteSymbol)) status = 'invalid_data';
   if (status === 'complete' && state === 'quality_issue') status = 'invalid_data';
   if (status === 'complete' && state === 'stale') status = 'stale_data';
   if (!sourceGood) status = 'source_unavailable';
   coverage[key] = { status, observationCount: w.observationCount, observedSeconds: w.observedSeconds, maxGapSeconds: w.maxGapSeconds, startAt: w.startAt, endAt: w.endAt };
  }
  const estimate = latest ? missedObservationSlots(latest.timestamp, now.getTime()) : null;
  return { ...token, state, latestObservedAt: h.latestObservedAt, observationCount: h.observationCount, storedCount: h.recordedCount, ageSeconds,
   missedScheduledSlots: estimate?.count ?? null, estimateCapped: estimate?.capped ?? false, issues,
   attempt: usableAttempt?.results.find(row => row.mint === token.mint) ?? null, coverage, evidence: h.evidence, dossier: '/?mint=' + token.mint };
 });
 rows.sort((a, b) => a.name.localeCompare(b.name) || a.mint.localeCompare(b.mint));
 return { status: sourceGood ? 'available' : dataset.sourceStatus === 'degraded' ? 'degraded' : 'unavailable', checkedAt: now.toISOString(), dataset,
  collector: { audit, auditOrigin, auditAgeSeconds: Number.isFinite(auditAge) ? auditAge : null, auditState, attempt: usableAttempt, attemptState,
   commitMatchesDataset: sourceGood && audit.latestDatasetCommit ? audit.latestDatasetCommit.revision === dataset.revision : null }, rows };
}
