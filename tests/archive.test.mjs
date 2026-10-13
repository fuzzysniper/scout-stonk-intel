import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);
import {pathToFileURL} from 'node:url';
const {createEdition,validateEdition,appendEdition,canonical,sha,graceAt,archiveReport,validateIndex}=await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'lib/archive.js')).href);
const tokens=JSON.parse(fs.readFileSync(new URL('../data/tracked-mints.json',import.meta.url),'utf8'));
const date='2026-10-11',start=Date.parse(date+'T00:00:00Z'),ready=new Date('2026-10-12T03:43:00Z');
// Artificial reproducibility fixtures only; never committed as production editions or used in screenshots.
const store=()=>Object.fromEntries(tokens.map(t=>[t.mint,Array.from({length:25},(_,h)=>({observedAt:new Date(start+h*3600000).toISOString(),providerGeneratedAt:new Date(start+h*3600000).toISOString(),mode:'reward',distributedTokens:h+1,payoutCount:h+1,quoteMint:t.quoteMint,quoteSymbol:t.quoteSymbol,source:t.source}))]));
const input=(records=store(),extra={})=>({date,snapshot:Buffer.from(JSON.stringify(records)),allowlist:Buffer.from(JSON.stringify(tokens)),commit:'a'.repeat(40),committedAt:ready.toISOString(),...extra});
const make=(records=store(),extra={})=>createEdition(input(records,extra),ready);
const empty={schema:1,dates:{}};

test('UTC closure plus three-hour grace is mandatory, delayed genuine data changes new candidates',()=>{
 assert.equal(new Date(graceAt(date)).toISOString(),'2026-10-12T03:00:00.000Z');
 assert.throws(()=>createEdition(input(),new Date('2026-10-12T02:59:59Z')),/grace_pending/);
 const a=createEdition(input(store(),{committedAt:'2026-10-12T03:00:00Z'}),new Date('2026-10-12T03:00:00Z'));assert.equal(a.body.verifiedCount,7);
 const records=store();records[tokens[0].mint].at(-1).distributedTokens+=1;
 assert.notEqual(a.id,make(records).id);
});
test('full immutable evidence reproduces after live snapshots change or expire',()=>{
 const e=make();assert.equal(validateEdition(e).id,e.id);assert.equal(e.body.findingCount,7);
 assert.equal(e.body.snapshotRevision,'sha256:'+sha(Buffer.from(e.body.snapshotBase64,'base64')));
 const report=archiveReport(e,appendEdition(empty,e).index);assert.equal(report.provisional,false);assert.equal(report.version,e.id);assert.equal(report.rows[0].distributedTokens,24);
 assert.equal(report.sharePath,'/brief/'+date+'/editions/'+e.id);assert.equal(report.rows[0].evidence.brief,'/api/archive?date='+date+'&id='+e.id);
});
test('repeated runs ignore wall-clock attempt time and identical append is a no-op',()=>{
 const e=make(),later=createEdition(input(),new Date('2026-10-12T05:00:00Z'));assert.equal(e.id,later.id);
 const first=appendEdition(empty,e),again=appendEdition(first.index,e);assert.equal(first.state,'created');assert.equal(again.state,'duplicate');assert.deepEqual(again.index,first.index);assert.deepEqual(empty,{schema:1,dates:{}});
});
test('conflicting originals cannot overwrite and explicit corrections preserve original plus notices',()=>{
 const original=make(),index=appendEdition(empty,original).index,records=store();records[tokens[0].mint].at(-1).distributedTokens=30;
 assert.throws(()=>appendEdition(index,make(records)),/conflicting_original/);
 assert.throws(()=>make(records,{correction:{parent:original.id,notice:''}}),/invalid_correction/);
 const correction=make(records,{correction:{parent:original.id,notice:'Corrected API counter evidence; original remains available.'}}),next=appendEdition(index,correction).index;
 assert.equal(next.dates[date].original,original.id);assert.deepEqual(next.dates[date].corrections,[correction.id]);assert.equal(archiveReport(correction,next).publication.correction.parent,original.id);
 assert.throws(()=>appendEdition(empty,correction),/missing_parent/);assert.equal(validateEdition(original).body.rows[0].distributedTokens,24);
});
test('insufficient, empty and covered zero days archive honestly without invented payouts',()=>{
 for(const records of [{},Object.fromEntries(tokens.map(t=>[t.mint,store()[t.mint].slice(-2)]))]){
  const e=make(records);assert.equal(e.body.findingCount,0);assert.equal(e.body.headline,'No verified change to report');assert.ok(e.body.rows.every(r=>r.distributedTokens===null));assert.equal(validateEdition(e).id,e.id);
 }
 const zero=store();for(const rows of Object.values(zero))for(const r of rows){r.distributedTokens=1;r.payoutCount=1;}
 const e=make(zero);assert.equal(e.body.verifiedCount,7);assert.equal(e.body.findingCount,0);assert.ok(e.body.rows.every(r=>r.distributedTokens===0));
});
test('malformed source, missing evidence, tampering and outdated methods fail reproduction',()=>{
 for(const snapshot of [Buffer.from('invalid'),Buffer.from('[]'),Buffer.from('{"bad":[]}')])assert.throws(()=>make({}, {snapshot}));
 const e=make(),changed=structuredClone(e);changed.body.rows[0].distributedTokens=999;assert.throws(()=>validateEdition(changed),/invalid_edition_hash/);
 changed.id=sha(canonical(changed.body));assert.throws(()=>validateEdition(changed),/nonreproducible_edition/);
 const obsolete=structuredClone(e);obsolete.body.method='archive-utc-day-v0';obsolete.id=sha(canonical(obsolete.body));assert.throws(()=>validateEdition(obsolete),/unsupported_method/);
 const bad=structuredClone(e);bad.body.snapshotRevision='sha256:'+'0'.repeat(64);bad.id=sha(canonical(bad.body));assert.throws(()=>validateEdition(bad),/evidence_hash_mismatch/);
});
test('retention backfill, future input and archive capacities are bounded safely',()=>{
 assert.throws(()=>createEdition(input(),new Date('2026-10-22T00:00:00Z')),/retention_boundary/);
 const records=store();records[tokens[0].mint].push({...records[tokens[0].mint][0],observedAt:'2026-10-15T00:00:00Z'});assert.throws(()=>make(records),/future_input/);
 assert.throws(()=>validateIndex({schema:1,dates:{[date]:{original:'x',corrections:[]}}}));
 let e=make(),index=appendEdition(empty,e).index;
 for(let i=0;i<3;i++){e=make(store(),{correction:{parent:e.id,notice:'Explicit correction number '+i+' with no implied new observations.'}});index=appendEdition(index,e).index;}
 assert.throws(()=>appendEdition(index,make(store(),{correction:{parent:e.id,notice:'A fifth edition requires reviewed capacity expansion.'}})),/edition_capacity/);
});
test('later-day observations are preserved but do not change historical claim gates',()=>{
 const a=make(),records=store();for(const t of tokens)records[t.mint].push({...records[t.mint].at(-1),observedAt:'2026-10-12T03:17:00Z',providerGeneratedAt:'2026-10-12T03:17:00Z',distributedTokens:26,payoutCount:26});
 const b=make(records);assert.equal(b.body.verifiedCount,7);assert.deepEqual(a.body.rows,b.body.rows);assert.notEqual(a.id,b.id);
});
test('publication workflow stays opt-in, read-only generation, draft branch PR only',()=>{
 const workflow=fs.readFileSync(new URL('../.github/workflows/research-archive.yml',import.meta.url),'utf8');
 assert.match(workflow,/SCOUT_ARCHIVE_ENABLED == 'true'/);assert.match(workflow,/contents: read/);assert.match(workflow,/pull-requests: write/);assert.match(workflow,/gh pr create --draft/);assert.match(workflow,/Pending proposal branch preserved/);assert.match(workflow,/existing_pr=/);assert.match(workflow,/HEAD:refs\/heads\/\$proposal_branch/);
 assert.ok(!/git push.*HEAD:main|--force|pr merge|pull_request_target|webhook|telegram/i.test(workflow));
});
test('git append-only check rejects edition edits and index replacement with an isolated repository',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scout-archive-check-'));
 try{
  const git=async(...args)=>(await execute('git',args,{cwd:dir})).stdout;await git('init');await git('config','user.name','Test');await git('config','user.email','test@example.invalid');
  fs.mkdirSync(path.join(dir,'data'),{recursive:true});const sourceBytes=Buffer.from(JSON.stringify(store())),allowlistBytes=Buffer.from(JSON.stringify(tokens));
  fs.writeFileSync(path.join(dir,'data/reward-snapshots.json'),sourceBytes);fs.writeFileSync(path.join(dir,'data/tracked-mints.json'),allowlistBytes);await git('add','.');await git('commit','-m','Explicitly artificial isolated input fixture');
  const sourceCommit=(await git('rev-parse','HEAD')).trim(),sourceAt=new Date((await git('show','-s','--format=%cI','HEAD')).trim()).toISOString();
  const e=createEdition({date,snapshot:sourceBytes,allowlist:allowlistBytes,commit:sourceCommit,committedAt:sourceAt},new Date()),folder=path.join(dir,'data/brief-archive',date);fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,e.id+'.json'),JSON.stringify(e));fs.writeFileSync(path.join(dir,'data/brief-archive/index.json'),JSON.stringify(appendEdition(empty,e).index));await git('add','.');await git('commit','-m','real isolated fixture baseline');const base=(await git('rev-parse','HEAD')).trim();
  const tool=path.join(process.env.HISTORY_TEST_BUILD,'scripts/archive-tool.js'),env={...process.env,NODE_PATH:path.join(process.cwd(),'node_modules')};
  await execute(process.execPath,[tool,'check',base],{cwd:dir,env});
  const forged=createEdition({date,snapshot:Buffer.from('{}'),allowlist:allowlistBytes,commit:sourceCommit,committedAt:sourceAt},new Date());
  fs.writeFileSync(path.join(folder,forged.id+'.json'),JSON.stringify(forged));fs.writeFileSync(path.join(dir,'data/brief-archive/index.json'),JSON.stringify(appendEdition(appendEdition(empty,e).index,createEdition({date,snapshot:Buffer.from('{}'),allowlist:allowlistBytes,commit:sourceCommit,committedAt:sourceAt,correction:{parent:e.id,notice:'Artificial forged evidence must fail actual Git proof.'}},new Date())).index));
  // Ensure the staged forged correction is structurally reproducible yet does not match its claimed Git source.
  const fakeCorrection=createEdition({date,snapshot:Buffer.from('{}'),allowlist:allowlistBytes,commit:sourceCommit,committedAt:sourceAt,correction:{parent:e.id,notice:'Artificial forged evidence must fail actual Git proof.'}},new Date());
  fs.unlinkSync(path.join(folder,forged.id+'.json'));fs.writeFileSync(path.join(folder,fakeCorrection.id+'.json'),JSON.stringify(fakeCorrection));await git('add','.');
  await assert.rejects(()=>execute(process.execPath,[tool,'check',base],{cwd:dir,env}));
  fs.unlinkSync(path.join(folder,fakeCorrection.id+'.json'));fs.writeFileSync(path.join(dir,'data/brief-archive/index.json'),JSON.stringify(appendEdition(empty,e).index));await git('add','.');
  fs.appendFileSync(path.join(folder,e.id+'.json'),'\n');await assert.rejects(()=>execute(process.execPath,[tool,'check',base],{cwd:dir,env}));
  fs.writeFileSync(path.join(folder,e.id+'.json'),JSON.stringify(e));fs.writeFileSync(path.join(dir,'data/brief-archive/index.json'),JSON.stringify({schema:1,dates:{}}));await assert.rejects(()=>execute(process.execPath,[tool,'check',base],{cwd:dir,env}));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
