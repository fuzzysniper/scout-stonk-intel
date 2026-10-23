import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import path from 'node:path';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {MINT,OTHER,AT,mintFixture,marketFixture,failure} from './trader-fixtures.mjs';
const load=p=>createRequire(import.meta.url)(path.join(process.env.HISTORY_TEST_BUILD,'app/consumer',p+'.js'));
const {projectMintFacts}=load('onchain-model'),{tokenConcerns,concernSummary,marketReadiness,unverifiedProperties}=load('trader-model'),{watchReport}=load('cards/model'),{TokenResearch}=load('trader');
const now=Date.parse(AT),flags=v=>tokenConcerns(v,now),summary=v=>concernSummary(v,now),project=x=>projectMintFacts(x,MINT,now,'production');
test('OFFLINE replay: each deterministic concern carries the precise accepted fact, mint, slot and source',()=>{
 const v=project(mintFixture(MINT,{freeze:true,extensions:true})),rows=flags(v);assert.equal(v.kind,'facts');assert.deepEqual(rows.map(r=>r.id),['mint_authority','freeze_authority','extensions']);
 for(const r of rows){assert.equal(r.mint,MINT);assert.equal(r.slot,'400000001');assert.equal(r.checkedAt,AT);assert.equal(r.sourceHost,'mainnet.helius-rpc.com');assert.equal(r.responseSha256,'a'.repeat(64));assert.ok(r.field.startsWith('facts.'));assert.equal(r.synthetic,false);}
 assert.equal(rows[0].title,'A minting control is present');assert.match(rows[1].explanation,/extensions are not fully reviewed/);assert.equal(rows[0].trigger,'present · '+OTHER);assert.equal(rows[2].trigger,'unreviewed · permanentDelegate');assert.equal(summary(v),'3 checks need attention');
});
test('OFFLINE replay: unverified, disabled, unsupported, expired and synthetic-in-production responses never trigger token concerns',()=>{
 for(const x of [failure(),failure(MINT,'not_mint','not_a_supported_mint_account'),{}, {...mintFixture(),mint:OTHER}, {...mintFixture(),source:{...mintFixture().source,acquisition:'synthetic_fixture'}}])assert.deepEqual(flags(project(x)),[]);
 assert.deepEqual(flags('loading'),[]);assert.deepEqual(flags(projectMintFacts(mintFixture(),MINT,now+60001,'production')),[]);assert.equal(summary(project(failure())),'Controls not verified');
});
test('OFFLINE replay: absent standard authorities never clear other risks or unreviewed extensions',()=>{
 const v=project(mintFixture(MINT,{absent:true}));assert.equal(flags(v).length,0);assert.equal(summary(v),'Standard authorities absent; other risks unknown');
 const x=project(mintFixture(MINT,{absent:true,extensions:true}));assert.deepEqual(flags(x).map(r=>r.id),['extensions']);assert.ok(unverifiedProperties.some(r=>r.detail.includes('insider')));assert.ok(unverifiedProperties.some(r=>r.detail.includes('LP ownership')));
});
test('OFFLINE replay: unsupported extension labels are triggers for missing review, never decoded guesses',()=>{
 const x=mintFixture(MINT,{extensions:true});x.facts.extensions.names=['unknownExtension'];const r=flags(project(x))[1];assert.equal(r.id,'extensions');assert.match(r.trigger,/unknownExtension/);assert.doesNotMatch(r.explanation,/permanent delegate|tax|fee percentage/);
});
test('OFFLINE replay: synthetic context retains its label in derived concerns',()=>{
 const x=mintFixture();x.source.acquisition='synthetic_fixture';const v=projectMintFacts(x,MINT,now,'synthetic-offline');assert.equal(flags(v)[0].synthetic,true);
});
test('market identity projection strips every quantity and never inherits quote-side labels',()=>{
 const r=watchReport(marketFixture(),MINT);assert.equal(r.state,'matched');assert.equal(marketReadiness(r,now),'matched');assert.equal(marketReadiness({...r,pool:r.baseMint},now),'invalid_identity');assert.equal(marketReadiness(r,now+60001),'stale_response');assert.equal(marketReadiness(r,now-1001),'invalid_clock');
 const raw=marketFixture();raw.base.address=OTHER;raw.quote.address=MINT;const q=watchReport(raw,MINT);assert.equal(marketReadiness(q,now),'quote_side');assert.equal(q.name,null);
 for(const key of ['priceUsd','liquidityUsd','volume24h','change24h','marketCap'])assert.ok(!(key in r));assert.throws(()=>watchReport({...marketFixture(),mint:OTHER},MINT));
});
test('SSR unified result has no fabricated flags/financial defaults and includes useful unverified properties',()=>{
 const html=renderToStaticMarkup(React.createElement(TokenResearch,{mint:MINT}));assert.match(html,/What needs attention/);assert.match(html,/No token-specific concern/);assert.match(html,/Market evidence/);assert.match(html,/display rights and actual market timestamps/);assert.match(html,/insider allocations/);assert.match(html,/LP ownership/);assert.doesNotMatch(html,/654321|987654|456789|18446744073|safety score[: ]*\d|fetch\(/);
});

test('derived concerns independently expire and reject backward clocks even before observer notification',()=>{const view=project(mintFixture());assert.equal(tokenConcerns(view,now+60000).length,1);assert.deepEqual(tokenConcerns(view,now+60001),[]);assert.deepEqual(tokenConcerns(view,now-1001),[]);assert.equal(concernSummary(view,now+60001),'Controls not verified');});

const {ScoutBrief}=load('trader');
const brief=view=>renderToStaticMarkup(React.createElement(ScoutBrief,{view,mint:MINT}));
test('V3 Brief renders accepted controls and the original source clock without inventing a safety verdict',t=>{
 t.mock.method(Date,'now',()=>now);const html=brief(project(mintFixture(MINT,{freeze:true,extensions:true})));
 assert.match(html,/SCOUT Brief/);assert.match(html,/3 checks need a closer look/);assert.match(html,/Authority present/);assert.match(html,/Not fully reviewed/);assert.match(html,/400000001/);assert.match(html,/2026-10-18T12:00:00.000Z/);assert.match(html,/Token-2022 controls are not fully reviewed/);assert.match(html,/sellability remain unknown/);assert.match(html,/Onchain evidence/);assert.doesNotMatch(html,/safe to trade|rug.pull verdict|market cap|%/i);
});
test('V3 Brief never promotes expired facts, invalid clocks or failed acquisition into attention indicators',t=>{
 const view=project(mintFixture());t.mock.method(Date,'now',()=>now+60001);
 for(const v of [view,project(failure()),{kind:'unavailable',reason:'access_denied'},{kind:'unsupported',reason:'not_mint'}]){
  const html=brief(v);assert.match(html,/No verified token facts/);assert.match(html,/Checked slot and time unavailable/);assert.doesNotMatch(html,/data-attention="true"|Authority present|RPC snapshot accepted|<time/);
 }assert.match(brief(view),/Observation expired/);
});
test('V3 Brief loading is a skeleton, never a sample observation; synthetic trusted context stays labeled',t=>{
 t.mock.method(Date,'now',()=>now);const html=brief('loading');assert.match(html,/aria-busy="true"/);assert.equal((html.match(/class="brief-skeleton"/g)||[]).length,3);assert.doesNotMatch(html,/<time|Authority present|data-attention="true"/);
 const x=mintFixture();x.source.acquisition='synthetic_fixture';const v=projectMintFacts(x,MINT,now,'synthetic-offline');assert.match(brief(v),/SYNTHETIC · OFFLINE TEST/);assert.match(brief(v),/Offline fixture/);assert.doesNotMatch(brief(v),/Helius RPC report/);
});
test('V3 absent standard authorities preserve uncertainty and use no green all-clear label',t=>{
 t.mock.method(Date,'now',()=>now);const html=brief(project(mintFixture(MINT,{absent:true})));assert.match(html,/Standard authorities absent. Other risks remain/);assert.match(html,/None in layout/);assert.match(html,/liquidity control/);assert.doesNotMatch(html,/data-attention="true"|risk.free|fully reviewed|safe token/i);
});
test('V3 recovery distinguishes an access gate from expiry/rate limiting/unsupported responses',t=>{
 t.mock.method(Date,'now',()=>now);
 for(const reason of ['disabled','missing_api','access_denied'])assert.match(brief({kind:'unavailable',reason}),/Lookup access restricted/);
 for(const v of [{kind:'unavailable',reason:'stale_source'},{kind:'unavailable',reason:'rate_limited'},{kind:'unsupported',reason:'not_mint'}]){const html=brief(v);assert.match(html,/Source access &amp; verification limits/);assert.match(html,/Explore dated examples/);assert.doesNotMatch(html,/Lookup access restricted/);}
});
test('V3 Brief uses a coherent source instant at the exact expiry boundary',t=>{
 const view=project(mintFixture());let clockReads=0;t.mock.method(Date,'now',()=>now+60000+clockReads++);
 const html=brief(view);assert.match(html,/1 check needs a closer look/);assert.match(html,/Authority present/);assert.doesNotMatch(html,/Standard authorities absent/);
});

test('release: shared mint URLs and dated examples render without mounting source acquisition',()=>{
 const {default:Home}=load('home'),{evaluateInput,examples}=load('model');
 for(const mint of [MINT,examples[0].mint]){
  const html=renderToStaticMarkup(React.createElement(Home,{initialInput:mint,initialState:evaluateInput(mint)}));
  assert.match(html,/Onchain check not requested/);assert.ok(html.includes(mint));
  assert.doesNotMatch(html,/class="trader-research"|RPC snapshot accepted|Checking source…/);
 }
});
test('release: market evidence is not fetched implicitly with the onchain check',()=>{
 const html=renderToStaticMarkup(React.createElement(TokenResearch,{mint:MINT}));
 assert.match(html,/Market source not checked/);assert.match(html,/Check market source/);
 assert.doesNotMatch(html,/Checking market source…|A matching pool was reported/);
});
