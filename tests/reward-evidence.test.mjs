// Synthetic fixtures/mutations remain offline; the four-pair replay uses retained real bytes.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {fixture,T,END,NOW} from './reward-evidence-fixtures.mjs';
import {address} from './pairs-fixtures.mjs';
const load=async file=>(await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,file+'.js')))).default;
const {createPairSource}=await load('lib/pairs-source');
const {pairCatalogReport,pairQuoteRegistryReport}=await load('lib/pairs');
const {summarizeRewardEvidence}=await load('lib/reward-evidence');
const {parseLedgerLifetime}=await load('lib/reward-lifetime');
const {comparePairPulse,evaluatePairPulseCandidate}=await load('lib/pair-pulse');
const {trackedTokens}=await load('lib/tracked-tokens');
const iso=t=>new Date(t).toISOString();
async function run(f=fixture()){
 const reader=createPairSource(f.fetcher,()=>f.now,10000,T.quoteMint),raw=await reader(),history=f.history();
 const report=pairCatalogReport(raw,history,new Date(f.now),T.quoteMint),token=report.groups[0]?.tokens[0];
 return {f,reader,raw,history,report,token,evidence:token?.rewardEvidence};
}
function input(r){return {token:r.token,group:r.report.groups[0],catalog:r.report,registry:r.raw.value?.registryEvidence?pairQuoteRegistryReport({value:r.raw.value.registryEvidence,sourceStatus:'available'},{query:'',mint:T.quoteMint,limit:1,offset:0},new Date(r.f.now)):null,history:r.history,tracked:trackedTokens(),receipt:r.raw.value.tokens[0].lifetimeReceipt,asOf:iso(r.f.now)};}
const noReturns=e=>{assert.equal(e.holderReturn.state,'unavailable');assert.equal(e.holderReturn.value,null);assert.equal(e.scope.ranking.state,'withheld');assert.equal(e.scope.ranking.ecosystemLeader,null);assert.equal(e.scope.complete,false);assert.equal(e.scope.atomic,false);};
test('distinct mechanism/lifetime/actual interval states, no inferred holder return',async()=>{
 const r=await run(),e=r.evidence;assert.equal(r.f.calls.length,3);assert.equal(e.summary,'observed_interval');
 assert.equal(e.mechanism.state,'verified_reward');assert.equal(e.mechanism.evidenceLevel,'official_api_mode_identity');
 assert.equal(e.lifetime.state,'reported');assert.equal(e.lifetime.value.distributedTokens,'100.00000000');assert.equal(e.lifetime.value.startAt,null);assert.equal(e.lifetime.value.endAt,null);
 assert.equal(e.interval.state,'covered');assert.equal(e.interval.value.current.distributed.tokens,'24.00000000');assert.equal(e.interval.value.previous.distributed.tokens,'24.00000000');
 assert.equal(e.interval.value.current.startAt,iso(END-86400000));assert.equal(e.interval.value.current.endAt,iso(END));assert.equal(e.interval.value.current.providerEndAt,iso(END-30000));
 assert.equal(e.interval.value.current.observationCount,25);assert.equal(e.interval.value.current.maxGapSeconds,3600);noReturns(e);
 assert.equal(e.scope.sameQuoteLifetimesReported,1);assert.equal(e.scope.sameQuoteIntervalsCovered,1);assert.equal(e.scope.providerReportedUniverse,1);assert.equal(e.scope.uninspectedCatalogCount,0);assert.doesNotThrow(()=>JSON.stringify(r.report));
});
test('single candidate uses unchanged Pulse distribution gates without requiring a second candidate',async()=>{
 const r=await run(),f=input(r),p={quoteMint:T.quoteMint,asOf:f.asOf,endAt:iso(END),registry:{state:'ready',value:f.registry},catalog:{state:'ready',value:r.report},history:{state:'ready',value:r.history},tracked:trackedTokens()};
 const single=evaluatePairPulseCandidate({...p,tokenMint:T.mint}),dual=comparePairPulse({...p,leftMint:T.mint,rightMint:address(5)});
 assert.deepEqual(single.candidate.distribution,dual.left.distribution);assert.equal(dual.comparison.state,'withheld');assert.equal(single.candidate.distribution.state,'available');
});
test('verified mechanism with awaiting lifetime is not proof of a payout',async()=>{
 const f=fixture();f.mode.basis='awaiting-snapshot';f.mode.rewards=null;f.store={};const e=(await run(f)).evidence;
 assert.equal(e.summary,'mechanism_verified');assert.equal(e.mechanism.state,'verified_reward');assert.equal(e.lifetime.value,null);assert.equal(e.lifetime.reason,'ledger_unavailable');assert.equal(e.interval.state,'insufficient_history');noReturns(e);
});
test('lifetime alone never becomes a covered 24h interval',async()=>{
 const f=fixture();f.store={};const e=(await run(f)).evidence;assert.equal(e.summary,'reported_lifetime');assert.equal(e.lifetime.state,'reported');assert.equal(e.interval.value,null);assert.equal(e.interval.state,'insufficient_history');assert.ok(e.interval.reasons.includes('no_history'));noReturns(e);
});
test('covered history remains independent of currently awaiting aggregate totals',async()=>{
 const f=fixture();f.mode.basis='awaiting-snapshot';f.mode.rewards=null;const e=(await run(f)).evidence;
 assert.equal(e.interval.state,'covered');assert.equal(e.lifetime.value,null);assert.equal(e.summary,'observed_interval');noReturns(e);
});
test('official standard mode is explicit with no holder-reward claim',async()=>{
 const f=fixture();f.rows[0].mode='standard';f.mode.mode='standard';f.mode.rewards=null;const e=(await run(f)).evidence;
 assert.equal(e.summary,'standard_mode');assert.equal(e.mechanism.state,'verified_standard');assert.equal(e.lifetime.reason,'mode_not_reward');assert.equal(e.interval.value,null);noReturns(e);
});
test('catalog-only rows are unverified and do not expand the 12-mode budget',async()=>{
 const f=fixture();f.rows=Array.from({length:13},(_,i)=>({...f.rows[0],mint:address(i)}));f.store={};const r=await run(f);
 assert.equal(f.calls.length,14);assert.equal(r.report.dataset.coverage.modeChecks,12);
 const unknown=r.report.groups[0].tokens.find(t=>t.modeVerification==='catalog_only').rewardEvidence;
 assert.equal(unknown.summary,'unverified');assert.equal(unknown.mechanism.reason,'mode_not_checked');assert.equal(unknown.lifetime.value,null);noReturns(unknown);
 assert.equal(unknown.scope.sameQuoteModeVerified,12);assert.equal(unknown.scope.sameQuoteLifetimesReported,12);
});
for(const status of [429,503])test('mode HTTP'+status+' has explicit unavailable evidence and no audit fallback/retry',async()=>{
 const f=fixture();f.status=status;const r=await run(f),e=r.evidence;assert.equal(e.mechanism.state,'unverified');assert.equal(e.mechanism.reason,status===429?'source_rate_limited':'source_unavailable');assert.equal(e.lifetime.value,null);assert.equal(e.interval.value,null);assert.equal(e.scope.sameQuoteLifetimesReported,0);
 const before=f.calls.length;await r.reader();assert.equal(f.calls.length,before);noReturns(e);
});
test('cold registry outage has no fabricated empty-universe evidence',async()=>{
 let calls=0;const reader=createPairSource(async()=>{calls++;return new Response(null,{status:503});},()=>NOW,10000,T.quoteMint);
 const raw=await reader();const report=pairCatalogReport(raw,fixture().history(),new Date(NOW),T.quoteMint);
 assert.equal(report.status,'unavailable');assert.deepEqual(report.groups,[]);assert.equal(report.dataset.coverage.providerReportedTotal,null);await reader();assert.equal(calls,1);
});
for(const [name,change,reason] of [
 ['no quote decimals',f=>delete f.mode.quote.decimals,'units_unverified'],
 ['wrong quote decimals',f=>f.mode.quote.decimals=9,'units_unverified'],
 ['snapshot basis',f=>f.mode.basis='snapshot','ledger_unavailable'],
 ['null totals',f=>f.mode.rewards=null,'payouts_unavailable'],
 ['raw exponential',f=>f.mode.rewards.distributedRaw='1e9','invalid_payouts'],
 ['raw number',f=>f.mode.rewards.distributedRaw=100,'invalid_payouts'],
 ['unsafe payout count',f=>f.mode.rewards.payoutCount=Number.MAX_SAFE_INTEGER+1,'invalid_payouts'],
 ['last payout later than source',f=>f.mode.rewards.lastPayoutAt=iso(NOW+1),'invalid_payouts'],
])test(name+' withholds lifetime independently of mechanism',async()=>{
 const f=fixture();change(f);f.store={};const e=(await run(f)).evidence;assert.equal(e.mechanism.state,'verified_reward');assert.equal(e.lifetime.state,'unavailable');assert.equal(e.lifetime.value,null);assert.equal(e.lifetime.reason,reason);noReturns(e);
});
test('actual zero remains reported and distinct from null, not positive earnings',async()=>{
 const f=fixture();Object.assign(f.mode.rewards,{distributedRaw:'0',distributedTokens:null,payoutCount:0,walletsPaid:0,lastPayoutAt:null});f.store={};const e=(await run(f)).evidence;
 assert.equal(e.lifetime.state,'reported');assert.equal(e.lifetime.value.distributedTokens,'0.00000000');assert.equal(e.lifetime.value.lastPayoutAt,null);assert.equal(e.summary,'reported_lifetime');noReturns(e);
});
test('raw precision survives provider float rounding beyond safe integer',async()=>{
 const f=fixture();Object.assign(f.mode.rewards,{distributedRaw:'11995464083712182',distributedTokens:119954640.83712181});f.store={};const e=(await run(f)).evidence;
 assert.equal(e.lifetime.value.distributedTokens,'119954640.83712182');assert.equal(e.lifetime.value.distributedRaw,'11995464083712182');noReturns(e);
});
test('fresh mode with old aggregate generation does not show stale lifetime',async()=>{
 const f=fixture();f.mode.generatedAt=iso(NOW-300001);f.store={};const e=(await run(f)).evidence;
 assert.equal(e.mechanism.state,'verified_reward');assert.equal(e.lifetime.value,null);assert.equal(e.lifetime.quality,'stale');assert.equal(e.lifetime.reason,'source_stale');noReturns(e);
});
test('cached retrieval dates remain original and cannot rejuvenate evidence',async()=>{
 const r=await run();r.f.now+=300001;const i=input(r);i.catalog.dataset.sourceStatus='cached';
 const e=summarizeRewardEvidence(i);assert.equal(e.mechanism.state,'unverified');assert.equal(e.mechanism.quality,'stale');assert.equal(e.lifetime.value,null);assert.equal(e.lifetime.source.fetchedAt,iso(NOW));noReturns(e);
});
for(const [name,change] of [
 ['missing previous coverage',f=>f.store[T.mint]=f.store[T.mint].slice(-25)],
 ['exactly two-hour gap',f=>f.store[T.mint].splice(30,1)],
 ['counter reset',f=>f.store[T.mint][30].distributedTokens=0],
 ['wrong quote mint in history',f=>f.store[T.mint][30].quoteMint=address(90)],
 ['missing provider timestamp',f=>delete f.store[T.mint][30].providerGeneratedAt],
 ['duplicate actual observation',f=>f.store[T.mint].push({...f.store[T.mint][30]})],
 ['precision-unsafe history',f=>f.store[T.mint][30].distributedTokens=Number.MAX_SAFE_INTEGER],
])test(name+' cannot fabricate interval flow',async()=>{
 const f=fixture();change(f);const e=(await run(f)).evidence;assert.equal(e.interval.value,null);assert.notEqual(e.interval.state,'covered');assert.equal(e.lifetime.state,'reported');noReturns(e);
});
for(const [name,change] of [
 ['foreign mode origin',i=>i.token.rewardSource.source='https://evil.invalid/rewards'],
 ['mode URL query injection',i=>i.token.rewardSource.source+='?callback=evil'],
 ['mode revision not a byte hash',i=>i.token.rewardSource.revision='git:fake'],
 ['quote identity swap',i=>i.token.quoteMint=address(91)],
 ['future source generation',i=>i.token.rewardSource.providerGeneratedAt=iso(NOW+1)],
 ['unavailable catalog retaining old object',i=>{i.catalog.status='unavailable';i.catalog.dataset.sourceStatus='unavailable';}],
])test(name+' fails closed for mechanism and all financial evidence',async()=>{
 const r=await run(),i=input(r);change(i);const e=summarizeRewardEvidence(i);assert.equal(e.mechanism.state,'unverified');assert.equal(e.lifetime.value,null);assert.equal(e.interval.value,null);noReturns(e);
 if(name.includes('URL')||name.includes('origin'))assert.equal(e.mechanism.source,null);
});
test('global catalog total never masquerades as same-quote universe',async()=>{
 const r=await run(),i=input(r);i.catalog.dataset.coverage.discovery={strategy:'global_sample',quoteMint:null,providerReportedTotalScope:'catalog'};
 const e=summarizeRewardEvidence(i);assert.equal(e.scope.providerReportedUniverse,null);assert.equal(e.scope.uninspectedCatalogCount,null);assert.equal(e.scope.universeScope,'unknown');assert.equal(e.interval.value,null);noReturns(e);
});
test('mechanism identity mismatch is excluded by existing source verification',async()=>{
 const f=fixture();f.mode.quote.mint=address(15);const r=await run(f);assert.deepEqual(r.report.groups[0].tokens,[]);assert.ok(r.report.dataset.coverage.warnings.includes('reward_identity_mismatch'));
});
test('invalid raw bounds/counters/units are rejected by shared ledger parser',()=>{
 const f=fixture();for(const raw of ['','01','-1','1.0','9'.repeat(79)]){f.mode.rewards.distributedRaw=raw;assert.equal(parseLedgerLifetime(f.mode,8,iso(NOW)).state,'unavailable');}
 for(const decimals of [-1,1.5,19,NaN])assert.equal(parseLedgerLifetime(f.mode,decimals,iso(NOW)).state,'unavailable');
});
// Genuine retained response bodies, with controlled OFFLINE receipt clocks.
// Missing recorded packets use synthetic503; no current captures/outages are inferred.
const dated=JSON.parse(readFileSync('docs/evidence/pair-reward-audit-2026-10-14.json','utf8'));
for(const quoteMint of dated.quoteMints)test('genuine dated four-pair source replay '+quoteMint+' preserves units/scope and withholds intervals',async()=>{
 const packets=new Map(dated.packets.map(p=>[p.path,p]));const page=packets.get('/api/public/v1/tokens?sort=marketCap&page=1&pageSize=25&quoteMint='+quoteMint),data=JSON.parse(page.body).data;
 const seen=new Set(data.tokens.filter(t=>t.mode==='reward').slice(0,4).map(t=>t.mint));let calls=0;
 const fetcher=async url=>{
  calls++;const u=new URL(url);const p=packets.get(u.pathname+u.search);
  if(!p)return new Response(null,{status:503});
  return new Response(p.body,{status:p.status,headers:p.headers});
 };
 const raw=await createPairSource(fetcher,()=>Date.parse(dated.asOf),10000,quoteMint)();
 const history={store:null,dataset:{kind:'github_snapshot',source:'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json',revision:null,dataFetchedAt:null,sourceStatus:'unavailable',cacheSeconds:300,continuouslyUpdated:false}};
 const report=pairCatalogReport(raw,history,new Date(dated.asOf),quoteMint),verified=report.groups[0].tokens.filter(t=>t.rewardEvidence.lifetime.state==='reported');
 assert.ok(verified.length>0);assert.ok(verified.length<=4);assert.ok(calls<=15);assert.equal(report.dataset.coverage.complete,false);
 for(const t of verified){const e=t.rewardEvidence;assert.ok(seen.has(t.mint));assert.equal(e.unit.mint,quoteMint);assert.equal(e.mechanism.state,'verified_reward');assert.equal(e.interval.value,null);assert.equal(e.interval.state,'unavailable');noReturns(e);}
 const expected=dated.offlineReport.reports.find(r=>r.quote.mint===quoteMint);
 for(const t of verified){assert.equal(t.rewardEvidence.lifetime.value.distributedTokens,expected.candidates.find(c=>c.mint===t.mint).lifetime.distributedTokens);}
 assert.equal(report.groups[0].tokens[0].rewardEvidence.scope.providerReportedUniverse,data.pagination.total);
});

test('stale transport mode evidence is withheld with a safe reference URL and explicit quality',async()=>{
 const f=fixture(),base=f.fetcher;f.fetcher=async(...args)=>{const r=await base(...args);if(String(args[0]).includes('/api/v2/'))r.headers.set('age','301');return r;};
 const e=(await run(f)).evidence;assert.equal(e.mechanism.state,'unverified');assert.equal(e.mechanism.quality,'stale');assert.equal(e.mechanism.reason,'source_stale');assert.equal(e.lifetime.value,null);assert.equal(e.mechanism.source,null);assert.equal(e.mechanism.referenceUrl,'https://www.stonkfun.xyz/api/v2/tokens/'+T.mint+'/rewards');noReturns(e);
});
