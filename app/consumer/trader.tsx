'use client';
import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import {OnchainCheck} from './onchain';
import type {MintFactsPort} from './onchain-client';
import {failureCopy,type MintView} from './onchain-model';
import {readWatch,type ResearchRead} from './cards/client';
import type {WatchFinding} from './cards/model';
import {tokenConcerns,usableMintFacts,unverifiedProperties,marketReadiness} from './trader-model';
export type MarketPort=(mint:string,signal:AbortSignal)=>Promise<ResearchRead<WatchFinding>>;
function fold(event:KeyboardEvent<HTMLDetailsElement>){if(event.key==='Escape'){event.stopPropagation();event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}
function BriefArrow({diagonal=false}:{diagonal?:boolean}){return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={diagonal?'M6 18 18 6M6 6h12v12':'M12 5v14m-6-6 6 6 6-6'}/></svg>;}
/** Presentation of an already validated view; never an alternative acquisition/validation path. */
export function ScoutBrief({view,mint}:{view:MintView|'loading';mint:string}){
 const gated=view!=='loading'&&view.kind==='unavailable'&&['disabled','missing_api','access_denied'].includes(view.reason);
 const unavailableStatus=view==='loading'?'Checking source…':view.kind==='facts'?'Observation expired':failureCopy(view)[0];
 const now=Date.now(),accepted=usableMintFacts(view,now),concerns=tokenConcerns(view,now),facts=accepted?view.value.facts:null;
 const status=accepted?(view.offline?'Offline test snapshot':'RPC snapshot accepted'):unavailableStatus;
 function jump(id:string){const target=document.getElementById(id);if(target){target.focus();target.scrollIntoView({block:'start',behavior:'instant'});}}
 return <section className="scout-brief" aria-labelledby="brief-title" aria-busy={view==='loading'}>
  <div className="brief-top"><p className="trader-kicker">YOUR EXACT-MINT RESEARCH</p><span className={'brief-status '+(accepted?'accepted':'')}><span aria-hidden="true"/>{status}</span></div>
  <h2 id="brief-title">SCOUT Brief<BriefArrow diagonal/></h2>
  <p className="brief-mint" title={mint}><span>Solana mint</span> <code>{mint.slice(0,6)}…{mint.slice(-6)}</code><span className="sr-only">Full address in onchain evidence below.</span></p>
  {accepted&&view.offline&&<p className="mint-offline">SYNTHETIC · OFFLINE TEST — not live token facts.</p>}
  <p className="brief-summary">{accepted?concerns.length?`${concerns.length} ${concerns.length===1?'check needs':'checks need'} a closer look.`:'Standard authorities absent. Other risks remain.':view==='loading'?'Reading the source. No facts accepted yet.':'No verified token facts. No verdict on this token.'}</p>
  <dl className={'brief-controls '+(view==='loading'?'brief-loading':'')}>
   {[['New supply',facts?.mintAuthority.state==='present'?'Authority present':facts?'Standard authority absent':'Unknown'],['Freezing',facts?.freezeAuthority.state==='present'?'Authority present':facts?'Standard authority absent':'Unknown'],['Extensions',facts?.extensions.assessment==='unreviewed'?'Not fully reviewed':facts?.extensions.assessment==='reviewed_metadata_pointer'?'Pointer only reviewed':facts?'None in layout':'Unknown']].map(([name,value],index)=><div key={name} data-attention={accepted&&(index===0?facts?.mintAuthority.state==='present':index===1?facts?.freezeAuthority.state==='present':facts?.extensions.assessment==='unreviewed')}><dt>{name}</dt><dd>{view==='loading'?<span className="brief-skeleton" aria-hidden="true"/>:value}</dd></div>)}
  </dl>
  {accepted?<p className="brief-clock">{view.offline?'Offline fixture':'Helius RPC report'} · finalized slot <strong>{view.value.source.contextSlot}</strong><br/>Checked <time dateTime={view.value.source.checkedAt}>{new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZone:'UTC'}).format(new Date(view.value.source.checkedAt))} UTC</time></p>:<p className="brief-clock">Checked slot and time unavailable. No accepted observation.</p>}
  {!accepted&&view!=='loading'&&<details className="brief-availability" onKeyDown={fold}><summary>{gated?'Public lookups disabled · restricted canary':'Source access & verification limits'}</summary><p>{gated?'The interface is available, but ordinary GET mint checks are disabled. ':''}The owner-operated live canary is USDC-only. This page uses GET and never invokes that POST or proves it succeeded. A failed or expired check cannot establish token controls.</p></details>}
  <p className="brief-boundary">{facts?.extensions.assessment==='unreviewed'?'Token-2022 controls are not fully reviewed. ':''}Holder concentration, liquidity control and sellability remain unknown. No safety score.</p>
  <div className="brief-actions"><button type="button" onClick={()=>jump(!accepted&&view!=='loading'?'discovery-title':'research-concerns')}>{!accepted&&view!=='loading'?'Explore dated examples':'Review concerns'} <BriefArrow/></button><button type="button" onClick={()=>jump('research-onchain')}>Onchain evidence <BriefArrow diagonal/></button></div>
 </section>;
}
function ObservedConcerns({view}:{view:MintView|'loading'}){
 const now=Date.now(),concerns=tokenConcerns(view,now),accepted=usableMintFacts(view,now);
 return <section id="research-concerns" className="trader-section trader-concerns" aria-labelledby="concerns-title" tabIndex={-1}><p className="trader-kicker">UNDERSTAND</p><h2 id="concerns-title">What needs attention</h2>
  {!accepted?<p>Controls are not verified. No token-specific concern or reassuring default can be established from this check.</p>:!concerns.length?<p>Standard mint and freeze authorities were absent at the checked slot. That does not rule out other risks or establish safe trading.</p>:<ul className="trader-concern-list">{concerns.map(c=><li key={c.id}><h3><span aria-hidden="true">!</span>{c.title}</h3><p>{c.explanation}</p><details onKeyDown={fold}><summary>Why this is flagged</summary>{c.synthetic&&<p className="mint-offline">SYNTHETIC OFFLINE evidence, not a live observation.</p>}<dl><div><dt>Exact fact</dt><dd>{c.field}</dd></div><div><dt>Observed value</dt><dd>{c.trigger}</dd></div><div><dt>Exact mint</dt><dd>{c.mint}</dd></div><div><dt>Finalized context slot</dt><dd>{c.slot}</dd></div><div><dt>Checked · server UTC</dt><dd>{c.checkedAt}</dd></div><div><dt>Source / response SHA-256</dt><dd>{c.sourceHost} · {c.responseSha256}</dd></div></dl></details></li>)}</ul>}
  <p className="trader-note">Fact-triggered concerns, not a safety score, prediction or rug-pull verdict. Authority addresses are not identified people.</p>
 </section>;
}
// Future approved market metrics belong in this section only after rights/identity/clock review.
function MarketEvidence({mint,port=readWatch}:{mint:string;port?:MarketPort}){
 const [value,setValue]=useState<ResearchRead<WatchFinding>|'loading'>('loading'),[attempt,setAttempt]=useState(0),[now,setNow]=useState(0),[copy,setCopy]=useState('');const generation=useRef(0);
 useEffect(()=>{const current=++generation.current,abort=new AbortController();let alive=true;setValue('loading');setCopy('');
  void port(mint,abort.signal).then(result=>{if(alive&&current===generation.current){setNow(Date.now());setValue(result);}}).catch(()=>{if(alive&&current===generation.current){setNow(Date.now());setValue({state:'unavailable',retryAt:Date.now()+60000});}});
  return()=>{alive=false;abort.abort();};
 },[mint,port,attempt]);
 useEffect(()=>{const tick=()=>setNow(Date.now());const id=setInterval(tick,1000);window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(id);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',tick);};},[]);
 const record=value!=='loading'&&value.state==='ready'?value.value:null,quality=record?marketReadiness(record,now):null;
 const waiting=value!=='loading'&&value.state!=='ready'&&now<value.retryAt;
 const seconds=value!=='loading'&&value.state!=='ready'?Math.max(0,Math.ceil((value.retryAt-now)/1000)):0;
 const invalid=quality==='invalid_clock'||quality==='invalid_identity',stale=quality==='stale_response';
 const label=value==='loading'?'Checking market source…':value.state==='rate_limited'?'Market check paused':value.state==='invalid_response'?'Market response could not be verified':value.state!=='ready'?'Market source unavailable':invalid?quality==='invalid_identity'?'Market identity could not be verified':'Market source clock unverified':stale?'Dated market response':quality==='quote_side'?'Address appears as a quote asset':quality==='no_match'?'No market match returned':'A matching pool was reported';
 async function copyMint(){try{await navigator.clipboard.writeText(mint);setCopy('Exact token address copied.');}catch{setCopy('Clipboard unavailable. Select the full exact token address in the onchain section above.');}}
 return <section className="trader-section trader-market" aria-labelledby="market-title" aria-busy={value==='loading'}><p className="trader-kicker">MARKET OBSERVATIONS</p><h2 id="market-title">Market evidence</h2><p className="trader-market-status" role="status">{label}</p>
  {record&&!invalid?<><p>{record.state==='quote_side'?'This pool describes another base token. Its price movement and capitalization do not describe your requested mint.':record.state==='not_found'?'No pool was returned by this adapter. This is not proof the mint is invalid or has no markets.':'DexScreener reported this mint as the base token in one selected Solana pool. This is not project verification or complete market coverage.'}</p>
  {record.state==='matched'&&<p className="trader-source-label">Provider label: <strong>{record.name} ({record.symbol})</strong> · unverified project identity</p>}
  <p className="trader-note">Retrieved <time dateTime={record.retrievedAt}>{record.retrievedAt}</time>. Actual market observation time unavailable. Retrieval does not establish when prices changed.</p></>:<p>No market or price claim has been established. The onchain result remains a separate check.</p>}
  <p className="trader-rights">Liquidity, 24h volume, price movement and market cap are withheld: display rights and actual market timestamps are not established. No price-based concern or performance ranking is inferred.</p>
  <div className="trader-actions"><button className="secondary" type="button" disabled={value==='loading'||waiting} onClick={()=>setAttempt(v=>v+1)}>{waiting?Number.isFinite(seconds)?`Retry market in ${seconds}s`:'Market retry requires review':'Retry market check'}</button><button className="secondary" type="button" onClick={()=>void copyMint()}>Copy exact mint</button></div><p className="copy-status" role="status">{copy}</p>
  <details className="trader-proof" onKeyDown={fold}><summary>Pool identity &amp; source limits</summary><p>Requested mint: <code>{mint}</code></p>{record&&!invalid&&record.pool&&<dl><div><dt>Reported pool</dt><dd>{record.pool}</dd></div><div><dt>Base mint</dt><dd>{record.baseMint}</dd></div><div><dt>Quote mint</dt><dd>{record.quoteMint}</dd></div></dl>}
  <p>Existing adapter: highest reported-liquidity matching Solana pool. Multiple pools, other venues and lower-liquidity markets may be omitted. Quote-side matches cannot inherit another token’s figures. USD snapshot amounts are not exact quote-relative historical returns.</p>
  <a href={'https://api.dexscreener.com/latest/dex/tokens/'+mint} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open exact-mint source · may have changed ↗</a><p>Source access is not permission to redistribute its financial data. This view strips financial quantities; the unchanged existing API may still include them in Network. No RPC, transaction or live price stream is added.</p></details>
 </section>;
}
/** One mint, independent evidence layers. No new backend contract, network activation or stored watchlist. */
export function TokenResearch({mint,historical=false,port,marketPort,onVerified,onEditAddress}:{mint:string;historical?:boolean;port?:MintFactsPort;marketPort?:MarketPort;onVerified?:(verified:boolean)=>void;onEditAddress?:()=>void}){
 const [view,setView]=useState<MintView|'loading'>('loading');
 return <div className="trader-research">{!historical&&<ScoutBrief view={view} mint={mint}/>}<ObservedConcerns view={view}/><div id="research-onchain" className="research-onchain" tabIndex={-1}><p className="trader-kicker">VERIFY / ONCHAIN EVIDENCE</p><OnchainCheck mint={mint} historical={historical} port={port} onVerified={onVerified} onEditAddress={onEditAddress} onView={setView}/></div><MarketEvidence mint={mint} port={marketPort}/><section className="trader-section trader-unknowns" aria-labelledby="unknowns-title"><p className="trader-kicker">KEEP THE LIMITS VISIBLE</p><h2 id="unknowns-title">Still unknown</h2><ul>{unverifiedProperties.map(item=><li key={item.title}><h3>{item.title}</h3><p>{item.detail}</p></li>)}</ul><p className="trader-note">A mint-account check is not a project audit. No wallet connection, trade or personalized recommendation.</p></section></div>;
}
