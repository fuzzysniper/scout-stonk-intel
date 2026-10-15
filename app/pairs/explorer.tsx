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
import { PRESET_CANDIDATES, verifiedPreset } from './presets';
import type { VerifiedChoice } from './presets';
import { DEFAULT_SAMPLE_SORT, screenUsd, sortSample, tokenResearchPath, tokenResearchUrl } from './results';
import type { SampleSort } from './results';

const number=(v:number)=>new Intl.NumberFormat('en-US',{maximumSignificantDigits:6}).format(v);
export const usd=(v:number|null)=>v===null?'Unavailable':'US$'+(v>0 && v<0.001?v.toExponential(3):new Intl.NumberFormat('en-US',{maximumSignificantDigits:5,notation:v>=10000?'compact':'standard'}).format(v));
const shortMint=(v:string)=>v.slice(0,6)+'…'+v.slice(-4);
// Visual mnemonic only: exact mint/source verification still lives in Details.
export function TokenIdentityMark({mint}:{mint:string}) {
 let seed=2166136261;
 for(const char of mint)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
 const color=['#a1c5d8','#b0d6c8','#c5bedf','#d7c7ac'][seed%4];
 return <svg className="pair-token-mark" data-identity-mark="generated" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true" focusable="false">
  <rect width="28" height="28" rx="7" fill="#1b2e3b"/>
  {Array.from({length:15},(_,i)=>{
   const x=i%3,y=Math.floor(i/3);
   return (seed>>>(i+2)&1)?<g key={i} fill={color}><rect x={4+x*4} y={4+y*4} width="3" height="3" rx=".75"/>{x<2 && <rect x={20-x*4} y={4+y*4} width="3" height="3" rx=".75"/>}</g>:null;
  })}
 </svg>;
}
function rewardReading(token:PairToken,report:RadarReport|null,blocked:boolean) {
 if(blocked)return {state:'Source unavailable'} as const;
 if(token.catalog && !token.rewardModeVerified)return {state:token.catalog.modeVerification==='verified_standard'?'No holder reward mode':'Reward mode unverified'} as const;
 if(!token.radar || !report)return {state:token.catalog?.historyStatus==='not_tracked'?'No tracked reward history':'Observations unavailable'} as const;
 const reading=flowReading(token.radar,report.status);
 if(!('state' in reading) && (!Number.isFinite(reading.seconds) || reading.seconds<=0 || !Number.isFinite(Date.parse(reading.startAt)) || !Number.isFinite(Date.parse(reading.endAt)) || Date.parse(reading.startAt)>=Date.parse(reading.endAt)))return {state:'Reward evidence unavailable'} as const;
 return reading;
}
const modeLabel=(token:PairToken)=>!token.catalog?'Tracked mode · dated verification':token.catalog.modeVerification==='verified_reward'?'Reward mode verified':token.catalog.modeVerification==='verified_standard'?'No holder reward mode (verified)':'Reward mode unverified';
function rewardSummary(token:PairToken,reading:ReturnType<typeof rewardReading>,blocked:boolean) {
 const state=(label:string,description:string,warning:string|null=null)=>({label,description,warning});
 if(blocked)return state('Unverified','Source unavailable; reward evidence and market values withheld.','Source unavailable');
 const t=token.catalog;
 const warning=t?.modeVerification==='identity_mismatch' || t?.historyStatus==='identity_mismatch'?'Identity issue; flow withheld':t?.historyStatus==='invalid_data'?'Invalid'+(t.historyFreshness==='stale'?' / stale':'')+' history; flow withheld':t?.historyFreshness==='stale' || 'state' in reading && reading.state==='Stale observations'?'Stale history; flow withheld':t?.modeVerification==='source_unavailable'?'Official mode check unavailable':t?.historyStatus==='source_unavailable' || 'state' in reading && reading.state==='Source unavailable'?'History source unavailable; flow withheld':null;
 if(t?.modeVerification==='verified_standard')return state('No reward mode','StonkFun confirms standard mode, without a holder reward mechanism.',warning);
 if(!token.rewardModeVerified)return state('Unverified','No usable official reward-mode verification in this sample; payments and returns are not established.',warning);
 if(!warning && !('state' in reading))return state('Flow recorded','Official reward mode verified, with a usable recorded distribution-counter change. Not proof of payments to individual holders or their returns.');
 return state('Settings verified','StonkFun confirms reward settings; no usable recorded flow is established here. This does not verify holder payments or returns.',warning);
}
export function RewardEvidenceKey() {
 return <aside className="pair-reward-key" aria-label="Reward evidence key">
  <p id="pair-reward-key"><strong>Settings verified</strong> = official reward settings. <strong>Flow recorded</strong> = a measured counter change, not proof holders were paid. Neither proves returns.</p>
  <details><summary>How to read the reward evidence</summary><div className="pair-evidence-body">
   <p><strong>Settings verified:</strong> StonkFun’s official response confirms reward settings for this token and quote identity. It does not establish that any holder received a payment. <strong>Flow recorded:</strong> recorded counter observations pass the existing source, identity, freshness, gap and reset checks. The actual interval and amount, including a genuine zero, are in token Details; this is aggregate reported activity, not independently reconciled holder payments.</p>
   <p><strong>Unverified:</strong> the sample has no usable official mode verification. <strong>No reward mode:</strong> the official response confirms standard mode. An amber ! flags a source or history problem; open that row’s Details for its reason. A history problem does not erase separately verified reward settings, but it withholds usable flow.</p>
   <p>Lifetime distributions are not shown in this pair view. The token dossier may show separately reported cumulative totals; those are not recent flow, verified holder receipts or profit. Exact quote units, source dates and coverage are in Details. Missing evidence is not zero.</p>
   <p>Research two projects in this same-quote sample by opening their Details. Inspect the official source, then open or copy each token’s dossier link. Links identify a token; they do not freeze these figures or share this pair selection.</p>
   <p>Token marks are generated from each mint, not official logos or proof of identity. Exact mints and sources are in Details.</p>
  </div></details>
 </aside>;
}
export function PairTokenRow({token,report,blocked=false,metric='liquidity'}:{token:PairToken;report:RadarReport|null;blocked?:boolean;metric?:'liquidity'|'volume'}) {
 const [open,setOpen]=useState(false),toggle=useRef<HTMLButtonElement>(null);
 const [copyStatus,setCopyStatus]=useState(''),[manualLink,setManualLink]=useState('');
 const reading=rewardReading(token,report,blocked),t=token.catalog;
 const market=!blocked && t?.market.status==='reported_snapshot'?t.market:null;
 const evidence=rewardSummary(token,reading,blocked),detailId='pair-detail-'+token.mint;
 const researchPath=tokenResearchPath(token.mint);
 const copyResearch=async()=>{
  const url=tokenResearchUrl(token.mint,window.location.origin);setCopyStatus('');setManualLink('');
  try{await navigator.clipboard.writeText(url);setCopyStatus('Research link copied. Opens this token dossier.');}
  catch{setManualLink(url);setCopyStatus('Copy unavailable. Select the research link below.');}
 };
 return <article className="pair-token" aria-labelledby={'pair-token-'+token.mint} onKeyDown={e=>{if(open && e.key==='Escape'){e.preventDefault();setOpen(false);toggle.current?.focus();}}}>
  <div className="pair-row-main">
   <Link className="pair-token-name" href={researchPath} aria-label={'Open '+token.symbol+' · '+token.name+' dossier'}><TokenIdentityMark mint={token.mint}/><div className="pair-token-label"><h3 id={'pair-token-'+token.mint}>{token.symbol}</h3><span title={token.name}>{token.name}</span></div></Link>
   <dl className="pair-market">{([['liquidity','Liquidity',market?.liquidityUsd??null],['volume','24h volume',market?.volume24hUsd??null]] as const).map(([key,label,value])=><div className={'pair-'+key+(metric===key?' is-active':'')} key={key}><dt className="sr-only">Reported {label}, USD snapshot</dt><dd title={usd(value)}>{value===null?<><span aria-hidden="true">—</span><span className="sr-only">Unavailable</span></>:screenUsd(value)}</dd></div>)}</dl>
   <span className="pair-row-state" title={evidence.description+(evidence.warning?' '+evidence.warning:'')}>{evidence.label}{evidence.warning && <span className="pair-evidence-warning" aria-hidden="true">!</span>}<span className="sr-only"> · {evidence.description}{evidence.warning?' '+evidence.warning:''}</span></span>
   <button ref={toggle} className="pair-detail-toggle" type="button" aria-expanded={open} aria-controls={detailId} aria-label={'Details for '+token.symbol+' · '+token.name} onClick={()=>setOpen(v=>!v)}><svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="16" height="16"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></button>
  </div>
  <div className="pair-evidence-body" id={detailId} hidden={!open}>
   <p>{evidence.description}</p>
   {evidence.warning && <p className="pair-detail-warning">{evidence.warning}</p>}
   <div className="pair-research-actions"><Link href={researchPath}>Token dossier →</Link><button type="button" onClick={()=>void copyResearch()} aria-label={'Copy research link for '+token.symbol+' · '+token.name}>Copy research link</button></div>
   {copyStatus && <p role="status">{copyStatus}</p>}
   {manualLink && <label className="pair-manual-link">Research link<input type="text" readOnly value={manualLink} onFocus={e=>e.currentTarget.select()} aria-label={'Research link for '+token.symbol}/></label>}
   <p>Link opens this token’s current dossier; it does not freeze these figures.</p>
   <dl><div><dt>Token / quote mint</dt><dd>{token.name} · {token.mint}<br/>{token.quoteMint} · {token.quoteSymbol}</dd></div><div><dt>Official reward settings</dt><dd>{modeLabel(token)}{t?.rewardSource?<> · response <time dateTime={t.rewardSource.providerGeneratedAt}>{utc(t.rewardSource.providerGeneratedAt)}</time> · retrieved {utc(t.rewardSource.fetchedAt)} · <a href={t.rewardSource.source}>Official mode source ↗</a><br/>Byte revision {t.rewardSource.revision}</>:<> · No usable official mode response in this sample.</>}</dd></div><div><dt>Recorded reward flow</dt><dd>{'state' in reading?reading.state:<>Distributed counter change: {number(reading.value)} {token.quoteSymbol}</>}</dd></div><div><dt>Lifetime distributions</dt><dd>Not shown in this pair view. The token dossier may show separately API-reported cumulative totals; they do not establish recent flow or holder payments.</dd></div><div><dt>Recorded history</dt><dd>{token.observationCount??'Unavailable'} points · {t?.historyStatus??'Tracked sample'}{t?.historyIssues.length?<> · {t.historyIssues.join(', ')}</>:null}<br/>{token.lastObservedAt?<>Observed <time dateTime={token.lastObservedAt}>{utc(token.lastObservedAt)}</time></>:'Observation unavailable'}</dd></div>
    <div><dt>Reported USD snapshot</dt><dd>{market?<>Liquidity {usd(market.liquidityUsd)} · 24h volume {usd(market.volume24hUsd)} · price {usd(market.priceUsd)} · response generated <time dateTime={market.providerGeneratedAt}>{utc(market.providerGeneratedAt)}</time></>:'Market snapshot unavailable'}</dd></div>
    <div><dt>Pool account</dt><dd>{t?.poolMint??token.radar?.poolMint??'Unavailable'} · provider catalog account; not independently reconciled to a trading pool</dd></div>
    <div><dt>Price observation time</dt><dd>Unavailable. Response generation/retrieval is not a market tick time. USD snapshots are not quote-token prices or live quotes.</dd></div>
    <div><dt>Historical quote-relative return</dt><dd>Unavailable</dd></div><div><dt>Quote-asset benchmark return</dt><dd>Unavailable</dd></div><div><dt>Holder-attributable rewards</dt><dd>Unavailable</dd></div>
   </dl>
   {t && <p>Catalog response {utc(t.provenance.providerGeneratedAt)} · retrieved {utc(t.provenance.fetchedAt)} · <a href={t.source}>Official token catalog ↗</a><br/>Byte revision {t.provenance.revision}</p>}
   {!('state' in reading) && <p>Actual interval: <time dateTime={reading.startAt}>{utc(reading.startAt)}</time> → <time dateTime={reading.endAt}>{utc(reading.endAt)}</time> ({number(reading.seconds/3600)} hours). Distributed amounts are not an individual return.</p>}
   {!('state' in reading) && reading.kind==='matched' && token.radar && <dl>{([['Current',token.radar.signals.current],['Previous',token.radar.signals.previous]] as const).map(([label,period])=><div key={label}><dt>{label} matched period</dt><dd>{period.distributedTokens===null?'Unavailable':number(period.distributedTokens)+' '+token.quoteSymbol} · {utc(period.startAt)} → {utc(period.endAt)} · {period.observationCount} points · maximum gap {period.maxGapSeconds??'unknown'}s</dd></div>)}</dl>}
   <p>Same quote does not establish synchronized periods between tokens. Missing observations are not zero rewards. No holder entitlement, historical return or underlying equity/metal ownership is inferred.</p>
   <div className="pair-source-links">{token.radar && <><a href={token.radar.source}>Official rewards ↗</a><a href={'/api/history?mint='+token.mint}>Recorded history ↗</a></>}</div>
  </div>
 </article>;
}
export default function PairExplorer({tokens}:{tokens:TrackedToken[]}) {
 const [sort,setSort]=useState<SampleSort>(DEFAULT_SAMPLE_SORT);
 const [query,setQuery]=useState(''),[offset,setOffset]=useState(0),[registryRetry,setRegistryRetry]=useState(0);
 const [pages,setPages]=useState<PairQuoteRegistry[]>([]),[registryState,setRegistryState]=useState<'idle'|'loading'|'ready'|'unavailable'|'invalid'>('idle');
 const [registryError,setRegistryError]=useState('');
 const registryPages=useRef<PairQuoteRegistry[]>([]);
 const [choice,setChoice]=useState<VerifiedChoice|null>(null);
 const [presets,setPresets]=useState<VerifiedChoice[]>([]),[presetState,setPresetState]=useState<'loading'|'ready'>('loading'),[presetRetry,setPresetRetry]=useState(0);
 const [catalog,setCatalog]=useState<PairCatalog|null>(null),[report,setReport]=useState<RadarReport|null>(null),[sampleLoading,setSampleLoading]=useState(false),[sampleError,setSampleError]=useState(''),[refresh,setRefresh]=useState(0);
 const cache=useRef(new Map<string,{at:number;value:PairCatalog}>());
 useEffect(()=>{
  let disposed=false;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  setPresetState('loading');setPresets([]);
  void Promise.allSettled(PRESET_CANDIDATES.map(async candidate=>verifiedPreset(candidate,await fetchQuoteRegistry(controller.signal,candidate.mint)))).then(results=>{
   if(disposed)return;
   setPresets(results.flatMap(r=>r.status==='fulfilled' && r.value?[r.value]:[]));setPresetState('ready');
  }).finally(()=>clearTimeout(timer));
  return()=>{disposed=true;controller.abort();clearTimeout(timer);};
 },[presetRetry]);
 useEffect(()=>{
  if(!query.trim()){setPages([]);setRegistryState('idle');return;}
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
 },[query,offset,registryRetry]);
 useEffect(()=>{
  if(!choice)return;
  let disposed=false;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  setCatalog(null);setReport(null);setSampleLoading(true);setSampleError('');
  const read=async()=>{
   const cached=cache.current.get(choice.quote.quoteMint);
   const fresh=cached && Date.now()-cached.at<300000;
   const result=fresh?{status:'ready' as const,catalog:cached.value}:await fetchCatalog(controller.signal,choice.quote.quoteMint,true);
   if(disposed)return;
   if(result.status!=='ready'){setSampleError(result.status==='not_found'?'Asset absent from the current registry. Search again.':'Matching memecoins temporarily unavailable. Retry later.');return;}
   if(!catalogMatchesQuote(result.catalog,choice.quote)){setSampleError('Identity changed between source responses. Search again.');return;}
   cache.current.set(choice.quote.quoteMint,{at:fresh?cached.at:Date.now(),value:result.catalog});
   if(cache.current.size>12)cache.current.delete(cache.current.keys().next().value!);
   setCatalog(result.catalog);
  };
  void Promise.allSettled([
   read().catch(()=>{if(!disposed)setSampleError('Matching memecoins temporarily unavailable. Retry later.');}).finally(()=>{if(!disposed)setSampleLoading(false);}),
   fetchRadar(controller.signal).then(r=>{if(!disposed)setReport(r);}).catch(()=>{if(!disposed)setReport(null);}),
  ]).finally(()=>clearTimeout(timer));
  return()=>{disposed=true;clearTimeout(timer);controller.abort();};
 },[choice,refresh]);
 const active=catalog && choice && catalogMatchesQuote(catalog,choice.quote)?catalog:null;
 const group=useMemo(()=>active?fromCatalog(active,report,tokens)[0]:null,[active,report,tokens]);
 const rows=useMemo(()=>sortSample(group?.tokens??[],choice?.quote.quoteMint??'',sort),[group,choice,sort]);
 const quotes=pages.flatMap(p=>p.quotes),registry=pages.at(-1),next=registry?.dataset.coverage.nextOffset;
 const select=(quote:PairQuote,page:PairQuoteRegistry)=>{setChoice({quote,registry:page});setQuery('');setOffset(0);setPages([]);};
 const retryRegistry=()=>{setOffset(0);setPages([]);setRegistryError('');setRegistryRetry(v=>v+1);};
 const coverage=active?.dataset.coverage;
 return <section className="pair-explorer pair-simple" aria-label="Pair intelligence explorer">
  <header className="pair-heading"><h1>Find memecoins that reward holders in the assets you follow.</h1><p>Choose a reward asset. Explore its memecoins.</p></header>
  <div className="pair-featured" role="group" aria-label="Featured reward assets" aria-busy={presetState==='loading'}>
   <div className="pair-chips">{PRESET_CANDIDATES.map(candidate=>{
    const verified=presets.find(p=>p.quote.quoteMint===candidate.mint);
    return <button key={candidate.mint} type="button" disabled={!verified} aria-pressed={candidate.mint===choice?.quote.quoteMint} aria-label={'Choose '+candidate.symbol+(verified?.quote.symbolAmbiguous?' · featured identity, other assets share this ticker':'')} onClick={()=>{if(verified)select(verified.quote,verified.registry);}}>{candidate.symbol}{verified?.quote.symbolAmbiguous && <span aria-hidden="true">*</span>}</button>;
   })}</div>
   {presetState==='loading'?<p className="pair-search-hint" role="status">Verifying pair choices…</p>:presets.length<PRESET_CANDIDATES.length?<p className="pair-registry-state" role="status">Some pair choices unavailable. Search below or <button className="pair-inline-retry" type="button" onClick={()=>setPresetRetry(v=>v+1)}>Retry choices</button>.</p>:<p className="pair-search-hint" role="status">Verified assets · reward evidence varies. *Shared ticker.</p>}
  </div>
  <div className="pair-controls">
   <label htmlFor="pair-search">Find another reward asset</label><input id="pair-search" type="search" value={query} onChange={e=>{setQuery(e.target.value);setRegistryError('');setOffset(0);setPages([]);}} placeholder="Search name, ticker or mint…" maxLength={128} aria-describedby="pair-search-hint" autoComplete="off" spellCheck={false}/>
   <p id="pair-search-hint" className="sr-only">Search verified assets by name, ticker or exact mint. Shared tickers are listed separately.</p>
   <div id="pair-registry-results" aria-busy={registryState==='loading'}>
    {registryState==='loading' && <p className="pair-registry-state" role="status">Searching verified registry…</p>}
    {registryState==='invalid' && <p className="pair-registry-state" role="status">Use up to 64 characters without control characters.</p>}
    {(registryState==='unavailable' || registryError) && <div className="pair-registry-state" role="status"><p>{registryError || 'Asset search temporarily unavailable. Try again later.'}</p><button className="pair-clear" type="button" onClick={retryRegistry}>Retry registry</button></div>}
    {registryState==='ready' && registry && !registryError && <>
     <p className="pair-registry-count" role="status">{registry.dataset.coverage.matchedCount} registry {registry.dataset.coverage.matchedCount===1?'match':'matches'} · {quotes.length} shown</p>
     {quotes.length>0?<ul className="pair-registry-list" aria-label="Verified quote assets">{pages.flatMap(page=>page.quotes.map(q=><li key={q.quoteMint}><button type="button" aria-pressed={q.quoteMint===choice?.quote.quoteMint} aria-label={'Select '+q.quoteSymbol+' · '+q.quoteName+' · quote mint '+q.quoteMint} onClick={()=>select(q,page)}><span><strong>{q.quoteSymbol}</strong> {q.quoteName}</span><small>{shortMint(q.quoteMint)}{q.symbolAmbiguous?' · same ticker, distinct mint':''}</small></button></li>))}</ul>:<p className="pair-registry-state">{registry.status==='not_found'?'This mint is absent from the verified registry response.':'No matching identity in the verified registry response.'} This does not establish absence elsewhere.</p>}
     {next!==null && next!==undefined && (quotes.length<REGISTRY_WINDOW_LIMIT?<button type="button" className="pair-clear" onClick={()=>setOffset(next)}>Show more assets</button>:<p className="pair-search-hint">Refine your search to see more matches.</p>)}

    </>}
   </div>
  </div>
  {!choice && <p className="pair-start">Pair assets are tokens, not equity ownership. Reward mechanisms are not proof of holder returns.</p>}
  {choice && <div className="pair-results" data-metric={sort==='volume'?'volume':'liquidity'}>
   <div className="pair-result-heading"><h2><strong>{choice.quote.quoteSymbol}{choice.quote.symbolAmbiguous?'*':''}</strong> <span>projects</span><span className="sr-only"> · {choice.quote.quoteName}</span></h2>{active && <span className="pair-result-count">{rows.length} sampled</span>}</div>
   <div className="pair-results-toolbar">
    <div className="pair-results-sort" role="group" aria-label="Sort sampled tokens" aria-describedby={active?'pair-sample-scope':undefined}>{([['liquidity','Liquidity','high to low'],['volume','Volume','high to low'],['name','Name','A to Z']] as const).map(([value,label,order])=><button key={value} type="button" disabled={sampleLoading || !rows.length} aria-pressed={sort===value} aria-label={'Sort sample by '+value+', '+order} onClick={()=>setSort(value)}>{label}<span aria-hidden="true">{sort===value?(value==='name'?' ↑':' ↓'):''}</span></button>)}</div>
    <button className="pair-sample-refresh" type="button" disabled={sampleLoading} aria-label={sampleLoading?'Loading sample':sampleError?'Retry sample':'Refresh sampled results'} onClick={()=>{cache.current.delete(choice.quote.quoteMint);setRefresh(v=>v+1);}}><span aria-hidden="true">↻</span></button>
    <span className="sr-only" role="status">{rows.length} sampled tokens, sorted by {sort==='name'?'name A to Z':sort==='liquidity'?'liquidity, high to low':'24 hour volume, high to low'}. Unavailable values last.</span>
   </div>
   {(sampleError || sampleLoading || !active) && <p className="pair-load-state" role="status">{sampleError || (sampleLoading?'Loading matching memecoins…':'Sample not loaded.')}</p>}
   {active && <>
    <p id="pair-sample-scope" className="pair-snapshot-note">StonkFun · incomplete sample · USD snapshots, not live. — unknown; holder returns unknown.</p>
    {(active.status==='degraded' || report?.status==='degraded' || report?.status==='unavailable' || group?.tokens.some(t=>t.catalog?.historyFreshness==='stale')) && <p className="pair-load-state" role="status">{active.status==='degraded'?'Source gaps in this sample. ':''}{report?.status==='degraded' || report?.status==='unavailable'?'Reward history degraded; flows withheld.':group?.tokens.some(t=>t.catalog?.historyFreshness==='stale')?'Stale reward history; flows withheld.':''}</p>}
    <RewardEvidenceKey/>
   </>}
   {group && (rows.length>0?<>
    <div className="pair-column-head" aria-hidden="true"><span>Project</span><div className="pair-market-head"><span className="pair-liquidity">Liquidity</span><span className="pair-volume">24h volume</span></div><span className="pair-evidence-head">Reward evidence</span></div>
    <div className="pair-token-list" aria-busy={sampleLoading}>{rows.map(t=><PairTokenRow key={t.mint} token={t} report={report} metric={sort==='volume'?'volume':'liquidity'}/>)}</div>
   </>:<p className="pair-empty" role="status">No matching memecoins within this bounded sample. Tokens may exist outside these fetched pages.</p>)}
   <details className="pair-dataset"><summary>Sources &amp; sampling details</summary><div className="pair-evidence-body">
    <p>{choice.quote.quoteName} · quote mint <a href={'https://solscan.io/token/'+choice.quote.quoteMint}>{choice.quote.quoteMint}</a>. {choice.quote.symbolAmbiguous?'* Multiple assets share this ticker. The featured choice selects only this exact mint; use search to choose another. ':''}Pair assets are tokens; no underlying equity/metal ownership or holder entitlement is implied.</p>
    <p>Identity from the <a href={choice.registry.dataset.provenance!.source}>official quote registry</a> · {choice.registry.dataset.coverage.registryCount} identities in the validated unpaginated response, not independently proven universal coverage. Verified {utc(choice.quote.verifiedAt)} · provider response {utc(choice.registry.dataset.provenance!.providerGeneratedAt)} · byte revision {choice.registry.dataset.provenance!.revision}. Registry membership does not establish a token market, launch readiness, reward eligibility or underlying ownership.</p>
    {coverage && <p>Fetched {coverage.pagesFetched}/{coverage.pageLimit} pages × {coverage.pageSize} records for this exact quote mint. {coverage.recordsReceived} inputs; {coverage.tokensReturned} returned; {coverage.rejectedRecords} rejected. Provider-reported total {coverage.providerReportedTotal??'Unavailable'} applies to this quote-mint query, not a verified complete ecosystem. Coverage is incomplete and pagination non-atomic, even when a small result fits one page. Mode checks {coverage.modeChecks}/{coverage.modeCheckLimit} · {coverage.warnings.join(', ')}.</p>}
    <p>Catalog response evaluated {utc(active?.dataset.fetchedAt??null)} · retrieved {utc(active?.dataset.dataFetchedAt??null)}. Individual market response dates are in row Details; market observation times remain unknown. Provider market-cap pages select the sample. Sorting only reorders these fetched rows for this exact quote mint, never the whole market. Default: reported liquidity, high to low. Unavailable values last, ties by name then symbol and mint. Name sort is A–Z. Mobile shows liquidity, or 24h volume when volume sort is active; both reported metrics are always in token Details. Scan values are rounded; Details keeps more precision. No reward or ROI ranking.</p>
    <p>Reward comparisons join only the existing tracked seven by exact token/quote/pool identity and verified mode. Radar freshness, gap/reset and matched-period gates remain authoritative. Sharing a quote does not synchronize intervals or imply a cross-token return.</p>
    <p>Recorded source {report?.dataset.sourceStatus??'Unavailable'} · retrieved {utc(report?.dataset.dataFetchedAt??null)} · revision {report?.dataset.revision??'Unavailable'}. Retrieval is not observation time.</p>
    <div className="pair-source-links"><a href={'/api/pair-quotes?mint='+choice.quote.quoteMint}>Registry JSON</a><a href={'/api/pairs?quoteMint='+choice.quote.quoteMint+'&discovery=pair'}>Sample JSON</a><a href="/api/radar?sort=name">Radar JSON</a><Link href="/status">Collection reliability</Link><Link href="/radar">Full Radar</Link><Link href="/research">Research guide</Link></div>
   </div></details>
  </div>}
 </section>;
}
