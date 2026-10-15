import type {HistoryReport} from '../../lib/history';
import type {RewardEvidence} from '../../lib/reward-evidence-contract';
import type {PairCatalog,PairToken} from '../pairs/adapter';
import {fromCatalog,validMint} from '../pairs/adapter';
import {readRewardEvidence} from '../pairs/results';

export type LegacyReward={status:string;mint?:string;mode?:string|null;quoteSymbol?:string|null;quoteMint?:string|null;distributedTokens?:number|null;payoutCount?:number|null;holderCount?:number|null;lastPayoutAt?:string|null;source?:string;fetchedAt?:string};
export type DossierPair={state:'loading'|'not_requested'|'unavailable'|'not_in_sample'|'invalid';catalog:PairCatalog|null;token:null;evidence:null}|{state:'ready';catalog:PairCatalog;token:PairToken;evidence:RewardEvidence};
export const emptyPair=(state:Exclude<DossierPair['state'],'ready'>,catalog:PairCatalog|null=null):DossierPair=>({state,catalog,token:null,evidence:null});
export const officialLedger=(mint:string)=>'https://www.stonkfun.xyz/api/public/v1/tokens/'+mint+'/rewards';
const date=(value:unknown):value is string=>typeof value==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|\+00:00)$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,19)===value.slice(0,19);
/** A successful legacy record is a source link, never strict settings/flow proof. */
export function legacyRecord(mint:string,reward:LegacyReward|null):reward is LegacyReward {
 return Boolean(reward && validMint(mint) && reward.mint===mint && ['available','no_rewards'].includes(reward.status) && reward.source===officialLedger(mint) && date(reward.fetchedAt));
}
/** Caller uses the unchanged catalog parser; reuse its existing strict UI guard. */
export function dossierPair(catalog:PairCatalog,mint:string,quoteMint:string):DossierPair {
 const tokens=fromCatalog(catalog).flatMap(g=>g.tokens).filter(t=>t.mint===mint && t.quoteMint===quoteMint);
 if(!tokens.length)return emptyPair('not_in_sample',catalog);
 if(tokens.length!==1)return emptyPair('invalid',catalog);
 const token=tokens[0],read=readRewardEvidence(token,catalog);
 return read.state==='ready'?{state:'ready',catalog,token,evidence:read.value}:emptyPair('invalid',catalog);
}
export type DossierHistory={report:HistoryReport|null;failed:boolean;loading:boolean};
const readable=(value:string)=>new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC'}).format(new Date(value))+' UTC';
function recordedObservation(mint:string,quoteMint:string|null,history:DossierHistory,pair:DossierPair) {
 const h=history.report;
 if(h && h.mint===mint && h.status==='recorded' && h.source===officialLedger(mint) && validMint(h.quote?.mint) && (!quoteMint || h.quote.mint===quoteMint) && date(h.latestObservedAt) && h.latestObservedAt===h.endAt && date(h.fetchedAt) && Date.parse(h.latestObservedAt)<=Date.parse(h.fetchedAt))return {at:h.latestObservedAt,stale:h.freshness.status==='stale'};
 if(pair.state==='ready' && pair.token.catalog?.historyStatus==='recorded' && date(pair.token.lastObservedAt))return {at:pair.token.lastObservedAt,stale:pair.token.catalog.historyFreshness==='stale'};
 return null;
}
/** Presentation only: no counters/deltas, new freshness thresholds or weaker fallback gates. */
export function dossierFinding(mint:string,reward:LegacyReward|null,pair:DossierPair,history:DossierHistory) {
 const e=pair.evidence,quoteMint=e?.unit.mint??(legacyRecord(mint,reward) && validMint(reward.quoteMint)?reward.quoteMint:null);
 const recorded=recordedObservation(mint,quoteMint,history,pair);
 const identityIssue=pair.state==='ready' && (pair.token.catalog?.modeVerification==='identity_mismatch' || pair.token.catalog?.historyStatus==='identity_mismatch' || e?.mechanism.reason==='invalid_source' || e?.mechanism.reason==='registry_unverified');
 const official=identityIssue?null:e?.mechanism.source?.source??e?.lifetime.source?.source??(legacyRecord(mint,reward)?reward.source!:null);
 const mode=e?.mechanism.state==='verified_reward',standard=e?.mechanism.state==='verified_standard';
 const warning:string[]=[];
 if(identityIssue)warning.push('Official identity could not be verified.');
 if(e?.mechanism.quality==='stale')warning.push('Official settings response is stale.');
 else if(e?.lifetime.quality==='stale')warning.push('Lifetime report is stale.');
 else if(e?.interval.quality==='stale' && !recorded?.stale)warning.push('Interval evidence is stale.');
 if(e?.mechanism.reason==='source_rate_limited')warning.push('Official source is rate limited.');
 else if(e?.mechanism.reason==='source_unavailable' || reward?.status==='unavailable')warning.push('Official source could not be read.');
 if(pair.state==='invalid')warning.push('Evidence identity or validation failed.');
 if(pair.catalog?.status==='degraded' && warning.length===0)warning.push('Some bounded sample source checks failed.');
 if(history.failed || history.report?.dataset.sourceStatus==='unavailable')warning.push('Recorded history source is unavailable.');
 else if(history.report?.dataset.sourceStatus==='degraded')warning.push('Recorded history source is degraded.');
 if(history.report && (history.report.status==='invalid_data' || history.report.issues.some(issue=>issue!=='stale_data')))warning.push('Recorded history has quality warnings.');
 if(e?.interval.state!=='covered' && (!recorded && history.report?.freshness.status==='stale'))warning.push('Recorded history is stale.');
 let title='Recent reward activity not verified';
 let reason='Reward settings are not verified here. Recent distributions unverified; holder returns unavailable.';
 if(pair.state==='loading'){
  title='Checking reward evidence…';reason='Reading official settings and recorded history.';
 }else if(e?.interval.state==='covered' && e.interval.value){
  const p=e.interval.value.current;
  title=p.distributed.atomic==='0'?'No reward counter increase recorded':'Reward counter increase recorded';
  reason=`Recorded counter change: ${p.distributed.tokens} ${e.unit.symbol}. Settings confirmed; holder returns unavailable. Payments not independently verified.`;
 }else if(standard){
  title='Provider reports no holder reward mode';reason='No covered holder distributions or holder returns are established.';
 }else if(mode && e?.lifetime.state!=='reported'){
  title='Reward settings confirmed by provider';reason='Setup confirmed, not recent distributions. Holder returns unavailable.';
 }else if(mode){
  reason='Settings confirmed. A lifetime total does not verify recent distributions. Holder returns unavailable.';
 }else if(pair.state==='not_in_sample'){
  reason='Settings unverified in this limited sample. Recent distributions unverified; holder returns unavailable.';
 }
 let qualifier=recorded?`StonkFun · last recorded ${readable(recorded.at)}${recorded.stale?' · stale':''}`:'StonkFun · no usable recorded observation date';
 if(e?.interval.state==='covered' && e.interval.value){const p=e.interval.value.current;qualifier=`StonkFun · covered ${readable(p.startAt)} – ${readable(p.endAt)}`;}
 else if((mode && e?.lifetime.state!=='reported' || standard) && e?.mechanism.source)qualifier=`StonkFun · settings response ${readable(e.mechanism.source.providerGeneratedAt)}${recorded?`; last reward observation ${readable(recorded.at)}${recorded.stale?' (stale)':''}`:' · not a payout observation'}`;
 else if(!recorded && e?.mechanism.source)qualifier=`StonkFun · settings response ${readable(e.mechanism.source.providerGeneratedAt)} · ${e.mechanism.quality==='stale'?'stale':'not a payout observation'}`;
 else if(!recorded && legacyRecord(mint,reward))qualifier='StonkFun · lifetime cutoff unknown; retrieval is not an observation';
 return {title,reason,qualifier,official,warning:warning.join(' '),recordedAt:recorded?.at??null};
}
export function DossierEvidenceFinding({mint,reward,pair,history}:{mint:string;reward:LegacyReward|null;pair:DossierPair;history:DossierHistory}) {
 const finding=dossierFinding(mint,reward,pair,history);
 return <><div className="brief-conclusion"><h3>{finding.title}</h3><p>{finding.reason}</p><p className="brief-qualifier">{finding.qualifier}</p></div>{finding.warning && <p className="brief-warning" role="status">{finding.warning}</p>}{finding.official?<a className="brief-official" href={finding.official} target="_blank" rel="noopener noreferrer">View official evidence <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="16" height="16"><path d="M6 3h7v7M13 3 3 13" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></a>:<p className="brief-official-unavailable">{pair.state==='loading'?'Official evidence loading…':'Official evidence unavailable'}</p>}</>;
}
function Receipt({source}:{source:NonNullable<RewardEvidence['mechanism']['source']>}){
 return <p><a href={source.source} target="_blank" rel="noopener noreferrer">Original official response ↗</a><br/>Provider <time dateTime={source.providerGeneratedAt}>{source.providerGeneratedAt}</time><br/>Retrieved <time dateTime={source.fetchedAt}>{source.fetchedAt}</time><br/>Byte revision {source.revision}</p>;
}
export function DossierEvidenceAudit({pair}:{pair:DossierPair}){
 if(pair.state!=='ready')return <><p>Strict pair evidence: {pair.state.replaceAll('_',' ')}. This bounded sample does not establish a complete market or absence of rewards.</p>{pair.catalog?.groups[0] && <a href={'/api/pairs?quoteMint='+pair.catalog.groups[0].quoteMint+'&discovery=pair'}>Bounded pair JSON · new read, not a frozen edition</a>}</>;
 const e=pair.evidence,l=e.lifetime.value,i=e.interval.value;
 return <section className="dossier-strict-evidence" aria-label="Strict pair evidence"><h3>Pair evidence for this exact mint</h3>
 <dl><div><dt>Token / quote mint</dt><dd>{e.tokenMint}<br/>{e.unit.symbol} · {e.unit.mint} · {e.unit.decimals} decimals</dd></div>
 <div><dt>Settings verification</dt><dd>{e.mechanism.state} · {e.mechanism.quality} · {e.mechanism.reason??'official identity matched'}{e.mechanism.source && <Receipt source={e.mechanism.source}/>}</dd></div>
 <div><dt>Strict reported lifetime distribution</dt><dd>{e.lifetime.state==='reported' && l?<>{l.distributedTokens} {e.unit.symbol} · raw {l.distributedRaw} · provider events {l.payoutCount}, recipients {l.walletsPaid}; not verified receipts. Start/cutoff unknown.{l.lastPayoutAt && <> Last reported payout <time dateTime={l.lastPayoutAt}>{l.lastPayoutAt}</time>.</>}</>:<>{e.lifetime.state} · {e.lifetime.reason}</>}{e.lifetime.source && <Receipt source={e.lifetime.source}/>}</dd></div>
 <div><dt>Covered interval flow</dt><dd>{e.interval.state==='covered' && i?<>{(['current','previous'] as const).map(key=>{const p=i[key];return <p key={key}>{key}: {p.distributed.tokens} {e.unit.symbol} · raw {p.distributed.atomic}<br/>Actual <time dateTime={p.startAt}>{p.startAt}</time> → <time dateTime={p.endAt}>{p.endAt}</time> · {p.seconds}s · {p.observationCount} points · maximum gap {p.maxGapSeconds}s<br/>Provider boundaries {p.providerStartAt} → {p.providerEndAt}</p>;})}<Receipt source={i.modeSource}/><Receipt source={i.catalogSource}/></>:<>{e.interval.state} · {e.interval.quality} · {e.interval.reasons.join(', ')}<p>{e.interval.details.join('; ')}</p></>}</dd></div>
 <div><dt>Evaluation and history provenance</dt><dd><time dateTime={e.evaluatedAt}>{e.evaluatedAt}</time> · evaluation, not observation. {e.interval.historySource.sourceStatus} · {e.interval.historySource.source} · {e.interval.historySource.dataFetchedAt} · {e.interval.historySource.revision}</dd></div></dl>
 <p>Coverage incomplete and pagination non-atomic. Settings, cumulative ledger totals, covered counter changes and holder returns are distinct. No individual receipt, APR, ROI or earning ranking is verified.</p><a href={'/api/pairs?quoteMint='+e.unit.mint+'&discovery=pair'}>Bounded pair JSON · new read, not a frozen edition</a></section>;
}
