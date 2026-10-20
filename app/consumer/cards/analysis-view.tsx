import type {CardsReport,PairFinding} from './model';
import {blockerText} from './observations';
export function PairEligibility({row}:{row:PairFinding}){
 return <section className="cr-eligibility" aria-label="Price comparison eligibility"><h3>Why this token cannot be ranked</h3><ul>{row.eligibility.reasons.map(reason=><li key={reason}>{blockerText[reason]}</li>)}</ul><p>Reported snapshot fields: {[
  row.eligibility.reported.price?'USD price':null,row.eligibility.reported.liquidity?'USD liquidity':null,row.eligibility.reported.volume?'trailing 24h USD volume':null,
 ].filter(Boolean).join(', ')||'none'}. Presence does not establish timing, history, comparable flow or publication permission.</p></section>;
}
export function AnalysisReadiness({report}:{report:CardsReport|null}){
 const a=report?.analysis;
 return <section className="cr-analysis-readiness" aria-labelledby="readiness-heading"><h2 id="readiness-heading">What can actually be compared?</h2>{a?<><p><strong>{a.comparableCount} of {a.sampleCount} sampled pairs qualify for the 24-hour comparison.</strong> This is a data-eligibility result, not a zero return.</p><table><caption>Current API evidence, separate from permissions</caption><thead><tr><th scope="col">Evidence</th><th scope="col">In this sample</th></tr></thead><tbody>
 <tr><th scope="row">Reported price / liquidity / volume snapshots</th><td>{a.priceSnapshotCount} / {a.liquiditySnapshotCount} / {a.volumeSnapshotCount} tokens; USD, market times unknown</td></tr>
 <tr><th scope="row">Qualified CARDS price-history points</th><td>{a.actualPricePoints}; require 25 aligned actual hourly points per token</td></tr>
 <tr><th scope="row">Market-cap comparisons</th><td>Unavailable: no cap or supply definition in this contract</td></tr>
 <tr><th scope="row">Financial publication permission</th><td>Unverified; independent of whether mathematical coverage passes</td></tr>
 </tbody></table></>:<p>No current sample has loaded. No eligible-pair count can be established.</p>}
 <h3>Dated source investigation · 20 Oct 2026</h3><p>The official catalog and single-token APIs returned untimed USD snapshots. The published OpenAPI lists no general token price-history endpoint. A DexScreener exact-pool probe returned 403; GeckoTerminal API/docs could not be inspected through this environment. These findings are dated research, not live provider-health checks.</p><p>Source access, timestamp semantics and publication permission are separate gates. No usable timestamped public CARDS price source has been qualified. We do not substitute retrieval times, launch dates, reported 24h changes or another token’s history.</p><a href="https://www.stonkfun.xyz/api/public/v1/openapi.json" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Official endpoint definitions · may have changed ↗</a><a href="https://www.stonkfun.xyz/developers#rate-limits" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Official API guide &amp; read budgets ↗</a>
 </section>;
}
