'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {Decision,DecisionEvent,Issue} from '../../../lib/unfarmd-risk';
import {utcAssumption,type Draft,type Field} from '../integration/model';
import {emptyDraft,emptyPercentages,evaluateJourney,percentFields,recordJourney,type PercentField} from './model';
import {planFeedback,feedbackMessage} from './feedback';
import {captureTime,durations,fieldForIssue,fieldsFor,nextScreen,questions,screenFor,type Screen} from './sequence';
import GuidedField from './guided-field';
import RiskSummary from './summary';
import styles from './guided.module.css';
export default function GuidedDesk(){
 const [draft,setDraft]=useState<Draft>(emptyDraft),[percentages,setPercentages]=useState(emptyPercentages);
 const [screen,setScreen]=useState<Screen>('idea'),[history,setHistory]=useState<Screen[]>([]),[planning,setPlanning]=useState(false);
 const [decision,setDecision]=useState<Decision|null>(null),[receipt,setReceipt]=useState<DecisionEvent|null>(null);
 const [issues,setIssues]=useState<Issue[]>([]),[clock,setClock]=useState(()=>new Date().toISOString());
 const [customDuration,setCustomDuration]=useState(false),[correcting,setCorrecting]=useState(false),[failed,setFailed]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null),outcome=useRef<HTMLElement>(null),readiness=useRef<HTMLElement>(null),focus=useRef<string|null>(null),serial=useRef(0);
 const evaluation=useMemo(()=>evaluateJourney(draft,percentages,clock),[draft,percentages,clock]);
 const feedback=planFeedback(evaluation,draft,percentages),ready=evaluation.recordable&&!!evaluation.risk.calculation&&!failed;
 const title=questions.find(q=>q.id===screen)!.title;
 function reset(){setDraft(emptyDraft());setPercentages(emptyPercentages());setScreen('idea');setHistory([]);setPlanning(false);setDecision(null);setReceipt(null);setIssues([]);setCustomDuration(false);setCorrecting(false);setFailed(false);setClock(new Date().toISOString());focus.current='journey-title';}
 useEffect(()=>{const hide=()=>reset(),show=(event:PageTransitionEvent)=>{if(event.persisted)reset();};window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);return()=>{window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);};},[]);
 useEffect(()=>{
  const target=focus.current?document.getElementById(focus.current):receipt?outcome.current:heading.current;
  if(target){const details=target.closest('details');if(details)details.open=true;target.focus({preventScroll:true});target.scrollIntoView({block:'start'});}focus.current=null;
 },[screen,receipt]);
 useEffect(()=>{if(!focus.current)return;const target=document.getElementById(focus.current);if(target){const details=target.closest('details');if(details)details.open=true;target.focus({preventScroll:true});target.scrollIntoView({block:'start'});}focus.current=null;},[issues]);
 useEffect(()=>{
  if(screen!=='review'||receipt)return;
  const tick=()=>{const at=new Date().toISOString();if(!evaluateJourney(draft,percentages,at).recordable&&document.activeElement?.id==='journey-save-plan'){focus.current='journey-readiness';setIssues(evaluateJourney(draft,percentages,at).issues);}setClock(at);};tick();const timer=window.setInterval(tick,1000);
  const visible=()=>{if(document.visibilityState==='visible')tick();};window.addEventListener('focus',tick);document.addEventListener('visibilitychange',visible);
  return()=>{window.clearInterval(timer);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',visible);};
 },[screen,receipt,draft,percentages]);
 useEffect(()=>{if(screen==='review'&&!ready&&document.activeElement?.id==='journey-save-plan'){readiness.current?.focus();readiness.current?.scrollIntoView({block:'start'});}},[screen,ready]);
 function go(next:Screen){setHistory(h=>[...h,screen]);setScreen(next);setIssues([]);setClock(new Date().toISOString());}
 function back(){const previous=history.at(-1);if(previous){setHistory(h=>h.slice(0,-1));setScreen(previous);setIssues([]);setReceipt(null);setCorrecting(false);}}
 function change(name:string,value:string){
  if((percentFields as readonly string[]).includes(name))setPercentages(p=>({...p,[name]:value}));
  setDraft(d=>({...d,...(!(percentFields as readonly string[]).includes(name)?{[name]:value}:{}),confirmed:false,...(['costMode','entryFee','exitFee','entrySlip','exitSlip','fixed'].includes(name)?{costConfirmed:false}:{})}));
  setReceipt(null);setIssues([]);setFailed(false);setClock(new Date().toISOString());
 }
 function affirm(name:'confirmed'|'costConfirmed',value:boolean){setDraft(d=>({...d,[name]:value}));setIssues([]);setFailed(false);setClock(new Date().toISOString());}
 function validateStep(){
  const current=evaluateJourney(draft,percentages,new Date().toISOString());
  const errors=current.issues.filter(i=>i.severity==='error'&&i.code!=='missing_or_unknown_fields'&&!(screen==='time'&&!draft.validSeconds&&['entry_required','invalid_reference_clock_or_window'].includes(i.code))&&fieldsFor(screen).includes(fieldForIssue(i))&&!(screen==='costs'&&i.field==='costs'&&draft.costMode==='explicit'));
  if(screen==='holding'&&draft.instrument&&draft.instrument!=='long_spot')errors.push({field:'instrument',code:'unsupported_instrument_or_currency',severity:'error'});
  if(screen==='currency'&&draft.currency&&draft.currency!=='USD')errors.push({field:'currency',code:'unsupported_instrument_or_currency',severity:'error'});
  if(errors.length){focus.current=`journey-${fieldForIssue(errors[0])==='validSeconds'&&!customDuration?'duration':fieldForIssue(errors[0])}`;setIssues(errors);return false;}return true;
 }
 function advance(){
  if(screen==='idea'){go(draft.asset.trim()?'thesis':planning?'thesis':'decision');return;}
  if(!planning&&['thesis','against','unknown'].includes(screen)){go(screen==='unknown'?'decision':nextScreen(screen,false));return;}
  if(!validateStep())return;
  if(correcting){setCorrecting(false);focus.current='journey-readiness';go('review');return;}
  go(screen==='unknown'?'purpose':nextScreen(screen,draft.costMode==='omitted'));
 }
 function buildPlan(){
  setPlanning(true);setDecision('PLAN');setCorrecting(false);
  const first=['asset','thesis','counterThesis','unknowns'].find(name=>!draft[name as Field].trim());
  go(first?screenFor(first):'purpose');
 }
 function choose(choice:'WATCH'|'PASS'){setDecision(choice);setCorrecting(false);go(choice==='WATCH'?'watch':'pass');}
 function save(){
  if(!decision)return;
  const at=new Date().toISOString(),result=recordJourney(draft,percentages,decision,at,`session-${++serial.current}`);
  setClock(at);setIssues(result.evaluation.issues);setReceipt(result.event);setFailed(!result.event);
  if(!result.event)focus.current=decision==='PLAN'?'journey-readiness':'journey-reason';
 }
 function correct(){
  if(!feedback.next)return;const field=feedback.next.field;
  focus.current=`journey-${field==='validSeconds'&&!customDuration?'duration':field}`;setCorrecting(true);go(screenFor(field));setIssues(evaluation.issues);
 }
 function useNow(){const now=new Date(),captured=captureTime(now);if(captured){change('asOfUtc',captured);setClock(captured);}else{setIssues([{field:'asOfUtc',code:'invalid_reference_clock_or_window',severity:'error'}]);}}
 const field=(name:Field,label:string,help?:string,options?:readonly (readonly [string,string])[],rows?:number,numeric?:boolean)=><GuidedField key={name} {...{name,label,help,options,rows,numeric,change,issues}} value={(percentFields as readonly string[]).includes(name)?percentages[name as PercentField]:draft[name]}/>;
 const time=(()=>{const date=new Date(utcAssumption(draft.asOfUtc));return Number.isFinite(date.getTime())?date:null;})();
 const intro=screen==='idea',short=screen==='watch'||screen==='pass',review=screen==='review';
 return <main id="scout-content" className={styles.desk}>
  <a href="#journey-title" className={styles.skip}>Skip to question</a>
  <header className={styles.header}><div className={styles.brand}>UNFARMD<span>Decision Desk</span></div></header>
  <p className={styles.step}>{receipt?'YOUR DECISION':planning&&!short&&screen!=='decision'?'BUILD A MANUAL PLAN':intro?'A LITTLE SPACE TO THINK':screen==='decision'||short?'DECIDE FOR NOW':`YOUR IDEA · ${['thesis','against','unknown'].indexOf(screen)+1} OF 3`}</p>
  <h1 id="journey-title" ref={heading} tabIndex={-1}>{receipt?decision==='PLAN'?'Your manual plan':decision==='WATCH'?'Watch for now':'You can walk away':title}</h1>
  {receipt?<section ref={outcome} className={styles.outcome} tabIndex={-1} aria-label="Decision outcome">
   <p>{decision==='WATCH'?'You are waiting for more information.':decision==='PASS'?'Passing is a complete decision.':'Your inputs passed the manual checks.'}</p>
   <p><strong>For this session only — not saved, not executed.</strong></p>
   {receipt.plan.asset&&<p>{receipt.plan.asset.label} · unverified reference</p>}
   <blockquote>{receipt.plan.reason}</blockquote>
   {decision==='PLAN'&&<><RiskSummary evaluation={evaluation}/><p className={styles.warning}>Actual loss can exceed planned loss. An exit price is not an order or a guarantee.</p></>}
   {decision==='WATCH'&&<p className={styles.muted}>Unfinished research and risk inputs are not approved.</p>}
   <button type="button" className={styles.quiet} onClick={()=>{setReceipt(null);setIssues([]);}}>Review this decision</button>
   <button type="button" className={styles.quiet} onClick={reset}>Clear and start again</button>
  </section>:<form onSubmit={e=>{e.preventDefault();if(short)save();else if(!review&&screen!=='decision')advance();}} noValidate>
   {intro&&<><p className={styles.intro}>Think before you trade. Start with a stock, token or an idea.</p>{field('asset','Your idea','Unverified. No lookup runs. You can leave this blank.')}</>}
   {screen==='thesis'&&field('thesis','The case for it','A short answer is enough to start.',undefined,3)}
   {screen==='against'&&field('counterThesis','The case against it','What could challenge your thinking?',undefined,3)}
   {screen==='unknown'&&field('unknowns','What you still need to learn','Missing evidence is a reason to wait.',undefined,3)}
   {screen==='decision'&&<><p className={styles.intro}>You do not need a complete plan to wait or walk away.</p><button type="button" className={styles.primary} onClick={()=>choose('WATCH')}>Watch for now</button><div className={styles.alternatives}><button type="button" className={styles.quiet} onClick={()=>choose('PASS')}>Pass on this idea</button><button type="button" className={styles.quiet} onClick={buildPlan}>Build a plan</button></div><p className={styles.hint}>A plan needs your own prices, limits and costs. It never places a trade.</p></>}
   {short&&field('reason',screen==='watch'?'What would you need to see?':'Your reason','Only your reason is needed. Nothing is sent or saved.',undefined,3)}
   {screen==='purpose'&&field('purpose','Your purpose',undefined,[['invest','Longer-term investment'],['swing','Shorter-term holding'],['speculative','Speculation']])}
   {screen==='horizon'&&field('horizon','Your holding and review horizon','For example, describe when you would review the idea. No horizon is assumed.')}
   {screen==='holding'&&field('instrument','Type of holding','This model supports unleveraged long holdings only.',[['long_spot','Unleveraged long holding'],['unsupported','Something else · unavailable']])}
   {screen==='currency'&&field('currency','Currency','Only USD is supported. No conversion or stablecoin peg is assumed.',[['USD','USD'],['OTHER','Another currency · unavailable']])}
   {screen==='prices'&&<>{field('entry','Assumed entry price · USD','Your assumption, not a live quote.',undefined,undefined,true)}{field('stop','Exit price if wrong · USD','Positive and below entry. This does not place an order.',undefined,undefined,true)}</>}
   {screen==='time'&&<>
    <p className={styles.intro}>Confirm when you made your price assumption. Using now is your choice, not a price refresh.</p>
    {time&&<p role="status" className={styles.time}>Your device time: {time.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'long'})}</p>}
    <button type="button" className={!draft.asOfUtc?styles.primary:styles.quiet} onClick={useNow}>Use current time</button>
    <details><summary>Use a different time · UTC</summary><GuidedField name="asOfUtc" label="Assumption time · UTC" value={time?time.toISOString().slice(0,23):draft.asOfUtc} change={change} type="datetime-local" help="Advanced: enter UTC, not local time. Future or expired times will be refused." issues={issues}/>{time&&<code>{time.toISOString()}</code>}</details>
    {issues.some(i=>fieldForIssue(i)==='asOfUtc')&&<p className={styles.error} role="alert">Review the assumption time above.</p>}
   </>}
   {screen==='validity'&&<><GuidedField name="duration" errorName="validSeconds" label="Assumption valid for" value={customDuration?'custom':draft.validSeconds} change={(_,value)=>{setCustomDuration(value==='custom');change('validSeconds',value==='custom'?'':value);}} options={durations} issues={customDuration?[]:issues} help="Choose a duration. Time is checked again when you save your session decision."/>{customDuration&&field('validSeconds','Custom duration · seconds','Whole seconds from 1 to 604800.',undefined,undefined,true)}</>}
   {screen==='exit'&&field('invalidation','Your reason to exit','Include what might prevent an exit. This is not a stop order.',undefined,3)}
   {screen==='capital'&&<>{field('capital','Total reference capital · USD','Your planning base, not a connected account.',undefined,undefined,true)}{field('cash','Cash available now · USD','Enter 0 only if you mean none.',undefined,undefined,true)}{field('existing','Already in this asset · USD','Existing exposure. Enter 0 only if you mean none.',undefined,undefined,true)}</>}
   {screen==='limits'&&<>{field('loss','Planned-loss budget · USD','A planning limit, not a cap on actual loss.',undefined,undefined,true)}{field('allocationBps','Maximum share in this asset · %','Includes existing exposure. Enter 20 for 20%, not 0.20.',undefined,undefined,true)}</>}
   {screen==='quantity'&&<>{field('units','Proposed quantity · optional','Leave blank for an arithmetic ceiling only. A ceiling is not a selected or recommended quantity.',undefined,undefined,true)}</>}
   {screen==='costs'&&field('costMode','Cost assumptions','Nothing is treated as known zero unless you enter it.',[['explicit','Enter fee and slippage assumptions'],['omitted','Leave costs unestimated · acknowledge the gap']])}
   {screen==='fees'&&<>{field('entryFee','Entry fee · %','Enter 0.10 for 0.10%. Enter genuine zero explicitly.',undefined,undefined,true)}{field('exitFee','Exit fee · %',undefined,undefined,undefined,true)}</>}
   {screen==='slippage'&&<>{field('entrySlip','Entry slippage · %','An assumption about price movement during execution, not observed liquidity. Enter 0.20 for 0.20%.',undefined,undefined,true)}{field('exitSlip','Exit slippage · %',undefined,undefined,undefined,true)}</>}
   {screen==='fixed'&&field('fixed','Fixed cost for entry and exit together · USD','Reserved once, not twice. Enter genuine zero explicitly.',undefined,undefined,true)}
   {review&&<>
    <p className={styles.intro}>Manual assumptions only. Asset and market source remain unverified.</p>
    {field('reason','Why make this plan?','This is a decision to keep for this session, not an instruction to trade.',undefined,3)}
    <label className={styles.check}><input id="journey-costConfirmed" type="checkbox" checked={draft.costConfirmed} onChange={e=>affirm('costConfirmed',e.target.checked)}/><span>I acknowledge my {draft.costMode==='omitted'?'unestimated':'entered'} costs; actual costs can differ.</span></label>
    <label className={styles.check}><input id="journey-confirmed" type="checkbox" checked={draft.confirmed} onChange={e=>affirm('confirmed',e.target.checked)}/><span>These are my assumptions. Actual loss can exceed the plan. Nothing is executed.</span></label>
    {!ready?<section id="journey-readiness" ref={readiness} tabIndex={-1} className={styles.notice} aria-label="Plan readiness"><h2>Not ready yet</h2><p>{failed&&evaluation.recordable?'Could not keep this plan. No decision was created.':feedback.next?feedbackMessage(feedback.next.issue):'Review your inputs. No decision was created.'}</p><button type="button" className={styles.primary} onClick={correct}>{feedback.next?'Review this answer':'Review answers'}</button></section>:<><RiskSummary evaluation={evaluation}/><p className={styles.warning}>Actual loss can exceed planned loss. An exit price is not an order or a guaranteed exit.</p><button id="journey-save-plan" type="button" className={styles.primary} onClick={save}>Keep this manual plan</button></>}
   </>}
   {short&&<button type="submit" className={styles.primary}>Keep this {screen==='watch'?'WATCH':'PASS'} for now</button>}
   {!short&&!review&&screen!=='decision'&&(screen!=='time'||draft.asOfUtc)&&<button type="submit" className={styles.primary}>{intro?'Think it through':correcting?'Return to plan':'Continue'}</button>}
   {!intro&&<button type="button" className={styles.back} onClick={back}>Back</button>}
   {!intro&&!short&&screen!=='decision'&&<button type="button" className={styles.quiet} onClick={()=>{setCorrecting(false);go('decision');}}>Decide for now instead</button>}
  </form>}
  <footer className={styles.footer}><p>For this session only — not saved, not executed.</p><p>Market sources off. Your inputs stay unverified.</p><details><summary>Privacy & limitations</summary><p>No account, wallet, market lookup, tracking or application storage is connected. Refreshing or closing clears this draft. Browser restoration is not secure erasure; clear shared devices before leaving.</p>{!intro&&<button type="button" className={styles.quiet} onClick={reset}>Clear this session</button>}</details></footer>
 </main>;
}
