import test from 'node:test';
import assert from 'node:assert/strict';
import {api,append,NOTE,SCOPE,NOW,OTHER,copy,rehash} from './fixtures.mjs';
const revised={...NOTE,kind:'revised',content:{...NOTE.content,thesis:'SYNTHETIC revision explicitly changes my hypothesis.',invalidation:'If the original premise is contradicted.',contradictions:'This is owner interpretation, not provider evidence.'}};
const update={kind:'updated',content:{note:'SYNTHETIC timestamped owner update.'},fact_snapshot_refs:[]};
const replay=(entries,anchor)=>api.replayThesis(entries,SCOPE,NOW+100000,anchor);
test('created→explicit revision→timestamped update retain original thesis, CA and created_at',()=>{
 const a=append(),b=append(a,revised),c=append(b,update),r=replay(c,{length:a.length,head:a[0].hash});
 assert.equal(r.entries.length,3);assert.equal(c[0].change.content.thesis,NOTE.content.thesis);assert.equal(c[1].change.kind,'revised');assert.equal(c[1].supersedes,c[0].hash);
 assert.equal(c[2].supersedes,null);assert.ok(c.every(e=>e.created_at===a[0].created_at&&e.asset.mint===SCOPE.asset.mint));
 assert.equal(r.integrity,'matches_external_trusted_prefix');assert.equal(r.authorship,'owner_claim_unverified');assert.equal(r.persistence,'not_implemented');
 assert.ok(Object.isFrozen(c[0].change.content));assert.equal(a.length,1);
});
test('optional fact references are opaque references, never verification of owner prose',()=>{
 const s=api.sourceOffSnapshot(SCOPE.asset.mint,NOW),c=append([],{...NOTE,fact_snapshot_refs:[s.id]});
 const r=replay(c);assert.equal(r.factReferences,'references_only_not_verified_evidence');assert.equal(r.authorship,'owner_claim_unverified');assert.equal(r.entries[0].change.content.thesis,NOTE.content.thesis);assert.equal(s.narrative,null);
});
test('no anchor means self-consistent only, not authenticated/immutable/saved',()=>{
 const r=replay(append());assert.equal(r.integrity,'self_consistent_only');assert.deepEqual([api.THESIS_POLICY.storage,api.THESIS_POLICY.encrypted,api.THESIS_POLICY.authenticated,api.THESIS_POLICY.export],[false,false,false,false]);
});
test('compare-and-append rejects an old expected head and preserves input entries',()=>{
 const a=append(),b=append(a,revised),before=copy(a);assert.throws(()=>append(b,update,{expectedHead:a[0].hash}),/thesis_journal_rejected/);assert.deepEqual(a,before);
});
test('hash chain without external trust is not anti-forgery; external head rejects recomputed history',()=>{
 const a=append(),b=append(a,revised),forged=copy(b);forged[0].change.content.thesis='Rewritten after the event';rehash(forged[0]);forged[1].previousHash=forged[0].hash;forged[1].supersedes=forged[0].hash;rehash(forged[1]);
 assert.equal(replay(forged).integrity,'self_consistent_only');assert.throws(()=>replay(forged,{length:1,head:a[0].hash}),/thesis_journal_rejected/);
});
test('trusted high-water detects truncation; branch forks cannot be concatenated',()=>{
 const a=append(),b=append(a,revised),fork=append(a,update);
 assert.throws(()=>replay(a,{length:2,head:b[1].hash}),/thesis_journal_rejected/);
 assert.throws(()=>replay([...b,fork[1]]),/thesis_journal_rejected/);
});
test('redaction/deletion are explicit append-only requests, never a claim of executed erasure',()=>{
 const a=append(),r=append(a,{kind:'redaction_requested',content:{targets:[a[0].hash],reason:'Owner requests privacy review.'},fact_snapshot_refs:[]});
 const d=append(r,{kind:'deletion_requested',content:{reason:'Owner requests complete deletion.'},fact_snapshot_refs:[]});
 const state=replay(d);assert.equal(state.deletionRequested,true);assert.equal(state.privacyExecution,'not_performed');assert.equal(state.privacyRequests.length,2);
 assert.equal(d[0].change.content.thesis,NOTE.content.thesis);assert.throws(()=>append(d,update),/thesis_journal_rejected/);
});
for(const [name,mutate] of [
 ['original text overwrite',e=>{e.change.content.thesis='Overwrite';}],['missing change',e=>{delete e.change;}],['unknown field',e=>{e.verified=true;}],
 ['owner substitution',e=>{e.ownerScope='22345678-1234-4234-8234-123456789abc';}],['mint substitution',e=>{e.asset.mint=OTHER;}],
 ['chain substitution',e=>{e.asset.chain='ethereum';}],['bad sequence',e=>{e.sequence=2;}],['prior hash on genesis',e=>{e.previousHash='a'.repeat(64);}],
 ['future timestamp',e=>{e.recorded_at='2027-01-01T00:00:00.000Z';}],['backdated created_at',e=>{e.created_at='2026-10-27T00:00:00.000Z';}],
 ['noncanonical date',e=>{e.recorded_at='2026-10-28T12:00:00Z';}],['URL as evidence reference',e=>{e.change.fact_snapshot_refs=['https://evil.invalid/?secret=x'];}],
 ['extra authority assertion',e=>{e.change.content.sourceVerified=true;}],['missing raw hash',e=>{e.hash=null;}],
])test('untrusted journal rejects '+name,()=>{
 const a=copy(append());mutate(a[0]);assert.throws(()=>replay(a),/thesis_journal_rejected/);
});
test('even recomputed hashes cannot authorize scope/clock/sequence/unknown-key violations',()=>{
 for(const mutate of [e=>{e.asset.mint=OTHER;},e=>{e.sequence=2;},e=>{e.created_at='2026-10-27T00:00:00.000Z';},e=>{e.ownerScope='22345678-1234-4234-8234-123456789abc';}]){
  const a=copy(append());mutate(a[0]);rehash(a[0]);assert.throws(()=>replay(a),/thesis_journal_rejected/);
 }
});
for(const content of ['', ' '.repeat(5),'x'.repeat(2001),'hello\u0000secret','\u202Espoof'])test('invalid/bounded owner text rejected '+JSON.stringify(content.slice(0,30)),()=>assert.throws(()=>append([],{...NOTE,content:{...NOTE.content,thesis:content}}),/thesis_journal_rejected/));
test('literal prose/newlines and markup stay owner text, never executed or added to fact cards',()=>{
 const text='Owner hypothesis: value < threshold.\n<script>not executable in this schema</script>';
 const a=append([],{...NOTE,content:{...NOTE.content,thesis:text}});assert.equal(replay(a).entries[0].change.content.thesis,text);assert.equal(api.sourceOffSnapshot(SCOPE.asset.mint,NOW).narrative,null);
});
test('revision must supersede the latest explicit thesis, updates do not erase previous thesis',()=>{
 const a=append(),b=append(a,update),c=append(b,revised);assert.equal(c[2].supersedes,a[0].hash);
 const forged=copy(c);forged[2].supersedes=b[1].hash;rehash(forged[2]);assert.throws(()=>replay(forged),/thesis_journal_rejected/);
});
test('earlier timestamp, duplicate note and reversed ordering cannot manufacture new history',()=>{
 const a=append(),b=append(a,update);assert.throws(()=>append(b,update,{recorded_at:a[0].recorded_at}),/thesis_journal_rejected/);
 assert.throws(()=>replay([b[1],b[0]]),/thesis_journal_rejected/);assert.throws(()=>replay([a[0],a[0]]),/thesis_journal_rejected/);
});
test('unknown/future redaction targets and privacy references are rejected',()=>{
 const a=append();for(const c of [{kind:'redaction_requested',content:{targets:['a'.repeat(64)],reason:'review'},fact_snapshot_refs:[]},{kind:'deletion_requested',content:{reason:'review'},fact_snapshot_refs:[api.sourceOffSnapshot(SCOPE.asset.mint,NOW).id]}])assert.throws(()=>append(a,c),/thesis_journal_rejected/);
});
test('wire validator rejects duplicate/escaped keys, nonfinite, trailing, deep and over-size packets with categorical errors',()=>{
 const a=append(),good=JSON.stringify(a);assert.equal(api.validateThesisPacket(good,SCOPE,NOW+10000).length,1);
 for(const text of [good.replace('"sequence":1','"sequence":1,"sequence":1'),good.replace('"sequence":1','"sequence":1,"\\u0073equence":1'),good.replace('"sequence":1','"sequence":NaN'),good+' []','['.repeat(20)+']'.repeat(20),'x'.repeat(131073)]){
  assert.throws(()=>api.validateThesisPacket(text,SCOPE,NOW+10000),e=>e.message==='thesis_journal_rejected'&&!e.message.includes('secret'));
 }
});
test('event/total-byte quotas fail closed, never roll away prior history',()=>{
 let entries=append();for(let n=1;n<64;n++)entries=append(entries,{...update,content:{note:'SYNTHETIC '+n}});
 assert.equal(entries.length,64);assert.throws(()=>append(entries,update),/thesis_journal_rejected/);assert.equal(entries[0].change.kind,'created');
 let bounded=append();assert.throws(()=>{for(let n=1;n<64;n++)bounded=append(bounded,{...revised,content:{thesis:'x'.repeat(2000),invalidation:'i'.repeat(1000),contradictions:'c'.repeat(1000)}});},/thesis_journal_rejected/);
});
