'use client';
import {useRef, useState} from 'react';
import {completeness, decisionBlockers, emptyDraft, fields} from './draft.mjs';
import styles from './desk.module.css';

type Decision = 'PLAN' | 'WATCH' | 'PASS';
type Receipt = {decision: Decision; draft: Record<string,string>};
const hints: Record<string,string> = {
 asset: 'Manual label only. Ticker alone does not identify an asset. Chain, market and identity remain unknown; unsupported assets are not resolved.',
 purpose: 'Why consider this? Investing, a swing, or speculation — in your own words.',
 horizon: 'Your intended holding period and next review point.',
 thesis: 'What would have to be true for participation to make sense?',
 evidence: 'Your assertions or references only. Nothing entered here becomes an admitted fact; URLs are not opened.',
 counterThesis: 'The strongest case against your thesis.',
 unknowns: 'What is missing, uncertain, or outside your knowledge?',
 invalidation: 'What would change your mind? Describe an event or your own price assumption and exit rationale. An exit is not guaranteed.',
 portfolio: 'Manually describe capital, available cash, existing exposure and your maximum allocation. No account is connected.',
 risk: 'Manually describe maximum planned dollar loss, intended entry / size, liquidity, fees and slippage. No sizing or loss calculation runs.',
 reason: 'Explain your choice. PASS is a complete outcome; WATCH can hold incomplete research.',
};

export default function DecisionDesk() {
 const [draft, setDraft] = useState<Record<string,string>>(emptyDraft);
 const [affirmed, setAffirmed] = useState(false);
 const [receipt, setReceipt] = useState<Receipt | null>(null);
 const [attempt, setAttempt] = useState<{decision: Decision; blockers: string[]} | null>(null);
 const outcome = useRef<HTMLElement>(null);
 const checks = completeness(draft, affirmed);
 function change(key: string, value: string) {
  setDraft(current => ({...current, [key]: value})); setReceipt(null); setAttempt(null);
 }
 function choose(decision: Decision) {
  const blockers = decisionBlockers(decision, draft, affirmed);
  setAttempt({decision, blockers});
  setReceipt(blockers.length ? null : {decision, draft: {...draft}});
  outcome.current?.focus();
 }
 function clear() {
  setDraft(emptyDraft()); setAffirmed(false); setReceipt(null); setAttempt(null);
 }
 return <main id="scout-content" className={styles.desk}>
  <header className={styles.header}><span className={styles.wordmark}>UNFARMD<span aria-hidden="true"> / </span> DECISION DESK</span><span className={styles.badge}>SOURCE-DISABLED PROTOTYPE</span></header>
  <div className={styles.intro}><p className={styles.eyebrow}>CUSTOMER ZERO · MANUAL RESEARCH</p><h1>Trade the thesis.<br/><span>Not the dopamine.</span></h1><p>A deliberate place to think before participating. No trade is a full outcome.</p></div>
  <aside className={styles.notice} aria-label="Draft privacy and limitations"><strong>Manual · session-only draft</strong><p>Held only in this page’s memory. Refreshing or closing loses your draft. This is not a saved journal. No storage, account, wallet or live source is connected. Use Clear draft before leaving a shared device; browser history or form restoration is outside this prototype’s control.</p></aside>
  <div className={styles.layout}>
   <div className={styles.editor}>
    <section className={styles.panel} aria-labelledby="asset-heading"><p className={styles.eyebrow}>01 / ENTER</p><h2 id="asset-heading">Start with your asset</h2>
     <label htmlFor="desk-asset">{fields[0][1]}</label><input id="desk-asset" value={draft.asset} maxLength={240} autoComplete="off" spellCheck={false} aria-describedby="hint-asset" onChange={e => change('asset', e.target.value)}/><p id="hint-asset" className={styles.hint}>{hints.asset}</p>
     <dl className={styles.facts}><div><dt>Identity</dt><dd>Unknown · not verified</dd></div><div><dt>Source / last observed</dt><dd>No source connected · unavailable</dd></div><div><dt>Market facts / coverage</dt><dd>Unavailable · no supported coverage established</dd></div></dl>
    </section>
    <section className={styles.panel} aria-labelledby="thesis-heading"><p className={styles.eyebrow}>02 / THINK</p><h2 id="thesis-heading">Write both sides</h2><p className={styles.hint}>Every field below is user-entered, unverified research or a hypothetical assumption. No automatic analysis.</p>
     {fields.slice(1).map(([key, label]) => <div className={styles.field} key={key}><label htmlFor={`desk-${key}`}>{label}</label><textarea id={`desk-${key}`} rows={key === 'thesis' || key === 'counterThesis' ? 3 : 2} value={draft[key]} maxLength={2000} autoComplete="off" aria-describedby={`hint-${key}`} onChange={e => change(key, e.target.value)}/><p id={`hint-${key}`} className={styles.hint}>{hints[key]}</p></div>)}
    </section>
   </div>
   <div className={styles.review}>
    <section className={styles.panel} aria-labelledby="risk-heading"><p className={styles.eyebrow}>03 / CHECK</p><h2 id="risk-heading">Risk preview · unconnected</h2><p>No risk budget has passed. Position size, worst-case loss and affordability are unavailable. Manual assumptions do not establish safety.</p><p className={styles.hint}>Evidence and risk contracts await separate review and integration. No financial calculations run in this prototype.</p></section>
    <section className={styles.panel} aria-labelledby="decision-heading"><p className={styles.eyebrow}>04 / DECIDE</p><h2 id="decision-heading">Choose deliberately</h2><p>WATCH can hold incomplete data. PASS needs only your written reason. PLAN remains unavailable until the checks and reviewed integrations are complete.</p>
     <label className={styles.affirm}><input type="checkbox" checked={affirmed} onChange={e => {setAffirmed(e.target.checked); setReceipt(null); setAttempt(null);}}/><span>I understand these are my unverified, hypothetical assumptions, not an order or a risk approval.</span></label>
     <details><summary>PLAN completeness checks</summary><ul className={styles.checks}>{checks.map(item => <li key={item.label}><span>{item.complete ? 'Entered' : 'Missing'}</span> {item.label}</li>)}</ul><p className={styles.hint}>Entered means present, not validated or sufficient. No override unlocks PLAN here.</p></details>
     <div className={styles.actions}><button type="button" aria-disabled="true" aria-describedby="plan-help" onClick={() => choose('PLAN')}>PLAN</button><button type="button" onClick={() => choose('WATCH')}>WATCH</button><button type="button" onClick={() => choose('PASS')}>PASS</button></div><p id="plan-help" className={styles.hint}>PLAN is blocked. Select it to inspect missing checks.</p>
     <section ref={outcome} tabIndex={-1} className={styles.outcome} aria-label="Decision outcome" aria-live="polite">
      {attempt?.blockers.length ? <><h3>{attempt.decision} · not recorded</h3><ul>{attempt.blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul></> : receipt ? <><h3>{receipt.decision} · manual draft decision</h3><p>Session-only · not saved or executed. Editing any field clears this decision.</p><dl><dt>Asset · user-entered, unresolved</dt><dd>{receipt.draft.asset.trim() || 'Not entered'}</dd><dt>Your reason</dt><dd>{receipt.draft.reason}</dd></dl></> : <p>No decision selected. Nothing is saved or executed.</p>}
     </section>
     <button className={styles.clear} type="button" onClick={clear}>Clear draft</button>
    </section>
   </div>
  </div>
  <p className={styles.footer}>Independent UNFARMD prototype. No source verification, trading execution or journal persistence. Existing private controls are separate and unchanged.</p>
 </main>;
}
