import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import path from 'node:path';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {catalog,market,series,CARDS,MINT,OTHER,POOL,AT,START,source} from './fixtures.mjs';
const require=createRequire(import.meta.url),load=p=>require(path.join(process.env.CARDS_TEST_BUILD,p+'.js'));
const {cardsReport,watchReport,watchInput,watchPath,filterPairs,sourceAge}=load('app/consumer/cards/model');
const {analyzeSeries,compareObserved}=load('app/consumer/cards/performance');
const {default:Research}=load('app/consumer/cards/research');
test('exact registry identity and provider-scoped sources are required, never a CARDS ticker match',()=>{
 const good=catalog();assert.equal(cardsReport(good).rows.length,1);
 for(const change of [c=>c.groups[0].quoteMint=OTHER,c=>c.groups[0].quoteName='Impostor',c=>c.groups[0].decimals=9,c=>c.groups[0].tokenProgram=OTHER,c=>c.dataset.coverage.discovery.strategy='global_sample',c=>c.dataset.sources.shift(),c=>c.dataset.sources[1].revision='sha256:'+'d'.repeat(64),c=>c.dataset.coverage.complete=true,c=>c.dataset.coverage.atomic=true]){const x=structuredClone(good);change(x);assert.throws(()=>cardsReport(x));}
});
test('projection withholds all quantities and optional reward payloads, preserves incomplete scope and real clocks',()=>{
 const r=cardsReport(catalog());assert.equal(r.ranking,'insufficient_evidence');assert.equal(r.financialPublication,'withheld');assert.equal(r.priceObservationCount,0);assert.equal(r.reportedTotal,2145);assert.equal(r.retrievedAt,AT);assert.equal(r.rows[0].rewardObservations,null);assert.equal(r.rows[0].mode,'reward');
 const s=JSON.stringify(r);for(const key of ['priceUsd','liquidityUsd','volume24hUsd','marketCap','rewardEvidence','999999','DO NOT FORWARD'])assert.ok(!s.includes('"'+key+'":'),key);
});
test('empty sample is not exhausted universe; unchecked, standard and dated mode remain distinct',()=>{
 assert.equal(cardsReport(catalog({empty:true})).rows.length,0);assert.equal(cardsReport(catalog({mode:'catalog_only'})).rows[0].mode,'unverified');assert.equal(cardsReport(catalog({mode:'verified_standard'})).rows[0].mode,'standard');
 assert.equal(sourceAge(source(),Date.parse(AT)+300000),'recent_response');assert.equal(sourceAge(source(),Date.parse(AT)+300001),'dated_response');assert.equal(sourceAge(source(),Date.parse(AT)-1001),'invalid_clock');
});
test('sample search preserves case-sensitive exact mint, disambiguates duplicate tickers and never calls a provider',()=>{
 const a=cardsReport(catalog()).rows[0],b={...a,mint:OTHER,name:'Another token'};assert.deepEqual(filterPairs([a,b],MINT),[a]);assert.equal(filterPairs([a,b],'offline').length,2);assert.equal(filterPairs([a,b],'no match').length,0);assert.equal(filterPairs([a,b],MINT.toLowerCase()).length,0);
});
test('watch original mint is never trimmed/extracted/enrolled; link has no automatic token recommendation',()=>{
 assert.equal(watchInput(MINT),MINT);for(const v of [' '+MINT,MINT+' ','CARDS','https://x/'+MINT,['a'],null])assert.equal(watchInput(v),null);assert.equal(watchPath(MINT),'/research/watch?mint='+MINT);assert.throws(()=>watchPath('CARDS'));
 const html=renderToStaticMarkup(React.createElement(Research,{}));assert.match(html,/not established yet/);assert.match(html,/No comparable price history/);assert.match(html,/No saved watchlist/);assert.ok(!html.includes(MINT));assert.ok(!html.includes('value="'+OTHER+'"'));assert.ok(!html.includes('helius-rpc'));
});
test('watch projects exact base identity only; quote-side cap, change and labels never leak',()=>{
 const r=watchReport(market(),MINT);assert.equal(r.state,'matched');assert.equal(r.marketObservationAt,null);assert.equal(r.financialPublication,'withheld');for(const k of ['priceUsd','marketCap','change24h','volume24h','liquidityUsd','pairUrl'])assert.ok(!(k in r));
 const q=watchReport(market({base:{address:OTHER,name:'Other asset',symbol:'WRONG'},quote:{address:MINT,symbol:'OFFLINE'}}),MINT);assert.equal(q.state,'quote_side');assert.equal(q.name,null);assert.equal(q.symbol,null);
 for(const x of [market({mint:OTHER}),market({pairAddress:'bad'}),market({fetchedAt:'2026-02-31T18:00:00.000Z'}),market({source:'fake'}),market({base:{address:OTHER,name:'x',symbol:'x'}})])assert.throws(()=>watchReport(x,MINT));
 assert.equal(watchReport(market({found:false}),MINT).state,'not_found');
});
test('exact 24h quote-unit arithmetic, observed peak and sampled drawdown never mean holder return or ATH',()=>{
 const r=analyzeSeries(series(),START,AT,AT);assert.equal(r.state,'observed');assert.equal(r.appreciationPct,'48.000000');assert.equal(r.observedPeakPriceQuote,'148');assert.equal(r.drawdownFromObservedPeakPct,'0.000000');assert.equal(r.momentum,'sustained_expansion');assert.equal(r.publication,'withheld_pending_rights_review');assert.equal(r.interpretation,'sampled_price_change_not_trading_return');
 const tiny=series(Array.from({length:25},(_,i)=>i===24?'0.000000000000000002':'0.000000000000000001'));assert.equal(analyzeSeries(tiny,START,AT,AT).appreciationPct,'100.000000');
});
test('missing/zero/unsafe/future/unordered/duplicate/gapped data never become comparable changes',()=>{
 assert.equal(analyzeSeries({...series(),points:[]},START,AT,AT).reason,'missing_price_history');
 const changes=[s=>s.points[1].priceQuote='0',s=>s.points[1].priceQuote='1e-5',s=>s.points[1].priceQuote='0.0000000000000000001',s=>s.points[1].kind='reported_snapshot',s=>s.points[1].revision='fake',s=>s.points[1].source='https://different.invalid/data',s=>s.points[1].observedAt=s.points[0].observedAt,s=>s.points[0].observedAt=new Date(Date.parse(START)+1).toISOString(),s=>s.points[13].observedAt=new Date(Date.parse(START)+13.9*3600000).toISOString()];
 for(const change of changes){const s=series();change(s);assert.equal(analyzeSeries(s,START,AT,AT).state,'withheld');}
 assert.equal(analyzeSeries(series(),START,AT,new Date(Date.parse(AT)+90*60000+1).toISOString()).reason,'stale_observations');assert.equal(analyzeSeries(series(),START,AT,START).reason,'invalid_period');
});
test('momentum thresholds are retrospective, require context, and distinguish no pattern from missing evidence',()=>{
 const run=prices=>analyzeSeries(series(prices),START,AT,AT);
 assert.equal(run(Array.from({length:25},(_,i)=>i<=12?'100':String(100+(i-12)*2))).momentum,'early_emerging');
 assert.equal(run(Array.from({length:25},(_,i)=>i<=12?String(100+i*2):'124')).momentum,'consolidation');
 assert.equal(run(Array.from({length:25},(_,i)=>i<=12?String(100+i*2):String(124-(i-12)*3))).momentum,'weakening');
 assert.equal(run(Array(25).fill('100')).momentum,'no_clear_pattern');
 const s=series();s.points[0].volume24hUsd=null;const r=analyzeSeries(s,START,AT,AT);assert.equal(r.state,'observed');assert.equal(r.momentum,'insufficient_evidence');assert.equal(r.momentumReason,'momentum_context_missing');
});
test('a sampled temporary spike cannot become sustained momentum or a true ATH',()=>{
 const prices=Array(25).fill('100');prices[6]='300';const r=analyzeSeries(series(prices),START,AT,AT);assert.equal(r.state,'observed');assert.equal(r.observedPeakPriceQuote,'300');assert.equal(r.drawdownFromObservedPeakPct,'-66.666666');assert.equal(r.momentum,'no_clear_pattern');assert.ok(!('ath' in r));
});
test('all candidates must share exact quote and aligned passing window; ties do not fabricate relative leaders',()=>{
 const a=series(),b={...series(),mint:OTHER,poolMint:'6CvFE14WUwKkQv1WchdPmbde6Urq7EWofaJcE8ZVUVBZ'};let r=compareObserved([a,b],CARDS,START,AT,AT);assert.equal(r.state,'observed_sample');assert.equal(r.complete,false);assert.deepEqual(r.rows.map(r=>r.rank),[1,1]);assert.equal(r.publication,'withheld_pending_rights_review');assert.equal(compareObserved([{...a,quoteMint:OTHER},{...b,quoteMint:OTHER}],OTHER,START,AT,AT).state,'withheld');
 for(const candidates of [[a,a],[a,{...b,quoteMint:OTHER}],[a,{...b,points:[]}],[a,{...b,poolMint:POOL}]])assert.equal(compareObserved(candidates,CARDS,START,AT,AT).state,'withheld');
});
