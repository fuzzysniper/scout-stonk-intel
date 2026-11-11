import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {api,market,pair,MINT,OTHER,THIRD,NOW,copy,createPrivateResearchAdapter} from './fixtures.mjs';
test('original bounded Pulse bytes yield pool facts, attribution/hash, independent clocks and no market green',()=>{
 const bytes=new TextEncoder().encode(JSON.stringify([pair()])),p=market({bytes});
 assert.equal(p.evidence.responseSha256,createHash('sha256').update(bytes).digest('hex'));
 assert.equal(p.evidence.provider,'dexscreener');assert.equal(p.evidence.endpoint,`https://api.dexscreener.com/token-pairs/v1/solana/${MINT}`);
 assert.equal(p.evidence.observedAt,null);assert.equal(p.evidence.observationTime,'unknown');assert.equal(p.evidence.contextSlot,null);
 assert.equal(p.evidence.acquisition,'synthetic_fixture');assert.equal(p.evidence.originVerification,'capture_origin_not_independently_attested');
 assert.equal(p.pool.complete,false);assert.equal(p.pool.baseMint,MINT);assert.equal(p.pool.quoteMint,OTHER);
 assert.equal(p.facts.find(f=>f.id==='base_price_usd').fact.decimal,pair().priceUsd);
 assert.equal(p.facts.find(f=>f.id==='pool_age_at_fetch').fact.seconds,3600);
 assert.ok(p.facts.every(f=>f.assessment.color==='grey'&&f.evidenceRef===p.evidence.id));
 assert.doesNotMatch(JSON.stringify(p),/marketCap|circulating|healthy|legitimate|overallScore/);
});
test('null/missing is unknown; exact reported zero and signed change remain real zero/negative',()=>{
 const p=market({pools:[pair({liquidity:{usd:0},volume:{h24:0},priceUsd:'0',priceChange:{h24:0},pairCreatedAt:null})]});
 assert.equal(p.facts[0].fact.amount,0);assert.equal(p.facts[1].fact.amount,0);assert.equal(p.facts[2].fact,null);assert.equal(p.facts[3].fact.decimal,'0');assert.equal(p.facts[4].fact.amount,0);
 const n=market({pools:[pair({liquidity:null,volume:{},priceUsd:null,priceChange:null})]});
 assert.ok([n.facts[0],n.facts[1],n.facts[3],n.facts[4]].every(f=>f.state==='unknown'&&f.fact===null));
});
test('highest sampled liquidity does not aggregate pools or mix quote pins',()=>{
 const p=market({pools:[pair({pairAddress:OTHER,liquidity:{usd:10}}),pair({liquidity:{usd:20}})]});
 assert.equal(p.pool.returnedPools,2);assert.equal(p.pool.address,THIRD);assert.equal(p.facts[0].fact.amount,20);
 const pinned=market({quoteMint:OTHER,pools:[pair(),pair({pairAddress:OTHER,quoteToken:{address:THIRD},liquidity:{usd:1000000}})]});assert.equal(pinned.pool.address,THIRD);
});
test('quote-side match cannot borrow the other base token price/change/volume',()=>{
 const p=market({pools:[pair({baseToken:{address:OTHER},quoteToken:{address:MINT}})]});
 assert.equal(p.pool,null);assert.equal(p.evidence,null);assert.ok(p.facts.every(f=>f.fact===null&&f.assessment.reason==='no_eligible_base_pool'));
});
test('stale receipt cannot retain figures or look fresh by evaluation clock',()=>{
 const p=market({evaluatedMs:NOW+60001});assert.equal(p.evidence.retrievalFreshness,'stale');assert.equal(p.evidence.fetchedAt,new Date(NOW).toISOString());
 assert.ok(p.facts.every(f=>f.fact===null&&f.assessment.color==='grey'&&f.assessment.reason==='stale_receipt'));
});
for(const [name,options] of [
 ['wrong chain',{pools:[pair({chainId:'ethereum'})]}],['wrong mint',{pools:[pair({baseToken:{address:OTHER},quoteToken:{address:THIRD}})]}],
 ['foreign evidence URL',{pools:[pair({url:'http://169.254.169.254/latest/meta-data'})]}],['duplicate pool',{pools:[pair(),pair()]}],
 ['ticker in mint',{pools:[pair({baseToken:{address:'USDC'}})]}],['negative liquidity',{pools:[pair({liquidity:{usd:-1}})]}],
 ['string liquidity',{pools:[pair({liquidity:{usd:'0'}})]}],['empty liquidity',{pools:[pair({liquidity:{usd:''}})]}],
 ['future pool',{pools:[pair({pairCreatedAt:NOW+1})]}],['future retrieval',{evaluatedMs:NOW-1}],
 ['oversize',{bytes:new Uint8Array(262145)}],['nonfinite',{bytes:new TextEncoder().encode('[{"x":NaN}]')}],
 ['duplicate JSON key',{bytes:new TextEncoder().encode('[{"chainId":"solana","chainId":"ethereum"}]')}],
 ['future request',{requestStartedMs:NOW+1}],['too many pools',{pools:Array.from({length:65},()=>pair())}],
])test('no fallback after invalid market receipt: '+name,()=>{
 const p=market(options);assert.equal(p.evidence,null);assert.ok(p.facts.every(f=>f.fact===null&&f.assessment.reason==='invalid_response'));
});
for(const mint of ['USDC',' '+MINT,MINT+'\n','https://dexscreener.com/'+MINT,'0'.repeat(44),null,42])test('invalid exact mint never normalizes '+JSON.stringify(mint),()=>assert.throws(()=>market({mint}),/invalid_exact_solana_mint/));
test('unknown/live acquisition cannot relabel synthetic captures',()=>{assert.throws(()=>market({acquisition:'production_rpc'}),/invalid_acquisition/);});
test('source projection is deeply immutable; serialized copies cannot be joined',()=>{
 const p=market();assert.throws(()=>{p.pool.baseMint=OTHER;},TypeError);assert.throws(()=>api.joinEvidence(MINT,[copy(p)],NOW),/source_join_rejected/);
});
for(const code of [429,502,503])test('reuse existing private adapter '+code+' has no fixture fallback/retry; failure becomes empty grey cards',async()=>{
 let calls=0;const adapter=createPrivateResearchAdapter({approval:{purpose:'private_source_qualification',reference:'SYNTHETIC_OFFLINE_ONLY',exactMints:[MINT],expiresMs:NOW+1000,maxRequests:1,sourceUseReviewed:true,publicRedistribution:false},now:()=>NOW,
 fetcher:async url=>{calls++;const r=new Response('{}',{status:code});Object.defineProperty(r,'url',{value:url});return r;}});
 const r=await adapter.observe(MINT,'explicit_user_action');assert.notEqual(r.state,'ready');assert.equal(calls,1);
 const p=api.sourceFailure('dexscreener',MINT,code===429?'rate_limited':'upstream_unavailable');assert.ok(p.facts.every(f=>f.fact===null));assert.equal(p.evidence,null);
 await adapter.observe(MINT,'explicit_user_action');assert.equal(calls,1);
});
test('existing bounded adapter deadline is reused; a hanging fetch never becomes fake success',async()=>{
 let calls=0;const a=createPrivateResearchAdapter({approval:{purpose:'private_source_qualification',reference:'SYNTHETIC_OFFLINE_ONLY',exactMints:[MINT],expiresMs:NOW+1000,maxRequests:1,sourceUseReviewed:true,publicRedistribution:false},now:()=>NOW,fetcher:async()=>{calls++;return new Promise(()=>{});}});
 const r=await a.observe(MINT,'explicit_user_action');assert.equal(r.state,'unavailable');assert.equal(calls,1);assert.equal(api.sourceFailure('dexscreener',MINT,'timeout').evidence,null);
});
