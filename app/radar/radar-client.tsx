'use client';
import { useState } from 'react';
import type { RadarReport } from '../../lib/radar';
import useRadar from './use-radar';
import { EcosystemOverview, TokenRow, DatasetEvidence } from './evidence-view';

export default function RadarClient() {
 const [sort, setSort] = useState<RadarReport['sort']>('coverage');
 const [quoteMint, setQuoteMint] = useState('');
 const { report, loading, failed, quoteOptions, retry } = useRadar(sort, quoteMint);
 return <main id="scout-content" tabIndex={-1} className="radar-shell ux-terminal">
  <header className="terminal-heading"><span className="terminal-wordmark">◉ SCOUT<span>.</span></span><span className="terminal-mode">READ-ONLY RESEARCH</span></header>
  <section className="terminal-hero"><div className="kicker">INTELLIGENCE RADAR</div><h1>What actually changed?</h1><p>Recorded StonkFun reward flows, in their own quote units.</p></section>
  <EcosystemOverview report={report} filtered={!!quoteMint} failed={failed}/>
  <div className="radar-toolbar"><div><label htmlFor="radar-sort">ORDER BY EVIDENCE</label><select id="radar-sort" value={sort} onChange={e => setSort(e.target.value as RadarReport['sort'])}><option value="coverage">Coverage / freshness</option><option value="name">Token name</option><option value="freshness">Observation freshness</option></select></div><div><label htmlFor="radar-quote">REWARD QUOTE UNIT</label><select id="radar-quote" value={quoteMint} onChange={e => setQuoteMint(e.target.value)}><option value="">All quote assets</option>{quoteOptions.map(quote => <option key={quote.mint} value={quote.mint}>{quote.symbol}</option>)}</select></div><button type="button" disabled={loading} onClick={retry}>{loading ? 'Checking…' : 'Refresh observations'}</button></div>
  <p className="terminal-disclaimer">Evidence order, never an investment ranking. Different quote units cannot be compared as returns.</p>
  <div role="status" className="terminal-status">{loading ? 'Reading sourced observations…' : failed ? 'Radar is temporarily unavailable. Refresh to retry.' : report?.rows.length === 0 ? 'No tracked tokens match this filter.' : 'Recorded points below. Open Evidence / Details for coverage and sources.'}</div>
  <section aria-label="Tracked reward tokens" aria-busy={loading} className="token-list">{report?.rows.map(row => <TokenRow key={row.mint} row={row}/>)}</section>
  {report && <DatasetEvidence report={report} query={'/api/radar?sort=' + sort + (quoteMint ? '&quoteMint=' + encodeURIComponent(quoteMint) : '')}/>}
 </main>;
}
