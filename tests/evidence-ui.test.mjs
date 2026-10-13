import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const load = async file => import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD, file + '.js')).href);
const { TokenRow, EcosystemOverview, DatasetEvidence, utc } = (await load('app/radar/evidence-view')).default;
const { summarizeRadar } = await load('lib/radar');
const { trackedTokens } = await load('lib/tracked-tokens');
const tokens = trackedTokens(), token = tokens[0];
const now = new Date('2026-10-13T21:00:00Z');
const dataset = { kind:'github_snapshot', source:'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json', revision:'sha256:ui-test-only', dataFetchedAt:'2026-10-13T20:59:00Z', sourceStatus:'available', cacheSeconds:300, continuouslyUpdated:false };
// Artificial histories stay in tests. Production screenshots never consume these.
const point = (hours,total=1,extra={}) => ({observedAt:new Date(now.getTime()+hours*3600000).toISOString(),distributedTokens:total,quoteMint:token.quoteMint,quoteSymbol:token.quoteSymbol,source:token.source,...extra});
const report = (points=[],status='available') => summarizeRadar({[token.mint]:points},tokens,{...dataset,sourceStatus:status},'coverage',now);
const html = (Component,props) => renderToStaticMarkup(React.createElement(Component,props));
const closedReading = row => html(TokenRow,{row}).split('<details')[0];

test('loading overview uses unknown markers, never false zero counts or a claimed observation', () => {
 const out=html(EcosystemOverview,{report:null});
 assert.equal((out.match(/<dd>—<\/dd>/g)||[]).length,3);
 assert.match(out,/Checking source/); assert.ok(!out.includes('Not recorded'));
});
test('empty histories are unknown reward changes while tracked identity counts remain known', () => {
 const r=report(); const out=closedReading(r.rows[0]);
 assert.match(out,/Not enough history/); assert.match(out,/No recorded observations/);
 assert.ok(!out.includes('<time')); assert.ok(!out.includes('>0 '+r.rows[0].quoteSymbol));
 const overview=html(EcosystemOverview,{report:r});
 assert.match(overview,/Not recorded/); assert.match(overview,/not zero rewards/);
 assert.equal((overview.match(/<dt>/g)||[]).length,3);
 assert.match(overview,/<dd>7<\/dd>/);
});
test('summary distinguishes point change from matched comparison and preserves covered zero + quote units', () => {
 for (const value of [0,2]) {
  const r=report([point(-1,10),point(0,10+value)]),row=r.rows.find(r=>r.mint===token.mint);
  const out=closedReading(row);
  assert.match(out,new RegExp(value+' '+token.quoteSymbol));
  assert.match(out,/not a daily rate/);
  assert.ok(out.includes(utc(row.pointChange.startAt))); assert.ok(out.includes(row.latestObservedAt));
  assert.ok(!out.includes('20:59:00')); // Retrieval time never substitutes for the observation.
  assert.match(html(EcosystemOverview,{report:r}),/Matched comparisons<\/dt><dd>0/);
 }
});
test('stale, degraded, unavailable, reset, mismatch and long gaps never leak numeric changes into scan rows', () => {
 const cases=[
  report([point(-5,10),point(-4,12)]),
  report([point(-1,10),point(0,12)],'degraded'),
  report([point(-1,10),point(0,12)],'unavailable'),
  report([point(-1,10),point(0,1)]),
  report([point(-1,10),point(0,12,{quoteMint:tokens[1].quoteMint,quoteSymbol:'WRONG'})]),
  report([point(-5,10),point(0,12)]),
 ];
 for(const r of cases){
  const row=r.rows.find(r=>r.mint===token.mint),out=closedReading(row);
  assert.match(out,/Change withheld/); assert.ok(!out.includes('>2 '+token.quoteSymbol));
  assert.match(html(EcosystemOverview,{report:r}),r.status==='unavailable' ? /Matched comparisons<\/dt><dd>—/ : /Matched comparisons<\/dt><dd>0/);
 }
 assert.match(closedReading(cases[0].rows.find(r=>r.mint===token.mint)),/Stale · over 3h old/);
 assert.match(html(EcosystemOverview,{report:cases[1]}),/Retained records are dated/);
 assert.match(html(EcosystemOverview,{report:cases[2]}),/observations and changes unknown/);
});
test('complete historical fixture exposes all research behind closed semantic disclosure without predictions', () => {
 const points=Array.from({length:49},(_,i)=>point(i-48,i));
 const r=report(points),row=r.rows.find(r=>r.mint===token.mint);
 assert.equal(row.signals.status,'available');
 const out=html(TokenRow,{row});
 assert.match(out,/<details class="token-evidence"><summary>Evidence \/ Details/);
 assert.ok(!/<details[^>]*\bopen/.test(out));
 for (const term of ['Actual start / end','Maximum gap','Boundary offsets','payout counter','Verified quote asset',row.quoteMint,utc(row.verifiedAt),row.evidence,row.source,row.onchain,row.discoverySource,'/evidence/reward-verification.json']) assert.ok(out.includes(term),term);
 assert.match(html(EcosystemOverview,{report:r}),/Matched comparisons<\/dt><dd>1/);
 assert.ok(!closedReading(row).includes('Observed velocity'));
});
test('overview timestamp is latest actual record, filtering is explicit and evidence retains exact byte revision', () => {
 const r=report([point(-2,1),point(-1,2)]);
 const overview=html(EcosystemOverview,{report:r,filtered:true});
 assert.match(overview,/Filtered tokens/); assert.match(overview,/2026-10-13T20:00:00/);
 assert.ok(!overview.includes('20:59:00'));
 const evidence=html(DatasetEvidence,{report:r,query:'/api/radar?sort=freshness&quoteMint='+token.quoteMint});
 for(const term of [dataset.revision,'Dataset retrieved','Response generated','not observation times','not independently reconciled','strictly under 2h','six decimals',token.quoteMint]) assert.ok(evidence.includes(term),term);
});

test('client failure retains unknown counts and labels availability instead of indefinite loading', () => {
 const out=html(EcosystemOverview,{report:null,failed:true});
 assert.match(out,/Unavailable/); assert.match(out,/observations and changes unknown/);
 assert.ok(!out.includes('Checking source')); assert.equal((out.match(/<dd>—<\/dd>/g)||[]).length,3);
});

test('HTTP 503 identity rows preserve tracked count but never claim zero observed tokens or absent history', () => {
 const r=report([],'unavailable');
 const out=html(EcosystemOverview,{report:r});
 assert.match(out,/Tracked tokens<\/dt><dd>7/);
 assert.match(out,/With recorded points<\/dt><dd>—/);
 assert.match(out,/Matched comparisons<\/dt><dd>—/);
 assert.ok(!out.includes('Not recorded'));
 assert.match(closedReading(r.rows[0]),/Observation unavailable/);
 assert.ok(!closedReading(r.rows[0]).includes('No recorded observations'));
});
