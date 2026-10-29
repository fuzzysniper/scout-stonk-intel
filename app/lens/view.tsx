'use client';
import {useEffect,useRef,useState} from 'react';
import {isExactPublicKey} from '../../lib/onchain-mint/validation';
import {sourceOffLens} from '../../lib/v4-alpha-lens/source-off-model';
import {FactCard,unavailable} from './cards';
import styles from './lens.module.css';
import JournalControls from './journal-controls';
import {JOURNAL_OFF,type JournalCapability} from '../../lib/v4-thesis-api/client-contract';
export default function Lens({journal=JOURNAL_OFF}:{journal?:JournalCapability}={}){
 const [ca,setCa]=useState(''),[selected,setSelected]=useState(''),[error,setError]=useState(''),[thesis,setThesis]=useState(''),[counter,setCounter]=useState('');
 const [journalStatus,setJournalStatus]=useState('NOT SAVED'),[reset,setReset]=useState(0);
 const result=useRef<HTMLParagraphElement>(null),input=useRef<HTMLInputElement>(null);
 const clear=()=>{setCa('');setSelected('');setError('');setThesis('');setCounter('');setJournalStatus('NOT SAVED');setReset(n=>n+1);};
 useEffect(()=>{const hide=()=>clear(),show=(event:PageTransitionEvent)=>{if(event.persisted)clear();};window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);return()=>{window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);};},[]);
 const model=sourceOffLens(selected||null);
 const facts=unavailable.map(f=>({...f,tone:model.render.tone,observedAt:model.render.observedAt,reason:model.render.providersDisabled?f.reason:'Source configuration is not admitted. No observation or lookup is available.'}));
 function inspect(){if(!isExactPublicKey(ca)){setError('Enter an exact Solana address that decodes to 32 bytes. No lookup was attempted.');setSelected('');input.current?.focus();return;}setError('');setSelected(ca);requestAnimationFrame(()=>result.current?.focus());}
 return <main id="scout-content" className={styles.lens}>
 <header><span className={styles.brand}>UNFARMD</span><span className={styles.badge}>SOURCES OFF</span></header>
 <h1>Alpha Lens</h1><p className={styles.intro}>Know what is observed.<br/>Own what you believe.</p>
 <form onSubmit={e=>{e.preventDefault();inspect();}} noValidate><label htmlFor="lens-ca">Solana contract address</label><div className={styles.entry}><input ref={input} id="lens-ca" value={ca} onChange={e=>{setCa(e.target.value);setSelected('');setError('');setJournalStatus('NOT SAVED');if(journal.kind==='verified_owner'){setThesis('');setCounter('');}}} maxLength={100} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={error?true:undefined} aria-describedby="ca-help ca-error"/><button type="submit">View facts</button></div><p id="ca-help" className={styles.hint}>Address format only. No lookup runs while providers are off.</p><p id="ca-error" className={styles.error} role="alert">{error}</p></form>
 <p ref={result} tabIndex={-1} className={styles.notice} role="status">{selected?<>Sources unavailable for <span className={styles.address}>{selected}</span>Format recognized; token existence and identity unverified.</>:'No observations yet. Paste an address to inspect availability.'}</p>
 <section aria-labelledby="facts-title"><div className={styles.sectionTitle}><h2 id="facts-title">The facts</h2><span>NO OVERALL SCORE</span></div><div className={styles.cards}>{facts.map(f=><FactCard key={f.id} fact={f}/>)}</div></section>
 <section className={styles.thesis} aria-labelledby="thesis-title"><div className={styles.sectionTitle}><h2 id="thesis-title">MY THESIS</h2><span>{journalStatus}</span></div><label htmlFor="lens-thesis">What do you believe, and why?</label><textarea id="lens-thesis" rows={3} value={thesis} onChange={e=>{setThesis(e.target.value);setJournalStatus('NOT SAVED');}} maxLength={4000} autoComplete="off"/><p className={styles.hint}>{journal.kind==='off'?'Your words, not verified evidence. Editable for this session only.':'Your words, not verified evidence. Save explicitly to record a revision.'}</p><details><summary>What changes my mind? · optional</summary><label htmlFor="lens-counter">Evidence that would challenge your thesis</label><textarea id="lens-counter" rows={2} value={counter} onChange={e=>{setCounter(e.target.value);setJournalStatus('NOT SAVED');}} maxLength={4000} autoComplete="off"/></details>{journal.kind==='off'?<p className={styles.hint}>Revision history unavailable. Edits replace this unsaved draft; no historical receipt is created.</p>:null}<JournalControls key={selected+'_'+reset} mint={selected} capability={journal} thesis={thesis} counter={counter} onLoad={(t,c)=>{setThesis(t);setCounter(c);}} onStatus={setJournalStatus}/></section>
 <footer><p>{journal.kind==='off'?'Session only · not saved. Refreshing or closing clears your notes. No account, tracking or application storage.':'Only confirmed saves are stored privately. Clearing this screen removes the local draft; it does not delete saved history.'}</p><p>No market data, safety verdict or trading recommendation.</p><button type="button" onClick={()=>{clear();input.current?.focus();}}>Clear this session</button></footer>
 </main>;
}
