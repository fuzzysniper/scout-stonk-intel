'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { TrackedToken } from '../../lib/tracked-tokens';
import type { RadarReport } from '../../lib/radar';
import { flowReading, utc } from '../radar/evidence-view';
import { fromTracked, searchPairs } from './adapter';
import type { PairToken } from './adapter';

const amount = (value: number) => new Intl.NumberFormat('en-US', { maximumSignificantDigits: 8 }).format(value);
type Health = { status: string; checkedAt: string };

export function PairTokenRow({ token, report }: { token: PairToken; report: RadarReport | null }) {
 const row = token.radar;
 const reading = row && report ? flowReading(row, report.status) : { state: 'Observations unavailable' };
 return <article className="pair-token" aria-labelledby={'pair-token-' + token.mint}>
  <div className="pair-token-name"><h3 id={'pair-token-' + token.mint}><Link href={'/?mint=' + token.mint}>{token.symbol}<span className="sr-only"> token dossier</span></Link></h3><span>{token.name} / {token.quoteSymbol}</span></div>
  <div className="pair-reward"><span className="pair-label">Observed rewards</span>{'state' in reading ? <strong className="pair-withheld">{reading.state}</strong> : <><strong>{amount(reading.value)} {token.quoteSymbol}</strong><span>Pool counter change · {reading.kind === 'point' ? 'recorded interval' : '24h target'}</span></>}
   <span>{token.lastObservedAt ? <>Observed <time dateTime={token.lastObservedAt}>{utc(token.lastObservedAt)}</time></> : 'No observation available'}</span>
  </div>
  <details className="pair-token-evidence"><summary>Evidence<span className="sr-only"> for {token.symbol}</span></summary>
   <div className="pair-evidence-body">
    <dl><div><dt>Token mint</dt><dd>{token.mint}</dd></div><div><dt>Reward mode</dt><dd>{token.rewardModeVerified ? 'Verified at allowlist capture' : 'Unverified'}</dd></div><div><dt>Recorded observations</dt><dd>{token.observationCount ?? 'Unavailable'}</dd></div>
     <div><dt>Liquidity / market context</dt><dd>Unavailable · no verified same-pair market source</dd></div><div><dt>Historical quote-relative return</dt><dd>Unavailable</dd></div><div><dt>Holder-attributable rewards</dt><dd>Unavailable</dd></div>
     <div><dt>Comparable reward metric</dt><dd>{row?.signals.status === 'available' && report?.status === 'available' ? 'Backend matched-period gate passed' : 'Unavailable · matched-period gate not passed'}</dd></div>
    </dl>
    {!('state' in reading) && <p>Actual interval: <time dateTime={reading.startAt}>{utc(reading.startAt)}</time> → <time dateTime={reading.endAt}>{utc(reading.endAt)}</time> ({amount(reading.seconds / 3600)} hours). Distributed to the pool; no holder return inferred.</p>}
    {row?.signals.status === 'available' && report?.status === 'available' && <dl>{([['Current',row.signals.current],['Previous',row.signals.previous]] as const).map(([label,period]) => <div key={label}><dt>{label} matched period</dt><dd>{period.distributedTokens === null ? 'Unavailable' : amount(period.distributedTokens) + ' ' + token.quoteSymbol} · {utc(period.startAt)} → {utc(period.endAt)} · {period.observationCount} points · max gap {period.maxGapSeconds ?? 'unknown'}s</dd></div>)}</dl>}
    <p>Same quote does not establish synchronized observation windows between tokens. Amounts are not a leaderboard. Missing history is not zero activity.</p>
    {row && <div className="pair-source-links"><a href={row.source}>Official rewards ↗</a><a href={row.evidence}>Recorded history ↗</a><a href="/evidence/reward-verification.json">Identity capture ↗</a></div>}
    <Link href={'/?mint=' + token.mint}>Open token dossier →</Link>
   </div>
  </details>
 </article>;
}

export default function PairExplorer({ tokens }: { tokens: TrackedToken[] }) {
 const [report,setReport] = useState<RadarReport | null>(null);
 const [health,setHealth] = useState<Health | null>(null);
 const [loading,setLoading] = useState(true);
 const [failed,setFailed] = useState(false);
 const [refresh,setRefresh] = useState(0);
 const [query,setQuery] = useState('');
 const [selected,setSelected] = useState(() => (tokens.find(token => token.quoteSymbol === 'NVDAX') ?? tokens[0])?.quoteMint ?? '');
 useEffect(() => {
  let disposed = false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  setLoading(true); setReport(null); setHealth(null); setFailed(false);
  void Promise.allSettled([
   fetch('/api/radar?sort=name',{signal:controller.signal,cache:'no-store'}).then(async response => {
    const value = await response.json() as RadarReport;
    if ((!response.ok && response.status !== 503) || !Array.isArray(value.rows) || !value.dataset || value.rows.some(row => !row.signals || !row.windows || !row.pointChange)) throw Error('Invalid radar');
    return value;
   }).then(value => { if (!disposed) setReport(value); })
    .catch(() => { if (!disposed) setFailed(true); })
    .finally(() => { if (!disposed) setLoading(false); }),
   fetch('/api/status',{signal:controller.signal,cache:'no-store'}).then(async response => {
    const value = await response.json() as Health;
    if ((!response.ok && response.status !== 503) || !['available','degraded','unavailable'].includes(value.status) || !Number.isFinite(Date.parse(value.checkedAt))) throw Error('Invalid health');
    return value;
   }).then(value => { if (!disposed) setHealth(value); }),
  ]).finally(() => clearTimeout(timer));
  return () => { disposed = true; clearTimeout(timer); controller.abort(); };
 },[refresh]);
 const groups = useMemo(() => fromTracked(tokens,report),[tokens,report]);
 const matches = searchPairs(groups,query);
 const group = groups.find(group => group.quoteMint === selected);
 const visible = group && matches.some(match => match.quoteMint === group.quoteMint);
 return <section className="pair-explorer" aria-label="Pair intelligence explorer">
  <header className="pair-heading"><span className="flow-brand">SCOUT / PAIR INTELLIGENCE</span><h1>Choose your pair.<br className="pair-mobile-break"/> Compare the evidence.</h1><p>Verified quote assets · StonkFun memecoins</p></header>
  <div className="pair-controls"><label htmlFor="pair-search">Find a pair or token</label><input id="pair-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="NVDAX, STONK, token or mint…" autoComplete="off" spellCheck={false}/>
   <div className="pair-chips" role="group" aria-label="Verified quote pairs">{matches.map(pair => <button type="button" key={pair.quoteMint} aria-pressed={pair.quoteMint === selected} title={pair.quoteMint} onClick={() => setSelected(pair.quoteMint)}>{pair.quoteSymbol}<span>{pair.tokens.length}<span className="sr-only"> tracked tokens</span></span><span className="sr-only"> quote mint {pair.quoteMint}</span></button>)}</div>
   {matches.length === 0 && <p role="status">No verified pair in this sample. <button className="pair-clear" type="button" onClick={() => setQuery('')}>Clear search</button></p>}
   {matches.length > 0 && !visible && <p role="status">Choose a matching pair above.</p>}
  </div>
  <div className="pair-scope"><span>Limited sample · {tokens.length} tracked tokens · {groups.length} quote assets</span><button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading}>{loading ? 'Reading…' : failed ? 'Retry observations' : 'Refresh'}</button></div>
  <p className="pair-load-state" role="status">{loading ? 'Reading recorded observations…' : failed || report?.status === 'unavailable' ? 'Observation source unavailable. Verified identities retained; rewards withheld.' : report?.status === 'degraded' ? 'Source degraded · reward changes withheld.' : 'Recorded sample · not complete market coverage.'}</p>
  {visible && group && <>
   <div className="pair-selected"><h2>{group.quoteSymbol}<span> / {group.tokens.length} tracked {group.tokens.length === 1 ? 'memecoin' : 'memecoins'}</span></h2><p>Quote mint <a href={'https://solscan.io/token/' + group.quoteMint}>{group.quoteMint}</a></p></div>
   <div className="pair-availability" aria-label="Unavailable sourced metrics"><span>Liquidity <b>Unavailable</b></span><span>Pair return <b>Unavailable</b></span><span>Holder rewards <b>Unavailable</b></span></div>
   <div className="pair-token-list" aria-busy={loading}>{group.tokens.map(token => <PairTokenRow key={token.mint} token={token} report={report}/>)}</div>
   {group.tokens.length === 0 && <p>No verified tokens in this pair.</p>}
   <details className="pair-dataset"><summary>Pair identity &amp; source scope</summary><div className="pair-evidence-body"><p>Quote identity verified {utc(group.verifiedAt)} against the <a href={group.source}>official catalog</a>. A ticker does not imply ownership of underlying equity or metal. Reward-mode verification is a dated API capture, not onchain reconciliation.</p><p>Seven curated tokens only. Absent pairs may exist outside this sample. Liquidity, historical quote-relative returns and holder entitlement lack confirmed sources here.</p><p>Observation changes use existing Radar gates: matching quote identity, fresh records and a maximum two-hour point gap. Matched 24h periods require the backend coverage gate. Source failures withhold changes. No ranking or extrapolation.</p><p>Observation dataset: {report?.dataset.sourceStatus ?? 'Unavailable'} · retrieved {utc(report?.dataset.dataFetchedAt ?? null)}. API evaluated {utc(report?.fetchedAt ?? null)}. These are not observation times.</p>{report && <p><a href={report.dataset.source}>Snapshot source ↗</a> · revision {report.dataset.revision ?? 'Unavailable'}</p>}<p>Data Health: {health?.status ?? 'Unavailable'} · checked {utc(health?.checkedAt ?? null)}. <Link href="/status">Collection reliability →</Link></p><div className="pair-source-links"><a href="/api/radar?sort=name">Radar JSON</a><a href="/api/status">Health JSON</a><Link href="/radar">Full Radar</Link><Link href="/research">Research guide</Link></div></div></details>
  </>}
 </section>;
}
