import initialAudit from '../data/collector-audit.json';
import { createBoundedJsonSource } from './history-source';
import { parseHistoryTimestamp } from './history';
import { isSolanaMint } from './solana';
export const AUDIT_URL = 'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/collector-audit.json';
export const SUMMARY_URL = 'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/collection-summary.json';
export const COLLECTOR_RUNS_URL = 'https://github.com/fuzzysniper/scout-stonk-intel/actions/workflows/reward-snapshots.yml';
export const REASONS = ['collected', 'counter_reset_recorded', 'duplicate_timestamp', 'provider_not_found', 'provider_rate_limited', 'http_error', 'network_timeout', 'network_error', 'invalid_json', 'invalid_response', 'mint_mode_mismatch', 'quote_mismatch', 'invalid_counter', 'invalid_provider_time', 'stale_provider', 'oversized_response', 'source_redirect', 'out_of_order', 'invalid_storage', 'configuration_invalid', 'unexpected_error'] as const;
export type Attempt = {
 version: 1; startedAt: string; finishedAt: string; event: 'schedule' | 'workflow_dispatch' | 'local' | 'unknown'; runId: number | null;
 overall: 'complete' | 'partial' | 'failed' | 'skipped'; expectedDatasetRevision: string | null;
 results: { mint: string; status: 'collected' | 'failed' | 'skipped'; reason: typeof REASONS[number]; observedAt: string | null }[];
};
export type Audit = {
 version: 1; checkedAt: string; state: 'checked' | 'unavailable'; reason: string | null;
 workflowState: 'active' | 'disabled' | 'unknown'; scheduledRunCount: number | null;
 runs: { id: number; event: 'schedule' | 'workflow_dispatch'; status: string; conclusion: string | null; createdAt: string; updatedAt: string; collectionStep: string | null; commitStep: string | null; confirmedCommit?: string; recordedCount?: number }[];
 latestDatasetCommit: { sha: string; committedAt: string; revision: string } | null;
};
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
const time = (v: unknown) => parseHistoryTimestamp(v) !== null;
const hash = (v: unknown) => typeof v === 'string' && /^sha256:[a-f0-9]{64}$/.test(v);
const integer = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
export function validateAttempt(value: unknown): Attempt {
 if (!object(value) || value.version !== 1 || !time(value.startedAt) || !time(value.finishedAt) || Date.parse(value.finishedAt as string) < Date.parse(value.startedAt as string) ||
  !['schedule', 'workflow_dispatch', 'local', 'unknown'].includes(String(value.event)) || (value.runId !== null && !integer(value.runId)) || !['complete','partial','failed','skipped'].includes(String(value.overall)) ||
  (value.expectedDatasetRevision !== null && !hash(value.expectedDatasetRevision)) || !Array.isArray(value.results) || value.results.length > 10) throw Error('Invalid summary');
 const statuses = value.results.map(row => row && typeof row === 'object' ? row.status : null);
 if ((value.overall === 'complete' && (!statuses.length || statuses.some(status => status !== 'collected'))) ||
     (value.overall === 'partial' && (!statuses.includes('collected') || statuses.every(status => status === 'collected'))) ||
     (value.overall === 'skipped' && (!statuses.length || statuses.some(status => status !== 'skipped')))) throw Error('Invalid outcome totals');
 const seen = new Set();
 for (const row of value.results) {
  if (!object(row) || typeof row.mint !== 'string' || !isSolanaMint(row.mint) || seen.has(row.mint) || !['collected','failed','skipped'].includes(String(row.status)) || !REASONS.includes(row.reason as typeof REASONS[number]) || (row.observedAt !== null && !time(row.observedAt))) throw Error('Invalid result');
  if (row.status === 'collected' && row.observedAt === null) throw Error('Missing observation');
  seen.add(row.mint);
 }
 return {
  version: 1, startedAt: value.startedAt, finishedAt: value.finishedAt, event: value.event, runId: value.runId,
  overall: value.overall, expectedDatasetRevision: value.expectedDatasetRevision,
  results: value.results.map(row => ({ mint: row.mint, status: row.status, reason: row.reason, observedAt: row.observedAt })),
 } as Attempt;
}
export function validateAudit(value: unknown): Audit {
 if (!object(value) || value.version !== 1 || !time(value.checkedAt) || !['checked','unavailable'].includes(String(value.state)) || !['active','disabled','unknown'].includes(String(value.workflowState)) || (value.scheduledRunCount !== null && !integer(value.scheduledRunCount)) || !Array.isArray(value.runs) || value.runs.length > 12) throw Error('Invalid audit');
 for (const row of value.runs) if (!object(row) || !integer(row.id) || !['schedule','workflow_dispatch'].includes(String(row.event)) || !time(row.createdAt) || !time(row.updatedAt)) throw Error('Invalid run');
 const commit = value.latestDatasetCommit;
 if (commit !== null && (!object(commit) || typeof commit.sha !== 'string' || !/^[a-f0-9]{40}$/.test(commit.sha) || !time(commit.committedAt) || !hash(commit.revision))) throw Error('Invalid commit');
 const statuses = ['queued', 'in_progress', 'completed', 'waiting', 'pending', 'requested'];
 const conclusions = ['success', 'failure', 'cancelled', 'skipped', 'timed_out', 'action_required', 'neutral', 'stale', 'startup_failure'];
 if (value.reason !== null && value.reason !== 'api_unavailable') throw Error('Invalid audit reason');
 for (const row of value.runs) {
  if (!statuses.includes(row.status) || (row.conclusion !== null && !conclusions.includes(row.conclusion)) ||
   [row.collectionStep, row.commitStep].some(v => v !== null && !conclusions.includes(v)) ||
   (row.confirmedCommit !== undefined && (typeof row.confirmedCommit !== 'string' || !/^[a-f0-9]{40}$/.test(row.confirmedCommit))) ||
   (row.recordedCount !== undefined && (!integer(row.recordedCount) || row.recordedCount > 10))) throw Error('Invalid run status');
 }
 return {
  version: 1, checkedAt: value.checkedAt, state: value.state, reason: value.reason, workflowState: value.workflowState,
  scheduledRunCount: value.scheduledRunCount,
  runs: value.runs.map(row => ({ id: row.id, event: row.event, status: row.status, conclusion: row.conclusion, createdAt: row.createdAt,
   updatedAt: row.updatedAt, collectionStep: row.collectionStep, commitStep: row.commitStep,
   ...(row.confirmedCommit ? { confirmedCommit: row.confirmedCommit } : {}), ...(row.recordedCount !== undefined ? { recordedCount: row.recordedCount } : {}) })),
  latestDatasetCommit: commit ? { sha: commit.sha, committedAt: commit.committedAt, revision: commit.revision } : null,
 } as Audit;
}
export const readAudit = createBoundedJsonSource(AUDIT_URL, validateAudit, (...args) => fetch(...args), () => Date.now(), 65536);
export const readAttempt = createBoundedJsonSource(SUMMARY_URL, validateAttempt, (...args) => fetch(...args), () => Date.now(), 65536);
export const datedAudit = () => validateAudit(initialAudit);
