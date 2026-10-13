import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const imported=async name=>import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'lib/'+name+'.js')).href);
const { buildBrief,validBriefDate }=await imported('brief');
const { summarizeHealth }=await imported('data-health');
const { datedAudit }=await imported('collector-diagnostics');
const tokens=JSON.parse(fs.readFileSync(new URL('../data/tracked-mints.json',import.meta.url),'utf8'));
const token=tokens[0], date='2026-10-12',start=Date.parse(date+'T00:00:00Z'),now=new Date('2026-10-13T01:00:00Z');
const dataset={kind:'github_snapshot',source:'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json',revision:'sha256:'+'a'.repeat(64),dataFetchedAt:now.toISOString(),sourceStatus:'available',cacheSeconds:300,continuouslyUpdated:false};
// Artificial, labeled unit fixtures only. No production observations or browser data are replaced.
const point=(h,total=h+1,extra={},t=token)=>({observedAt:new Date(start+h*3600000).toISOString(),providerGeneratedAt:new Date(start+h*3600000).toISOString(),mode:'reward',distributedTokens:total,payoutCount:h+1,quoteMint:t.quoteMint,quoteSymbol:t.quoteSymbol,source:t.source,...extra});
const complete=(t=token)=>Array.from({length:25},(_,h)=>point(h,h+1,{},t));
const build=(store={},source=dataset,at=now,configured=tokens,attempt=null)=>{
 const h=summarizeHealth(store,configured,source,datedAudit(),attempt,'dated_investigation',at);
 return buildBrief(store,configured,source,h,date,at);
};
const row=brief=>brief.rows.find(r=>r.mint===token.mint);
const withheld=r=>{assert.equal(r.status,'withheld');for(const key of ['distributedTokens','payoutCountChange','baselineCounter','endCounter'])assert.equal(r[key],null);};

test('no observations gives honest no verified change and never substitutes zero payouts',()=>{
 const b=build();assert.equal(b.headline,'No verified change to report');assert.equal(b.findingCount,0);assert.equal(b.verifiedCount,0);
 for(const r of b.rows){withheld(r);assert.equal(r.pointsInDay,0);assert.ok(r.reasons.includes('no_history'));}
 assert.ok(b.quality.rows.every(r=>r.state==='missing'));assert.equal(b.provisional,true);
});
test('short histories and open UTC days withhold all daily financial findings',()=>{
 const b=build({[token.mint]:[point(20),point(23)]});withheld(row(b));assert.ok(row(b).reasons.includes('insufficient_history'));
 const open=build({[token.mint]:complete()},dataset,new Date('2026-10-12T23:00:00Z'));withheld(row(open));assert.equal(open.dayClosed,false);assert.ok(row(open).reasons.includes('day_in_progress'));assert.ok(!row(open).reasons.includes('stale_period_end'));
 const early=build({[token.mint]:[point(0)]},dataset,new Date('2026-10-12T01:00:00Z'));assert.ok(!row(early).reasons.includes('stale_period_end'));assert.ok(!row(early).reasons.includes('missing_end_boundary'));
});
test('covered actual day reports counter deltas and separate quote identities without ecosystem unit totals',()=>{
 const store=Object.fromEntries(tokens.map(t=>[t.mint,complete(t)])),before=structuredClone(store),b=build(store);
 assert.equal(b.verifiedCount,7);assert.equal(b.findingCount,7);
 for(const r of b.rows){assert.equal(r.status,'verified');assert.equal(r.distributedTokens,24);assert.equal(r.payoutCountChange,24);assert.equal(r.observedSeconds,86400);assert.equal(r.comparisonPointCount,25);assert.equal(r.pointsInDay,24);assert.equal(r.startOffsetSeconds,0);assert.equal(r.endOffsetSeconds,0);}
 assert.equal(new Set(b.rows.map(r=>r.quoteMint)).size,6);assert.ok(!('totalDistributedTokens' in b));assert.deepEqual(store,before);
});
test('zero covered distribution is a supported no increase, not a material finding or missing-data zero',()=>{
 const values=complete().map(p=>({...p,distributedTokens:1,payoutCount:1})),b=build({[token.mint]:values});
 assert.equal(row(b).status,'verified');assert.equal(row(b).distributedTokens,0);assert.equal(b.findingCount,0);assert.equal(b.headline,'No verified change to report');
});
test('calendar boundaries use actual pre-boundary observations with disclosed offsets, never a shorter fake day',()=>{
 const values=Array.from({length:25},(_,i)=>point(i-1+17/60,i+1));const r=row(build({[token.mint]:values}));
 assert.equal(r.status,'verified');assert.equal(r.observedSeconds,86400);assert.equal(r.startOffsetSeconds,-2580);assert.equal(r.endOffsetSeconds,-2580);
 const short=complete();short[0]=point(-.01,1);short[24]=point(23.99,25);assert.equal(row(build({[token.mint]:short})).status,'verified');
 short[24]=point(23.98,25);const bad=row(build({[token.mint]:short}));withheld(bad);assert.ok(bad.reasons.includes('unmatched_duration'));
});
test('stale period endpoints, degraded/unavailable source and stale provider never produce amounts',()=>{
 const old=complete().slice(0,20),r=row(build({[token.mint]:old}));withheld(r);assert.ok(r.reasons.includes('stale_period_end'));
 for(const sourceStatus of ['degraded','unavailable']){const b=build({[token.mint]:complete()},{...dataset,sourceStatus});withheld(row(b));assert.ok(row(b).reasons.includes('source_unavailable'));}
 const values=complete();values[10].providerGeneratedAt=new Date(Date.parse(values[10].observedAt)-4*3600000).toISOString();const stale=row(build({[token.mint]:values}));withheld(stale);assert.ok(stale.reasons.includes('stale_provider'));
});
test('archived endpoint freshness is evaluated at its day boundary; current health stays separately stale',()=>{
 const b=build({[token.mint]:complete()},dataset,new Date('2026-10-15T00:00:00Z'));
 assert.equal(row(b).status,'verified');assert.equal(b.quality.rows.find(r=>r.mint===token.mint).state,'stale');assert.equal(b.quality.checkedAt,'2026-10-15T00:00:00.000Z');
});
test('distribution and payout resets, quote transition and missing provenance are barriers',()=>{
 for(const extra of [{distributedTokens:0},{payoutCount:0},{quoteMint:tokens[1].quoteMint},{source:'https://example.invalid'}]){
  const values=complete();values[12]={...values[12],...extra};withheld(row(build({[token.mint]:values})));
 }
 const values=complete();delete values[8].quoteMint;withheld(row(build({[token.mint]:values})));
});
test('malformed/future timestamps and conflicting duplicates withhold; identical duplicates collapse',()=>{
 for(const extra of [{observedAt:'2026-02-30T00:00:00Z'},{observedAt:'2027-01-01T00:00:00Z'},{distributedTokens:NaN},{mode:'standard'},{providerGeneratedAt:'invalid'}]){
  const values=complete();values[10]={...values[10],...extra};withheld(row(build({[token.mint]:values})));
 }
 const values=complete();values.push({...values[10]});let r=row(build({[token.mint]:values}));assert.equal(r.status,'verified');assert.equal(r.comparisonPointCount,25);assert.deepEqual(r.warnings,['duplicate_timestamp']);
 values.at(-1).distributedTokens=100;r=row(build({[token.mint]:values}));withheld(r);assert.ok(r.reasons.includes('conflicting_duplicate'));
});
test('strict gaps and optional payout counts retain coverage safeguards',()=>{
 const values=complete();values.splice(10,1);const r=row(build({[token.mint]:values}));withheld(r);assert.ok(r.reasons.includes('gapped_history'));
 const missing=complete();delete missing[10].payoutCount;const safe=row(build({[token.mint]:missing}));assert.equal(safe.status,'verified');assert.equal(safe.payoutCountChange,null);assert.equal(safe.payoutCountReason,'missing_or_invalid_payout_count');
});
test('brief versions and evidence attribution are stable across retrieval time, input order and current warnings',()=>{
 const store={[token.mint]:complete()},a=build(store),b=build(store,{...dataset,dataFetchedAt:'2026-10-13T02:00:00Z',sourceStatus:'cached'},new Date('2026-10-13T02:00:00Z'),[...tokens].reverse());
 assert.equal(a.version,b.version);assert.equal(a.sharePath,b.sharePath);assert.match(a.version,/^[a-f0-9]{64}$/);
 const r=row(a);assert.equal(r.evidence.brief,'/api/brief?date='+date+'&v='+a.version);assert.equal(r.evidence.official,token.source);assert.equal(r.evidence.dossier,'/?mint='+token.mint);
 assert.notEqual(a.version,build(store,{...dataset,revision:'sha256:'+'b'.repeat(64)}).version);
 assert.notEqual(a.version,build(store,dataset,now,tokens.map(t=>({...t,name:t.name+' verified'}))).version);
});
test('partial collection is attributed per token and never turns matching content into all-token success',()=>{
 const attempt={version:1,startedAt:'2026-10-13T00:59:00Z',finishedAt:now.toISOString(),event:'schedule',runId:1,overall:'partial',expectedDatasetRevision:dataset.revision,
  results:tokens.map((t,i)=>({mint:t.mint,status:i?'failed':'collected',reason:i?'network_timeout':'collected',observedAt:i?null:now.toISOString()}))};
 const b=build({[token.mint]:complete()},dataset,now,tokens,attempt);assert.equal(b.quality.attemptOverall,'partial');assert.equal(b.quality.attemptState,'matched_dataset');
 assert.equal(b.quality.rows.find(r=>r.mint===tokens[1].mint).attempt.status,'failed');assert.equal(b.quality.auditOrigin,'dated_investigation');
});
test('date validation rejects invalid calendars, future dates and non-date inputs',()=>{
 for(const bad of ['2026-02-30','2026-13-01','2026-10-14','../../data','2026-1-01','2019-12-31'])assert.equal(validBriefDate(bad,now),false);
 assert.equal(validBriefDate(date,now),true);assert.throws(()=>buildBrief({},tokens,dataset,{},'2026-02-30',now));
});

test('a provisional version changes when the day closes or source gates change without different snapshot bytes',()=>{
 const store={[token.mint]:Array.from({length:25},(_,i)=>point(i-1+17/60,i+1))};
 const open=build(store,dataset,new Date('2026-10-12T23:45:00Z')),closed=build(store);
 withheld(row(open));assert.equal(row(closed).status,'verified');assert.notEqual(open.version,closed.version);
 const degraded=build(store,{...dataset,sourceStatus:'degraded'});withheld(row(degraded));assert.notEqual(closed.version,degraded.version);
});
