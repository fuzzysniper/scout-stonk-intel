'use client';
import {useState} from 'react';
import type {RiskFinding} from '../../lib/v4-owner-preview/view-contract';
import {PILLARS,TONES,counts,evidenceKind,findingClockLabel,leadUnknowns,nextVerification,prioritize,riskDisplay,whyItMatters,type Pillar} from './intelligence-model';
import styles from './ca-view.module.css';
import {farmDetail,type FarmDisclosure,type EvidenceJson} from './evidence-disclosure';

const time=(raw:string|null)=>raw?new Date(raw).toLocaleString():null;
function Finding({finding:f,detail}:{finding:RiskFinding;detail?:EvidenceJson}) {
  return <details className={styles.finding} data-tone={f.tone} data-finding-id={f.id}>
    <summary>
      <span className={styles.findingMeta}><span>{f.tone==='gray'?'UNKNOWN':f.tone.toUpperCase()}</span><span>{PILLARS.find(p=>p.id===f.pillar)?.name}</span></span>
      <span className={styles.findingTitle}>{f.title}</span>
      <strong>{riskDisplay(f)}</strong>
      <span className={styles.findingWhy}>{whyItMatters(f)}</span>
      <span className={styles.findingOpen}>{evidenceKind(f)} <span aria-hidden="true">·</span> Evidence &amp; next check <span aria-hidden="true">↗</span></span>
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

export default function IntelligenceDesk({findings,farmEvidence}:{findings:readonly RiskFinding[];farmEvidence?:FarmDisclosure}) {
  const [selected,setSelected]=useState<Pillar|null>(null),sorted=prioritize(findings);
  const reds=sorted.filter(f=>f.tone==='red');
  const relevant=sorted.filter(f=>!selected||f.pillar===selected);
  const yellows=relevant.filter(f=>f.tone==='yellow'),unknowns=relevant.filter(f=>f.tone==='gray'),greens=relevant.filter(f=>f.tone==='green');
  const firstUnknowns=selected?unknowns.slice(0,3):leadUnknowns(unknowns),moreUnknowns=unknowns.filter(f=>!firstUnknowns.some(x=>x.id===f.id));
  const name=PILLARS.find(p=>p.id===selected)?.name;
  return <section className={styles.intelligence} aria-labelledby="lens-intelligence-title">
    <h2 id="lens-intelligence-title" tabIndex={-1}>UNFARMD INTELLIGENCE</h2>
    <p className={styles.intelligenceIntro}>Specific checks. No overall safety score.</p>
    <div className={styles.pillarBar} role="group" aria-label="Evidence categories">
      {PILLARS.map(p=>{const c=counts(findings.filter(f=>f.pillar===p.id));return <button type="button" key={p.id} aria-pressed={selected===p.id} onClick={()=>setSelected(current=>current===p.id?null:p.id)} className={styles.pillarButton} data-has-red={c.red>0}>
        <span className={styles.pillarName}>{p.name}</span>
        <span className={styles.pillarCounts}>{TONES.map(t=><span key={t} data-tone={t}>{c[t]} {t==='gray'?'unknown':t}</span>)}</span>
        <span className={styles.srOnly}>{p.question} Filter details; red findings from every category remain visible.</span>
      </button>;})}
    </div>
    {selected?<p className={styles.filterStatus} role="status">Showing {name?.toLowerCase()}. All red findings remain visible. <button type="button" onClick={()=>setSelected(null)}>Show all</button></p>:null}
    {reds.length?<section className={styles.triage} aria-labelledby="critical-findings"><h3 id="critical-findings">Investigate first <span>{reds.length} red {reds.length===1?'finding':'findings'}</span></h3><Findings items={reds} farmEvidence={farmEvidence}/></section>:<p className={styles.noRed}>No red finding was returned. This does not establish safety.</p>}
    {yellows.length?<section className={styles.triage} aria-labelledby="caution-findings"><h3 id="caution-findings">Cautions <span>{yellows.length} yellow</span></h3><Findings items={yellows} farmEvidence={farmEvidence}/></section>:null}
    {unknowns.length?<section className={styles.triage} aria-labelledby="unknown-findings"><h3 id="unknown-findings">What remains unknown <span>{unknowns.length} unresolved</span></h3><Findings items={firstUnknowns} farmEvidence={farmEvidence}/>{moreUnknowns.length?<details className={styles.moreFindings}><summary>Show {moreUnknowns.length} more unknown {moreUnknowns.length===1?'check':'checks'}</summary><Findings items={moreUnknowns} farmEvidence={farmEvidence}/></details>:null}</section>:null}
    {greens.length?<details className={styles.positives}><summary><span>{greens.length} narrow positive {greens.length===1?'finding':'findings'}</span><small>Green never cancels red or unknown evidence.</small></summary><Findings items={greens} farmEvidence={farmEvidence}/></details>:null}
    <details className={styles.evidenceLegend}><summary>How to read the evidence</summary><p>Red: a specific serious warning, capability or source conflict; not proof of intent. Yellow: a caution or screening heuristic. Green: one narrow positive finding. Gray: missing, unsupported or incomplete evidence.</p><p>Counts describe returned findings, not independent votes or a token score. Different sources may discuss the same permission. Provider-reported, RPC-reported and derived evidence have different limits. No color guarantees sellability, genuine demand, persistent returns or token safety.</p></details>
  </section>;
}
