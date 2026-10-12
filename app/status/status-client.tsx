'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { HealthReport, HealthRow } from '../../lib/data-health';
const utc = (value: string | null) => value ? value.replace('T', ' ').replace(/(?:\.000)?Z|\+00:00$/, ' UTC') : 'Unavailable';
const duration = (seconds: number | null) => seconds === null ? 'Unavailable' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(seconds / 3600) + ' hours';
const runUrl = (id: number) => 'https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/' + id;
const labels: Record<string, string> = { current: 'CURRENT RECORD', delayed: 'DELAYED', stale: 'STALE', missing: 'NO OBSERVATIONS', quality_issue: 'QUALITY ISSUE', source_unavailable: 'SOURCE UNAVAILABLE',
 complete: 'Coverage complete', insufficient_history: 'Insufficient history', invalid_data: 'Quality barrier', stale_data: 'Stale coverage withheld' };
function TokenHealth({ row }: { row: HealthRow }) {
 return <article className="health-card"><div className="radar-card-top"><div><span className="radar-symbol">{row.symbol}</span><h2>{row.name}</h2></div><span className={'radar-badge ' + (row.state === 'current' ? 'radar-fresh' : '')}>{labels[row.state]}</span></div>
  <div className="radar-mint">{row.mint}</div><dl className="health-facts">
   <div><dt>Latest actual observation</dt><dd>{utc(row.latestObservedAt)}</dd></div><div><dt>Observation age</dt><dd>{duration(row.ageSeconds)}</dd></div>
   <div><dt>Collected points</dt><dd>{row.observationCount} unique / {row.storedCount} stored</dd></div>
   <div><dt>Expected hourly slots without a newer point</dt><dd>{row.missedScheduledSlots === null ? 'Unknown · no starting observation' : (row.estimateCapped ? 'At least ' : '') + row.missedScheduledSlots + ' estimated slots'}</dd></div>
  </dl>
  <p className="health-caveat">A missing record does not prove a job ran or a provider failed. Estimates use the minute-17 schedule with 15-minute grace.</p>
  <div className="radar-coverage">{(['24h','7d'] as const).map(key => <div key={key}><span>{key.toUpperCase()} RECORD COVERAGE</span><strong>{labels[row.coverage[key].status] ?? row.coverage[key].status.replaceAll('_',' ')}</strong><small>{row.coverage[key].observationCount} points · {duration(row.coverage[key].observedSeconds)}</small></div>)}</div>
  <details className="health-details"><summary>Collection outcome & evidence</summary><p>Latest instrumented attempt: {row.attempt ? row.attempt.status + ' · ' + row.attempt.reason.replaceAll('_',' ') : 'Unknown · no matching attempt summary'}</p><p>Record added in that attempt: {utc(row.attempt?.observedAt ?? null)}</p>
   <p>24h maximum gap: {duration(row.coverage['24h'].maxGapSeconds)}<br/>7d maximum gap: {duration(row.coverage['7d'].maxGapSeconds)}</p>
   {row.issues.length > 0 && <p>Quality notes: {row.issues.map(issue => issue.replaceAll('_',' ')).join(' · ')}</p>}
  </details><div className="radar-links"><a href={row.evidence} target="_blank" rel="noopener noreferrer">HISTORY JSON ↗</a><Link href={row.dossier}>TOKEN DOSSIER ↗</Link><a href={row.source} target="_blank" rel="noopener noreferrer">OFFICIAL SOURCE ↗</a></div>
 </article>;
}
export default function StatusClient() {
 const [refresh, setRefresh] = useState(0);
 const [state, setState] = useState<{ report: HealthReport | null; loading: boolean; failed: boolean }>({ report: null, loading: true, failed: false });
 useEffect(() => {
  const controller = new AbortController();setState({ report: null, loading: true, failed: false });
  void fetch('/api/status', { cache: 'no-store', signal: controller.signal }).then(async response => {
   const report = await response.json() as HealthReport;
   if (!Array.isArray(report.rows) || !report.collector || (!response.ok && response.status !== 503)) throw Error('Unavailable');
   if (!controller.signal.aborted) setState({ report, loading: false, failed: false });
  }).catch(() => { if (!controller.signal.aborted) setState({ report: null, loading: false, failed: true }); });
  return () => controller.abort();
 }, [refresh]);
 const report = state.report, collector = report?.collector;
 const current = report?.rows.filter(row => row.state === 'current').length ?? 0;
 const stale = report?.rows.filter(row => row.state === 'stale' || row.state === 'missing').length ?? 0;
 return <main className="radar-shell health-shell"><header className="radar-nav"><Link href="/" className="radar-brand">◉ SCOUT<span>.</span></Link><span>OPERATIONAL EVIDENCE</span><Link href="/radar">RADAR ↗</Link></header>
  <section className="radar-hero"><div className="kicker">DATA HEALTH / V1</div><h1>Trust the record.<br/><em>Check the gaps.</em></h1><p>Actual observations, coverage and collector evidence. A successful workflow is not proof that every token was collected or a dataset was published.</p></section>
  <div className="radar-summary"><div><strong>{report ? current : '—'}</strong><span>CURRENT RECORDS</span></div><div><strong>{report ? stale : '—'}</strong><span>STALE / MISSING</span></div><div><strong>{report ? report.rows.length : '—'}</strong><span>TRACKED TOKENS</span></div></div>
  <div className="radar-toolbar"><p className="radar-notice">Current: up to 75 minutes · delayed: 75 minutes to 3 hours · stale: over 3 hours.</p><button type="button" disabled={state.loading} onClick={() => setRefresh(n => n + 1)}>{state.loading ? 'CHECKING…' : 'REFRESH HEALTH ↻'}</button></div>
  <div className="radar-status" role="status">{state.loading ? 'Reading observation and collector evidence…' : state.failed ? 'Data health is temporarily unavailable. Refresh to retry.' : report?.status === 'unavailable' ? 'Snapshot source unavailable. No new observations or collector success is assumed.' : `${current} current records. Freshness is independent of coverage and workflow status; no uptime percentage is claimed.`}</div>
  {report && collector && <>
   <section className="health-pipeline" aria-label="Collector evidence"><h2>Collector evidence</h2><div className="health-pipeline-grid">
    <div><span>OBSERVATION SOURCE</span><strong>{report.dataset.sourceStatus}</strong><p>Dataset retrieved {utc(report.dataset.dataFetchedAt)}<br/>Checked {utc(report.checkedAt)}</p></div>
    <div><span>SCHEDULED RUNS AT AUDIT</span><strong>{collector.audit.scheduledRunCount === null ? 'Unknown' : collector.audit.scheduledRunCount}</strong><p>{collector.audit.scheduledRunCount === 0 ? 'No scheduled executions were observed by the audit.' : 'Recorded Actions count, not successful per-token collection.'}<br/>Audit checked {utc(collector.audit.checkedAt)}</p></div>
    <div><span>ATTEMPT / PUBLICATION</span><strong>{collector.attemptState.replaceAll('_',' ')}</strong><p>{collector.attempt ? collector.attempt.overall + ' attempt at ' + utc(collector.attempt.finishedAt) : 'No instrumented attempt available.'}<br/>A matching byte hash identifies the served dataset; it does not turn failed or skipped mints into success.</p></div>
   </div><p className="health-caveat">{collector.auditOrigin === 'dated_investigation' ? 'Dated investigation evidence bundled with this app; a live audit file could not be read. This is not a current scheduler guarantee.' : 'Audit evidence read from GitHub.'} Audit status: {collector.auditState.replaceAll('_',' ')} · workflow state: {collector.audit.workflowState}. Earlier scheduling gaps remain unexplained; a confirmed run does not establish sustained hourly reliability.</p>
   <p className="health-caveat">Audit file source: {collector.diagnosticSources?.audit.sourceStatus ?? 'Unknown'} · retrieved {utc(collector.diagnosticSources?.audit.dataFetchedAt ?? null)}. Attempt file source: {collector.diagnosticSources?.attempt.sourceStatus ?? 'Unknown'} · retrieved {utc(collector.diagnosticSources?.attempt.dataFetchedAt ?? null)}. Cached or retained evidence is dated; source failure does not create a new audit or attempt.</p>
   <details className="health-details"><summary>Runs, dataset commits & source revisions</summary><p className="radar-mint">Served dataset: {report.dataset.revision ?? 'Unavailable'}</p>
    {collector.audit.latestDatasetCommit && <p>Latest audited dataset commit: <a href={'https://github.com/fuzzysniper/scout-stonk-intel/commit/' + collector.audit.latestDatasetCommit.sha} target="_blank" rel="noopener noreferrer">{collector.audit.latestDatasetCommit.sha.slice(0,12)} ↗</a> · {utc(collector.audit.latestDatasetCommit.committedAt)}<br/>Matches served bytes: {collector.commitMatchesDataset === null ? 'Unknown' : collector.commitMatchesDataset ? 'Yes' : 'No · sources may be cached at different revisions; publication failure is not assumed'}</p>}
    <ul>{collector.audit.runs.map(run => <li key={run.id}><a href={runUrl(run.id)} target="_blank" rel="noopener noreferrer">Run {run.id} ↗</a> · {run.event.replaceAll('_',' ')} · {run.conclusion ?? run.status}<br/>Collection step: {run.collectionStep ?? 'Unknown'} · commit step: {run.commitStep ?? 'Unknown'} · {utc(run.updatedAt)}{run.confirmedCommit && <p>Log-confirmed push: <a href={'https://github.com/fuzzysniper/scout-stonk-intel/commit/' + run.confirmedCommit} target="_blank" rel="noopener noreferrer">{run.confirmedCommit.slice(0,12)} ↗</a> · {run.recordedCount} actual point(s)</p>}</li>)}</ul>
   </details><div className="radar-links"><a href="/api/status" target="_blank" rel="noopener noreferrer">HEALTH JSON ↗</a><a href={report.dataset.source} target="_blank" rel="noopener noreferrer">ORIGINAL SNAPSHOTS ↗</a><a href="https://github.com/fuzzysniper/scout-stonk-intel/actions/workflows/reward-snapshots.yml" target="_blank" rel="noopener noreferrer">COLLECTOR RUNS ↗</a><a href="https://github.com/fuzzysniper/scout-stonk-intel/blob/main/docs/DATA_HEALTH.md" target="_blank" rel="noopener noreferrer">METHODOLOGY ↗</a></div></section>
   <section className="radar-grid" aria-label="Per-token data health" aria-busy={state.loading}>{report.rows.map(row => <TokenHealth key={row.mint} row={row}/>)}</section>
  </>}
  <footer><div>SCOUT / DATA INTEGRITY</div><p>Public, dated evidence. Operational monitoring only; no market alerts, wallets or trades. <Link href="/radar">RETURN TO RADAR ↗</Link></p></footer>
 </main>;
}
