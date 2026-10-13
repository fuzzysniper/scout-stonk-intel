import { readHistorySource } from './history-source';
import { trackedTokens } from './tracked-tokens';
import { readAudit, readAttempt, datedAudit } from './collector-diagnostics';
import { summarizeHealth } from './data-health';
import { buildBrief } from './brief';
export async function readBrief(date: string, now = new Date()) {
 const tokens = trackedTokens();
 const [history, audit, attempt] = await Promise.all([readHistorySource(), readAudit(), readAttempt()]);
 const health = summarizeHealth(history.store, tokens, history.dataset, audit.value ?? datedAudit(), attempt.value, audit.value ? 'github' : 'dated_investigation', now);
 health.collector.diagnosticSources = { audit: audit.dataset, attempt: attempt.dataset };
 return buildBrief(history.store, tokens, history.dataset, health, date, now);
}
