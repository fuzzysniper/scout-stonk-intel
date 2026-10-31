import {test} from 'node:test';import assert from 'node:assert/strict';
import {require,build,inspection,MINT,CLOCK} from './fixtures.mjs';
import {full} from '../v4-oracle-farming/fixture.mjs';
const {composeOracle,composeOracleResponse}=require(build+'/app/api/v4/ca-intelligence/compose-oracle.js');
const {POST,GET}=require(build+'/app/api/v4/ca-intelligence/route.js');
const {unknownRiskFindings}=require(build+'/lib/v4-ca-intelligence/risk-evidence.js');
const {analyzeFarmEvidence}=require(build+'/lib/v4-oracle/farming/index.js');
const {isLensResponse}=require(build+'/app/lens/intelligence-model.js');
const {farmDetail,isFarmDisclosure}=require(build+'/app/lens/evidence-disclosure.js');

test('actual composition retains all nine original findings, adds ten + five GRAYs, no source/clock invention or input mutation',()=>{
 const jupiter=unknownRiskFindings(),view={...inspection(),riskFindings:jupiter},before=structuredClone(view);
 const combined=composeOracle(view,CLOCK);assert.equal(combined.riskFindings.length,24);assert.ok(isLensResponse(combined,MINT));
 assert.deepEqual(combined.riskFindings.slice(0,9),jupiter);assert.deepEqual(view,before);
 for(const f of combined.riskFindings.slice(9)){assert.equal(f.tone,'gray');for(const k of ['value','source','observedAt','responseSha256'])assert.equal(f[k],null);}
 assert.equal(combined.farmEvidence.cohorts,null);assert.equal(combined.farmEvidence.details.exits.status,'withheld');
 for(const k of ['facts','windows','controls','observations','contradictions','gaps','identity'])assert.deepEqual(combined[k],view[k]);
});
test('existing Jupiter RED and source clocks/hashes remain byte-identical; no generic green clearance',()=>{
 const v=inspection(),out=composeOracle(v,CLOCK);assert.deepEqual(out.riskFindings.slice(0,v.riskFindings.length),v.riskFindings);
 assert.equal(out.riskFindings.find(f=>f.id==='freeze-authority').tone,'red');assert.equal(out.riskFindings.find(f=>f.id==='onchain-freeze-authority').tone,'gray');
 assert.equal(out.riskFindings.find(f=>f.id==='onchain-lp-custody').tone,'gray');assert.equal(out.riskFindings.find(f=>f.id==='onchain-exit-route').tone,'gray');
});
test('composition makes zero network calls and preserves successful private response status and security headers',async()=>{
 const fetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('NO_NETWORK');};try{
 const r=Response.json(inspection(),{headers:{'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Cookie, Origin'}});
 const out=await composeOracleResponse(r,CLOCK);assert.equal(out.status,200);assert.equal(out.headers.get('set-cookie'),null);assert.deepEqual([...out.headers],[...r.headers]);assert.ok(isLensResponse(await out.json(),MINT));
 }finally{globalThis.fetch=fetch;}
});
test('denials, malformed responses and default-OFF route remain unchanged and never invoke acquisition',async()=>{
 for(const status of [401,403,429,503]){const r=Response.json({error:'original_denial'},{status,headers:{'Cache-Control':'private, no-store'}});assert.equal(await composeOracleResponse(r,CLOCK),r);assert.equal((await r.json()).error,'original_denial');}
 for(const value of [{error:'unknown'},null,{...inspection(),mint:'invalid'}]){const r=Response.json(value);assert.equal(await composeOracleResponse(r,CLOCK),r);}
 const original=process.env.VERCEL_ENV,fetch=globalThis.fetch;process.env.VERCEL_ENV='development';let calls=0;globalThis.fetch=()=>{calls++;throw Error('NO_NETWORK');};try{
 for(const r of [await POST(new Request('http://localhost/api/v4/ca-intelligence',{method:'POST'})),GET()]){assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'private_development_off'});assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('set-cookie'),null);}assert.equal(calls,0);
 }finally{globalThis.fetch=fetch;if(original===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=original;}
});
test('complete B details survive one-tap disclosure: exact ratios, original clock records, transactions and windows',()=>{
 const a=analyzeFarmEvidence(full());assert.ok(isFarmDisclosure(a));
 assert.deepEqual(farmDetail(a,'farming-exits'),a.details.exits);assert.equal(farmDetail(a,'freeze-authority'),undefined);
 const d=farmDetail(a,'farming-exits');assert.equal(d.metrics.soldRaw,'600');assert.equal(d.evidence[0].clockResponseSha256,'d'.repeat(64));
 assert.ok(d.evidence.some(e=>e.clockResponseSha256==='d'.repeat(64)));assert.ok(d.transactions[0].signature);assert.equal(d.window.status,'complete');
 const v={...inspection(full().mint),riskFindings:a.findings,farmEvidence:a};assert.ok(isLensResponse(v,full().mint));
});
test('malformed/unbounded detailed records fail closed without changing canonical risk validation',()=>{
 const a=analyzeFarmEvidence(full()),v={...inspection(full().mint),riskFindings:a.findings};
 for(const farmEvidence of [null,{}, {...a,details:{}},{...a,details:{...a.details,exits:{...a.details.exits,reason:'x'.repeat(2049)}}}, {...a,details:{...a.details,exits:{...a.details.exits,metrics:{x:NaN}}}}])assert.equal(isLensResponse({...v,farmEvidence},full().mint),false);
 const cycle={};cycle.x=cycle;assert.equal(isFarmDisclosure(cycle),false);
});
