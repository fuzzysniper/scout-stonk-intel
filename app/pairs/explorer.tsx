'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { TrackedToken } from '../../lib/tracked-tokens';
import type { RadarReport } from '../../lib/radar';
import { flowReading, utc } from '../radar/evidence-view';
import { fromCatalog } from './adapter';
import { appendRegistryPage, catalogMatchesQuote, registrySearch, REGISTRY_WINDOW_LIMIT } from './registry';
import type { PairQuote, PairQuoteRegistry } from './registry';
import type { PairCatalog, PairToken } from './adapter';
import { fetchCatalog, fetchRadar, fetchQuoteRegistry } from './client';

const number=(v:number)=>new Intl.NumberFormat('en-US',{maximumSignificantDigits:6}).format(v);
export const usd=(v:number|null)=>v===null?'Unavailable':'US$'+(v>0 && v<0.000001?v.toExponential(3):new Intl.NumberFormat('en-US',{maximumSignificantDigits:5,notation:v>=10000?'compact':'standard'}).format(v));
const shortMint=(v:string)=>v.slice(0,6)+'…'+v.slice(-4);
function rewardReading(token:PairToken,report:RadarReport|null,blocked:boolean) {
 if(blocked)return {state:'Source unavailable'} as const;
 if(token.catalog && !token.rewardModeVerified)return {state:token.catalog.modeVerification==='verified_standard'?'No holder reward mode':'Reward mode unverified'} as const;
 if(!token.radar || !report)return {state:token.catalog?.historyStatus==='not_tracked'?'No tracked reward history':'Observations unavailable'} as const;
 const reading=flowReading(token.radar,report.status);
 if(!('state' in reading) && (!Number.isFinite(reading.seconds) || reading.seconds<=0 || !Number.isFinite(Date.parse(reading.startAt)) || !Number.isFinite(Date.parse(reading.endAt)) || Date.parse(reading.startAt)>=Date.parse(reading.endAt)))return {state:'Reward evidence unavailable'} as const;
 return reading;
}
const modeLabel=(token:PairToken)=>!token.catalog?'Tracked mode · dated verification':token.catalog.modeVerification==='verified_reward'?'Reward mode verified':token.catalog.modeVerification==='verified_standard'?'Standard mode verified':token.catalog.mode==='standard'?'Standard · not mode-verified':'Reward mode unverified';
export function PairTokenRow({token,report,blocked=false}:{token:PairToken;report:RadarReport|null;blocked?:boolean}) {
 const reading=rewardReading(token,report,blocked),t=token.catalog;
 const market=!blocked && t?.market.status==='reported_snapshot'?t.market:null;
 return <article className="pair-token" aria-labelledby={'pair-token-'+token.mint}>
  <div className="pair-token-name"><h3 id={'pair-token-'+token.mint}><Link href={'/?mint='+token.mint}>{token.symbol}<span className="sr-only"> token dossier</span></Link></h3><span>{token.name}</span><span className={'pair-mode'+(t && !token.rewardModeVerified?' pair-mode-limited':'')}>{modeLabel(token)}</span></div>
  <div className="pair-market"><span className="pair-label">Reported USD snapshot</span><dl>{([['Price',market?.priceUsd??null],['Liquidity',market?.liquidityUsd??null],['24h volume',market?.volume24hUsd??null]] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{usd(value)}</dd></div>)}</dl><span>{market?<>Response generated <time dateTime={market.providerGeneratedAt}>{utc(market.providerGeneratedAt)}</time></>:'Market snapshot unavailable'}</span></div>
  <div className="pair-reward"><span className="pair-label">Recorded reward flow · {token.quoteSymbol}</span>{'state' in reading?<strong className="pair-withheld">{reading.state}</strong>:<><strong>{number(reading.value)} {token.quoteSymbol}</strong><span>Distributed counter change · {reading.kind==='point'?'recorded interval':'24h target'}</span><span className="pair-range">{utc(reading.startAt)} → {utc(reading.endAt)}</span></>}
   <span>{token.lastObservedAt?<>Observed <time dateTime={token.lastObservedAt}>{utc(token.lastObservedAt)}</time>{t?.historyFreshness==='stale'?' · stale':''}</>:t?.historyStatus==='invalid_data'?'Invalid recorded history':t?.historyStatus==='not_tracked'?'Outside tracked history':'Observation unavailable'}</span>
  </div>
  <details className="pair-token-evidence"><summary>Evidence / Details<span className="sr-only"> for {token.symbol}</span></summary><div className="pair-evidence-body">
   <dl><div><dt>Token / quote mint</dt><dd>{token.mint}<br/>{token.quoteMint} · {token.quoteSymbol}</dd></div><div><dt>Mode evidence</dt><dd>{modeLabel(token)}{t?.rewardSource && <> · response {utc(t.rewardSource.providerGeneratedAt)} · <a href={t.rewardSource.source}>Official mode source ↗</a></>}</dd></div><div><dt>Recorded history</dt><dd>{token.observationCount??'Unavailable'} points · {t?.historyStatus??'Tracked sample'}{t?.historyIssues.length?<> · {t.historyIssues.join(', ')}</>:null}</dd></div>
    <div><dt>Pool account</dt><dd>{t?.poolMint??token.radar?.poolMint??'Unavailable'} · provider catalog account; not independently reconciled to a trading pool</dd></div>
    <div><dt>Price observation time</dt><dd>Unavailable. Response generation/retrieval is not a market tick time. USD snapshots are not quote-token prices or live quotes.</dd></div>
    <div><dt>Historical quote-relative return</dt><dd>Unavailable</dd></div><div><dt>Quote-asset benchmark return</dt><dd>Unavailable</dd></div><div><dt>Holder-attributable rewards</dt><dd>Unavailable</dd></div>
   </dl>
   {t && <p>Catalog response {utc(t.provenance.providerGeneratedAt)} · retrieved {utc(t.provenance.fetchedAt)} · <a href={t.source}>Official token catalog ↗</a><br/>Byte revision {t.provenance.revision}</p>}
   {!('state' in reading) && <p>Actual interval: <time dateTime={reading.startAt}>{utc(reading.startAt)}</time> → <time dateTime={reading.endAt}>{utc(reading.endAt)}</time> ({number(reading.seconds/3600)} hours). Distributed amounts are not an individual return.</p>}
   {!('state' in reading) && reading.kind==='matched' && token.radar && <dl>{([['Current',token.radar.signals.current],['Previous',token.radar.signals.previous]] as const).map(([label,period])=><div key={label}><dt>{label} matched period</dt><dd>{period.distributedTokens===null?'Unavailable':number(period.distributedTokens)+' '+token.quoteSymbol} · {utc(period.startAt)} → {utc(period.endAt)} · {period.observationCount} points · maximum gap {period.maxGapSeconds??'unknown'}s</dd></div>)}</dl>}
   <p>Same quote does not establish synchronized periods between tokens. Missing observations are not zero rewards. No holder entitlement, historical return or underlying equity/metal ownership is inferred.</p>
   <div className="pair-source-links">{token.radar && <><a href={token.radar.source}>Official rewards ↗</a><a href={'/api/history?mint='+token.mint}>Recorded history ↗</a></>}<Link href={'/?mint='+token.mint}>Token dossier →</Link></div>
  </div></details>
 </article>;
}
export default function PairExplorer({tokens}:{tokens:TrackedToken[]}) {
 const [query,setQuery]=useState(''),[browse,setBrowse]=useState(false),[offset,setOffset]=useState(0),[registryRetry,setRegistryRetry]=useState(0);
 const [pages,setPages]=useState<PairQuoteRegistry[]>([]),[registryState,setRegistryState]=useState<'idle'|'loading'|'ready'|'unavailable'|'invalid'>('idle');
 const [registryError,setRegistryError]=useState('');
 const registryPages=useRef<PairQuoteRegistry[]>([]);
 const [choice,setChoice]=useState<{quote:PairQuote;registry:PairQuoteRegistry}|null>(null);
 const [catalog,setCatalog]=useState<PairCatalog|null>(null),[report,setReport]=useState<RadarReport|null>(null),[sampleLoading,setSampleLoading]=useState(false),[sampleError,setSampleError]=useState(''),[refresh,setRefresh]=useState(0);
 const cache=useRef(new Map<string,{at:number;value:PairCatalog}>());
 useEffect(()=>{
  if(!query.trim() && !browse){setPages([]);setRegistryState('idle');return;}
  let disposed=false;const controller=new AbortController();let deadline:ReturnType<typeof setTimeout>|undefined;
  setRegistryState('loading');setRegistryError('');
  try{registrySearch(query,offset);}catch{setRegistryState('invalid');setPages([]);return;}
  const debounce=setTimeout(()=>{
   deadline=setTimeout(()=>controller.abort(),15000);
   void fetchQuoteRegistry(controller.signal,query,offset).then(result=>{
    if(disposed)return;
    if(result.status==='unavailable'){setPages([]);setRegistryState('unavailable');return;}
    try{const nextPages=appendRegistryPage(offset?registryPages.current:[],result);registryPages.current=nextPages;setPages(nextPages);}catch{setPages([]);setRegistryError('Registry refreshed. Restart this search.');}
    setRegistryState('ready');
   }).catch(()=>{if(!disposed){setPages([]);setRegistryState('unavailable');}}).finally(()=>clearTimeout(deadline));
  },300);
  return()=>{disposed=true;clearTimeout(debounce);clearTimeout(deadline);controller.abort();};
 },[query,browse,offset,registryRetry]);
 useEffect(()=>{
  if(!choice)return;
  let disposed=false;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  setCatalog(null);setReport(null);setSampleLoading(true);setSampleError('');
  const read=async()=>{
   const cached=cache.current.get(choice.quote.quoteMint);
   const fresh=cached && Date.now()-cached.at<300000;
   const result=fresh?{status:'ready' as const,catalog:cached.value}:await fetchCatalog(controller.signal,choice.quote.quoteMint,true);
   if(disposed)return;
   if(result.status!=='ready'){setSampleError(result.status==='not_found'?'Asset absent from the current registry. Search again.':'Sample unavailable or cooling down. Retry manually later.');return;}
   if(!catalogMatchesQuote(result.catalog,choice.quote)){setSampleError('Identity changed between source responses. Search again.');return;}
   cache.current.set(choice.quote.quoteMint,{at:fresh?cached.at:Date.now(),value:result.catalog});
   if(cache.current.size>12)cache.current.delete(cache.current.keys().next().value!);
   setCatalog(result.catalog);
  };
  void Promise.allSettled([
   read().catch(()=>{if(!disposed)setSampleError('Sample unavailable or cooling down. Retry manually later.');}).finally(()=>{if(!disposed)setSampleLoading(false);}),
   fetchRadar(controller.signal).then(r=>{if(!disposed)setReport(r);}).catch(()=>{if(!disposed)setReport(null);}),
  ]).finally(()=>clearTimeout(timer));
  return()=>{disposed=true;clearTimeout(timer);controller.abort();};
 },[choice,refresh]);
 const active=catalog && choice && catalogMatchesQuote(catalog,choice.quote)?catalog:null;
 const group=useMemo(()=>active?fromCatalog(active,report,tokens)[0]:null,[active,report,tokens]);
 const quotes=pages.flatMap(p=>p.quotes),registry=pages.at(-1),next=registry?.dataset.coverage.nextOffset;
 const select=(quote:PairQuote,page:PairQuoteRegistry)=>{setChoice({quote,registry:page});setQuery('');setBrowse(false);setOffset(0);setPages([]);};
 const retryRegistry=()=>{setOffset(0);setPages([]);setRegistryError('');setRegistryRetry(v=>v+1);};
 const coverage=active?.dataset.coverage;
 return <section className="pair-explorer" aria-label="Pair intelligence explorer">
  <header className="pair-heading"><span className="flow-brand">SCOUT / PAIR INTELLIGENCE</span><h1>Find your pair.</h1><p>Search an asset. See its memecoins.</p></header>
  <div className="pair-controls">
   <label htmlFor="pair-search">Search pair</label><input id="pair-search" type="search" value={query} onChange={e=>{setQuery(e.target.value);setRegistryError('');setBrowse(false);setOffset(0);setPages([]);}} placeholder="Name, ticker or exact quote mint…" maxLength={128} aria-describedby="pair-search-hint" autoComplete="off" spellCheck={false}/>
   <p id="pair-search-hint" className="pair-search-hint">Verified quote assets · identities are selected by mint.</p>
   {!query.trim() && <button className="pair-clear pair-browse" type="button" onClick={()=>{setBrowse(v=>!v);setPages([]);setOffset(0);setRegistryError('');}}>{browse?'Close asset list':'Browse quote assets'}</button>}
   <div id="pair-registry-results" aria-busy={registryState==='loading'}>
    {registryState==='loading' && <p className="pair-registry-state" role="status">Searching verified registry…</p>}
    {registryState==='invalid' && <p className="pair-registry-state" role="status">Use up to 64 characters without control characters.</p>}
    {(registryState==='unavailable' || registryError) && <div className="pair-registry-state" role="status"><p>{registryError || 'Quote registry unavailable or cooling down. Counts are unknown.'}</p><button className="pair-clear" type="button" onClick={retryRegistry}>Retry registry</button></div>}
    {registryState==='ready' && registry && !registryError && <>
     <p className="pair-registry-count" role="status">{registry.dataset.coverage.matchedCount} registry {registry.dataset.coverage.matchedCount===1?'match':'matches'} · {quotes.length} shown</p>
     {quotes.length>0?<ul className="pair-registry-list" aria-label="Verified quote assets">{pages.flatMap(page=>page.quotes.map(q=><li key={q.quoteMint}><button type="button" aria-pressed={q.quoteMint===choice?.quote.quoteMint} aria-label={'Select '+q.quoteSymbol+' · '+q.quoteName+' · quote mint '+q.quoteMint} onClick={()=>select(q,page)}><span><strong>{q.quoteSymbol}</strong> {q.quoteName}</span><small>{shortMint(q.quoteMint)}{q.symbolAmbiguous?' · same ticker, distinct mint':''}</small></button></li>))}</ul>:<p className="pair-registry-state">{registry.status==='not_found'?'This mint is absent from the verified registry response.':'No matching identity in the verified registry response.'} This does not establish absence elsewhere.</p>}
     {next!==null && next!==undefined && (quotes.length<REGISTRY_WINDOW_LIMIT?<button type="button" className="pair-clear" onClick={()=>setOffset(next)}>Show more assets</button>:<p className="pair-search-hint">Refine your search to see more matches.</p>)}
     <p className="pair-search-hint">Registry identities are independent of token-catalog coverage.</p>
    </>}
   </div>
  </div>
  {!choice && <p className="pair-start">Choose a verified quote asset to view its matching memecoin sample.</p>}
  {choice && <>
   <div className="pair-selected"><h2>{choice.quote.quoteSymbol}<span>{group?' / '+group.tokens.length+' memecoins in bounded sample':''}</span></h2><p>{choice.quote.quoteName} · quote mint <a href={'https://solscan.io/token/'+choice.quote.quoteMint}>{choice.quote.quoteMint}</a>{choice.quote.symbolAmbiguous?' · ambiguous ticker':''}</p><p>Quote token identity; no underlying equity/metal ownership implied.</p></div>
   <div className="pair-scope"><span>{sampleLoading?'Reading exact-mint sample…':sampleError?'Sample unavailable':group?group.tokens.filter(t=>t.rewardModeVerified).length+' reward-mode verified · incomplete coverage':'Sample not loaded'}</span><button type="button" disabled={sampleLoading} onClick={()=>{cache.current.delete(choice.quote.quoteMint);setRefresh(v=>v+1);}}>{sampleLoading?'Reading…':sampleError?'Retry sample':'Refresh sample'}</button></div>
   <p className="pair-load-state" role="status">{sampleError || (sampleLoading?'Reading a bounded provider query for this exact mint.':active?.status==='degraded'?'Partial mode/history checks · bounded token sample only.':'Bounded token sample · non-atomic, incomplete coverage.')}</p>
   <p className="pair-snapshot-note">USD snapshots · market observation time unavailable.<br/>Historical return &amp; holder entitlement unavailable.</p>
   {group && (group.tokens.length>0?<div className="pair-token-list" aria-busy={sampleLoading}>{group.tokens.map(t=><PairTokenRow key={t.mint} token={t} report={report}/>)}</div>:<p className="pair-empty" role="status">No matching memecoins within this bounded sample. Tokens may exist outside these fetched pages.</p>)}
   <details className="pair-dataset"><summary>Pair identity &amp; coverage</summary><div className="pair-evidence-body">
    <p>Identity from the <a href={choice.registry.dataset.provenance!.source}>official quote registry</a> · {choice.registry.dataset.coverage.registryCount} identities in the validated unpaginated response, not independently proven universal coverage. Verified {utc(choice.quote.verifiedAt)} · provider response {utc(choice.registry.dataset.provenance!.providerGeneratedAt)} · byte revision {choice.registry.dataset.provenance!.revision}. Registry membership does not establish a token market, launch readiness, reward eligibility or underlying ownership.</p>
    {coverage && <p>Fetched {coverage.pagesFetched}/{coverage.pageLimit} pages × {coverage.pageSize} records for this exact quote mint. {coverage.recordsReceived} inputs; {coverage.tokensReturned} returned; {coverage.rejectedRecords} rejected. Provider-reported total {coverage.providerReportedTotal??'Unavailable'} applies to this quote-mint query, not a verified complete ecosystem. Coverage is incomplete and pagination non-atomic, even when a small result fits one page. Mode checks {coverage.modeChecks}/{coverage.modeCheckLimit} · {coverage.warnings.join(', ')}.</p>}
    <p>Catalog response evaluated {utc(active?.dataset.fetchedAt??null)} · retrieved {utc(active?.dataset.dataFetchedAt??null)}. Individual market response dates are shown on rows; market observation times remain unknown. Provider market-cap pages select the sample; displayed rows are alphabetical.</p>
    <p>Reward comparisons join only the existing tracked seven by exact token/quote/pool identity and verified mode. Radar freshness, gap/reset and matched-period gates remain authoritative. Sharing a quote does not synchronize intervals or imply a cross-token return.</p>
    <p>Recorded source {report?.dataset.sourceStatus??'Unavailable'} · retrieved {utc(report?.dataset.dataFetchedAt??null)} · revision {report?.dataset.revision??'Unavailable'}. Retrieval is not observation time.</p>
    <div className="pair-source-links"><a href={'/api/pair-quotes?mint='+choice.quote.quoteMint}>Registry JSON</a><a href={'/api/pairs?quoteMint='+choice.quote.quoteMint+'&discovery=pair'}>Sample JSON</a><a href="/api/radar?sort=name">Radar JSON</a><Link href="/status">Collection reliability</Link><Link href="/radar">Full Radar</Link><Link href="/research">Research guide</Link></div>
   </div></details>
  </>}
 </section>;
}
