'use client';
import {useState} from 'react';
import {tokenResearchUrl} from './pairs/results';

// Called only after an explicit open/submit action, never while typing or on mount.
export function dismissResearchKeyboard(){
 const active=document.activeElement;
 if(active instanceof HTMLElement && active.matches('input,textarea,[contenteditable="true"]'))active.blur();
}
export function ResearchLinkFallback({url,label}:{url:string;label:string}){
 return <div className="research-link-fallback" role="region" aria-label={label} tabIndex={0} onFocus={event=>{
  const range=document.createRange();range.selectNodeContents(event.currentTarget);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);
 }}><code>{url}</code></div>;
}
export function CopyResearchLink({mint,label}:{mint:string;label:string}){
 const [status,setStatus]=useState(''),[manual,setManual]=useState('');
 async function copy(){
  const url=tokenResearchUrl(mint,window.location.origin);setStatus('');setManual('');
  try{await navigator.clipboard.writeText(url);setStatus('Research link copied. Opens this token dossier.');}
  catch{setManual(url);setStatus('Copy unavailable. Select or long-press the research link below.');}
 }
 return <><button type="button" onClick={()=>void copy()} aria-label={'Copy research link for '+label}>Copy research link</button>{status && <p className="research-feedback" role="status">{status}</p>}{manual && <ResearchLinkFallback url={manual} label={'Research link for '+label}/>}</>;
}
