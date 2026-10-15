// Genuine audit replay; mutations are negative/edge test inputs only.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const load=async file=>(await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,file+'.js')))).default;
const {readHistoricalEvidence,publicHistoricalResearch}=await load('lib/historical-research');
const {historicalResearchPath}=await load('lib/historical-research-index');
const {HistoricalResearchLink}=await load('app/historical-research-link');
const {default:View}=await load('app/research/history/view');
const {auditPairRewards}=await load('lib/pair-reward-audit');
const {parseLedgerLifetime}=await load('lib/reward-lifetime');
const bytes=readFileSync('docs/evidence/pair-reward-audit-2026-10-14.json','utf8');
const evidence=JSON.parse(bytes),manifest=JSON.parse(readFileSync('docs/evidence/historical-research-manifest.json','utf8'));
const real=readHistoricalEvidence(bytes);
function input(index=0){
 const quoteMint=evidence.quoteMints[index],catalog=evidence.packets.find(p=>p.path==='/api/public/v1/tokens?sort=marketCap&page=1&pageSize=25&quoteMint='+quoteMint);
 const selected=new Set(JSON.parse(catalog.body).data.tokens.filter(t=>t.mode==='reward').slice(0,4).map(t=>t.mint));
 const p=x=>({source:'https://www.stonkfun.xyz'+x.path,fetchedAt:new Date(x.capturedAt).toISOString(),status:x.status,body:x.body,ageSeconds:Number(x.headers.age)});
 return {quoteMint,asOf:evidence.asOf,registry:p(evidence.packets.find(p=>p.path==='/api/public/v1/pairs')),catalog:p(catalog),rewards:evidence.packets.filter(p=>/^\/api\/v2\/tokens\/[^/]+\/rewards$/.test(p.path)&&selected.has(p.path.split('/')[4])).map(p)};
}
test('four genuine records reproduce exact raw units, original captures and pinned audit',()=>{
 assert.equal(real.state,'verified');assert.equal(real.records.length,4);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.evidenceSha256);
 for(const [i,amount] of ['15527.87212775','9828.59080179','5092.44927539','11995464.083712182'].entries()){
  const r=real.records[i],pin=manifest.records[i];assert.equal(r.lifetime.distributedTokens,amount);
  assert.equal(r.source.originalCapturedAt,pin.originalCapturedAt);assert.equal(r.source.capturedAt,pin.capturedAt);
  assert.equal(r.source.providerGeneratedAt,pin.providerGeneratedAt);assert.equal(r.source.receiptSha256,pin.receiptSha256);
  assert.equal(r.source.endpoint,pin.source);assert.equal(r.unit.mint,pin.quoteMint);assert.equal(r.unit.decimals,pin.decimals);
  assert.equal(r.temporalState,'historical_not_current');assert.equal(r.chainVerified,false);assert.equal(r.modeVerification,'verified_at_capture');
  assert.equal(r.lifetime.startAt,null);assert.equal(r.lifetime.endAt,null);
  for(const field of ['recentFlow','holderReturn','historicalPrice','comparablePeriod'])assert.equal(r[field],null);
  assert.equal(r.coverage.complete,false);assert.equal(r.coverage.atomic,false);assert.equal(r.coverage.catalogInspected,25);assert.equal(r.coverage.candidatesSelected,4);
  assert.ok(r.coverage.catalogUninspected>1000);
  assert.deepEqual(auditPairRewards(input(i)),evidence.offlineReport.reports[i]);
 }
 assert.equal(new Set(real.records.map(r=>r.id)).size,4);assert.deepEqual(readHistoricalEvidence(bytes),real);
});
test('historical availability never promotes expired source into a current gate',()=>{
 const later=input();later.asOf='2026-10-15T17:00:00.000Z';
 assert.equal(auditPairRewards(later).ranking.state,'withheld');
 assert.equal(readHistoricalEvidence(bytes).state,'verified');
 assert.deepEqual(publicHistoricalResearch(readHistoricalEvidence(bytes)),publicHistoricalResearch(real));
});
for(const [name,value,reason] of [['missing source',null,'evidence_unavailable'],['inaccessible source',null,'evidence_unavailable'],['truncated capture',bytes.slice(0,-1),'evidence_integrity_failed'],['empty document','','evidence_integrity_failed'],['oversized document',' '.repeat(1024*1024+1),'evidence_integrity_failed']])test(name+' withholds all records',()=>{
 assert.deepEqual(readHistoricalEvidence(value),{state:'withheld',reason,records:[]});
 assert.deepEqual(publicHistoricalResearch(readHistoricalEvidence(value)).records,[]);
});
for(const change of ['mint','quote','capture','hash','status','body'])test('copied hash cannot authenticate changed '+change,()=>{
 const e=structuredClone(evidence),p=e.packets.find(p=>p.bodySha256===manifest.records[0].receiptSha256);
 if(change==='capture')p.capturedAt='2026-10-15T17:00:00.000Z';
 else if(change==='hash')p.bodySha256=manifest.records[1].receiptSha256;
 else if(change==='status')p.status=503;
 else if(change==='body')p.body+=' ';
 else {const d=JSON.parse(p.body);if(change==='mint')d.mint=manifest.records[1].tokenMint;else d.quote.mint=manifest.records[3].quoteMint;p.body=JSON.stringify(d);}
 assert.equal(readHistoricalEvidence(JSON.stringify(e)).state,'withheld');
});
test('exact mints, including distinct STONK identities, control links, never tickers',()=>{
 const p=manifest.records[3];assert.equal(historicalResearchPath(p.tokenMint,p.quoteMint),'/research/history#'+p.tokenMint);
 assert.equal(historicalResearchPath(p.tokenMint,'Qirqk4cXB3txQmdqwB7R9o5KVkNzj5ZCT9BHsuLpump'),null);
 assert.equal(historicalResearchPath('KNOTS'),null);assert.equal(historicalResearchPath(manifest.records[0].tokenMint,p.quoteMint),null);
 assert.equal(historicalResearchPath('arbitrary'),null);
 assert.equal(renderToStaticMarkup(React.createElement(HistoricalResearchLink,{mint:p.tokenMint,quoteMint:'Qirqk4cXB3txQmdqwB7R9o5KVkNzj5ZCT9BHsuLpump'})),'');
});
test('null is unavailable; the genuine zero candidate stays exact zero',()=>{
 const f=input(),p=f.rewards.find(p=>JSON.parse(p.body).rewards.distributedRaw==='0'),d=JSON.parse(p.body);
 assert.equal(parseLedgerLifetime(d,8,d.generatedAt).value.distributedTokens,'0.00000000');
 d.rewards=null;assert.equal(parseLedgerLifetime(d,8,d.generatedAt).value,null);
});
for(const status of [429,503])test('provider '+status+' cannot create a historical zero or partial ranking',()=>{
 const f=input();f.rewards[0].status=status;f.rewards[0].body=null;
 const r=auditPairRewards(f);assert.equal(r.ranking.state,'withheld');assert.deepEqual(r.ranking.orderedMints,[]);assert.equal(r.candidates[0].lifetime,null);
});
test('misaligned source periods and mixed quote identities withhold comparisons',()=>{
 for(const mutate of [d=>{d.generatedAt='2026-10-14T22:32:00Z';},d=>{d.quote.mint=manifest.records[3].quoteMint;}]){
  const f=input(),d=JSON.parse(f.rewards[0].body);mutate(d);f.rewards[0].body=JSON.stringify(d);
  assert.equal(auditPairRewards(f).ranking.state,'withheld');
 }
 // Four distinct quote mints have no common-period comparison contract at all.
 assert.ok(real.records.every(r=>r.comparablePeriod===null));assert.equal(new Set(real.records.map(r=>r.unit.mint)).size,4);
});
test('publication gate excludes amounts, counts, ranking and extra nested fields, with no runtime approval switch',()=>{
 const copy=structuredClone(real);copy.records[0].source.distributedRaw='SECRET_AMOUNT';copy.records[0].unit.payoutCount=123;
 const publicView=publicHistoricalResearch(copy),text=JSON.stringify(publicView);
 assert.equal(publicView.rights.financialPublication,'withheld');assert.equal(manifest.rights.ownerApproval,null);assert.equal(manifest.rights.permissionReceipt,null);
 assert.ok(!/SECRET_AMOUNT|distributedRaw|payoutCount|walletsPaid|orderedMints|providerReportedTotal/.test(text));
 for(const r of publicView.records)assert.equal(r.lifetime,null);
 for(const r of real.records){assert.ok(!text.includes(r.lifetime.distributedTokens));assert.ok(!text.includes(r.lifetime.distributedRaw));}
});
test('source view has accessible disclosures and permanent identity but no restricted quantities or fictitious prices',()=>{
 const html=renderToStaticMarkup(React.createElement(View,{report:publicHistoricalResearch(real)}));
 assert.equal((html.match(/<article /g)||[]).length,4);assert.equal((html.match(/<details>/g)||[]).length,4);
 for(const text of ['historical, not current','Financial figures withheld','unknown start and reconciliation cutoff','not a payout cutoff','not chain-verified','Ecosystem leader unknown','Missing is not zero'])assert.ok(html.includes(text));
 for(const r of real.records){assert.ok(html.includes(r.source.receiptSha256));assert.ok(html.includes(r.source.originalCapturedAt));assert.ok(!html.includes(r.lifetime.distributedTokens));}
 assert.ok(!/<(?:form|input|iframe)/.test(html));assert.match(html,/id="scout-content" tabindex="-1"/);
 assert.ok(html.includes('ticker shared by distinct mints'));
});
test('missing source view reports failure without positive rows or substitute values',()=>{
 const html=renderToStaticMarkup(React.createElement(View,{report:publicHistoricalResearch(readHistoricalEvidence(null))}));
 assert.match(html,/Retained evidence could not be verified/);assert.ok(!html.includes('<article'));
});
test('offline CLI exactly reproduces metadata projection with zero provider requests',()=>{
 const text=execFileSync(process.execPath,[path.join(process.env.HISTORY_TEST_BUILD,'scripts/historical-research-report.js')],{encoding:'utf8'});
 assert.deepEqual(JSON.parse(text),{kind:'offline_historical_research_metadata',...publicHistoricalResearch(real)});
 assert.throws(()=>execFileSync(process.execPath,[path.join(process.env.HISTORY_TEST_BUILD,'scripts/historical-research-report.js'),'https://www.stonkfun.xyz'],{stdio:'pipe'}));
});
