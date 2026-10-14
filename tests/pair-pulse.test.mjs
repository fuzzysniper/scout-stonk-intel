// Positive packets below are SYNTHETIC OFFLINE TEST FIXTURES, never app data or evidence.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const load=async file=>(await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,file+'.js')).href)).default;
const {comparePairPulse,PULSE_LIMITS}=await load('lib/pair-pulse');
const {trackedTokens}=await load('lib/tracked-tokens');
const tracked=trackedTokens().filter(t=>t.quoteSymbol==='ZEC'),[L,R]=tracked;
const END=Date.parse('2030-01-03T00:00:00Z'),HOUR=3600000,iso=t=>new Date(t).toISOString();
const REGISTRY='https://www.stonkfun.xyz/api/public/v1/pairs';
const HISTORY='https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json';
const CATALOG='https://www.stonkfun.xyz/api/public/v1/tokens';
const ready=value=>({state:'ready',value});
function syncHistory(f){
 const h=f.history.value;h.dataset.revision='sha256:'+createHash('sha256').update(JSON.stringify(h.store)).digest('hex');
 Object.assign(f.catalog.value.dataset.history,{source:h.dataset.source,revision:h.dataset.revision,dataFetchedAt:h.dataset.dataFetchedAt,sourceStatus:h.dataset.sourceStatus});
 for(const t of f.catalog.value.groups[0].tokens){const rows=h.store[t.mint]??[];t.observationCount=rows.length;t.lastObservedAt=rows.length?iso(Math.max(...rows.map(r=>Date.parse(r.observedAt)))):null;}
 return f;
}
function fixture(){
 const asOf=iso(END+60000),source=url=>({source:url,fetchedAt:asOf,providerGeneratedAt:asOf,revision:'sha256:'+'a'.repeat(64)});
 const rp=source(REGISTRY),page=source(CATALOG+'?sort=marketCap&page=1&pageSize=25&quoteMint='+L.quoteMint);
 const quote={quoteMint:L.quoteMint,quoteSymbol:L.quoteSymbol,quoteName:'Synthetic ZEC identity',decimals:8,tokenProgram:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',symbolAmbiguous:false,providerSymbolAmbiguous:false,symbolMatchCount:1,verification:'official_registry_only',verifiedAt:asOf};
 const store=Object.fromEntries(tracked.map((t,index)=>[t.mint,Array.from({length:49},(_,i)=>({observedAt:iso(END+(i-48)*HOUR),providerGeneratedAt:iso(END+(i-48)*HOUR-30000),mode:'reward',quoteMint:t.quoteMint,quoteSymbol:t.quoteSymbol,source:t.source,distributedTokens:index?i/2:i<=24?i:24+(i-24)*2,payoutCount:i}))]));
 const tokens=tracked.map(t=>({mint:t.mint,symbol:t.symbol,name:t.name,poolMint:t.poolMint,quoteMint:t.quoteMint,quoteSymbol:t.quoteSymbol,source:page.source,verifiedAt:asOf,provenance:page,mode:'reward',rewardModeVerified:true,modeVerification:'verified_reward',rewardSource:source('https://www.stonkfun.xyz/api/v2/tokens/'+t.mint+'/rewards'),observationCount:49,lastObservedAt:iso(END),historyStatus:'recorded',historyFreshness:'fresh',historyIssues:[],market:{status:'reported_snapshot',unit:'USD',priceUsd:0,liquidityUsd:0,volume24hUsd:null,observedAt:null,providerGeneratedAt:page.providerGeneratedAt},comparisonStatus:'unavailable',comparisons:{quoteRelativePriceReturn:null,quoteAssetBenchmarkReturn:null,holderAttributedReward:null,reason:'missing_synchronized_price_history_and_holder_entitlement'}}));
 const catalog={schemaVersion:1,status:'available',groups:[{...quote,source:REGISTRY,provenance:rp,verification:'official_registry_catalog_match',availability:'tokens_in_bounded_sample',tokens}],dataset:{sourceStatus:'available',fetchedAt:asOf,dataFetchedAt:asOf,scope:'bounded_official_catalog',coverage:{complete:false,atomic:false,registryCount:587,pagesFetched:1,pageLimit:2,pageSize:25,recordsReceived:2,tokensReturned:2,rejectedRecords:0,providerReportedTotal:2,modeChecks:2,modeCheckLimit:12,historyScope:'tracked_sample',warnings:['bounded_catalog','non_atomic_pagination'],discovery:{strategy:'provider_quote_mint',quoteMint:L.quoteMint,providerReportedTotalScope:'quote_mint'}},sources:[rp,page,...tokens.map(t=>t.rewardSource)],history:{}}};
 const registry={schemaVersion:1,status:'available',search:{query:'',mint:L.quoteMint,offset:0,limit:12},quotes:[quote],dataset:{sourceStatus:'available',fetchedAt:asOf,dataFetchedAt:asOf,scope:'official_quote_registry',provenance:rp,coverage:{registryResponse:'validated_unpaginated',registryCount:587,matchedCount:1,returnedCount:1,responseLimit:12,nextOffset:null,resultTruncated:false,providerAmbiguousSymbolCount:25,tokenCatalogComplete:false}}};
 return syncHistory({quoteMint:L.quoteMint,leftMint:L.mint,rightMint:R.mint,asOf,endAt:iso(END),tracked:structuredClone(tracked),registry:ready(registry),catalog:ready(catalog),history:ready({store,dataset:{kind:'github_snapshot',source:HISTORY,revision:null,dataFetchedAt:asOf,sourceStatus:'available',cacheSeconds:300,continuouslyUpdated:false}})});
}
const left=f=>f.history.value.store[L.mint],right=f=>f.history.value.store[R.mint];
function allWithheld(r){assert.equal(r.comparison.state,'withheld');assert.equal(r.comparison.value,null);for(const m of Object.values(r.unsupported)){assert.equal(m.state,'withheld');assert.equal(m.value,null);}}
function noDistribution(r){allWithheld(r);assert.equal(r.left.distribution.value,null);assert.equal(r.right.distribution.value,null);}

test('aligned received counter observations compare exactly in quote units, never returns/leaderboard',()=>{
 const r=comparePairPulse(fixture());assert.equal(r.comparison.state,'available');assert.equal(r.comparison.confidence,'coverage_passed');
 assert.deepEqual(r.left.distribution.value.current.distributed,{atomic:'4800000000',tokens:'48.00000000'});
 assert.deepEqual(r.right.distribution.value.previous.distributed,{atomic:'1200000000',tokens:'12.00000000'});
 assert.deepEqual(r.comparison.value.current,{atomic:'3600000000',tokens:'36.00000000'});
 assert.deepEqual(r.comparison.value.previous,{atomic:'1200000000',tokens:'12.00000000'});
 assert.deepEqual(r.comparison.value.change,{atomic:'2400000000',tokens:'24.00000000'});
 assert.equal(r.left.distribution.value.current.observationCount,25);assert.equal(r.left.distribution.value.current.maxGapSeconds,3600);
 assert.equal(r.comparison.value.quoteMint,L.quoteMint);assert.equal(r.left.distribution.value.interpretation,'not_payout_reconciliation_or_holder_return');
 for(const m of Object.values(r.unsupported))assert.equal(m.value,null);
 for(const forbidden of ['rank','score','apy','annualized','winner'])assert.ok(!Object.hasOwn(r,forbidden));
 assert.deepEqual(r.scope,{kind:'selected_two_from_bounded_scoped_sample',complete:false,atomic:false});
});
test('pure deterministic execution does not mutate frozen inputs, fetch, read a clock or persist',()=>{
 const f=fixture();const freeze=o=>{if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}};freeze(f);
 const before=JSON.stringify(f),fetch=globalThis.fetch,now=Date.now;globalThis.fetch=()=>{throw Error('unexpected network')};Date.now=()=>{throw Error('unexpected clock')};
 try {const a=comparePairPulse(f);assert.equal(a.comparison.state,'available');assert.deepEqual(comparePairPulse(f),a);assert.equal(JSON.stringify(f),before);assert.doesNotThrow(()=>JSON.stringify(a));}finally{globalThis.fetch=fetch;Date.now=now;}
 assert.ok(Object.isFrozen(PULSE_LIMITS));
});
test('swapping the chosen projects reverses signed activity differences without creating a leader',()=>{
 const f=fixture();[f.leftMint,f.rightMint]=[f.rightMint,f.leftMint];const r=comparePairPulse(f);
 assert.equal(r.comparison.value.current.tokens,'-36.00000000');assert.equal(r.comparison.value.change.tokens,'-24.00000000');assert.equal(r.unsupported.economicLeadership.value,null);
});
test('genuine covered zero is zero; missing reward/market observations never become zero',()=>{
 const f=fixture();for(const rows of Object.values(f.history.value.store))for(const r of rows)r.distributedTokens=1;
 let r=comparePairPulse(syncHistory(f));assert.equal(r.comparison.value.current.atomic,'0');assert.equal(r.left.distribution.value.current.distributed.tokens,'0.00000000');
 left(f)[12].distributedTokens=null;r=comparePairPulse(syncHistory(f));assert.equal(r.left.distribution.state,'withheld');assert.equal(r.left.distribution.value,null);allWithheld(r);
});
for(const [name,mutate] of [
 ['different quote mints sharing one ticker',f=>f.catalog.value.groups[0].tokens[1].quoteMint=trackedTokens()[0].quoteMint],
 ['ticker alone cannot choose a quote',f=>f.quoteMint='ZEC'],
 ['registry quote membership missing',f=>f.registry.value.quotes=[]],
 ['registry identity decimal mismatch',f=>f.registry.value.quotes[0].decimals=9],
 ['registry token-program mismatch',f=>f.registry.value.quotes[0].tokenProgram='unverified'],
 ['catalog identity pool differs from tracked mapping',f=>f.catalog.value.groups[0].tokens[0].poolMint=R.mint],
 ['mode only catalog-asserted',f=>{const t=f.catalog.value.groups[0].tokens[0];t.modeVerification='catalog_only';t.rewardModeVerified=false;t.rewardSource=null;}],
 ['mode explicitly standard',f=>{const t=f.catalog.value.groups[0].tokens[0];t.mode='standard';t.modeVerification='verified_standard';t.rewardModeVerified=false;}],
 ['forged mode source',f=>f.catalog.value.groups[0].tokens[0].rewardSource.source='https://evil.invalid/rewards'],
 ['history source mismatch',f=>f.history.value.dataset.source='https://evil.invalid/history'],
 ['history revision mismatch',f=>f.catalog.value.dataset.history.revision='sha256:'+'b'.repeat(64)],
 ['missing history',f=>{f.history.value.store[L.mint]=[];syncHistory(f);}],
 ['no tracked attribution',f=>f.tracked=f.tracked.filter(t=>t.mint!==L.mint)],
 ['duplicate chosen project',f=>f.rightMint=f.leftMint],
 ['global sample cannot masquerade as scoped discovery',f=>f.catalog.value.dataset.coverage.discovery={strategy:'global_sample',quoteMint:null,providerReportedTotalScope:'catalog'}],
 ['a one-page sample never becomes exhaustive',f=>f.catalog.value.dataset.coverage.complete=true],
 ['duplicate catalog mint',f=>f.catalog.value.groups[0].tokens.push(structuredClone(f.catalog.value.groups[0].tokens[0]))],
 ['duplicate allowlist mint',f=>f.tracked.push(structuredClone(f.tracked[0]))],
])test(name+' withholds comparison',()=>{const f=fixture();mutate(f);allWithheld(comparePairPulse(f));});
for(const kind of ['registry','catalog','history'])for(const state of ['unavailable','partial','rate_limited'])test(kind+' '+state+' is explicit and has no fallback/retry',()=>{
 const f=fixture();f[kind]={state,value:null};const r=comparePairPulse(f);noDistribution(r);assert.ok(r.left.distribution.reasons.includes(kind+'_'+state));
 if(kind==='history')assert.equal(r.left.snapshot.state,'available');else assert.equal(r.left.snapshot.value,null);
});
for(const kind of ['registry','catalog','history'])test('cached '+kind+' keeps original source dates rather than resetting freshness',()=>{
 const f=fixture();f[kind].value.dataset.sourceStatus='cached';if(kind==='history')syncHistory(f);let r=comparePairPulse(f);assert.equal(r.comparison.state,'available');
 const old=iso(END-301000);f[kind].value.dataset.dataFetchedAt=old;
 if(kind==='registry')f.registry.value.dataset.provenance.fetchedAt=old;
 if(kind==='history')f.catalog.value.dataset.history.dataFetchedAt=old;
 r=comparePairPulse(f);allWithheld(r);
});
test('degraded catalog retains distinctly labeled snapshots but never admits a distribution comparison',()=>{
 const f=fixture();f.catalog.value.status='degraded';f.catalog.value.dataset.sourceStatus='degraded';const r=comparePairPulse(f);
 noDistribution(r);assert.equal(r.left.snapshot.state,'available');assert.equal(r.left.snapshot.confidence,'snapshot_only');assert.equal(r.left.snapshot.value.sourceQuality,'degraded');
 assert.equal(r.left.snapshot.value.kind,'provider_reported_snapshot_not_trend');assert.equal(r.left.snapshot.value.observedAt,null);assert.equal(r.left.snapshot.value.liquidityUsd,0);assert.equal(r.left.snapshot.value.volume24hUsd,null);
});
test('nullable market snapshot fields, source times and USD units remain explicit; no snapshot-to-trend promotion',()=>{
 const f=fixture();const t=f.catalog.value.groups[0].tokens[0];t.market.liquidityUsd=null;t.market.volume24hUsd=123.45;let r=comparePairPulse(f);
 assert.equal(r.left.snapshot.value.liquidityUsd,null);assert.equal(r.left.snapshot.value.volume24hUsd,123.45);assert.equal(r.left.snapshot.value.providerGeneratedAt,t.provenance.providerGeneratedAt);
 for(const mutate of [()=>t.market.unit='ZEC',()=>{t.market.unit='USD';t.market.observedAt=iso(END)},()=>{t.market.observedAt=null;t.market.volume24hUsd=Infinity},()=>{t.market.volume24hUsd=null}]){mutate();r=comparePairPulse(f);assert.equal(r.left.snapshot.value,null);assert.equal(r.unsupported.marketTrend.value,null);}
});
for(const [name,mutate] of [
 ['gap exactly 2h',f=>{left(f).splice(36,1);syncHistory(f);}],
 ['missing previous day',f=>{f.history.value.store[L.mint]=left(f).slice(24);syncHistory(f);}],
 ['counter reset inside current day',f=>{left(f)[40].distributedTokens=0;syncHistory(f);}],
 ['payout counter reset',f=>{left(f)[40].payoutCount=0;syncHistory(f);}],
 ['interior quote identity change',f=>left(f)[40].quoteMint=trackedTokens()[0].quoteMint],
 ['interior source forgery',f=>left(f)[40].source='https://evil.invalid/rewards'],
 ['missing provider time',f=>delete left(f)[40].providerGeneratedAt],
 ['provider time more than3h old at its own observation',f=>left(f)[40].providerGeneratedAt=iso(Date.parse(left(f)[40].observedAt)-3*HOUR-1)],
 ['future provider time',f=>left(f)[48].providerGeneratedAt=iso(END+61000)],
 ['provider generation reverses',f=>left(f)[40].providerGeneratedAt=left(f)[39].providerGeneratedAt],
 ['recorded mode changes inside window',f=>left(f)[40].mode='standard'],
 ['identical duplicate observation',f=>{left(f).push({...left(f)[40]});syncHistory(f);}],
 ['conflicting duplicate observation',f=>{left(f).push({...left(f)[40],distributedTokens:999});syncHistory(f);}],
 ['invalid observation timestamp',f=>left(f)[40].observedAt='2030-02-30T00:00:00Z'],
 ['future observation cannot be filtered away',f=>left(f).push({...left(f)[48],observedAt:iso(END+61000)})],
 ['unsafe cumulative atomic precision',f=>left(f)[40].distributedTokens=Number.MAX_SAFE_INTEGER],
 ['sub-atomic source precision',f=>left(f)[40].distributedTokens=0.000000001],
 ['nonfinite counter',f=>left(f)[40].distributedTokens=Infinity],
 ['catalog history metadata is inconsistent',f=>f.catalog.value.groups[0].tokens[0].lastObservedAt=iso(END-1000)],
])test(name+' withholds without repairing data',()=>{const f=fixture();mutate(f);const before=JSON.stringify(f),r=comparePairPulse(f);assert.equal(r.left.distribution.value,null);allWithheld(r);assert.equal(JSON.stringify(f),before);});
test('equal durations with shifted actual observation periods are not aligned',()=>{
 const f=fixture();for(const r of right(f)){r.observedAt=iso(Date.parse(r.observedAt)-1000);r.providerGeneratedAt=iso(Date.parse(r.providerGeneratedAt)-1000);}const r=comparePairPulse(syncHistory(f));
 assert.equal(r.left.distribution.state,'available');assert.equal(r.right.distribution.state,'withheld');allWithheld(r);
});
test('individually valid observed periods still fail cross-token alignment when provider boundaries differ by1ms',()=>{
 const f=fixture();for(const r of right(f))r.providerGeneratedAt=iso(Date.parse(r.providerGeneratedAt)-1);const r=comparePairPulse(f);
 assert.equal(r.left.distribution.state,'available');assert.equal(r.right.distribution.state,'available');assert.deepEqual(r.comparison.reasons,['provider_period_unaligned']);allWithheld(r);
});
test('a fresh re-fetch of stale counter observations cannot manufacture current history',()=>{
 const f=fixture();f.asOf=iso(END+3*HOUR+1);const r=comparePairPulse(f);noDistribution(r);assert.equal(r.comparison.value,null);
});
test('exact source-age and 3h observation-age edges cannot be weakened by policy input',()=>{
 let f=fixture();f.asOf=iso(END+360000); // original source receipt at END+60s is now exactly300s old.
 assert.equal(comparePairPulse(f).comparison.state,'available');f.asOf=iso(END+360001);allWithheld(comparePairPulse(f));
 f=fixture();f.asOf=iso(END+3*HOUR);for(const s of f.catalog.value.dataset.sources)s.fetchedAt=f.asOf;
 const p=f.registry.value.dataset.provenance;p.fetchedAt=f.asOf;p.providerGeneratedAt=f.asOf;f.registry.value.quotes[0].verifiedAt=f.asOf;
 f.registry.value.dataset.fetchedAt=f.asOf;f.registry.value.dataset.dataFetchedAt=f.asOf;
 f.catalog.value.dataset.fetchedAt=f.asOf;f.catalog.value.dataset.dataFetchedAt=f.asOf;f.catalog.value.groups[0].verifiedAt=f.asOf;
 for(const t of f.catalog.value.groups[0].tokens)t.verifiedAt=f.asOf;
 f.history.value.dataset.dataFetchedAt=f.asOf;syncHistory(f);
 // Last provider counter timestamp is30s older than its observation, so3h observation recency alone is insufficient.
 allWithheld(comparePairPulse(f));f.asOf=iso(END+3*HOUR+1);allWithheld(comparePairPulse(f));
});
test('synthetic distribution spikes are observed arithmetic only, never alpha, ROI, liquidity efficiency or leadership',()=>{
 const f=fixture();for(let i=25;i<49;i++)left(f)[i].distributedTokens=24+(i-24)*10000;
 const r=comparePairPulse(syncHistory(f));assert.equal(r.comparison.state,'available');assert.equal(r.left.distribution.value.current.distributed.tokens,'240000.00000000');
 for(const m of Object.values(r.unsupported))assert.equal(m.value,null);assert.equal(r.comparison.value.interpretation,'activity_difference_not_economic_leadership');
});
test('bounded arrays fail closed instead of truncating candidates, provenance or observations into a healthy result',()=>{
 for(const mutate of [f=>f.registry.value.quotes=Array(101).fill(f.registry.value.quotes[0]),f=>f.catalog.value.groups[0].tokens=Array(51).fill(f.catalog.value.groups[0].tokens[0]),f=>f.catalog.value.dataset.sources=Array(16).fill(f.catalog.value.dataset.sources[0]),f=>f.tracked=Array(11).fill(f.tracked[0]),f=>f.history.value.store[L.mint]=Array(1025).fill(left(f)[0])]){
  const f=fixture();mutate(f);const r=comparePairPulse(f);allWithheld(r);const reasons=[...r.comparison.reasons,...(r.left.distribution.reasons??[])];assert.ok(reasons.includes('input_limit_exceeded'));
 }
});
test('malformed runtime values, invalid dates and absent candidates expose explicit nulls without throwing',()=>{
 for(const f of [null,{}, {...fixture(),asOf:'bad'}, {...fixture(),endAt:'2030-01-03T01:00:00Z'}, {...fixture(),endAt:'2030-01-01T00:00:00+01:00'}, {...fixture(),leftMint:trackedTokens()[0].mint}]){
  assert.doesNotThrow(()=>comparePairPulse(f));allWithheld(comparePairPulse(f));
 }
});
test('separate fresh registry byte revisions can confirm the same identity without claiming atomic pagination',()=>{
 const f=fixture();f.registry.value.dataset.provenance={...f.registry.value.dataset.provenance,revision:'sha256:'+'b'.repeat(64)};
 const r=comparePairPulse(f);assert.equal(r.comparison.state,'available');assert.notEqual(r.registrySource.revision,r.left.distribution.value.catalogSource.revision);assert.equal(r.scope.atomic,false);
});
test('real stored ZEC history cannot pass the new period gates, even with synthetic healthy catalog/mode metadata',()=>{
 const f=fixture(),real=JSON.parse(readFileSync('data/reward-snapshots.json','utf8'));
 // Pin this negative historical replay; later genuine appends must not make it a moving-current assertion.
 const cutoff=Date.parse('2026-10-14T19:28:06.000Z');
 f.history.value.store=Object.fromEntries(tracked.map(t=>[t.mint,real[t.mint].filter(row=>Date.parse(row.observedAt)<=cutoff)]));
 f.endAt='2026-10-14T19:28:06.000Z';f.asOf='2026-10-14T19:29:06.000Z';
 // Keep synthetic source metadata dated to that historical replay; never present it as a live API capture.
 for(const s of f.catalog.value.dataset.sources){s.fetchedAt=f.asOf;s.providerGeneratedAt=f.asOf;}
 for(const t of f.catalog.value.groups[0].tokens){t.verifiedAt=f.asOf;t.market.providerGeneratedAt=f.asOf;}
 f.catalog.value.groups[0].verifiedAt=f.asOf;Object.assign(f.catalog.value.dataset,{fetchedAt:f.asOf,dataFetchedAt:f.asOf});
 f.registry.value.quotes[0].verifiedAt=f.asOf;Object.assign(f.registry.value.dataset,{fetchedAt:f.asOf,dataFetchedAt:f.asOf});f.history.value.dataset.dataFetchedAt=f.asOf;
 const r=comparePairPulse(syncHistory(f));noDistribution(r);assert.ok(r.left.distribution.details.includes('gapped_current_history'));assert.ok(r.left.distribution.details.includes('gapped_previous_history'));
});

test('unrecognized registry properties never escape into the bounded output contract',()=>{
 const f=fixture();f.registry.value.quotes[0].untrustedExtra={large:Array(1000).fill('not part of the schema')};
 const r=comparePairPulse(f);assert.equal(r.comparison.state,'available');assert.ok(!Object.hasOwn(r.quote,'untrustedExtra'));
});
test('catalog verification labels and future allowlist attestations cannot bypass identity gates',()=>{
 for(const mutate of [f=>f.catalog.value.groups[0].verification='unverified',f=>f.tracked[0].verifiedAt='2031-01-01T00:00:00Z']){const f=fixture();mutate(f);allWithheld(comparePairPulse(f));}
});
test('one atomic unit is preserved without double subtraction or rounded-to-zero changes',()=>{
 const f=fixture();for(const t of [L,R])for(const row of f.history.value.store[t.mint])row.distributedTokens=0;
 left(f)[48].distributedTokens=1e-8;const r=comparePairPulse(syncHistory(f));
 assert.equal(r.comparison.state,'available');assert.deepEqual(r.comparison.value.current,{atomic:'1',tokens:'0.00000001'});
});
test('source revision provenance, source-age expiry and market generated-time mismatch cannot be relabeled fresh',()=>{
 for(const mutate of [f=>f.registry.value.dataset.provenance.revision='branch-main',f=>{const p=f.catalog.value.groups[0].tokens[0].provenance;p.providerGeneratedAt=iso(END-4*HOUR);},f=>f.catalog.value.dataset.sources.push({...f.catalog.value.dataset.sources[0]})]){const f=fixture();mutate(f);noDistribution(comparePairPulse(f));}
 const f=fixture();f.catalog.value.groups[0].tokens[0].market.providerGeneratedAt=iso(END);assert.equal(comparePairPulse(f).left.snapshot.value,null);
});

test('canonical history outage with null store is unavailable, distinct from malformed healthy data',()=>{
 const f=fixture();f.history.value.store=null;f.history.value.dataset.sourceStatus='unavailable';let r=comparePairPulse(f);
 assert.deepEqual(r.left.distribution.reasons,['history_unavailable']);assert.equal(r.left.snapshot.state,'available');
 f.history.value.dataset.sourceStatus='available';r=comparePairPulse(f);assert.deepEqual(r.left.distribution.reasons,['history_invalid']);
});
test('canonical retained history after a failed read is partial, not a healthy comparison',()=>{
 const f=fixture();f.history.value.dataset.sourceStatus='degraded';const r=comparePairPulse(f);assert.deepEqual(r.left.distribution.reasons,['history_partial']);noDistribution(r);
});
