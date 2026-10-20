import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {MINT,QUOTE,OTHER,AT,key,pool,encode} from './fixtures.mjs';
const require=createRequire(import.meta.url);
const {decodeObservation,endpointFor}=require(process.env.PULSE_BUILD+'/lib/trader-pulse/decoder.js');
const {evaluatePulse}=require(process.env.PULSE_BUILD+'/lib/trader-pulse/engine.js');
const {isExactMint,parsePacket}=require(process.env.PULSE_BUILD+'/lib/trader-pulse/validation.js');
const decode=(data=[pool()],options={})=>decodeObservation({mint:MINT,bytes:encode(data),requestStartedMs:AT-10,retrievedMs:AT,...options});
const evaluate=(data,options={})=>evaluatePulse(decode(data,options),AT);

test('SYNTHETIC rule proof: 40/5 versus 240/60 = 2x; imbalance = 0.5, not USD flow',()=>{
 const s=decode(),r=evaluatePulse(s,AT);
 assert.equal(r.activityAcceleration.state,'uncertain');
 assert.deepEqual(r.activityAcceleration.value,{fiveMinuteTransactions:40,oneHourTransactions:240,fiveMinutePerMinute:8,oneHourPerMinute:4,ratio:2,comparison:'higher',baseline:'overlapping_hour_includes_last_five_minutes'});
 assert.equal(r.transactionImbalance.value.normalizedDifference,0.5);
 assert.equal(r.transactionImbalance.value.orientation,'provider_base_token');
 assert.deepEqual(r.liquidity.value,{reportedUsd:25000,unit:'USD'});
 assert.equal(r.poolAge.value.elapsedSecondsAtRetrieval,3600);
 assert.equal(r.poolAge.value.context,'one_hour_to_one_day');
 assert.equal(r.pair.baseMint,MINT);assert.equal(r.pair.quoteMint,QUOTE);
 assert.equal(r.publication,'withheld_pending_source_rights_and_clock_review');
 assert.match(r.liquidity.interpretation,/not executable depth/);
 assert.ok(Object.isFrozen(s)&&Object.isFrozen(s.selectedPool.txns.m5)&&Object.isFrozen(r));
 assert.throws(()=>{s.pools[0].liquidityUsd=1},TypeError);
 assert.deepEqual(evaluatePulse(s,AT),evaluatePulse(s,AT));
});
for(const invalid of ['', 'USDC',` ${MINT}`,`${MINT} `,MINT.toLowerCase(),'0'.repeat(44),'1'.repeat(31),'1'.repeat(33),{},null,17,`https://evil/${MINT}`,`${MINT},${QUOTE}`]) {
 test(`exact mint rejects ${JSON.stringify(invalid)}`,()=>{
  if(typeof invalid==='string'&&invalid===MINT.toLowerCase()) {
   // A case-changed string can be another valid public key; never resolve it to the original.
   assert.throws(()=>decode([pool()],{mint:invalid}),/identity_mismatch|invalid_mint/);return;
  }
  assert.equal(isExactMint(invalid),false);
 });
}
test('valid key encoding is not onchain mint/issuer verification',()=>{
 for(const mint of [MINT,QUOTE,OTHER,'1'.repeat(32),key(10)])assert.equal(isExactMint(mint),true);
});
test('raw hash binds original bytes, not reserialized fields',()=>{
 const bytes=encode(' [ '+JSON.stringify(pool())+' ] '),s=decodeObservation({mint:MINT,bytes,requestStartedMs:AT,retrievedMs:AT});
 assert.equal(s.source.responseSha256,createHash('sha256').update(bytes).digest('hex'));
 assert.notEqual(s.source.responseSha256,decode().source.responseSha256);
});
test('selection permutation invariant; known zero before unknown; ties ASCII address',()=>{
 const a=pool({pairAddress:key(1),liquidity:{usd:0}}),b=pool({pairAddress:key(2),liquidity:{usd:0}}),c=pool({pairAddress:key(3),liquidity:{usd:null}});
 for(const ps of [[a,b,c],[c,b,a],[b,a,c],[c,a,b]])assert.equal(decode(ps).selectedPool.pairAddress,a.pairAddress);
 assert.equal(decode([a,b,pool({pairAddress:key(4),liquidity:{usd:100}})]).selectedPool.pairAddress,key(4));
 assert.equal(decode([c]).selectedPool.liquidityUsd,null);
});
test('quote-side higher liquidity never substitutes base token figures',()=>{
 const q=pool({pairAddress:key(2),baseToken:{address:OTHER,symbol:'OFFLINE'},quoteToken:{address:MINT},liquidity:{usd:1e8}});
 const r=evaluate([pool(),q]);assert.equal(r.poolAddress,key(1));assert.equal(r.liquidity.value.reportedUsd,25000);
 assert.ok(r.redFlags.value.flags.includes('quote_side_matches_not_attributed'));
 const qonly=evaluate([q]);assert.equal(qonly.identity,'quote_side_only');
 for(const metric of ['liquidity','activityAcceleration','transactionImbalance','poolAge','priceImpulse'])assert.equal(qonly[metric].value,null);
});
test('exact quote pin restricts canonical pool sample; no global ranking',()=>{
 const p=pool({pairAddress:key(2),quoteToken:{address:OTHER},liquidity:{usd:999999}});
 assert.equal(decode([pool(),p],{quoteMint:QUOTE}).selectedPool.pairAddress,key(1));
 const r=evaluate([pool(),p],{quoteMint:QUOTE});assert.equal(r.requestedQuoteMint,QUOTE);assert.equal(r.pair.quoteMint,QUOTE);
 assert.equal(decode([p],{quoteMint:QUOTE}).identity,'no_eligible_base_pool');
 assert.equal(decode([p]).scope.complete,false);
 assert.throws(()=>decode([p],{quoteMint:MINT}));
});
test('empty bounded response is not proof of no markets or invalid mint',()=>{
 const r=evaluate([]);assert.equal(r.identity,'no_returned_pools');assert.equal(r.scope.complete,false);
 assert.equal(r.liquidity.state,'unavailable');assert.ok(r.redFlags.value.flags.includes('no_returned_pools'));
});
test('null, missing and reported zero liquidity stay distinct',()=>{
 for(const liquidity of [undefined,null,{}, {usd:null}])assert.equal(evaluate([pool({liquidity})]).liquidity.value,null);
 const zero=evaluate([pool({liquidity:{usd:0}})]);assert.equal(zero.liquidity.value.reportedUsd,0);
 assert.ok(zero.redFlags.value.flags.includes('reported_zero_liquidity'));
 for(const v of ['',false,'0',[],{},-1,1e20])assert.throws(()=>decode([pool({liquidity:{usd:v}})]));
});
test('zero transaction windows: no invented ratios, divide by zero or pressure',()=>{
 const z={buys:0,sells:0},r=evaluate([pool({txns:{m5:z,h1:z}})]);
 assert.equal(r.activityAcceleration.value.ratio,null);assert.equal(r.activityAcceleration.value.comparison,'no_reported_activity');
 assert.equal(r.transactionImbalance.state,'unavailable');assert.equal(r.transactionImbalance.value,null);
 const one=evaluate([pool({txns:{m5:{buys:0,sells:0},h1:{buys:1,sells:0}}})]);
 assert.equal(one.activityAcceleration.value.ratio,0);assert.equal(one.activityAcceleration.value.comparison,'lower');
});
test('missing windows never fabricate zero/buy-sell pressure',()=>{
 for(const txns of [undefined,null,{}, {m5:{buys:1}}, {m5:{buys:null,sells:0}}]){
  const r=evaluate([pool({txns})]);assert.equal(r.activityAcceleration.value,null);assert.equal(r.transactionImbalance.value,null);
 }
 const r=evaluate([pool({txns:{m5:{buys:1,sells:1}}})]);
 assert.equal(r.activityAcceleration.value,null);assert.equal(r.transactionImbalance.value.normalizedDifference,0);
});
test('inconsistent nested windows withhold acceleration and imbalance; flag volume inconsistency',()=>{
 const r=evaluate([pool({txns:{m5:{buys:31,sells:0},h1:{buys:30,sells:20}},volume:{m5:10,h1:9}})]);
 assert.equal(r.activityAcceleration.value,null);assert.equal(r.transactionImbalance.value,null);
 assert.ok(r.redFlags.value.flags.includes('transaction_windows_inconsistent'));
 assert.ok(r.redFlags.value.flags.includes('volume_windows_inconsistent'));
});
test('proof over deterministic count lattice: ratio bounded [0,12], imbalance [-1,1], symmetry',()=>{
 for(let b=0;b<=30;b+=3)for(let s=0;s<=30;s+=3){
  const r=evaluate([pool({txns:{m5:{buys:b,sells:s},h1:{buys:b+30,sells:s+30}}})]);
  assert.ok(r.activityAcceleration.value.ratio>=0&&r.activityAcceleration.value.ratio<=12);
  if(b+s){
   const v=r.transactionImbalance.value.normalizedDifference;assert.ok(v>=-1&&v<=1);
   assert.equal(v,(b-s)/(b+s));
   const swap=evaluate([pool({txns:{m5:{buys:s,sells:b},h1:{buys:s+30,sells:b+30}}})]);
   assert.equal(swap.transactionImbalance.value.normalizedDifference,v===0?0:-v);
  }
 }
});
test('binary clock proof: retrieval, HTTP/envelope time and creation never qualify price/trade time',()=>{
 for(const extra of [{},{timestamp:AT,updatedAt:new Date(AT).toISOString(),observedAt:new Date(AT).toISOString()}]){
  const s=decode([pool({...extra,pairCreatedAt:AT})]),r=evaluatePulse(s,AT);
  assert.equal(s.source.clock.retrievedAt,new Date(AT).toISOString());
  for(const f of ['providerObservedAt','underlyingTradeAt','windowEndAt'])assert.equal(s.source.clock[f],null);
  assert.equal(r.priceImpulse.state,'unavailable');assert.equal(r.priceImpulse.value,null);
  for(const f of ['liquidity','activityAcceleration','transactionImbalance','poolAge'])assert.equal(r[f].state,'uncertain');
 }
});
test('expired/future retrieval cannot yield financial calculations even with recent-looking provider fields',()=>{
 const s=decode();
 for(const now of [AT-1,AT+60001]){
  const r=evaluatePulse(s,now);for(const f of ['liquidity','activityAcceleration','transactionImbalance','poolAge','priceImpulse'])assert.equal(r[f].value,null);
  assert.ok(r.redFlags.value.flags.includes(now<AT?'retrieval_in_future':'retrieval_expired'));
 }
 assert.notEqual(evaluatePulse(s,AT+60000).liquidity.value,null);
});
test('pool age boundaries measured to retrieval, not token creation/current trade',()=>{
 for(const [ms,expected] of [[0,'under_one_hour'],[3599999,'under_one_hour'],[3600000,'one_hour_to_one_day'],[86400000,'at_least_one_day']]){
  assert.equal(evaluate([pool({pairCreatedAt:AT-ms})]).poolAge.value.context,expected);
 }
 for(const pairCreatedAt of [null,undefined,AT+1,Math.floor(AT/1000),0])assert.equal(evaluate([pool({pairCreatedAt})]).poolAge.value,null);
});
for(const [name,edit] of [
 ['wrong chain',{chainId:'ethereum'}],['unknown chain',{chainId:null}],['wrong mint matching spoofed symbol',{baseToken:{address:OTHER,symbol:'OFFLINE'},quoteToken:{address:QUOTE}}],
 ['ticker identity',{baseToken:{address:'JUP',symbol:'OFFLINE'}}],['identical sides',{quoteToken:{address:MINT}}],
 ['bad pool',{pairAddress:'spoof'}],['missing dex',{dexId:null}],['source injection',{url:'https://evil.test/'}],
 ['label control',{baseToken:{address:MINT,symbol:'USDC\u200b'}}],['unsafe numeric counts',{txns:{m5:{buys:1e20,sells:0}}}],
 ['fractional counts',{txns:{m5:{buys:1.1,sells:0}}}],['negative counts',{txns:{m5:{buys:-1,sells:0}}}],
 ['string count',{txns:{m5:{buys:'1',sells:0}}}],['invalid price',{priceUsd:'0x20'}],['impossible change',{priceChange:{m5:-101}}],
 ['string timestamp',{pairCreatedAt:String(AT)}],['wrong volume',{volume:{m5:false}}],
])test(`strict packet rejects ${name}`,()=>assert.throws(()=>decode([pool(edit)])));
test('duplicate pool rejected rather than doubled or silently selected',()=>assert.throws(()=>decode([pool(),pool()]),/duplicate_pool/));
test('catalog bounded, unknown envelope rejected, no partial truncation',()=>{
 for(const data of [null,{}, {pairs:[pool()]},Array.from({length:65},()=>pool())])assert.throws(()=>decode(data));
});
for(const text of ['[{"a":1,"a":2}]','{"a":1,"\\u0061":2}','{"buys":1.00000000000000001}','{"sells":1e0}','{"pairCreatedAt":9007199254740993}','-0','1e999','[] trailing','['.repeat(14)+']'.repeat(14)]) {
 test(`strict JSON rejects ambiguity ${text.slice(0,55)}`,()=>assert.throws(()=>parsePacket(text)));
}
test('oversize, invalid UTF8, BOM and invalid acquisition/evaluation clocks fail closed',()=>{
 for(const bytes of [new Uint8Array(262145),new Uint8Array([0xff]),encode('\ufeff[]')])assert.throws(()=>decodeObservation({mint:MINT,bytes,requestStartedMs:AT,retrievedMs:AT}));
 for(const options of [{retrievedMs:AT-11},{retrievedMs:AT+4000},{requestStartedMs:NaN},{retrievedMs:1.5}])assert.throws(()=>decode(undefined,options));
 for(const now of [NaN,-1,Infinity,1.1])assert.throws(()=>evaluatePulse(decode(),now));
 assert.throws(()=>evaluatePulse(JSON.parse(JSON.stringify(decode())),AT),/invalid_evaluation/);
 assert.throws(()=>endpointFor('USDC'));
});
