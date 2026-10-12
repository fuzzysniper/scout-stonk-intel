import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { summarizeHealth, missedObservationSlots } = await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'lib/data-health.js')).href);
const { validateAttempt, validateAudit, datedAudit } = await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'lib/collector-diagnostics.js')).href);
const { createBoundedJsonSource } = await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'lib/history-source.js')).href);
const tokens=JSON.parse(fs.readFileSync(new URL('../data/tracked-mints.json',import.meta.url),'utf8')),token=tokens[0];
const end=Date.parse('2026-10-12T23:33:00Z'),now=new Date(end),audit={...datedAudit(),checkedAt:now.toISOString(),scheduledRunCount:0};
const dataset={kind:'github_snapshot',source:'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json',revision:'sha256:'+'a'.repeat(64),dataFetchedAt:now.toISOString(),sourceStatus:'available',cacheSeconds:300,continuouslyUpdated:false};
// Artificial operational fixtures only. Never written to observed snapshots or screenshots.
const point=(hours,total=1)=>({observedAt:new Date(end+hours*3600000).toISOString(),distributedTokens:total,quoteMint:token.quoteMint,quoteSymbol:token.quoteSymbol,source:token.source});
const health=(store,attempt=null,at=now,source=dataset)=>summarizeHealth(store,tokens,source,audit,attempt,'dated_investigation',at);
const attempt=(status='collected',reason='collected')=>({version:1,startedAt:new Date(end-60000).toISOString(),finishedAt:now.toISOString(),event:'schedule',runId:1,overall:status==='collected'?'complete':status==='failed'?'failed':'skipped',expectedDatasetRevision:dataset.revision,results:[{mint:token.mint,status,reason,observedAt:status==='collected'?now.toISOString():null}]});

test('missing, current, delayed and stale observations have independent coverage states',()=>{
 assert.equal(health({}).rows.find(r=>r.mint===token.mint).state,'missing');
 assert.equal(health({}).rows.find(r=>r.mint===token.mint).missedScheduledSlots,null);
 for(const [age,state] of [[0,'current'],[-1.25,'current'],[-1.25-1/3600,'delayed'],[-3,'delayed'],[-3-1/3600,'stale']]){
  const row=health({[token.mint]:[point(age)]}).rows.find(r=>r.mint===token.mint);
  assert.equal(row.state,state);assert.equal(row.observationCount,1);assert.notEqual(row.coverage['24h'].status,'complete');
 }
});
test('complete actual windows require real gap coverage and matching recorded quote identity',()=>{
 const values=Array.from({length:169},(_,i)=>point(i-168,i));
 const row=health({[token.mint]:values}).rows.find(r=>r.mint===token.mint);
 assert.equal(row.state,'current');assert.equal(row.coverage['24h'].status,'complete');assert.equal(row.coverage['7d'].status,'complete');
 assert.ok(!('distributedTokens' in row.coverage['24h']));
 values[160].quoteMint=null;assert.equal(health({[token.mint]:values}).rows.find(r=>r.mint===token.mint).coverage['24h'].status,'invalid_data');
});
test('expected missed slots are grace-aware estimates and recover with a real observation',()=>{
 const observed=Date.parse('2026-10-12T20:41:00Z');
 assert.equal(missedObservationSlots(observed,Date.parse('2026-10-12T21:31:59Z')).count,0);
 assert.equal(missedObservationSlots(observed,Date.parse('2026-10-12T21:32:00Z')).count,1);
 assert.equal(missedObservationSlots(observed,end).count,3);
 assert.equal(missedObservationSlots(end,end).count,0);
 assert.deepEqual(missedObservationSlots(observed,observed+20*86400000),{count:168,capped:true});
 const stale=health({[token.mint]:[point(-4)]}).rows.find(r=>r.mint===token.mint);assert.equal(stale.state,'stale');
 const recovered=health({[token.mint]:[point(-4),point(0)]}).rows.find(r=>r.mint===token.mint);assert.equal(recovered.state,'current');assert.equal(recovered.missedScheduledSlots,0);
});
test('partial attempts are not upgraded by a matching dataset hash or fresh prior record',()=>{
 const report={...attempt(),overall:'partial',results:[attempt().results[0],{mint:tokens[1].mint,status:'failed',reason:'provider_rate_limited',observedAt:null}]};
 const h=health({[token.mint]:[point(0)]},report);
 assert.equal(h.collector.attemptState,'matched_dataset');
 assert.equal(h.rows.find(r=>r.mint===tokens[1].mint).attempt.status,'failed');assert.equal(h.rows.find(r=>r.mint===tokens[1].mint).state,'missing');
 assert.equal(h.rows.find(r=>r.mint===token.mint).attempt.status,'collected');
 const mismatch=health({[token.mint]:[point(0)]},{...report,expectedDatasetRevision:'sha256:'+'b'.repeat(64)});assert.equal(mismatch.collector.attemptState,'unconfirmed');
});
test('source outage, provider staleness and invalid counters cannot imply healthy collection',()=>{
 const row=health({[token.mint]:[point(0)]},null,now,{...dataset,sourceStatus:'degraded'}).rows.find(r=>r.mint===token.mint);assert.equal(row.state,'source_unavailable');assert.equal(row.coverage['24h'].status,'source_unavailable');
 const bad=point(0);bad.distributedTokens=null;assert.equal(health({[token.mint]:[bad]}).rows.find(r=>r.mint===token.mint).state,'quality_issue');
 const provider={...point(0),providerGeneratedAt:new Date(end-4*3600000).toISOString()};assert.equal(health({[token.mint]:[provider]}).rows.find(r=>r.mint===token.mint).state,'stale');
});
test('dated investigation, overdue audits and future attempts retain explicit unknown/freshness distinctions',()=>{
 const h=health({[token.mint]:[point(0)]});assert.equal(h.collector.auditOrigin,'dated_investigation');assert.equal(h.collector.attemptState,'missing');assert.equal(h.collector.audit.scheduledRunCount,0);
 const old={...audit,checkedAt:new Date(end-27*3600000).toISOString()};assert.equal(summarizeHealth({},tokens,dataset,old,null,'github',now).collector.auditState,'overdue');
 const future={...attempt(),finishedAt:new Date(end+3600000).toISOString()};assert.equal(health({},future).collector.attemptState,'invalid_time');assert.equal(health({},future).collector.attempt,null);
});
test('diagnostic schemas reject malformed fields and strip unknown/private attributes',()=>{
 const clean=validateAttempt({...attempt(),privateToken:'test-fixture-secret'});assert.ok(!JSON.stringify(clean).includes('test-fixture-secret'));
 for(const value of [{}, {...attempt(),results:Array(11).fill(attempt().results[0])},{...attempt(),results:[{...attempt().results[0],reason:'raw secret exception'}]},{...attempt(),expectedDatasetRevision:'invalid'},{...attempt(),finishedAt:'bad'}])assert.throws(()=>validateAttempt(value));
 const cleaned=validateAudit({...audit,untrustedLog:'test-fixture-private'});assert.ok(!JSON.stringify(cleaned).includes('test-fixture-private'));
 assert.throws(()=>validateAudit({...audit,runs:Array(13).fill(audit.runs[0])}));
 assert.throws(()=>validateAudit({...audit,runs:[{...audit.runs[0],conclusion:'sensitive error text'}]}));
});
test('shared bounded diagnostics reader backs off malformed responses and preserves valid retrieval times',async()=>{
 let clock=end,fail=false,calls=0;
 const read=createBoundedJsonSource('https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/collection-summary.json',validateAttempt,async()=>{calls++;return new Response(fail?'{bad':JSON.stringify(attempt()));},()=>clock,65536);
 const first=await read();assert.equal(first.dataset.sourceStatus,'available');clock+=300000;fail=true;
 const fallback=await read();assert.equal(fallback.dataset.sourceStatus,'degraded');assert.equal(fallback.dataset.dataFetchedAt,first.dataset.dataFetchedAt);await read();assert.equal(calls,2);
 clock=end+900001;assert.equal((await read()).dataset.sourceStatus,'unavailable');
});
