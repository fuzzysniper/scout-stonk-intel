'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchQuoteRegistry } from './client';
import { appendRegistryPage, registrySearch, REGISTRY_WINDOW_LIMIT } from './registry';
import type { PairQuote, PairQuoteRegistry } from './registry';
import { dismissResearchKeyboard } from '../research-actions';

export type VerifiedChoice={quote:PairQuote;registry:PairQuoteRegistry};
const shortMint=(mint:string)=>mint.slice(0,6)+'…'+mint.slice(-4);
/** Registry-only discovery. Token sources are read only after an explicit selection. */
export default function QuoteSearch({selected,onSelect}:{selected:boolean;onSelect:(choice:VerifiedChoice)=>void}) {
 const [query,setQuery]=useState(''),[offset,setOffset]=useState(0),[retry,setRetry]=useState(0);
 const [pages,setPages]=useState<PairQuoteRegistry[]>([]),[state,setState]=useState<'loading'|'ready'|'unavailable'|'invalid'>('loading');
 const [error,setError]=useState(''),[expanded,setExpanded]=useState(false),[active,setActive]=useState(-1);
 const root=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null),prior=useRef<PairQuoteRegistry[]>([]);
 const seed=useRef<{at:number;page:PairQuoteRegistry}|null>(null);
 const [examples,setExamples]=useState<PairQuoteRegistry|null>(null);
 useEffect(()=>{
  let disposed=false;const controller=new AbortController();let deadline:ReturnType<typeof setTimeout>|undefined;
  setState('loading');setError('');setActive(-1);
  try{registrySearch(query,offset);}catch{setState('invalid');setPages([]);return;}
  const accept=(page:PairQuoteRegistry,cached=false)=>{
   if(disposed)return;
   if(page.status==='unavailable'){setPages([]);setState('unavailable');return;}
   try{
    const next=appendRegistryPage(offset?prior.current:[],page);prior.current=next;setPages(next);
    if(!cached && !query.trim() && offset===0){seed.current={at:Date.now(),page};setExamples(page);}
   }catch{setPages([]);setError('Registry changed. Restart this search.');}
   setState('ready');
  };
  if(!query.trim() && offset===0 && seed.current && Date.now()-seed.current.at<300000){accept(seed.current.page,true);return;}
  const debounce=setTimeout(()=>{
   deadline=setTimeout(()=>controller.abort(),15000);
   void fetchQuoteRegistry(controller.signal,query,offset).then(page=>accept(page)).catch(()=>{if(!disposed){setPages([]);setState('unavailable');}}).finally(()=>clearTimeout(deadline));
  },query.trim()?300:0);
  return()=>{disposed=true;clearTimeout(debounce);clearTimeout(deadline);controller.abort();};
 },[query,offset,retry]);
 useEffect(()=>{
  const shortcut=(e:KeyboardEvent)=>{if((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='k'){e.preventDefault();input.current?.focus();setExpanded(true);}};
  const outside=(e:PointerEvent)=>{if(e.target instanceof Node && !root.current?.contains(e.target))setExpanded(false);};
  document.addEventListener('keydown',shortcut);document.addEventListener('pointerdown',outside);
  return()=>{document.removeEventListener('keydown',shortcut);document.removeEventListener('pointerdown',outside);};
 },[]);
 useEffect(()=>{if(expanded && active>=0)document.getElementById('quote-option-'+active)?.scrollIntoView({block:'nearest'});},[active,expanded]);
 const items=pages.flatMap(page=>page.quotes.map(quote=>({quote,registry:page}))),registry=pages.at(-1);
 const usable=state==='ready' && !error,open=expanded,optionId=open && usable && active>=0?'quote-option-'+active:undefined;
 const select=(choice:VerifiedChoice)=>{
  dismissResearchKeyboard();input.current?.blur();setExpanded(false);setQuery('');setOffset(0);setPages([]);setActive(-1);onSelect(choice);
 };
 const restart=()=>{input.current?.focus({preventScroll:true});seed.current=null;setState('loading');setActive(-1);setOffset(0);setPages([]);setError('');setRetry(v=>v+1);};
 const change=(value:string)=>{setQuery(value);setOffset(0);setPages([]);setActive(-1);setError('');setState('loading');setExpanded(true);};
 return <div className="quote-discovery" ref={root} data-registry-state={state} onKeyDown={e=>{if(e.key==='Escape' && e.target!==input.current){e.preventDefault();input.current?.focus({preventScroll:true});setExpanded(false);}}} onBlur={e=>{if(e.relatedTarget instanceof Node && !e.currentTarget.contains(e.relatedTarget))setExpanded(false);}}>
  <label htmlFor="pair-search">Search quote assets</label>
  <div className={'quote-search-field'+(open?' is-open':'')}>
   <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" width="20" height="20"><circle cx="8.5" cy="8.5" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.5"/></svg>
   <input ref={input} id="pair-search" type="search" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls="quote-options" aria-activedescendant={optionId} aria-describedby="pair-search-hint" aria-keyshortcuts="Control+K Meta+K" value={query} onChange={e=>change(e.target.value)} onFocus={()=>setExpanded(true)} onKeyDown={e=>{
    if(e.nativeEvent.isComposing)return;
    if(e.key==='ArrowDown' || e.key==='ArrowUp'){e.preventDefault();setExpanded(true);if(usable && items.length)setActive(v=>e.key==='ArrowDown'?(v+1)%items.length:(v<=0?items.length:v)-1);}
    if(e.key==='Enter' && open && usable && items.length){e.preventDefault();select(items[Math.max(0,active)]);}
    if(e.key==='Escape'){e.preventDefault();if(open)setExpanded(false);else if(query)change('');}
   }} placeholder="Name, ticker or exact mint" maxLength={128} autoComplete="off" spellCheck={false}/>
   {query?<button className="quote-clear" type="button" aria-label="Clear asset search" onClick={()=>{change('');input.current?.focus();}}>×</button>:<kbd aria-hidden="true">⌘ K</kbd>}
  </div>
  <p className="sr-only" id="pair-search-hint">Search the official quote registry. Shared tickers have distinct mints. Arrow keys browse, Enter selects, Escape closes. Registry membership does not verify rewards or ownership.</p>
  <div className="quote-popover" role="region" aria-label="Quote asset search results" tabIndex={0} hidden={!open}>
   {state==='loading' && <p className="quote-search-state" role="status">Searching registry…</p>}
   {state==='invalid' && <p className="quote-search-state" role="status">Use up to 64 characters without control characters.</p>}
   {(state==='unavailable' || error) && <div className="quote-search-state" role="status"><p>{error || 'Registry search unavailable. No identities verified.'}</p><button type="button" onClick={restart}>Retry registry</button></div>}
   {usable && registry && <p className="quote-result-count" role="status">{registry.dataset.coverage.matchedCount} registry {registry.dataset.coverage.matchedCount===1?'match':'matches'} · {items.length} shown</p>}
   <ul id="quote-options" role="listbox" aria-label="Verified quote assets" aria-busy={state==='loading'}>{usable && items.map((item,i)=><li role="option" id={'quote-option-'+i} key={item.quote.quoteMint} aria-selected={active===i} aria-label={item.quote.quoteSymbol+' · '+item.quote.quoteName+' · quote mint '+item.quote.quoteMint+(item.quote.symbolAmbiguous?' · shared ticker':'')} onMouseDown={e=>e.preventDefault()} onMouseMove={()=>setActive(i)} onClick={()=>select(item)}>
    <div><strong>{item.quote.quoteSymbol}</strong><span title={item.quote.quoteName}>{item.quote.quoteName}</span></div><small title={item.quote.quoteMint}>{shortMint(item.quote.quoteMint)}{item.quote.symbolAmbiguous?' · shared ticker':''}</small>
   </li>)}</ul>
   {usable && registry && !items.length && <p className="quote-search-state">No matching verified identity in this registry response. This does not establish absence elsewhere.</p>}
   {usable && registry?.dataset.coverage.nextOffset!=null && (items.length<REGISTRY_WINDOW_LIMIT?<button className="quote-more" type="button" onClick={()=>{input.current?.focus({preventScroll:true});setState('loading');setOffset(registry.dataset.coverage.nextOffset!);setActive(-1);}}>Show more assets</button>:<p className="quote-search-state">Refine your search to see more matches.</p>)}
  </div>
  {!selected && !open && <div className="quote-suggestions">{examples?<><span>From the registry</span>{examples.quotes.slice(0,3).map(quote=><button key={quote.quoteMint} type="button" onClick={()=>select({quote,registry:examples})} aria-label={'Explore '+quote.quoteSymbol+' · '+quote.quoteName+' · '+quote.quoteMint}>{quote.quoteSymbol}{quote.symbolAmbiguous && <small> {shortMint(quote.quoteMint)}</small>}<svg aria-hidden="true" focusable="false" viewBox="0 0 12 12" width="10" height="10"><path d="M3 9 9 3M3 3h6v6" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg></button>)}</>:<span role="status">{state==='loading'?'Reading verified registry…':state==='invalid'?'Search by name, ticker or mint.':'Registry unavailable. Focus search to retry.'}</span>}</div>}
 </div>;
}
