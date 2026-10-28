/** INVENTED OFFLINE fixtures. No SEC/provider observation, grant, price or authentic issuer association. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {FIRST_SOURCE_PILOT,previewSecFilingFixture:preview}=require(`${process.env.UNFARMD_SOURCE_BUILD}/lib/unfarmd-source-selection/sec-fixture.js`);
const now='2026-10-28T12:00:00.000Z';
const filing=()=>({accession:'0000000002-26-000001',form:'10-Q',acceptedAt:'2026-10-27T14:00:00.000Z',filingDate:'2026-10-27',reportDate:'2026-09-30',primaryDocument:'invented-quarter.htm'});
const fixture=()=>({label:'SYNTHETIC_OFFLINE_NOT_OBSERVED',issuer:{cik:'0000000001',name:'Invented Offline Issuer'},selection:{kind:'listed_equity',mic:'XNAS',ticker:'TEST',issuerCik:'0000000001',association:'user_asserted'},receivedAt:'2026-10-28T11:00:00.000Z',rawSha256:null,filings:[filing()]});
const out=(f=fixture(),t=now)=>preview(f,t);
test('current proposal remains hard NO-GO with exact one-attempt/no-spend limits',()=>{
 assert.equal(FIRST_SOURCE_PILOT.decision,'NO_GO');assert.equal(FIRST_SOURCE_PILOT.sourceGo,false);assert.equal(FIRST_SOURCE_PILOT.maximumAttempts,1);assert.equal(FIRST_SOURCE_PILOT.maximumConcurrent,1);assert.equal(FIRST_SOURCE_PILOT.retries,0);assert.equal(FIRST_SOURCE_PILOT.redirects,0);assert.equal(FIRST_SOURCE_PILOT.timeoutMs,10000);assert.equal(FIRST_SOURCE_PILOT.maximumDecodedBytes,2097152);assert.equal(FIRST_SOURCE_PILOT.providerCostCeilingUSD,'0.00');assert.equal(FIRST_SOURCE_PILOT.providerPriceVerified,false);assert.equal(FIRST_SOURCE_PILOT.rights,'unverified');assert.ok(Object.isFrozen(FIRST_SOURCE_PILOT));
});
test('no input is an honest disabled state, not fake zero data',()=>{assert.deepEqual(out(null),{version:'unfarmd-first-source/1',sourceGo:false,acquisition:'none_offline_only',status:'disabled',reasons:['source_disabled'],preview:null});});
test('valid fixture stays conspicuously synthetic and all rights stay unverified',()=>{const r=out();assert.equal(r.status,'synthetic_fixture');assert.equal(r.sourceGo,false);assert.equal(r.acquisition,'none_offline_only');assert.equal(r.preview.sourceSchema,'scout_proposal_not_verified_provider_contract');assert.equal(r.preview.rights,'unverified');assert.equal(r.preview.retention,'unverified');assert.equal(r.preview.reference.rawSha256,null);assert.equal(r.preview.assetVerification,'not_verified');assert.ok(r.reasons.includes('synthetic_not_live'));});
test('CIK is issuer identity and MIC/ticker is only user asserted, not a security master',()=>{const r=out();assert.equal(r.preview.issuerKey,'sec-cik:0000000001');assert.equal(r.preview.assetKey,'listed_equity:XNAS:TEST');assert.equal(r.preview.issuerAssociation,'user_asserted_not_security_master_verified');assert.ok(r.reasons.includes('issuer_security_link_not_verified'));});
test('accession prefix is not used as an invented issuer identity match',()=>{const f=fixture();assert.notEqual(f.filings[0].accession.slice(0,10),f.issuer.cik);assert.equal(out(f).status,'synthetic_fixture');});
test('all four filing/retrieval clocks stay separate; no date-only midnight is invented',()=>{const f=fixture(),r=out(f);assert.deepEqual(r.preview.clocks,{acceptedAt:f.filings[0].acceptedAt,filingDate:f.filings[0].filingDate,reportDate:f.filings[0].reportDate,receivedAt:f.receivedAt,evaluatedAt:now});assert.equal(r.preview.evidenceKind,'dated_filing_metadata_not_market_quote');});
test('recent retrieval cannot make an old filing a current financial or market observation',()=>{const f=fixture();f.filings[0].acceptedAt='2020-10-27T14:00:00.000Z';f.filings[0].filingDate='2020-10-27';f.filings[0].reportDate='2020-09-30';const r=out(f);assert.equal(r.preview.clocks.reportDate,'2020-09-30');assert.equal(r.preview.receiptFreshness,'fresh_fixture');assert.equal(r.preview.evidenceKind,'dated_filing_metadata_not_market_quote');assert.equal(r.preview.scope,'newest_in_supplied_fixture_only');});
test('report period can be explicitly unknown without falling back to acceptance date',()=>{const f=fixture();f.filings[0].reportDate=null;assert.equal(out(f).preview.clocks.reportDate,null);});
test('stale retrieval boundary is exact and cannot grant rights or source GO',()=>{const f=fixture();assert.equal(out(f,'2026-10-29T11:00:00.000Z').status,'synthetic_fixture');const r=out(f,'2026-10-29T11:00:00.001Z');assert.equal(r.status,'stale_fixture');assert.equal(r.preview.receiptFreshness,'stale_fixture');assert.equal(r.sourceGo,false);});
test('newest only within sample, independent of input order, without claiming catalog completeness',()=>{
 const f=fixture();const newer={...filing(),accession:'0000000002-26-000002',acceptedAt:'2026-10-28T10:00:00.000Z',filingDate:'2026-10-28',form:'8-K',reportDate:null};f.filings.push(newer);const a=out(f);f.filings.reverse();assert.deepEqual(out(f),a);assert.equal(a.preview.reference.accession,newer.accession);assert.equal(a.preview.scope,'newest_in_supplied_fixture_only');assert.ok(a.reasons.includes('partial_recent_subset'));
});
test('identical duplicate is counted without manufacturing multiple observations',()=>{const f=fixture();f.filings.push(filing());const r=out(f);assert.equal(r.preview.uniqueFilings,1);assert.equal(r.preview.duplicateRows,1);});
test('amendments are explicitly labeled and do not silently reconstruct/restated financial numbers',()=>{const f=fixture();f.filings[0].form='10-Q/A';const r=out(f);assert.equal(r.preview.amendment,true);assert.equal(r.preview.form,'10-Q/A');assert.ok(!('earnings' in r.preview));});
test('different listings for same issuer remain distinct unverified asset keys',()=>{const a=fixture(),b=fixture();b.selection.mic='XNYS';assert.notEqual(out(a).preview.assetKey,out(b).preview.assetKey);assert.equal(out(a).preview.issuerKey,out(b).preview.issuerKey);});
for(const [name,change] of [
 ['missing fixture label',f=>{delete f.label;}],['false live label',f=>{f.label='production';}],['fake raw hash',f=>{f.rawSha256='a'.repeat(64);}],
 ['sourceGo injection',f=>{f.sourceGo=true;}],['rights grant injection',f=>{f.rights={status:'permitted'};}],['price injection',f=>{f.price='100';}],
 ['credential endpoint',f=>{f.url='https://provider.invalid/?api-key=DO_NOT_ECHO';}],['text bearer',f=>{f.issuer.name='Authorization: Bearer DO_NOT_ECHO';}],
 ['wrong CIK',f=>{f.selection.issuerCik='0000000003';}],['zero CIK',f=>{f.issuer.cik=f.selection.issuerCik='0000000000';}],['numeric CIK',f=>{f.issuer.cik=1;}],
 ['false verified identity',f=>{f.selection.association='verified';}],['ticker without MIC',f=>{delete f.selection.mic;}],['unqualified ticker',f=>{f.selection.ticker='TEST:NVDA';}],
 ['empty rows',f=>{f.filings=[];}],['more than eight rows',f=>{f.filings=Array(9).fill(filing());}],['future receipt',f=>{f.receivedAt='2026-10-29T12:00:00.000Z';}],
 ['future acceptance',f=>{f.filings[0].acceptedAt='2026-10-28T11:00:00.001Z';}],['local unzoned clock',f=>{f.filings[0].acceptedAt='2026-10-27T14:00:00';}],
 ['numeric source time',f=>{f.filings[0].acceptedAt=1793109600;}],['calendar normalization',f=>{f.filings[0].acceptedAt='2026-02-30T12:00:00.000Z';}],
 ['invalid report day',f=>{f.filings[0].reportDate='2026-02-29';}],['missing report day',f=>{delete f.filings[0].reportDate;}],['UTC invention',f=>{f.filings[0].acceptedAt='2026-10-27T09:00:00-05:00';}],
 ['invalid accession',f=>{f.filings[0].accession='https://provider.invalid/DO_NOT_ECHO';}],['unsafe document',f=>{f.filings[0].primaryDocument='../private.htm';}],
 ['encoded document path',f=>{f.filings[0].primaryDocument='private%2fdoc.htm';}],['document query',f=>{f.filings[0].primaryDocument='doc.htm?key=DO_NOT_ECHO';}],
 ['conflicting revision',f=>{f.filings.push({...filing(),reportDate:null});}],
 ['ambiguous tied receipt',f=>{f.filings.push({...filing(),accession:'0000000002-26-000002'});}],
])test(`fail closed: ${name}`,()=>{const f=fixture();change(f);const r=out(f);assert.equal(r.status,'invalid');assert.equal(r.sourceGo,false);assert.equal(r.preview,null);assert.ok(!JSON.stringify(r).includes('DO_NOT_ECHO'));});
test('crypto and non-US filings are explicitly outside this sole pilot, never mapped by ticker',()=>{
 const f=fixture();f.selection.kind='solana_mint';assert.equal(out(f).status,'unsupported');for(const form of ['20-F','6-K','4','S-1']){const x=fixture();x.filings[0].form=form;assert.equal(out(x).status,'unsupported');assert.equal(out(x).preview,null);}
});
test('malformed context cannot silently choose the current time',()=>{for(const value of [undefined,null,Date.now(),'2026-10-28'])assert.equal(preview(fixture(),value).status,'invalid');});
test('malformed-input fuzz never throws, leaks input or enables a source',()=>{let seed=194;for(let i=0;i<500;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const f=fixture();f.filings[0].accession=String(seed);const r=out(f);assert.equal(r.status,'invalid');assert.equal(r.sourceGo,false);}});
test('evaluation is deterministic, does not mutate inputs and makes zero acquisition attempts',()=>{
 const f=fixture(),before=JSON.stringify(f),originalFetch=globalThis.fetch,originalNow=Date.now;let calls=0;
 globalThis.fetch=()=>{calls++;throw new Error('forbidden provider request');};Date.now=()=>{throw new Error('forbidden ambient clock');};
 try{assert.deepEqual(out(f),out(f));assert.equal(JSON.stringify(f),before);assert.equal(calls,0);}finally{globalThis.fetch=originalFetch;Date.now=originalNow;}
 const code=readFileSync('lib/unfarmd-source-selection/sec-fixture.ts','utf8');assert.doesNotMatch(code,/\b(?:fetch|WebSocket|XMLHttpRequest|require|setInterval|setTimeout)\s*\(|\b(?:process\.env|Date\.now|Math\.random)\b|from\s+['"](?:node:|http|pg)/);
});
