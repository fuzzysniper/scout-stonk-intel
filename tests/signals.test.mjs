import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { calculateSignals, MATCH_TOLERANCE_MS } = await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'lib/signals.js')).href);
const { summarizeHistory } = await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'lib/history.js')).href);
const tokens=JSON.parse(fs.readFileSync(new URL('../data/tracked-mints.json',import.meta.url),'utf8'));
const token=tokens[0], quote={mint:token.quoteMint,symbol:token.quoteSymbol};
const end=Date.parse('2026-10-12T21:00:00Z'),now=new Date(end);
// Explicitly artificial deterministic fixtures. Never written to historical data or screenshots.
const point=(hours,total,count=total,extra={})=>({observedAt:new Date(end+hours*3600000).toISOString(),providerGeneratedAt:new Date(end+hours*3600000).toISOString(),mode:'reward',distributedTokens:total,payoutCount:count,quoteMint:quote.mint,quoteSymbol:quote.symbol,source:token.source,...extra});
const rows=(priorStep=1,currentStep=2)=>Array.from({length:49},(_,i)=>point(i-48,i<=24?i*priorStep:24*priorStep+(i-24)*currentStep,i));
const calculate=(values,source='available',at=now,asset=quote)=>calculateSignals({[token.mint]:values},token.mint,asset,source,at);
const withheld=r=>{
 assert.equal(r.status,'unavailable');assert.equal(r.accelerationPercent,null);
 for(const w of [r.current,r.previous])for(const key of ['distributedTokens','tokensPerHour','payoutCountChange'])assert.equal(w[key],null);
};

test('exact adjacent periods share boundary and calculate distributions, actual velocity and payout deltas',()=>{
 const r=calculate(rows());assert.equal(r.status,'available');assert.equal(r.confidence,'coverage_passed');
 assert.equal(r.current.distributedTokens,48);assert.equal(r.previous.distributedTokens,24);
 assert.equal(r.current.tokensPerHour,2);assert.equal(r.previous.tokensPerHour,1);assert.equal(r.accelerationPercent,100);
 assert.equal(r.current.payoutCountChange,24);assert.equal(r.previous.payoutCountChange,24);
 assert.equal(r.current.startAt,r.previous.endAt);assert.equal(r.current.observationCount,25);assert.equal(r.previous.observationCount,25);
 assert.equal(r.current.startBoundaryOffsetSeconds,0);assert.equal(r.previous.startBoundaryOffsetSeconds,0);
 assert.equal(r.current.observedSeconds,86400);assert.equal(r.category,'increased_velocity');assert.ok(!('holderCountChange' in r));
 const history=summarizeHistory({[token.mint]:rows()},token.mint,now);
 assert.equal(history.windows['24h'].distributedTokens,r.current.distributedTokens);
});
test('bounded nearest boundaries disclose actual consecutive spans and normalize velocity, not fake equal totals',()=>{
 const values=rows();
 for(const [i,seconds] of [[24,20],[0,50]]){values[i].observedAt=new Date(Date.parse(values[i].observedAt)-seconds*1000).toISOString();values[i].providerGeneratedAt=values[i].observedAt;}
 const r=calculate(values);assert.equal(r.status,'available');assert.equal(r.current.startBoundaryOffsetSeconds,-20);assert.equal(r.previous.startBoundaryOffsetSeconds,-30);
 assert.equal(r.current.observedSeconds,86420);assert.equal(r.previous.observedSeconds,86430);
 assert.equal(r.current.startAt,r.previous.endAt);assert.equal(r.current.timing,'nearest_snapshot');
 const expected=((48/86420)/(24/86430)-1)*100;assert.ok(Math.abs(r.accelerationPercent-expected)<1e-10);
 assert.notEqual(r.accelerationPercent,100);
});
test('zero baseline has defined new/no-activity categories without infinite or fake percentages',()=>{
 const fresh=calculate(rows(0,2));assert.equal(fresh.status,'available');assert.equal(fresh.category,'new_activity');assert.equal(fresh.accelerationPercent,null);
 assert.equal(fresh.previous.distributedTokens,0);assert.equal(fresh.current.distributedTokens,48);
 const quiet=calculate(rows(0,0));assert.equal(quiet.status,'available');assert.equal(quiet.category,'no_activity');assert.equal(quiet.accelerationPercent,null);
 const stop=calculate(rows(2,0));assert.equal(stop.category,'decreased_velocity');assert.equal(stop.accelerationPercent,-100);
 const same=calculate(rows(1,1));assert.equal(same.category,'unchanged_velocity');assert.equal(same.accelerationPercent,0);
});
test('current-only and missing histories withhold all metrics instead of treating missing prior period as zero',()=>{
 for(const values of [[],rows().slice(24),[point(0,1)]]){const r=calculate(values);withheld(r);assert.ok(r.reasons.includes('insufficient_previous_history'));}
 const empty=calculateSignals({},token.mint,quote,'available',now);withheld(empty);assert.ok(empty.reasons.includes('no_history'));
 for(const bad of [null,[],{[token.mint]:'bad'}])withheld(calculateSignals(bad,token.mint,quote,'available',now));
});
test('exactly two-hour or larger gaps in either period fail the stricter Signal Lab safeguard',()=>{
 for(const index of [10,30]){
  const values=rows();values.splice(index,1);const r=calculate(values);withheld(r);
  assert.ok(r.reasons.includes(index<24?'gapped_previous_history':'gapped_current_history'));
 }
 const values=rows();values.splice(30,2);withheld(calculate(values));
});
test('matching tolerance is inclusive at one minute and rejects excessive boundary drift',()=>{
 assert.equal(MATCH_TOLERANCE_MS,60000);
 for(const extra of [60000,60001]){
  const values=rows();values[24].observedAt=new Date(end-24*3600000-extra).toISOString();values[24].providerGeneratedAt=values[24].observedAt;
  values[0].observedAt=new Date(end-48*3600000-extra*2).toISOString();values[0].providerGeneratedAt=values[0].observedAt;
  const r=calculate(values);
  if(extra===60000)assert.equal(r.status,'available');else{withheld(r);assert.ok(r.reasons.includes('unmatched_duration'));}
 }
});
test('source failure and observation/provider staleness cannot be hidden by fresh retrieval',()=>{
 for(const source of ['degraded','unavailable']){const r=calculate(rows(),source);withheld(r);assert.ok(r.reasons.includes('source_unavailable'));}
 assert.equal(calculate(rows(),'cached').status,'available');
 assert.equal(calculate(rows(),'available',new Date(end+3*3600000)).status,'available');
 const stale=calculate(rows(),'available',new Date(end+3*3600000+1));withheld(stale);assert.ok(stale.reasons.includes('stale_data'));
 const values=rows();values[48].providerGeneratedAt=new Date(end-4*3600000).toISOString();const provider=calculate(values);withheld(provider);assert.ok(provider.reasons.includes('stale_provider'));
});
test('resets of distribution or payout counters anywhere across both periods are barriers',()=>{
 for(const [index,field] of [[10,'distributedTokens'],[30,'distributedTokens'],[24,'payoutCount']]){
  const values=rows();values[index][field]=0;const r=calculate(values);withheld(r);assert.ok(r.reasons.includes('counter_decrease'));
 }
});
test('every compared point requires the same verified quote mint, including legacy symbol-only records',()=>{
 for(const [index,extra] of [[10,{quoteMint:tokens[1].quoteMint}],[30,{quoteMint:null}],[24,{quoteSymbol:'OTHER'}]]){
  const values=rows();Object.assign(values[index],extra);const r=calculate(values);withheld(r);assert.ok(r.reasons.includes('inconsistent_verified_quote'));
 }
 for(const asset of [null,{}, {mint:'bad',symbol:'X'},{mint:quote.mint,symbol:123}]){const r=calculate(rows(),'available',now,asset);withheld(r);assert.ok(r.reasons.includes('invalid_verified_quote'));}
});
test('identical duplicates collapse; conflicting totals or payout counts block comparisons',()=>{
 const values=rows();values.push({...values[10]});const identical=calculate(values);assert.equal(identical.status,'available');assert.equal(identical.previous.observationCount,25);assert.ok(identical.warnings.includes('duplicate_timestamp'));
 for(const field of ['distributedTokens','payoutCount']){const conflict=rows();conflict.push({...conflict[10],[field]:999});const r=calculate(conflict);withheld(r);assert.ok(r.reasons.includes('conflicting_duplicate'));}
});
test('malformed/future timestamps, invalid metadata, bad provenance and counters never turn into signals',()=>{
 for(const extra of [{observedAt:'bad'},{observedAt:'2026-02-30T21:00:00Z'},{observedAt:'2026-10-13T21:00:00Z'},{providerGeneratedAt:'bad'},{mode:'standard'},{source:'https://evil.example'},{distributedTokens:-1},{distributedTokens:Infinity},{distributedTokens:'12'}]){
  const values=rows();Object.assign(values[10],extra);withheld(calculate(values));
 }
 withheld(calculate(rows(),'available',new Date('invalid')));
});
test('payout counter changes are independently unavailable when optional counter coverage is incomplete',()=>{
 for(const bad of [null,-1,1.5,Number.MAX_SAFE_INTEGER+1]){
  const values=rows();values[10].payoutCount=bad;const r=calculate(values);assert.equal(r.status,'available');assert.equal(r.current.distributedTokens,48);
  assert.equal(r.payoutCountStatus,'unavailable');assert.equal(r.payoutCountReason,'missing_or_invalid_payout_count');assert.equal(r.current.payoutCountChange,null);assert.equal(r.previous.payoutCountChange,null);
 }
});
test('overflow and positive-velocity underflow are withheld instead of serializing invalid or fake zero metrics',()=>{
 const values=rows(0,0);for(let i=1;i<=24;i++)values[i].distributedTokens=1e-307;for(let i=25;i<49;i++)values[i].distributedTokens=1e308;
 const overflow=calculate(values);withheld(overflow);assert.ok(overflow.reasons.includes('non_finite_calculation'));
 const tiny=rows(0,0);for(let i=1;i<49;i++)tiny[i].distributedTokens=Number.MIN_VALUE;
 const underflow=calculate(tiny);withheld(underflow);assert.ok(underflow.reasons.includes('non_finite_calculation'));
});
test('calculation is deterministic and does not mutate source records',()=>{
 const values=rows();const before=JSON.stringify(values);for(const point of values)Object.freeze(point);Object.freeze(values);
 assert.deepEqual(calculate(values),calculate(values));assert.equal(JSON.stringify(values),before);
});
