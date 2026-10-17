import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync,writeFileSync} from 'node:fs';
import {rewardUiFixture,rewardUiScenarios} from './reward-evidence-ui-fixtures.mjs';
const load=async file=>(await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,file+'.js')).href)).default;
const {parseCatalog,fromCatalog,fromTracked,discoveryEvidence,mergePairGroups,searchPairs,visibleTokens}=await load('app/pairs/adapter');
const {default:Explorer,PairTokenRow,RewardEvidenceKey,TokenIdentityMark,usd}=await load('app/pairs/explorer');
const {sortSample,marketValue,screenUsd,DEFAULT_SAMPLE_SORT,tokenResearchPath,tokenResearchUrl,readRewardEvidence}=await load('app/pairs/results');
const {fetchCatalog,fetchQuoteRegistry}=await load('app/pairs/client');
const {parseRegistry,registrySearch,appendRegistryPage,catalogMatchesQuote}=await load('app/pairs/registry');
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
 const html=renderToStaticMarkup(React.createElement(Explorer,{tokens}));for(const term of ['Memecoin research, by quote asset.','Search quote assets','Name, ticker or exact mint','Reading verified registry'])assert.ok(html.includes(term),term);
 assert.equal((html.match(/aria-pressed="true"/g)||[]).length,0);assert.ok(!html.includes('Reported USD snapshot'));assert.ok(!/<details[^>]*\bopen/.test(html));
});
test('existing matched/point/zero gates remain authoritative; reset/stale/degraded/identity/gap failures withhold flows',()=>{
 const point=(hours,total,extra={})=>({observedAt:new Date(now.getTime()+hours*3600000).toISOString(),distributedTokens:total,quoteMint:t.quoteMint,quoteSymbol:t.quoteSymbol,source:t.source,...extra});
 const make=(points,status='available')=>summarizeRadar({[t.mint]:points},tokens,{...dataset,sourceStatus:status},'name',now);
 const output=report=>render(fromTracked(tokens,report).find(g=>g.quoteMint===t.quoteMint).tokens[0],report);
 const primary=html=>html.match(/<span class="pair-row-state"[^>]*>([^<]*)/)[1];
 const matched=output(make(Array.from({length:49},(_,i)=>point(i-48,i))));assert.ok(matched.includes('24 NVDAX'));assert.ok(matched.includes('Current matched period'));assert.ok(matched.includes('Actual interval:'));assert.equal(primary(matched),'Settings verified');assert.ok(matched.includes('Legacy recorded counter change'));
 for(const report of [make([point(-1,2),point(0,1)]),make([point(-5,1),point(-4,2)]),make([point(-1,1),point(0,2)],'degraded'),make([point(-1,1),point(0,2,{quoteMint:tokens[0].quoteMint})]),make([point(-8,1),point(0,2)])]){assert.ok(!output(report).includes('Distributed counter change'));assert.notEqual(primary(output(report)),'Interval covered');}
 const zero=output(make([point(-1,1),point(0,1)]));assert.ok(zero.includes('0 NVDAX'));assert.equal(primary(zero),'Settings verified');
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

// Frontend-only synthetic canonical packets; never application data or screenshots.
function quoteFixture({query='',mint=null,offset=0,limit=12}={}) {
 const all=[
  {quoteMint:tokens[0].mint,quoteSymbol:'STONK',quoteName:'Synthetic first'},
  {quoteMint:tokens[1].mint,quoteSymbol:'stonk',quoteName:'Synthetic second'},
  {quoteMint:tokens[2].mint,quoteSymbol:'熊猫',quoteName:'Synthetic モモ太'},
 ].map(q=>({...q,decimals:9,tokenProgram:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',symbolAmbiguous:q.quoteSymbol.toLowerCase()==='stonk',providerSymbolAmbiguous:q.quoteSymbol.toLowerCase()==='stonk',symbolMatchCount:q.quoteSymbol.toLowerCase()==='stonk'?2:1,verification:'official_registry_only',verifiedAt:iso}));
 const matched=all.filter(q=>mint?q.quoteMint===mint:[q.quoteSymbol,q.quoteName].some(v=>v.normalize('NFKC').toLowerCase().includes(query)));
 const quotes=matched.slice(offset,offset+limit);
 return {schemaVersion:1,status:mint&&!matched.length?'not_found':'available',search:{query,mint,offset,limit},quotes,dataset:{sourceStatus:'available',fetchedAt:iso,dataFetchedAt:iso,scope:'official_quote_registry',provenance:structuredClone(source),coverage:{registryResponse:'validated_unpaginated',registryCount:all.length,matchedCount:matched.length,returnedCount:quotes.length,responseLimit:limit,nextOffset:offset+quotes.length<matched.length?offset+quotes.length:null,resultTruncated:quotes.length<matched.length,providerAmbiguousSymbolCount:1,tokenCatalogComplete:false}}};
}
test('registry search normalizes Unicode/name/ticker but preserves exact original mint case; client always encodes parameters',async()=>{
 assert.equal(registrySearch('  ＳＴＯＮＫ ').query,'stonk');assert.equal(registrySearch('モモ太').query,'モモ太');
 assert.deepEqual(registrySearch(tokens[0].mint),{query:'',mint:tokens[0].mint,offset:0,limit:12});
 for(const value of ['a'.repeat(65),'\u0000','\ud800','ﷺ'.repeat(64)])assert.throws(()=>registrySearch(value));
 const original=globalThis.fetch,calls=[];globalThis.fetch=async(url)=>{calls.push(url);return Response.json(quoteFixture({mint:tokens[0].mint}));};
 try {const r=await fetchQuoteRegistry(new AbortController().signal,tokens[0].mint);assert.equal(r.quotes[0].quoteMint,tokens[0].mint);
 const u=new URL(calls[0],'http://localhost');assert.equal(u.pathname,'/api/pair-quotes');assert.equal(u.searchParams.get('mint'),tokens[0].mint);assert.ok(!u.searchParams.has('query'));assert.equal(calls.length,1);
 }finally{globalThis.fetch=original;}
});
test('verified registry is independent of token catalog and keeps identical/case/Unicode tickers separate',()=>{
 const r=parseRegistry(quoteFixture({query:'stonk'}));assert.equal(r.quotes.length,2);assert.notEqual(r.quotes[0].quoteMint,r.quotes[1].quoteMint);
 assert.ok(r.quotes.every(q=>q.symbolAmbiguous && q.symbolMatchCount===2));assert.equal(r.dataset.coverage.tokenCatalogComplete,false);
 assert.equal(parseRegistry(quoteFixture({query:'モモ太'})).quotes[0].quoteSymbol,'熊猫');
 assert.equal(parseRegistry(quoteFixture({query:'synthetic first'})).quotes.length,1);
 assert.equal(parseRegistry(quoteFixture({query:'no matching asset'})).dataset.coverage.matchedCount,0);
});
test('registry forgery, wrong scope/counts/ambiguity/units of identity, duplicate mints and invalid provenance fail closed',()=>{
 const changes=[f=>f.dataset.coverage.tokenCatalogComplete=true,f=>f.dataset.coverage.registryCount=null,f=>f.dataset.provenance.source='https://evil.invalid',f=>f.quotes[0].verification='verified_reward',f=>f.quotes[0].symbolAmbiguous=false,f=>f.quotes[1].quoteMint=f.quotes[0].quoteMint,f=>f.dataset.coverage.matchedCount=999,f=>f.dataset.coverage.nextOffset=12];
 for(const change of changes){const f=quoteFixture();change(f);assert.throws(()=>parseRegistry(f),/Invalid registry/);}
});
test('registry pagination keeps snapshots separate and rejects refresh/repeated/forged windows',()=>{
 const a=parseRegistry(quoteFixture({limit:1})),b=parseRegistry(quoteFixture({limit:1,offset:1}));
 const pages=appendRegistryPage([a],b);assert.equal(pages.flatMap(p=>p.quotes).length,2);assert.equal(a.dataset.coverage.returnedCount,1);
 assert.throws(()=>appendRegistryPage([a],a),/Registry changed/);
 const changed=structuredClone(b);changed.dataset.provenance.revision='sha256:'+'c'.repeat(64);assert.throws(()=>appendRegistryPage([a],changed),/Registry changed/);
 const end=parseRegistry(quoteFixture({limit:1,offset:2}));assert.equal(end.dataset.coverage.nextOffset,null);assert.equal(end.dataset.coverage.resultTruncated,true);
});
test('registry 404 stays verified membership absence;429/503 never become healthy empty counts or automatic retries',async()=>{
 const original=globalThis.fetch;let calls=0;
 try {
  globalThis.fetch=async()=>{calls++;return Response.json(quoteFixture({mint:t.quoteMint}),{status:404});};
  assert.equal((await fetchQuoteRegistry(new AbortController().signal,t.quoteMint)).status,'not_found');
  for(const status of [429,503]){globalThis.fetch=async()=>{calls++;return Response.json({status:'unavailable',error:'synthetic-provider-detail'},{status});};await assert.rejects(fetchQuoteRegistry(new AbortController().signal,'STONK'));}
  assert.equal(calls,3);
  globalThis.fetch=async()=>Response.json(quoteFixture({query:'not-the-request'}));await assert.rejects(fetchQuoteRegistry(new AbortController().signal,'stonk'),/Invalid registry search/);
 }finally{globalThis.fetch=original;}
});
test('selected registry identity must match every catalog identity field before displaying token figures',()=>{
 const c=scopedFixture(),g=c.groups[0],q={quoteMint:g.quoteMint,quoteSymbol:g.quoteSymbol,quoteName:g.quoteName,decimals:g.decimals,tokenProgram:g.tokenProgram};
 assert.equal(catalogMatchesQuote(c,q),true);
 for(const key of ['quoteMint','quoteSymbol','quoteName','decimals','tokenProgram'])assert.equal(catalogMatchesQuote(c,{...q,[key]:key==='decimals'?3:'wrong'}),false);
});

test('Unicode text resembling a mint is sent literally instead of silently becoming a canonical mint alias',async()=>{
 const raw='１'.repeat(31)+'２',expected=registrySearch(raw);assert.equal(expected.mint,null);
 const original=globalThis.fetch;globalThis.fetch=async url=>{const params=new URL(url,'http://localhost').searchParams;assert.equal(params.get('query'),raw);assert.ok(!params.has('mint'));return Response.json(quoteFixture({query:expected.query}));};
 try {const result=await fetchQuoteRegistry(new AbortController().signal,raw);assert.equal(result.search.mint,null);assert.equal(result.dataset.coverage.matchedCount,0);}finally{globalThis.fetch=original;}
});

test('search-first landing has one labelled, keyboard-enabled universal combobox and no fixed pair universe',()=>{
 const html=renderToStaticMarkup(React.createElement(Explorer,{tokens}));
 assert.equal((html.match(/role="combobox"/g)||[]).length,1);
 assert.equal((html.match(/type="search"/g)||[]).length,1);
 for(const attribute of ['aria-expanded="false"','aria-autocomplete="list"','aria-controls="quote-options"','aria-keyshortcuts="Control+K Meta+K"','role="listbox"','aria-label="Verified quote assets"'])assert.ok(html.includes(attribute),attribute);
 for(const old of ['pair-featured','Featured reward assets','Choose NVDAX','Choose GLDX','Choose STONK','Choose SPCXX'])assert.ok(!html.includes(old),old);
 assert.ok(!html.includes('US$'));assert.ok(!html.includes('role="option"'));assert.ok(!html.includes('autofocus'));
 assert.ok(html.includes('Registry membership does not verify rewards or ownership'));
});
test('screener row retains zero and exceptional warnings; full identity/time/returns stay in controlled hidden evidence',()=>{
 const f=fixture();f.groups[0].tokens[0].market.liquidityUsd=0;
 let token=fromCatalog(parseCatalog(f))[0].tokens[0],html=render(token);
 const visible=html.split('<div class="pair-evidence-body"')[0],details=html.slice(html.indexOf('<div class="pair-evidence-body"'));
 assert.ok(visible.includes('$0'));assert.ok(visible.includes('$12'));assert.ok(visible.includes('Settings verified'));
 for(const hidden of [token.mint,token.quoteMint,iso,'Historical quote-relative return','Holder-attributable rewards']){
  assert.ok(!visible.replace(/<[^>]*>/g,'').includes(hidden),hidden);assert.ok(details.includes(hidden),hidden);
 }
 assert.equal((html.match(/aria-expanded="false"/g)||[]).length,1);assert.ok(details.includes('hidden=""'));assert.ok(details.includes('Open dossier'));
 assert.ok(visible.includes('aria-controls="pair-detail-'+token.mint+'"'));assert.ok(details.includes('id="pair-detail-'+token.mint+'"'));
 assert.ok(visible.includes('href="/terminal?mint='+token.mint+'"'));assert.ok(visible.includes('Open 🧪 · Synthetic test token dossier'));
 const ct=f.groups[0].tokens[0];ct.rewardModeVerified=false;ct.modeVerification='source_unavailable';ct.rewardSource=null;ct.historyStatus='invalid_data';ct.historyFreshness='stale';
 html=render(fromCatalog(parseCatalog(f))[0].tokens[0]).split('<div class="pair-evidence-body"')[0];
 assert.ok(html.includes('Invalid / stale'));assert.ok(html.includes('Unverified'));
 assert.ok(!html.includes('distributed'));
});

test('sample sorts keep exact quote identity, zero before unknown, name ties deterministic and input untouched',()=>{
 const base=fromCatalog(parseCatalog(fixture()))[0].tokens[0];
 const make=(mint,name,symbol,value)=>({...structuredClone(base),mint,name,symbol,catalog:{...structuredClone(base.catalog),market:{...base.catalog.market,liquidityUsd:value,volume24hUsd:value===null?null:20-value}}});
 const a=make('c','Alpha','Z',0),b=make('b','Beta','A',10),c=make('a','Alpha','Z',null),d=make('d','Alpha','Z',10);
 const other={...make('e','Other quote','X',999999),quoteMint:tokens[0].quoteMint};
 const input=[a,b,c,d,other],before=structuredClone(input);
 assert.deepEqual(sortSample(input,t.quoteMint,'name').map(t=>t.mint),['a','c','d','b']);
 assert.deepEqual(sortSample(input,t.quoteMint,'liquidity').map(t=>t.mint),['d','b','c','a']);
 assert.equal(DEFAULT_SAMPLE_SORT,'liquidity');assert.deepEqual(sortSample(input,t.quoteMint).map(t=>t.mint),['d','b','c','a']);
 assert.deepEqual(sortSample(input,t.quoteMint,'volume').map(t=>t.mint),['c','d','b','a']);
 assert.deepEqual(input,before);assert.deepEqual(sortSample(input,'another-exact-mint','liquidity'),[]);
 assert.equal(marketValue(a,'liquidity'),0);assert.equal(marketValue(c,'liquidity'),null);
 for(const bad of [NaN,Infinity,-1]){const token=make('f','Invalid','I',bad);assert.equal(marketValue(token,'liquidity'),null);}
 const absent=make('f','Absent','I',900);absent.catalog.market.status='unavailable';assert.equal(marketValue(absent,'liquidity'),null);
});

test('short evidence states distinguish catalog, mechanism and recorded activity without dropping exceptional gates',()=>{
 const f=fixture(),ct=f.groups[0].tokens[0];
 const visible=()=>render(fromCatalog(parseCatalog(f))[0].tokens[0]).split('<div class="pair-evidence-body"')[0];
 assert.ok(visible().includes('Settings verified'));assert.ok(!visible().includes('Interval covered'));
 ct.historyFreshness='stale';assert.ok(visible().includes('Stale history'));assert.ok(visible().includes('Settings verified'));
 ct.historyFreshness='unavailable';ct.historyStatus='invalid_data';assert.ok(visible().includes('Invalid history'));assert.ok(visible().includes('Settings verified'));
 ct.historyStatus='not_tracked';ct.rewardModeVerified=false;ct.modeVerification='source_unavailable';ct.rewardSource=null;
 assert.ok(visible().includes('Unverified'));
 ct.mode='standard';ct.modeVerification='verified_standard';ct.rewardSource={...source,source:'https://www.stonkfun.xyz/api/v2/tokens/'+t.mint+'/rewards'};
 assert.ok(visible().includes('No reward mode'));
 const html=render(fromCatalog(parseCatalog(f))[0].tokens[0]);assert.ok(html.includes('aria-label="Details for 🧪 · Synthetic test token"'));
 assert.ok(html.includes('aria-expanded="false"'));assert.ok(html.includes(ct.mint));assert.ok(html.includes(ct.source.replaceAll('&','&amp;')));
 ct.modeVerification='catalog_only';ct.rewardSource=null;assert.ok(visible().includes('Unverified'));
 ct.market={...ct.market,status:'unavailable',priceUsd:null,liquidityUsd:null,volume24hUsd:null};assert.ok(visible().includes('Unverified'));
 ct.modeVerification='identity_mismatch';assert.ok(visible().includes('Identity issue'));
});

test('scan USD formatting separates unknown and zero and never rounds a small positive to zero',()=>{
 assert.equal(screenUsd(null),'—');assert.equal(screenUsd(0),'$0');assert.equal(screenUsd(541630),'$541.6K');
 assert.equal(screenUsd(315.08),'$315.08');assert.equal(screenUsd(1e-12),'$1.00e-12');
 for(const v of [-1,Infinity,NaN])assert.equal(screenUsd(v),'—');
 for(const v of [0.00001,0.009,0.01,0.1])assert.notEqual(screenUsd(v),'$0');
});

test('one plain-language key separates official settings, counter flow and holder payments',()=>{
 const html=renderToStaticMarkup(React.createElement(RewardEvidenceKey));
 for(const phrase of ['Settings verified','Lifetime reported','Interval covered','Holder returns unavailable','none verifies paid holders or profit','Missing evidence is not zero','not a recent earning rate'])assert.ok(html.includes(phrase),phrase);
 assert.equal((html.match(/id="pair-reward-key"/g)||[]).length,1);assert.ok(!/<details[^>]*\bopen/.test(html));
});

test('research URLs use only the tested exact token dossier route and never encode a pair selection or snapshot',()=>{
 for(const token of tokens){
  assert.equal(tokenResearchPath(token.mint),'/terminal?mint='+token.mint);
  assert.equal(tokenResearchUrl(token.mint,'https://scout.storkcoin.xyz'),'https://scout.storkcoin.xyz/terminal?mint='+token.mint);
  const u=new URL(tokenResearchUrl(token.mint,'http://127.0.0.1:3160'));assert.equal(u.searchParams.get('mint'),token.mint);assert.deepEqual([...u.searchParams.keys()],['mint']);
 }
 for(const bad of ['NVDAX','/wrong?mint='+t.mint,''])assert.throws(()=>tokenResearchPath(bad));
 for(const bad of ['javascript:alert(1)','https://user:pass@example.test','https://example.test/path','https://example.test/?quoteMint='+t.quoteMint,'https://example.test/#snapshot'])assert.throws(()=>tokenResearchUrl(t.mint,bad));
});

test('generated mint marks are stable visual aids with no logo URLs, network assets or verification claim',()=>{
 const mark=mint=>renderToStaticMarkup(React.createElement(TokenIdentityMark,{mint}));
 assert.equal(mark(t.mint),mark(t.mint));assert.notEqual(mark(t.mint),mark(tokens[0].mint));
 assert.notEqual(mark(t.mint),mark(t.mint.toUpperCase()));
 const html=mark(t.mint);assert.ok(html.includes('aria-hidden="true"'));assert.ok(html.includes('data-identity-mark="generated"'));
 assert.ok(!/href=|<image|<img/.test(html));
 const key=renderToStaticMarkup(React.createElement(RewardEvidenceKey));assert.ok(key.includes('not official logos or proof of identity'));
});

const uiCases=await rewardUiScenarios();
const evidenceToken=c=>fromCatalog(parseCatalog(c),null,tokens)[0].tokens[0];
const evidenceRender=c=>renderToStaticMarkup(React.createElement(PairTokenRow,{token:evidenceToken(c),catalog:c,report:null}));
const primaryEvidence=html=>html.match(/<span class="pair-row-state"[^>]*>([^<]*)/)[1];
for(const [name,label] of Object.entries({covered:'Interval covered','covered-zero':'Interval covered',lifetime:'Lifetime reported',zero:'Lifetime reported',settings:'Settings verified',standard:'No reward mode','stale-lifetime':'Settings verified','stale-source':'Unverified','stale-evaluation':'Unverified','rate-limited':'Unverified','precise-lifetime':'Lifetime reported'}))test('optional merged reward evidence: '+name+' has an accurate compact state and unavailable holder returns',()=>{
 const c=uiCases[name].catalog,t=evidenceToken(c),read=readRewardEvidence(t,c);assert.equal(read.state,'ready',name);
 const html=evidenceRender(c);assert.equal(primaryEvidence(html),label);for(const term of ['Reported lifetime distribution','Covered interval flow','Holder returns','Unavailable','Token / quote mint',t.mint,t.quoteMint])assert.ok(html.includes(term),term);
 assert.ok(!html.includes('top earner'));assert.ok(!html.includes('Paid holders verified'));assert.ok(html.includes('aria-expanded="false"'));
 if(name==='covered'){assert.ok(html.includes('24.00000000 NVDAX'));assert.ok(html.includes('25 points'));assert.ok(html.includes('3600s'));assert.ok(html.includes('Provider boundaries'));assert.ok(html.includes('2030-01-02T00:00:00.000Z'));}
 if(name==='covered-zero'){assert.ok(html.includes('Current: 0.00000000 NVDAX'));assert.ok(html.includes('Previous: 0.00000000 NVDAX'));assert.equal(read.value.holderReturn.value,null);}
 if(name==='zero'){assert.ok(html.includes('0.00000000 NVDAX'));assert.ok(html.includes('Last reported payout: Not reported'));assert.ok(html.includes('recipients 0'));}
 if(name==='precise-lifetime')assert.ok(html.includes('119954640.83712182 NVDAX'));
 if(['lifetime','zero','precise-lifetime'].includes(name)){assert.ok(html.includes('Lifetime start and reconciliation cutoff unknown'));assert.equal(read.value.interval.value,null);assert.ok(!html.includes('24.00000000 NVDAX'));}
 if(name==='stale-source' || name==='stale-evaluation'){if(name==='stale-evaluation')assert.equal(t.rewardModeVerified,true);assert.equal(read.value.mechanism.quality,'stale');assert.ok(html.includes('Stale evidence'));assert.ok(!html.includes('Reward settings verified'));}
 if(name==='rate-limited'){assert.ok(html.includes('rate limited'));assert.ok(html.includes('lookup only, not read evidence'));}
});
test('older response compatibility retains dated settings and gated legacy observations without new financial evidence',()=>{
 const c=structuredClone(uiCases.covered.catalog);delete c.groups[0].tokens[0].rewardEvidence;
 const token=evidenceToken(c);assert.equal(readRewardEvidence(token,c).state,'absent');assert.equal(primaryEvidence(evidenceRender(c)),'Settings verified');
 assert.ok(evidenceRender(c).includes('Unavailable from this older response'));assert.ok(!evidenceRender(c).includes('100.00000000 NVDAX'));
});
for(const [name,change] of [
 ['different token mint',e=>e.tokenMint=tokens[0].mint],['same ticker different quote mint',e=>e.unit.mint=tokens[0].quoteMint],['wrong decimals',e=>e.unit.decimals=9],
 ['version',e=>e.schemaVersion=2],['future source',e=>e.mechanism.source.providerGeneratedAt='2031-01-01T00:00:00.000Z'],
 ['foreign mode source',e=>e.mechanism.source.source='https://evil.invalid/rewards'],['source lookup query injection',e=>e.mechanism.referenceUrl+='?key=bad'],
 ['source hash mismatch',e=>e.lifetime.source.revision='sha256:'+'f'.repeat(64)],['forged covered summary',e=>e.summary='mechanism_verified'],
 ['unknown as zero',e=>e.lifetime.value=null],['false current stale lifetime',e=>e.lifetime.quality='stale'],
 ['rounded exact amount',e=>e.lifetime.value.distributedTokens='100'],['negative lifetime',e=>e.lifetime.value.distributedRaw='-1'],
 ['unsafe payout count',e=>e.lifetime.value.payoutCount=Number.MAX_SAFE_INTEGER+1],['payout after source',e=>e.lifetime.value.lastPayoutAt='2031-01-01T00:00:00.000Z'],
 ['invented lifetime window',e=>e.lifetime.value.startAt='2029-01-01T00:00:00.000Z'],['ROI',e=>e.holderReturn.value=12],
 ['complete coverage',e=>e.scope.complete=true],['ticker universe',e=>e.scope.providerReportedUniverse=999999],['earning leader',e=>e.scope.ranking.ecosystemLeader=t.mint],
 ['missing covered interval',e=>e.interval.value=null],['one short interval',e=>e.interval.value.current.seconds=3600],
 ['changed interval quote',e=>e.interval.value.quoteMint=tokens[0].quoteMint],['disjoint windows',e=>e.interval.value.previous.endAt=e.interval.value.current.endAt],
 ['unsupported interval history revision',e=>e.interval.historySource.revision='sha256:'+'f'.repeat(64)],['gap exactly two hours',e=>e.interval.value.current.maxGapSeconds=7200],
 ['rounded interval amount',e=>e.interval.value.current.distributed.tokens='24'],['forged counter difference',e=>e.interval.value.change.atomic='1'],
])test('frontend optional evidence rejects '+name+' without a stronger legacy fallback',()=>{
 const c=structuredClone(uiCases.covered.catalog);c.groups[0].tokens[0].rewardEvidence=structuredClone(c.groups[0].tokens[0].rewardEvidence);change(c.groups[0].tokens[0].rewardEvidence);
 const token=evidenceToken(c);assert.equal(readRewardEvidence(token,c).state,'invalid');const html=evidenceRender(c);
 assert.equal(primaryEvidence(html),'Unverified');assert.ok(html.includes('Reward evidence failed validation'));assert.ok(!html.includes('100.00000000 NVDAX'));assert.ok(!html.includes('24.00000000 NVDAX'));
});
test('invalid/null optional evidence and missing catalog context do not crash or masquerade as legacy absence',()=>{
 for(const raw of [null,{},[],true,'untrusted']){const c=structuredClone(uiCases.covered.catalog);c.groups[0].tokens[0].rewardEvidence=raw;assert.equal(readRewardEvidence(evidenceToken(c),c).state,'invalid');}
 assert.equal(readRewardEvidence(evidenceToken(uiCases.covered.catalog)).state,'invalid');
});
test('partial lifetime evidence is usable for its token without promoting catalog coverage or interval claims',async()=>{
 const {catalog:c}=await rewardUiFixture(f=>{f.store={};f.rows.push({...f.rows[0],mint:tokens[0].mint});const original=f.fetcher;f.fetcher=async(...args)=>String(args[0]).includes('/api/v2/tokens/'+tokens[0].mint+'/')?new Response(null,{status:503}):original(...args);});
 const row=fromCatalog(parseCatalog(c),null,tokens)[0].tokens.find(v=>v.mint===uiCases.covered.catalog.groups[0].tokens[0].mint);
 const read=readRewardEvidence(row,c);assert.equal(read.state,'ready');assert.equal(read.value.lifetime.state,'reported');assert.equal(read.value.lifetime.quality,'partial');assert.equal(read.value.scope.complete,false);assert.equal(read.value.interval.value,null);
});
test('dated genuine #61 wire response replays supported lifetime strings without becoming a current fallback or covered interval',()=>{
 const recording=JSON.parse(readFileSync('docs/evidence/reward-integration-before.json','utf8'));
 const c=recording.captures[0].responses.find(p=>p.url.includes('/api/pairs?')).json;
 const rows=fromCatalog(parseCatalog(c),null,tokens);let reported=0;
 for(const row of rows.flatMap(g=>g.tokens)){
  const read=readRewardEvidence(row,c);assert.equal(read.state,'ready');assert.equal(read.value.evaluatedAt,c.dataset.fetchedAt);assert.equal(read.value.holderReturn.value,null);
  if(read.value.lifetime.state==='reported'){
   reported++;const html=renderToStaticMarkup(React.createElement(PairTokenRow,{token:row,catalog:c,report:null}));
   assert.equal(primaryEvidence(html),'Lifetime reported');assert.ok(html.includes(read.value.lifetime.value.distributedTokens+' '+row.quoteSymbol));assert.equal(read.value.interval.value,null);
  }
 }
 assert.ok(reported>0);assert.equal(c.dataset.coverage.complete,false);
});
if(process.env.SCOUT_REWARD_UI_FIXTURES){
 assert.ok(process.env.SCOUT_REWARD_UI_FIXTURES.startsWith('/tmp/'));writeFileSync(process.env.SCOUT_REWARD_UI_FIXTURES,JSON.stringify({kind:'synthetic_frontend_test_cases_never_screenshots',cases:uiCases})+'\n');
}

test('quick view keeps its three facts separate from initially folded exact audit evidence',()=>{
 for(const name of ['covered','lifetime','zero','settings','standard','rate-limited','stale-source']){
  const html=evidenceRender(uiCases[name].catalog),start=html.indexOf('<div class="pair-evidence-body"'),fold=html.indexOf('<details class="quick-technical"');
  assert.ok(fold>start);const brief=html.slice(start,fold),audit=html.slice(fold);
  assert.ok(brief.includes('Quick view'));assert.ok(brief.includes('Close quick view'));assert.ok(brief.includes('Open dossier'));assert.ok(brief.includes('Copy research link'));
  assert.equal((brief.match(/<dt>/g)||[]).length,2);assert.ok(!brief.includes('<time'));assert.ok(!brief.includes('Byte revision'));assert.ok(!brief.includes('Historical quote-relative return'));
  assert.ok(audit.startsWith('<details class="quick-technical"><summary>Technical evidence</summary>'));assert.ok(audit.includes('Reported lifetime distribution'));assert.ok(audit.includes('Token / quote mint'));assert.ok(audit.includes('Holder returns'));
  if(name==='stale-source')assert.ok(brief.includes('Stale evidence'));
 }
});

test('copy fallback is noneditable selectable text, never an input or autofocus target',async()=>{
 const {ResearchLinkFallback,CopyResearchLink}=await load('app/research-actions');
 const mint=tokens[0].mint,url=tokenResearchUrl(mint,'https://scout.example');
 const fallback=renderToStaticMarkup(React.createElement(ResearchLinkFallback,{url,label:'Research link for test'}));
 assert.ok(fallback.includes(url));assert.ok(fallback.includes('role="region"'));assert.ok(fallback.includes('tabindex="0"'));assert.ok(!/<input|<textarea|contenteditable|autofocus/i.test(fallback));
 const initial=renderToStaticMarkup(React.createElement(CopyResearchLink,{mint,label:'test'}));
 assert.ok(initial.includes('Copy research link'));assert.ok(!initial.includes('research-link-fallback'));assert.ok(!initial.includes('role="status"'));
});
