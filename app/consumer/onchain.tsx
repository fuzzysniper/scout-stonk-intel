'use client';
import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import type {MintFactsV1} from '../../lib/onchain-mint/contract';
import {addressQuery,explorerAddress,failureCopy,projectMintFacts,type DisplayContext,type MintView} from './onchain-model';
import {productionMintFactsPort,type MintFactsPort} from './onchain-client';
import {concernSummary} from './trader-model';

function closeEvidence(event:KeyboardEvent<HTMLDetailsElement>){
 if(event.key==='Escape'){event.stopPropagation();event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}
}
function checkedTimeLabel(iso:string){
 return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZone:'UTC'}).format(new Date(iso))+' UTC';
}
function recoveryHint(view:Extract<MintView,{kind:'unavailable'|'unsupported'}>,waiting:boolean){
 if(view.kind==='unsupported')return 'Review the exact token address. A wallet, pool or other account may not be a supported token mint.';
 if(['disabled','missing_api','access_denied'].includes(view.reason))return 'No verdict on this token. You can still explore a clearly dated example below.';
 if(view.reason==='stale_source')return 'Check again for a fresh response. Expired facts stay hidden; nothing refreshes automatically.';
 if(['rate_limited','admission_limited','circuit_open'].includes(view.reason))return waiting?'Wait for the countdown, then choose Check again. No request starts automatically.':'Requests are paused. Choose Check again when ready; nothing retries automatically.';
 return 'A failed check is not a verdict on the token. You can try the check again.';
}
function EvidenceDetails({value}:{value:Extract<MintFactsV1,{facts:object}>}){
 const {facts:f,source:s}=value;
 const fields=(rows:readonly (readonly [string,string])[])=>rows.map(([label,text])=><div key={label}><dt>{label}</dt><dd>{text}</dd></div>);
 return <details className="mint-details" onKeyDown={closeEvidence}><summary>Evidence &amp; exact address</summary>
  <p>Match the full token address. Names and tickers can repeat.</p>
  <dl>{fields([['Token address',value.mint],['Network','Solana mainnet'],['RPC host',s.endpointHost],['Checked · host UTC',s.checkedAt],['Finalized context slot',s.contextSlot]])}</dl>
  <a className="mint-explorer" href={explorerAddress(value.mint)} target="_blank" rel="noopener noreferrer">Verify address in Solana Explorer ↗</a>
  <details className="mint-technical" onKeyDown={closeEvidence}><summary>Technical receipt &amp; controls</summary><dl>{fields([
   ['Token program',f.ownerProgram],['Exact decimal supply · token units',f.supply.decimalAmount],['Raw supply · base units',f.supply.raw],['Decimals',String(f.supply.decimals)],['Mint authority',f.mintAuthority.address??'Absent at this slot'],['Freeze authority',f.freezeAuthority.address??'Absent at this slot'],['Extension review',f.extensions.assessment],['Extensions',f.extensions.names.join(', ')||'None reported in supported layout'],['Acquisition',s.acquisition??'Not supplied'],['Method / encoding','getAccountInfo / jsonParsed'],['Commitment requested','finalized'],['Request started · host UTC',s.requestStartedAt],['Response received · host UTC',s.responseReceivedAt],['Evaluated · host UTC',s.evaluatedAt],['HTTP Date · transport clock',s.httpDate??'Not supplied'],['Slot time / last account change','Not supplied by this method'],['Response SHA-256',s.responseSha256]
  ])}</dl></details>
  <p>A context slot is a snapshot boundary, not the last time this mint changed. The RPC report has not been independently replayed. A hash identifies response bytes, not project identity or an entitlement.</p>
 </details>;
}
/** Actual shared-contract renderer. Offline context is always visibly labeled and is never selected by the homepage URL. */
export function MintFactsPanel({view,mint,context='production',primary=true,onRetry,onEditAddress,retryDisabled=false,retryInSeconds=0}:{view:MintView|'loading';mint:string;context?:DisplayContext;primary?:boolean;onRetry?:()=>void;onEditAddress?:()=>void;retryDisabled?:boolean;retryInSeconds?:number}){
 const [copyStatus,setCopyStatus]=useState(''),[manual,setManual]=useState('');const linkInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(manual){linkInput.current?.focus();linkInput.current?.select();}},[manual]);
 const Heading=primary?'h1':'h2',facts=view!=='loading'&&view.kind==='facts'?view:null;
 const [title,description]=view==='loading'?['Checking the address','Waiting for public supply and token-control fields. No facts have been accepted yet.']:facts?['A Solana token','']:failureCopy(view as Extract<MintView,{kind:'unavailable'|'unsupported'}>);
 async function copy(){const url=new URL(addressQuery(mint),location.origin).href;try{await navigator.clipboard.writeText(url);setCopyStatus('Address link copied. A shared link does not freeze or verify a snapshot.');}catch{setManual(url);setCopyStatus('Select and copy the address link below.');}}
 return <section className={'mint-panel '+(facts?'mint-panel-facts':'mint-panel-unavailable')} aria-label="Onchain mint facts" aria-busy={view==='loading'}>
  {(context==='synthetic-offline'||facts?.offline||facts?.value.source.acquisition==='synthetic_fixture')&&<p className="mint-offline" role="note">SYNTHETIC · OFFLINE TEST — invented test values, no live RPC.</p>}
  <p className="sr-only" role="status">{facts?(facts.offline?'Synthetic offline test values, not a live observation. ':'')+'Token supply and controls received. Project identity and holder payments remain unverified.':title+'. No accepted token facts are shown.'}</p>
  <div className="mint-title-row"><Heading id={primary?'answer-title':undefined} tabIndex={primary?-1:undefined}>{title}</Heading><button type="button" className="secondary" onClick={()=>void copy()}>Copy address link</button></div>
  <div className="mint-identity"><span>{facts?'Exact token address':'Requested token address'}</span><code dir="ltr" translate="no">{mint}</code></div>
  {facts?<>
   <p className="mint-subtitle">{facts.offline?'Offline test':facts.value.source.endpointHost==='mainnet.helius-rpc.com'?'Helius RPC report':'RPC report'} · Solana mainnet · {facts.value.facts.program==='token_2022'?'Token-2022':'Token Program'}</p>
   <p className="mint-meaning">Token units do not prove shares, asset backing or payout rights.</p>
   <a className="trader-concern-jump" href="#research-concerns" onClick={event=>{const target=document.getElementById('research-concerns');if(target){event.preventDefault();target.focus();target.scrollIntoView({block:'start',behavior:'instant'});}}}>{concernSummary(facts)} ↓</a>
   <div className="mint-supply"><span>Observed supply · token units</span><strong>{facts.supply}</strong><small>Exact quantity at the slot below. Not a price or anyone’s balance.</small></div>
   <dl className="mint-authorities">
    <div><dt>More tokens possible?</dt><dd>{facts.value.status==='unsupported_extensions'?'Other controls unreviewed':facts.value.facts.mintAuthority.state==='present'?'Yes, a control is present':'Standard control absent'}<small>{facts.value.facts.mintAuthority.state==='present'?'Mint authority present':'Mint authority absent'}</small></dd></div>
    <div><dt>Accounts can be frozen?</dt><dd>{facts.value.status==='unsupported_extensions'?'Other controls unreviewed':facts.value.facts.freezeAuthority.state==='present'?'Yes, a control is present':'Standard control absent'}<small>{facts.value.facts.freezeAuthority.state==='present'?'Freeze authority present':'Freeze authority absent'}</small></dd></div>
   </dl>
   <p className="mint-limit">{facts.value.status==='unsupported_extensions'?'Extensions unreviewed (Token-2022). These fields do not establish all issuance, transfer or freeze controls.':facts.value.facts.extensions.assessment==='reviewed_metadata_pointer'?'Only the MetadataPointer layout is reviewed; its pointer does not verify a name or project. Authority absence does not establish unrestricted transfers.':'These controls do not verify the project or prove transfers are unrestricted.'}</p>
   <div className="mint-observed"><span>Solana snapshot · finalized slot <strong>{facts.value.source.contextSlot}</strong></span><span>Checked by server <time dateTime={facts.value.source.checkedAt}>{checkedTimeLabel(facts.value.source.checkedAt)}</time></span></div>
   <p className="mint-boundary">RPC report, not independently replayed. Identity and holder payments remain unverified. Slot time unknown.</p>
   <EvidenceDetails value={facts.value}/>
  </>:<>
   <p className="mint-description">{description}</p>
   <p className="mint-recovery">{view==='loading'?'No wallet connection is needed. Nothing retries in the background.':recoveryHint(view as Extract<MintView,{kind:'unavailable'|'unsupported'}>,retryDisabled)}</p>
   {view!=='loading'&&view.kind==='unavailable'&&!['disabled','missing_api'].includes(view.reason)&&onRetry&&<button className="secondary mint-retry" type="button" disabled={retryDisabled} onClick={onRetry}>{retryDisabled?`Check again in ${retryInSeconds}s`:'Check again'}</button>}
   {view!=='loading'&&view.kind==='unsupported'&&onEditAddress&&<button className="secondary mint-retry" type="button" onClick={onEditAddress}>Review token address</button>}
   {view!=='loading'&&(view.kind==='unsupported'||view.kind==='unavailable'&&['disabled','missing_api','access_denied'].includes(view.reason))&&<a className="mint-example-link" href="#discovery-title">Explore dated examples ↓</a>}
   <div className="mint-observed"><span>Checked slot: <strong>Unavailable</strong></span><span>Checked time: <strong>No accepted observation</strong></span></div>
   <p className="mint-limit">Supply, mint/freeze authorities and Token-2022 controls are unknown. A failed check does not prove that an address does not exist.</p>
   <details className="mint-details"><summary>Address &amp; verification limits</summary><p className="mono">{mint}</p><p>Mint authority can permit new issuance. Freeze authority can permit freezing token accounts. Neither presence nor absence establishes all controls or a holder payment entitlement. No numeric supply or authority default is substituted for missing evidence.</p><a className="mint-explorer" href={explorerAddress(mint)} target="_blank" rel="noopener noreferrer">Open address in Solana Explorer ↗</a></details>

  </>}
  <p className="copy-status" role="status">{copyStatus}</p>{manual&&<div className="share-fallback"><label htmlFor={'mint-share-'+(primary?'main':'secondary')}>Copy this address link</label><input ref={linkInput} id={'mint-share-'+(primary?'main':'secondary')} value={manual} readOnly/></div>}
 </section>;
}
/** Fixed API client; no RPC import, source activation, credential or test data. */
export function OnchainCheck({mint,historical=false,port=productionMintFactsPort,onVerified,onEditAddress,onView}:{mint:string;historical?:boolean;port?:MintFactsPort;onVerified?:(verified:boolean)=>void;onEditAddress?:()=>void;onView?:(view:MintView|'loading')=>void}){
 const [hydrated,setHydrated]=useState(false);
 const [view,setView]=useState<MintView|'loading'>({kind:'unavailable',reason:'disabled'}),[attempt,setAttempt]=useState(0),[retryAt,setRetryAt]=useState(0),[tick,setTick]=useState(0);
 const observer=useRef(onView);observer.current=onView;
 useEffect(()=>{observer.current?.(hydrated?view:'loading');},[hydrated,view]);
 const active=useRef(0),report=useRef(onVerified),latest=useRef(view);report.current=onVerified;latest.current=view;
 useEffect(()=>{
  const generation=++active.current,controller=new AbortController();let alive=true,expiry:ReturnType<typeof setTimeout>|undefined;
  setHydrated(true);setView('loading');report.current?.(false);
  void port.read(mint,controller.signal).then(outcome=>{
   if(!alive||generation!==active.current)return;
   let next=projectMintFacts(outcome.body,mint,Date.now(),port.context,outcome.httpStatus);
   if(outcome.httpStatus===429){next={kind:'unavailable',reason:'rate_limited'};setRetryAt(Date.now()+(outcome.retryMs??30_000));}
   setView(next);report.current?.(next.kind==='facts');
   if(next.kind==='facts')expiry=setTimeout(()=>{if(alive){setView({kind:'unavailable',reason:'stale_source'});report.current?.(false);}},Math.max(0,next.expiresAt-Date.now()+1));
  }).catch(()=>{if(alive){setView({kind:'unavailable',reason:'network_unavailable'});report.current?.(false);}});
  return()=>{alive=false;controller.abort();if(expiry)clearTimeout(expiry);};
 },[mint,port,attempt]);
 useEffect(()=>{if(retryAt<=Date.now())return;const t=setTimeout(()=>setTick(v=>v+1),Math.min(1000,retryAt-Date.now()+1));return()=>clearTimeout(t);},[retryAt,tick]);
 // Re-evaluate acquisition age after tab suspension/clock changes without any automatic network retry.
 useEffect(()=>{const check=()=>{const v=latest.current;if(v==='loading'||v.kind!=='facts')return;const checked=Date.parse(v.value.source.checkedAt);if(Date.now()>v.expiresAt||Date.now()<checked-1000){setView({kind:'unavailable',reason:'stale_source'});report.current?.(false);}};window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);return()=>{window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);};},[]);
 const retryInSeconds=Math.max(0,Math.ceil((retryAt-Date.now())/1000));
 if(historical&&view!=='loading'&&view.kind!=='facts')return <section className="mint-historical-status" aria-label="Separate onchain check"><h2>{failureCopy(view)[0]}</h2><p role="status">Current supply and authorities are unknown. Checked slot/time unavailable.</p><p>The separate StonkFun capture is dated 14 Oct 2026; it does not verify current blockchain facts.</p>{view.kind==='unavailable'&&!['disabled','missing_api'].includes(view.reason)&&<button className="secondary mint-retry" type="button" disabled={retryInSeconds>0} onClick={()=>setAttempt(v=>v+1)}>{retryInSeconds>0?`Check again in ${retryInSeconds}s`:'Check again'}</button>}</section>;
 return <>{!hydrated&&<p className="mint-ssr-note">Onchain facts have not loaded. JavaScript is required to request the server check; no mint facts are inferred from this address.</p>}<MintFactsPanel view={view} mint={mint} context={port.context} primary={!historical} onRetry={()=>setAttempt(v=>v+1)} onEditAddress={onEditAddress} retryDisabled={retryInSeconds>0} retryInSeconds={retryInSeconds}/></>;
}
/** Baseline-compatible SSR availability export; its short form replaces the repetitive old panel. */
export function OnchainUnavailable({mint,historical=false}:{mint:string;historical?:boolean}){return <OnchainCheck mint={mint} historical={historical}/>;}
