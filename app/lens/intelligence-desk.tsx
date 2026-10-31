'use client';
import {useState} from 'react';
import type {RiskFinding} from '../../lib/v4-owner-preview/view-contract';
import {PILLARS,TONES,availableFindings,counts,evidenceKind,findingClockLabel,nextVerification,prioritize,riskDisplay,whyItMatters,type Pillar,type LensView} from './intelligence-model';
import styles from './ca-view.module.css';
import {farmDetail,type FarmDisclosure,type EvidenceJson} from './evidence-disclosure';
import {decisionBrief,briefFindingTitle} from './decision-brief';

const time=(raw:string|null)=>raw?new Date(raw).toLocaleString():null;
function Finding({finding:f,detail,compact=false}:{finding:RiskFinding;detail?:EvidenceJson;compact?:boolean}) {
  return <details className={styles.finding} data-tone={f.tone} data-finding-id={f.id} data-compact={compact}>
    <summary>
      <span className={styles.findingMeta}><span>{f.tone==='gray'?'UNKNOWN':f.tone.toUpperCase()}</span><span>{PILLARS.find(p=>p.id===f.pillar)?.name}</span></span>
      <span className={styles.findingTitle}>{compact?briefFindingTitle(f):f.title}</span>
      {f.value!==null||!compact?<strong>{riskDisplay(f)}</strong>:null}
      {!compact?<span className={styles.findingWhy}>{whyItMatters(f)}</span>:null}
      <span className={styles.findingOpen}>{evidenceKind(f)} <span aria-hidden="true">·</span> Evidence &amp; next check</span>
    </summary>
    <div className={styles.evidence}>
      <h4>Why this matters</h4><p>{f.explanation}</p>
      <h4>What to verify next</h4><p>{nextVerification(f)}</p>
      <h4>Source evidence</h4>
      <dl>
        <dt>Evidence type</dt><dd>{evidenceKind(f)}. A report or calculation is not an independent safety certification.</dd>
        <dt>Source</dt><dd>{f.source??'Unavailable. No positive conclusion has been made.'}</dd>
        <dt>Exact returned value</dt><dd><code>{f.value??'Not observed'}</code></dd>
        <dt>Source field</dt><dd><code>{f.fieldPath??'No field was observed'}</code></dd>
        <dt>{findingClockLabel(f)}</dt><dd>{f.observedAt?<><time dateTime={f.observedAt}>{time(f.observedAt)}</time><code>{f.observedAt}</code></>:'Unknown; receipt time is not substituted.'}</dd>
        <dt>Response SHA-256</dt><dd><code>{f.responseSha256??'Unavailable; no source receipt for this finding.'}</code></dd>
      </dl>
      {detail!==undefined?<><h4>Calculation inputs &amp; source references</h4><p>Declared records retain their original source and clock hashes, slots, transaction references, coverage and exact raw ratios. These references are not independently authenticated by the browser or this calculation.</p><pre className={styles.rawEvidence} tabIndex={0} role="region" aria-label="Calculation evidence JSON">{JSON.stringify(detail,null,2)}</pre></>:null}
      <p>Jupiter clocks describe the provider record update, not every metric or event. Onchain capture receipts are not block time or account-change time. Farming source/context clocks retain their independent clock-record references. Exact units, coverage and uncertainty remain material.</p>
    </div>
  </details>;
}

function Findings({items,farmEvidence}:{items:readonly RiskFinding[];farmEvidence?:FarmDisclosure}) {
  return <div className={styles.findings}>{items.map(f=><Finding key={f.id} finding={f} detail={farmDetail(farmEvidence,f.id)}/>)}</div>;
}

export default function IntelligenceDesk({view}:{view:LensView}) {
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
    <div className={styles.pillarBar} role="group" aria-label="Evidence categories">
      {PILLARS.map(p=>{const c=counts(sorted.filter(f=>f.pillar===p.id));return <button type="button" key={p.id} aria-pressed={selected===p.id} onClick={()=>{setSelected(current=>current===p.id?null:p.id);setExpanded(true);}} className={styles.pillarButton} data-has-red={c.red>0}>
        <span className={styles.pillarName}>{p.name}</span>
        <span className={styles.pillarCounts}>{TONES.filter(t=>c[t]>0).map(t=><span key={t} data-tone={t}>{c[t]} {t==='gray'?'unknown':t}</span>)}</span>
        <span className={styles.srOnly}>{p.question} {TONES.map(t=>`${c[t]} ${t}`).join(', ')}. Open evidence for this category; every red remains visible.</span>
      </button>;})}
    </div>
    {reds.length?<section className={styles.triage} aria-labelledby="critical-findings"><h3 id="critical-findings">Investigate first <span>{reds.length} red {reds.length===1?'finding':'findings'}</span></h3><Findings items={reds} farmEvidence={farmEvidence}/></section>:null}
    {primaryCaution?<section className={styles.triage} aria-labelledby="leading-caution"><h3 id="leading-caution">Caution to review <span>{sorted.filter(f=>f.tone==='yellow').length} yellow</span></h3><Finding finding={primaryCaution} detail={farmDetail(farmEvidence,primaryCaution.id)} compact/></section>:null}
    <div className={styles.decisionBrief} aria-label="Decision brief">
      <div className={styles.known}><h3>What we know</h3><details className={styles.knownSource}><summary><span className={styles.confidence}>{brief.source} · source details</span><p>{brief.known}</p></summary><div className={styles.evidence}>
        {brief.knownFindings.map(f=><dl key={f.id}><dt>{f.title} · exact returned value</dt><dd>{f.value??'Not observed'}</dd><dt>Source / field</dt><dd>{f.source??'Unavailable'} · <code>{f.fieldPath??'No source field'}</code></dd><dt>{findingClockLabel(f)}</dt><dd>{f.observedAt??'Unknown'}</dd><dt>Matching response receipt</dt><dd>{view.facts.find(x=>x.responseSha256===f.responseSha256)?.receivedAt??'No separate receipt clock returned'}</dd><dt>Original response SHA-256</dt><dd><code>{f.responseSha256??'Unavailable'}</code></dd><dt>Scope</dt><dd>{f.explanation}</dd></dl>)}
        {brief.knownFacts.map(f=><dl key={f.id}><dt>{f.label} · exact returned value</dt><dd>{f.value??'Not observed'} · {f.unit}</dd><dt>Source / field</dt><dd>{f.source??'Unavailable'} · {f.path??'No source field'}</dd><dt>Provider record update / receipt</dt><dd>{f.observedAt??'Unknown'} / {f.receivedAt??'Unknown'}</dd><dt>Original response SHA-256</dt><dd><code>{f.responseSha256??'Unavailable'}</code></dd><dt>Scope</dt><dd>{f.reason}</dd></dl>)}
        {!brief.knownFindings.length&&!brief.knownFacts.length?<p>No source receipt was returned. Nothing has been inferred.</p>:null}
        <p>Provider reports and derived calculations are distinct from an authenticated independent account observation. A source hash does not establish safety.</p>
      </div></details><small>Independent RPC: {brief.test?'test inputs, not live':'not observed in this inspection'}.</small></div>
      <section className={styles.mainUnknown} aria-labelledby="biggest-question"><h3 id="biggest-question">Biggest unanswered control</h3>{brief.primary?<Finding finding={brief.primary} detail={farmDetail(farmEvidence,brief.primary.id)} compact/>:<p>No unanswered check was returned. Complete coverage has not been established.</p>}</section>
      <div className={styles.nextCheck}><h3>Next verification</h3><p>{brief.next}</p></div>
      <p className={styles.questionCount}>{brief.unknownCount} unanswered {brief.unknownCount===1?'question':'questions'} · Missing evidence, not a token verdict.{!reds.length?' No red finding was returned; that does not establish safety.':''}</p>
    </div>
    <details className={styles.allEvidence} open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)}>
      <summary>All questions &amp; evidence <span>{sorted.length} findings · source details</span></summary>
      {selected?<p className={styles.filterStatus} role="status">Showing {name?.toLowerCase()}. All red and the key unanswered control remain visible. <button type="button" onClick={()=>setSelected(null)}>Show all</button></p>:null}
      {yellows.length?<section className={styles.triage} aria-labelledby="caution-findings"><h3 id="caution-findings">Cautions <span>{yellows.length} yellow</span></h3><Findings items={yellows} farmEvidence={farmEvidence}/></section>:null}
      {unknowns.length?<section className={styles.triage} aria-labelledby="unknown-findings"><h3 id="unknown-findings">Further unanswered questions <span>{unknowns.length} gray</span></h3><Findings items={unknowns} farmEvidence={farmEvidence}/></section>:null}
      {greens.length?<section className={styles.positives}><h3>{greens.length} narrow positive {greens.length===1?'finding':'findings'}</h3><p>Green never cancels red or unknown evidence.</p><Findings items={greens} farmEvidence={farmEvidence}/></section>:null}
    </details>
    <details className={styles.evidenceLegend}><summary>How to read the evidence</summary><p>Red: a specific serious warning, capability or source conflict; not proof of intent. Yellow: a caution or screening heuristic. Green: one narrow positive finding. Gray: missing, unsupported or incomplete evidence.</p><p>Counts describe returned findings, not independent votes or a token score. Different sources may discuss the same permission. Provider-reported, RPC-reported and derived evidence have different limits. No color guarantees sellability, genuine demand, persistent returns or token safety.</p></details>
  </section>;
}
