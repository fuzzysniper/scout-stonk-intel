import { NextResponse } from 'next/server';
import { readHistorySource } from '../../../lib/history-source';
import { readAudit, readAttempt, datedAudit } from '../../../lib/collector-diagnostics';
import { trackedTokens } from '../../../lib/tracked-tokens';
import { summarizeHealth } from '../../../lib/data-health';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
 try {
  const tokens = trackedTokens();
  const [history, audit, attempt] = await Promise.all([readHistorySource(), readAudit(), readAttempt()]);
  const report = summarizeHealth(history.store, tokens, history.dataset, audit.value ?? datedAudit(), attempt.value,
   audit.value ? 'github' : 'dated_investigation');
  report.collector.diagnosticSources = { audit: audit.dataset, attempt: attempt.dataset };
  return NextResponse.json(report, { status: report.status === 'unavailable' ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
 } catch {
  return NextResponse.json({ status: 'unavailable', error: 'Data health could not be verified', checkedAt: new Date().toISOString() },
   { status: 503, headers: { 'Cache-Control': 'no-store' } });
 }
}
