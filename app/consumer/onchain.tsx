'use client';
import {useEffect,useRef,useState} from 'react';
import type {MintFactsV1} from '../../lib/onchain-mint/contract';
import {addressQuery,explorerAddress,failureCopy,projectMintFacts,type DisplayContext,type MintView} from './onchain-model';
import {productionMintFactsPort,type MintFactsPort} from './onchain-client';

function EvidenceDetails({value}:{value:Extract<MintFactsV1,{facts:object}>}){
 const {facts:f,source:s}=value;
 return <details className="mint-details" onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();}}}><summary>Evidence &amp; exact address</summary><dl>
  {[['Token address',value.mint],['Network','Solana mainnet'],['Token program',f.ownerProgram],['Exact decimal supply · token units',f.supply.decimalAmount],['Raw supply · base units',f.supply.raw],['Decimals',String(f.supply.decimals)],['Mint authority',f.mintAuthority.address??'Absent at this slot'],['Freeze authority',f.freezeAuthority.address??'Absent at this slot'],['Extension review',f.extensions.assessment],['Extensions',f.extensions.names.join(', ')||'None reported in supported layout'],['RPC host',s.endpointHost],['Acquisition',s.acquisition??'Not supplied'],['Method / encoding','getAccountInfo / jsonParsed'],['Commitment requested','finalized'],['Finalized context slot',s.contextSlot],['Checked · host UTC',s.checkedAt],['Request started · host UTC',s.requestStartedAt],['Response received · host UTC',s.responseReceivedAt],['Evaluated · host UTC',s.evaluatedAt],['HTTP Date · transport clock',s.httpDate??'Not supplied'],['Slot time / last account change','Not supplied by this method'],['Response SHA-256',s.responseSha256]].map(([label,text])=><div key={label}><dt>{label}</dt><dd>{text}</dd></div>)}
 </dl><p>A context slot is a snapshot boundary, not the last time this mint changed. The RPC report has not been independently replayed. A hash identifies response bytes, not project identity or an entitlement.</p></details>;
}
/** Actual shared-contract renderer. Offline context is always visibly labeled and is never selected by the homepage URL. */
export function MintFactsPanel({view,mint,context='production',primary=true,onRetry,retryDisabled=false}:{view:MintView|'loading';mint:string;context?:DisplayContext;primary?:boolean;onRetry?:()=>void;retryDisabled?:boolean}){
 const [copyStatus,setCopyStatus]=useState(''),[manual,setManual]=useState('');const linkInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(manual){linkInput.current?.focus();linkInput.current?.select();}},[manual]);
 const Heading=primary?'h1':'h2',facts=view!=='loading'&&view.kind==='facts'?view:null;
 const [title,description]=view==='loading'?['Checking the address','Waiting for a source response. No mint facts have been verified.']:facts?[facts.value.status==='unsupported_extensions'?'Token controls need review':'Onchain facts explained','']:failureCopy(view as Extract<MintView,{kind:'unavailable'|'unsupported'}>);
 async function copy(){const url=new URL(addressQuery(mint),location.origin).href;try{await navigator.clipboard.writeText(url);setCopyStatus('Address link copied. A shared link does not freeze or verify a snapshot.');}catch{setManual(url);setCopyStatus('Select and copy the address link below.');}}
 return <section className={'mint-panel '+(facts?'mint-panel-facts':'mint-panel-unavailable')} aria-label="Onchain mint facts" aria-busy={view==='loading'}>
  {(context==='synthetic-offline'||facts?.offline||facts?.value.source.acquisition==='synthetic_fixture')&&<p className="mint-offline" role="note">SYNTHETIC · OFFLINE TEST — invented test values, no live RPC.</p>}
  <div className="mint-title-row"><Heading id={primary?'answer-title':undefined} tabIndex={primary?-1:undefined}>{title}</Heading><button type="button" className="secondary" onClick={()=>void copy()}>Copy address link</button></div>
  {facts?<>
   <p className="mint-subtitle">{facts.offline?'Offline test':facts.value.source.endpointHost==='mainnet.helius-rpc.com'?'Helius RPC report':'RPC report'} · Solana mainnet · {facts.value.facts.program==='token_2022'?'Token-2022':'Token Program'}</p>
   <p className="mint-meaning">A mint identifies token units. It does not verify shares, gold backing or payout rights.</p>
   <div className="mint-supply"><span>Observed supply · token units</span><strong>{facts.supply}</strong><small>Exact quantity at the slot below. Not a price or anyone’s balance.</small></div>
   <dl className="mint-authorities">
    <div><dt>New token issuance</dt><dd>{facts.value.facts.mintAuthority.state==='present'?'Mint authority present':'Mint authority absent'}<small>{facts.value.status==='unsupported_extensions'?'Other issuance controls unreviewed':facts.value.facts.mintAuthority.state==='present'?'Can permit new tokens':'Standard issuance authority absent'}</small></dd></div>
    <div><dt>Account freezing</dt><dd>{facts.value.facts.freezeAuthority.state==='present'?'Freeze authority present':'Freeze authority absent'}<small>{facts.value.status==='unsupported_extensions'?'Other freeze controls unreviewed':facts.value.facts.freezeAuthority.state==='present'?'Can permit freezing accounts':'No standard freeze authority'}</small></dd></div>
   </dl>
   <p className="mint-limit">{facts.value.status==='unsupported_extensions'?'Extensions unreviewed. Base authorities do not establish all issuance, transfer or freeze controls.':facts.value.facts.extensions.assessment==='reviewed_metadata_pointer'?'Only the MetadataPointer layout is reviewed; its pointer does not verify a name or project. Authority absence does not establish unrestricted transfers.':'These are standard authority fields at this slot. Authority absence does not establish unrestricted transfers or project quality.'}</p>
   <div className="mint-observed"><span>Finalized context slot <strong>{facts.value.source.contextSlot}</strong></span><span>Checked · host UTC <time dateTime={facts.value.source.checkedAt}>{facts.value.source.checkedAt}</time></span></div>
   <p className="mint-boundary">RPC report, not independently replayed. Project identity, value and holder payments remain unverified. Slot time is unavailable.</p>
   <a className="mint-explorer" href={explorerAddress(mint)} target="_blank" rel="noopener noreferrer">Verify address in Solana Explorer ↗</a>
   <EvidenceDetails value={facts.value}/>
  </>:<>
   <p className="mint-description">{description}</p>
   <div className="mint-observed"><span>Checked slot: <strong>Unavailable</strong></span><span>Checked time: <strong>No accepted observation</strong></span></div>
   <p className="mint-limit">Supply, mint/freeze authorities and Token-2022 controls are unknown. A failed check does not prove that an address does not exist.</p>
   <details className="mint-details"><summary>Address &amp; verification limits</summary><p className="mono">{mint}</p><p>Mint authority can permit new issuance. Freeze authority can permit freezing token accounts. Neither presence nor absence establishes all controls or a holder payment entitlement. No numeric supply or authority default is substituted for missing evidence.</p><a className="mint-explorer" href={explorerAddress(mint)} target="_blank" rel="noopener noreferrer">Open address in Solana Explorer ↗</a></details>
   {view!=='loading'&&view.kind==='unavailable'&&!['disabled','missing_api'].includes(view.reason)&&onRetry&&<button className="secondary mint-retry" type="button" disabled={retryDisabled} onClick={onRetry}>{retryDisabled?'Wait before checking again':'Check again'}</button>}
  </>}
  <p className="copy-status" role="status">{copyStatus}</p>{manual&&<div className="share-fallback"><label htmlFor={'mint-share-'+(primary?'main':'secondary')}>Copy this address link</label><input ref={linkInput} id={'mint-share-'+(primary?'main':'secondary')} value={manual} readOnly/></div>}
 </section>;
}
/** Fixed API client; no RPC import, source activation, credential or test data. */
export function OnchainCheck({mint,historical=false,port=productionMintFactsPort,onVerified}:{mint:string;historical?:boolean;port?:MintFactsPort;onVerified?:(verified:boolean)=>void}){
 const [hydrated,setHydrated]=useState(false);
 const [view,setView]=useState<MintView|'loading'>({kind:'unavailable',reason:'disabled'}),[attempt,setAttempt]=useState(0),[retryAt,setRetryAt]=useState(0),[tick,setTick]=useState(0);
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
 if(historical&&view!=='loading'&&view.kind!=='facts')return <section className="mint-historical-status" aria-label="Separate onchain check"><h2>{failureCopy(view)[0]}</h2><p>Current supply and authorities are unknown. Checked slot/time unavailable.</p><p>The separate StonkFun capture is dated 14 Oct 2026; it does not verify current blockchain facts.</p></section>;
 return <>{!hydrated&&<p className="mint-ssr-note">Onchain facts have not loaded. JavaScript is required to request the server check; no mint facts are inferred from this address.</p>}<MintFactsPanel view={view} mint={mint} context={port.context} primary={!historical} onRetry={()=>setAttempt(v=>v+1)} retryDisabled={Date.now()<retryAt}/></>;
}
/** Baseline-compatible SSR availability export; its short form replaces the repetitive old panel. */
export function OnchainUnavailable({mint,historical=false}:{mint:string;historical?:boolean}){return <OnchainCheck mint={mint} historical={historical}/>;}
