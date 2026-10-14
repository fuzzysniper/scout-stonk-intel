// Failure/edge mutations below are SYNTHETIC OFFLINE TEST INPUTS, never evidence.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const {auditPairRewards,REWARD_AUDIT_LIMITS}=(await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'lib/pair-reward-audit.js')))).default;
const evidence=JSON.parse(readFileSync('docs/evidence/pair-reward-audit-2026-10-14.json','utf8'));
const packet=p=>({source:'https://www.stonkfun.xyz'+p.path,status:p.status,fetchedAt:new Date(p.capturedAt).toISOString(),body:p.body??null,ageSeconds:p.headers.age==null?null:Number(p.headers.age)});
function fixture(index=0){
 const quoteMint=evidence.quoteMints[index],registry=evidence.packets.find(p=>p.path==='/api/public/v1/pairs');
 const catalog=evidence.packets.find(p=>p.path==='/api/public/v1/tokens?sort=marketCap&page=1&pageSize=25&quoteMint='+quoteMint);
 const mints=new Set(JSON.parse(catalog.body).data.tokens.filter(t=>t.mode==='reward').slice(0,4).map(t=>t.mint));
 return {quoteMint,asOf:evidence.asOf,registry:packet(registry),catalog:packet(catalog),rewards:evidence.packets.filter(p=>/^\/api\/v2\/tokens\/[^/]+\/rewards$/.test(p.path)&&mints.has(p.path.split('/')[4])).map(packet)};
}
function mutate(p,fn){const d=JSON.parse(p.body);fn(d);p.body=JSON.stringify(d);}
const withheld=r=>{assert.equal(r.ranking.state,'withheld');assert.deepEqual(r.ranking.orderedMints,[]);assert.deepEqual(r.ranking.topObservedMints,[]);assert.equal(r.ecosystemLeader.state,'unknown');assert.ok(Object.values(r.unsupported).every(v=>v===null));};
const candidate=(f,fn)=>mutate(f.rewards[0],fn);
for(const [index,name,total,winner,amount] of [[0,'NVDAX',7663,'SI','15527.87212775'],[1,'GLDX',1910,'GP','9828.59080179'],[2,'SPCXX',8656,'GROK','5092.44927539'],[3,'STONK',10618,'KNOTS','11995464.083712182']])test('dated genuine '+name+' sample has exact units and bounded scope',()=>{
 const f=fixture(index),before=JSON.stringify(f),r=auditPairRewards(f);assert.equal(JSON.stringify(f),before);
 assert.deepEqual(r,evidence.offlineReport.reports[index]);
 assert.equal(r.ranking.state,'available');assert.equal(r.quote.symbol,name);
 assert.equal(r.coverage.providerReportedTotal,total);assert.equal(r.coverage.catalogInspected,25);assert.equal(r.coverage.catalogUninspected,total-25);assert.equal(r.coverage.rewardsUnassessed,total-4);
 for(const k of ['candidatesSelected','rewardReadsAttempted','rewardModeVerified','payoutDataAvailable','eligibleForComparison'])assert.equal(r.coverage[k],4);
 const top=r.candidates.find(t=>t.mint===r.ranking.topObservedMints[0]);assert.equal(top.symbol,winner);assert.equal(top.lifetime.distributedTokens,amount);
 assert.equal(top.lifetime.startAt,null);assert.equal(top.lifetime.endAt,null);assert.equal(r.coverage.complete,false);assert.equal(r.coverage.atomic,false);
 assert.equal(r.ecosystemLeader.state,'unknown');assert.equal(r.unsupported.reward24h,null);assert.equal(r.unsupported.holderRoi,null);
 assert.match(r.catalogSource.source,/sort=marketCap/);assert.ok(r.ranking.observations.generatedFrom<=r.ranking.observations.generatedTo);
});
test('received-byte evidence hashes reproduce, including ignored filter',()=>{
 assert.equal(evidence.requestsMade,30);assert.ok(evidence.requestsMade<=evidence.requestBudget);
 for(const p of evidence.packets){assert.equal(Buffer.byteLength(p.body),p.bytes);assert.equal(createHash('sha256').update(p.body).digest('hex'),p.bodySha256);assert.equal(p.status,200);}
 const rows=evidence.packets.filter(p=>p.path.startsWith('/api/v2/rewards/launches'));
 assert.equal(rows.length,2);assert.equal(rows[0].bodySha256,rows[1].bodySha256);
 const global=JSON.parse(rows[0].body);assert.ok(global.rows.every(r=>!evidence.quoteMints.includes(r.asset.mint)));assert.ok(global.page.nextCursor);
 const baseline=JSON.parse(fixture().catalog.body).data.tokens.map(t=>t.mint);
 const bogus=JSON.parse(evidence.packets.find(p=>p.path.startsWith('/api/public/v1/tokens?sort=distributed')).body).data.tokens.map(t=>t.mint);
 assert.deepEqual(baseline,bogus);
});
for(const [name,change] of [
 ['invalid chosen mint',f=>f.quoteMint='invalid'],
 ['invalid audit timestamp',f=>f.asOf='2026-02-30T00:00:00Z'],
 ['missing cold registry',f=>f.registry=null],
 ['missing cold catalog',f=>f.catalog=null],
 ['registry foreign origin',f=>f.registry.source='https://evil.invalid/pairs'],
 ['mixed catalog quote identity',f=>mutate(f.catalog,d=>d.data.tokens[1].quote.mint=evidence.quoteMints[1])],
 ['provider reward sort cannot masquerade as market cap sample',f=>f.catalog.source=f.catalog.source.replace('marketCap','distributed')],
 ['global sorted amounts cannot masquerade as reward aggregate',f=>f.rewards[0]=packet(evidence.packets.find(p=>p.path.startsWith('/api/v2/rewards/launches')))],
 ['malformed registry',f=>f.registry.body='{'],
 ['duplicate registry exact identity',f=>mutate(f.registry,d=>d.data.pairs[1]=d.data.pairs[0])],
 ['false ticker ambiguity flag',f=>mutate(f.registry,d=>{d.data.pairs.find(q=>q.mint===evidence.quoteMints[3]).symbolAmbiguous=false;})],
 ['duplicate catalog token',f=>mutate(f.catalog,d=>d.data.tokens[1]=d.data.tokens[0])],
 ['unvalidated rejected catalog row',f=>mutate(f.catalog,d=>d.data.tokens[20].pool='invalid')],
 ['partial short catalog page',f=>mutate(f.catalog,d=>d.data.tokens.pop())],
 ['wrong pagination',f=>mutate(f.catalog,d=>d.data.pagination.page=2)],
 ['missing reward response',f=>f.rewards.pop()],
 ['duplicate reward packet',f=>f.rewards[1]=structuredClone(f.rewards[0])],
 ['extra reward packet exceeds audit budget',f=>f.rewards.push(structuredClone(f.rewards[0]))],
 ['different token identity',f=>candidate(f,d=>d.mint=evidence.quoteMints[1])],
 ['same ticker different exact quote mint',f=>candidate(f,d=>d.quote.mint=evidence.quoteMints[3])],
 ['reward unit symbol mismatch',f=>candidate(f,d=>d.quote.symbol='NVDA')],
 ['different or missing decimals',f=>candidate(f,d=>d.quote.decimals=null)],
 ['catalog-only reward mode insufficient',f=>candidate(f,d=>d.mode='standard')],
 ['snapshot basis not ledger evidence',f=>candidate(f,d=>d.basis='snapshot')],
 ['awaiting ledger totals remain unavailable',f=>candidate(f,d=>{d.basis='awaiting-snapshot';d.rewards=null;})],
 ['null rewards are not zero',f=>candidate(f,d=>d.rewards=null)],
 ['invalid lifetime raw amount',f=>candidate(f,d=>d.rewards.distributedRaw='1e9')],
 ['raw amount as number is not exact',f=>candidate(f,d=>d.rewards.distributedRaw=123)],
 ['negative raw',f=>candidate(f,d=>d.rewards.distributedRaw='-1')],
 ['noncanonical leading zero raw',f=>candidate(f,d=>d.rewards.distributedRaw='01')],
 ['unbounded raw precision',f=>candidate(f,d=>d.rewards.distributedRaw='9'.repeat(79))],
 ['unsafe payout count',f=>candidate(f,d=>d.rewards.payoutCount=Number.MAX_SAFE_INTEGER+1)],
 ['negative wallets paid',f=>candidate(f,d=>d.rewards.walletsPaid=-1)],
 ['wallets greater than payouts',f=>candidate(f,d=>d.rewards.walletsPaid=d.rewards.payoutCount+1)],
 ['positive distribution with zero payouts',f=>candidate(f,d=>{d.rewards.payoutCount=0;d.rewards.walletsPaid=0;})],
 ['missing actual last payout for positive count',f=>candidate(f,d=>d.rewards.lastPayoutAt=null)],
 ['future actual payout',f=>candidate(f,d=>d.rewards.lastPayoutAt='2030-01-01T00:00:00Z')],
 ['future generation metadata',f=>candidate(f,d=>d.generatedAt='2030-01-01T00:00:00Z')],
 ['stale provider generation',f=>candidate(f,d=>d.generatedAt='2026-10-14T20:00:00Z')],
 ['stale original cached retrieval',f=>f.rewards[0].fetchedAt='2026-10-14T20:00:00Z'],
 ['stale transport age',f=>f.rewards[0].ageSeconds=301],
 ['malformed transport age',f=>f.rewards[0].ageSeconds=NaN],
 ['oversized response',f=>f.rewards[0].body=' '.repeat(32*1024+1)],
 ['source error envelope',f=>candidate(f,d=>d.error='unavailable')],
 ['generation spread beyond minute budget',f=>candidate(f,d=>d.generatedAt='2026-10-14T22:32:00Z')],
])test(name+' withholds ordering',()=>{const f=fixture();change(f);withheld(auditPairRewards(f));});
for(const source of ['registry','catalog','reward'])for(const status of [429,503])test(source+' HTTP '+status+' fails closed without fallback',()=>{
 const f=fixture();const p=source==='reward'?f.rewards[0]:f[source];p.status=status;p.body=null;
 const r=auditPairRewards(f);withheld(r);
 if(source==='reward'){assert.equal(r.coverage.rewardReadsAttempted,4);assert.equal(r.coverage.eligibleForComparison,3);assert.ok(r.candidates[0].reasons.includes(status===429?'source_rate_limited':'source_unavailable'));}
 else {assert.equal(r.coverage.providerReportedTotal,null);assert.ok(r.ranking.reasons.includes(status===429?'source_rate_limited':'source_unavailable'));}
});
test('same STONK ticker identities stay isolated',()=>{
 const f=fixture(3),r=auditPairRewards(f);assert.equal(r.quote.symbolAmbiguous,true);assert.equal(r.ranking.state,'available');
 candidate(f,d=>d.quote.mint='Qirqk4cXB3txQmdqwB7R9o5KVkNzj5ZCT9BHsuLpump');withheld(auditPairRewards(f));
});
test('BigInt raw ordering preserves one atomic unit beyond safe integer',()=>{
 const f=fixture(3);candidate(f,d=>d.rewards.distributedRaw='9007199254740992');mutate(f.rewards[1],d=>{d.rewards.distributedRaw='9007199254740993';d.rewards.distributedTokens=null;});
 const r=auditPairRewards(f);assert.equal(r.ranking.topObservedMints[0],r.candidates[1].mint);assert.equal(r.candidates[1].lifetime.distributedTokens,'9007199.254740993');
});
test('base amounts and rounded provider float do not affect quoted raw comparison',()=>{
 const f=fixture();candidate(f,d=>{d.rewards.distributedTokens=Infinity;d.base={distributedRaw:'9'.repeat(70)};d.pending={distributedRaw:'9'.repeat(70)};});
 const r=auditPairRewards(f);assert.equal(r.ranking.state,'available');assert.equal(r.candidates[0].lifetime.distributedTokens,'15527.87212775');
});
test('exact ties produce co-leaders within sample, no artificial unique winner',()=>{
 const f=fixture();const raw=JSON.parse(f.rewards[0].body).rewards.distributedRaw;mutate(f.rewards[1],d=>{d.rewards={...JSON.parse(f.rewards[0].body).rewards,distributedRaw:raw};});
 const r=auditPairRewards(f);assert.equal(r.ranking.topObservedMints.length,2);assert.equal(r.ecosystemLeader.state,'unknown');
});
test('larger provider total never promotes sample ordering to ecosystem coverage',()=>{
 const f=fixture();mutate(f.catalog,d=>{d.data.pagination.total=500000;d.data.pagination.totalPages=20000;});
 const r=auditPairRewards(f);assert.equal(r.ranking.state,'available');assert.equal(r.coverage.rewardsUnassessed,499996);assert.equal(r.coverage.complete,false);assert.equal(r.ecosystemLeader.state,'unknown');
});
for(const size of [0,1])test('empty/single candidate cannot establish relative top, even if catalog fits page',()=>{
 const f=fixture();mutate(f.catalog,d=>{d.data.tokens=d.data.tokens.slice(0,size);Object.assign(d.data.pagination,{total:size,totalPages:size?1:0});});f.rewards=f.rewards.slice(0,size);
 const r=auditPairRewards(f);withheld(r);assert.equal(r.coverage.complete,false);assert.ok(r.ranking.reasons.includes('insufficient_candidates'));
});
test('no implicit live clock, network, source retry or mutable cache',()=>{
 const f=fixture(),original=globalThis.fetch;globalThis.fetch=()=>{throw Error('No network allowed');};
 try {const r=auditPairRewards(f);assert.equal(r.ranking.state,'available');const stale={...f,asOf:'2026-10-15T00:00:00Z'};withheld(auditPairRewards(stale));assert.deepEqual(auditPairRewards(f),r);assert.ok(Object.isFrozen(REWARD_AUDIT_LIMITS));}finally{globalThis.fetch=original;}
});
