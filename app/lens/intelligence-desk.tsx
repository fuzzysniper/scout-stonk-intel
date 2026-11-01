'use client';
import {useEffect,useState} from 'react';
import type {RiskFinding} from '../../lib/v4-owner-preview/view-contract';
import {PILLARS,TONES,availableFindings,counts,evidenceKind,findingClockLabel,nextVerification,prioritize,riskDisplay,whyItMatters,type Pillar,type LensView} from './intelligence-model';
import styles from './ca-view.module.css';
import {farmDetail,type FarmDisclosure,type EvidenceJson} from './evidence-disclosure';
import {decisionBrief,briefFindingTitle} from './decision-brief';
import {validNativeDetails,type NativeAccountDetails} from './native-session';
import {observedMintFor,type OracleEvidence} from './oracle-evidence';
import {CLAIMS,testClaim,type ClaimId,type ClaimReference} from './claim-check';
import {oracleTake,type TakePart,type TakeReference} from './take-model';

const time=(raw:string|null)=>raw?new Date(raw).toLocaleString():null;
function Finding({finding:f,detail,compact=false,evidence,claim,takeReference}:{finding:RiskFinding;detail?:EvidenceJson;compact?:boolean;evidence?:OracleEvidence;claim?:ClaimReference;takeReference?:ClaimReference}) {
  const reference=claim??takeReference;
  const observed=observedMintFor(evidence,f),reported=evidenceKind(f),kind=observed?(f.tone==='gray'?'Solana RPC OBSERVED · check unresolved':'Solana RPC OBSERVED · snapshot'):reported==='Jupiter reported'&&f.id==='concentration'?'Jupiter REPORTED · derived screen':reported==='Jupiter reported'&&f.id==='organic'?'Jupiter REPORTED · provider-derived score':reported;
  return <details className={styles.finding} data-tone={f.tone} data-finding-id={reference?undefined:f.id} data-claim-finding-id={claim?f.id:undefined} data-take-finding-id={takeReference?f.id:undefined} data-compact={compact} open={takeReference?true:undefined}>
    <summary>
      <span className={styles.findingMeta}><span>{f.tone==='gray'?'UNKNOWN':f.tone.toUpperCase()}</span><span>{PILLARS.find(p=>p.id===f.pillar)?.name}</span></span>
      <span className={styles.findingTitle}>{compact?briefFindingTitle(f):f.title}</span>
      {f.value!==null||!compact?<strong>{riskDisplay(f)}</strong>:null}
      {!compact?<span className={styles.findingWhy}>{whyItMatters(f)}</span>:null}
      <span className={styles.findingOpen}>{kind} <span aria-hidden="true">·</span> Evidence &amp; next check</span>
    </summary>
    <div className={styles.evidence}>
      <h4>Why this matters</h4><p>{f.explanation}</p>
      <h4>What to verify next</h4><p>{nextVerification(f)}</p>
      <h4>Source evidence</h4>
      <dl>
        {reference?<><dt>Exact finding / current use</dt><dd><code>{f.id}</code>{reference.current?'Within the display window; source scope still applies.':'Historical or incomplete reference; no current conclusion.'}</dd><dt>Matching response received</dt><dd><code>{reference.receivedAt??'No separate receipt clock returned'}</code></dd></>:null}
        <dt>Evidence type</dt><dd>{kind}. A report or calculation is not an independent safety certification.</dd>
        <dt>Source</dt><dd>{f.source??'Unavailable. No positive conclusion has been made.'}</dd>
        <dt>Exact returned value</dt><dd><code>{f.value??'Not observed'}</code></dd>
        <dt>Source field</dt><dd><code>{f.fieldPath??'No field was observed'}</code></dd>
        <dt>{findingClockLabel(f)}</dt><dd>{f.observedAt?<><time dateTime={f.observedAt}>{time(f.observedAt)}</time><code>{f.observedAt}</code></>:'Unknown; receipt time is not substituted.'}</dd>
        <dt>Response SHA-256</dt><dd><code>{f.responseSha256??'Unavailable; no source receipt for this finding.'}</code></dd>
      </dl>
      {observed?<dl><dt>Exact observed account / owner program</dt><dd><code>{observed.account}</code><code>{observed.program}</code></dd><dt>RPC-reported context slot · not a clock</dt><dd>{observed.contextSlot}. Requested finalized; not independent chain replay or account-change time.</dd><dt>Original request / account-byte SHA-256</dt><dd><code>{observed.requestSha256}</code><code>{observed.accountDataSha256}</code></dd><dt>Request started / response received</dt><dd><code>{observed.requestStartedAt}</code><code>{observed.receivedAt}</code></dd></dl>:null}
      {detail!==undefined?<><h4>Calculation inputs &amp; source references</h4><p>Declared records retain their original source and clock hashes, slots, transaction references, coverage and exact raw ratios. These references are not independently authenticated by the browser or this calculation.</p><pre className={styles.rawEvidence} tabIndex={0} role="region" aria-label="Calculation evidence JSON">{JSON.stringify(detail,null,2)}</pre></>:null}
      <p>Jupiter clocks describe the provider record update, not every metric or event. Onchain capture receipts are not block time or account-change time. Farming source/context clocks retain their independent clock-record references. Exact units, coverage and uncertainty remain material.</p>
    </div>
  </details>;
}

function Findings({items,farmEvidence,evidence}:{items:readonly RiskFinding[];farmEvidence?:FarmDisclosure;evidence?:OracleEvidence}) {
  return <div className={styles.findings}>{items.map(f=><Finding key={f.id} finding={f} detail={farmDetail(farmEvidence,f.id)} evidence={evidence}/>)}</div>;
}

function TakeEvidence({reference:r,view}:{reference:TakeReference;view:LensView}){
 if(r.kind==='finding')return <Finding finding={r.reference.finding} evidence={view.oracleEvidence} detail={farmDetail(view.farmEvidence,r.reference.finding.id)} takeReference={r.reference}/>;
 const f=r.fact;return <div className={styles.evidence} data-take-fact-id={f.id}><dl><dt>Exact fact / current use</dt><dd><code>{f.id}</code>{r.current?'Within the display window; provider report only.':'Historical or incomplete reference; no current thesis.'}</dd><dt>Source / field</dt><dd>{f.source??'Unavailable'}<code>{f.path??'No field returned'}</code></dd><dt>Exact returned value / units</dt><dd><code>{f.value??'Not observed'}</code>{f.unit}</dd><dt>Provider record update / response received</dt><dd><code>{f.observedAt??'Unknown'}</code><code>{f.receivedAt??'Unknown'}</code></dd><dt>Response SHA-256</dt><dd><code>{f.responseSha256??'Unavailable'}</code></dd><dt>Scope and uncertainty</dt><dd>{f.reason}</dd></dl><p>Transactions are not unique people, capital flows or independently verified organic demand. Provider record time is not a metric-specific clock or exact window cutoff. Liquidity is not exit capacity.</p></div>;
}
function Take({view,withheld}:{view:LensView;withheld:boolean}){
 const [,refresh]=useState(0),take=oracleTake(view,Date.now(),withheld);
 useEffect(()=>{const update=()=>refresh(n=>n+1),timer=take.validUntil===null?undefined:setTimeout(update,Math.max(0,take.validUntil-Date.now()));document.addEventListener('visibilitychange',update);window.addEventListener('pageshow',update);return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',update);window.removeEventListener('pageshow',update);};},[take.validUntil]);
 const clock=(s:string|null)=>s?new Date(s).toISOString().slice(11,19)+'Z':'unknown';
 const row=(id:string,title:string,part:TakePart)=><details key={id} data-take-part={id} data-tone={part.tone} className={styles.takeRow}><summary><span>{title}</span><strong>{part.text}</strong><small>Evidence &amp; limits · open</small></summary><div>{part.references.length?part.references.map((r,i)=><TakeEvidence key={i} reference={r} view={view}/>):<p className={styles.muted}>No current source receipt supports a thesis. Nothing has been inferred.</p>}</div></details>;
 return <section className={styles.take} data-oracle-take aria-label="Oracle take">
  {take.test?<p className={styles.takeTest}>LOCAL / SYNTHETIC OR REPLAY · NOT LIVE</p>:null}
  <p className={styles.takeFreshness}>{take.withheld?'Thesis withheld after STOP request':take.sourceOff?'Source OFF · no current receipt':take.freshness?`${take.freshness.native?(take.test?'TEST capture':'RPC capture'):'Jupiter record'} ${clock(take.freshness.observedAt)} · received ${clock(take.freshness.receivedAt)}`:'No current supporting receipt'}</p>
  {row('take','THE TAKE',take.take)}{row('breaks','WHAT BREAKS IT',take.breaks)}{row('why','WHY IT COULD RUN',take.why)}{row('unknown',"WHAT’S UNPROVEN",take.unknown)}
 </section>;
}

function ClaimCheck({view}:{view:LensView}){
 const [open,setOpen]=useState(false),[selected,setSelected]=useState<ClaimId>('mint-authority'),[,refresh]=useState(0);
 const claim=testClaim(view,selected);
 const references=prioritize(claim.references.map(r=>r.finding)).map(f=>claim.references.find(r=>r.finding===f)!);
 useEffect(()=>{
  if(!open)return;const update=()=>refresh(n=>n+1);
  const timer=claim.validUntil===null?undefined:setTimeout(update,Math.max(0,claim.validUntil-Date.now()));
  document.addEventListener('visibilitychange',update);window.addEventListener('pageshow',update);
  return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',update);window.removeEventListener('pageshow',update);};
 },[open,claim.validUntil]);
 return <details data-claim-check className={styles.claimCheck} open={open} onToggle={e=>setOpen(e.currentTarget.open)}>
  <summary>Test the claim <span>Use this inspection’s evidence</span></summary>
  {open?<div className={styles.claimBody}>
   <label htmlFor="oracle-claim">Choose a claim</label><select id="oracle-claim" className={styles.claimSelect} value={selected} onChange={e=>{const id=CLAIMS.find(c=>c.id===e.target.value)?.id;if(id)setSelected(id);}}>{CLAIMS.map(c=><option value={c.id} key={c.id}>{c.label}</option>)}</select>
   {claim.test?<p className={styles.claimTest}>LOCAL / SYNTHETIC OR REPLAY · NOT A LIVE CONCLUSION</p>:null}
   <p role="status" aria-live="polite" className={styles.claimOutcome} data-outcome={claim.outcome}>{claim.outcome}</p>
   <p>{claim.reason}</p><p className={styles.muted}>{claim.test?'Fixture scope only. ':''}{claim.scope}</p>
   <h4>Exact evidence &amp; limits</h4>
   {references.length?references.map(ref=><Finding key={ref.finding.id} finding={ref.finding} evidence={view.oracleEvidence} detail={farmDetail(view.farmEvidence,ref.finding.id)} claim={ref}/>):<p>No matching finding was returned. Nothing has been inferred.</p>}
  </div>:null}
 </details>;
}

export default function IntelligenceDesk({view,nativeDetails,takeWithheld=false}:{view:LensView;nativeDetails?:NativeAccountDetails|null;takeWithheld?:boolean}) {
  const findings=availableFindings(view),farmEvidence=view.farmEvidence,brief=decisionBrief(view);
  const [selected,setSelected]=useState<Pillar|null>(null),[expanded,setExpanded]=useState(false),sorted=prioritize(findings);
  const reds=brief.reds;
  const primaryCaution=sorted.find(f=>f.tone==='yellow');
  const relevant=sorted.filter(f=>!selected||f.pillar===selected);
  const yellows=relevant.filter(f=>f.tone==='yellow'&&f.id!==primaryCaution?.id),unknowns=relevant.filter(f=>f.tone==='gray'&&f.id!==brief.primary?.id),greens=relevant.filter(f=>f.tone==='green');
  const name=PILLARS.find(p=>p.id===selected)?.name;
  return <section className={styles.intelligence} aria-labelledby="lens-intelligence-title">
    <h2 id="lens-intelligence-title" tabIndex={-1}>UNFARMD ORACLE</h2>
    <p className={styles.intelligenceIntro}>Know what is reported. See what still needs proof.</p>
    <Take view={view} withheld={takeWithheld}/>
    <div className={styles.pillarBar} role="group" aria-label="Evidence categories">
      {PILLARS.map(p=>{const c=counts(sorted.filter(f=>f.pillar===p.id));return <button type="button" key={p.id} aria-pressed={selected===p.id} onClick={()=>{setSelected(current=>current===p.id?null:p.id);setExpanded(true);}} className={styles.pillarButton} data-has-red={c.red>0}>
        <span className={styles.pillarName}>{p.name}</span>
        <span className={styles.pillarCounts}>{TONES.filter(t=>c[t]>0).map(t=><span key={t} data-tone={t}>{c[t]} {t==='gray'?'unknown':t}</span>)}</span>
        <span className={styles.srOnly}>{p.question} {TONES.map(t=>`${c[t]} ${t}`).join(', ')}. Open evidence for this category; every red remains visible.</span>
      </button>;})}
    </div>
    {reds.length?<section className={styles.triage} aria-labelledby="critical-findings"><h3 id="critical-findings">Investigate first <span>{reds.length} red {reds.length===1?'finding':'findings'}</span></h3><Findings items={reds} farmEvidence={farmEvidence} evidence={view.oracleEvidence}/></section>:null}
    {primaryCaution?<section className={styles.triage} aria-labelledby="leading-caution"><h3 id="leading-caution">Caution to review <span>{sorted.filter(f=>f.tone==='yellow').length} yellow</span></h3><Finding finding={primaryCaution} detail={farmDetail(farmEvidence,primaryCaution.id)} compact evidence={view.oracleEvidence}/></section>:null}
    <div className={styles.decisionBrief} aria-label="Decision brief">
      <div className={styles.known}><h3>What we know</h3><details className={styles.knownSource}><summary><span className={styles.confidence}>{brief.source} · source details</span><p>{brief.known}</p><small>{brief.native?`Solana RPC OBSERVED snapshot · slot ${brief.native.contextSlot}`:`Independent RPC: ${brief.test?'test inputs, not live':'not observed in this inspection'}.`}</small></summary><div className={styles.evidence}>
        {brief.knownFindings.map(f=><dl key={f.id}><dt>{f.title} · exact returned value</dt><dd>{f.value??'Not observed'}</dd><dt>Source / field</dt><dd>{f.source??'Unavailable'} · <code>{f.fieldPath??'No source field'}</code></dd><dt>{findingClockLabel(f)}</dt><dd>{f.observedAt??'Unknown'}</dd><dt>Matching response receipt</dt><dd>{observedMintFor(view.oracleEvidence,f)?.receivedAt??view.facts.find(x=>x.responseSha256===f.responseSha256)?.receivedAt??'No separate receipt clock returned'}</dd><dt>Original response SHA-256</dt><dd><code>{f.responseSha256??'Unavailable'}</code></dd><dt>Scope</dt><dd>{f.explanation}</dd></dl>)}
        {brief.knownFacts.map(f=><dl key={f.id}><dt>{f.label} · exact returned value</dt><dd>{f.value??'Not observed'} · {f.unit}</dd><dt>Source / field</dt><dd>{f.source??'Unavailable'} · {f.path??'No source field'}</dd><dt>Provider record update / receipt</dt><dd>{f.observedAt??'Unknown'} / {f.receivedAt??'Unknown'}</dd><dt>Original response SHA-256</dt><dd><code>{f.responseSha256??'Unavailable'}</code></dd><dt>Scope</dt><dd>{f.reason}</dd></dl>)}
        {!brief.knownFindings.length&&!brief.knownFacts.length?<p>No source receipt was returned. Nothing has been inferred.</p>:null}
        <h4>Independent source qualification</h4>{brief.native?<dl><dt>Observed account / program</dt><dd><code>{brief.native.account}</code><code>{brief.native.program}</code></dd>{nativeDetails&&validNativeDetails(nativeDetails,brief.native)?<><dt>Observed raw supply / decimals</dt><dd><code>{nativeDetails.rawSupply}</code> base units · {nativeDetails.decimals} decimals. No USD value or safety inference.</dd></>:null}<dt>RPC-reported finalized context slot</dt><dd>{brief.native.contextSlot}. Slot is not UTC or the account-change time.</dd><dt>Request / receipt / evaluation</dt><dd><code>{brief.native.requestStartedAt}</code><code>{brief.native.receivedAt}</code><code>{brief.native.evaluatedAt}</code></dd><dt>Original RPC / account / request SHA-256</dt><dd><code>{brief.native.responseSha256}</code><code>{brief.native.accountDataSha256}</code><code>{brief.native.requestSha256}</code></dd></dl>:<p>No production-qualified mint observation was returned. Verified owner, source rights and durable request/STOP admission remain required; source strings, local TLS tests and replay captures are insufficient.</p>}<p>Holder sample unavailable. Its native receipt bridge and method-specific admission are not selected. Acquisition is bounded to20 token accounts; that is not full holders, unique people, beneficial ownership or an atomic snapshot. minContextSlot is only a lower bound across calls.</p><p>Provider reports and derived calculations are distinct from an authenticated independent account observation. A source hash does not establish safety.</p>
      </div></details></div>
      <ClaimCheck view={view}/>
      <section className={styles.mainUnknown} aria-labelledby="biggest-question"><h3 id="biggest-question">Biggest unanswered control</h3>{brief.primary?<Finding finding={brief.primary} detail={farmDetail(farmEvidence,brief.primary.id)} compact evidence={view.oracleEvidence}/>:<p>No unanswered check was returned. Complete coverage has not been established.</p>}</section>
      <div className={styles.nextCheck}><h3>Next verification</h3><p>{brief.next}</p></div>
      <p className={styles.questionCount}>{brief.unknownCount} unanswered {brief.unknownCount===1?'question':'questions'} · Missing evidence, not a token verdict.{!reds.length?' No red finding was returned; that does not establish safety.':''}</p>
    </div>
    <details className={styles.allEvidence} open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)}>
      <summary>All questions &amp; evidence <span>{sorted.length} findings · source details</span></summary>
      {selected?<p className={styles.filterStatus} role="status">Showing {name?.toLowerCase()}. All red and the key unanswered control remain visible. <button type="button" onClick={()=>setSelected(null)}>Show all</button></p>:null}
      {yellows.length?<section className={styles.triage} aria-labelledby="caution-findings"><h3 id="caution-findings">Cautions <span>{yellows.length} yellow</span></h3><Findings items={yellows} farmEvidence={farmEvidence} evidence={view.oracleEvidence}/></section>:null}
      {unknowns.length?<section className={styles.triage} aria-labelledby="unknown-findings"><h3 id="unknown-findings">Further unanswered questions <span>{unknowns.length} gray</span></h3><Findings items={unknowns} farmEvidence={farmEvidence} evidence={view.oracleEvidence}/></section>:null}
      {greens.length?<section className={styles.positives}><h3>{greens.length} narrow positive {greens.length===1?'finding':'findings'}</h3><p>Green never cancels red or unknown evidence.</p><Findings items={greens} farmEvidence={farmEvidence} evidence={view.oracleEvidence}/></section>:null}
    </details>
    <details className={styles.evidenceLegend}><summary>How to read the evidence</summary><p>Red: a specific serious warning, capability or source conflict; not proof of intent. Yellow: a caution or screening heuristic. Green: one narrow positive finding. Gray: missing, unsupported or incomplete evidence.</p><p>Counts describe returned findings, not independent votes or a token score. Different sources may discuss the same permission. Provider-reported, RPC-reported and derived evidence have different limits. No color guarantees sellability, genuine demand, persistent returns or token safety.</p></details>
  </section>;
}
