import Link from 'next/link';
import type { RadarReport, RadarRow } from '../../lib/radar';
import SignalPanel from './signal-panel';
export const utc = (value: string | null) => value ? value.replace('T', ' ').replace(/(?:\.000)?Z|\+00:00$/, ' UTC') : 'Not recorded';
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
export function TokenRow({ row }: { row: RadarRow }) {
 const change = row.pointChange;
 return <article className="radar-card" aria-labelledby={'token-' + row.mint}>
  <div className="token-row-heading"><div><h2 id={'token-' + row.mint}><Link href={row.dossier}>{row.symbol}</Link></h2><span className="token-name">{row.name}</span></div><div className="token-unit"><span>Reward unit</span><strong>{row.quoteSymbol}</strong></div></div>
  <div className="token-row-reading"><div><span className="reading-label">Last recorded point change</span><strong>{change.status === 'available' && change.distributedTokens !== null ? number(change.distributedTokens) + ' ' + row.quoteSymbol : ['no_history', 'insufficient_history'].includes(change.status) ? 'Not enough history' : 'Change withheld'}</strong><span className="reading-limit">{change.status === 'available' ? 'Across the actual interval below · not a daily rate' : labels[change.status] ?? 'Comparison withheld'}</span></div></div>
  <p className="token-observed"><span>{row.observationCount === 0 ? row.pointChange.status === 'source_unavailable' ? 'Observation unavailable' : 'No recorded observations' : row.freshness === 'fresh' ? 'Recorded ≤3h ago' : row.freshness === 'stale' ? 'Stale · over 3h old' : 'Freshness unavailable'}</span>{row.latestObservedAt && <time dateTime={row.latestObservedAt}>{utc(row.latestObservedAt)}</time>}{change.status === 'available' && change.startAt && <small>Interval: {utc(change.startAt)} → {utc(change.endAt)}</small>}</p>
  <details className="token-evidence"><summary>Evidence / Details <span className="sr-only">for {row.symbol}</span></summary>
  <p className="radar-mint">Reward mint: {row.mint}</p>
  <SignalPanel signal={row.signals} symbol={row.quoteSymbol}/>
  <details className="signal-point-details"><summary>Latest point change & archive coverage</summary>
  <div className="radar-delta"><span>LATEST RECORDED POINT CHANGE</span><strong>{change.status !== 'available' || change.distributedTokens === null ? 'Unavailable' : number(change.distributedTokens)}{change.status === 'available' && change.distributedTokens !== null && <small> {row.quoteSymbol}</small>}</strong><p>{labels[change.status] ?? 'Comparison withheld'}</p></div>
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
  </details>
 </article>;
}

export function EcosystemOverview({ report, filtered = false, failed = false }: { report: RadarReport | null; filtered?: boolean; failed?: boolean }) {
 const sourceUnknown = report?.status === 'unavailable';
 const recorded = sourceUnknown ? null : report?.rows.filter(row => row.observationCount > 0).length;
 const ready = report?.status === 'available' ? report.rows.filter(row => row.signals.status === 'available').length : report && !sourceUnknown ? 0 : null;
 const latest = report?.rows.map(row => row.latestObservedAt).filter((value): value is string => value !== null).sort().at(-1);
 return <section className="ecosystem-overview" aria-label="Recorded ecosystem overview">
  <dl className="overview-metrics"><div><dt>{filtered ? 'Filtered tokens' : 'Tracked tokens'}</dt><dd>{report ? report.rows.length : '—'}</dd></div><div><dt>With recorded points</dt><dd>{recorded ?? '—'}</dd></div><div><dt>Matched comparisons</dt><dd>{ready ?? '—'}</dd></div></dl>
  <p className="overview-time">Latest recorded observation: {latest ? <time dateTime={latest}>{utc(latest)}</time> : report && !sourceUnknown ? 'Not recorded' : failed || sourceUnknown ? 'Unavailable' : 'Checking source…'}</p>
  <p className="overview-limit">{failed || report?.status === 'unavailable' ? 'History source unavailable. Identities only; observations and changes unknown.' : report?.status === 'degraded' ? 'Source degraded. Retained records are dated; current comparisons withheld.' : ready === 0 ? 'No matched 24h comparisons. Sparse or incompatible history is not zero rewards.' : 'Matched comparisons require two covered 24h periods. Missing history is not zero rewards.'}</p>
 </section>;
}
export function DatasetEvidence({ report, query = '/api/radar?sort=coverage' }: { report: RadarReport; query?: string }) {
 return <details className="dataset-evidence"><summary>Dataset evidence & methodology</summary>
  <p>GitHub source: {report.dataset.sourceStatus}. Dataset retrieved: {utc(report.dataset.dataFetchedAt)}. Response generated: {utc(report.fetchedAt)}. These are not observation times.</p>
  <p className="radar-mint">Byte revision: {report.dataset.revision ?? 'No dataset served'}</p>
  <p>Reports from public APIs, not independently reconciled transactions or holder profit. Quote units are kept separate; never summed or ranked by amount. Default order is matched-comparison readiness, recorded coverage, then freshness.</p>
  <p>Source reads are cached up to 5 minutes. Observation age over 3 hours or source failure withholds changes. Last-point changes require matching quote mints and a gap of at most 2 hours. Matched research needs adjacent 24h targets, actual spans no longer than 24h + 1 minute and gaps strictly under 2h. No missing samples are synthesized. Small amounts may round at six decimals; consult raw JSON.</p>
  <div className="radar-links"><a href={query} target="_blank" rel="noopener noreferrer">Radar JSON ↗</a><a href={report.dataset.source} target="_blank" rel="noopener noreferrer">GitHub snapshots ↗</a><Link href="/research">Research guide</Link><a href="https://github.com/fuzzysniper/scout-stonk-intel/blob/main/docs/SIGNALS.md" target="_blank" rel="noopener noreferrer">Calculation methodology ↗</a></div>
 </details>;
}
