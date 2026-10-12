import type { SignalPeriod, SignalReport } from '../../lib/signals';
const number = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(value);
const utc = (value: string | null) => value ? value.replace('T', ' ').replace(/(?:\.000)?Z|\+00:00$/, ' UTC') : 'Not recorded';
export const signalReasons: Record<string, string> = {
 no_history: 'No recorded history', invalid_data: 'History is malformed', insufficient_current_history: 'Current period needs 24h of observations',
 insufficient_previous_history: 'Previous period needs another 24h of observations', missing_current_boundary: 'Current baseline too far from target',
 missing_previous_boundary: 'Previous baseline too far from target', gapped_current_history: 'Current period has a gap of 2h or more',
 gapped_previous_history: 'Previous period has a gap of 2h or more', unmatched_duration: 'Actual periods exceed the 1-minute matching tolerance',
 source_unavailable: 'History source unavailable or degraded', stale_data: 'Latest observation older than 3h', stale_provider: 'Provider report is stale',
 invalid_metadata: 'Provider metadata invalid', invalid_verified_quote: 'Verified quote metadata invalid',
 inconsistent_verified_quote: 'Recorded quote mint differs or is missing', inconsistent_quote_asset: 'Quote asset changed',
 counter_decrease: 'Counter reset/decrease detected', missing_data: 'Invalid or missing counters', malformed_timestamp: 'Invalid observation timestamps',
 future_timestamp: 'Future observations excluded', conflicting_duplicate: 'Conflicting duplicate timestamps', non_finite_calculation: 'Numeric precision limit reached',
 invalid_reference_time: 'Calculation time invalid', unverified_source: 'Observation source not verified',
};
const categories: Record<SignalReport['category'], string> = {
 increased_velocity: 'Observed velocity increased', decreased_velocity: 'Observed velocity decreased', unchanged_velocity: 'Observed velocity unchanged',
 new_activity: 'New observed activity · previous period zero', no_activity: 'No observed distribution in either covered period', unavailable: 'Comparison withheld',
};
function PeriodEvidence({ period, label }: { period: SignalPeriod; label: string }) {
 return <div className="signal-period-evidence"><h4>{label} · 24h target</h4><dl>
  <div><dt>Actual start / end (UTC)</dt><dd>{utc(period.startAt)}<br/>→ {utc(period.endAt)}</dd></div>
  <div><dt>Requested start / end (UTC)</dt><dd>{utc(period.requestedStartAt)}<br/>→ {utc(period.requestedEndAt)}</dd></div>
  <div><dt>Observed coverage</dt><dd>{period.observedSeconds === null ? 'Unavailable' : number(period.observedSeconds / 3600) + ' hours'} · {period.observationCount} unique points</dd></div>
  <div><dt>Boundary offsets · start / end</dt><dd>{period.startBoundaryOffsetSeconds ?? '—'} / {period.endBoundaryOffsetSeconds ?? '—'} seconds</dd></div>
  <div><dt>Maximum gap</dt><dd>{period.maxGapSeconds === null ? 'Unavailable' : number(period.maxGapSeconds / 3600) + ' hours'} · {period.timing === 'nearest_snapshot' ? 'nearest earlier snapshot' : period.timing ?? 'boundary unavailable'}</dd></div>
 </dl></div>;
}
export default function SignalPanel({ signal, symbol }: { signal: SignalReport; symbol: string }) {
 return <section className="signal-panel" aria-label="Matched reward distribution research">
  <div className="signal-heading"><span>SIGNAL LAB / {symbol} DISTRIBUTIONS</span><span className={'signal-confidence ' + (signal.status === 'available' ? 'signal-covered' : '')}>{signal.confidence === 'coverage_passed' ? 'COVERAGE PASSED' : 'INSUFFICIENT / WITHHELD'}</span></div>
  <div className="signal-matched"><div><span>CURRENT · 24H TARGET</span><strong>{signal.current.distributedTokens === null ? 'Unavailable' : number(signal.current.distributedTokens)}{signal.current.distributedTokens !== null && <small> {symbol}</small>}</strong></div><div><span>PREVIOUS · MATCHED TARGET</span><strong>{signal.previous.distributedTokens === null ? 'Unavailable' : number(signal.previous.distributedTokens)}{signal.previous.distributedTokens !== null && <small> {symbol}</small>}</strong></div></div>
  <div className="signal-velocity"><div><span>OBSERVED VELOCITY</span><strong>{signal.current.tokensPerHour === null ? '—' : number(signal.current.tokensPerHour) + ' ' + symbol + '/hour'}</strong><small>Previous: {signal.previous.tokensPerHour === null ? 'Unavailable' : number(signal.previous.tokensPerHour) + ' ' + symbol + '/hour'}</small></div><div><span>VELOCITY CHANGE</span><strong>{signal.accelerationPercent === null ? 'Unavailable' : (signal.accelerationPercent > 0 ? '+' : '') + number(signal.accelerationPercent) + '%'}</strong><small>{categories[signal.category]}</small></div></div>
  <p className="signal-caveat">Measured over actual adjacent periods, never predicted payouts or holder returns. Both periods need coverage; no missing observations are filled.</p>
  {signal.reasons.length > 0 && <ul className="signal-reasons" aria-label="Why the comparison is withheld">{signal.reasons.slice(0, 3).map(reason => <li key={reason}>{signalReasons[reason] ?? reason}</li>)}</ul>}
  <details className="signal-evidence"><summary>Matched-period evidence & payout counters</summary>
   <div className="signal-periods"><PeriodEvidence period={signal.current} label="Current"/><PeriodEvidence period={signal.previous} label="Previous"/></div>
   <p>API-reported payout counter change: current {signal.current.payoutCountChange === null ? 'Unavailable' : number(signal.current.payoutCountChange)} · previous {signal.previous.payoutCountChange === null ? 'Unavailable' : number(signal.previous.payoutCountChange)}. {signal.payoutCountStatus === 'unavailable' ? signal.payoutCountReason === 'missing_or_invalid_payout_count' ? 'Payout counter coverage is missing or invalid.' : 'Counts are withheld because the matched comparison is incomplete.' : 'This does not count unique paid wallets.'}</p>
   <p>Observed spans must be 24h to 24h + 1 minute, with gaps under 2h and the same verified quote mint throughout. Velocity uses the actual hours; its percentage change is unavailable when previous velocity is zero. New activity describes zero → positive only after both periods pass.</p>
   {signal.reasons.length > 3 && <p>Additional limitations: {signal.reasons.slice(3).map(reason => signalReasons[reason] ?? reason).join(' · ')}</p>}
   {signal.warnings.length > 0 && <p>Identical duplicate timestamps were counted once.</p>}
  </details>
 </section>;
}
