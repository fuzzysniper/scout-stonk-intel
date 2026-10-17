import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {ExplainMintResult} from '../vendor/evidence/contract.js';
import {EXAMPLES} from '../src/evidence.mjs';
import {classifyInput,explainWithEngine,isSolanaMint,projectEvidence,shareUrl,sourceDate} from '../src/model.mjs';
const preview=JSON.parse(readFileSync('tests/pinned-engine-preview.json','utf8'));
const first=EXAMPLES[0].mint;
const result=()=>structuredClone(preview[0].result);

test('strict 32-byte base58 identities; syntax is not token existence',()=>{
  for(const e of EXAMPLES)assert.equal(isSolanaMint(e.mint),true);
  assert.equal(isSolanaMint('1'.repeat(32)),true);
  for(const value of ['','1'.repeat(31),'1'.repeat(33),'0'.repeat(44),'O'.repeat(44),first+'1','https://example.com/'+first])assert.equal(isSolanaMint(value),false);
  assert.equal(classifyInput(' '+first+' '),'invalid');assert.notEqual(classifyInput(first.toLowerCase()),'lookup');
});
test('no ticker, quote, whitespace, other SI or unknown input aliases and no engine call',async()=>{
  for(const [input,state]of [['','empty'],['  ','invalid'],['SI','needs_mint'],['NVDAX','needs_mint'],['$SI','needs_mint'],[EXAMPLES[0].quoteMint,'unsupported'],['4SsapSJFx7ZqVb2C7z78wKD4nyySjFCBSuajnZdDsx97','unsupported'],['1'.repeat(32),'unsupported']]as const){
    let calls=0;const out=await explainWithEngine(input,()=>{calls++;return result();});assert.equal(out.state,state);assert.equal(calls,0);
  }
});
test('all three genuine upstream previews project dates, citations, null economics and stale mode',async()=>{
  for(let i=0;i<3;i++){
    const p=EXAMPLES[i];let calls=0;const out=await explainWithEngine(p.mint,()=>{calls++;return preview[i].result;});
    assert.equal(calls,1);assert.equal(out.state,'supported');if(out.state!=='supported')throw Error();
    assert.equal(out.example.quote.mint,p.quoteMint);assert.equal(out.example.freshness,'stale');assert.equal(out.example.mode,'retained_capture');
    assert.equal(out.example.financialFigures,'withheld');assert.equal(out.example.holderReturns,'unavailable');assert.equal(out.example.sources.length,3);
    assert.equal(out.example.explanation.length,2);assert.equal(sourceDate(out.example.sources[0]),'14 Oct 2026');
    for(const f of out.example.facts)for(const id of f.sourceIds)assert.ok(out.example.sources.some(s=>s.id===id));
    assert.equal(out.example.fullNotes.length,11);
  }
});
test('quote switches, duplicate labels on different mints and missing identity fail closed',()=>{
  for(const mutate of [
    (r:ReturnType<typeof result>)=>{r.explanation.quote.mint=EXAMPLES[1].quoteMint;},
    (r:ReturnType<typeof result>)=>{r.explanation.token.mint='4SsapSJFx7ZqVb2C7z78wKD4nyySjFCBSuajnZdDsx97';},
    (r:ReturnType<typeof result>)=>{r.explanation.token.symbol='GROK';},
    (r:ReturnType<typeof result>)=>{r.explanation.sources.pop();},
  ]){const r=result();mutate(r);assert.equal(projectEvidence(r).state,'unavailable');}
});
test('no current-value, quantity, entitlement, settlement or rights promotion through UI projection',()=>{
  for(const mutate of [
    (r:ReturnType<typeof result>)=>{r.explanation.freshness.currentValueClaim=true;},
    (r:ReturnType<typeof result>)=>{r.explanation.economicMechanism.lifetimeDistribution.value=0;},
    (r:ReturnType<typeof result>)=>{r.explanation.marketContext.liquidityUsd.value=42;},
    (r:ReturnType<typeof result>)=>{r.explanation.economicMechanism.holderEntitlement='verified';},
    (r:ReturnType<typeof result>)=>{r.explanation.economicMechanism.settlement='verified';},
    (r:ReturnType<typeof result>)=>{r.explanation.sources[0].rights.permission='approved';},
    (r:ReturnType<typeof result>)=>{r.explanation.sources[0].url='javascript:alert(1)';},
    (r:ReturnType<typeof result>)=>{r.explanation.sources[0].retained.path='../../../secret';},
    (r:ReturnType<typeof result>)=>{r.explanation.whatUserOwns.sourceIds=['missing'];},
  ]){const r=result();mutate(r);assert.equal(projectEvidence(r).state,'unavailable');}
});
test('unsupported and unavailable union cases preserve withholding, with no raw error disclosure',async()=>{
  const unsupported:ExplainMintResult={schemaVersion:'1',status:'unsupported',reason:'not_in_supported_set',message:'not supported'};
  assert.equal(projectEvidence(unsupported).state,'unsupported');
  for(const reason of ['invalid_clock','evidence_integrity']as const){
    const out=projectEvidence({schemaVersion:'1',status:'unavailable',reason,message:'private-sentinel'});
    assert.equal(out.state,'unavailable');assert.ok(!JSON.stringify(out).includes('private-sentinel'));
  }
  const out=await explainWithEngine(first,()=>{throw Error('private-sentinel');});assert.equal(out.state,'unavailable');assert.ok(!JSON.stringify(out).includes('private-sentinel'));
});
test('exact-mint sharing clears tracking, duplicate queries and fragments',()=>{
  const u=new URL(shareUrl('https://preview.invalid/path/?tracking=private&mint=bad#anything',first));
  assert.equal(u.pathname,'/path/');assert.deepEqual([...u.searchParams],[['mint',first]]);assert.equal(u.hash,'');
  for(const raw of ['SI','1'.repeat(32),' '+first])assert.throws(()=>shareUrl('https://preview.invalid',raw));
});
test('vendored B runtime and contract remain byte-identical to the recorded upstream commit',()=>{
  const pins=JSON.parse(readFileSync('vendor/evidence/UPSTREAM.json','utf8'));assert.equal(pins.commit,'cf05f5df62cddf843c1ef4e8b8a0253f02274dea');
  assert.equal(pins.runtimeFiles.length,7);
  for(const pin of pins.runtimeFiles)assert.equal(createHash('sha256').update(readFileSync('vendor/evidence/'+pin.file)).digest('hex'),pin.sha256,pin.file);
});
