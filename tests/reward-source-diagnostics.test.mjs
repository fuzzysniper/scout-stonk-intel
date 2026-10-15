import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {AT,T,sourceGraph} from './pairs-fixtures.mjs';
const require=createRequire(import.meta.url),build=process.env.HISTORY_TEST_BUILD;
const {diagnoseRewardReceipt:diagnose,diagnoseRewardReceipts:batch,DIAGNOSTIC_LIMITS}=require(path.join(build,'lib/reward-source-diagnostics.js'));
const {createPairSource}=require(path.join(build,'lib/pairs-source.js'));
const iso=ms=>new Date(ms).toISOString(),source='https://www.stonkfun.xyz/api/v2/tokens/'+T.mint+'/rewards';
// Explicit synthetic clocks; never financial observations or screenshots.
const receipt=(age='0')=>({source,receivedAt:iso(AT),providerGeneratedAt:iso(AT),bodySha256:'a'.repeat(64),headers:{Age:age,Date:new Date(AT).toUTCString(),'Cache-Control':'public, max-age=60'}});
test('offline diagnostic distinguishes exact 300 boundary from rejected Age 301/370/371',()=>{
 for(const [value,state] of [['300','within_recorded_limit'],['301','stale'],['370','stale'],['371','stale']]){
  const r=diagnose(receipt(value),iso(AT));assert.equal(r.transport.atReceipt,state);assert.equal(r.eligibility,'not_evaluated');assert.equal(r.transport.age.seconds,Number(value));
 }
 assert.equal(DIAGNOSTIC_LIMITS.transportSeconds,300);
});
test('missing/malformed/conflicting transport metadata remains explicit and never becomes zero',()=>{
 const missing=receipt();missing.headers={};assert.equal(diagnose(missing,iso(AT)).transport.atReceipt,'not_recorded');assert.equal(diagnose(missing,iso(AT)).knownVisibilityBudgetAtReceiptSeconds,null);
 for(const age of ['', '-1','1.5','Infinity','9007199254740992'])assert.equal(diagnose(receipt(age),iso(AT)).transport.atReceipt,'invalid');
 const r=receipt();r.headers['Source-Age']='371';assert.equal(diagnose(r,iso(AT)).transport.atReceipt,'stale');
 r.headers.age='1';assert.equal(diagnose(r,iso(AT)).state,'invalid_evidence');
});
test('source generation, retrieval residence, HTTP Date and advertised TTL are different clocks',()=>{
 const p={...receipt('239'),providerGeneratedAt:iso(AT-239_000),requestStartedAt:iso(AT-200),headers:{Age:'239',Date:new Date(AT-240_000).toUTCString(),'Cache-Control':'public, max-age=60'}};
 const r=diagnose(p,iso(AT+62_000));assert.equal(r.transport.atReceipt,'within_recorded_limit');assert.equal(r.transport.lowerBoundSecondsAtAnalysis,301);assert.equal(r.clocks.residenceSeconds,62);assert.equal(r.clocks.providerAgeSecondsAtAnalysis,301);assert.equal(r.clocks.dateAgeSecondsAtReceipt,240);assert.equal(r.clocks.requestDurationSeconds,0.2);assert.equal(r.lifetimeClock,'stale');assert.equal(r.knownVisibilityBudgetAtReceiptSeconds,61);assert.equal(r.heldPastKnownVisibilityBudget,true);assert.equal(r.pastAdvertisedMaxAge,true);
 const generatedOld=diagnose({...receipt('0'),providerGeneratedAt:iso(AT-371_000)},iso(AT));assert.equal(generatedOld.transport.atReceipt,'within_recorded_limit');assert.equal(generatedOld.lifetimeClock,'stale');
});
test('future/unknown provider clocks and invalid receipt/reference times cannot imply verified evidence',()=>{
 assert.equal(diagnose({...receipt(),providerGeneratedAt:iso(AT+1)},iso(AT)).lifetimeClock,'future');
 const unknown=diagnose({...receipt(),providerGeneratedAt:null},iso(AT));assert.equal(unknown.lifetimeClock,'not_recorded');assert.equal(unknown.knownVisibilityBudgetAtReceiptSeconds,null);
 for(const p of [{...receipt(),receivedAt:iso(AT+1)},{...receipt(),providerGeneratedAt:'bad'},{...receipt(),requestStartedAt:iso(AT+1)}])assert.equal(diagnose(p,iso(AT)).state,'invalid_evidence');
 assert.equal(diagnose(receipt(),'bad').state,'invalid_evidence');
});
test('invalid identities, extra fields and validators cannot inject arbitrary URLs, secrets or eligibility',()=>{
 const r=diagnose({...receipt(),headers:{ETag:'private-shaped-value',Authorization:'never-print-this'},secret:'never-print-this'},iso(AT));assert.equal(r.conditionalValidatorsRecorded,true);assert.doesNotMatch(JSON.stringify(r),/private-shaped|never-print/);assert.equal(r.eligibility,'not_evaluated');
 for(const url of ['http://www.stonkfun.xyz/api/v2/tokens/'+T.mint+'/rewards',source+'?key=never-print-this','https://evil.invalid/rewards']){const d=diagnose({...receipt(),source:url},iso(AT));assert.equal(d.state,'invalid_evidence');assert.equal(d.source,null);assert.doesNotMatch(JSON.stringify(d),/never-print|evil/);}
});
test('bounded batch is pure, does not mutate evidence, and rejects excess/invalid input',()=>{
 const p=receipt(),before=JSON.stringify(p);assert.equal(batch({asOf:iso(AT),receipts:[p]}).receipts.length,1);assert.equal(JSON.stringify(p),before);
 assert.throws(()=>batch({asOf:iso(AT),receipts:Array(49).fill(p)}));assert.throws(()=>batch({asOf:'bad',receipts:[]}));assert.throws(()=>batch(null));
});
test('replays actual committed Python/Node/Next response clocks and verifies captured body hashes without network',async()=>{
 const captures=JSON.parse(await readFile(new URL('../docs/evidence/reward-evidence-2026-10-15.json',import.meta.url),'utf8'));
 const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('Network forbidden');};
 try{for(const [name,age,state] of [['directPythonAggregate',73,'within_recorded_limit'],['directNodeAggregate',239,'within_recorded_limit'],['nextAggregate',371,'stale']]){
  const p=captures[name],body=JSON.parse(p.body);assert.equal(createHash('sha256').update(p.body).digest('hex'),p.bodySha256);
  const receivedAt=new Date(p.capturedAt).toISOString(); // Canonical millisecond UTC input; preserve original capture in evidence.
  const r=diagnose({source:p.source??p.url,receivedAt,providerGeneratedAt:body.generatedAt,headers:p.headers,bodySha256:p.bodySha256},receivedAt);
  assert.equal(r.state,'diagnosed');assert.equal(r.transport.age.seconds,age);assert.equal(r.transport.atReceipt,state);assert.equal(r.lifetimeClock,age>300?'stale':'within_recorded_limit');assert.equal(r.eligibility,'not_evaluated');
 }}finally{globalThis.fetch=original;}
});
test('unchanged real pair-source gate rejects synthetic Age >300 and malformed Age before accepting mode',async()=>{
 for(const [value,expected] of [['300','verified_reward'],['301','source_unavailable'],['370','source_unavailable'],['371','source_unavailable'],['bad','source_unavailable']]){
  const graph=sourceGraph();const fetcher=async(url,opts)=>{const response=await graph.fetcher(url,opts);if(String(url).includes('/api/v2/'))response.headers.set('Age',value);return response;};
  const read=createPairSource(fetcher,()=>AT);const result=await read();assert.equal(result.value.tokens[0].modeVerification,expected);assert.equal(graph.calls.length,3);
  if(expected==='source_unavailable'){assert.equal(result.value.tokens[0].modeFailure,'stale_transport');assert.equal(result.sourceStatus,'degraded');}
 }
});
test('five-minute degraded cache retains rejection without retries at one-minute backoff; recovers at normal expiry',async()=>{
 let now=AT,stale=true;const graph=sourceGraph({now:()=>now});
 const read=createPairSource(async(url,opts)=>{const r=await graph.fetcher(url,opts);if(String(url).includes('/api/v2/'))r.headers.set('Age',stale?'371':'0');return r;},()=>now);
 assert.equal((await read()).sourceStatus,'degraded');const requests=graph.calls.length;
 stale=false;
 for(const seconds of [59,60,299]){now=AT+seconds*1000;assert.equal((await read()).sourceStatus,'degraded');assert.equal(graph.calls.length,requests);}
 now=AT+300_000;const recovered=await read();assert.equal(recovered.sourceStatus,'available');assert.equal(recovered.value.tokens[0].modeVerification,'verified_reward');assert.equal(graph.calls.length,requests*2);
});
test('offline CLI is bounded, sanitized, and performs no persistence',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'scout-reward-clocks-')),file=path.join(dir,'receipt.json'),cli=path.join(build,'scripts/reward-source-diagnostics.js'),run=promisify(execFile);
 try{
  await writeFile(file,JSON.stringify({asOf:iso(AT),receipts:[receipt()]}));const r=await run(process.execPath,[cli,file]);assert.equal(JSON.parse(r.stdout).eligibility,'not_evaluated');
  await writeFile(file,'private invalid JSON');await assert.rejects(run(process.execPath,[cli,file]),e=>e.code===1 && !e.stderr.includes('private'));
  await writeFile(file,' '.repeat(2*1024*1024+1));await assert.rejects(run(process.execPath,[cli,file]),e=>e.code===1 && /rejected/.test(e.stderr));
 }finally{await rm(dir,{recursive:true,force:true});}
});
