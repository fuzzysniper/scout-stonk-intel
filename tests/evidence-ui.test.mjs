import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const load = async file => import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD, file + '.js')).href);
const { TokenRow, EcosystemOverview, DatasetEvidence, utc, flowReading, observationAge } = (await load('app/radar/evidence-view')).default;
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

test('loading and failure use unknown coverage without empty KPI cards or invented timestamps', () => {
 const loading=html(EcosystemOverview,{report:null});
 assert.match(loading,/Tracked tokens —/);assert.match(loading,/Reading observations/);assert.match(loading,/Coverage pending/);
 assert.ok(!loading.includes('<time'));assert.ok(!loading.includes('<dl'));
 const failed=html(EcosystemOverview,{report:null,failed:true});
 assert.match(failed,/Observation source unavailable/);assert.match(failed,/Coverage unknown/);
 assert.ok(!failed.includes('No recorded observations'));
});
test('missing histories retain quote identity with a single plain insufficient state and no fabricated figure', () => {
 const r=report(),row=r.rows[0],out=closedReading(row);
 assert.match(out,/Insufficient comparable history/);assert.match(out,/No recorded observation/);
 assert.ok(!out.includes('flow-value'));assert.ok(!out.includes('<time'));
 assert.ok(out.includes(row.quoteSymbol));assert.ok(out.includes('/terminal?mint='+row.mint));assert.ok(!out.includes('href="'+row.dossier+'"'));
 const overview=html(EcosystemOverview,{report:r});assert.match(overview,/7 tracked tokens/);assert.match(overview,/no valid flow comparisons/);
});
test('valid point zero or change has one quoted readout with its actual interval, never a 24h rate', () => {
 for(const value of [0,2]) {
  const r=report([point(-1,10),point(0,10+value)]),row=r.rows.find(r=>r.mint===token.mint),out=closedReading(row);
  assert.match(out,new RegExp(value+' '+token.quoteSymbol));
  assert.equal((out.match(/class="flow-value"/g)||[]).length,1);
  assert.match(out,/Recorded counter change/);assert.ok(!out.includes('Matched 24h target'));
  for(const term of [row.pointChange.startAt,row.pointChange.endAt,utc(row.pointChange.startAt),'Actual interval'])assert.ok(out.includes(term));
  assert.ok(!out.includes('20:59:00'));
 }
});
test('matched coverage chooses one existing current-period counter delta instead of showing competing figures', () => {
 const r=report(Array.from({length:49},(_,i)=>point(i-48,i))),row=r.rows.find(r=>r.mint===token.mint);
 assert.equal(row.signals.status,'available');
 const out=closedReading(row);assert.match(out,/24 /);assert.match(out,/Matched 24h target/);
 assert.equal((out.match(/class="flow-value"/g)||[]).length,1);
 assert.ok(out.includes(row.signals.current.startAt));assert.ok(out.includes(row.signals.current.endAt));
 assert.ok(!out.includes('Observed velocity'));assert.ok(!out.includes('%'));
 // Even a superficially fresh retained available row is suppressed by failed source context.
 for(const sourceStatus of ['degraded','unavailable'])assert.deepEqual(flowReading(row,sourceStatus),{state:'Source unavailable'});
});
test('stale, failed source, resets, identity errors and irregular 8h gaps show one honest state', () => {
 const cases=[
  [report([point(-5,10),point(-4,12)]),'Stale observations'],
  [report([point(-1,10),point(0,12)],'degraded'),'Source unavailable'],
  [report([point(-1,10),point(0,12)],'unavailable'),'Source unavailable'],
  [report([point(-1,10),point(0,1)]),'Insufficient comparable history'],
  [report([point(-1,10),point(0,12,{quoteMint:tokens[1].quoteMint,quoteSymbol:'WRONG'})]),'Insufficient comparable history'],
  [report([point(-8,10),point(0,12)]),'Insufficient comparable history'],
 ];
 for(const [r,state] of cases){const row=r.rows.find(r=>r.mint===token.mint),out=closedReading(row);assert.match(out,new RegExp(state));assert.ok(!out.includes('flow-value'));assert.ok(!out.includes('Matched 24h target'));}
});
test('all advanced provenance and interval barriers remain behind closed native disclosures', () => {
 const r=report(Array.from({length:49},(_,i)=>point(i-48,i))),row=r.rows.find(r=>r.mint===token.mint),out=html(TokenRow,{row});
 assert.match(out,/<details class="token-evidence"><summary>Evidence \/ Details/);
 assert.ok(!/<details[^>]*\bopen/.test(out));
 for(const term of ['Actual start / end','Maximum gap','Boundary offsets','payout counter','Verified quote asset',row.quoteMint,utc(row.verifiedAt),row.evidence,row.source,row.onchain,row.discoverySource,'/evidence/reward-verification.json'])assert.ok(out.includes(term),term);
});
test('coverage, actual timestamp age and collection reliability stay separate from source retrieval', () => {
 const r=report([point(-2,1),point(-1,2)]),out=html(EcosystemOverview,{report:r,filtered:true});
 assert.match(out,/7 filtered tokens/);assert.match(out,/2026-10-13T20:00:00/);assert.match(out,/1h 0m old/);
 assert.ok(!out.includes('20:59:00'));assert.match(out,/recorded changes/);assert.match(out,/Collection reliability/);
 assert.equal(observationAge('bad',now.toISOString()),null);assert.equal(observationAge(point(1).observedAt,now.toISOString()),null);
 assert.equal(observationAge(point(-.25).observedAt,now.toISOString()),'15m old');
 const evidence=html(DatasetEvidence,{report:r});
 for(const term of [dataset.revision,'Dataset retrieved','Response generated','not observation times','75-minute','Calculation coverage is independent','Missing history is not zero rewards','strictly under 2h'])assert.ok(evidence.includes(term),term);
});
test('HTTP 503 identity-only rows have known tracking scope and unknown observations/coverage', () => {
 const r=report([],'unavailable'),overview=html(EcosystemOverview,{report:r}),out=closedReading(r.rows[0]);
 assert.match(overview,/7 tracked tokens/);assert.match(overview,/Coverage unknown/);assert.match(overview,/Observation source unavailable/);
 assert.ok(!overview.includes('No recorded observations'));
 assert.match(out,/Source unavailable/);assert.match(out,/Observation unknown/);assert.ok(!out.includes('flow-value'));
});

test('small positive comparable amounts do not become a false zero when displayed', () => {
 const r=report([point(-1,0),point(0,1e-8)]),row=r.rows.find(r=>r.mint===token.mint),out=closedReading(row);
 assert.equal(flowReading(row).value,1e-8);
 assert.match(out,/1E-8 /);assert.ok(!out.includes('>0 '+token.quoteSymbol));
});

test('valid 24h archive coverage remains useful when paired 48h coverage is not yet available', () => {
 const r=report(Array.from({length:25},(_,i)=>point(i-24,i))),row=r.rows.find(r=>r.mint===token.mint);
 assert.equal(row.signals.status,'unavailable');assert.equal(row.windows['24h'].status,'available');
 assert.equal(flowReading(row).kind,'window');assert.equal(flowReading(row).value,24);
 const out=closedReading(row);assert.match(out,/24h target · recorded span/);assert.equal((out.match(/class="flow-value"/g)||[]).length,1);
 for(const term of [row.windows['24h'].startAt,row.windows['24h'].endAt])assert.ok(out.includes(term));
});
