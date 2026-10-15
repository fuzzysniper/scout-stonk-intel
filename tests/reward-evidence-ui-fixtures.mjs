// Explicit synthetic frontend scenarios. Never screenshot/application data or provider calls.
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {fixture,T,NOW} from './reward-evidence-fixtures.mjs';
const load=async file=>(await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,file+'.js')).href)).default;
export async function rewardUiFixture(change=()=>{}) {
 const {createPairSource}=await load('lib/pairs-source'),{pairCatalogReport,pairQuoteRegistryReport}=await load('lib/pairs');
 const f=fixture();change(f);
 const raw=await createPairSource(f.fetcher,()=>f.now,10000,T.quoteMint)();
 return {catalog:pairCatalogReport(raw,f.history(),new Date(f.evaluationTime??f.now),T.quoteMint),registry:pairQuoteRegistryReport({value:raw.value.registryEvidence,sourceStatus:'available'},{query:'',mint:T.quoteMint,limit:12,offset:0},new Date(f.now))};
}
export async function rewardUiScenarios() {
 const changes={
  covered:()=>{},
  'covered-zero':f=>{for(const point of f.store[T.mint]){point.distributedTokens=100;point.payoutCount=10;}},
  lifetime:f=>{f.store={};},
  zero:f=>{f.store={};Object.assign(f.mode.rewards,{distributedRaw:'0',payoutCount:0,walletsPaid:0,lastPayoutAt:null});},
  settings:f=>{f.store={};f.mode.basis='awaiting-snapshot';f.mode.rewards=null;},
  standard:f=>{f.store={};f.rows[0].mode='standard';f.mode.mode='standard';f.mode.rewards=null;},
  'stale-lifetime':f=>{f.store={};f.mode.generatedAt=new Date(NOW-300001).toISOString();},
  'stale-source':f=>{const original=f.fetcher;f.fetcher=async(...args)=>{const r=await original(...args);if(String(args[0]).includes('/api/v2/'))r.headers.set('age','301');return r;};},
  'stale-evaluation':f=>{f.evaluationTime=f.now+300001;},
  'rate-limited':f=>{f.status=429;},
  'precise-lifetime':f=>{f.store={};f.mode.rewards.distributedRaw='11995464083712182';},
 };
 const cases={};for(const [name,change] of Object.entries(changes))cases[name]=await rewardUiFixture(change);return cases;
}
