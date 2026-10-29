'use client';
import {useEffect,useRef,useState} from 'react';
import type {JournalReceipt} from '../../lib/v4-private-journal/contract';
import type {JournalCapability,ThesisHistory} from '../../lib/v4-thesis-api/client-contract';
type Props={mint:string;capability:JournalCapability;thesis:string;counter:string;onLoad:(thesis:string,counter:string)=>void;onStatus:(status:string)=>void};
const hash=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
function receipt(v:unknown,id:string):v is JournalReceipt{
 const r=v as JournalReceipt;return !!r&&r.journalId===id&&Number.isInteger(r.revision)&&r.revision>=1&&r.revision<=64&&hash(r.storageHead)&&hash(r.eventHash)&&typeof r.recordedAt==='string'&&Number.isFinite(Date.parse(r.recordedAt));
}
export default function JournalControls({mint,capability,thesis,counter,onLoad,onStatus}:Props){
 const [saved,setSaved]=useState<JournalReceipt|null>(null),[history,setHistory]=useState<ThesisHistory|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[denied,setDenied]=useState(false),[uncertain,setUncertain]=useState(false);
 const target=useRef<string|null>(null),active=useRef<AbortController|null>(null),mounted=useRef(true),status=useRef<HTMLParagraphElement>(null);
 const draft=useRef({thesis,counter});useEffect(()=>{draft.current={thesis,counter};},[thesis,counter]);
 const callbacks=useRef({onLoad,onStatus});useEffect(()=>{callbacks.current={onLoad,onStatus};},[onLoad,onStatus]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;active.current?.abort();};},[]);
 useEffect(()=>{if(capability.kind!=='verified_owner')return;const delay=capability.expiresAtMs-Date.now();const expire=()=>{active.current?.abort();setDenied(true);setSaved(null);setHistory(null);callbacks.current.onLoad('','');callbacks.current.onStatus('NOT SAVED');setMessage('Session expired. Private history cleared.');};if(delay<=0){expire();return;}const timer=setTimeout(expire,Math.min(delay,2147483647));return()=>clearTimeout(timer);},[capability]);
 if(capability.kind!=='verified_owner'||!mint)return null;
 async function request(path:string,init:RequestInit={}){
  const controller=new AbortController();active.current=controller;const timer=setTimeout(()=>controller.abort(),5000);
  try{const response=await fetch(path,{...init,credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,headers:{'X-UNFARMD-V4-OWNER-INTENT':'journal',...(init.method?{'Content-Type':'application/json','X-CSRF-Token':capability.kind==='verified_owner'?capability.csrfToken:''}:{}),...init.headers}});
   if(!response.ok)throw Object.assign(Error('journal_request_failed'),{status:response.status});
   const reader=response.body?.getReader();if(!reader)throw Error('invalid_response');const parts:Uint8Array[]=[];let size=0;try{for(;;){const n=await reader.read();if(n.done)break;size+=n.value.byteLength;if(size>262144)throw Error('invalid_response');parts.push(n.value);}}finally{void reader.cancel().catch(()=>{});reader.releaseLock();}
   const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  }finally{clearTimeout(timer);}
 }
 function failure(e:unknown,writing:boolean){
  const code=(e as {status?:number}).status;
  if(code===401||code===403){setDenied(true);setHistory(null);setSaved(null);onLoad('','');onStatus('NOT SAVED');setMessage('Session unavailable. Private history cleared.');}
  else if(code===409)setMessage('Changed elsewhere. Load latest before adding an update. Your draft is unchanged.');
  else if(code===410)setMessage('Thesis unavailable: it may be expired, revoked or missing. No deletion or save is confirmed.');
  else if(code===422||code===400)setMessage('Check your thesis: up to 2,000 characters, counter-evidence up to 1,000. Your draft is unchanged.');
  else if(code===429)setMessage('Journal limit reached. No automatic retry. Your draft is unchanged.');
  else{if(writing)setUncertain(true);setMessage(writing?'Save outcome unknown. Load this thesis before trying again. Your draft stays here.':'Could not load verified history. Your draft is unchanged.');}
 }
 async function run(writing:boolean,work:()=>Promise<void>){if(busy||denied)return;setBusy(true);setMessage('');try{await work();}catch(e){if(mounted.current)failure(e,writing);}finally{if(mounted.current){setBusy(false);requestAnimationFrame(()=>status.current?.focus());}}}
 async function save(){await run(true,async()=>{
  const id=saved?.journalId??target.current??crypto.randomUUID();target.current=id;
  const body=saved?{mint,requestId:crypto.randomUUID(),expectedHead:saved.storageHead,action:'revise',thesis,invalidation:counter||null}:{journalId:id,mint,requestId:crypto.randomUUID(),thesis,invalidation:counter||null};
  const r=await request('/api/v4/theses'+(saved?'/'+id:''),{method:saved?'PATCH':'POST',body:JSON.stringify(body)});
  if(!mounted.current)return;if(r.state!=='appended'||!receipt(r.receipt,id))throw Error('invalid_response');
  setSaved(r.receipt);setHistory(null);setUncertain(false);if(draft.current.thesis!==thesis||draft.current.counter!==counter){onStatus('NOT SAVED');setMessage('Prior draft recorded. Current edits are not saved.');return;}onStatus('SAVED · '+new Date(r.receipt.recordedAt).toLocaleTimeString());setMessage(saved?'Update recorded. Original preserved.':'Thesis saved to your private journal.');
 });}
 async function load(){await run(false,async()=>{
  let id=target.current;
  if(!id){const list=await request('/api/v4/theses?mint='+encodeURIComponent(mint));if(!Array.isArray(list.items)||list.items.length>20)throw Error('invalid_response');const candidate=list.items[0];if(!candidate){setMessage('No matching thesis in the latest 20 owner journals. This is a bounded list.');return;}if(candidate.mint!==mint||typeof candidate.journalId!=='string'||!/^[a-f0-9-]{36}$/.test(candidate.journalId))throw Error('invalid_response');id=candidate.journalId;}
  const r=await request('/api/v4/theses/'+id+'?mint='+encodeURIComponent(mint)) as ThesisHistory;
  if(!mounted.current)return;
  if(r.mint!==mint||r.journalId!==id||!receipt(r.receipt,id!)||!Array.isArray(r.entries)||r.entries.length!==r.receipt.revision||r.entries.some((e,i)=>e.sequence!==i+1||typeof e.recordedAt!=='string'||!hash(e.hash)||(e.thesis!==null&&typeof e.thesis!=='string'))||r.entries[0]?.kind!=='created'||r.entries.at(-1)?.hash!==r.receipt.eventHash)throw Error('invalid_response');
  const latest=[...r.entries].reverse().find(e=>e.thesis!==null);if(!latest)throw Error('invalid_response');
  target.current=id;setSaved(r.receipt);setHistory(r);setUncertain(false);onLoad(latest.thesis!,latest.invalidation??'');onStatus('SAVED · '+new Date(r.receipt.recordedAt).toLocaleTimeString());setMessage('Private history loaded. Original preserved.');
 });}
 return <div aria-label="Private thesis journal">
  <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:16}}>
   <button type="button" disabled={busy||denied||uncertain||!thesis.trim()} onClick={()=>void save()}>{busy?'Working…':saved?'Add update':'Save thesis'}</button>
   <button type="button" disabled={busy||denied} onClick={()=>void load()}>Load thesis</button>
  </div>
  <p id="journal-status" ref={status} tabIndex={-1} role="status" style={{fontSize:13}}>{message}</p>
  {saved?<p style={{fontSize:12}}>Private · revision {saved.revision}. Editing does not overwrite the original.</p>:null}
  {saved&&!history?<button type="button" disabled={busy||denied} onClick={()=>void load()}>View history</button>:null}
  {history?<><details><summary>View original</summary><p style={{whiteSpace:'pre-wrap'}}>{history.entries[0].thesis}</p><time dateTime={history.entries[0].recordedAt}>{new Date(history.entries[0].recordedAt).toLocaleString()}</time></details>
   <details><summary>View history · {history.entries.length} revisions</summary><ol>{history.entries.map(e=><li key={e.hash}><p>Revision {e.sequence} · <time dateTime={e.recordedAt}>{new Date(e.recordedAt).toLocaleString()}</time></p><p style={{whiteSpace:'pre-wrap'}}>{e.thesis??'Recorded journal event'}</p></li>)}</ol></details></>:null}
  <details><summary>Private storage &amp; deletion</summary><p>Expiry is 30 days from creation. A deletion request revokes access and queues erasure. Backups and recovery history can retain ciphertext longer; immediate complete deletion is not promised.</p></details>
 </div>;
}
