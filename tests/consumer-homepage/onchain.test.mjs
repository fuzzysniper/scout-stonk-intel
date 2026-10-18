import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const load=async file=>import(pathToFileURL(path.join(process.env.CONSUMER_TEST_BUILD,file+'.js')).href);
const {projectMintFacts,exactSupply,addressQuery,explorerAddress}=await load('app/consumer/onchain-model');
const {MintFactsPanel,OnchainUnavailable}=await load('app/consumer/onchain');
const {requestMintFacts,productionMintFactsPort}=await load('app/consumer/onchain-client');
const {syntheticMint,syntheticFailure,TEST_MINT:mint,TEST_TIME}=await load('tests/consumer-homepage/synthetic');
const now=Date.parse(TEST_TIME),project=(v,context='synthetic-offline',status=200)=>projectMintFacts(v,mint,now,context,status);

test('exact supply never rounds u64 and handles zero/255 decimals without exponential floating point',()=>{
 assert.deepEqual(exactSupply('18446744073709551615',9),{decimal:'18446744073.709551615',summary:'18,446,744,073.709551615'});
 assert.equal(exactSupply('0',255).summary,'0');assert.equal(exactSupply('1',255).decimal,'0.'+'0'.repeat(254)+'1');assert.equal(exactSupply('1',255).summary,'1 × 10^−255');
 for(const raw of ['18446744073709551616','01','1e9','1.1','-1'])assert.throws(()=>exactSupply(raw,9));for(const d of [-1,256,NaN,1.5])assert.throws(()=>exactSupply('1',d));
});
test('single real MintFactsV1 contract projects only matching fresh initialized program facts',()=>{
 const v=project(syntheticMint());assert.equal(v.kind,'facts');assert.equal(v.value.source.contextSlot,'400000001');assert.equal(v.supply,'18,446,744,073.709551615');assert.equal(v.offline,true);
 const x=syntheticMint();x.source.acquisition='recorded_response';assert.equal(project(x).kind,'unavailable');
});
test('synthetic, recorded, development and missing acquisition never become a production observation',()=>{
 for(const acquisition of ['synthetic_fixture','recorded_response','development_rpc',undefined,'production_rpc']){const x=syntheticMint();x.source.acquisition=acquisition;assert.equal(project(x,'production').kind,'unavailable');}
});
test('identity, precision, authority, layout, clock and provenance mutations withhold facts',()=>{
 const mutate=[x=>x.version='2',x=>x.mint='1'.repeat(32),x=>x.facts.mint='1'.repeat(32),x=>x.facts.network='devnet',x=>x.facts.initialized=false,x=>x.facts.ownerProgram='1'.repeat(32),x=>x.facts.supply.raw='18446744073709551616',x=>x.facts.supply.decimalAmount='18446744073.7',x=>x.facts.supply.decimals=256,x=>delete x.facts.mintAuthority,x=>x.facts.freezeAuthority={state:'absent',address:mint},x=>x.facts.mintAuthority.address='https://rpc.invalid',x=>x.facts.extensions.assessment='unreviewed',x=>x.facts.extensions.names=['<script>'],x=>x.facts.interpretation.freezing='authority_present',x=>x.source.commitment='confirmed',x=>x.source.contextSlot='9007199254740992',x=>x.source.contextSlot='0',x=>x.source.slotTime='2026-10-18',x=>x.source.assurance='independent',x=>x.source.endpointHost='mainnet.helius-rpc.com/?api-key=secret',x=>x.source.endpointHost='evil.invalid',x=>x.source.responseSha256='bad',x=>x.source.checkedAt='2026-10-18T12:05:00Z',x=>x.source.evaluatedAt='2026-10-18T12:05:00Z',x=>x.source.freshness='stale',x=>x.source.httpDate='not a date'];
 for(const edit of mutate){const x=syntheticMint();edit(x);assert.notEqual(project(x).kind,'facts',String(edit));}
 assert.equal(projectMintFacts(syntheticMint(),mint,now+60_001,'synthetic-offline').reason,'stale_source');
});
test('unreviewed Token-2022 extensions retain base fields but override both control interpretations',()=>{
 const x=syntheticMint(mint,true),v=project(x);assert.equal(v.kind,'facts');assert.equal(v.value.status,'unsupported_extensions');assert.equal(v.value.facts.interpretation.minting,'extension_review_required');
 const html=renderToStaticMarkup(React.createElement(MintFactsPanel,{view:v,mint,context:'synthetic-offline'}));assert.match(html,/Extensions unreviewed/);assert.match(html,/Freeze authority absent/);assert.match(html,/do not establish all issuance, transfer or freeze controls/);
});
test('supported MetadataPointer layout does not fetch or adopt offchain identity',()=>{
 const x=syntheticMint(mint,true);x.status='verified_onchain_mint_at_slot';x.facts.extensions={assessment:'reviewed_metadata_pointer',names:['metadataPointer'],metadataPointer:{authority:null,metadataAddress:mint}};x.facts.interpretation={minting:'authority_present',freezing:'authority_absent'};
 assert.equal(project(x).kind,'facts');x.facts.extensions.metadataPointer=null;assert.equal(project(x).kind,'unavailable');
});
test('all failure states have no facts and JSON 404 is distinct from transport/missing source',()=>{
 for(const reason of ['disabled','timeout','rate_limited','stale_source','access_denied','upstream_unavailable']){const v=project(syntheticFailure(mint,reason));assert.equal(v.kind,'unavailable');assert.equal(v.reason,reason);}
 const v=project(syntheticFailure(mint,'not_mint','not_a_supported_mint_account'),'production',404);assert.equal(v.kind,'unsupported');
 const x=syntheticFailure(mint,'timeout','not_a_supported_mint_account');assert.equal(project(x).kind,'unavailable');
 for(const status of [401,403,429,503])assert.equal(project(syntheticMint(),'synthetic-offline',status).kind,'unavailable');
});
test('untrusted extra metadata and warning text never enter projected state or HTML',()=>{
 const x=syntheticMint();x.name='SECRET BRAND';x.facts.priceUsd=1234567;x.source.apiKey='PRIVATE_KEY';x.warnings=['<script>SECRET BRAND</script>'];
 const v=project(x),html=renderToStaticMarkup(React.createElement(MintFactsPanel,{view:v,mint}));assert.doesNotMatch(JSON.stringify(v)+html,/SECRET BRAND|PRIVATE_KEY|1234567|apiKey/);assert.match(html,/SYNTHETIC.*OFFLINE TEST/);assert.match(html,/400000001/);assert.match(html,/not independently replayed/);
});
test('SSR/no-JS is honest and historical unavailable panel is compact',()=>{
 const html=renderToStaticMarkup(React.createElement(OnchainUnavailable,{mint,historical:true}));assert.match(html,/Source not connected/);assert.match(html,/14 Oct 2026/);assert.doesNotMatch(html,/mint-supply|Mint authority absent/);assert.ok(html.length<1000);
});
test('exact address links reject aliases, whitespace, URL and duplicate-array input',()=>{
 for(const raw of ['SI',' '+mint,mint+' ',[mint,mint],'<script>','https://rpc.invalid']){assert.throws(()=>addressQuery(raw));assert.throws(()=>explorerAddress(raw));}
 assert.equal(addressQuery(mint),'/?mint='+mint);assert.equal(new URL(explorerAddress(mint)).origin,'https://explorer.solana.com');
});
const signal=()=>new AbortController().signal;
test('client calls only fixed same-origin GET with bounded/redacted options',async()=>{
 let call;const result=await requestMintFacts(mint,signal(),async(url,options)=>{call={url,options};return Response.json(syntheticFailure(mint),{status:503});});
 assert.equal(call.url,'/api/mint-facts?mint='+mint);assert.equal(call.options.method,'GET');assert.equal(call.options.redirect,'error');assert.equal(call.options.credentials,'omit');assert.equal(call.options.cache,'no-store');assert.equal(result.body.reason,'disabled');
});
test('client distinguishes JSON unsupported 404, missing HTML 404 and non-JSON upstream failure',async()=>{
 const a=await requestMintFacts(mint,signal(),async()=>Response.json(syntheticFailure(mint,'not_mint','not_a_supported_mint_account'),{status:404}));assert.equal(project(a.body,'production',a.httpStatus).kind,'unsupported');
 const b=await requestMintFacts(mint,signal(),async()=>new Response('<html>missing</html>',{status:404}));assert.equal(b.body.reason,'disabled');
 const c=await requestMintFacts(mint,signal(),async()=>new Response('sensitive upstream error',{status:503}));assert.equal(c.body.reason,'upstream_unavailable');assert.doesNotMatch(JSON.stringify(c),/sensitive/);
});
test('client clamps 429 cooldown, rejects oversized/invalid bodies and respects cancellation',async()=>{
 const r=await requestMintFacts(mint,signal(),async()=>new Response('nope',{status:429,headers:{'retry-after':'999999'}}));assert.equal(r.retryMs,300000);assert.equal(r.body.reason,'rate_limited');
 const large=await requestMintFacts(mint,signal(),async()=>new Response('x'.repeat(32769),{headers:{'content-type':'application/json'}}));assert.equal(large.body.reason,'response_too_large');
 const bad=await requestMintFacts(mint,signal(),async()=>new Response('{',{headers:{'content-type':'application/json'}}));assert.equal(bad.body.reason,'invalid_response');
 const controller=new AbortController();controller.abort();const cancelled=await requestMintFacts(mint,controller.signal,async()=>new Promise(()=>{}));assert.equal(cancelled.body.reason,'timeout');
});
test('consumer imports source contract by type only, has no test-entry/credential/activation dependency',()=>{
 const source=['onchain-model','onchain-client','onchain','home'].map(f=>readFileSync('app/consumer/'+f+(f==='home'||f==='onchain'?'.tsx':'.ts'),'utf8')).join('\n');
 assert.match(source,/import type.*MintFactsV1/);assert.doesNotMatch(source,/from ['"][^'"]*(?:onchain-mint\/(?!contract)|tests\/)|NEXT_PUBLIC_|process\.env|window\.__|getAccountInfo\(/);
});

 test('tab-local 429 cooldown blocks another exact mint without another request',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response('',{status:429,headers:{'retry-after':'2'}});};
 try{await productionMintFactsPort.read(mint,signal());const second=await productionMintFactsPort.read('11111111111111111111111111111111',signal());assert.equal(second.httpStatus,429);assert.equal(calls,1);}finally{globalThis.fetch=original;}
 });
 test('total client deadline returns even if an injected transport never settles',async()=>{
 const started=Date.now();const value=await requestMintFacts(mint,signal(),async()=>new Promise(()=>{}));assert.equal(value.body.reason,'timeout');assert.ok(Date.now()-started<7500);
 });
