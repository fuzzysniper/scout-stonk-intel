import {UNOBSERVED_ONCHAIN,encode58,sha,type Decision,type Observation} from './core';
import type {Agent0} from './service';
import type {Point,ShadowPlan} from './evaluation';
export const DEMO_MINT=encode58(Buffer.from(sha('UNFARMD AGENT0 INVENTED TOKEN — NOT A RECOMMENDATION'),'hex'));
export const DEMO_POOL=encode58(Buffer.from(sha('UNFARMD AGENT0 INVENTED POOL'),'hex'));
export const DEMO_QUOTE='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export function loadDemo(app:Agent0,now:string){
 const s=app.stores.synthetic;if(s.read().length)return;
 if(Date.parse(now)<Date.parse('2026-10-21T09:04:00Z'))throw Error('demo_clock_before_fixture');
 app.initialize('synthetic','2026-10-20T08:59:00Z');
 const o:Observation={onchain:{...UNOBSERVED_ONCHAIN},mint:DEMO_MINT,name:'INVENTED TOKEN · OFFLINE EXAMPLE',observedAt:'2026-10-20T08:58:00Z',providerGeneratedAt:null,source:{kind:'synthetic_offline',locator:'offline:invented-agent0-fixture',datasetSha256:sha('invented document'),catalogSha256:sha('invented catalog'),recordSha256:sha('invented record')},quoteMint:DEMO_QUOTE,pool:DEMO_POOL,quality:'capture_only',note:'SYNTHETIC OFFLINE. No token, pool, provider response or real price is asserted.'};
 s.append('demo-discovery',{fixture:'invented discovery'},'observation','2026-10-20T08:59:10Z',()=>o);
 const d:Omit<Decision,'evidenceHashes'|'policyHash'|'criteriaSnapshot'|'criteriaVersion'>={mint:DEMO_MINT,action:'shadow',hypothesis:'SYNTHETIC hypothesis: persistent activity might survive a spike. No genuine activity data supports it.',disqualifiers:'No verified controls, concentration or real executable liquidity.',missingEvidence:'Every market value below is invented; no genuine token opportunity exists here.',entryConditions:'Paper only: first timely post-decision quote after 60 seconds, within budget/capacity.',invalidation:'Coverage gap, identity mismatch, cost excess or no timely exit withholds performance.',exitConsiderations:'Fixed three-minute fixture horizon. All-in cost and slippage are invented quote-unit assumptions, not measured SOL fees.'};
 const decision=app.decide('synthetic','demo-decision',d,'2026-10-20T09:00:00Z').entry;
 const plan:ShadowPlan={decisionHash:decision.hash,mint:DEMO_MINT,pool:DEMO_POOL,quoteMint:DEMO_QUOTE,tokenDecimals:6,quoteDecimals:6,quantityRaw:'1000000',entryDelayMs:60000,maxWaitMs:120000,horizonMs:180000,maxGapMs:120000,entryFeeRaw:'10000',exitFeeRaw:'10000',slippageBps:25,maxQuoteRaw:'2000000'};
 const registered=s.append('demo-plan',{fixture:'invented assumptions'},'shadow_plan','2026-10-20T09:00:00Z',()=>plan).entry;
 for(const [index,price] of ['1000000','1200000','600000','800000'].entries()){
  const at=`2026-10-20T09:0${index+1}:00Z`;const point:Point={mint:DEMO_MINT,pool:DEMO_POOL,quoteMint:DEMO_QUOTE,quoteDecimals:6,observedAt:at,availableAt:at,priceRaw:price,liquidityRaw:'100000000',exitCapacityRaw:'10000000',sourceHash:sha('SYNTHETIC quote '+index),assurance:'SYNTHETIC OFFLINE',clock:'source_pair_time'};
  s.append('demo-outcome-'+index,{fixture:'invented observation '+index},'outcome',at,()=>({planHash:registered.hash,point}));
 }
}
