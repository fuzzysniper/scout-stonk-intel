'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {OnchainCheck} from './onchain';
import type {MintFactsPort} from './onchain-client';
import {addressQuery,unavailableMintFacts} from './onchain-model';
import type {MintExplanation} from '../../experiments/consumer-mvp/evidence';
import {evaluateInput,examples,legacyPath,messages,plainExplanation,consumerFacts,sharePath,type HomeState} from './model';

async function copy(text:string){try{await navigator.clipboard.writeText(text);return true;}catch{return false;}}
function Field({label,value}:{label:string;value:string}) {
 return <div className="receipt-line"><dt>{label}</dt><dd className="mono">{value}</dd></div>;
}
function BlockTitle({number,children}:{number:string;children:React.ReactNode}) {
 return <h2 className="block-title"><span className="block-number" aria-hidden="true">{number}</span>{children}</h2>;
}
export function Explanation({evidence:e,disclosed=false}:{evidence:MintExplanation;disclosed?:boolean}) {
 const details=useRef<HTMLDetailsElement>(null),fallback=useRef<HTMLInputElement>(null);
 const [shareStatus,setShareStatus]=useState(''),[manualLink,setManualLink]=useState('');
 const Title=disclosed?'h2':'h1';
 const sources={quote_registry:'Quote registry at capture',pair_catalog:'Token catalog at capture',reward_settings:'Reward settings at capture'};
 function openSource(sourceIds:readonly string[]){
  const kind=e.sources.find(s=>sourceIds.includes(s.id))?.kind;if(!kind)return;
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
  <div className="answer-top"><div><p className="eyebrow">01 / WHAT IT IS</p><Title id={disclosed?'historical-title':'answer-title'} tabIndex={-1} className="token-title">{e.token.name}<span className="ticker">{e.token.symbol}</span></Title></div><button type="button" className="secondary share-button" onClick={()=>void share()}>Copy link</button></div>
  <p className="pair-label">Paired with <strong>{e.quote.symbol}</strong> · Solana</p>
  <div className="plain-english">{plainExplanation(e).map(p=><p key={p}>{p}</p>)}</div>
  <p className="copy-status" role="status">{shareStatus}</p>
  {manualLink&&<div className="share-fallback"><label htmlFor="share-link">Copy this exact-mint link</label><input id="share-link" ref={fallback} className="mono" readOnly value={manualLink}/></div>}
  <section className="verified-block" aria-label="Dated verification">
   <BlockTitle number="02">What’s verified</BlockTitle><p className="section-context">At capture · 14 Oct 2026 · StonkFun reported</p>
   {consumerFacts(e).map(f=><div className="fact-row" key={f.title}><span className="fact-marker" aria-hidden="true">✓</span><div><h3>{f.title}</h3><p>{f.detail}</p></div><button type="button" className="source-ref" aria-label={'Evidence for '+f.title} onClick={()=>openSource(f.sourceIds)}>Evidence</button></div>)}
  </section>
  <section className="risks-block" aria-label="Risks and unknowns"><BlockTitle number="03">What’s not known</BlockTitle><ul>
   <li>Stale capture; current settings unverified.</li><li>Payouts, eligibility and holder returns are unverified.</li>
   <li>Financial figures withheld; publication rights unverified.</li><li>Selected examples only; coverage is incomplete.</li>
  </ul></section>
  <details className="evidence" ref={details} onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}>
   <summary><span>Sources &amp; token addresses</span><span className="details-hint">3 receipts</span></summary>
   <div className="evidence-body"><p className="evidence-warning">Retained captured evidence. No live source check. These receipts verify a dated provider statement, not a payment or a legal entitlement. Metadata publication and retention rights remain unverified.</p>
    {e.sources.map(s=><section className="receipt" key={s.id} id={'source-'+s.kind} tabIndex={-1}><h3>{sources[s.kind]}</h3>
     <dl><Field label="Captured · UTC" value={s.capturedAt}/></dl>
     <a className="external-link" aria-label={sources[s.kind]+': Source endpoint · may have changed (opens in a new tab)'} href={s.url} target="_blank" rel="noopener noreferrer">Source endpoint · may have changed ↗</a>
     <details className="receipt-details"><summary>Technical receipt details</summary><dl>
      <Field label="Provider generated · UTC" value={s.generatedAt??'Not supplied'}/><Field label="Receipt SHA-256" value={s.bodySha256}/>
      {s.retained&&<><Field label="Original document SHA-256" value={s.retained.documentSha256}/><Field label="Evidence commit" value={s.retained.commit}/></>}
     </dl></details>
    </section>)}
    <p className="small-note">On Solana, a token address is its exact, case-sensitive mint. Names and tickers can repeat; a matching name doesn’t identify the same token.</p>
    <dl className="identity-list"><Field label={'Token mint · '+e.token.symbol} value={e.token.mint}/><Field label={'Quote mint · '+e.quote.symbol} value={e.quote.mint}/></dl>
    <section className="full-notes"><h3>Mechanism, ownership &amp; limitations</h3>{[e.whatItIs,e.whatUserOwns,e.pairRelationship,e.economicMechanism.conclusion,...e.risksAndUnknowns].map(f=><p key={f.text}>{f.text}</p>)}</section>
    <p className="small-note">Three selected examples. Incomplete catalog coverage. Source retention and public/commercial publication rights remain unverified; financial quantities are withheld. A hash identifies retained bytes, not a provider signature or permission.</p>
   </div>
  </details>
 </article>;
}

export default function ConsumerHome({initialInput,initialState,onchainPort}:{initialInput:string;initialState:HomeState;onchainPort?:MintFactsPort}) {
 const [input,setInput]=useState(initialInput),[result,setResult]=useState(initialState),[announcement,setAnnouncement]=useState('');
 const [pasting,setPasting]=useState(false),[pasteStatus,setPasteStatus]=useState('');
 const pasteEpoch=useRef(0),addressInput=useRef<HTMLInputElement>(null);
 const focusTarget=useRef<string|null>(null);
 const [searchOpen,setSearchOpen]=useState(false);
 const [evaluatedInput,setEvaluatedInput]=useState(initialInput),[chainReady,setChainReady]=useState(false);
 const [requestId,setRequestId]=useState(0);
 const idle=result.state==='idle',supported=result.state==='supported',hasResult=supported||chainReady;
 useEffect(()=>{
  function fromHistory(){cancelPaste();const values=new URL(location.href).searchParams.getAll('mint'),next=evaluateInput(values.length>1?values:values[0]);setInput(values.length===1?values[0]:'');setEvaluatedInput(values.length===1?values[0]:'');setSearchOpen(false);setChainReady(false);focusTarget.current=next.state==='idle'?'welcome-title':'answer-title';setResult(next);setAnnouncement('');}
  window.addEventListener('popstate',fromHistory);return()=>window.removeEventListener('popstate',fromHistory);
 },[]);
 useEffect(()=>()=>{pasteEpoch.current++;},[]);
 function cancelPaste(){pasteEpoch.current++;setPasting(false);setPasteStatus('');}
 async function pasteAddress(){
  // Read only on an explicit gesture. Never submit, trim, extract or log clipboard text.
  const epoch=++pasteEpoch.current;setPasting(true);setPasteStatus('');
  try{
   if(!navigator.clipboard?.readText)throw Error('native_paste_required');
   const text=await navigator.clipboard.readText();
   if(epoch!==pasteEpoch.current)return;
   if(!text||text.length>120){setPasteStatus(text?'Clipboard text is too long. Paste only the token address.':'Clipboard is empty. Copy a token address first.');return;}
   setInput(text);setPasteStatus('Pasted. Choose Explain this token to check the address.');
  }catch{
   if(epoch!==pasteEpoch.current)return;
   setPasteStatus('Touch and hold the address field, then choose Paste. You can also type the address.');addressInput.current?.focus();
  }finally{if(epoch===pasteEpoch.current)setPasting(false);}
 }
 useEffect(()=>{
  document.title=supported?`${result.evidence.token.symbol} explained · captured 14 Oct 2026`:'Understand a Solana token';
  const target=focusTarget.current;
  if(target){focusTarget.current=null;const node=document.getElementById(target);node?.focus({preventScroll:target!=='mint'});if(node instanceof HTMLInputElement)node.select();if(target==='answer-title'||target==='welcome-title')window.scrollTo({top:0,behavior:'instant'});}
 },[result,supported,searchOpen,chainReady]);
 function lookup(raw:string){
  cancelPaste();
  const next=evaluateInput(raw);setInput(raw);setEvaluatedInput(raw);setChainReady(false);setRequestId(v=>v+1);setResult(next);setSearchOpen(false);focusTarget.current='answer-title';
  setAnnouncement(next.state==='supported'?`Captured ${next.evidence.token.symbol} example opened. Not live data.`:'Request evaluated.');
  const url=next.state==='supported'?sharePath(next.evidence.token.mint):next.state==='unsupported'&&unavailableMintFacts(raw)?addressQuery(raw):'/';
  if(url!==location.pathname+location.search+location.hash)history.pushState({},'',url);
  if(document.activeElement instanceof HTMLInputElement)document.activeElement.blur();
 }
 function toggleSearch(){cancelPaste();focusTarget.current=searchOpen?'search-another':'mint';setSearchOpen(!searchOpen);if(searchOpen&&hasResult)setInput(supported?result.evidence.token.mint:evaluatedInput);}
 function reviewAddress(){cancelPaste();focusTarget.current='mint';setSearchOpen(true);if(addressInput.current&&!addressInput.current.closest('form')?.hidden){addressInput.current.focus();addressInput.current.select();}}
 function startOver(){cancelPaste();focusTarget.current='welcome-title';setSearchOpen(false);setInput('');setEvaluatedInput('');setChainReady(false);setResult({state:'idle'});setAnnouncement('');}
 return <div className="consumer-home">
  <a className="skip-link" href="#content">Skip to content</a>
  <header className="site-header"><Link className="wordmark" href="/" prefetch={false} aria-label="Start over" onClick={startOver}>{hasResult?'Start over':<>Token explained<span aria-hidden="true">.</span></>}</Link>{hasResult?<button id="search-another" type="button" className="secondary search-toggle" aria-expanded={searchOpen} aria-controls="token-search" onClick={toggleSearch}>Search another token</button>:<span className="preview-label">Read-only</span>}</header>
  <main id="content" className={idle?'':hasResult&&!searchOpen?'has-answer result-compact':'has-answer'} tabIndex={-1}>
   {idle&&<section className="welcome" aria-labelledby="welcome-title"><p className="eyebrow">LESS GUESSWORK. MORE UNDERSTANDING.</p><h1 id="welcome-title" tabIndex={-1}>A token address.<br/><span>A clear answer.</span></h1><p className="intro">Check Solana token supply and controls. See the source and what it cannot prove.</p></section>}
   {supported&&!chainReady&&<div className="capture-notice"><span className="notice-dot" aria-hidden="true"/><span><strong>Captured examples, not live data.</strong> 14 Oct 2026 · stale.</span></div>}
   <form id="token-search" aria-label="Explain a token" hidden={hasResult&&!searchOpen} onKeyDown={event=>{if(hasResult&&event.key==='Escape'){event.preventDefault();toggleSearch();}}} noValidate onSubmit={event=>{event.preventDefault();lookup(input);}}>
    <label htmlFor="mint">Token address</label><div className="search-row"><div className="address-entry"><input ref={addressInput} id="mint" name="mint" type="text" value={input} onChange={event=>{cancelPaste();setInput(event.target.value);}} placeholder="Paste a token address" autoComplete="off" autoCapitalize="off" autoCorrect="off" inputMode="text" enterKeyHint="go" spellCheck={false} maxLength={120} aria-describedby="mint-help paste-status lookup-status" aria-invalid={['empty','invalid','needs_mint'].includes(result.state)?true:undefined}/><button type="button" className="paste-address" disabled={pasting} onClick={()=>void pasteAddress()} aria-label="Paste token address">{pasting?'Reading…':'Paste'}</button></div><button type="submit" className="primary" aria-label="Explain this token">Explain this token <span aria-hidden="true">→</span></button></div>
    <p id="paste-status" className="paste-status" role="status">{pasteStatus}</p>
    <p id="mint-help" className="field-help">Exact Solana address, not a name or ticker.</p>
    {hasResult&&searchOpen&&<button type="button" className="secondary cancel-search" onClick={toggleSearch}>Cancel search</button>}
   </form>
   <p id="lookup-status" className="sr-only" role="status" aria-live="polite">{announcement}</p>
   {supported?(chainReady?[
    <OnchainCheck key={'chain-'+result.evidence.token.mint+'-'+requestId} mint={result.evidence.token.mint} port={onchainPort} onEditAddress={reviewAddress} onVerified={ready=>{if(ready!==chainReady){if(ready&&!searchOpen&&!pasting)focusTarget.current='answer-title';setChainReady(ready);}}}/>,
    <details key="dated-provider" className="mint-history-disclosure"><summary>Separate StonkFun evidence · 14 Oct 2026 · stale</summary><Explanation evidence={result.evidence} disclosed/></details>
   ]:[<Explanation key="dated-provider" evidence={result.evidence}/>,<OnchainCheck key={'chain-'+result.evidence.token.mint+'-'+requestId} mint={result.evidence.token.mint} historical port={onchainPort} onEditAddress={reviewAddress} onVerified={ready=>{if(ready){if(!searchOpen&&!pasting)focusTarget.current='answer-title';setChainReady(true);}}}/>]):result.state==='unsupported'?<OnchainCheck key={evaluatedInput+'-'+requestId} mint={evaluatedInput} port={onchainPort} onEditAddress={reviewAddress} onVerified={ready=>{if(!ready)setChainReady(false);else if(input===evaluatedInput&&!searchOpen&&!pasting&&document.activeElement?.id!=='mint'){focusTarget.current='answer-title';setChainReady(true);}}}/>:result.state!=='idle'&&<div className="error-card"><h1 id="answer-title" tabIndex={-1}>{messages[result.state][0]}</h1><p>{messages[result.state][1]}</p>{result.state==='unavailable'&&<button type="button" className="secondary" onClick={()=>lookup(input)}>Try again</button>}</div>}
   {!hasResult&&<section className="discovery" aria-labelledby="discovery-title"><div className="section-label"><h2 id="discovery-title" tabIndex={-1}>Explore an example</h2><span>3 dated examples</span></div><p className="small-note example-capture-date">{result.state==='unsupported'?'Not in these examples. ':''}StonkFun capture · 14 Oct 2026 · stale, not live.</p><div className="example-list">{examples.map(e=><button type="button" className="example-button" key={e.mint} onClick={()=>lookup(e.mint)} aria-label={`Explain ${e.name} (${e.symbol}), captured ${e.quoteSymbol} pair`}><span className="example-icon" aria-hidden="true">{e.symbol}</span><span className="example-name">{e.name}</span><span className="example-quote">with {e.quoteSymbol}</span><span className="example-arrow" aria-hidden="true">→</span></button>)}</div><p className="small-note">Selected examples, not a ranking or a complete token list. Metadata rights unverified; financial figures withheld.</p></section>}
   <noscript><p className="small-note">The dated provider explanation is readable without JavaScript. Onchain facts have not loaded; enable JavaScript to request the server check. No token facts are inferred from an address.</p></noscript>
  </main>
  <footer className="site-footer"><span>Understanding first. No trading or wallet connection.</span><nav aria-label="Technical research"><a href={legacyPath(supported?result.evidence.token.mint:evaluatedInput)}>Research terminal</a><a href="/research/history">Source index</a></nav></footer>
 </div>;
}
