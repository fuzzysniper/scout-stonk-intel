'use client';
import useRadar from './radar/use-radar';
import { DatasetEvidence, EcosystemOverview, TokenRow } from './radar/evidence-view';

export default function EcosystemPreview() {
 const { report, loading, failed, retry } = useRadar();
 return <section className="ecosystem-preview" aria-label="Ecosystem research preview">
  <EcosystemOverview report={report} failed={failed}/>
  <div className="preview-title"><h2 className="sr-only">Tracked reward flows</h2><span>First 3 · evidence order</span><a href="/radar" className="flow-more">Full Radar →</a></div>
  <div role="status" className="terminal-status">{loading ? 'Reading sourced observations…' : failed ? 'Source unavailable. Retry to check.' : report?.rows.length === 0 ? 'No tracked tokens in this response.' : ''}</div>
  {failed && <button type="button" className="terminal-retry" onClick={retry}>Retry observations</button>}
  <div className="token-list" aria-busy={loading}>{report?.rows.slice(0, 3).map(row => <TokenRow key={row.mint} row={row} evaluatedAt={report.fetchedAt} sourceStatus={report.status}/>)}</div>
  {report && <DatasetEvidence report={report}/>}
 </section>;
}
