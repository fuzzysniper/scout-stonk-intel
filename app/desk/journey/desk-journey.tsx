'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {Decision,DecisionEvent,Issue} from '../../../lib/unfarmd-risk';
import {resolveDraftIdentity,type DeskEvaluation,type Draft,type Field} from '../integration/model';
import {emptyDraft,emptyPercentages,evaluateJourney,fieldLocation,friendlyIssue,issueField,percentFields,recordJourney,steps,type Percentages,type PercentField} from './model';
import {Control} from './controls';
import RiskSummary from './summary';
import PlanFeedback from './plan-feedback';
import {planFeedback} from './feedback';
import styles from './journey.module.css';
const groupNames=['Prices & holding','Time & exit','Your limits','Costs'];
function focusField(name:string){const field=document.getElementById(`journey-${name}`),details=field?.closest<HTMLDetailsElement>('details');if(details)details.open=true;field?.focus();}
export default function DeskJourney(){
 const [draft,setDraft]=useState<Draft>(emptyDraft),[percentages,setPercentages]=useState<Percentages>(emptyPercentages);
 const [stage,setStage]=useState(0),[riskStep,setRiskStep]=useState(0),[choice,setChoice]=useState<Decision|null>(null);
 const [correction,setCorrection]=useState<string|null>(null),[recordFailed,setRecordFailed]=useState(false);
 const focusOutcome=useRef(false);
 const [attempt,setAttempt]=useState<Issue[]|null>(null),[evaluation,setEvaluation]=useState<DeskEvaluation|null>(null),[receipt,setReceipt]=useState<DecisionEvent|null>(null);
 const heading=useRef<HTMLHeadingElement>(null),outcome=useRef<HTMLElement>(null),pendingFocus=useRef<string|null>(null),sequence=useRef(0);
 const identity=useMemo(()=>resolveDraftIdentity(draft),[draft]);
 const reset=useCallback(()=>{setDraft(emptyDraft());setPercentages(emptyPercentages());setStage(0);setRiskStep(0);setChoice(null);setAttempt(null);setEvaluation(null);setReceipt(null);setCorrection(null);setRecordFailed(false);},[]);
 useEffect(()=>{const show=(e:PageTransitionEvent)=>{if(e.persisted)reset();};window.addEventListener('pagehide',reset);window.addEventListener('pageshow',show);return()=>{window.removeEventListener('pagehide',reset);window.removeEventListener('pageshow',show);};},[reset]);
 useEffect(()=>{if(pendingFocus.current){focusField(pendingFocus.current);pendingFocus.current=null;}else heading.current?.focus();},[stage,riskStep]);
 useEffect(()=>{if(focusOutcome.current){outcome.current?.focus({preventScroll:true});outcome.current?.scrollIntoView({block:'start',behavior:'instant'});focusOutcome.current=false;}},[attempt,receipt]);
 useEffect(()=>{
  if(stage!==3||choice!=='PLAN'||receipt)return;
  const refresh=()=>{const next=evaluateJourney(draft,percentages,new Date().toISOString());if(!next.recordable&&document.activeElement?.id==='journey-record-plan'){focusOutcome.current=true;setAttempt(next.issues);}setEvaluation(next);};
  const visible=()=>{if(document.visibilityState==='visible')refresh();};
  refresh();const timer=window.setInterval(refresh,1000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);
  return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible);};
 },[stage,choice,receipt,draft,percentages]);
 function go(next:number,decision?:Decision){
  setCorrection(null);setStage(next);if(decision){setChoice(decision);setReceipt(null);}setAttempt(null);
  if(next===3)setEvaluation(evaluateJourney(draft,percentages,new Date().toISOString()));
  if(next===stage){if(pendingFocus.current){focusField(pendingFocus.current);pendingFocus.current=null;}else heading.current?.focus();}
 }
 function change(name:string,value:string){
  const isPercent=(percentFields as readonly string[]).includes(name),next={...draft,...(!isPercent?{[name]:value}:{}),confirmed:false,...(['costMode','entryFee','exitFee','entrySlip','exitSlip','fixed'].includes(name)?{costConfirmed:false}:{})};
  const nextPercentages=isPercent?{...percentages,[name]:value}:percentages;
  setDraft(next);if(isPercent)setPercentages(nextPercentages);
  setReceipt(null);setAttempt(null);setRecordFailed(false);setEvaluation(stage===3?evaluateJourney(next,nextPercentages,new Date().toISOString()):null);
 }
 function confirm(name:'confirmed'|'costConfirmed',value:boolean){const next={...draft,[name]:value};setDraft(next);setReceipt(null);setAttempt(null);setRecordFailed(false);setEvaluation(evaluateJourney(next,percentages,new Date().toISOString()));}
 function checkPlan(){
  const next=evaluateJourney(draft,percentages,new Date().toISOString());focusOutcome.current=true;setEvaluation(next);setAttempt(next.issues);setReceipt(null);setRecordFailed(false);
 }
 function record(){
  if(!choice)return;
  const result=recordJourney(draft,percentages,choice,new Date().toISOString(),`session-decision-${++sequence.current}`);
  focusOutcome.current=true;setAttempt(result.evaluation.issues);setEvaluation(result.evaluation);setReceipt(result.event);setRecordFailed(!result.event&&result.evaluation.recordable);
 }
 const feedback=planFeedback(evaluation,draft,percentages),planReady=Boolean(evaluation?.recordable&&evaluation.risk.calculation&&!recordFailed);
 function nextMissing(){
  focusOutcome.current=false;
  if(!feedback.next){const details=document.getElementById('journey-all-issues') as HTMLDetailsElement|null;if(details)details.open=true;document.getElementById('journey-issue-details')?.focus();return;}
  const field=feedback.next.field,location=fieldLocation(field);pendingFocus.current=field;setAttempt(evaluation?.issues??null);
  setCorrection(location.stage===3?null:field);setStage(location.stage);setRiskStep(location.riskStep);
  if(stage===location.stage&&riskStep===location.riskStep){focusField(field);pendingFocus.current=null;}
 }
 function returnToDecision(){pendingFocus.current='plan-feedback';go(3);}
 function fixIssue(issue:Issue){
  focusOutcome.current=false;const field=issueField(issue),location=fieldLocation(field);pendingFocus.current=field;setStage(location.stage);setRiskStep(location.riskStep);
  if(stage===location.stage&&riskStep===location.riskStep){focusField(field);pendingFocus.current=null;}
 }
 const errors=(attempt??[]).filter(issue=>issue.severity==='error').filter((issue,index,all)=>all.findIndex(other=>other.field===issue.field&&other.code===issue.code)===index);
 const field=(name:Field,label:string,help?:string,options?:readonly (readonly [string,string])[],rows?:number,mode?:'decimal'|'numeric',type?:'datetime-local')=><Control key={name} {...{name,label,help,options,rows,mode,type,change}} value={(percentFields as readonly string[]).includes(name)?percentages[name as PercentField]:draft[name]} issues={attempt??[]}/>;
 const price=(name:Field,label:string,help?:string)=>field(name,label,help,undefined,undefined,'decimal');
 const nextRisk=()=>{if(riskStep===3)go(3);else setRiskStep(current=>current+1);};
 const identityText=identity.state==='exact_identifier'?'Format recognized · asset not verified':identity.state==='invalid'||identity.state==='conflicting_hints'?'Asset details need review · not verified':'Asset unresolved · not verified';
 const titles=['What are you considering?','Why might this work?',groupNames[riskStep],'Is this worth taking?'];
 return <main id="scout-content" className={styles.desk}>
  <a className={styles.skip} href="#journey-stage">Skip to current step</a>
  <header className={styles.header}><span className={styles.brand}>UNFARMD<span> / Decision Desk</span></span><button type="button" className={styles.quiet} onClick={()=>go(3,'PASS')}>PASS</button></header>
  <nav aria-label="Decision progress" className={styles.progress}><ol>{steps.map((name,index)=><li key={name}><button type="button" aria-current={stage===index?'step':undefined} onClick={()=>go(index)}><span className={styles.number}>{index+1}</span>{name}</button></li>)}</ol></nav>
  <div className={styles.status}><p>Market data not connected; manual planning available.</p><p>{identityText}</p></div>
  <section className={styles.card} aria-labelledby="journey-stage">
   <p className={styles.kicker}>STEP {stage+1} OF 4{stage===2?` · ${riskStep+1} OF 4 RISK CHECKS`:''}</p>
   <h1 ref={heading} id="journey-stage" tabIndex={-1}>{titles[stage]}</h1>
   {correction&&stage!==3&&<aside className={styles.correction}><p>Your other inputs are kept in this session.</p><button type="button" onClick={returnToDecision}>Back to decision</button></aside>}
   {stage===0?<>
    <p className={styles.intro}>Trade the thesis. Not the dopamine.</p>
    {field('asset','Ticker, token address or asset name','Your entry stays unverified. No lookup runs.')}
    <div className={styles.entries}>
     <button type="button" className={styles.primary} onClick={()=>go(1)}><strong>Research</strong><span>Think through both sides</span></button>
     <button type="button" onClick={()=>go(1,'PLAN')}><strong>Plan</strong><span>Work out your risk</span></button>
     <button type="button" onClick={()=>go(3,'WATCH')}><strong>Watch</strong><span>Wait for more information</span></button>
    </div>
    <details><summary>Add chain or listing details · optional</summary>
     {field('kind','What kind of reference is this?',undefined,[['unknown','Ticker / unresolved'],['solana_mint','Solana token address'],['evm_token','EVM token address'],['listed_equity','Equity listing']])}
     {draft.kind==='solana_mint'&&field('chain','Which Solana network?',undefined,[['solana:mainnet','Mainnet'],['solana:devnet','Devnet'],['solana:testnet','Testnet']])}
     {draft.kind==='evm_token'&&field('chain','Chain ID','Enter the explicit numeric chain ID. No network is inferred.',undefined,undefined,'numeric')}
     {draft.kind==='listed_equity'&&field('mic','Market identifier','Four-character MIC, such as your listing market’s code. No listing lookup runs.')}
    </details>
   </>:stage===1?<>
    {field('thesis','Why might it work?',undefined,undefined,3)}
    {field('counterThesis','What could go wrong?',undefined,undefined,3)}
    {field('unknowns','What do you still not know?','One unknown per line.',undefined,2)}
    <details><summary>Research notes · optional</summary>{field('notes','Your notes or references','Your assertions only. Links are not opened.',undefined,3)}</details>
    {field('purpose','Why are you considering it?',undefined,[['invest','Longer-term investment'],['swing','Shorter-term holding'],['speculative','Speculation']])}
    {field('horizon','How long would you hold it?','Include when you would review your thinking.')}
    <div className={styles.navigation}><button type="button" onClick={()=>go(0)}>Back</button><button type="button" className={styles.primary} onClick={()=>go(2)}>Next: risk</button></div>
    <button type="button" className={styles.textButton} onClick={()=>go(3,'WATCH')}>Not ready to plan? Decide for now</button>
   </>:stage===2?<>
    <p className={styles.help}>Only enter your own assumptions. Leave what you do not know blank.</p>
    <nav className={styles.riskProgress} aria-label="Risk checks">{groupNames.map((name,index)=><button type="button" key={name} aria-current={index===riskStep?'step':undefined} onClick={()=>setRiskStep(index)}>{index+1}<span className={styles.srOnly}> {name}</span></button>)}</nav>
    {riskStep===0?<>
     {field('instrument','What type of holding?',undefined,[['long_spot','Unleveraged long holding'],['unsupported','Something else · unavailable']])}
     {field('currency','What currency are your assumptions in?','Only USD is supported. No conversion or stablecoin peg is assumed.',[['USD','USD'],['OTHER','Another currency · unavailable']])}
     {price('entry','Your assumed entry price · USD','Not a live quote. Up to 9 decimal places.')}{price('stop','Your exit price if wrong · USD','Positive and below entry. This does not place an order.')}
    </>:riskStep===1?<>
     {field('asOfUtc','When did you make this price assumption?','Enter UTC, not local time. No time is filled in for you.',undefined,undefined,undefined,'datetime-local')}
     {field('validSeconds','How long is that assumption usable?','Whole seconds, 1 to 604800. It will be checked again when you record.',undefined,undefined,'numeric')}
     {field('invalidation','What would make you walk away?','Describe your exit rationale and what might prevent it.',undefined,3)}
    </>:riskStep===2?<>
     {price('capital','Total reference capital · USD','Your planning base, not a connected account. Money allows at most 2 decimals.')}
     {price('cash','Cash available now · USD','Enter 0 only if you mean none.')}
     {price('existing','Already exposed to this asset · USD','Enter 0 only if you mean none.')}
     {price('loss','Maximum loss you want to plan for · USD')}
     {price('allocationBps','Maximum share of capital in this asset · %','0 to 100%; up to 2 decimal places. Includes existing exposure.')}
     <details><summary>Choose a quantity · optional</summary>{price('units','Quantity you are considering','Leave blank for a calculated ceiling only. Up to 9 decimal places.')}</details>
    </>:<>
     {field('costMode','How will you handle costs?',undefined,[['explicit','Enter my fee and slippage assumptions'],['omitted','Leave costs unestimated · acknowledge the gap']])}
     {draft.costMode==='explicit'?<>
      <p className={styles.help}>Enter every assumption explicitly, including genuine zero. Percentages allow up to 2 decimal places.</p>
      <div className={styles.pairs}>{price('entryFee','Entry fee · %')}{price('exitFee','Exit fee · %')}{price('entrySlip','Entry slippage · %')}{price('exitSlip','Exit slippage · %')}</div>
      {price('fixed','Fixed cost for entry and exit together · USD','Reserved once, not twice. Up to 2 decimal places.')}
     </>:<p className={styles.help}>Omitted costs will stay unestimated; they are not treated as known zero.</p>}
    </>}
    <div className={styles.navigation}><button type="button" onClick={()=>riskStep?setRiskStep(current=>current-1):go(1)}>Back</button><button type="button" className={styles.primary} onClick={nextRisk}>{riskStep===3?'Next: decide':'Next risk check'}</button></div>
   </>:<>
    {receipt?<section ref={outcome} tabIndex={-1} aria-label="Decision outcome" aria-live="polite" className={styles.receipt}>
     <h2>{receipt.plan.decision==='PLAN'?'MANUAL PLAN':receipt.plan.decision} · recorded for this session</h2>
     {receipt.plan.asset&&<p className={styles.asset}>{receipt.plan.asset.label}<span>Your unverified asset reference</span></p>}
     <p>Not saved or executed. Asset and source remain unverified.</p><blockquote>{receipt.plan.reason}</blockquote>
     {receipt.plan.decision==='PLAN'&&<RiskSummary evaluation={evaluation}/>}
     {receipt.plan.decision!=='PLAN'&&<p className={styles.help}>Only your reason{receipt.plan.decision==='WATCH'?' and research':''} is recorded. Unfinished risk inputs are not approved.</p>}
    </section>:<>
     <p className={styles.asset}>{draft.asset||'No asset entered'} <span>· your unverified reference</span></p>
     <div className={styles.choices} role="group" aria-label="Choose a decision">{(['PLAN','WATCH','PASS'] as const).map(decision=><button type="button" key={decision} aria-pressed={choice===decision} onClick={()=>{setChoice(decision);setAttempt(null);setRecordFailed(false);setEvaluation(decision==='PLAN'?evaluateJourney(draft,percentages,new Date().toISOString()):null);}}>{decision}</button>)}</div>
     {choice==='PLAN'?<>
      <PlanFeedback {...{feedback,checked:attempt!==null,ready:planReady,failed:recordFailed}} onNext={nextMissing} onCheck={checkPlan} feedbackRef={outcome}/>
      <details><summary>Your thesis at a glance</summary><dl className={styles.metrics}><div><dt>Why it might work</dt><dd>{draft.thesis||'Not entered'}</dd></div><div><dt>What could go wrong</dt><dd>{draft.counterThesis||'Not entered'}</dd></div><div><dt>Unknowns</dt><dd>{draft.unknowns||'Not entered'}</dd></div><div><dt>When to walk away</dt><dd>{draft.invalidation||'Not entered'}</dd></div></dl></details>
      {planReady?<RiskSummary evaluation={evaluation}/>:evaluation?.risk.calculation?<details><summary>Review current risk calculation</summary><RiskSummary evaluation={evaluation}/></details>:null}
     </>:<p className={styles.help}>{choice==='PASS'?'Walking away is a complete decision. A written reason is all you need.':choice==='WATCH'?'You can wait with incomplete information. Write what you are waiting for.':'Choose a decision. Nothing is selected for you.'}</p>}
     {choice==='PLAN'?<details className={styles.decisionInputs}><summary>Your reason &amp; acknowledgements</summary>
      {field('reason','Why this decision?',undefined,undefined,3)}
      <label className={styles.check}><input id="journey-costConfirmed" type="checkbox" checked={draft.costConfirmed} onChange={e=>confirm('costConfirmed',e.target.checked)}/><span>I acknowledge my {draft.costMode==='omitted'?'unestimated':'entered'} costs; actual costs can differ.</span></label>
      <label className={styles.check}><input id="journey-confirmed" type="checkbox" checked={draft.confirmed} onChange={e=>confirm('confirmed',e.target.checked)}/><span>These are my own assumptions. I understand loss can exceed the plan and nothing is executed.</span></label>
     </details>:field('reason',choice==='PASS'?'Why pass?':choice==='WATCH'?'What are you waiting for?':'Why this decision?',undefined,undefined,3)}
     {(choice!=='PLAN'||planReady)&&<button type="button" id={choice==='PLAN'?'journey-record-plan':undefined} className={styles.primary} disabled={!choice} onClick={record}>{choice?`Record ${choice==='PLAN'?'MANUAL PLAN':choice}`:'Choose PLAN, WATCH or PASS'}</button>}
     {choice!=='PLAN'&&<section ref={outcome} tabIndex={-1} aria-label="Decision outcome" aria-live="polite" className={styles.blockers}>
      {attempt?<><h2>Not recorded yet</h2>{errors.length?<ul>{errors.map(issue=><li key={`${issue.field}:${issue.code}`}><button type="button" onClick={()=>fixIssue(issue)}>{friendlyIssue(issue)}</button></li>)}</ul>:<p>The record could not be created. Review your inputs.</p>}</>:null}
     </section>}
    </>}
    {choice==='PLAN'&&<p className={styles.warning}>Actual loss may exceed planned loss. A stop is not an order or a guaranteed exit.</p>}
    <div className={styles.navigation}><button type="button" onClick={()=>go(choice==='PLAN'?2:0)}>Back to {choice==='PLAN'?'risk':'consider'}</button>{receipt&&<button type="button" onClick={()=>{setReceipt(null);setAttempt(null);}}>Review / edit</button>}</div>
   </>}
  </section>
  <footer className={styles.footer}><p>Session only · not saved. Refreshing or closing clears your draft.</p><details><summary>Sources, privacy & limitations</summary><p>No market source, account, wallet or order is connected. Your notes and prices are unverified assumptions. No source facts are admitted; observation time is unavailable.</p><p>Identity formatting is not proof of existence, ownership or safety. {identity.reasons.map(reason=>reason.replaceAll('_',' ')).join(' · ')}.</p><code>{identity.asset.assetKey??'No resolved asset identity'}</code><p>Data acquisition remains off. No durable journal, tracking or application storage. Browser restoration is not secure erasure; clear shared devices before leaving. Existing private operations are separate.</p></details><button type="button" className={styles.textButton} onClick={reset}>Clear this session</button></footer>
 </main>;
}
