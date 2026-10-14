import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const load = async file => (await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,file+'.js')).href)).default;
const { fromTracked, fromCatalog, searchPairs } = await load('app/pairs/adapter');
const { default: Explorer, PairTokenRow } = await load('app/pairs/explorer');
const { trackedTokens } = await load('lib/tracked-tokens');
const { summarizeRadar } = await load('lib/radar');
const tokens = trackedTokens();
const now = new Date('2026-10-14T15:00:00Z');
const dataset = { sourceStatus:'available',source:'https://example.invalid/test-only',dataFetchedAt:now.toISOString(),revision:'synthetic-test-only' };
const radar = summarizeRadar({},tokens,dataset,'name',now);

test('tracked fallback groups only exact quote identities; ZEC contains two tokens', () => {
 const groups=fromTracked(tokens,null);
 assert.equal(groups.length,6);assert.equal(groups.flatMap(g=>g.tokens).length,7);
 assert.deepEqual(groups.find(g=>g.quoteSymbol==='ZEC').tokens.map(t=>t.symbol),['MASK','ZCAT']);
 assert.ok(groups.every(g=>g.tokens.every(t=>t.quoteMint===g.quoteMint && t.radar===null && t.observationCount===null)));
 assert.equal(fromTracked([],null).length,0);
});
test('search finds symbols, token names and full quote or token mints, without introducing pairs', () => {
 const groups=fromTracked(tokens,null);
 for(const term of ['  nvdax ','Super Inu',tokens.at(-1).mint,tokens.at(-1).quoteMint]) assert.equal(searchPairs(groups,term)[0].quoteSymbol,'NVDAX');
 assert.equal(searchPairs(groups,'GLDX').length,0);assert.equal(searchPairs(groups,'SPCXX').length,0);
 assert.equal(searchPairs(groups,'').length,6);
});
test('forged or mixed radar identity is ignored even when ticker matches; absent data is not zero', () => {
 const forged={...radar,rows:radar.rows.map(r=>({...r,quoteMint:tokens.find(t=>t.quoteMint!==r.quoteMint).quoteMint}))};
 assert.ok(fromTracked(tokens,forged).flatMap(g=>g.tokens).every(t=>t.radar===null));
 const groups=fromTracked(tokens,radar);
 assert.ok(groups.flatMap(g=>g.tokens).every(t=>t.radar && t.observationCount===0 && t.lastObservedAt===null));
});
test('future catalog drops mixed quote identities and duplicate tokens and never promotes comparisonStatus into metrics', () => {
 const t=tokens[0];
 const group={quoteMint:t.quoteMint,quoteSymbol:t.quoteSymbol,source:t.discoverySource,verifiedAt:t.verifiedAt,tokens:[{...t,rewardModeVerified:false,comparisonStatus:'available',observationCount:-1,lastObservedAt:'invalid'},{...t,rewardModeVerified:true},{...tokens[1],rewardModeVerified:true}]};
 const result=fromCatalog({groups:[group],dataset:{sourceStatus:'available',fetchedAt:now.toISOString(),scope:'tracked sample',coverage:'unknown'}});
 assert.equal(result[0].tokens.length,1);assert.equal(result[0].tokens[0].rewardModeVerified,false);
 assert.equal(result[0].tokens[0].observationCount,null);assert.equal(result[0].tokens[0].lastObservedAt,null);assert.equal(result[0].tokens[0].radar,null);
 assert.equal(fromCatalog({groups:[{...group,quoteMint:'FORGED'}],dataset:{}}).length,0);
});
test('first screen is pair-first on server render with verified sample identity and no fabricated market values', () => {
 const html=renderToStaticMarkup(React.createElement(Explorer,{tokens}));
 for(const term of ['Choose your pair.','Compare the evidence.','Limited sample','7 tracked tokens','6 quote assets','NVDAX','Quote mint','Liquidity','Pair return','Holder rewards','Unavailable','Reading recorded observations']) assert.ok(html.includes(term),term);
 assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
 assert.ok(html.includes(tokens.at(-1).quoteMint));assert.ok(html.includes('/?mint='+tokens.at(-1).mint));
 assert.ok(!/<details[^>]*\bopen/.test(html));assert.ok(!html.includes('flow-value'));
 assert.ok(!html.includes('GLDX'));assert.ok(!html.includes('SPCXX'));
});

test('synthetic matched evidence renders only backend-gated periods; reset/stale/failed/identity data withholds amounts', () => {
 const token=tokens.at(-1);
 const point=(hours,total,extra={})=>({observedAt:new Date(now.getTime()+hours*3600000).toISOString(),distributedTokens:total,quoteMint:token.quoteMint,quoteSymbol:token.quoteSymbol,source:token.source,...extra});
 const make=(points,status='available')=>summarizeRadar({[token.mint]:points},tokens,{...dataset,sourceStatus:status},'name',now);
 const output=report=>renderToStaticMarkup(React.createElement(PairTokenRow,{token:fromTracked(tokens,report).find(g=>g.quoteMint===token.quoteMint).tokens[0],report}));
 const matched=make(Array.from({length:49},(_,i)=>point(i-48,i)));
 const html=output(matched);
 assert.ok(html.includes('24 NVDAX'));assert.ok(html.includes('Backend matched-period gate passed'));
 assert.ok(html.includes('Current matched period'));assert.ok(html.includes('Previous matched period'));assert.ok(html.includes('Actual interval:'));
 assert.ok(html.includes(matched.rows.find(r=>r.mint===token.mint).signals.current.startAt));
 for(const report of [make([point(-1,2),point(0,1)]),make([point(-5,1),point(-4,2)]),make([point(-1,1),point(0,2)],'degraded'),make([point(-1,1),point(0,2,{quoteMint:tokens[0].quoteMint})]),make([point(-8,1),point(0,2)])]) {
  const out=output(report);
  assert.ok(!out.includes('Pool counter change'));assert.ok(!out.includes('Current matched period'));
  assert.ok(out.includes('Unavailable · matched-period gate not passed'));
 }
 const zero=output(make([point(-1,1),point(0,1)]));
 assert.ok(zero.includes('0 NVDAX'));assert.ok(zero.includes('Actual interval:'));
 assert.ok(!zero.includes('Current matched period'));assert.ok(zero.includes('Historical quote-relative return'));
});
