import test from 'node:test';
import assert from 'node:assert/strict';
import {api,market,capture,MINT,OTHER,NOW,token2022} from './fixtures.mjs';
test('source OFF has no provider/secret/storage dependency and no sample fallback',()=>{
 const old=globalThis.fetch;let attempted=0;globalThis.fetch=()=>{attempted++;throw Error('NO_NETWORK');};
 try{const r=api.sourceOffSnapshot(MINT,NOW);assert.equal(attempted,0);assert.deepEqual(r.sources,[]);assert.deepEqual(r.pools,[]);assert.equal(r.narrative,null);assert.equal(r.overallVerdict,null);assert.equal(r.publication,'withheld');assert.ok(r.facts.every(f=>f.fact===null&&f.assessment.color==='grey'));assert.deepEqual([api.INTELLIGENCE_POLICY.acquisition,api.INTELLIGENCE_POLICY.storage,api.INTELLIGENCE_POLICY.publicFinancialDisplay],[false,false,false]);}finally{globalThis.fetch=old;}
});
test('four colors are per-check only: absent authority green, present red, Token2022 caution yellow, market clock grey',async()=>{
 const c=capture(),body=JSON.parse(c.text);body.result.value.data.parsed.info.freezeAuthority=OTHER;
 const a=await api.projectHeliusCapture({...c,text:JSON.stringify(body)}),s=api.joinEvidence(MINT,[a,market()],NOW);
 assert.equal(s.facts.find(f=>f.id==='mint_authority').assessment.color,'red'); // fixture has active mint authority
 assert.equal(s.facts.find(f=>f.id==='freeze_authority').assessment.color,'red');
 body.result.value.data.parsed.info.mintAuthority=null;body.result.value.data.parsed.info.freezeAuthority=null;
 const absent=await api.projectHeliusCapture({...c,text:JSON.stringify(body)});assert.equal(absent.facts[0].assessment.color,'green');
 const t=await api.projectHeliusCapture(capture({body:token2022([],82)}));assert.equal(t.facts.find(f=>f.id==='program').assessment.color,'yellow');
 assert.equal(s.facts.find(f=>f.id==='pool_liquidity_usd').assessment.color,'grey');assert.equal(s.overallVerdict,null);
 assert.equal(s.sources.find(s=>s.provider==='helius-solana-rpc').observedAt,null);assert.equal(s.sources.find(s=>s.provider==='helius-solana-rpc').commitment,'finalized');
});
test('exact raw supply/program/slot and source clock retained without circulating/holder inference',async()=>{
 const a=await api.projectHeliusCapture(capture());const s=api.joinEvidence(MINT,[a],NOW);
 const value=s.facts.find(f=>f.id==='supply').fact;assert.equal(value.kind,'integer_supply');assert.equal(typeof value.raw,'string');
 assert.match(s.sources[0].contextSlot,/^[1-9]\d*$/);assert.equal(s.sources[0].endpoint,'https://mainnet.helius-rpc.com/');
 assert.equal(s.sources[0].acquisition,'synthetic_fixture');assert.equal(s.sources[0].originVerification,'capture_origin_not_independently_attested');
 assert.doesNotMatch(JSON.stringify(s),/api-key|holderCount|issuerLegitimacy|lpLocked|circulatingSupply|marketCap/);
});
test('Token2022 unreviewed extensions cannot receive green/red authority conclusions',async()=>{
 const body=token2022();body.result.value.data.space=200;body.result.value.data.parsed.info.extensions=[{extension:'transferHook',state:{}}];
 const p=await api.projectHeliusCapture(capture({body}));
 assert.ok(p.facts.every(f=>f.assessment.color==='grey'));assert.ok(p.facts.every(f=>f.assessment.reason==='extension_review_required'));
});
test('joins are deterministic regardless of provider input order and have no universal verdict',async()=>{
 const a=await api.projectHeliusCapture(capture()),b=market();const x=api.joinEvidence(MINT,[a,b],NOW),y=api.joinEvidence(MINT,[b,a],NOW);
 assert.deepEqual(x,y);assert.match(x.id,/^unfarmd-intelligence\/1:sha256:[a-f0-9]{64}$/);assert.equal(x.publication,'withheld');assert.throws(()=>{x.facts[0].assessment.color='green';},TypeError);
});
test('receipt skew is inclusive at15s and rejects independent sources outside the join window',async()=>{
 const a=await api.projectHeliusCapture(capture()),b=market({requestStartedMs:NOW+14980,fetchedMs:NOW+15000,evaluatedMs:NOW+15000});
 assert.equal(api.joinEvidence(MINT,[a,b],NOW+15000).sources.length,2);
 const c=market({requestStartedMs:NOW+14981,fetchedMs:NOW+15001,evaluatedMs:NOW+15001});assert.throws(()=>api.joinEvidence(MINT,[a,c],NOW+15001),/source_join_rejected/);
});
test('green captured technical facts expire at join time; original clocks are never rewritten',async()=>{
 const p=await api.projectHeliusCapture(capture());const s=api.joinEvidence(MINT,[p],NOW+60001);
 assert.ok(s.facts.every(f=>f.fact===null&&f.assessment.color==='grey'));assert.equal(s.sources[0].fetchedAt,new Date(NOW).toISOString());assert.equal(s.sources[0].retrievalFreshness,'stale');
});
test('mint mismatch, duplicate source, forged card, future evaluation and over-budget sources fail closed',()=>{
 const p=market();for(const run of [()=>api.joinEvidence(OTHER,[p],NOW),()=>api.joinEvidence(MINT,[p,p],NOW),()=>api.joinEvidence(MINT,[{...p,asset:{chain:'ethereum',mint:MINT}}],NOW),()=>api.joinEvidence(MINT,[p],NOW-1),()=>api.joinEvidence(MINT,[p,p,p],NOW)])assert.throws(run,/source_join_rejected/);
});
for(const [name,mutate] of [
 ['wrong owner',b=>{b.result.value.owner=OTHER;}],['no slot',b=>{delete b.result.context.slot;}],['uninitialized',b=>{b.result.value.data.parsed.info.isInitialized=false;}],
 ['unsafe supply',b=>{b.result.value.data.parsed.info.supply='18446744073709551616';}],['wrong program',b=>{b.result.value.data.program='invented';}],
])test('original strict mint decoder remains authoritative: '+name,async()=>{const c=capture(),b=JSON.parse(c.text);mutate(b);const p=await api.projectHeliusCapture({...c,text:JSON.stringify(b)});assert.equal(p.evidence,null);assert.ok(p.facts.every(f=>f.fact===null));});
test('captured bridge cannot claim production acquisition or accept unknown capture kinds',async()=>{await assert.rejects(()=>api.projectHeliusCapture(capture({captureKind:'production_rpc'})),/invalid_acquisition/);});
test('original microsecond clocks remain exact and cannot bypass a15s join boundary by rounding',async()=>{
 const a=await api.projectHeliusCapture(capture({responseReceivedAt:'2026-10-28T12:00:00.000001Z',evaluatedAt:'2026-10-28T12:00:00.000001Z'}));
 assert.equal(a.evidence.fetchedAt,'2026-10-28T12:00:00.000001Z');assert.throws(()=>api.joinEvidence(MINT,[a],NOW),/source_join_rejected/);
 const b=market({requestStartedMs:NOW-15000,fetchedMs:NOW-15000,evaluatedMs:NOW});
 assert.throws(()=>api.joinEvidence(MINT,[a,b],NOW+1),/source_join_rejected/);
});
test('evidence identity binds immutable receipt facts; evaluation freshness does not rewrite its ID',()=>{
 const a=market(),b=market({evaluatedMs:NOW+60001});assert.equal(a.evidence.id,b.evidence.id);
 assert.equal(api.joinEvidence(MINT,[a],NOW+60001).sources[0].id,a.evidence.id);
});
test('caller mutation during async decoding cannot relabel synthetic evidence or swap exact mint',async()=>{
 const c=capture(),pending=api.projectHeliusCapture(c);c.captureKind='production_rpc';c.mint=OTHER;
 const p=await pending;assert.equal(p.evidence.acquisition,'synthetic_fixture');assert.equal(p.asset.mint,MINT);
});
test('receipt input rejects unknown endpoint/headers and accessors, never invokes arbitrary getters',async()=>{
 await assert.rejects(()=>api.projectHeliusCapture(capture({endpointHost:'evil.invalid'})),/invalid_receipt/);
 const c=capture();Object.defineProperty(c,'text',{get(){throw Error('UNTRUSTED_GETTER');},enumerable:true});
 await assert.rejects(()=>api.projectHeliusCapture(c),e=>e.message==='invalid_receipt');
 assert.throws(()=>market({url:'http://169.254.169.254',headers:{Authorization:'SYNTHETIC'}}),/invalid_receipt/);
});
test('stale and invalid onchain clocks stay explicit grey failures, never refreshed by bridge',async()=>{
 const stale=await api.projectHeliusCapture(capture({evaluatedAt:new Date(NOW+60001).toISOString()}));
 assert.ok(stale.facts.every(f=>f.fact===null&&f.state==='unknown'&&f.assessment.reason==='stale_source'));
 const future=await api.projectHeliusCapture(capture({responseReceivedAt:new Date(NOW+1).toISOString()}));
 assert.ok(future.facts.every(f=>f.fact===null&&f.assessment.reason==='invalid_clock'));
});
