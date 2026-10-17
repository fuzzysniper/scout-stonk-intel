import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const load=async file=>(await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,file+'.js')).href)).default;
const model=await load('app/consumer/model');
const {explainMint}=await load('experiments/consumer-mvp/evidence/index');
const {default:Home,Explanation}=await load('app/consumer/home');
const {Chrome}=await load('app/site-chrome');
const {default:Terminal,generateMetadata:terminalMetadata}=await load('app/terminal/page');
const {examples,evaluateInput,projectEvidence,consumerMetadata,sharePath,legacyPath}=model;

test('three exact reviewed identities come from original engine; same-symbol aliases stay unsupported',()=>{
 assert.equal(examples.length,3);
 for(const t of examples){const s=evaluateInput(t.mint);assert.equal(s.state,'supported');assert.equal(s.evidence.quote.mint,t.quoteMint);assert.equal(s.evidence.freshness.state,'stale');}
 assert.equal(evaluateInput('4SsapSJFx7ZqVb2C7z78wKD4nyySjFCBSuajnZdDsx97').state,'unsupported');
 for(const t of examples)assert.equal(evaluateInput(t.quoteMint).state,'unsupported');
});
test('empty, malformed, ticker, repeated query, whitespace and unknown inputs never auto-enroll',()=>{
 assert.equal(evaluateInput(undefined).state,'idle');assert.equal(evaluateInput('').state,'empty');
 for(const v of ['SI','NVDAX'])assert.equal(evaluateInput(v).state,'needs_mint');
 for(const v of [' '+examples[0].mint,examples[0].mint+' ',[examples[0].mint,examples[1].mint],'<script>alert(1)</script>'])assert.equal(evaluateInput(v).state,'invalid');
 assert.equal(evaluateInput('1'.repeat(32)).state,'unsupported');
});
test('rights, quantity, exact quote, settlement and ROI promotions fail closed',()=>{
 const original=explainMint(examples[0].mint);
 const changes=[e=>e.quote.mint=examples[1].quoteMint,e=>e.quote.symbol='GLDX',e=>e.economicMechanism.settlement='verified',e=>e.economicMechanism.holderEntitlement='known',e=>e.economicMechanism.holderReturns.value=0,e=>e.marketContext.liquidityUsd.value=123,e=>e.economicMechanism.lifetimeDistribution.value='123',e=>e.freshness.currentValueClaim=true,e=>e.sources[0].rights.permission='approved',e=>e.sources[0].rights.publication='raw'];
 for(const mutate of changes){const x=structuredClone(original);mutate(x.explanation);assert.equal(projectEvidence(x).state,'unavailable');}
 assert.equal(projectEvidence({schemaVersion:'2',status:'supported'}).state,'unavailable');
 assert.equal(projectEvidence(explainMint(examples[0].mint,{asOf:'2026-10-01T00:00:00Z'})).state,'unavailable');
});
test('server-rendered landing and explanations are brand-free and retain prominent withholding',()=>{
 const landing=renderToStaticMarkup(React.createElement(Home,{initialInput:'',initialState:evaluateInput(undefined)}));
 assert.match(landing,/A token address/);assert.match(landing,/14 Oct 2026/);assert.match(landing,/stale/);
 assert.equal((landing.match(/class="example-button"/g)||[]).length,3);
 for(const t of examples){
  const state=evaluateInput(t.mint);const html=renderToStaticMarkup(React.createElement(Home,{initialInput:t.mint,initialState:state}));
  assert.match(html,/What’s not known/);assert.match(html,/Financial figures withheld; publication rights unverified/);
  assert.ok(html.includes(t.mint)&&html.includes(t.quoteMint));
  assert.doesNotMatch(html,/STORKCOIN|PROJECT CLEAR|SCOUT|\$[0-9]|(?:APY|ROI)[: ]+[0-9]/);
  assert.doesNotMatch(html,/<iframe|api\/v2\/tokens\/[^\s"]+\/rewards\/payouts|href="[^"]+pair-reward-audit-2026-10-14/);
  const explanation=renderToStaticMarkup(React.createElement(Explanation,{evidence:state.evidence}));assert.equal((explanation.match(/class="receipt"/g)||[]).length,3);
 }
});
test('metadata is neutral, exact-mint canonical, noindex and has no legacy token preview',()=>{
 for(const raw of [undefined,'SI','1'.repeat(32),[examples[0].mint,examples[1].mint],...examples.map(e=>e.mint)]){
  const m=consumerMetadata(raw);assert.deepEqual(m.robots,{index:false,follow:false});
  assert.doesNotMatch(JSON.stringify(m),/SCOUT|STORKCOIN|PROJECT CLEAR|api\/og/);
  assert.match(m.description,/stale, not live data/);
  if(typeof raw==='string'&&examples.some(e=>e.mint===raw))assert.equal(m.alternates.canonical,'https://scout.storkcoin.xyz'+sharePath(raw));else assert.equal(m.alternates.canonical,'https://scout.storkcoin.xyz/');
 }
});
test('consumer and legacy mint share paths remain separate, explicit and exact',()=>{
 for(const t of examples){assert.equal(sharePath(t.mint),'/?mint='+t.mint);assert.equal(legacyPath(t.mint),'/terminal?mint='+t.mint);}
 assert.throws(()=>sharePath('1'.repeat(32)));assert.equal(legacyPath('javascript:alert(1)'),'/terminal');
});
test('home chrome excludes ecosystem footer; legacy technical routes retain it',()=>{
 const home=renderToStaticMarkup(React.createElement(Chrome,{pathname:'/'},React.createElement('main',null,'consumer')));
 assert.equal(home,'<main>consumer</main>');
 const guide=renderToStaticMarkup(React.createElement(Chrome,{pathname:'/research'},React.createElement('main',null,'guide')));
 assert.match(guide,/STORK ecosystem connection/);assert.match(guide,/aria-label="Primary"/);
});
test('terminal keeps the original client, exact initial mint and token OG API contract',async()=>{
 const mint=examples[0].mint,element=await Terminal({searchParams:Promise.resolve({mint})});assert.equal(element.props.initialMint,mint);
 const meta=await terminalMetadata({searchParams:Promise.resolve({mint})});assert.match(meta.title,/SCOUT/);assert.equal(meta.openGraph.images[0].url,'/api/og?mint='+mint);
 const before=readFileSync('app/scout-client.tsx','utf8');assert.match(before,/api\/token\?mint=/);assert.match(before,/api\/rewards\?mint=/);
});
test('consumer runtime imports original engine and never a raw audit, fixture or vendor copy',()=>{
 const sources=['app/consumer/model.ts','app/consumer/home.tsx','app/page.tsx'].map(p=>readFileSync(p,'utf8')).join('\n');
 assert.match(sources,/experiments\/consumer-mvp\/evidence/);
 assert.doesNotMatch(sources,/vendor\/|preview\.json|readFileSync|fetch\(|localStorage|sessionStorage|\.asOf|asOf:/);
});
