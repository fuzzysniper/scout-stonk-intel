import {existsSync,readFileSync} from 'node:fs';
import {Store,checkData} from './ledger';
import {candidateList,claimedHoldings,DEFAULT_POLICY,keys,latestPolicy,mint,object,observations,qualify,text,time,validatePolicy,type Mode} from './core';
import {observationKey,repositoryCatalogue} from './sources';
import {evaluateShadow,type Point,type ShadowPlan} from './evaluation';
import {loadDemo} from './synthetic';
export const PROTOCOL={version:'agent0-forward/1',rule:'Decide before outcomes. All discoveries remain in the denominator; wait, reject, unpriced and untradeable are never silently discarded.',baselines:['SOL in the same quote/window after costs','Preregistered equal-notional eligible-token cohort, without survivor substitutions','First timely qualifying quote, fixed horizon; no retrospective timing optimization'],status:'NOT OBSERVED — no genuine comparison prices or eligible candidates',limits:'No evidence of edge, NAV or investment-grade ranking. Hash chains need independent timestamped anchors to resist owner rewrites.'};
export class Agent0{
 readonly stores:Record<Mode,Store>;
 constructor(readonly repo:string,privateDir:string){this.stores={recorded:new Store(privateDir,'recorded',repo),synthetic:new Store(privateDir,'synthetic',repo)};}
 initialize(mode:Mode,at:string){const store=this.stores[mode];if(!store.read().length)store.append('genesis',{version:'agent0-policy/1'},'policy',at,()=>DEFAULT_POLICY);}
 decide(mode:Mode,id:string,payload:unknown,at:string){
  const p=object(payload);keys(p,['mint','action','hypothesis','disqualifiers','missingEvidence','entryConditions','invalidation','exitConsiderations']);
  return this.stores[mode].append(id,{kind:'decision',payload:p},'decision',at,rows=>{const known=observations(rows,mint(p.mint));return {...p,evidenceHashes:known.map(x=>x.entry.hash),policyHash:latestPolicy(rows).entry.hash,criteriaVersion:'agent0-qualification/1',criteriaSnapshot:qualify(mode,known.map(x=>x.observation))};});
 }
 command(mode:Mode,id:string,kind:string,payload:unknown,now:string){
  time(now);text(id,100);const p=object(payload);if(!['recorded','synthetic'].includes(mode))throw Error('invalid_workspace');
  if(kind==='load_example'){keys(p,[]);if(mode!=='synthetic')throw Error('synthetic_workspace_required');loadDemo(this,now);return {saved:true,synthetic:true};}
  if(!['import_recorded','policy','decision','claim','shadow_plan'].includes(kind))throw Error('unsupported_research_command');
  const store=this.stores[mode],before=store.read();
  if(kind==='policy')validatePolicy(p);
  if(kind==='claim'&&!before.length)checkData('claim',p,before,now,mode);
  if((kind==='decision'||kind==='shadow_plan')&&!before.length)throw Error('no_discovery');
  if(kind==='import_recorded'){
   keys(p,[]);if(mode!=='recorded')throw Error('recorded_workspace_required');const catalog=repositoryCatalogue(this.repo,now);this.initialize(mode,now);let imported=0;const known=new Set(observations(store.read()).map(x=>observationKey(x.observation)));
   for(const o of catalog.candidates){const key=observationKey(o);if(known.has(key))continue;store.append('repo:'+key,{kind:'observation',observation:o},'observation',now,()=>o);known.add(key);imported++;}return {imported,scope:catalog.scope};
  }
  this.initialize(mode,now);
  if(kind==='policy'){const policy=validatePolicy(p);return store.append(id,{kind,payload:p},'policy',now,()=>policy);}
  if(kind==='decision')return this.decide(mode,id,p,now);
  if(kind==='claim')return store.append(id,{kind,payload:p},'claim',now,()=>p);
  if(kind==='shadow_plan')return store.append(id,{kind,payload:p},'shadow_plan',now,()=>p);
  throw Error('unsupported_research_command');
 }
 state(mode:Mode,now:string){
  const store=this.stores[mode],rows=store.read();let catalog:{count:number;revision:string|null;scope:string;warnings:string[]};try{const c=repositoryCatalogue(this.repo,now);catalog={count:new Set(c.candidates.map(x=>x.mint)).size,revision:c.revision,scope:c.scope,warnings:c.warnings};}catch{catalog={count:0,revision:null,scope:'Local source unavailable. No fallback or network fetch.',warnings:['local_source_unavailable']};}
  const candidates=candidateList(rows),plans=rows.filter(e=>e.kind==='shadow_plan').map(e=>({hash:e.hash,at:e.at,plan:e.data as ShadowPlan,evaluation:evaluateShadow(e.data as ShadowPlan,e.at,rows.filter(x=>x.kind==='outcome'&&(x.data as {planHash:string}).planHash===e.hash).map(x=>(x.data as {point:Point}).point),mode,now)}));
  return {mode,checkedLocalAt:now,policy:rows.length?latestPolicy(rows).policy:DEFAULT_POLICY,policyRegistered:rows.length>0,catalog,candidates,plans,holdings:claimedHoldings(rows),claims:rows.filter(e=>e.kind==='claim'),decisions:rows.filter(e=>e.kind==='decision'),ledger:{entries:rows.length,head:rows.at(-1)?.hash??null,locked:existsSync(store.path+'.lock'),assurance:'Append-only through this app; locally tamper-evident, not signed or independently timestamped.'},protocol:PROTOCOL,performance:{eligibleCandidates:0,pricedGenuineOutcomes:0,netReturn:null,nav:null,edge:'NOT ESTABLISHED'},capabilities:CAPABILITIES};
 }
 export(mode:Mode){this.stores[mode].read();return existsSync(this.stores[mode].path)?readFileSync(this.stores[mode].path):Buffer.alloc(0);}
}
export const CAPABILITIES=[
 {priority:1,name:'Authentic finalized mint facts',missing:'Existing MintFactsV1 retention with source clocks, slots, raw units and extensions. Public acquisition is independently disabled; no call here.'},
 {priority:2,name:'Rights-compatible exact-pool market observations',missing:'Pair-time price/liquidity/activity series, exact quote mint/units and bounded cadence; provider and retention rights approval first.'},
 {priority:3,name:'Size-aware exits and measured transaction costs',missing:'Depth/route feasibility, fee/slippage assumptions and quote conversions. No quote is a guaranteed fill.'},
 {priority:4,name:'Launch chronology, concentration and relationships',missing:'Finalized creation timing, attributable holders/deployer links and manipulation caveats; independently approved indexing required.'},
 {priority:5,name:'Aligned independent benchmark/cohort outcomes',missing:'SOL and all eligible/rejected/failed candidates, consistent clocks, costs and unpriced/untradeable accounting.'},
 {priority:6,name:'Private reconciliation and external evidence anchors',missing:'Independently validated transaction records and timestamped commitments. Manual claims and local hashes alone do not prove balances or precommitment.'}
];
