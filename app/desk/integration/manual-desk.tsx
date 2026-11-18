'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {Assumptions,Decision,DecisionEvent,Issue} from '../../../lib/unfarmd-risk';
import {emptyDraft,evaluateDraft,issueMessage,recordDraft,resolveDraftIdentity,type DeskEvaluation,type Draft,type Field} from './model';
import styles from '../desk.module.css';
import extra from './manual-desk.module.css';
type ControlProps={name:Field;label:string;draft:Draft;change:(name:Field,value:string)=>void;help?:string;mode?:'decimal'|'numeric';rows?:number;type?:'datetime-local';errors:Issue[];validate:boolean};
const targets:Record<string,string>={ 'entry.price':'entry','entry.asOf':'asOfUtc','invalidation.price':'stop','capital.availableCash':'cash','limits.maxPlannedLoss':'loss','limits.maxAllocationBps':'allocationBps','costsAcknowledged':'costConfirmed','proposedUnits':'units','affirmation':'confirmed','costs':'costMode','costs.fixedRoundTrip':'fixed','assumptions':'plan-fields' };
const target=(i:Issue)=>targets[i.field]??i.field;
function Control({name,label,draft,change,help,mode,rows,type,errors,validate}:ControlProps){
 const problems=validate?errors.filter(i=>target(i)===name):[],hint=`desk-hint-${name}`,error=`desk-error-${name}`;
 const common={id:`desk-${name}`,value:draft[name],autoComplete:'off',maxLength:name==='asset'?160:2000,'aria-describedby':[help?hint:'',problems.length?error:''].filter(Boolean).join(' ')||undefined,'aria-invalid':problems.length?true:undefined,onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>change(name,e.target.value)};
 return <div className={styles.field}><label htmlFor={`desk-${name}`}>{label}</label>{rows?<textarea {...common} rows={rows}/>:<input {...common} type={type??'text'} inputMode={mode} step={type?'1':undefined} spellCheck={false}/>}{help&&<p id={hint} className={styles.hint}>{help}</p>}{problems.length>0&&<p id={error} className={extra.error}>{issueMessage(problems[0])}</p>}</div>;
}
const bindingNames:Record<string,string>={planned_loss:'Planned-loss budget',allocation:'Remaining allocation',cash:'Available cash',unit_domain:'Software unit domain'};
function RiskPreview({evaluation}:{evaluation:DeskEvaluation|null}){
 const c=evaluation?.risk.calculation,chosen=c?.proposed??c?.ceiling,a=c?evaluation?.plan?.assumptions as Assumptions:undefined;
 return <section className={styles.panel} aria-labelledby="risk-heading"><p className={styles.eyebrow}>03 / MODEL</p><h2 id="risk-heading">Manual risk preview</h2>
  <p className={extra.state}><strong>{evaluation?.recordable?'Manual risk recordable':'Manual PLAN not yet recordable'}</strong><br/>Source-unverified · no investment or execution approval.</p>
  {c&&chosen?<><p className={styles.hint}>{c.proposed?'Your proposed units':'Arithmetic ceiling only · no position selected'}. Exact strings from your assumptions.</p><dl className={extra.metrics}>
   <div><dt>{c.proposed?'Proposed units':'Unit ceiling under entered constraints'}</dt><dd className={extra.exact}>{chosen.units}</dd></div>
   <div><dt>Planned loss · model only</dt><dd className={extra.exact}>USD {chosen.plannedLoss.amount}</dd></div>
   <div><dt>Entry cash with modeled costs</dt><dd className={extra.exact}>USD {chosen.entryCashWithCosts.amount}</dd></div>
   <div><dt>Remaining allocation envelope</dt><dd className={extra.exact}>USD {c.remainingAllocation.amount}</dd></div>
  </dl><p className={styles.hint}>Binding ceiling: {c.bindingConstraints.map(k=>bindingNames[k]).join(' · ')}.</p>
  {c.omittedCosts&&<p className={extra.warning}>Costs consciously omitted, not estimated. Actual costs may exceed this model.</p>}
  <details><summary>Model details and uncertainty</summary><dl className={styles.facts}><div><dt>Owner assumed entry / invalidation · USD</dt><dd className={extra.exact}>{a?.entry.price.amount} / {a?.invalidation.price.amount}</dd></div><div><dt>Owner assumption time · UTC, not source time</dt><dd className={extra.exact}>{a?.entry.asOf} · valid for {a?.entry.validForSeconds} seconds</dd></div><div><dt>Unit ceiling</dt><dd className={extra.exact}>{c.ceiling.units}</dd></div><div><dt>Per-unit planned downside</dt><dd className={extra.exact}>USD {c.perUnitPlannedDownside}</dd></div><div><dt>Fixed round-trip cost reserved once</dt><dd>USD {c.fixedRoundTrip.amount}</dd></div><div><dt>Planned-loss / cash budgets</dt><dd>USD {c.lossBudget.amount} / USD {c.cashBudget.amount}</dd></div></dl><p>Units round down; modeled cash and loss round up to cents. These are spot-equivalent model quantities, not verified tradable lots. No account or market has been checked.</p></details></>:<p>No valid model calculated yet. Missing values remain unknown; they are never replaced with zero.</p>}
  <p className={extra.warning}>Worst-case loss is unknown. Gaps, liquidity, unmodeled costs and failed exits can exceed this plan. No stop execution is guaranteed.</p>
 </section>;
}
export default function ManualDesk(){
 const [draft,setDraft]=useState<Draft>(emptyDraft),[evaluation,setEvaluation]=useState<DeskEvaluation|null>(null),[attempt,setAttempt]=useState<{decision:Decision;issues:Issue[]}|null>(null),[expanded,setExpanded]=useState(false),[notice,setNotice]=useState('No decision selected. Nothing is saved or executed.');
 const [receipt,setReceipt]=useState<{event:DecisionEvent;evaluation:DeskEvaluation}|null>(null),outcome=useRef<HTMLElement>(null),sequence=useRef(0);
 const identity=useMemo(()=>resolveDraftIdentity(draft),[draft]);
 const reset=useCallback(()=>{setDraft(emptyDraft());setEvaluation(null);setAttempt(null);setReceipt(null);setNotice('Draft cleared. Nothing is saved or executed.');},[]);
 useEffect(()=>{const show=(e:PageTransitionEvent)=>{if(e.persisted)reset();};window.addEventListener('pagehide',reset);window.addEventListener('pageshow',show);return()=>{window.removeEventListener('pagehide',reset);window.removeEventListener('pageshow',show);};},[reset]);
 function change(name:Field,value:string){
  const next={...draft,[name]:value,confirmed:false,costConfirmed:false};setDraft(next);setEvaluation(evaluateDraft(next,'PLAN',new Date().toISOString()));setReceipt(null);setAttempt(null);setNotice(receipt?'Draft changed; the previous decision has been cleared.':'No decision selected. Nothing is saved or executed.');
 }
 function confirm(name:'confirmed'|'costConfirmed',value:boolean){const next={...draft,[name]:value};setDraft(next);setEvaluation(evaluateDraft(next,'PLAN',new Date().toISOString()));setReceipt(null);setAttempt(null);setNotice('No decision selected. Nothing is saved or executed.');}
 function choose(decision:Decision){
  const at=new Date().toISOString(),result=recordDraft(draft,decision,at,`session-decision-${++sequence.current}`);setAttempt({decision,issues:result.evaluation.issues});setEvaluation(decision==='PLAN'?result.evaluation:evaluateDraft(draft,'PLAN',at));setReceipt(result.event?{event:result.event,evaluation:result.evaluation}:null);
  if(decision==='PLAN'&&!result.event)setExpanded(true);outcome.current?.focus();
 }
 const errors=(attempt?.issues??[]).filter(i=>i.severity==='error'),validate=attempt!==null;
 const field=(name:Field,label:string,help?:string,mode?:'decimal'|'numeric',rows?:number,type?:'datetime-local')=><Control key={name} {...{name,label,draft,change,help,mode,rows,type,errors,validate}}/>;
 const select=(name:Field,label:string,options:[string,string][],help?:string)=>{
  const problem=errors.find(i=>target(i)===name);
  return <div className={styles.field}><label htmlFor={`desk-${name}`}>{label}</label><select className={extra.select} id={`desk-${name}`} value={draft[name]} onChange={e=>change(name,e.target.value)} aria-invalid={validate&&problem?true:undefined} aria-describedby={[help?`desk-hint-${name}`:'',problem?`desk-error-${name}`:''].filter(Boolean).join(' ')||undefined}><option value="">Choose explicitly</option>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select>{help&&<p id={`desk-hint-${name}`} className={styles.hint}>{help}</p>}{problem&&<p id={`desk-error-${name}`} className={extra.error}>{issueMessage(problem)}</p>}</div>;
 };
 const identityLabel={exact_identifier:'Exact format · not verified',ambiguous:'Ticker ambiguous · no resolved asset',unsupported:'Unresolved / unsupported identity',conflicting_hints:'Conflicting identity fields',invalid:'Invalid identity format'}[identity.state];
 const uniqueErrors=(attempt?.issues??[]).filter(i=>i.severity==='error').filter((i,index,list)=>list.findIndex(j=>j.field===i.field&&j.code===i.code)===index);
 return <main id="scout-content" className={`${styles.desk} ${extra.deskExtras}`}>
  <header className={styles.header}><span className={styles.wordmark}>UNFARMD / DECISION DESK</span><span className={styles.badge}>MANUAL · SOURCES OFF</span></header>
  <div className={styles.intro}><p className={styles.eyebrow}>CUSTOMER ZERO · DECISION RESEARCH</p><h1>Trade the thesis.<br/><span>Not the dopamine.</span></h1><p>Plan deliberately. WATCH and PASS are complete outcomes.</p></div>
  <aside className={styles.notice} aria-label="Draft privacy and limitations"><strong>Manual · session memory only</strong><p>Not saved. Refreshing or closing loses this draft. No account, wallet, order, live quote or source is connected. Browser restoration is not secure erasure; clear a shared device before leaving.</p></aside>
  <div className={styles.layout}><div className={styles.editor}>
   <section className={styles.panel} aria-labelledby="asset-heading"><p className={styles.eyebrow}>01 / IDENTIFY</p><h2 id="asset-heading">Your asset reference</h2>
    {select('kind','Reference type',[['unknown','Ticker / unresolved'],['solana_mint','Solana mint format'],['evm_token','EVM token format'],['listed_equity','Equity listing reference']])}
    {field('asset','Asset · ticker, address or listing symbol','Your entry is not proof that a token or listing exists.')}
    {draft.kind==='solana_mint'&&select('chain','Solana network',[['solana:mainnet','Mainnet'],['solana:devnet','Devnet'],['solana:testnet','Testnet']])}
    {draft.kind==='evm_token'&&field('chain','EVM chain ID','Explicit decimal chain ID; no chain is inferred from the address.','numeric')}
    {draft.kind==='listed_equity'&&field('mic','Listing market · MIC','Four-character market reference. Not a verified or permanent security identity.')}
    <dl className={styles.facts}><div><dt>Identity · owner-entered</dt><dd>{identityLabel}</dd></div><div><dt>Sources</dt><dd>No connected verified sources</dd></div><div><dt>Source observation time</dt><dd>Unavailable</dd></div></dl>
    <details><summary>Identity and source details</summary><p>Format checks do not verify account ownership, mint existence, token controls, listing existence or an investment. No source policies are installed.</p><code className={extra.key}>{identity.asset.assetKey??'No canonical asset key · unresolved'}</code><p className={styles.hint}>{identity.reasons.map(r=>r.replaceAll('_',' ')).join(' · ')}</p><p className={styles.hint}>Admitted source facts: {evaluation?.source?evaluation.source.admissibleFactIds.length:'not evaluated'}. Source acquisition remains off.</p></details>
   </section>
   <section className={styles.panel} aria-label="Manual plan fields"><details id="desk-plan-fields" className={extra.formDetails} open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)}><summary>Build a manual plan</summary><p className={styles.hint}>All values are your hypothetical assumptions. Blank is unknown; enter genuine zero explicitly. Editing fields clears both acknowledgements and any recorded decision.</p>
    {select('purpose','Purpose',[['invest','Invest'],['swing','Swing'],['speculative','Speculative']])}
    {field('horizon','Time horizon','Your intended period and review point.')}{field('thesis','Thesis',undefined,undefined,3)}{field('counterThesis','Counter-thesis',undefined,undefined,3)}{field('unknowns','Unknowns','One explicit unknown per line, up to 20. No evidence is presumed complete.',undefined,3)}{field('notes','Evidence / journal notes · optional','Unverified assertions only. Links are not opened or admitted as facts.',undefined,3)}
    <fieldset className={extra.fieldset}><legend>Long spot / USD context</legend><div className={extra.grid}>{select('instrument','Position context',[['long_spot','Unleveraged LONG spot-equivalent']])}{select('currency','Assumption currency',[['USD','USD only']])}</div><p className={styles.hint}>No shorts, leverage, options or FX. USD is not an assumed stablecoin peg.</p></fieldset>
    <fieldset className={extra.fieldset}><legend>Entry and invalidation assumptions</legend><div className={extra.grid}>
     {field('entry','Assumed entry price · USD','Price string, at most 9 decimal places.','decimal')}{field('stop','Invalidation price · USD','Must be positive and below entry. This is not a stop order.','decimal')}
     {field('asOfUtc','Assumption time · UTC','Enter UTC digits, not local time. This is your hypothetical price reference, not provider observation time.',undefined,undefined,'datetime-local')}{field('validSeconds','Reference valid for · seconds','Owner-chosen integer window, 1–604800 seconds.','numeric')}
    </div>{field('invalidation','Invalidation & exit rationale','What changes your mind, and what could prevent an exit?',undefined,3)}</fieldset>
    <fieldset className={extra.fieldset}><legend>Capital and self-imposed limits</legend><div className={extra.grid}>
     {field('capital','Reference capital · USD','At most 2 decimal places.','decimal')}{field('cash','Available cash · USD',undefined,'decimal')}{field('existing','Existing same-asset exposure · USD','Enter 0 explicitly if none. No account is connected.','decimal')}{field('loss','Maximum planned loss budget · USD','Your chosen budget; actual loss may exceed it.','decimal')}{field('allocationBps','Maximum allocation · BPS','100 BPS = 1%; integer 0–10000. No default is chosen.','numeric')}{field('units','Proposed units · optional','Leave blank for a ceiling only, not a selected position. At most 9 decimals.','decimal')}
    </div></fieldset>
    <fieldset className={extra.fieldset}><legend>Cost assumptions</legend>{select('costMode','How to model costs',[['explicit','Enter explicit fees, slippage and fixed cost'],['omitted','Consciously omit costs · unestimated']])}
     {draft.costMode==='explicit'&&<div className={extra.grid}>{field('entryFee','Entry fee · BPS','Enter your assumption, including 0 explicitly.','numeric')}{field('exitFee','Exit fee · BPS',undefined,'numeric')}{field('entrySlip','Entry slippage · BPS',undefined,'numeric')}{field('exitSlip','Exit slippage · BPS',undefined,'numeric')}{field('fixed','Fixed round-trip cost · USD','Reserved once against loss, cash and allocation.','decimal')}</div>}
     <label className={styles.affirm}><input id="desk-costConfirmed" type="checkbox" checked={draft.costConfirmed} aria-invalid={validate&&errors.some(i=>target(i)==='costConfirmed')?true:undefined} onChange={e=>confirm('costConfirmed',e.target.checked)}/><span>I acknowledge my chosen cost assumptions. Omitted costs are unestimated; actual fees and slippage can exceed this model.</span></label>
    </fieldset>
   </details></section>
  </div><div className={styles.review} data-testid="desk-review">
   <section className={styles.panel} aria-labelledby="decision-heading"><p className={styles.eyebrow}>02 / DECIDE</p><h2 id="decision-heading">Choose deliberately</h2>
    {field('reason','Decision reason','PASS needs only a reason. WATCH may retain incomplete research.',undefined,3)}
    <label className={styles.affirm}><input id="desk-confirmed" type="checkbox" checked={draft.confirmed} aria-invalid={validate&&errors.some(i=>target(i)==='confirmed')?true:undefined} onChange={e=>confirm('confirmed',e.target.checked)}/><span>I confirm these are my own manual assumptions; losses may exceed the plan; nothing is executed. A record is not source verification or investment approval.</span></label>
    <div className={styles.actions}><button type="button" aria-disabled={!evaluation?.recordable} aria-describedby="manual-plan-help" onClick={()=>choose('PLAN')}>MANUAL PLAN</button><button type="button" onClick={()=>choose('WATCH')}>WATCH</button><button type="button" onClick={()=>choose('PASS')}>PASS</button></div><p id="manual-plan-help" className={styles.hint}>A manual PLAN requires actual risk validation and your confirmation. Select it to inspect blockers.</p>
    <section ref={outcome} tabIndex={-1} className={styles.outcome} aria-label="Decision outcome" aria-live="polite">
     {receipt?<div className={extra.receipt}><h3>{receipt.event.plan.decision==='PLAN'?'MANUAL PLAN':receipt.event.plan.decision} · recorded in memory</h3><p>Not saved or executed. Editing any field clears this record.</p><p><strong>Source-unverified · asset not verified.</strong> No connected provider, investment vetting or execution verification.</p><dl><dt>Owner asset reference</dt><dd>{receipt.event.plan.asset?.label??'Not entered'}</dd><dt>Your reason</dt><dd>{receipt.event.plan.reason}</dd></dl><time className={extra.time} dateTime={receipt.event.recordedAt}>In-memory decision time · {receipt.event.recordedAt}</time>{receipt.event.plan.decision==='PLAN'&&<p className={extra.small}>Manual risk recordable only. Planned loss is not a guaranteed worst-case cap.</p>}</div>
      :attempt?<><h3>{attempt.decision==='PLAN'?'MANUAL PLAN':attempt.decision} · not recorded</h3><ul className={extra.errorList}>{uniqueErrors.slice(0,8).map(i=><li key={`${i.field}:${i.code}`}><a href={`#desk-${target(i)}`}>{issueMessage(i)}</a></li>)}</ul>{uniqueErrors.length>8&&<details><summary>All field-level reasons ({uniqueErrors.length})</summary><ul className={extra.errorList}>{uniqueErrors.map(i=><li key={`${i.field}:${i.code}`}>{issueMessage(i)}</li>)}</ul></details>}{!uniqueErrors.length&&<p>Could not create a decision record. Nothing is assumed successful.</p>}</>:<p>{notice}</p>}
    </section><button className={styles.clear} type="button" onClick={reset}>Clear draft</button>
   </section>
   <RiskPreview evaluation={evaluation}/>
  </div></div><p className={styles.footer}>Manual decision support only. Source evidence, risk assumptions and execution are separate. Existing private controls are unchanged. No trading, wallet, telemetry or saved journal.</p>
 </main>;
}
