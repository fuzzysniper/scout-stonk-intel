'use client';
import {useEffect,useRef,useState} from 'react';
import type {MintView} from './onchain-model';
import {scoutFindings} from './control-receipt-model';
import {tokenConcerns} from './trader-model';

type Accepted=Extract<MintView,{kind:'facts'}>;
function ReceiptMark(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6M7 12h10"/></svg>;}
function CopyMark(){return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/></svg>;}
function jump(id:string){const e=document.getElementById(id);e?.focus();e?.scrollIntoView({block:'start',behavior:'instant'});}

function CopyFindings({view,mint,observedAt}:{view:Accepted;mint:string;observedAt:number}){
 const [status,setStatus]=useState(''),[manual,setManual]=useState(''),[busy,setBusy]=useState(false),[blocked,setBlocked]=useState(false);
 const copyButton=useRef<HTMLButtonElement>(null),textField=useRef<HTMLTextAreaElement>(null),epoch=useRef(0),focusFallback=useRef(false);
 const eligible=!blocked&&scoutFindings(view,mint,observedAt)!==null;
 useEffect(()=>()=>{epoch.current++;},[]);
 useEffect(()=>{if(manual&&focusFallback.current){textField.current?.focus();textField.current?.select();focusFallback.current=false;}},[manual]);
 async function copy(){
  const text=scoutFindings(view,mint,Date.now());
  if(!text){setBlocked(true);setManual('');setStatus('Observation no longer eligible. Nothing copied. Request a fresh check deliberately.');return;}
  const attempt=++epoch.current;setBusy(true);setManual('');setStatus('');
  const stillEligible=()=>attempt===epoch.current&&scoutFindings(view,mint,Date.now())===text;
  try{
   if(!navigator.clipboard?.writeText)throw Error('clipboard_unavailable');
   await navigator.clipboard.writeText(text);
   if(attempt!==epoch.current)return;
   if(!stillEligible()){setBlocked(true);setStatus('Observation expired while copying. No current findings are available; any copied text keeps its original source time.');return;}
   setStatus('SCOUT findings copied. A dated RPC report, not a safety certificate.');
  }catch{
   if(attempt!==epoch.current)return;
   if(!stillEligible()){setBlocked(true);setStatus('Observation expired. Nothing available for manual copy.');return;}
   focusFallback.current=document.activeElement===copyButton.current||document.activeElement===document.body;
   setManual(text);setStatus('Clipboard unavailable. Select and copy the findings below.');
  }finally{if(attempt===epoch.current)setBusy(false);}
 }
 return <>
  <div className="receipt-export"><button ref={copyButton} type="button" className="copy-findings" disabled={!eligible||busy} aria-describedby="receipt-export-limit" onClick={()=>void copy()}><CopyMark/>{busy?'Copying findings…':'Copy SCOUT Findings'}</button><p id="receipt-export-limit">{view.offline?'No export from synthetic evidence.':'Unsigned text snapshot. Not a durable receipt or safety certification.'}</p></div>
  <p className="receipt-copy-status" role="status">{status}</p>
  {eligible&&manual&&<div className="receipt-manual"><label htmlFor="scout-findings-text">Select SCOUT findings to copy</label><textarea id="scout-findings-text" ref={textField} readOnly value={manual} rows={9}/></div>}
 </>;
}

/** Pure projection preserves the loading section/heading DOM and keyboard focus. */
export function renderControlReceipt({view,mint,observedAt}:{view:Accepted;mint:string;observedAt:number}){
 const {facts:f,source:s}=view.value,unreviewed=f.extensions.assessment==='unreviewed';
 const count=tokenConcerns(view,observedAt).length;
 const authorityPanels=[
  {label:'Mint authority',present:f.mintAuthority.state==='present',title:f.mintAuthority.state==='present'?(unreviewed?'Authority present':'Can issue more'):'Not present',detail:unreviewed?'Full issuance rules unreviewed.':f.mintAuthority.state==='present'?'Additional tokens can be issued. Intent is unknown.':'No minting through this standard authority.'},
  {label:'Freeze authority',present:f.freezeAuthority.state==='present',title:f.freezeAuthority.state==='present'?(unreviewed?'Authority present':'Can freeze accounts'):'Not present',detail:unreviewed?'Full freezing rules unreviewed.':f.freezeAuthority.state==='present'?'Token accounts can be frozen. Controller identity is unknown.':'No freezing through this standard authority.'},
 ];
 return <section className="scout-brief control-receipt" aria-labelledby="brief-title" aria-busy="false">
  <div className="brief-top"><p className="trader-kicker"><ReceiptMark/> SCOUT / CONTROL RECEIPT</p><span className="brief-status accepted"><span aria-hidden="true"/>{view.offline?'Offline test snapshot':'RPC snapshot accepted'}</span></div>
  <h2 id="brief-title" tabIndex={-1}>What can its controllers still do?</h2>
  <p className="brief-mint" title={mint}><span>SOLANA MINT</span> <code>{mint.slice(0,6)}…{mint.slice(-6)}</code><span className="sr-only">Full address in onchain evidence below.</span></p>
  {view.offline&&<p className="mint-offline">SYNTHETIC · OFFLINE TEST — not live token facts. Findings export disabled.</p>}
  <div className="receipt-rule" aria-hidden="true"/>
  <dl className="brief-controls">
   {authorityPanels.map(p=><div key={p.label} data-attention={p.present}><dt>{p.label}</dt><dd><strong>{p.title}</strong><span>{p.detail}</span></dd></div>)}
   <div className="receipt-extensions" data-attention={unreviewed}><dt>{f.program==='spl_token'?'Token Program':'Token-2022'}</dt><dd><strong>{unreviewed?'Not fully reviewed':f.extensions.assessment==='reviewed_metadata_pointer'?'Pointer only reviewed':'None in layout'}</strong><span>{unreviewed?'Additional controls are unknown.':f.extensions.assessment==='reviewed_metadata_pointer'?'Metadata pointer review only.':'Extensions in the supported parsed layout.'}</span></dd></div>
  </dl>
  <div className="receipt-supply"><span>EXACT SUPPLY · TOKEN UNITS</span><strong dir="ltr">{view.supply}</strong></div>
  <p className="brief-clock"><span><span>FINALIZED CONTEXT SLOT</span><strong>{s.contextSlot}</strong></span><span><span>CHECKED · ORIGINAL UTC</span><time dateTime={s.checkedAt}>{new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZone:'UTC'}).format(new Date(s.checkedAt))} UTC</time></span></p>
  <p className="receipt-source">{view.offline?'Offline fixture':'Helius RPC report'} · <code title={'Server-reported response SHA-256: '+s.responseSha256}>{s.responseSha256.slice(0,8)}…</code> · not independently replayed</p>
  <p className="brief-summary">{count?`${count} ${count===1?'check needs':'checks need'} a closer look.`:'Standard authorities absent. Other risks remain.'}</p>
  <p className="brief-boundary">{unreviewed?'Token-2022 controls are not fully reviewed. ':''}Holder concentration, liquidity control and sellability remain unknown. No safety score.</p>
  <CopyFindings view={view} mint={mint} observedAt={observedAt}/>
  <div className="brief-actions"><button type="button" onClick={()=>jump('research-concerns')}>Review concerns <span aria-hidden="true">↓</span></button><button type="button" onClick={()=>jump('research-onchain')}>Onchain evidence <span aria-hidden="true">↗</span></button></div>
 </section>;
}
