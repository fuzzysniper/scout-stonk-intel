'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { RadarReport, RadarRow } from '../../lib/radar';
import SignalPanel from './signal-panel';
const utc = (value: string | null) => value ? value.replace('T', ' ').replace(/(?:\.000)?Z|\+00:00$/, ' UTC') : 'Not recorded';
const number = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(value);
const labels: Record<string, string> = {
 available: 'Comparable points', insufficient_history: 'Need more observations', no_history: 'No recorded history',
 source_unavailable: 'Source unavailable · change withheld', stale_data: 'Stale observations · change withheld',
 invalid_data: 'Quality issue · change withheld', quote_unverified: 'Quote identity unverified · change withheld',
 long_interval: 'Gap over 2 hours · change withheld',
};
const qualityLabels: Record<string, string> = {
 missing_data: 'Missing or invalid fields', malformed_timestamp: 'Invalid timestamps', future_timestamp: 'Future timestamps excluded',
 duplicate_timestamp: 'Duplicate timestamps', conflicting_duplicate: 'Conflicting duplicates', counter_decrease: 'Counter reset/decrease',
 inconsistent_quote_asset: 'Quote changed', unverified_source: 'Unverified source', stale_data: 'Observation older than 3 hours',
 quote_unverified: 'Quote identity not established by recorded points',
};
function Row({ row }: { row: RadarRow }) {
 const change = row.pointChange;
 return <article className="radar-card" aria-labelledby={'token-' + row.mint}>
  <div className="radar-card-top"><div><span className="radar-symbol">{row.symbol}</span><h2 id={'token-' + row.mint}>{row.name}</h2></div><span className={'radar-badge ' + (row.freshness === 'fresh' ? 'radar-fresh' : '')}>{row.observationCount === 0 ? 'NO HISTORY' : row.freshness.toUpperCase()}</span></div>
  <div className="radar-mint">{row.mint}</div>
  <p className="signal-observed">Last observed: {utc(row.latestObservedAt)} · {row.observationCount} unique points</p>
  <SignalPanel signal={row.signals} symbol={row.quoteSymbol}/>
  <details className="signal-point-details"><summary>Latest point change & archive coverage</summary>
  <div className="radar-delta"><span>LATEST RECORDED POINT CHANGE</span><strong>{change.distributedTokens === null ? 'Unavailable' : number(change.distributedTokens)}{change.distributedTokens !== null && <small> {row.quoteSymbol}</small>}</strong><p>{labels[change.status] ?? 'Comparison withheld'}</p></div>
  <dl className="radar-facts">
   <div><dt>Last actual observation (UTC)</dt><dd>{utc(row.latestObservedAt)}</dd></div>
   <div><dt>Observed points</dt><dd>{row.observationCount} unique timestamp{row.observationCount === 1 ? '' : 's'}</dd></div>
   <div><dt>Verified quote asset</dt><dd>{row.quoteSymbol} · <a href={'https://solscan.io/token/' + row.quoteMint} target="_blank" rel="noopener noreferrer">{row.quoteMint}</a></dd></div>
   {change.startAt && <div className="radar-interval"><dt>Actual comparison interval</dt><dd>{utc(change.startAt)} → {utc(change.endAt)}<br/>{number((change.observedSeconds ?? 0) / 3600)} hours · not a 24h rate</dd></div>}
  </dl>
  <div className="radar-coverage" aria-label="Recorded window coverage">{(['24h', '7d'] as const).map(key => <div key={key}><span>{key.toUpperCase()} COVERAGE</span><strong>{row.windows[key].status === 'available' && row.windows[key].distributedTokens !== null ? number(row.windows[key].distributedTokens!) + ' ' + row.quoteSymbol : 'Unavailable'}</strong><small>{row.windows[key].status.replaceAll('_', ' ')}</small></div>)}</div>
  </details>
  {row.quality.length > 0 && <p className="radar-quality">{row.quality.map(issue => qualityLabels[issue] ?? issue).join(' · ')}</p>}
  <div className="radar-links"><Link href={row.dossier}>OPEN DOSSIER ↗</Link><a href={row.evidence} target="_blank" rel="noopener noreferrer">HISTORY JSON ↗</a><a href={row.source} target="_blank" rel="noopener noreferrer">OFFICIAL API ↗</a><a href={row.onchain} target="_blank" rel="noopener noreferrer">MINT RECORD ↗</a></div>
  <details className="radar-verification"><summary>Identity evidence</summary><p>Reward mode and mint/quote identity verified against the official catalog and reward endpoint at {utc(row.verifiedAt)}. This is a dated API observation, not transaction reconciliation or a guarantee of current activity.</p><div className="radar-links"><a href="/evidence/reward-verification.json" target="_blank" rel="noopener noreferrer">CAPTURED EVIDENCE ↗</a><a href={row.discoverySource} target="_blank" rel="noopener noreferrer">OFFICIAL CATALOG ↗</a></div></details>
 </article>;
}
export default function RadarClient() {
 const [sort, setSort] = useState<RadarReport['sort']>('coverage');
 const [quoteMint, setQuoteMint] = useState('');
 const [quoteOptions, setQuoteOptions] = useState<RadarReport['quotes']>([]);
 const [refresh, setRefresh] = useState(0);
 const [state, setState] = useState<{ report: RadarReport | null; loading: boolean; failed: boolean }>({ report: null, loading: true, failed: false });
 useEffect(() => {
  const controller = new AbortController();
  setState({ report: null, loading: true, failed: false });
  void fetch('/api/radar?sort=' + sort + (quoteMint ? '&quoteMint=' + encodeURIComponent(quoteMint) : ''), { cache: 'no-store', signal: controller.signal }).then(async response => {
   const report = await response.json() as RadarReport;
   if (!Array.isArray(report.rows) || !Array.isArray(report.quotes) || report.rows.some(row => !row.signals) || (!response.ok && response.status !== 503)) throw Error('Radar unavailable');
   if (!controller.signal.aborted) { setState({ report, loading: false, failed: false }); setQuoteOptions(report.quotes); }
  }).catch(() => { if (!controller.signal.aborted) setState({ report: null, loading: false, failed: true }); });
  return () => controller.abort();
 }, [sort, quoteMint, refresh]);
 const report = state.report;
 const recorded = report?.rows.filter(row => row.observationCount > 0).length ?? 0;
 const ready = report?.rows.filter(row => row.signals.status === 'available').length ?? 0;

 return <main className="radar-shell">
  <header className="radar-nav"><Link href="/" className="radar-brand">◉ SCOUT<span>.</span></Link><span>READ-ONLY RESEARCH</span><Link href="/">TOKEN DOSSIER ↗</Link></header>
  <section className="radar-hero"><div className="kicker">SIGNAL LAB / V1 · INTELLIGENCE RADAR</div><h1>What changed?<br/><em>Show the evidence.</em></h1><p>Observed reward velocity across verified StonkFun tokens. Matched periods, dated evidence, and clear limits while history builds.</p></section>
  <Link href="/status" className="radar-home-link">DATA HEALTH · OBSERVATION FRESHNESS & COLLECTOR EVIDENCE ↗</Link>
  <div className="radar-summary"><div><strong>{report ? report.rows.length : '—'}</strong><span>VERIFIED MINTS</span></div><div><strong>{report ? recorded : '—'}</strong><span>WITH HISTORY</span></div><div><strong>{report ? ready : '—'}</strong><span>MATCHED COMPARISONS</span></div></div>
  <div className="radar-toolbar"><div><label htmlFor="radar-sort">ORDER BY</label><select id="radar-sort" value={sort} onChange={e => setSort(e.target.value as RadarReport['sort'])}><option value="coverage">Coverage / freshness</option><option value="name">Token name</option><option value="freshness">Observation freshness</option></select></div><div><label htmlFor="radar-quote">QUOTE ASSET</label><select id="radar-quote" value={quoteMint} onChange={e => setQuoteMint(e.target.value)}><option value="">All quote assets</option>{quoteOptions.map(quote => <option key={quote.mint} value={quote.mint}>{quote.symbol}</option>)}</select></div><button type="button" disabled={state.loading} onClick={() => setRefresh(value => value + 1)}>{state.loading ? 'CHECKING…' : 'REFRESH RADAR ↻'}</button></div>
  <p className="radar-notice">Default order reflects comparison readiness, observed point coverage, then freshness. Different quote assets and intervals are not comparable returns. No investment ranking, projected yield, or holder-profit claim.</p>
  <div role="status" className="radar-status">{state.loading ? 'Reading sourced observations…' : state.failed ? 'Radar is temporarily unavailable. Refresh to retry.' : report?.status === 'unavailable' ? 'History source unavailable. Verified identities are shown, but no observations or changes are claimed.' : report?.status === 'degraded' ? 'History source degraded. Retained evidence is dated; current changes and windows are withheld.' : `${ready} matched comparisons available · ${recorded} of ${report?.rows.length} mints observed. Approximately 48 hours of comparable records are required; missing history is not zero rewards.`}</div>
  {report && <section className="radar-source" aria-label="Dataset provenance"><span>GITHUB SOURCE · {report.dataset.sourceStatus.toUpperCase()}</span><p>Dataset retrieved: {utc(report.dataset.dataFetchedAt)}<br/>Response generated: {utc(report.fetchedAt)}</p><details><summary>Dataset revision & methodology</summary><p className="radar-mint">{report.dataset.revision ?? 'No dataset served'}</p><p>New collector observations can reach this page without redeploying. Server reads are cached up to 5 minutes. Observation age over 3 hours or source failure withholds changes. Last-point changes require two matching quote mints with a gap of at most 2 hours; Signal Lab needs two adjacent 24h targets, spans no longer than 24h + 1 minute, gaps strictly under 2h, and matching quote mint identity. No missing samples are synthesized.</p><div className="radar-links"><a href={'/api/radar?sort=' + sort + (quoteMint ? '&quoteMint=' + encodeURIComponent(quoteMint) : '')} target="_blank" rel="noopener noreferrer">RADAR JSON ↗</a><a href={report.dataset.source} target="_blank" rel="noopener noreferrer">GITHUB SNAPSHOTS ↗</a><a href="https://github.com/fuzzysniper/scout-stonk-intel/blob/main/docs/SIGNALS.md" target="_blank" rel="noopener noreferrer">METHODOLOGY ↗</a></div></details></section>}
  <section aria-label="Tracked reward tokens" aria-busy={state.loading} className="radar-grid">{report?.rows.map(row => <Row key={row.mint} row={row}/>)}</section>
  <footer><div>SCOUT / EVIDENCE OVER HYPE</div><p>Public API reports, not independently reconciled transactions. No wallet connection, trades, payments, or investment recommendations. <Link href="/">BACK TO DOSSIER ↗</Link></p></footer>
 </main>;
}
