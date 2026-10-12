'use client';
import { useEffect, useState } from 'react';
import type { HistoryReport, HistoryWindow } from '../lib/history';

const number = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(value);
const utc = (value: string | null) => value ? value.replace('T', ' ').replace('.000Z', ' UTC').replace('Z', ' UTC') : 'Unavailable';
const duration = (seconds: number | null) => seconds === null ? 'Unavailable' : `${number(seconds / 3600)} hours`;
const issueLabels: Record<string, string> = {
 missing_data: 'Missing or invalid observation fields', malformed_timestamp: 'Malformed observation timestamps',
 duplicate_timestamp: 'Duplicate timestamps detected; identical entries counted once', conflicting_duplicate: 'Conflicting observations at the same timestamp',
 counter_decrease: 'Counter decrease or reset detected; affected comparisons withheld', inconsistent_quote_asset: 'Quote asset changed; affected comparisons withheld',
 unverified_source: 'Unrecognized source; affected observations withheld', stale_data: 'Latest recorded observation is more than 3 hours old',
 future_timestamp: 'Future-dated observation excluded',
};
function Window({ label, window, symbol }: { label: string; window: HistoryWindow; symbol: string }) {
 return <div className="history-window">
  <h4>{label} recorded comparison</h4>
  <p className="history-value">{window.status === 'available' && window.distributedTokens !== null ? `${number(window.distributedTokens)} ${symbol}` : 'Unavailable'}</p>
  <p>{window.status === 'available' ? (window.timing === 'exact' ? 'Exact observation boundary' : 'Nearest earlier snapshot approximation') :
   window.status === 'insufficient_history' ? 'Insufficient history' : window.status === 'stale_data' ? 'Stale history — current window withheld' : 'Data quality issue — comparison withheld'}</p>
  <dl>
   <div><dt>Recorded coverage</dt><dd>{duration(window.observedSeconds)} · {window.observationCount} observation{window.observationCount === 1 ? '' : 's'}</dd></div>
   <div><dt>Actual start (UTC)</dt><dd>{utc(window.startAt)}</dd></div>
   <div><dt>Actual end (UTC)</dt><dd>{utc(window.endAt)}</dd></div>
   {window.timing === 'nearest_snapshot' && <div><dt>Boundary offset</dt><dd>{duration(Math.abs(window.boundaryOffsetSeconds ?? 0))} before requested start</dd></div>}
  </dl>
  {window.status === 'insufficient_history' && <p>No complete-period total is claimed. An observation at or before the boundary and gaps of at most 2 hours are required.</p>}
 </div>;
}
export default function HistoryPanel({ mint }: { mint: string }) {
 const [state, setState] = useState<{ mint: string; report: HistoryReport | null; failed: boolean }>({ mint, report: null, failed: false });
 useEffect(() => {
  const controller = new AbortController();
  setState({ mint, report: null, failed: false });
  void fetch('/api/history?mint=' + encodeURIComponent(mint), { signal: controller.signal, cache: 'no-store' })
   .then(async response => {
    if (!response.ok) throw new Error('History unavailable');
    const report = await response.json() as HistoryReport;
    if (!controller.signal.aborted) setState({ mint, report, failed: false });
   }).catch(() => { if (!controller.signal.aborted) setState({ mint, report: null, failed: true }); });
  return () => controller.abort();
 }, [mint]);
 const report = state.mint === mint ? state.report : null;
 const failed = state.mint === mint && state.failed;
 const loading = !report && !failed;
 const symbol = report?.quote?.symbol ?? 'quote tokens';
 return <section className="history-panel" aria-labelledby="history-title" aria-busy={loading}>
  <h3 id="history-title">Historical reward observations</h3>
  <p className="history-status" role="status">{loading ? 'Loading recorded history…' : failed ? 'Recorded history is temporarily unavailable. Scan again to retry.' :
   report?.status === 'no_history' ? 'No recorded history for this mint.' : report?.status === 'invalid_data' ? 'Recorded history has data quality issues.' :
   `${report?.observationCount} timestamped observation${report?.observationCount === 1 ? '' : 's'} · ${report?.freshness.status === 'stale' ? 'Stale' : 'Recorded'} history`}</p>
  {report && <>
   <dl className="history-overview">
    <div><dt>Observation count</dt><dd>{report.observationCount} unique timestamps / {report.recordedCount} stored entries</dd></div>
    <div><dt>Observation start (UTC)</dt><dd>{utc(report.startAt)}</dd></div>
    <div><dt>Observation end (UTC)</dt><dd>{utc(report.endAt)}</dd></div>
    <div><dt>Quote asset</dt><dd>{report.quote?.symbol ?? 'Unavailable'}{report.quote?.mint ? ` · ${report.quote.mint}` : ' · mint identity not recorded'}</dd></div>
    <div><dt>Latest recorded lifetime total</dt><dd>{report.latestLifetimeTotal === null ? 'Unavailable' : `${number(report.latestLifetimeTotal)} ${symbol}`}</dd></div>
    <div><dt>History fetched (UTC)</dt><dd>{utc(report.fetchedAt)}</dd></div>
    <div><dt>Observation age</dt><dd>{duration(report.freshness.ageSeconds)} · stale after 3 hours</dd></div>
   </dl>
   {report.issues.length > 0 && <ul className="history-warnings" aria-label="History limitations">{report.issues.map(issue => <li key={issue}>{issueLabels[issue] ?? issue}</li>)}</ul>}
   <div className="history-windows"><Window label="24-hour" window={report.windows['24h']} symbol={symbol}/><Window label="7-day" window={report.windows['7d']} symbol={symbol}/></div>
   <details className="history-changes"><summary>Recorded-point changes ({report.changes.length})</summary>
    {report.changes.length === 0 ? <p>At least two recorded observations are needed. No change can be calculated from one point.</p> : <>
     <p>Most recent {Math.min(12, report.changes.length)} comparisons. Full history is linked below.</p>
     <ol>{report.changes.slice(-12).map(change => <li key={change.endAt}>
      <span>{utc(change.startAt)} → {utc(change.endAt)} ({duration(change.observedSeconds)})</span><br/>
      <strong>{change.distributedTokens === null ? 'Comparison withheld' : `${number(change.distributedTokens)} ${change.quote?.symbol ?? 'quote tokens'} observed change`}</strong>
      {change.issues.length > 0 && <span> · {change.issues.map(issue => issueLabels[issue]).join('; ')}</span>}
     </li>)}</ol>
    </>}
   </details>
   <p className="history-method">Windows end at the latest recorded observation, not the fetch time. Changes subtract comparable recorded cumulative counters only; no interpolation or extrapolation. API-reported token distributions are not independently reconciled, APY, or an individual holder’s profit. Quote symbols alone do not verify asset identity. Numbers use JavaScript precision and are rounded to 6 decimals for display.</p>
   <div className="sourcelinks"><a href={report.evidence} target="_blank" rel="noopener noreferrer">HISTORY JSON ↗</a><a href="https://github.com/fuzzysniper/scout-stonk-intel/blob/main/data/reward-snapshots.json" target="_blank" rel="noopener noreferrer">RECORDED SNAPSHOTS ↗</a><a href={report.source} target="_blank" rel="noopener noreferrer">STONKFUN SOURCE ↗</a></div>
  </>}
 </section>;
}
