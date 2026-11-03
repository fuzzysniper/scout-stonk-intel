'use client';
/** Native-first consumer in the EXISTING /lens. No Jupiter acquisition dependency. */
import {useCallback,useEffect,useRef,useState} from 'react';
import type {NativeEvidenceV1} from '../../lib/native-evidence/contract';
import {isExactPublicKey} from '../../lib/onchain-mint/validation';
import {isNativeEvidence,nativeCandidateView,nativeRiskFindings,nativeUnavailableView} from './native-evidence-model';
import {NativeSnapshot} from './native-evidence-cards';
import IntelligenceDesk from './intelligence-desk';
import type {LensView} from './intelligence-model';
import styles from './ca-view.module.css';
import nativeStyles from './native-lens.module.css';
async function boundedJson(response:Response){
 if(!response.ok)throw Error('native_unavailable');const reader=response.body?.getReader();if(!reader)throw Error('native_unavailable');let size=0,chunks=0;const parts:Uint8Array[]=[];
 try{for(;;){const x=await reader.read();if(x.done)break;size+=x.value.byteLength;if(size>131072||++chunks>256)throw Error('native_unavailable');parts.push(x.value);}}finally{void reader.cancel().catch(()=>{});reader.releaseLock();}
 const b=new Uint8Array(size);let i=0;for(const p of parts){b.set(p,i);i+=p.length;}const text=new TextDecoder('utf8',{fatal:true}).decode(b),v:unknown=JSON.parse(text);if(JSON.stringify(v)!==text)throw Error('native_unavailable');return v;
}
export default function NativeLens(){
 const [mint,setMint]=useState(''),[data,setData]=useState<NativeEvidenceV1|null>(null),[view,setView]=useState<LensView|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[now,setNow]=useState(Date.now),[note,setNote]=useState('');
 const [stopped,setStopped]=useState(false),[stopping,setStopping]=useState(false),[stopStatus,setStopStatus]=useState('Native source OFF · no live lookup has run.');
 const input=useRef<HTMLInputElement>(null),result=useRef<HTMLDivElement>(null),active=useRef<AbortController|null>(null),sequence=useRef(0);
 const clear=useCallback(()=>{sequence.current++;active.current?.abort();setMint('');setData(null);setView(null);setBusy(false);setError('');setNotice('');setNote('');},[]);
 useEffect(()=>{const discard=()=>clear(),visibility=()=>{if(document.visibilityState==='hidden')discard();};window.addEventListener('pagehide',discard);window.addEventListener('pageshow',discard);document.addEventListener('visibilitychange',visibility);return()=>{active.current?.abort();window.removeEventListener('pagehide',discard);window.removeEventListener('pageshow',discard);document.removeEventListener('visibilitychange',visibility);};},[clear]);
 useEffect(()=>{const remove=()=>{if(!location.hash)return;history.replaceState(null,'',location.pathname+location.search);clear();setNotice('Previous session packets do not authorize this native pilot. Source remains HARD-OFF.');};remove();window.addEventListener('hashchange',remove);return()=>window.removeEventListener('hashchange',remove);},[clear]);
 useEffect(()=>{if(!view)return;const frame=requestAnimationFrame(()=>result.current?.querySelector<HTMLElement>('#native-inspection-title')?.focus());return()=>cancelAnimationFrame(frame);},[view]);
 const shown=data&&view?{...view,riskFindings:nativeRiskFindings(data,now,stopped||stopping)}:view;
 useEffect(()=>{if(!data)return;const deadlines=[...new Set(data.references.map(r=>Date.parse(r.receivedAt)+60000))];const timers=deadlines.map(deadline=>setTimeout(()=>setNow(n=>Math.max(n,Date.now(),deadline)),Math.max(0,deadline-Date.now())));return()=>{for(const t of timers)clearTimeout(t);};},[data]);
 async function inspect(){const exact=mint.trim();if(stopped){setError('New inspections are withheld after STOP. Its durable outcome must be verified separately.');return;}if(!isExactPublicKey(exact)){setError('Paste an exact Solana mint address. No request was made.');input.current?.focus();return;}
  const id=++sequence.current;active.current?.abort();const c=new AbortController();active.current=c;setMint(exact);setBusy(true);setData(null);setView(null);setNote('');setError('');
  try{const r=await fetch('/api/native-pilot',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.any([c.signal,AbortSignal.timeout(10000)]),headers:{'Content-Type':'application/json','X-UNFARMD-NATIVE-INTENT':'inspect'},body:JSON.stringify({mint:exact})});
   if(r.status===503){if(id===sequence.current&&!c.signal.aborted){setView(nativeUnavailableView(exact));setNow(Date.now());}return;}
   const v=await boundedJson(r);if(!isNativeEvidence(v,exact))throw Error('native_unavailable');if(id!==sequence.current||c.signal.aborted)return;setNow(Date.now());setData(v);setView(nativeCandidateView(v));
  }catch{if(id===sequence.current&&!c.signal.aborted){setView(nativeUnavailableView(exact,'Native evidence unavailable or malformed. No observation has been substituted.'));setError('No usable native evidence returned. No automatic retry.');}}finally{if(id===sequence.current)setBusy(false);}
 }
 async function stop(){if(stopping||stopped)return;setStopped(true);setStopping(true);sequence.current++;active.current?.abort();setBusy(false);setStopStatus('STOP requested. Confirmation pending; new inspections withheld.');
  try{const response=await fetch('/api/native-pilot',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6000),headers:{'Content-Type':'application/json','X-UNFARMD-NATIVE-INTENT':'stop'},body:JSON.stringify({mint:mint.trim()})});
   const ack=await boundedJson(response);
   if(ack&&typeof ack==='object'&&Object.keys(ack).sort().join(',')==='activate,status'&&(ack as {status:unknown}).status==='stopped'&&(ack as {activate:unknown}).activate===false){setStopStatus('STOP confirmed by the native boundary. New inspections remain withheld.');return;}
   setStopStatus('STOP outcome UNKNOWN. No automatic retry; new inspections remain withheld.');
  }catch{setStopStatus('STOP outcome UNKNOWN. No automatic retry; new inspections remain withheld.');}finally{setStopping(false);}
 }
 return <main id="scout-content" className={styles.lens} data-native-lens>
  <header className={styles.header}><span className={styles.brand}>UNFARMD</span><span className={styles.badge}>{data?'CANDIDATE · NOT LIVE':'NATIVE PILOT OFF'}</span></header>
  {!view?<><h1>Oracle</h1><p className={styles.intro}>One mint. Controls, sampled concentration and what remains unknown.</p></>:null}
  <form onSubmit={e=>{e.preventDefault();void inspect();}} noValidate><label htmlFor="native-inspect-mint">Solana token address · CA</label><div className={styles.entry}><input id="native-inspect-mint" ref={input} value={mint} onChange={e=>{sequence.current++;active.current?.abort();setMint(e.target.value);setData(null);setView(null);setNote('');setBusy(false);setError('');}} maxLength={100} autoComplete="off" autoCapitalize="none" spellCheck={false} enterKeyHint="search" aria-invalid={!!error} aria-describedby="native-inspect-error"/><button type="submit" disabled={busy||stopped}>{busy?'Inspecting…':'INSPECT'}</button></div></form>
  <p id="native-inspect-error" role="alert" className={styles.error}>{error}</p>{notice?<p role="status" className={styles.muted}>{notice}</p>:null}
  <div className={nativeStyles.session}><p role="status">{stopStatus}</p><button type="button" className={styles.quiet} onClick={()=>void stop()} disabled={stopping||stopped}>{stopping?'Confirming STOP…':'STOP native pilot'}</button></div>
  <div ref={result} className={styles.results} aria-busy={busy}>{view?<><h2 id="native-inspection-title" tabIndex={-1}>Native evidence</h2>
   {data?<NativeSnapshot evidence={data} now={now} withheld={stopped||stopping}/>:<p className={styles.muted}>Controls and sampled concentration unavailable. No source has been activated.</p>}
   <IntelligenceDesk view={shown!} takeWithheld={stopped||stopping} nativeEvidence={data} nativeNow={now}/>
   <details className={styles.thesis}><summary>Your thesis · NOT SAVED</summary><label htmlFor="native-thesis">What do you believe, and why?</label><textarea id="native-thesis" value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={2000}/><p className={styles.muted}>Your words only. Session memory; hosted Save is OFF.</p></details>
  </>:<p className={styles.empty}>No price, liquidity or momentum is inferred from mint and sample evidence.</p>}</div>
  <footer className={styles.footer}><button type="button" className={styles.quiet} onClick={()=>{clear();input.current?.focus();}}>Clear this session</button><p>No tracking, application storage, automatic lookup or retry. Clear does not reset STOP.</p></footer>
 </main>;
}
