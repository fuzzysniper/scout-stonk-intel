'use client';
import {useEffect,useState} from 'react';
import type {NativeEvidenceV1} from '../../lib/native-evidence/contract';
import {CLAIMS,type ClaimId} from './claim-check';
import {nativeClaim} from './native-claim';
import {NativeFindingEvidence} from './native-evidence-cards';
import styles from './ca-view.module.css';
export default function NativeClaimCheck({evidence:e,now,withheld}:{evidence:NativeEvidenceV1;now:number;withheld:boolean}){
 const [open,setOpen]=useState(false),[id,setId]=useState<ClaimId>('mint-authority'),[,refresh]=useState(0),claim=nativeClaim(e,id,Math.max(now,Date.now()),withheld);
 useEffect(()=>{if(!open||claim.validUntil===null)return;const timer=setTimeout(()=>refresh(n=>n+1),Math.max(0,claim.validUntil-Date.now()));return()=>clearTimeout(timer);},[open,claim.validUntil]);
 return <details data-claim-check className={styles.claimCheck} open={open} onToggle={ev=>setOpen(ev.currentTarget.open)}><summary>Test the claim <span>Use this candidate’s exact evidence</span></summary>{open?<div className={styles.claimBody}><label htmlFor="native-oracle-claim">Choose a claim</label><select id="native-oracle-claim" className={styles.claimSelect} value={id} onChange={ev=>{const next=CLAIMS.find(c=>c.id===ev.target.value)?.id;if(next)setId(next);}}>{CLAIMS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select><p className={styles.claimTest}>{e.origin.label} · CANDIDATE ONLY · NOT A LIVE CONCLUSION</p><p role="status" aria-live="polite" className={styles.claimOutcome} data-outcome={claim.outcome}>{claim.outcome}</p><p>{claim.reason}</p>{claim.finding?<NativeFindingEvidence evidence={e} finding={claim.finding} now={Math.max(now,Date.now())} withheld={withheld}/>:<p>No supporting native rule was returned.</p>}</div>:null}</details>;
}
