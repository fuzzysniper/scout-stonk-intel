'use client';
import useRadar from './radar/use-radar';
import { DatasetEvidence, EcosystemOverview, TokenRow } from './radar/evidence-view';

export default function EcosystemPreview() {
 const { report, loading, failed, retry } = useRadar();
 return <section className="ecosystem-preview" aria-label="Ecosystem research preview">
  <EcosystemOverview report={report} failed={failed}/>
  <div className="preview-title"><h2>On the Radar</h2><span>Ordered by evidence</span></div>
  <div role="status" className="terminal-status">{loading ? 'Reading sourced observations…' : failed ? 'Observations unavailable. No amounts or freshness claimed.' : report?.rows.length === 0 ? 'No tracked tokens in this response.' : 'First three tracked tokens · full filters in Radar.'}</div>
  {failed && <button type="button" className="terminal-retry" onClick={retry}>Retry observations</button>}
  <div className="token-list" aria-busy={loading}>{report?.rows.slice(0, 3).map(row => <TokenRow key={row.mint} row={row}/>)}</div>
  {report && <DatasetEvidence report={report}/>}
 </section>;
}
