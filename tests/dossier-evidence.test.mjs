import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {rewardUiScenarios} from './reward-evidence-ui-fixtures.mjs';
const load=async file=>(await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,file+'.js')).href)).default;
const {dossierPair,dossierFinding,emptyPair,legacyRecord,officialLedger,DossierEvidenceFinding,DossierEvidenceAudit}=await load('app/dossier/evidence');
const cases=await rewardUiScenarios(),t=cases.covered.catalog.groups[0].tokens[0],mint=t.mint,quote=t.quoteMint;
const legacy={status:'available',mint,source:officialLedger(mint),fetchedAt:cases.covered.catalog.dataset.fetchedAt,mode:'reward',quoteMint:quote,quoteSymbol:'NVDAX',distributedTokens:100,payoutCount:10,holderCount:5,lastPayoutAt:null};
const none={report:null,failed:false,loading:false};
const read=name=>dossierPair(cases[name].catalog,mint,quote);
const finding=(name,reward=legacy,history=none)=>dossierFinding(mint,reward,read(name),history);
const render=(pair,reward=legacy,history=none)=>renderToStaticMarkup(React.createElement(DossierEvidenceFinding,{mint,reward,pair,history}));
for(const [name,title] of Object.entries({covered:'Reward counter increase recorded','covered-zero':'No reward counter increase recorded',lifetime:'Recent reward activity not verified',zero:'Recent reward activity not verified',settings:'Reward settings confirmed by provider',standard:'Provider reports no holder reward mode','stale-lifetime':'Reward settings confirmed by provider','stale-source':'Recent reward activity not verified','stale-evaluation':'Recent reward activity not verified','rate-limited':'Recent reward activity not verified','precise-lifetime':'Recent reward activity not verified'}))test('dossier keeps distinct evidence meaning: '+name,()=>{
 const r=finding(name);assert.equal(r.title,title);assert.ok(r.reason.toLowerCase().includes('holder returns unavailable') || name==='standard');assert.ok(!r.reason.includes('holders paid'));assert.ok(!r.reason.includes('ROI'));
 const html=render(read(name));assert.equal((html.match(/<h3>/g)||[]).length,1);assert.equal((html.match(/class="brief-qualifier"/g)||[]).length,1);
 if(name==='covered'){assert.ok(r.reason.includes('24.00000000 NVDAX'));assert.ok(r.qualifier.includes('covered'));assert.ok(!r.reason.includes('earning rate'));}
 if(name==='covered-zero')assert.ok(r.reason.includes('0.00000000 NVDAX'));
 if(['lifetime','zero','precise-lifetime'].includes(name)){assert.ok(r.reason.includes('lifetime total'));assert.ok(r.reason.includes('does not verify recent distributions'));assert.ok(!r.reason.includes('100.00000000'));}
 if(name.startsWith('stale'))assert.ok(r.warning.includes('stale'));
 if(name==='rate-limited')assert.ok(r.warning.includes('rate limited'));
});

test('legacy totals including zero/null/large values and claimed mode never promote settings or interval verification',()=>{
 for(const total of [null,0,1e-12,100,1e20])for(const state of ['not_requested','not_in_sample','unavailable','invalid']){
  const r=dossierFinding(mint,{...legacy,distributedTokens:total},emptyPair(state),none);assert.equal(r.title,'Recent reward activity not verified');assert.ok(r.reason.includes('settings') || r.reason.includes('Settings'));assert.ok(!r.reason.includes('Settings confirmed'));assert.equal(r.recordedAt,null);assert.ok(r.qualifier.includes('cutoff unknown'));
 }
});

test('missing, foreign, failed or forged official records have no clickable official-evidence affordance',()=>{
 for(const bad of [null,{...legacy,status:'not_found'},{...legacy,status:'unavailable'},{...legacy,mint:quote},{...legacy,source:officialLedger(quote)},{...legacy,source:'javascript:alert(1)'},{...legacy,source:officialLedger(mint)+'?secret=x'},{...legacy,fetchedAt:'not-a-date'}]){
  assert.equal(legacyRecord(mint,bad),false);const r=dossierFinding(mint,bad,emptyPair('not_requested'),none);assert.equal(r.official,null);const html=render(emptyPair('not_requested'),bad);assert.ok(!html.includes('href='));assert.ok(html.includes('Official evidence unavailable'));
 }
});

test('a successful legacy standard-mode record is meaningful source access, not strict mode verification',()=>{
 const reward={...legacy,status:'no_rewards',mode:'standard',distributedTokens:null};assert.equal(legacyRecord(mint,reward),true);const r=dossierFinding(mint,reward,emptyPair('not_requested'),none);assert.equal(r.official,legacy.source);assert.equal(r.title,'Recent reward activity not verified');assert.ok(!r.reason.includes('confirmed'));
});

test('source action preserves exact-mint provenance; successful retrieval never becomes observation time',()=>{
 const pair=read('settings'),r=dossierFinding(mint,legacy,pair,none);assert.equal(r.official,pair.evidence.mechanism.source.source);assert.equal(r.recordedAt,null);assert.ok(r.qualifier.includes('settings response'));assert.ok(r.qualifier.includes('not a payout observation'));assert.ok(!r.qualifier.includes(legacy.fetchedAt));
 const html=render(pair);assert.ok(html.includes('View official evidence'));assert.ok(html.includes('target="_blank" rel="noopener noreferrer"'));assert.ok(html.includes(r.official));
});

const history=(change={})=>({report:{mint,status:'recorded',source:officialLedger(mint),quote:{mint:quote,symbol:'NVDAX'},latestObservedAt:'2026-01-01T01:00:00.000Z',endAt:'2026-01-01T01:00:00.000Z',fetchedAt:'2026-01-01T12:00:00.000Z',freshness:{status:'stale'},dataset:{sourceStatus:'available'},issues:[],...change},failed:false,loading:false});
test('last actual observation remains dated/stale; last payout, evaluation and retrieval are never substituted',()=>{
 const r=dossierFinding(mint,{...legacy,lastPayoutAt:'2026-01-01T10:00:00.000Z'},emptyPair('unavailable'),history());assert.equal(r.recordedAt,'2026-01-01T01:00:00.000Z');assert.ok(r.qualifier.includes('01:00 UTC'));assert.ok(r.qualifier.includes('stale'));assert.ok(!r.qualifier.includes('12:00'));assert.ok(!r.qualifier.includes('10:00'));assert.ok(!r.warning.includes('Recorded history is stale.'));
});
for(const change of [{mint:quote},{source:officialLedger(quote)},{status:'invalid_data'},{quote:{mint:mint,symbol:'NVDAX'}},{endAt:'2026-01-02T01:00:00.000Z'},{fetchedAt:'2025-01-01T00:00:00.000Z'},{latestObservedAt:'invalid'}])test('foreign or invalid recorded clock is withheld: '+JSON.stringify(change),()=>{
 assert.equal(dossierFinding(mint,legacy,emptyPair('unavailable'),history(change)).recordedAt,null);
});
test('history warnings remain visible without promoting historical windows to strict covered flow',()=>{
 for(const h of [history({status:'invalid_data'}),history({dataset:{sourceStatus:'degraded'}}),{...none,failed:true}]){
  const r=dossierFinding(mint,legacy,emptyPair('unavailable'),h);assert.equal(r.title,'Recent reward activity not verified');assert.ok(r.warning);assert.ok(!r.reason.includes('Settings confirmed'));
 }
});

test('outside bounded sample is not absence; wrong quote and unknown optional contract fail closed',()=>{
 assert.equal(dossierPair(cases.covered.catalog,mint,mint).state,'not_in_sample');
 for(const evidence of [null,{},undefined]){const c=structuredClone(cases.covered.catalog);c.groups[0].tokens[0].rewardEvidence=evidence;const p=dossierPair(c,mint,quote);assert.equal(p.state,'invalid');const r=dossierFinding(mint,legacy,p,none);assert.equal(r.title,'Recent reward activity not verified');assert.ok(r.warning.includes('validation'));}
});

test('forged precise amount, holder return, source, unit or interval cannot fall back to a positive legacy conclusion',()=>{
 for(const mutate of [e=>e.lifetime.value.distributedTokens='999.00000000',e=>e.holderReturn.value=99,e=>e.mechanism.source.source=officialLedger(quote),e=>e.unit.mint=mint,e=>e.interval.value.current.endAt=e.interval.value.current.startAt]){
  const c=structuredClone(cases.covered.catalog);mutate(c.groups[0].tokens[0].rewardEvidence);const p=dossierPair(c,mint,quote);assert.equal(p.state,'invalid');assert.equal(dossierFinding(mint,legacy,p,none).title,'Recent reward activity not verified');
 }
});

test('folded strict audit retains original raw values, exact quote mint, source receipts and actual period coverage',()=>{
 for(const name of ['covered','lifetime','zero','precise-lifetime']){
  const pair=read(name),html=renderToStaticMarkup(React.createElement(DossierEvidenceAudit,{pair}));for(const value of [mint,quote,pair.evidence.evaluatedAt,'Byte revision','Settings verification','Covered interval flow','No individual receipt'])assert.ok(html.includes(value),value);
  if(name==='covered')for(const value of ['24.00000000','86400s','25 points',pair.evidence.interval.value.current.startAt,pair.evidence.interval.value.current.endAt])assert.ok(html.includes(value),value);
  if(name==='precise-lifetime')assert.ok(html.includes('119954640.83712182'));
 }
});


test('confirmed settings use their provider-response clock and keep a separate old observation dated',()=>{
 const pair=read('settings'),r=dossierFinding(mint,legacy,pair,history());assert.equal(r.title,'Reward settings confirmed by provider');assert.ok(r.qualifier.includes('settings response'));assert.ok(r.qualifier.includes('last reward observation'));assert.ok(r.qualifier.includes('(stale)'));assert.equal(r.recordedAt,history().report.latestObservedAt);
});


test('an official identity warning withholds the primary source affordance even with a separate legacy ledger',()=>{
 const c=structuredClone(cases['rate-limited'].catalog),t=c.groups[0].tokens[0];t.modeVerification='identity_mismatch';t.rewardEvidence.mechanism.reason='invalid_source';const pair=dossierPair(c,mint,quote);assert.equal(pair.state,'ready');const r=dossierFinding(mint,legacy,pair,none);assert.equal(r.title,'Recent reward activity not verified');assert.equal(r.official,null);assert.ok(r.warning.includes('identity'));assert.ok(!render(pair).includes('View official evidence'));
});
