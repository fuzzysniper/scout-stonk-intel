import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import path from 'node:path';
import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';
import {CARDS,MINT,OTHER,AT,START,series} from './fixtures.mjs';import {subject,second,receipt,registry,snapshot,point,input} from './pipeline-fixtures.mjs';
const load=p=>createRequire(import.meta.url)(path.join(process.env.CARDS_TEST_BUILD,'app/consumer/cards',p+'.js'));
const {parseExactJson,numberLexeme}=load('exact-json'),{canonicalDecimal}=load('decimal'),{utcMicroseconds}=load('clock');
const {normalizeCapture,verifyRegistry}=load('receipts'),{runPipeline,publicPipelineReport}=load('pipeline'),{analyzeSeries,compareObserved}=load('performance');
function replaceBody(c,body){const bytes=Buffer.from(body);return {...c,bodyBase64:bytes.toString('base64'),bodySha256:'sha256:'+createHash('sha256').update(bytes).digest('hex')};}
test('JSON reader preserves exact original decimals, exponents and unsafe integer lexemes',()=>{
 const j=parseExactJson('{"p":0.000000012345678901234567890123456789,"raw":18446744073709551615,"e":1.23e-7,"missing":null,"zero":0}');
 assert.equal(numberLexeme(j.p),'0.000000012345678901234567890123456789');assert.equal(numberLexeme(j.raw),'18446744073709551615');assert.equal(canonicalDecimal(numberLexeme(j.e)),'0.000000123');assert.equal(j.missing,null);assert.equal(numberLexeme(j.zero),'0');assert.equal(numberLexeme(parseExactJson('1e999999')),'1e999999');assert.equal(canonicalDecimal('1e999999'),null);assert.equal(numberLexeme({lexeme:'1'}),null);
});
test('duplicate properties, prototype keys, malformed JSON and excessive complexity reject',()=>{
 for(const text of ['{"a":1,"a":2}','{"__proto__":{}}','{"constructor":3}','[1,]','[01]','1e','"\\ud800"','NaN','{} trailing','['.repeat(33)+'0'+']'.repeat(33),JSON.stringify(Array(4001).fill(1))])assert.throws(()=>parseExactJson(text));
});
test('decimal normalization never silently truncates or admits negative/oversized values',()=>{
 for(const [a,b] of [['1e-18','0.000000000000000001'],['100.2300','100.23'],['0.000','0'],['123e2','12300'],['1.23e-2','0.0123']])assert.equal(canonicalDecimal(a),b);
 for(const x of ['-1','01','Infinity','1e999','1'.repeat(101),'1e31'])assert.equal(canonicalDecimal(x),null);
});
test('microsecond clock validation rejects impossible dates and preserves the skew boundary',()=>{
 assert.equal(utcMicroseconds('2026-10-19T18:00:00.000001Z')-utcMicroseconds(AT),1n);assert.equal(utcMicroseconds('2026-10-19T18:00:00+00:00'),utcMicroseconds(AT));assert.equal(utcMicroseconds('2026-02-31T00:00:00Z'),null);
 const c=receipt(snapshot(),{receivedAt:'2026-10-19T18:00:01.000001Z'});assert.equal(normalizeCapture(c,subject,AT).reason,'invalid_source_clock');
});
test('real source shape normalizes exact untimed USD snapshots; zero and null stay distinct',()=>{
 const body=JSON.stringify(snapshot({liquidityUsd:0,volume24hUsd:null})).replace('0.000123','0.000000012345678901234567890123456789');const r=normalizeCapture(receipt(body),subject,AT);
 assert.equal(r.state,'normalized');assert.equal(r.record.kind,'untimed_usd_snapshot');assert.equal(r.record.actualMarketAt,null);assert.equal(r.record.exact.priceUsd,'0.000000012345678901234567890123456789');assert.equal(r.record.exact.liquidityUsd,'0');assert.equal(r.record.exact.volume24hUsd,null);assert.equal(r.record.rights,'unverified');assert.equal(r.record.capMeaning,'provider_report_supply_definition_unknown');
});
test('an undocumented market timestamp or quote price does not turn this adapter into a history source',()=>{
 const r=normalizeCapture(receipt(snapshot({observedAt:AT,priceQuote:123})),subject,AT);assert.equal(r.record.kind,'untimed_usd_snapshot');assert.equal(r.record.actualMarketAt,null);
});
test('capture hash binds the exact body; tampered bytes and encoding never normalize',()=>{
 let c=receipt(snapshot());assert.equal(normalizeCapture({...c,bodySha256:'sha256:'+'0'.repeat(64)},subject,AT).reason,'source_hash_mismatch');assert.equal(normalizeCapture({...c,bodyBase64:c.bodyBase64+'!'},subject,AT).reason,'invalid_receipt');
 c=replaceBody(c,'{"data":{"token":1,"token":2}}');assert.equal(normalizeCapture(c,subject,AT).reason,'invalid_source_json');
});
test('exact token/quote/pool and known source URLs are mandatory, including reversed base/quote',()=>{
 for(const mutate of [j=>j.data.token.mint=OTHER,j=>j.data.token.pool=OTHER,j=>j.data.token.quote.mint=OTHER,j=>j.data.network='devnet']){const j=snapshot();mutate(j);assert.equal(normalizeCapture(receipt(j),subject,AT).reason,'source_identity_mismatch');}
 for(const url of ['https://www.stonkfun.xyz/api/public/v1/tokens/'+OTHER,'https://example.invalid/data','https://secret@www.stonkfun.xyz/api/public/v1/tokens/'+MINT,'https://www.stonkfun.xyz/api/public/v1/tokens/'+MINT+'?override=1'])assert.equal(normalizeCapture(receipt(snapshot(),{url}),subject,AT).state,'withheld');
});
test('403 is rejection, 429 is rate limit, 503 is unavailable; no retries or error-body parsing',()=>{
 for(const [httpStatus,reason] of [[403,'source_rejected'],[429,'source_rate_limited'],[503,'source_unavailable']])assert.equal(normalizeCapture(receipt('not json',{httpStatus}),subject,AT).reason,reason);
});
test('stale transport, future source generation, slow receipt and unsupported precision withhold',()=>{
 assert.equal(normalizeCapture(receipt(snapshot(),{ageSeconds:301}),subject,AT).reason,'stale_transport');assert.equal(normalizeCapture(receipt(snapshot(),{ageSeconds:null}),subject,AT).reason,'stale_transport');
 const j=snapshot();j.meta.generatedAt='2026-10-19T18:00:01.000001Z';assert.equal(normalizeCapture(receipt(j),subject,AT).reason,'invalid_source_clock');
 assert.equal(normalizeCapture(receipt(snapshot(),{requestedAt:'2026-10-19T17:59:47.999Z'}),subject,AT).reason,'invalid_source_clock');assert.equal(normalizeCapture(receipt(snapshot({priceUsd:-1})),subject,AT).reason,'unsupported_decimal_precision');
});
test('registry exact mint, decimals/program and original bytes are independently required',()=>{
 assert.equal(verifyRegistry(registry(),AT),true);const c=registry(),j=JSON.parse(Buffer.from(c.bodyBase64,'base64').toString());j.data.pairs[0].decimals=9;assert.equal(verifyRegistry(replaceBody(c,JSON.stringify(j)),AT),false);
 const x=input();x.registry.bodySha256='sha256:'+'0'.repeat(64);const r=publicPipelineReport(runPipeline(x));assert.equal(r.registryRecordMatched,false);assert.ok(r.subjects[0].reasons.includes('registry_unverified'));assert.equal(r.subjects[0].normalizedSnapshots,0);
});
test('genuine-source inspection yields precise insufficiency and no financial publication or rankings',()=>{
 const x=input();const r=runPipeline(x),p=publicPipelineReport(r);assert.equal(p.synthetic,false);assert.equal(p.subjects[0].normalizedSnapshots,1);assert.equal(p.subjects[0].qualifiedPublicPricePoints,0);assert.ok(p.subjects[0].reasons.includes('actual_market_time_missing'));assert.ok(p.subjects[0].reasons.includes('quote_price_history_missing'));assert.equal(p.ranking.state,'withheld');assert.equal(p.subjects[0].metrics.appreciation,null);
 x.rights={permission:'approved',publicationAllowed:true};x.registry.approved=true;const serialized=JSON.stringify(publicPipelineReport(runPipeline(x)));for(const key of ['bodyBase64','priceUsd','liquidityUsd','volume24hUsd','marketCapUsd','123000','0.000123'])assert.ok(!serialized.includes(key));assert.equal(p.rights.approvalOverrideAvailable,false);
});
test('synthetic rehearsal can test correct mathematics but public projection cannot call it real',()=>{
 const x=input(true),r=runPipeline(x);assert.equal(r.subjects[0].finding.state,'observed');assert.equal(r.subjects[0].finding.appreciationPct,'48.000000');const p=publicPipelineReport(r);assert.equal(p.synthetic,true);assert.equal(p.subjects[0].offlineFixturePoints,25);assert.equal(p.subjects[0].qualifiedPublicPricePoints,0);assert.equal(p.ranking.reason,'synthetic_fixture_not_live');assert.equal(p.subjects[0].metrics.momentum,null);
});
test('mixed provenance, unsupported sources, missing observations and source duplicates do not produce a leaderboard',()=>{
 const x=input();x.captures.push({subjectMint:MINT,receipt:point(0)});assert.ok(publicPipelineReport(runPipeline(x)).subjects[0].reasons.includes('synthetic_not_live'));
 const y=input(true);y.captures[1]=y.captures[0];assert.equal(runPipeline(y).subjects[0].finding.reason,'duplicate_observation');const z=input(true);z.captures.pop();assert.equal(runPipeline(z).subjects[0].finding.reason,'missing_price_history');
});
test('input bounds, unknown subject references and duplicate pools fail before inspecting captures',()=>{
 for(const mutate of [x=>x.subjects.push(x.subjects[0]),x=>x.captures[0].subjectMint=OTHER,x=>x.captures=Array(129).fill(x.captures[0]),x=>x.context='production_live',x=>x.endAt=START]){const x=input();mutate(x);assert.throws(()=>runPipeline(x));}
});
test('maximum drawdown is chronological peak-to-trough, distinct from current peak drawdown',()=>{
 const prices=Array(25).fill('200');prices[0]='100';prices[5]='300';prices[6]='150';const r=analyzeSeries(series(prices),START,AT,AT);assert.equal(r.maximumDrawdownPct,'-50.000000');assert.equal(r.drawdownFromObservedPeakPct,'-33.333333');assert.equal(r.observedPeakAt,'2026-10-18T23:00:00.000Z');
});
test('irregular or concentrated spike sampling cannot inflate sustained momentum eligibility',()=>{
 const s=series();s.points.splice(1,0,{...s.points[0],observedAt:new Date(Date.parse(START)+1).toISOString(),priceQuote:'300'});assert.equal(analyzeSeries(s,START,AT,AT).reason,'cadence_not_comparable');
 const t=series();t.points[1].observedAt=new Date(Date.parse(START)+3600001).toISOString();assert.equal(analyzeSeries(t,START,AT,AT).reason,'cadence_not_comparable');
});
test('sub-six-decimal return differences rank by exact rational, genuine ties still share rank',()=>{
 const a={...series(Array(25).fill('100')),mint:subject.mint,poolMint:subject.poolMint},b={...series(Array(25).fill('100')),mint:second.mint,poolMint:second.poolMint};a.points[24].priceQuote='100.0000000001';b.points[24].priceQuote='100.0000000002';const r=compareObserved([a,b],CARDS,START,AT,AT);assert.equal(r.state,'observed_sample');assert.equal(r.rows[0].mint,second.mint);assert.deepEqual(r.rows.map(x=>x.rank),[1,2]);assert.equal(r.rows[0].appreciationPct,r.rows[1].appreciationPct);
});
test('offline CLI emits only the safe projection and fixed failures, never source bodies',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'cards-inspect-'));try{const file=path.join(dir,'input.json');writeFileSync(file,JSON.stringify(input()));let r=spawnSync(process.execPath,['scripts/cards-research-report.mjs',file],{env:{...process.env,CARDS_RESEARCH_BUILD:process.env.CARDS_TEST_BUILD},encoding:'utf8'});assert.equal(r.status,0);assert.equal(JSON.parse(r.stdout).subjects[0].metrics.appreciation,null);assert.ok(!r.stdout.includes('bodyBase64'));writeFileSync(file,'{"private":"DO NOT ECHO"');r=spawnSync(process.execPath,['scripts/cards-research-report.mjs',file],{env:{...process.env,CARDS_RESEARCH_BUILD:process.env.CARDS_TEST_BUILD},encoding:'utf8'});assert.equal(r.status,1);assert.ok(!r.stderr.includes('DO NOT ECHO'));}finally{rmSync(dir,{recursive:true,force:true});}
});


test('momentum thresholds use exact fractions and context decimals, never rounded percentages',()=>{
 const a=series();a.points[12].priceQuote='103.000000000000000001';assert.equal(analyzeSeries(a,START,AT,AT).momentum,'no_clear_pattern');
 const b=series();b.points.forEach(p=>p.liquidityUsd='9999.999999999999999999');assert.equal(analyzeSeries(b,START,AT,AT).momentum,'insufficient_evidence');
 const c=series();c.points.forEach(p=>p.liquidityUsd='10000');assert.equal(analyzeSeries(c,START,AT,AT).momentum,'sustained_expansion');
});
test('metadata projection allowlists subject identity and never forwards unknown input properties',()=>{
 const x=input();x.subjects[0].private='MUST NOT FORWARD';assert.ok(!JSON.stringify(publicPipelineReport(runPipeline(x))).includes('MUST NOT FORWARD'));
});
