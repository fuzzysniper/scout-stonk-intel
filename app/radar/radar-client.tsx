'use client';
import { useState } from 'react';
import type { RadarReport } from '../../lib/radar';
import useRadar from './use-radar';
import { EcosystemOverview, TokenRow, DatasetEvidence } from './evidence-view';

export default function RadarClient() {
 const [sort, setSort] = useState<RadarReport['sort']>('coverage');
 const [quoteMint, setQuoteMint] = useState('');
 const { report, loading, failed, quoteOptions, retry } = useRadar(sort, quoteMint);
 return <main id="scout-content" tabIndex={-1} className="radar-shell ux-terminal flow-first">
  <header className="flow-heading"><span className="flow-brand">SCOUT / STONKFUN</span><h1>Reward-flow Radar</h1></header>
  <EcosystemOverview report={report} filtered={!!quoteMint} failed={failed}/>
  <div className="radar-toolbar"><div><label htmlFor="radar-sort">Evidence order</label><select id="radar-sort" value={sort} onChange={e => setSort(e.target.value as RadarReport['sort'])}><option value="coverage">Coverage / freshness</option><option value="name">Token name</option><option value="freshness">Observation freshness</option></select></div><div><label htmlFor="radar-quote">Quote currency</label><select id="radar-quote" value={quoteMint} onChange={e => setQuoteMint(e.target.value)}><option value="">All quote assets</option>{quoteOptions.map(quote => <option key={quote.mint} value={quote.mint}>{quote.symbol}</option>)}</select></div><button type="button" disabled={loading} onClick={retry}>{loading ? 'Checking…' : 'Refresh'}</button></div>
  <div role="status" className="terminal-status">{loading ? 'Reading observations…' : failed ? 'Source unavailable. Refresh to retry.' : report?.rows.length === 0 ? 'No tokens match this filter.' : ''}</div>
  <section aria-label="Tracked reward tokens" aria-busy={loading} className="token-list">{report?.rows.map(row => <TokenRow key={row.mint} row={row} evaluatedAt={report.fetchedAt} sourceStatus={report.status}/>)}</section>
  {report && <DatasetEvidence report={report} query={'/api/radar?sort=' + sort + (quoteMint ? '&quoteMint=' + encodeURIComponent(quoteMint) : '')}/>}
 </main>;
}
