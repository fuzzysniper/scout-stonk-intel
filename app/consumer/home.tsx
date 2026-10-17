'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import type {MintExplanation} from '../../experiments/consumer-mvp/evidence';
import {evaluateInput,examples,legacyPath,messages,plainExplanation,sharePath,type HomeState} from './model';

async function copy(text:string){try{await navigator.clipboard.writeText(text);return true;}catch{return false;}}
function Field({label,value}:{label:string;value:string}) {
 return <div className="receipt-line"><dt>{label}</dt><dd className="mono">{value}</dd></div>;
}
function BlockTitle({number,children}:{number:string;children:React.ReactNode}) {
 return <h2 className="block-title"><span className="block-number" aria-hidden="true">{number}</span>{children}</h2>;
}
export function Explanation({evidence:e}:{evidence:MintExplanation}) {
 const details=useRef<HTMLDetailsElement>(null),fallback=useRef<HTMLInputElement>(null);
 const [shareStatus,setShareStatus]=useState(''),[manualLink,setManualLink]=useState('');
 const sources={quote_registry:'Quote registry at capture',pair_catalog:'Token catalog at capture',reward_settings:'Reward settings at capture'};
 function openSource(kind:string){
  if(details.current)details.current.open=true;
  const target=document.getElementById('source-'+kind);target?.focus();target?.scrollIntoView({block:'start',behavior:'instant'});
 }
 async function share(){
  const url=new URL(sharePath(e.token.mint),location.origin).href;
  if(await copy(url))setShareStatus('Link copied. It opens this captured example.');
  else{setManualLink(url);setShareStatus('Select and copy the link below. Clipboard access is unavailable.');}
 }
 useEffect(()=>{if(manualLink){fallback.current?.focus();fallback.current?.select();}},[manualLink]);
 return <article className="answer-card">
  <div className="answer-top"><div><p className="eyebrow">01 / WHAT IT IS</p><h1 id="answer-title" tabIndex={-1} className="token-title">{e.token.name}<span className="ticker">{e.token.symbol}</span></h1></div><button type="button" className="secondary share-button" onClick={()=>void share()}>Copy link</button></div>
  <p className="pair-label">Paired with <strong>{e.quote.symbol}</strong> · Solana</p>
  <div className="plain-english">{plainExplanation(e).map(p=><p key={p}>{p}</p>)}</div>
  <p className="copy-status" role="status">{shareStatus}</p>
  {manualLink&&<div className="share-fallback"><label htmlFor="share-link">Copy this exact-mint link</label><input id="share-link" ref={fallback} className="mono" readOnly value={manualLink}/></div>}
  <section className="verified-block" aria-label="Dated verification">
   <BlockTitle number="02">What’s verified</BlockTitle><p className="section-context">At capture · 14 Oct 2026 · StonkFun reported</p>
   {[{title:'Token and pair identity',detail:`${e.token.symbol} token ↔ ${e.quote.symbol} quote. Exact mints matched.`,source:'pair_catalog'},
     {title:'Reward setting, not payouts',detail:'Provider setting only. Payment is not verified.',source:'reward_settings'}].map(f=><div className="fact-row" key={f.title}><span className="fact-marker" aria-hidden="true">✓</span><div><h3>{f.title}</h3><p>{f.detail}</p></div><button type="button" className="source-ref" aria-label={'Evidence for '+f.title} onClick={()=>openSource(f.source)}>Evidence</button></div>)}
  </section>
  <section className="risks-block" aria-label="Risks and unknowns"><BlockTitle number="03">What’s not known</BlockTitle><ul>
   <li>Stale capture; current settings unverified.</li><li>Payouts, eligibility and holder returns are unverified.</li>
   <li>Financial figures withheld; publication rights unverified.</li><li>Selected examples only; coverage is incomplete.</li>
  </ul></section>
  <details className="evidence" ref={details} onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}>
   <summary><span>Evidence &amp; exact mints</span><span className="details-hint">3 receipts</span></summary>
   <div className="evidence-body"><p className="evidence-warning">Retained captured evidence. No live source check. These receipts verify a dated provider statement, not a payment or a legal entitlement. Metadata publication and retention rights remain unverified.</p>
    <dl className="identity-list"><Field label={'Token mint · '+e.token.symbol} value={e.token.mint}/><Field label={'Quote mint · '+e.quote.symbol} value={e.quote.mint}/></dl>
    <section className="full-notes"><h3>Mechanism, ownership &amp; limitations</h3>{[e.whatItIs,e.whatUserOwns,e.pairRelationship,e.economicMechanism.conclusion,...e.risksAndUnknowns].map(f=><p key={f.text}>{f.text}</p>)}</section>
    {e.sources.map(s=><section className="receipt" key={s.id} id={'source-'+s.kind} tabIndex={-1}><h3>{sources[s.kind]}</h3><dl>
     <Field label="Captured · UTC" value={s.capturedAt}/><Field label="Provider generated · UTC" value={s.generatedAt??'Not supplied'}/><Field label="Receipt SHA-256" value={s.bodySha256}/>
     {s.retained&&<><Field label="Original document SHA-256" value={s.retained.documentSha256}/><Field label="Evidence commit" value={s.retained.commit}/></>}
    </dl><a className="external-link" href={s.url} target="_blank" rel="noopener noreferrer">Source endpoint · may have changed ↗</a></section>)}
    <p className="small-note">Three selected examples. Incomplete catalog coverage. Source retention and public/commercial publication rights remain unverified; financial quantities are withheld. A hash identifies retained bytes, not a provider signature or permission.</p>
   </div>
  </details>
 </article>;
}

export default function ConsumerHome({initialInput,initialState}:{initialInput:string;initialState:HomeState}) {
 const [input,setInput]=useState(initialInput),[result,setResult]=useState(initialState),[announcement,setAnnouncement]=useState('');
 const focusAfterUpdate=useRef(false);
 const idle=result.state==='idle',supported=result.state==='supported';
 useEffect(()=>{
  function fromHistory(){const values=new URL(location.href).searchParams.getAll('mint');setInput(values.length===1?values[0]:'');setResult(evaluateInput(values.length>1?values:values[0]));setAnnouncement('');}
  window.addEventListener('popstate',fromHistory);return()=>window.removeEventListener('popstate',fromHistory);
 },[]);
 useEffect(()=>{
  document.title=supported?`${result.evidence.token.symbol} explained · captured 14 Oct 2026`:'Understand a Solana token';
  if(focusAfterUpdate.current){focusAfterUpdate.current=false;document.getElementById('answer-title')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
 },[result,supported]);
 function lookup(raw:string){
  const next=evaluateInput(raw);setInput(raw);setResult(next);focusAfterUpdate.current=true;
  setAnnouncement(next.state==='supported'?`Captured ${next.evidence.token.symbol} example opened. Not live data.`:'Request evaluated.');
  const url=next.state==='supported'?sharePath(next.evidence.token.mint):'/';
  if(url!==location.pathname+location.search+location.hash)history.pushState({},'',url);
  if(document.activeElement instanceof HTMLInputElement)document.activeElement.blur();
 }
 return <div className="consumer-home">
  <a className="skip-link" href="#content">Skip to content</a>
  <header className="site-header"><Link className="wordmark" href="/" prefetch={false} aria-label="Start again" onClick={()=>{setInput('');setResult({state:'idle'});setAnnouncement('');}}>Token explained<span aria-hidden="true">.</span></Link><span className="preview-label">Dated research</span></header>
  <main id="content" className={idle?'':'has-answer'} tabIndex={-1}>
   {idle&&<section className="welcome" aria-labelledby="welcome-title"><p className="eyebrow">LESS GUESSWORK. MORE UNDERSTANDING.</p><h1 id="welcome-title">A token address.<br/><span>A clear answer.</span></h1><p className="intro">See what a Solana token is, what’s verified, and what’s still unknown.</p></section>}
   <div className="capture-notice"><span className="notice-dot" aria-hidden="true"/><span><strong>Captured examples, not live data.</strong> 14 Oct 2026 · stale.</span></div>
   <form className={idle?'':'compact'} noValidate onSubmit={event=>{event.preventDefault();lookup(input);}}>
    <label htmlFor="mint">Solana token mint</label><div className="search-row"><input id="mint" name="mint" type="text" value={input} onChange={event=>setInput(event.target.value)} placeholder="Paste a full mint address" autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={120} aria-describedby="mint-help lookup-status" aria-invalid={['empty','invalid','needs_mint'].includes(result.state)?true:undefined}/><button type="submit" className="primary" aria-label="Explain token">Explain token <span aria-hidden="true">→</span></button></div>
    <p id="mint-help" className="field-help">An address identifies a token. A ticker doesn’t.</p>
   </form>
   <p id="lookup-status" className="sr-only" role="status" aria-live="polite">{announcement}</p>
   {supported?<Explanation key={result.evidence.token.mint} evidence={result.evidence}/>:result.state!=='idle'&&<div className="error-card"><h1 id="answer-title" tabIndex={-1}>{messages[result.state][0]}</h1><p>{messages[result.state][1]}</p>{result.state==='unavailable'&&<button type="button" className="secondary" onClick={()=>lookup(input)}>Try again</button>}</div>}
   {!supported&&<section className="discovery" aria-labelledby="discovery-title"><div className="section-label"><h2 id="discovery-title">Try a captured example</h2><span>3 supported tokens</span></div><div className="example-list">{examples.map(e=><button type="button" className="example-button" key={e.mint} onClick={()=>lookup(e.mint)} aria-label={`Explain ${e.name} (${e.symbol}), captured ${e.quoteSymbol} pair`}><span className="example-icon" aria-hidden="true">{e.symbol.slice(0,2)}</span><span className="example-name">{e.symbol}</span><span className="example-quote">with {e.quoteSymbol}</span><span className="example-arrow" aria-hidden="true">→</span></button>)}</div><p className="small-note">Selected examples, not a ranking or a complete token list. Metadata rights unverified; financial figures withheld.</p></section>}
   <noscript><p className="small-note">This dated explanation is readable without JavaScript. Enable JavaScript to select examples and copy links, or open an exact-mint link.</p></noscript>
  </main>
  <footer className="site-footer"><span>Understanding first. No trading or wallet connection.</span><nav aria-label="Technical research"><a href={legacyPath(supported?result.evidence.token.mint:input)}>Research terminal</a><a href="/research/history">Source index</a></nav></footer>
 </div>;
}
