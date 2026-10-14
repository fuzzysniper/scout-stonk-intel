import Link from 'next/link';
import type { RadarReport, RadarRow } from '../../lib/radar';
import SignalPanel from './signal-panel';
export const utc = (value: string | null) => value ? value.replace('T', ' ').replace(/(?:\.000)?Z|\+00:00$/, ' UTC') : 'Not recorded';
const flowNumber = (value: number) => new Intl.NumberFormat('en-US', { maximumSignificantDigits: 8, notation: value !== 0 && (Math.abs(value) < 0.000001 || Math.abs(value) >= 1e12) ? 'scientific' : 'standard' }).format(value);
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
export function observationAge(observedAt: string | null, evaluatedAt: string | null): string | null {
 if (!observedAt || !evaluatedAt) return null;
 const elapsed = Date.parse(evaluatedAt) - Date.parse(observedAt);
 if (!Number.isFinite(elapsed) || elapsed < 0) return null;
 const minutes = Math.floor(elapsed / 60_000);
 return minutes < 60 ? minutes + 'm old' : Math.floor(minutes / 60) + 'h ' + minutes % 60 + 'm old';
}
export function flowReading(row: RadarRow, sourceStatus: RadarReport['status'] = 'available') {
 if (sourceStatus !== 'available' || row.pointChange.status === 'source_unavailable') return { state: 'Source unavailable' } as const;
 if (row.freshness === 'stale' || row.pointChange.status === 'stale_data') return { state: 'Stale observations' } as const;
 const matched = row.signals.current;
 if (row.signals.status === 'available' && matched.distributedTokens !== null && Number.isFinite(matched.distributedTokens) && matched.startAt && matched.endAt && matched.observedSeconds !== null)
  return { kind: 'matched', value: matched.distributedTokens, startAt: matched.startAt, endAt: matched.endAt, seconds: matched.observedSeconds } as const;
 const window = row.windows['24h'];
 if (window.status === 'available' && window.distributedTokens !== null && Number.isFinite(window.distributedTokens) && window.startAt && window.endAt && window.observedSeconds !== null)
  return { kind: 'window', value: window.distributedTokens, startAt: window.startAt, endAt: window.endAt, seconds: window.observedSeconds } as const;
 const point = row.pointChange;
 if (point.status === 'available' && point.distributedTokens !== null && Number.isFinite(point.distributedTokens) && point.startAt && point.endAt && point.observedSeconds !== null)
  return { kind: 'point', value: point.distributedTokens, startAt: point.startAt, endAt: point.endAt, seconds: point.observedSeconds } as const;
 return { state: 'Insufficient comparable history' } as const;
}
export function TokenRow({ row, evaluatedAt = null, sourceStatus = 'available' }: { row: RadarRow; evaluatedAt?: string | null; sourceStatus?: RadarReport['status'] }) {
 const change = row.pointChange;
 const reading = flowReading(row, sourceStatus);
 const age = observationAge(row.latestObservedAt, evaluatedAt);
 return <article className="radar-card" aria-labelledby={'token-' + row.mint}>
  <div className="token-row-heading"><h2 id={'token-' + row.mint}><Link href={row.dossier} title={row.name}>{row.symbol}<span className="sr-only"> · {row.name}</span></Link></h2><span className="token-unit" title="Quote identity from the verified allowlist"><span className="sr-only">Verified quote currency: </span><strong>{row.quoteSymbol}</strong></span></div>
  <div className="token-row-reading">{'state' in reading ? <strong className="flow-limited">{reading.state}</strong> : <><strong className="flow-value">{flowNumber(reading.value)} {row.quoteSymbol}</strong><span className="flow-basis">{reading.kind === 'matched' ? 'Matched 24h target' : reading.kind === 'window' ? '24h target · recorded span' : 'Recorded counter change'}</span><small className="flow-range">Actual interval: <time dateTime={reading.startAt}>{utc(reading.startAt)}</time> → <time dateTime={reading.endAt}>{utc(reading.endAt)}</time> · {number(reading.seconds / 3600)}h</small></>}</div>
  <p className="token-observed">{row.latestObservedAt ? <><span className="sr-only">Observed: </span><time dateTime={row.latestObservedAt}>{utc(row.latestObservedAt)}</time>{age && <span className="observation-age"> · {age}</span>}</> : sourceStatus === 'unavailable' || row.pointChange.status === 'source_unavailable' ? 'Observation unknown' : 'No recorded observation'}</p>
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
 const unknown = failed || report?.status === 'unavailable';
 const latest = report?.rows.map(row => row.latestObservedAt).filter((value): value is string => value !== null).sort().at(-1);
 const age = observationAge(latest ?? null, report?.fetchedAt ?? null);
 const valid = report?.status === 'available' ? report.rows.filter(row => !('state' in flowReading(row, report.status))).length : null;
 const covered = report?.status === 'available' ? report.rows.filter(row => { const reading = flowReading(row, report.status); return 'kind' in reading && reading.kind === 'window'; }).length : null;
 const matched = report?.status === 'available' ? report.rows.filter(row => row.signals.status === 'available').length : null;
 return <section className="ecosystem-overview" aria-label="Recorded ecosystem overview">
  <p className="flow-evidence-line"><strong>{report ? report.rows.length + (filtered ? ' filtered token' : ' tracked token') + (report.rows.length === 1 ? '' : 's') : 'Tracked tokens —'}</strong><span className="overview-time">{latest ? <>Latest record: <time dateTime={latest}>{utc(latest)}</time>{age && ' · ' + age}</> : unknown ? 'Observation source unavailable' : report ? 'No recorded observations' : 'Reading observations…'}</span></p>
  <p className="flow-coverage-line"><span>{unknown ? 'Coverage unknown' : report?.status === 'degraded' ? 'Source degraded · comparisons withheld' : !report ? 'Coverage pending' : matched ? matched + ' matched 24h comparisons' : covered ? covered + ' covered 24h targets' : valid ? valid + ' recorded changes · no covered 24h target' : 'Limited data · no valid flow comparisons'}</span><Link href="/status">Collection reliability ↗</Link></p>
 </section>;
}
export function DatasetEvidence({ report, query = '/api/radar?sort=coverage' }: { report: RadarReport; query?: string }) {
 return <details className="dataset-evidence"><summary>Dataset evidence & methodology</summary>
  <p>GitHub source: {report.dataset.sourceStatus}. Dataset retrieved: {utc(report.dataset.dataFetchedAt)}. Response generated: {utc(report.fetchedAt)}. These are not observation times.</p>
  <p className="radar-mint">Byte revision: {report.dataset.revision ?? 'No dataset served'}</p>
  <p>Observation age is evaluated at the API response time, not continuously updated. Freshness describes recorded timestamps (Radar stale above 3h); <Link href="/status">Data Health</Link> separately reports collector reliability and its 75-minute operational freshness threshold. Calculation coverage is independent of both. Missing history is not zero rewards.</p>
  <p>Reports from public APIs, not independently reconciled transactions or holder profit. Quote units are kept separate; never summed or ranked by amount. Default order is matched-comparison readiness, recorded coverage, then freshness.</p>
  <p>Source reads are cached up to 5 minutes. Observation age over 3 hours or source failure withholds changes. Last-point changes require matching quote mints and a gap of at most 2 hours. Matched research needs adjacent 24h targets, actual spans no longer than 24h + 1 minute and gaps strictly under 2h. No missing samples are synthesized. Primary amounts use up to eight significant digits and scientific notation for very small/large values; detail figures retain six-decimal formatting. Consult raw JSON for exact numeric evidence.</p>
  <div className="radar-links"><a href={query} target="_blank" rel="noopener noreferrer">Radar JSON ↗</a><a href={report.dataset.source} target="_blank" rel="noopener noreferrer">GitHub snapshots ↗</a><Link href="/research">Research guide</Link><a href="https://github.com/fuzzysniper/scout-stonk-intel/blob/main/docs/SIGNALS.md" target="_blank" rel="noopener noreferrer">Calculation methodology ↗</a></div>
 </details>;
}
