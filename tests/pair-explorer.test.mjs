import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const load=async file=>(await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,file+'.js')).href)).default;
const {parseCatalog,fromCatalog,fromTracked,discoveryEvidence,mergePairGroups,searchPairs,visibleTokens}=await load('app/pairs/adapter');
const {default:Explorer,PairTokenRow,usd}=await load('app/pairs/explorer');
const {fetchCatalog}=await load('app/pairs/client');
const {trackedTokens}=await load('lib/tracked-tokens');
const {summarizeRadar}=await load('lib/radar');
const tokens=trackedTokens(),t=tokens.at(-1),now=new Date('2030-01-01T12:00:00Z');
const iso=now.toISOString(),registry='https://www.stonkfun.xyz/api/public/v1/pairs';
const source={source:registry,fetchedAt:iso,providerGeneratedAt:iso,revision:'sha256:'+'a'.repeat(64)};
// All fixtures below are explicitly synthetic test packets, never application records/screenshots.
function fixture() {
 const p={...source,source:'https://www.stonkfun.xyz/api/public/v1/tokens?sort=marketCap&page=1&pageSize=25'};
 const token={mint:t.mint,name:'Synthetic test token',symbol:'🧪',poolMint:t.poolMint,quoteMint:t.quoteMint,quoteSymbol:t.quoteSymbol,
  source:p.source,verifiedAt:iso,provenance:p,mode:'reward',rewardModeVerified:true,modeVerification:'verified_reward',
  rewardSource:{...source,source:'https://www.stonkfun.xyz/api/v2/tokens/'+t.mint+'/rewards'},observationCount:null,lastObservedAt:null,
  historyStatus:'not_tracked',historyFreshness:'unavailable',historyIssues:[],market:{status:'reported_snapshot',unit:'USD',priceUsd:0,liquidityUsd:null,volume24hUsd:12,observedAt:null,providerGeneratedAt:iso},
  comparisonStatus:'unavailable',comparisons:{quoteRelativePriceReturn:null,quoteAssetBenchmarkReturn:null,holderAttributedReward:null,reason:'missing_synchronized_price_history_and_holder_entitlement'}};
 return {schemaVersion:1,status:'available',groups:[{quoteMint:t.quoteMint,quoteSymbol:t.quoteSymbol,quoteName:'Synthetic quote',decimals:8,tokenProgram:'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',symbolAmbiguous:true,source:registry,verifiedAt:iso,provenance:structuredClone(source),verification:'official_registry_catalog_match',availability:'tokens_in_bounded_sample',tokens:[token]}],
 dataset:{sourceStatus:'available',fetchedAt:iso,dataFetchedAt:iso,scope:'bounded_official_catalog',
 coverage:{complete:false,atomic:false,registryCount:587,pagesFetched:2,pageLimit:2,pageSize:25,recordsReceived:50,tokensReturned:1,rejectedRecords:0,providerReportedTotal:178031,modeChecks:12,modeCheckLimit:12,historyScope:'tracked_sample',warnings:['bounded_catalog']},
 sources:[structuredClone(source),p],history:{sourceStatus:'available',source:'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json',revision:'sha256:'+'b'.repeat(64),dataFetchedAt:iso}}};
}
const dataset={kind:'github_snapshot',sourceStatus:'available',source:'https://example.invalid/synthetic',dataFetchedAt:iso,revision:'synthetic-test-only'};
const radar=summarizeRadar({},tokens,dataset,'name',now);
const render=(token,report=null,blocked=false)=>renderToStaticMarkup(React.createElement(PairTokenRow,{token,report,blocked}));
test('canonical object coverage/null history and valid Unicode/long names survive without invention',()=>{
 const f=fixture();f.groups[0].tokens[0].name='Synthetic '+ 'n'.repeat(100);
 const c=parseCatalog(f),g=fromCatalog(c);assert.equal(g[0].tokens[0].symbol,'🧪');assert.equal(g[0].tokens[0].name.length,110);
 assert.equal(g[0].tokens[0].observationCount,null);assert.equal(g[0].tokens[0].lastObservedAt,null);assert.equal(g[0].tokens[0].radar,null);
 assert.equal(c.dataset.coverage.complete,false);assert.equal(g[0].symbolAmbiguous,true);
 const html=render(g[0].tokens[0]);for(const term of ['US$0','Unavailable','Reported USD snapshot','Price observation time','Historical quote-relative return','Quote-asset benchmark return','Holder-attributable rewards'])assert.ok(html.includes(term),term);
 assert.ok(!html.includes('live price'));assert.equal(usd(null),'Unavailable');assert.equal(usd(1e-12),'US$1.000e-12');
});
test('forged/mixed/duplicate identities, arbitrary sources, false complete coverage and inferred returns fail closed',()=>{
 const mutations=[
  f=>f.groups[0].tokens[0].quoteMint=tokens[0].quoteMint,f=>f.groups[0].tokens[0].quoteSymbol='FORGED',
  f=>f.groups.push(structuredClone(f.groups[0])),f=>f.groups[0].tokens.push(structuredClone(f.groups[0].tokens[0])),
  f=>f.groups[0].provenance.source='https://evil.invalid/api',f=>f.groups[0].source='javascript:alert(1)',
  f=>f.dataset.coverage.complete=true,f=>f.dataset.coverage='not exhaustive',
  f=>f.groups[0].tokens[0].rewardModeVerified=false,f=>f.groups[0].tokens[0].comparisons.holderAttributedReward=1,
  f=>f.groups[0].tokens[0].market.unit='NVDAX',f=>f.groups[0].tokens[0].market.priceUsd='0',
  f=>f.groups[0].tokens[0].lastObservedAt='2030-02-30T12:00:00Z',f=>f.groups[0].tokens[0].name='\u0000'
 ];
 for(const mutation of mutations){const f=fixture();mutation(f);assert.throws(()=>parseCatalog(f),/Invalid catalog/);}
});
test('same-symbol quotes remain exact-mint groups and empty registry sample is not ecosystem absence',()=>{
 const f=fixture(),g=structuredClone(f.groups[0]);g.quoteMint=tokens[0].quoteMint;g.tokens=[];g.verification='official_registry_only';g.availability='no_tokens_in_bounded_sample';
 f.groups.push(g);const groups=fromCatalog(parseCatalog(f));assert.equal(groups.length,2);assert.ok(groups.every(x=>x.quoteSymbol==='NVDAX'));
 assert.equal(groups.find(x=>x.quoteMint===g.quoteMint).tokens.length,0);assert.equal(searchPairs(groups,'synthetic quote').length,2);
 assert.equal(searchPairs(groups,t.mint).length,1);assert.equal(visibleTokens(groups.find(g=>g.tokens.length),'absent').length,0);
});
test('503/degraded source, null market/history and unverified mode never become zero or healthy ROI',async()=>{
 const f=fixture();f.status='degraded';f.dataset.sourceStatus='degraded';const token=f.groups[0].tokens[0];
 token.rewardModeVerified=false;token.modeVerification='source_unavailable';token.rewardSource=null;token.historyStatus='source_unavailable';
 token.market={...token.market,status:'unavailable',priceUsd:null,liquidityUsd:null,volume24hUsd:null};
 const html=render(fromCatalog(parseCatalog(f))[0].tokens[0]);
 assert.ok(html.includes('Reward mode unverified'));assert.ok(html.includes('Market snapshot unavailable'));assert.ok(!html.includes('US$0'));assert.ok(html.includes('Observation unavailable'));
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({error:'synthetic-private-error'},{status:503});
 try {assert.deepEqual(await fetchCatalog(new AbortController().signal),{status:'unavailable'});}finally{globalThis.fetch=original;}
});
test('typed client uses same-origin exact mint, rejects forged response and handles 404 without upstream error leakage',async()=>{
 const original=globalThis.fetch,calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json(fixture());};
 try {
  const r=await fetchCatalog(new AbortController().signal,t.quoteMint);assert.equal(r.status,'ready');
  assert.equal(calls[0].url,'/api/pairs?quoteMint='+t.quoteMint);assert.equal(calls[0].options.cache,'no-store');
  await assert.rejects(fetchCatalog(new AbortController().signal,'not-a-mint'));
  globalThis.fetch=async()=>Response.json(fixture(),{status:404});assert.equal((await fetchCatalog(new AbortController().signal,t.quoteMint)).status,'not_found');
  const f=fixture();f.groups[0].tokens[0].quoteSymbol='FAKE';globalThis.fetch=async()=>Response.json(f);await assert.rejects(fetchCatalog(new AbortController().signal),/Invalid catalog/);
 }finally{globalThis.fetch=original;}
});
test('Radar joins current verified mode only for allowlisted exact mint/quote/symbol/pool/source',()=>{
 const f=fixture(),ct=f.groups[0].tokens[0];ct.name=t.name;ct.symbol=t.symbol;ct.historyStatus='recorded';ct.historyFreshness='fresh';
 let token=fromCatalog(parseCatalog(f),radar,tokens)[0].tokens[0];assert.ok(token.radar);
 for(const mutation of [r=>r.quoteMint=tokens[0].quoteMint,r=>r.poolMint=tokens[0].poolMint,r=>r.source='https://evil.invalid']) {
  const forged=structuredClone(radar);mutation(forged.rows.find(r=>r.mint===t.mint));assert.equal(fromCatalog(f,forged,tokens)[0].tokens[0].radar,null);
 }
 ct.rewardModeVerified=false;ct.modeVerification='catalog_only';ct.rewardSource=null;assert.equal(fromCatalog(parseCatalog(f),radar,tokens)[0].tokens[0].radar,null);
});
test('tracked fallback stays a distinct dated sample, preserves exact identities, and contains no catalog market snapshots',()=>{
 const groups=fromTracked(tokens,null);assert.equal(groups.length,6);assert.equal(groups.flatMap(g=>g.tokens).length,7);
 assert.deepEqual(groups.find(g=>g.quoteSymbol==='ZEC').tokens.map(t=>t.symbol),['MASK','ZCAT']);
 assert.ok(groups.every(g=>g.tokens.every(t=>t.radar===null && t.catalog===null && t.observationCount===null)));
 const html=renderToStaticMarkup(React.createElement(Explorer,{tokens}));for(const term of ['Choose your pair.','Compare the evidence.','Catalog loading','tracked sample','Historical return','holder entitlement unavailable'])assert.ok(html.includes(term),term);
 assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);assert.ok(!/<details[^>]*\bopen/.test(html));
});
test('existing matched/point/zero gates remain authoritative; reset/stale/degraded/identity/gap failures withhold flows',()=>{
 const point=(hours,total,extra={})=>({observedAt:new Date(now.getTime()+hours*3600000).toISOString(),distributedTokens:total,quoteMint:t.quoteMint,quoteSymbol:t.quoteSymbol,source:t.source,...extra});
 const make=(points,status='available')=>summarizeRadar({[t.mint]:points},tokens,{...dataset,sourceStatus:status},'name',now);
 const output=report=>render(fromTracked(tokens,report).find(g=>g.quoteMint===t.quoteMint).tokens[0],report);
 const matched=output(make(Array.from({length:49},(_,i)=>point(i-48,i))));assert.ok(matched.includes('24 NVDAX'));assert.ok(matched.includes('Current matched period'));assert.ok(matched.includes('Actual interval:'));
 for(const report of [make([point(-1,2),point(0,1)]),make([point(-5,1),point(-4,2)]),make([point(-1,1),point(0,2)],'degraded'),make([point(-1,1),point(0,2,{quoteMint:tokens[0].quoteMint})]),make([point(-8,1),point(0,2)])])assert.ok(!output(report).includes('Distributed counter change'));
 assert.ok(output(make([point(-1,1),point(0,1)])).includes('0 NVDAX'));
 const blocked=render(fromTracked(tokens,make([point(-1,1),point(0,2)])).find(g=>g.quoteMint===t.quoteMint).tokens[0],make([point(-1,1),point(0,2)]),true);assert.ok(!blocked.includes('Distributed counter change'));assert.ok(!blocked.includes('US$'));
});

test('optional #43 evidence enables exact scoped query only with verified scope; legacy API never receives opt-in flags',async()=>{
 const f=fixture();assert.equal(discoveryEvidence(parseCatalog(f)),null);
 f.dataset.coverage.discovery={strategy:'provider_quote_mint',quoteMint:t.quoteMint,providerReportedTotalScope:'quote_mint'};
 const page=f.dataset.sources.find(p=>p.source.includes('/v1/tokens'));
 page.source+='&quoteMint='+t.quoteMint;f.groups[0].tokens[0].source=page.source;
 f.dataset.sources.push({...page,source:page.source.replace('page=1','page=2')});
 assert.equal(discoveryEvidence(parseCatalog(f)).quoteMint,t.quoteMint);
 const original=globalThis.fetch,calls=[];globalThis.fetch=async(url)=>{calls.push(url);return Response.json(f);};
 try {
  assert.equal((await fetchCatalog(new AbortController().signal,t.quoteMint,true)).status,'ready');
  assert.equal(calls[0],'/api/pairs?quoteMint='+t.quoteMint+'&discovery=pair');
  delete f.dataset.coverage.discovery;await assert.rejects(fetchCatalog(new AbortController().signal,t.quoteMint,true),/Unverified discovery scope/);
  f.dataset.coverage.discovery={strategy:'provider_quote_mint',quoteMint:tokens[0].quoteMint,providerReportedTotalScope:'quote_mint'};
  assert.throws(()=>parseCatalog(f),/Invalid catalog/);
 }finally{globalThis.fetch=original;}
});

function scopedFixture() {
 const f=fixture(),page=f.dataset.sources.find(p=>p.source.includes('/v1/tokens'));
 page.source+='&quoteMint='+t.quoteMint;f.groups[0].tokens[0].source=page.source;
 f.dataset.sources.push({...page,source:page.source.replace('page=1','page=2')});
 f.dataset.coverage.discovery={strategy:'provider_quote_mint',quoteMint:t.quoteMint,providerReportedTotalScope:'quote_mint'};
 return f;
}
test('scoped counts/search replace global rows without ticker joins and retain separately verified quotes',()=>{
 const global=fromCatalog(parseCatalog(fixture())),f=scopedFixture(),extra=structuredClone(f.groups[0].tokens[0]);
 extra.mint=tokens[0].mint;extra.rewardModeVerified=false;extra.modeVerification='catalog_only';extra.rewardSource=null;extra.symbol='SYNTHETIC-EXTRA';extra.name='Synthetic wider scoped token';
 f.groups[0].tokens.push(extra);f.dataset.coverage.tokensReturned=2;
 const merged=mergePairGroups(global,[fromCatalog(parseCatalog(f))]);
 assert.equal(merged[0].tokens.length,2);assert.equal(searchPairs(merged,'SYNTHETIC-EXTRA').length,1);
 const other=structuredClone(global[0]);other.quoteMint=tokens[0].quoteMint;other.tokens=[];
 const distinct=mergePairGroups(merged,[[other]]);assert.equal(distinct.length,2);assert.equal(distinct[0].quoteSymbol,distinct[1].quoteSymbol);
});
test('scope proof rejects global mint claims, mixed upstream queries, missing pages and substituted token provenance',()=>{
 const mutations=[f=>f.dataset.coverage.discovery.quoteMint=tokens[0].quoteMint,
  f=>f.dataset.coverage.discovery.providerReportedTotalScope='catalog',
  f=>f.dataset.sources.pop(),f=>f.dataset.sources[1].source=f.dataset.sources[1].source.replace(t.quoteMint,tokens[0].quoteMint),
  f=>f.groups[0].tokens[0].source=f.groups[0].tokens[0].provenance.source=f.groups[0].tokens[0].source.split('&quoteMint=')[0]];
 for(const mutate of mutations){const f=scopedFixture();mutate(f);assert.throws(()=>parseCatalog(f),/Invalid catalog/);}
 const global=fixture();global.dataset.coverage.discovery={strategy:'global_sample',quoteMint:t.quoteMint,providerReportedTotalScope:'catalog'};
 assert.throws(()=>parseCatalog(global),/Invalid catalog/);
});
test('one-page and empty scoped results retain false complete/atomic gates; valid scope cannot masquerade as global',async()=>{
 const f=scopedFixture();f.dataset.sources.pop();f.dataset.coverage.pagesFetched=1;
 f.groups[0].tokens=[];f.groups[0].availability='no_tokens_in_bounded_sample';f.groups[0].verification='official_registry_only';f.dataset.coverage.tokensReturned=0;f.dataset.coverage.providerReportedTotal=0;
 const c=parseCatalog(f);assert.equal(c.dataset.coverage.complete,false);assert.equal(c.dataset.coverage.atomic,false);
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json(f);
 try {assert.equal((await fetchCatalog(new AbortController().signal,t.quoteMint,true)).status,'ready');await assert.rejects(fetchCatalog(new AbortController().signal),/Invalid global discovery scope/);}finally{globalThis.fetch=original;}
});
test('429 and 503 scoped reads fail closed with no automatic retry or upstream message exposure',async()=>{
 const original=globalThis.fetch;let calls=0;
 try {for(const status of [429,503]){globalThis.fetch=async()=>{calls++;return Response.json({error:'synthetic-upstream-message'},{status,headers:{'retry-after':'3600'}});};
 assert.deepEqual(await fetchCatalog(new AbortController().signal,t.quoteMint,true),{status:'unavailable'});}
 assert.equal(calls,2);}finally{globalThis.fetch=original;}
});
