import Link from 'next/link';
import type {publicHistoricalResearch} from '../../../lib/historical-research';
export default function HistoricalResearchView({report}:{report:ReturnType<typeof publicHistoricalResearch>}){
 return <main id="scout-content" tabIndex={-1} className="historical-shell">
  <Link className="historical-back" href="/">← Terminal</Link>
  <p className="historical-eyebrow">SCOUT / HISTORICAL RESEARCH</p>
  <h1>What was recorded.</h1>
  <p className="historical-lead"><strong>14 Oct 2026 · historical, not current.</strong> A source index for four dated provider-aggregate captures. No recent reward flow or holder returns established.</p>
  <p className="historical-warning">Financial figures withheld pending provider rights and owner approval. This source index contains no published reward amounts or rankings.</p>
  {report.state==='withheld'?<p role="status">Retained evidence could not be verified. Research records withheld; no live substitute. <Link href="/research">Read the evidence guide</Link>.</p>:<section aria-label="Dated pair source index">
   {report.records.map(r=><article className="historical-row" id={r.tokenMint} key={r.id}>
    <div className="historical-row-heading"><h2>{r.symbol}<span> / {r.unit.symbol}</span></h2><time dateTime={r.source.capturedAt}>{r.source.capturedAt.slice(11,23)} UTC</time></div>
    <p>Dated provider-reported lifetime record · unknown start and reconciliation cutoff.</p>
    <details><summary>View historical sources<span className="sr-only"> for {r.symbol} / {r.unit.symbol}</span></summary><div className="historical-details">
     <dl><div><dt>Token mint · Solana</dt><dd>{r.tokenMint}</dd></div><div><dt>Exact quote unit</dt><dd>{r.unit.symbol} · {r.unit.mint} · {r.unit.decimals} decimals{r.unit.symbolAmbiguous?' · ticker shared by distinct mints; canonical identity only':''}</dd></div>
      <div><dt>Original receipt capture</dt><dd><time dateTime={r.source.originalCapturedAt}>{r.source.originalCapturedAt}</time></dd></div>
      <div><dt>Provider response generation</dt><dd><time dateTime={r.source.providerGeneratedAt}>{r.source.providerGeneratedAt}</time> · not a payout cutoff</dd></div>
      <div><dt>Receipt SHA-256</dt><dd>{r.source.receiptSha256}</dd></div><div><dt>Retained document SHA-256</dt><dd>{r.source.documentSha256}</dd></div>
      <div><dt>Immutable research identity</dt><dd>{r.id}</dd></div><div><dt>Original retention commit</dt><dd>{r.source.commit} · {r.source.path}</dd></div></dl>
     <a href={r.source.endpoint} rel="external noreferrer">Official aggregate endpoint ↗</a><p>This external endpoint can change or fail. The dated capture is separate; it is not refreshed when opened.</p>
     <p>{r.sampling} Different quote units and unequal lifetime periods cannot establish economic leadership.</p>
     <p>Provider assertion only, not chain-verified delivery. Reconstructed payout sequences and current verified periods are separate evidence tiers, not established here. No historical price series, individual profitability or equity ownership is established.</p>
    </div></details>
   </article>)}
  </section>}
  <footer className="historical-footer"><Link href="/research">Evidence guide</Link><Link href="/status">Current data health</Link><p>Read-only source index. Retention and commercial redistribution permission remain unverified. Missing is not zero.</p></footer>
 </main>;
}
