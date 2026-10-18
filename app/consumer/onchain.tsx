'use client';
import {useRef,useState} from 'react';
import {addressQuery,explorerAddress,mintFactDefinitions,unavailableMintFacts} from './onchain-model';

/** Inactive presentation until the real server contract and activation review land.
 * Unknown is not zero, an absent authority, a supported mint, or a negative verdict.
 */
export function OnchainUnavailable({mint,historical=false}:{mint:string;historical?:boolean}) {
 const observation=unavailableMintFacts(mint),fallback=useRef<HTMLInputElement>(null);
 const [shareStatus,setShareStatus]=useState(''),[manualLink,setManualLink]=useState('');
 if(!observation)return null;
 async function share(){
  const url=new URL(addressQuery(mint),location.origin).href;
  try{await navigator.clipboard.writeText(url);setShareStatus('Link copied. It shares this unchecked address, not a verified token.');}
  catch{setManualLink(url);setShareStatus('Select and copy this unchecked-address link.');requestAnimationFrame(()=>{fallback.current?.focus();fallback.current?.select();});}
 }
 const title='Onchain source unavailable';
 return <section className="onchain-card" aria-label="Separate onchain check">
  {historical?<h2>{title}</h2>:<h1 id="answer-title" tabIndex={-1}>{title}</h1>}
  <p className="onchain-intro">No blockchain check was made. The read-only source is not connected, so this page cannot confirm that this address is a supported token mint.</p>
  {!historical&&<p className="small-note">Not in these examples: only three dated StonkFun records are available.</p>}
  {historical&&<p className="onchain-history-limit">The StonkFun explanation above is a separate, stale 14 Oct 2026 capture. It does not verify current blockchain facts.</p>}
  <div className="onchain-observation"><h2>What we know</h2><p>Only the exact address submitted here.</p><dl>
   <div><dt>Submitted address · unverified</dt><dd className="mono">{observation.mint}</dd></div>
   <div><dt>Checked slot</dt><dd>Not available — no verified response.</dd></div>
   <div><dt>Checked at · UTC</dt><dd>Not available — no check completed.</dd></div>
  </dl></div>
  <section className="onchain-unknowns" aria-label="Onchain unknowns"><h2>What we don’t know</h2><ul>
   <li>Token supply, mint authority and freeze authority have not been checked.</li>
   <li>Token Program / Token-2022 support and additional controls are unverified.</li>
   <li>Mint facts would not prove a project’s identity, safety, asset backing, rewards or payments to holders.</li>
  </ul><p>This is not a finding that the address is fake or that an authority is absent.</p></section>
  <details className="onchain-definitions" onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}><summary>What supply and authorities mean</summary>
   {mintFactDefinitions.map(f=><div key={f.title}><h3>{f.title}</h3><p>{f.text}</p></div>)}
  </details>
  <div className="onchain-record"><h2>Check the record</h2><p>Solana Explorer is a separate tool. Its current page does not update or verify facts here, including any dated provider statements.</p>
   <a className="onchain-explorer" href={explorerAddress(mint)} target="_blank" rel="noopener noreferrer">Open this address on Solana Explorer (new tab)</a>
   <button className="secondary" type="button" onClick={()=>void share()}>Copy address link</button><p role="status" className="copy-status">{shareStatus}</p>
   {manualLink&&<div className="share-fallback"><label htmlFor="unchecked-share-link">Copy this unchecked-address link</label><input id="unchecked-share-link" ref={fallback} className="mono" value={manualLink} readOnly/></div>}
  </div>
 </section>;
}
