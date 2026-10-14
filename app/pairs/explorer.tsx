'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { TrackedToken } from '../../lib/tracked-tokens';
import type { RadarReport } from '../../lib/radar';
import { flowReading, utc } from '../radar/evidence-view';
import { fromCatalog, fromTracked, discoveryEvidence, mergePairGroups, searchPairs, validMint, visibleTokens } from './adapter';
import type { PairCatalog, PairToken } from './adapter';
import { fetchCatalog, fetchRadar } from './client';

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
 const [catalog,setCatalog]=useState<PairCatalog|null>(null),[report,setReport]=useState<RadarReport|null>(null);
 const [loading,setLoading]=useState(true),[catalogFailed,setCatalogFailed]=useState(false),[radarFailed,setRadarFailed]=useState(false),[refresh,setRefresh]=useState(0);
 const [query,setQuery]=useState(''),[selected,setSelected]=useState(()=>tokens.find(t=>t.quoteSymbol==='NVDAX')?.quoteMint??tokens[0]?.quoteMint??'');
 const [scoped,setScoped]=useState<PairCatalog|null>(null),[scopeLoading,setScopeLoading]=useState(false),[scopeFailed,setScopeFailed]=useState(false),[lookupError,setLookupError]=useState(''),[lookupNonce,setLookupNonce]=useState(0);
 const [knownScopes,setKnownScopes]=useState<PairCatalog[]>([]);
 const cache=useRef(new Map<string,{at:number;value:PairCatalog}>());
 useEffect(()=>{
  let disposed=false;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  cache.current.clear();setKnownScopes([]);setLoading(true);setCatalog(null);setReport(null);setCatalogFailed(false);setRadarFailed(false);setScoped(null);setScopeFailed(false);setScopeLoading(false);
  void Promise.allSettled([
   fetchCatalog(controller.signal).then(r=>{if(!disposed){if(r.status==='ready')setCatalog(r.catalog);else setCatalogFailed(true);}}).catch(()=>{if(!disposed)setCatalogFailed(true);}).finally(()=>{if(!disposed)setLoading(false);}),
   fetchRadar(controller.signal).then(r=>{if(!disposed)setReport(r);}).catch(()=>{if(!disposed)setRadarFailed(true);}),
  ]).finally(()=>clearTimeout(timer));
  return()=>{disposed=true;clearTimeout(timer);controller.abort();};
 },[refresh]);
 useEffect(()=>{
  if(!catalog || !validMint(selected))return;
  let disposed=false;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  setScoped(null);setScopeFailed(false);setLookupError('');
  const cached=cache.current.get(selected);
  if(cached && Date.now()-cached.at<300000){setScoped(cached.value);setScopeLoading(false);clearTimeout(timer);return()=>controller.abort();}
  setScopeLoading(true);
  void fetchCatalog(controller.signal,selected,discoveryEvidence(catalog)!==null).then(r=>{
   if(disposed)return;
   if(r.status==='ready'){
    cache.current.set(selected,{at:Date.now(),value:r.catalog});if(cache.current.size>12)cache.current.delete(cache.current.keys().next().value!);
    setScoped(r.catalog);
    setKnownScopes(prior=>[...prior.filter(c=>c.groups[0]?.quoteMint!==selected),r.catalog].slice(-12));
   }else{setScopeFailed(true);if(r.status==='not_found')setLookupError('This mint is not in the verified registry response.');}
  }).catch(()=>{if(!disposed)setScopeFailed(true);}).finally(()=>{clearTimeout(timer);if(!disposed)setScopeLoading(false);});
  return()=>{disposed=true;clearTimeout(timer);controller.abort();};
 },[catalog,selected,lookupNonce]);
 const globalGroups=useMemo(()=>catalog?fromCatalog(catalog,report,tokens):fromTracked(tokens,report),[catalog,report,tokens]);
 const scopedGroups=useMemo(()=>scoped?fromCatalog(scoped,report,tokens):[],[scoped,report,tokens]);
 const groups=useMemo(()=>mergePairGroups(globalGroups,knownScopes.map(c=>fromCatalog(c,report,tokens))),[globalGroups,knownScopes,report,tokens]);
 const matches=searchPairs(groups,query);
 const group=scopedGroups.find(g=>g.quoteMint===selected)??groups.find(g=>g.quoteMint===selected);
 const rows=group?visibleTokens(group,query):[];
 const visible=group && (matches.some(g=>g.quoteMint===selected) || query.trim()===selected);
 const duplicates=new Map<string,number>();for(const g of groups)duplicates.set(g.quoteSymbol,(duplicates.get(g.quoteSymbol)??0)+1);
 const chips=query?matches:matches.filter(g=>g.quoteMint===selected).concat(matches.filter(g=>g.quoteMint!==selected)).slice(0,4);
 const active=scoped??catalog,partial=active?.status==='degraded',blocked=scopeFailed || radarFailed;
 const coverage=active?.dataset.coverage,discovery=active?discoveryEvidence(active):null;
 return <section className="pair-explorer" aria-label="Pair intelligence explorer">
  <header className="pair-heading"><span className="flow-brand">SCOUT / PAIR INTELLIGENCE</span><h1>Choose your pair.<br className="pair-mobile-break"/> Compare the evidence.</h1></header>
  <div className="pair-controls"><label htmlFor="pair-search">Find a quote asset or sampled token</label><input id="pair-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="NVDAX, STONK, name or exact mint…" autoComplete="off" spellCheck={false}/>
   <div className="pair-chips" role="group" aria-label="Verified quote pairs">{chips.slice(0,24).map(g=><button type="button" key={g.quoteMint} aria-pressed={g.quoteMint===selected} title={g.quoteMint} onClick={()=>{setSelected(g.quoteMint);setLookupError('');}}>{g.quoteSymbol}<span>{g.tokens.length}<span className="sr-only"> tokens in fetched sample</span></span>{(g.symbolAmbiguous || (duplicates.get(g.quoteSymbol)??0)>1) && <small>{shortMint(g.quoteMint)}</small>}<span className="sr-only"> quote mint {g.quoteMint}</span></button>)}</div>
   {!query && groups.length>4 && <details className="pair-picker"><summary>Browse {groups.length} returned quote assets</summary><label htmlFor="pair-select">Select an exact quote mint</label><select id="pair-select" value={groups.some(g=>g.quoteMint===selected)?selected:''} onChange={e=>setSelected(e.target.value)}><option value="" disabled>Choose a quote asset</option>{groups.map(g=><option key={g.quoteMint} value={g.quoteMint}>{g.quoteSymbol} · {g.quoteName} · {shortMint(g.quoteMint)}</option>)}</select><p>Only quotes returned by this bounded catalog. Search narrows the list.</p></details>}
   {query && matches.length>24 && <p role="status">First 24 matching quote assets. Refine the search or use an exact mint.</p>}
   {matches.length===0 && <p role="status">No match in the fetched sample. {validMint(query.trim())?<button className="pair-clear" type="button" disabled={scopeLoading||loading} onClick={()=>{setSelected(query.trim());setLookupError('');setLookupNonce(v=>v+1);}}>Verify exact quote mint</button>:<button className="pair-clear" type="button" onClick={()=>setQuery('')}>Clear search</button>}</p>}
   {matches.length>0 && !visible && <p role="status">Choose a matching quote asset.</p>}
   {lookupError && <p role="status">{lookupError}</p>}
  </div>
  <div className="pair-scope"><span>{catalog?discovery?.strategy==='provider_quote_mint'?'Bounded exact-mint query':'Bounded global catalog':loading?'Catalog loading · tracked sample':'Catalog unavailable · dated tracked sample'} · {catalog?coverage?.tokensReturned??catalog.dataset.coverage.tokensReturned:tokens.length} {catalog?'sampled':'tracked'} tokens</span><button type="button" disabled={loading} onClick={()=>setRefresh(v=>v+1)}>{loading?'Reading…':catalogFailed?'Retry catalog':'Refresh'}</button></div>
  <p className="pair-load-state" role="status">{loading?'Reading official discovery…':catalogFailed?'Official catalog unavailable. Showing the separate seven-token tracked sample.':scopeFailed?'Selected-pair source unavailable. Earlier identities retained; snapshot and flow figures withheld.':scopeLoading?'Checking selected pair…':partial?'Partial source / mode checks · sampled tokens only.':'Bounded sample · incomplete ecosystem coverage.'}</p>
  {visible && group && <>
   <div className="pair-selected"><h2>{group.quoteSymbol}<span> / {rows.length} {query?'matching':'returned'} {rows.length===1?'token':'tokens'} in sample{rows.length>0?<> · {rows.filter(t=>t.rewardModeVerified).length} {catalog?'reward-mode verified':'dated tracked mode'}</>:null}</span></h2><p>Quote mint <a href={'https://solscan.io/token/'+group.quoteMint}>{group.quoteMint}</a>{group.symbolAmbiguous?' · ticker is ambiguous; mint selects identity':''}</p><p>Quote token identity; no underlying equity/metal ownership implied.</p></div>
   <p className="pair-snapshot-note">USD snapshots · market observation time unavailable.<br/>Historical return &amp; holder entitlement unavailable.</p>
   {rows.length>0?<div className="pair-token-list" aria-busy={scopeLoading}>{rows.map(t=><PairTokenRow key={t.mint} token={t} report={report} blocked={blocked}/>)}</div>:<p className="pair-empty" role="status">{group.tokens.length===0?'Verified quote identity; no tokens in the fetched catalog pages. Tokens may exist outside this bounded sample.':'No matching token in this sampled group.'}</p>}
   <details className="pair-dataset"><summary>Pair identity &amp; coverage</summary><div className="pair-evidence-body"><p>Quote identity checked {utc(group.verifiedAt)} against the <a href={group.source}>official source</a>. Provider consistency is not independent onchain reconciliation.</p>
    {coverage?<p>Fetched {coverage.pagesFetched} of at most {coverage.pageLimit} pages × {coverage.pageSize} records. {coverage.recordsReceived} input records; {coverage.tokensReturned} returned tokens in this response; {coverage.rejectedRecords} rejected records. Provider-reported total {coverage.providerReportedTotal??'Unavailable'} applies to {discovery?.providerReportedTotalScope==='quote_mint'?'this exact quote-mint query':'the catalog query'}, not a verified exhaustive ecosystem. Coverage is incomplete and pagination is non-atomic. {catalog?.dataset.coverage.registryCount??coverage.registryCount} registry entries were counted; only returned identities can appear in this picker. {discovery?.strategy==='provider_quote_mint'?'Verified server-side exact quote-mint filter; this is still a bounded sample.':'Quote selection filters the global fetched pages locally; it does not enumerate this pair.'}</p>:<p>Seven curated tokens only; this is a separate dated tracked sample. Absent pairs may exist.</p>}
    {coverage && <p>Mode checks {coverage.modeChecks}/{coverage.modeCheckLimit} · {coverage.warnings.join(', ')}. Provider market-cap pages select the sample; rows are alphabetical, with no investment rank.</p>}
    <p>Catalog response evaluated {utc(active?.dataset.fetchedAt??null)} · retrieved {utc(active?.dataset.dataFetchedAt??null)}. Individual market response dates are shown on rows; price observation times remain unknown.</p>
    <p>Reward comparisons join only the existing tracked seven by exact token/quote/pool identity and verified mode. Existing Radar freshness, gap/reset and matched-period gates remain authoritative. No synchronized cross-token return is implied.</p>
    <p>Recorded source {report?.dataset.sourceStatus??'Unavailable'} · retrieved {utc(report?.dataset.dataFetchedAt??null)} · revision {report?.dataset.revision??'Unavailable'}. Retrieval time is not an observation time.</p>
    <div className="pair-source-links"><a href="/api/pairs">Catalog JSON</a><a href="/api/radar?sort=name">Radar JSON</a><Link href="/status">Collection reliability</Link><Link href="/radar">Full Radar</Link><Link href="/research">Research guide</Link></div>
   </div></details>
  </>}
 </section>;
}
