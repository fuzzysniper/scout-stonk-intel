import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {assembleCapturedEvidence as assemble,sourceOffLens,B,capture,envelope,MINT,OTHER,now,token2022,market} from './fixtures.mjs';
const allGrey=r=>{assert.equal(r.sourceGo,false);assert.equal(r.state,'unavailable');assert.ok(r.intelligence.facts.every(f=>f.assessment.color==='grey'&&f.fact===null));assert.ok(Object.values(r.onchain.checks).every(c=>c.color==='grey'));};
test('actual A raw observations and B exact-mint/hash/slot join, never a cast projection',async()=>{
 const r=await assemble(MINT,{rpc:capture(),market:market()},now);assert.equal(r.state,'offline_captured');assert.equal(r.sourceGo,false);
 const s=r.intelligence.sources.find(s=>s.provider==='helius-solana-rpc');assert.equal(s.responseSha256,r.onchain.provenance.responseSha256);assert.equal(s.contextSlot,r.onchain.provenance.contextSlot);assert.equal(s.fetchedAt,r.onchain.provenance.responseReceivedAt);
 assert.equal(r.onchain.provenance.providerAuthentication,'not_verified_offline');assert.equal(s.originVerification,'capture_origin_not_independently_attested');assert.equal(s.acquisition,'synthetic_fixture');
 assert.equal(r.intelligence.asset.mint,MINT);assert.equal(r.intelligence.overallVerdict,null);assert.equal(r.intelligence.narrative,null);assert.equal(r.intelligence.publication,'withheld');
 assert.equal(r.intelligence.pools[0].baseMint,MINT);assert.equal(r.intelligence.pools[0].quoteMint,OTHER);assert.equal(r.intelligence.pools[0].complete,false);
 assert.equal(r.intelligence.facts.find(f=>f.id==='pool_liquidity_usd').fact.amount,0);assert.equal(r.intelligence.facts.find(f=>f.id==='base_price_usd').fact.decimal,'0');
 assert.equal(s.observedAt,null);assert.ok(r.intelligence.sources.every(s=>s.observedAt===null));
});
test('actual four colors/check states supported only in labeled offline captures',async()=>{
 const ordinary=await assemble(MINT,{rpc:capture(),market:market()},now);
 assert.equal(ordinary.onchain.checks.mintAuthority.color,'red');assert.equal(ordinary.onchain.checks.freezeAuthority.color,'green');
 const t=token2022();t.result.value.data.space=234;t.result.value.data.parsed.info.extensions=[{extension:'metadataPointer',state:{authority:null,metadataAddress:null}}];
 const caution=await assemble(MINT,{rpc:capture(t),market:market()},now);assert.equal(caution.onchain.checks.extensions.color,'yellow');
 assert.ok(caution.intelligence.facts.filter(f=>f.provider==='dexscreener').every(f=>f.assessment.color==='grey'));
 assert.equal(sourceOffLens(MINT).render.tone,'grey');
});
test('original raw supply/program/Token2022 uncertainty are retained without circulating cap or issuer proof',async()=>{
 const body=token2022();body.result.value.data.space=200;body.result.value.data.parsed.info.extensions=[{extension:'transferHook',state:{}}];
 const r=await assemble(MINT,{rpc:capture(body),market:market()},now);assert.equal(r.onchain.state,'unsupported');assert.equal(r.onchain.observations.program,'token_2022');
 assert.ok(Object.values(r.onchain.checks).every(c=>c.color==='grey'));assert.ok(r.intelligence.facts.every(f=>f.assessment.color==='grey'));
 assert.equal(typeof r.onchain.observations.supply.raw,'string');assert.equal(r.intelligence.sources[0].observedAt,null);
});
test('null market fields stay unknown; reported zero is never replaced or aggregated',async()=>{
 const p=market();const pools=JSON.parse(new TextDecoder().decode(p.bytes));pools[0].liquidity.usd=null;pools[0].volume.h24=null;
 const r=await assemble(MINT,{rpc:capture(),market:market({pools})},now);assert.equal(r.intelligence.facts.find(f=>f.id==='pool_liquidity_usd').fact,null);assert.equal(r.intelligence.facts.find(f=>f.id==='pool_volume_24h_usd').fact,null);
});
test('copy original inputs before async hashing; caller mutations cannot relabel evidence',async()=>{
 const rpc=capture(),m=market(),pending=assemble(MINT,{rpc,market:m},now);rpc.request.mint=OTHER;rpc.kind='production_rpc';m.bytes.fill(0);m.acquisition='production_rpc';
 const r=await pending;assert.equal(r.state,'offline_captured');assert.ok(r.intelligence.sources.every(s=>s.acquisition==='synthetic_fixture'));assert.equal(r.onchain.requestedMint,MINT);
});
for(const [name,make] of [
 ['missing both',()=>({})],['missing market',()=>({rpc:capture()})],['missing RPC',()=>({market:market()})],
 ['forged serialized A result',()=>({rpc:{version:'unfarmd-solana-facts/1',state:'observed',requestedMint:MINT},market:market()})],
 ['wrong requested mint',()=>{const c=capture();c.request.mint=OTHER;return {rpc:c,market:market()};}],
 ['wrong market mint',()=>({rpc:capture(),market:market({mint:OTHER})})],
 ['wrong RPC host',()=>{const c=capture();c.request.endpointHost='evil.invalid';return {rpc:c,market:market()};}],
 ['wrong chain',()=>{const c=capture();c.request.network='ethereum';return {rpc:c,market:market()};}],
 ['runtime acquisition',()=>({rpc:capture(undefined,{kind:'production_rpc'}),market:market()})],
 ['tampered JSON bytes',()=>({rpc:capture(undefined,{text:'{"jsonrpc":"2.0","id":1,"id":1}'}),market:market()})],
 ['quote-side borrowed values',()=>{const m=market();const pools=JSON.parse(new TextDecoder().decode(m.bytes));pools[0].baseToken.address=OTHER;pools[0].quoteToken.address=MINT;return {rpc:capture(),market:market({pools})};}],
 ['bad market bytes',()=>({rpc:capture(),market:market({bytes:new Uint8Array([0])})})],
 ['wrong owner',()=>{const c=envelope();c.result.value.owner=OTHER;return {rpc:capture(c),market:market()};}],
 ['no slot',()=>{const c=envelope();delete c.result.context.slot;return {rpc:capture(c),market:market()};}],
])test('all interpretations grey; no fallback for '+name,async()=>allGrey(await assemble(MINT,make(),now)));
for(const httpStatus of [401,429,502,503])test('provider HTTP '+httpStatus+' never fabricates success or retries',async()=>{
 const r=await assemble(MINT,{rpc:capture(undefined,{httpStatus,text:'SYNTHETIC_PRIVATE_ERROR_NOT_A_FACT'}),market:market()},now);allGrey(r);assert.doesNotMatch(JSON.stringify(r),/SYNTHETIC_PRIVATE_ERROR/);
});
test('stale evaluation and future receipt fail grey without rewriting source clocks',async()=>{
 allGrey(await assemble(MINT,{rpc:capture(),market:market()},now+60001));
 allGrey(await assemble(MINT,{rpc:capture(undefined,{responseReceivedAt:new Date(now+1).toISOString()}),market:market()},now));
});
test('microseconds cannot evade receipt skew; no market clock is manufactured from RPC slot',async()=>{
 const rpc=capture(undefined,{responseReceivedAt:'2026-10-18T12:00:00.000001Z',evaluatedAt:'2026-10-18T12:00:00.000001Z'});
 allGrey(await assemble(MINT,{rpc,market:market({requestStartedMs:now-15000,fetchedMs:now-15000})},now+1));
});
test('runtime model uses actual A/B absent contracts for valid/invalid address; never synthetic figures',()=>{
 for(const value of [MINT,OTHER,null,'bad']){const m=sourceOffLens(value);assert.equal(m.sourceGo,false);assert.equal(m.onchain.version,'unfarmd-solana-facts/1');assert.equal(m.onchain.reason,'disabled');assert.equal(m.onchain.provenance,null);assert.ok(m.market.every(c=>c.fact===null&&c.evidenceRef===null&&c.assessment.color==='grey'));assert.deepEqual(m.render,{tone:'grey',observedAt:null,providersDisabled:true});}
});
test('missing key/startup/OFF causes zero attempted network/env credential/storage/timer access',()=>{
 const modulePath=path.resolve(process.env.V4_INTEGRATION_BUILD,'lib/v4-alpha-lens/source-off-model.js');
 const code=`let attempts=0;const deny=()=>{attempts++;throw Error('UNAUTHORIZED');};globalThis.fetch=deny;globalThis.WebSocket=deny;globalThis.setInterval=deny;require('node:net').Socket.prototype.connect=deny;const old=process.env;process.env=new Proxy(old,{get(t,k){if(/HELIUS|NEON|DATABASE|SOURCE_GO|RPC_ENABLED/.test(String(k)))return deny();return t[k];}});const {sourceOffLens}=require(${JSON.stringify(modulePath)});const m=sourceOffLens(${JSON.stringify(MINT)});if(attempts!==0||m.sourceGo!==false||m.render.tone!=='grey')process.exit(1);`;
 const r=spawnSync(process.execPath,['-e',code],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);
});
test('ordinary session editing does not call B journal append or claim saved history',()=>{
 const snapshot=B.sourceOffSnapshot(MINT,now);assert.equal(snapshot.narrative,null);assert.equal(B.THESIS_POLICY.storage,false);assert.equal(B.THESIS_POLICY.authenticated,false);
});
