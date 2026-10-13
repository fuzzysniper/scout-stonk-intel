import Link from 'next/link';
export default function FirstSteps() {
 return <section className="first-steps" aria-labelledby="first-steps-title">
  <div className="kicker">NEW TO SCOUT?</div><h2 id="first-steps-title">Start with the evidence.</h2>
  <p>SCOUT helps you read recorded StonkFun reward reports and market context. No wallet or token address is needed to browse.</p>
  <ol>
   <li><Link href="/radar">Browse Radar</Link><span>Explore tracked tokens and actual recorded comparisons.</span></li>
   <li><Link href="/brief">Read the Daily Brief</Link><span>Check the UTC date, edition state and coverage before a finding.</span></li>
   <li><Link href="/status">Check Data Health</Link><span>See observation freshness and missing-data reasons.</span></li>
  </ol>
  <p className="readiness-limit">Missing data is not zero rewards. API reports do not prove individual profit or future yield. <Link href="/research">How to read the evidence →</Link></p>
 </section>;
}
