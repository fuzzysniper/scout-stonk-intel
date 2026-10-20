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
