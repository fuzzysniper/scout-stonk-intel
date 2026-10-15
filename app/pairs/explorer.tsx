'use client';
import {HistoricalResearchLink} from '../historical-research-link';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { TrackedToken } from '../../lib/tracked-tokens';
import type { RadarReport } from '../../lib/radar';
import type { PairSource } from '../../lib/pairs-contract';
import type { RewardEvidence } from '../../lib/reward-evidence-contract';
import { flowReading, utc } from '../radar/evidence-view';
import { fromCatalog } from './adapter';
import { catalogMatchesQuote } from './registry';
import type { PairCatalog, PairToken } from './adapter';
import { fetchCatalog, fetchRadar } from './client';
import QuoteSearch from './quote-search';
import type { VerifiedChoice } from './quote-search';
import { DEFAULT_SAMPLE_SORT, readRewardEvidence, screenUsd, sortSample, tokenResearchPath } from './results';
import type { RewardEvidenceRead, SampleSort } from './results';
import {CopyResearchLink,dismissResearchKeyboard} from '../research-actions';

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
function rewardSummary(token:PairToken,reading:ReturnType<typeof rewardReading>,blocked:boolean,typed:RewardEvidenceRead) {
 const state=(label:string,description:string,warning:string|null=null)=>({label,description,warning});
 if(blocked)return state('Unverified','Source unavailable; reward evidence and market values withheld.','Source unavailable');
 if(typed.state==='invalid')return state('Unverified','Reward evidence did not pass identity, source or contract checks. Values withheld.','Reward evidence failed validation');
 const t=token.catalog;
 const warning=t?.modeVerification==='identity_mismatch' || t?.historyStatus==='identity_mismatch'?'Identity issue; flow withheld':t?.historyStatus==='invalid_data'?'Invalid'+(t.historyFreshness==='stale'?' / stale':'')+' history; flow withheld':t?.historyFreshness==='stale' || 'state' in reading && reading.state==='Stale observations'?'Stale history; flow withheld':t?.modeVerification==='source_unavailable'?'Official mode check unavailable':t?.historyStatus==='source_unavailable' || 'state' in reading && reading.state==='Source unavailable'?'History source unavailable; flow withheld':null;
 if(typed.state==='ready'){
  const e=typed.value;
  const quality=[e.mechanism.quality,e.lifetime.quality,e.interval.quality].includes('stale')?'Stale evidence; unavailable values withheld':e.mechanism.reason==='source_rate_limited'?'Official source rate limited':e.mechanism.reason==='source_unavailable'?'Official mode source unavailable':e.mechanism.reason==='registry_unverified' || e.mechanism.reason==='invalid_source'?'Official identity/source verification unavailable':warning;
  if(e.interval.state==='covered')return state('Interval covered','Dated counter changes pass coverage checks. Not verified holder payments or returns.',quality);
  if(e.lifetime.state==='reported')return state('Lifetime reported','Cumulative provider total, not recent earnings. Start and cutoff unknown; holder returns unverified.',quality);
  if(e.mechanism.state==='verified_reward')return state('Settings verified','Official setup confirmed. Distribution, recent flow and holder returns are not established.',quality);
  if(e.mechanism.state==='verified_standard')return state('No reward mode','Official standard mode, without a holder reward mechanism.',quality);
  return state('Unverified','No usable official reward verification here. Distributions and holder returns are not established.',quality);
 }
 if(t?.modeVerification==='verified_standard')return state('No reward mode','StonkFun confirms standard mode, without a holder reward mechanism.',warning);
 if(!token.rewardModeVerified)return state('Unverified','No usable official reward-mode verification in this sample; payments and returns are not established.',warning);
 return state('Settings verified','Dated official reward settings. This older response supplies no typed lifetime or covered interval evidence; holder payments and returns are not verified.',warning);
}
export function RewardEvidenceKey() {
 return <aside className="pair-reward-key" aria-label="Reward evidence key">
  <details><summary>Evidence key</summary><div className="pair-evidence-body"><p id="pair-reward-key"><strong>Settings verified</strong> confirms setup. <strong>Lifetime reported</strong> is cumulative. <strong>Interval covered</strong> is dated counter flow. <strong>Holder returns unavailable</strong> — none verifies paid holders or profit.</p>

   <p><strong>Settings verified:</strong> the official response confirms reward settings for this exact token and quote. <strong>Lifetime reported:</strong> a provider-reported lifetime distribution, not a recent earning rate; its start and reconciliation cutoff are unknown. <strong>Interval covered:</strong> counter observations pass the strict coverage gates for the actual current and previous windows. Exact amounts, quote units, coverage, original source timestamps and last reported payout time are one tap deeper in token Details.</p>
   <p><strong>Unverified:</strong> the sample has no usable official mode verification. <strong>No reward mode:</strong> the official response confirms standard mode. An amber ! flags a source or history problem; open that row’s Details for its reason. A history problem does not erase separately verified reward settings, but it withholds usable flow.</p>
   <p><strong>Holder returns unavailable:</strong> entitlement, costs and holder cashflows are missing. Neither settings, reported totals nor covered flow verifies holder receipts or ROI. A reported zero stays zero; unavailable data stays unavailable. Missing evidence is not zero. Older responses supply only dated settings and legacy observations, not the new lifetime or covered-interval evidence.</p>
   <p>Research two projects in this same-quote sample by opening their Details. Inspect the official source, then open or copy each token’s dossier link. Links identify a token; they do not freeze these figures or share this pair selection.</p>
   <p>Token marks are generated from each mint, not official logos or proof of identity. Exact mints and sources are in Details.</p>
  </div></details>
 </aside>;
}
const evidenceReason=(reason:string|null)=>reason?.replaceAll('_',' ')??'Not reported';
function RewardSource({source,label,reference=null}:{source:PairSource|null;label:string;reference?:string|null}) {
 return <p className="pair-reward-source">{source?<>Response <time dateTime={source.providerGeneratedAt}>{utc(source.providerGeneratedAt)}</time><br/>Retrieved <time dateTime={source.fetchedAt}>{utc(source.fetchedAt)}</time> · <a href={source.source}>{label} ↗</a><br/>Byte revision {source.revision}</>:<>No successful source read captured.{reference && <> <a href={reference}>Official lookup ↗</a> (lookup only, not read evidence).</>}</>}</p>;
}
function RewardEvidenceFacts({evidence:e}:{evidence:RewardEvidence}) {
 const lifetime=e.lifetime.value,interval=e.interval.value;
 return <dl className="pair-reward-facts" aria-label="Reward evidence">
  <div><dt>Official response provenance</dt><dd><RewardSource source={e.mechanism.source} reference={e.mechanism.referenceUrl} label="Official mode source"/>{e.lifetime.source && (e.mechanism.source && e.lifetime.source.revision===e.mechanism.source.revision && e.lifetime.source.fetchedAt===e.mechanism.source.fetchedAt?<p>Lifetime evidence uses this same original official response.</p>:<RewardSource source={e.lifetime.source} label="Official lifetime source"/>)}</dd></div>
  <div><dt>Official reward settings</dt><dd>{e.mechanism.state==='verified_reward'?'Reward settings verified':e.mechanism.state==='verified_standard'?'No holder reward mode (verified)':'Unverified'} · {e.mechanism.quality}{e.mechanism.reason && <> · {evidenceReason(e.mechanism.reason)}</>}</dd></div>
  <div><dt>Reported lifetime distribution</dt><dd>{e.lifetime.state==='reported' && lifetime?<>
   <strong>{lifetime.distributedTokens} {e.unit.symbol}</strong> · provider ledger, cumulative<br/>Raw amount {lifetime.distributedRaw} · {e.unit.decimals} decimals<br/>Reported ledger events {lifetime.payoutCount}; recipients {lifetime.walletsPaid} (provider counts, not verified receipts).<br/>Last reported payout: {lifetime.lastPayoutAt?<time dateTime={lifetime.lastPayoutAt}>{utc(lifetime.lastPayoutAt)}</time>:'Not reported'}<br/>Lifetime start and reconciliation cutoff unknown. Not recent flow or an earning rate.
  </>:<>Unavailable · {evidenceReason(e.lifetime.reason)} · {e.lifetime.quality}</>}</dd></div>
  <div><dt>Covered interval flow</dt><dd>{e.interval.state==='covered' && interval?<>
   {(['current','previous'] as const).map(key=>{const p=interval[key];return <p key={key}><strong>{key==='current'?'Current':'Previous'}: {p.distributed.tokens} {e.unit.symbol}</strong> · counter change<br/>Actual observations <time dateTime={p.startAt}>{utc(p.startAt)}</time> → <time dateTime={p.endAt}>{utc(p.endAt)}</time> · {p.seconds} seconds<br/>Provider boundaries <time dateTime={p.providerStartAt}>{utc(p.providerStartAt)}</time> → <time dateTime={p.providerEndAt}>{utc(p.providerEndAt)}</time><br/>{p.observationCount} points · maximum gap {p.maxGapSeconds}s · raw amount {p.distributed.atomic}</p>;})}
   <p>Current minus previous counter change: {interval.change.tokens} {e.unit.symbol} (raw {interval.change.atomic}). Not a return.</p>
  </>:<>{e.interval.state==='insufficient_history'?'Insufficient history':'Unavailable'} · {e.interval.quality}{e.interval.reasons.length>0 && <> · {e.interval.reasons.map(evidenceReason).join('; ')}</>}{e.interval.details.length>0 && <p>{e.interval.details.join('; ')}</p>}</>}
   <p>History {e.interval.historySource.sourceStatus}{e.interval.historySource.dataFetchedAt && <> · retrieved <time dateTime={e.interval.historySource.dataFetchedAt}>{utc(e.interval.historySource.dataFetchedAt)}</time></>}{e.interval.historySource.source && <> · <a href={e.interval.historySource.source}>Recorded counter source ↗</a></>}{e.interval.historySource.revision && <><br/>Byte revision {e.interval.historySource.revision}</>}</p>
  </dd></div>
  <div><dt>Holder returns</dt><dd>Unavailable. Holder entitlement, costs and cashflows are missing. Provider counts and counter changes do not verify holder payments or ROI.</dd></div>
  <div><dt>Evidence evaluated</dt><dd><time dateTime={e.evaluatedAt}>{utc(e.evaluatedAt)}</time> · calculation time, not a payout observation. Quote-token units: {e.unit.symbol} · {e.unit.mint} · {e.unit.decimals} decimals. Coverage incomplete and non-atomic; earning rankings withheld.</dd></div>

  {e.interval.state==='covered' && interval && <div><dt>Interval source receipts</dt><dd><RewardSource source={interval.modeSource} label="Interval mode source"/><RewardSource source={interval.catalogSource} label="Interval catalog source"/></dd></div>}
 </dl>;
}
export function PairTokenRow({token,report,catalog=null,blocked=false,metric='liquidity'}:{token:PairToken;report:RadarReport|null;catalog?:PairCatalog|null;blocked?:boolean;metric?:'liquidity'|'volume'}) {
 const [open,setOpen]=useState(false),toggle=useRef<HTMLButtonElement>(null),technical=useRef<HTMLDetailsElement>(null);
 const reading=rewardReading(token,report,blocked),t=token.catalog;
 const market=!blocked && t?.market.status==='reported_snapshot'?t.market:null;
 const typed=blocked?{state:'invalid',value:null} as const:readRewardEvidence(token,catalog);
 const evidence=rewardSummary(token,reading,blocked,typed),detailId='pair-detail-'+token.mint;
 const researchPath=tokenResearchPath(token.mint);
 const close=()=>{setOpen(false);if(technical.current)technical.current.open=false;toggle.current?.focus();};
 return <article className="pair-token" aria-labelledby={'pair-token-'+token.mint} onKeyDown={e=>{if(open && e.key==='Escape'){e.preventDefault();close();}}}>
  <div className="pair-row-main">
   <Link className="pair-token-name" href={researchPath} onClick={dismissResearchKeyboard} aria-label={'Open '+token.symbol+' · '+token.name+' dossier'}><TokenIdentityMark mint={token.mint}/><div className="pair-token-label"><h3 id={'pair-token-'+token.mint}>{token.symbol}</h3><span title={token.name}>{token.name}</span></div></Link>
   <dl className="pair-market">{([['liquidity','Liquidity',market?.liquidityUsd??null],['volume','24h volume',market?.volume24hUsd??null]] as const).map(([key,label,value])=><div className={'pair-'+key+(metric===key?' is-active':'')} key={key}><dt className="sr-only">Reported {label}, USD snapshot</dt><dd title={usd(value)}>{value===null?<><span aria-hidden="true">—</span><span className="sr-only">Unavailable</span></>:screenUsd(value)}</dd></div>)}</dl>
   <span className="pair-row-state" title={evidence.description+(evidence.warning?' '+evidence.warning:'')}>{evidence.label}{evidence.warning && <span className="pair-evidence-warning" aria-hidden="true">!</span>}<span className="sr-only"> · {evidence.description}{evidence.warning?' '+evidence.warning:''}</span></span>
   <button ref={toggle} className="pair-detail-toggle" type="button" aria-expanded={open} aria-controls={detailId} aria-label={'Details for '+token.symbol+' · '+token.name} onClick={()=>{dismissResearchKeyboard();if(technical.current)technical.current.open=false;setOpen(v=>!v);}}><svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="16" height="16"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></button>
  </div>
  <div className="pair-evidence-body" id={detailId} hidden={!open}>
   <div className="quick-heading"><span>Quick view · {token.quoteSymbol}</span><button type="button" className="quick-close" onClick={close} aria-label={'Close quick view for '+token.symbol}>Close <span aria-hidden="true">×</span></button></div>
   <dl className="quick-market" aria-label="Reported USD snapshot"><div><dt>Liquidity</dt><dd>{market?.liquidityUsd==null?'Unknown':screenUsd(market.liquidityUsd)}</dd></div><div><dt>24h volume</dt><dd>{market?.volume24hUsd==null?'Unknown':screenUsd(market.volume24hUsd)}</dd></div></dl>
   <p className="quick-source">StonkFun · reported USD snapshot, not live</p>
   <div className="quick-conclusion"><strong>{evidence.label}</strong><p>{evidence.description}</p></div>
   {evidence.warning && <p className="pair-detail-warning">{evidence.warning}</p>}
   <div className="pair-research-actions"><Link href={researchPath} onClick={dismissResearchKeyboard}>Open dossier →</Link><CopyResearchLink mint={token.mint} label={token.symbol+' · '+token.name}/></div>
   <HistoricalResearchLink mint={token.mint} quoteMint={token.quoteMint}/>
   <details ref={technical} className="quick-technical"><summary>Technical evidence</summary><div className="quick-technical-body">
   <p>Links identify this token, not frozen figures. The dossier reads separate market and reward sources.</p>
   {typed.state==='ready'?<RewardEvidenceFacts evidence={typed.value}/>:typed.state==='absent'?<dl className="pair-reward-facts"><div><dt>Official reward settings</dt><dd>{modeLabel(token)}<RewardSource source={t?.rewardSource??null} label="Official mode source"/></dd></div><div><dt>Reported lifetime distribution</dt><dd>Unavailable from this older response.</dd></div><div><dt>Covered interval flow</dt><dd>Unavailable from this older response. Legacy observations do not establish strict covered windows.</dd></div><div><dt>Legacy recorded counter change</dt><dd>{'state' in reading?reading.state:<>Distributed counter change: {number(reading.value)} {token.quoteSymbol}</>}</dd></div><div><dt>Holder returns</dt><dd>Unavailable. Holder entitlement, costs and cashflows are missing.</dd></div></dl>:<p>Reward evidence unavailable; values withheld after validation. Holder returns unavailable.</p>}
   <dl><div><dt>Token / quote mint</dt><dd>{token.name} · {token.mint}<br/>{token.quoteMint} · {token.quoteSymbol}</dd></div><div><dt>Recorded history</dt><dd>{token.observationCount??'Unavailable'} points · {t?.historyStatus??'Tracked sample'}{t?.historyIssues.length?<> · {t.historyIssues.join(', ')}</>:null}<br/>{token.lastObservedAt?<>Observed <time dateTime={token.lastObservedAt}>{utc(token.lastObservedAt)}</time></>:'Observation unavailable'}</dd></div>
    <div><dt>Reported USD snapshot</dt><dd>{market?<>Liquidity {usd(market.liquidityUsd)} · 24h volume {usd(market.volume24hUsd)} · price {usd(market.priceUsd)} · response generated <time dateTime={market.providerGeneratedAt}>{utc(market.providerGeneratedAt)}</time></>:'Market snapshot unavailable'}</dd></div>
    <div><dt>Pool account</dt><dd>{t?.poolMint??token.radar?.poolMint??'Unavailable'} · provider catalog account; not independently reconciled to a trading pool</dd></div>
    <div><dt>Price observation time</dt><dd>Unavailable. Response generation/retrieval is not a market tick time. USD snapshots are not quote-token prices or live quotes.</dd></div>
    <div><dt>Historical quote-relative return</dt><dd>Unavailable</dd></div><div><dt>Quote-asset benchmark return</dt><dd>Unavailable</dd></div><div><dt>Holder-attributable rewards</dt><dd>Unavailable</dd></div>
   </dl>
   {t && <p>Catalog response {utc(t.provenance.providerGeneratedAt)} · retrieved {utc(t.provenance.fetchedAt)} · <a href={t.source}>Official token catalog ↗</a><br/>Byte revision {t.provenance.revision}</p>}
   {typed.state==='absent' && !('state' in reading) && <p>Actual interval: <time dateTime={reading.startAt}>{utc(reading.startAt)}</time> → <time dateTime={reading.endAt}>{utc(reading.endAt)}</time> ({number(reading.seconds/3600)} hours). Legacy counter change, not covered interval evidence or an individual return.</p>}
   {typed.state==='absent' && !('state' in reading) && reading.kind==='matched' && token.radar && <dl>{([['Current',token.radar.signals.current],['Previous',token.radar.signals.previous]] as const).map(([label,period])=><div key={label}><dt>{label} matched period</dt><dd>{period.distributedTokens===null?'Unavailable':number(period.distributedTokens)+' '+token.quoteSymbol} · {utc(period.startAt)} → {utc(period.endAt)} · {period.observationCount} points · maximum gap {period.maxGapSeconds??'unknown'}s</dd></div>)}</dl>}
   <p>Same quote does not establish synchronized periods between tokens. Missing observations are not zero rewards. No holder entitlement, historical return or underlying equity/metal ownership is inferred.</p>
   <div className="pair-source-links">{token.radar && <><a href={token.radar.source}>Official rewards ↗</a><a href={'/api/history?mint='+token.mint}>Recorded history ↗</a></>}</div>
   </div></details>
  </div>
 </article>;
}
export default function PairExplorer({tokens}:{tokens:TrackedToken[]}) {
 const [sort,setSort]=useState<SampleSort>(DEFAULT_SAMPLE_SORT);
 const [choice,setChoice]=useState<VerifiedChoice|null>(null);
 const resultHeading=useRef<HTMLHeadingElement>(null);
 const [catalog,setCatalog]=useState<PairCatalog|null>(null),[report,setReport]=useState<RadarReport|null>(null),[sampleLoading,setSampleLoading]=useState(false),[sampleError,setSampleError]=useState(''),[refresh,setRefresh]=useState(0);
 const cache=useRef(new Map<string,{at:number;value:PairCatalog}>());
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
 const select=(value:VerifiedChoice)=>{setChoice(value);requestAnimationFrame(()=>resultHeading.current?.focus({preventScroll:true}));};
 const coverage=active?.dataset.coverage;
 return <section className="pair-explorer pair-simple" aria-label="Pair intelligence explorer">
  <header className={'pair-heading'+(choice?' has-selection':'')}><h1>Memecoin research, by quote asset.</h1></header>
  <QuoteSearch selected={!!choice} onSelect={select}/>
  {choice && <div className="pair-results" data-metric={sort==='volume'?'volume':'liquidity'}>
   <div className="pair-result-heading"><h2 ref={resultHeading} tabIndex={-1}><strong>{choice.quote.quoteSymbol}</strong><span title={choice.quote.quoteName}>{choice.quote.quoteName}</span><small title={choice.quote.quoteMint}>{shortMint(choice.quote.quoteMint)}</small></h2>{active && <span className="pair-result-count">{rows.length} sampled</span>}</div>
   <div className="pair-results-toolbar">
    <div className="pair-results-sort" role="group" aria-label="Sort sampled tokens" aria-describedby={active?'pair-sample-scope':undefined}>{([['liquidity','Liquidity','high to low'],['volume','Volume','high to low'],['name','Name','A to Z']] as const).map(([value,label,order])=><button key={value} type="button" disabled={sampleLoading || !rows.length} aria-pressed={sort===value} aria-label={'Sort sample by '+value+', '+order} onClick={()=>setSort(value)}>{label}<span aria-hidden="true">{sort===value?(value==='name'?' ↑':' ↓'):''}</span></button>)}</div>
    <button className="pair-sample-refresh" type="button" disabled={sampleLoading} aria-label={sampleLoading?'Loading sample':sampleError?'Retry sample':'Refresh sampled results'} onClick={()=>{cache.current.delete(choice.quote.quoteMint);setRefresh(v=>v+1);}}><span aria-hidden="true">↻</span></button>
    <span className="sr-only" role="status">{rows.length} sampled tokens, sorted by {sort==='name'?'name A to Z':sort==='liquidity'?'liquidity, high to low':'24 hour volume, high to low'}. Unavailable values last.</span>
   </div>
   {(sampleError || sampleLoading || !active) && <p className="pair-load-state" role="status">{sampleError || (sampleLoading?'Loading matching memecoins…':'Sample not loaded.')}</p>}
   {active && <>
    <p id="pair-sample-scope" className="pair-snapshot-note">StonkFun · limited sample · USD snapshots, not live · — unknown</p>
    {(active.status==='degraded' || report?.status==='degraded' || report?.status==='unavailable' || group?.tokens.some(t=>t.catalog?.historyFreshness==='stale')) && <p className="pair-load-state" role="status">{active.status==='degraded'?'Source gaps in this sample. ':''}{report?.status==='degraded' || report?.status==='unavailable'?'Reward history degraded; flows withheld.':group?.tokens.some(t=>t.catalog?.historyFreshness==='stale')?'Stale reward history; flows withheld.':''}</p>}
    <RewardEvidenceKey/>
   </>}
   {group && (rows.length>0?<>
    <div className="pair-column-head" aria-hidden="true"><span>Project</span><div className="pair-market-head"><span className="pair-liquidity">Liquidity</span><span className="pair-volume">24h volume</span></div><span className="pair-evidence-head">Reward evidence</span></div>
    <div className="pair-token-list" aria-busy={sampleLoading}>{rows.map(t=><PairTokenRow key={t.mint} token={t} report={report} catalog={active} metric={sort==='volume'?'volume':'liquidity'}/>)}</div>
   </>:<p className="pair-empty" role="status">No matching memecoins within this bounded sample. Tokens may exist outside these fetched pages.</p>)}
   <details className="pair-dataset"><summary>Sources &amp; sampling details</summary><div className="pair-evidence-body">
    <p>{choice.quote.quoteName} · quote mint <a href={'https://solscan.io/token/'+choice.quote.quoteMint}>{choice.quote.quoteMint}</a>. {choice.quote.symbolAmbiguous?'Multiple assets share this ticker. This selection uses only this exact mint; use search to choose another. ':''}Pair assets are tokens; no underlying equity/metal ownership or holder entitlement is implied.</p>
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
