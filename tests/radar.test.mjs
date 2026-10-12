import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { summarizeRadar } = await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'lib/radar.js')).href);
const { trackedTokens, validateTrackedTokens } = await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'lib/tracked-tokens.js')).href);
const tokens=trackedTokens(), token=tokens[0], other=tokens[1];
const now=new Date('2026-10-12T21:00:00Z');
const dataset={kind:'github_snapshot',source:'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json',revision:'sha256:test-fixture',dataFetchedAt:now.toISOString(),sourceStatus:'available',cacheSeconds:300,continuouslyUpdated:false};
// Artificial test counters; never used in production data or screenshots.
const point=(hours,total=1,extra={})=>({observedAt:new Date(now.getTime()+hours*3600000).toISOString(),distributedTokens:total,quoteMint:token.quoteMint,quoteSymbol:token.quoteSymbol,source:token.source,...extra});
const report=(rows,source=dataset)=>summarizeRadar({[token.mint]:rows},[token],source,'name',now).rows[0];

test('empty histories retain all verified identities with null changes and coverage',()=>{
 const r=summarizeRadar({},tokens,dataset,'name',now);
 assert.equal(r.rows.length,tokens.length);
 for(const row of r.rows){assert.equal(row.observationCount,0);assert.equal(row.latestObservedAt,null);assert.equal(row.pointChange.distributedTokens,null);assert.equal(row.pointChange.status,'no_history');assert.equal(row.windows['24h'].status,'insufficient_history');}
});
test('actual two-point change reports its exact interval without pretending 24h coverage',()=>{
 const row=report([point(-.5,10),point(0,12)]);
 assert.equal(row.pointChange.status,'available');assert.equal(row.pointChange.distributedTokens,2);
 assert.equal(row.pointChange.observedSeconds,1800);assert.equal(row.observationCount,2);
 assert.equal(row.windows['24h'].distributedTokens,null);assert.equal(row.windows['24h'].status,'insufficient_history');
 assert.equal(report([point(-1,0),point(0,0)]).pointChange.distributedTokens,0);
});
test('quote mismatch, symbol-only legacy points, reset, invalid source and conflicts withhold deltas',()=>{
 const cases=[
  [point(-1,10),point(0,12,{quoteMint:other.quoteMint})],
  [point(-1,10,{quoteMint:null}),point(0,12)],
  [point(-1,10),point(0,1)],
  [point(-1,10),point(0,12,{source:'https://evil.example'})],
  [point(-1,10),point(-1,11),point(0,12)],
  [point(-1,10),point(0,12,{quoteSymbol:'WRONG'})],
 ];
 for(const rows of cases)assert.equal(report(rows).pointChange.distributedTokens,null);
 assert.ok(report(cases[2]).quality.includes('counter_decrease'));
 assert.equal(report([point(-1,10),point(-1,10),point(0,12)]).observationCount,2);
 assert.equal(report([point(-1,10),point(-1,10),point(0,12)]).pointChange.distributedTokens,2);
});
test('long actual intervals cannot become short-period activity or window totals',()=>{
 const row=report([point(-5,10),point(0,12)]);
 assert.equal(row.pointChange.status,'long_interval');assert.equal(row.pointChange.distributedTokens,null);
 assert.equal(row.pointChange.observedSeconds,18000);assert.equal(row.windows['24h'].distributedTokens,null);
});
test('stale observations and degraded/unavailable source withhold changes independently',()=>{
 assert.equal(report([point(-5,10),point(-4,12)]).pointChange.status,'stale_data');
 for(const status of ['degraded','unavailable']){
  const row=report([point(-1,10),point(0,12)],{...dataset,sourceStatus:status});
  assert.equal(row.pointChange.status,'source_unavailable');assert.equal(row.pointChange.distributedTokens,null);
  for(const window of Object.values(row.windows)){assert.equal(window.status,'source_unavailable');assert.equal(window.distributedTokens,null);}
 }
});
test('hourly full coverage remains valid only with explicitly matching quote identities',()=>{
 const rows=Array.from({length:169},(_,i)=>point(i-168,i));
 const row=report(rows);assert.equal(row.windows['24h'].distributedTokens,24);assert.equal(row.windows['7d'].distributedTokens,168);
 rows[150].quoteMint=other.quoteMint;
 assert.equal(report(rows).windows['24h'].distributedTokens,null);
});
test('future/malformed timestamps cannot be bridged and invalid counters never become zero',()=>{
 for(const extra of [{observedAt:'bad'},{observedAt:'2026-10-13T21:00:00Z'},{distributedTokens:null}]){
  const row=report([point(-1,10),point(0,12),point(0,13,extra)]);assert.equal(row.pointChange.distributedTokens,null);
 }
});
test('sorts are name/freshness, not incomparable reward amounts; source evidence links survive',()=>{
 const store={[tokens[0].mint]:[point(-1,10000)],[tokens[1].mint]:[{...point(0,1),quoteMint:tokens[1].quoteMint,quoteSymbol:tokens[1].quoteSymbol,source:tokens[1].source}]};
 const r=summarizeRadar(store,tokens,dataset,'freshness',now);assert.equal(r.rows[0].mint,tokens[1].mint);
 const byName=summarizeRadar(store,tokens,dataset,'name',now);
 assert.deepEqual(byName.rows.map(row=>row.name),[...tokens].sort((a,b)=>a.name.localeCompare(b.name)).map(row=>row.name));
 for(const row of r.rows){assert.ok(row.dossier.includes(row.mint));assert.ok(row.evidence.includes(row.mint));assert.equal(row.onchain,'https://solscan.io/token/'+row.mint);}
});
test('allowlist rejects excessive, duplicate, invalid and unverified addresses',()=>{
 assert.ok(tokens.length>=5&&tokens.length<=10);
 for(const value of [[],Array(11).fill(token),[token,token],[{...token,mint:'../data'}],[{...token,quoteMint:'invalid'}],[{...token,source:'https://evil.example'}]])assert.throws(()=>validateTrackedTokens(value));
});
test('checked-in observations are genuine initial samples; legacy rows are never backfilled',()=>{
 const store=JSON.parse(fs.readFileSync(new URL('../data/reward-snapshots.json',import.meta.url),'utf8'));
 const latest=Math.max(...Object.values(store).flat().map(row=>Date.parse(row.observedAt)));
 const r=summarizeRadar(store,tokens,dataset,'name',new Date(latest+60000));
 assert.equal(r.rows.filter(row=>row.observationCount>0).length,tokens.length);
 for(const row of r.rows){assert.equal(row.windows['24h'].distributedTokens,null);assert.equal(row.windows['7d'].distributedTokens,null);}
 const knots=r.rows.find(row=>row.symbol==='KNOTS');assert.equal(knots.pointChange.distributedTokens,null);
 assert.equal(store[knots.mint][0].quoteMint,undefined);
});

test('default coverage order promotes comparable evidence rather than reward magnitude',()=>{
 const end=now.getTime();const data={};
 for(const [index,t] of tokens.slice(0,2).entries()){
  data[t.mint]=Array.from({length:index===0?49:3},(_,i)=>({observedAt:new Date(end+(i-(index===0?48:2))*3600000).toISOString(),distributedTokens:index===0?i:1000000+i,quoteMint:t.quoteMint,quoteSymbol:t.quoteSymbol,source:t.source,payoutCount:i}));
 }
 const r=summarizeRadar(data,tokens,dataset,undefined,now);assert.equal(r.sort,'coverage');assert.equal(r.rows[0].mint,tokens[0].mint);assert.equal(r.rows[0].signals.status,'available');
});
