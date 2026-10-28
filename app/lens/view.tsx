'use client';
import {useEffect,useRef,useState} from 'react';
import {isSolanaMint} from '../../lib/solana';
import {FactCard,unavailable} from './cards';
import styles from './lens.module.css';
export default function Lens(){
 const [ca,setCa]=useState(''),[selected,setSelected]=useState(''),[error,setError]=useState(''),[thesis,setThesis]=useState(''),[counter,setCounter]=useState('');
 const result=useRef<HTMLParagraphElement>(null),input=useRef<HTMLInputElement>(null);
 const clear=()=>{setCa('');setSelected('');setError('');setThesis('');setCounter('');};
 useEffect(()=>{const hide=()=>clear(),show=(event:PageTransitionEvent)=>{if(event.persisted)clear();};window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);return()=>{window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);};},[]);
 function inspect(){if(!isSolanaMint(ca)){setError('Enter a Solana address that decodes to 32 bytes. No lookup was attempted.');setSelected('');input.current?.focus();return;}setError('');setSelected(ca.trim());requestAnimationFrame(()=>result.current?.focus());}
 return <main id="scout-content" className={styles.lens}>
 <header><span className={styles.brand}>UNFARMD</span><span className={styles.badge}>SOURCES OFF</span></header>
 <h1>Alpha Lens</h1><p className={styles.intro}>Know what is observed.<br/>Own what you believe.</p>
 <form onSubmit={e=>{e.preventDefault();inspect();}} noValidate><label htmlFor="lens-ca">Solana contract address</label><div className={styles.entry}><input ref={input} id="lens-ca" value={ca} onChange={e=>{setCa(e.target.value);setSelected('');setError('');}} maxLength={100} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={error?true:undefined} aria-describedby="ca-help ca-error"/><button type="submit">View facts</button></div><p id="ca-help" className={styles.hint}>Address format only. No lookup runs while providers are off.</p><p id="ca-error" className={styles.error} role="alert">{error}</p></form>
 <p ref={result} tabIndex={-1} className={styles.notice} role="status">{selected?<>Sources unavailable for <span className={styles.address}>{selected}</span>Format recognized; token existence and identity unverified.</>:'No observations yet. Paste an address to inspect availability.'}</p>
 <section aria-labelledby="facts-title"><div className={styles.sectionTitle}><h2 id="facts-title">The facts</h2><span>NO OVERALL SCORE</span></div><div className={styles.cards}>{unavailable.map(f=><FactCard key={f.id} fact={f}/>)}</div></section>
 <section className={styles.thesis} aria-labelledby="thesis-title"><div className={styles.sectionTitle}><h2 id="thesis-title">MY THESIS</h2><span>NOT SAVED</span></div><label htmlFor="lens-thesis">What do you believe, and why?</label><textarea id="lens-thesis" rows={3} value={thesis} onChange={e=>setThesis(e.target.value)} maxLength={4000} autoComplete="off"/><p className={styles.hint}>Your words, not verified evidence. Editable for this session only.</p><details><summary>What changes my mind? · optional</summary><label htmlFor="lens-counter">Evidence that would challenge your thesis</label><textarea id="lens-counter" rows={2} value={counter} onChange={e=>setCounter(e.target.value)} maxLength={4000} autoComplete="off"/></details><p className={styles.hint}>Revision history unavailable. Edits replace this unsaved draft; no historical receipt is created.</p></section>
 <footer><p>Session only · not saved. Refreshing or closing clears your notes. No account, tracking or application storage.</p><p>No market data, safety verdict or trading recommendation.</p><button type="button" onClick={()=>{clear();input.current?.focus();}}>Clear this session</button></footer>
 </main>;
}
