import test from 'node:test';
import assert from 'node:assert/strict';
import {api,risk,engine,AT,context,copy,decision,execution,review,override,journal,append,full,result,metrics} from './fixtures.mjs';
const good=j=>{const r=result(j);assert.equal(r.status,'valid',JSON.stringify(r.issues));return r;};
const bad=(j,code)=>{const r=result(j);assert.equal(r.status,'invalid');assert.equal(r.state,null);if(code)assert.equal(r.issues[0].code,code);return r;};

test('empty journal is valid, has null rates, never an invented success',()=>{const m=good(journal()).state.metrics;assert.equal(m.preplannedReportedEntries.percentBps,null);assert.equal(m.capAdherence.assessableRate.percentBps,null);assert.equal(m.decisionChains,0);});
test('real B decisions and review assessment reused, detached and frozen',()=>{const j=full(),r=good(j);assert.deepEqual(copy(r.state.journal),j);assert.ok(Object.isFrozen(r.state.journal.receipts[0].event.plan));j.receipts[0].event.plan.reason='edited';assert.notEqual(r.state.journal.receipts[0].event.plan.reason,'edited');assert.equal(r.state.metrics.capAdherence.within,1);});
test('caller data never mutated',()=>{const j=full(),before=JSON.stringify(j);good(j);assert.equal(JSON.stringify(j),before);});
test('deterministic replay with explicit clocks',()=>assert.deepEqual(result(),result()));
test('JSON round trip preserves exact original event clocks/zero/decimal strings',()=>{const j=full(),r=engine.parse(JSON.stringify(j),context);assert.equal(r.status,'valid');assert.deepEqual(copy(r.state.journal),j);assert.equal(r.state.journal.receipts[0].event.plan.assumptions.capital.existingExposure.amount,'0');});
for(const choice of ['PASS','WATCH']){
 test(choice+' reason-only is valuable, no manufactured entry',()=>{const m=good(append(journal(),decision(choice))).state.metrics;assert.equal(m.currentChoices[choice],1);assert.equal(m.outcomes.missingOrUnknown,1);assert.equal(m.preplannedReportedEntries.denominator,0);});
 test(choice+' explicit no-entry review preserved as process outcome',()=>{const j=append(append(journal(),decision(choice)),review({outcome:'no_entry'}));const m=good(j).state.metrics;assert.equal(m.outcomes.noEntryReported,1);assert.equal(m.capAdherence.assessableRate.denominator,0);assert.equal(m.currentChoices[choice],1);});
}
test('original PLAN pre-entry is owner-reported only, not provider verified',()=>{const m=metrics();assert.deepEqual(m.preplannedReportedEntries,{numerator:1,denominator:1,percentBps:10000});assert.equal(m.executionVerified,false);assert.equal(m.outsideAccountExecution,'unknown');assert.equal(m.actualLoss,null);});
test('missing review does not imply caps met or observed outcome',()=>{const m=good(append(append(journal(),decision()),execution())).state.metrics;assert.equal(m.capAdherence.unknown,1);assert.equal(m.outcomes.missingOrUnknown,1);assert.equal(m.capAdherence.assessableRate.percentBps,null);});
test('unknown outcome remains unknown even reviewed',()=>assert.equal(metrics().outcomes.missingOrUnknown,1));
for(const outcome of ['gain','loss','flat'])test(outcome+' label is owner-reported coverage, never financial magnitude',()=>{const j=full();j.receipts[2].event.outcome=outcome;const m=good(j).state.metrics;assert.equal(m.outcomes.knownOwnerReported,1);assert.equal(m.actualLoss,null);assert.equal('profit' in m,false);assert.equal('roi' in m,false);});
test('reported late entry preserved and never counted preplanned',()=>{const j=full({occurredAt:'2026-10-27T11:58:00.000Z'}),m=good(j).state.metrics;assert.equal(m.preplannedReportedEntries.numerator,0);assert.equal(m.processAdherence.breached,1);});
test('same-time reported entry is not preplanned',()=>assert.equal(good(full({occurredAt:AT})).state.metrics.preplannedReportedEntries.numerator,0));
test('cap breach uses original B arithmetic without resizing input',()=>{const j=full({units:'11'}),m=good(j).state.metrics;assert.equal(m.capAdherence.breached,1);assert.equal(m.capAdherence.assessableRate.percentBps,0);assert.equal(j.receipts[1].event.units,'11');});
test('asset mismatch is process breach even if hypothetical caps met',()=>{const j=full({asset:{label:'OTHER SYNTHETIC',assetKey:null}}),m=good(j).state.metrics;assert.equal(m.capAdherence.within,1);assert.equal(m.processAdherence.breached,1);});
test('unknown stop is not rewarded as process adherence',()=>assert.equal(good(full({stopPrice:null})).state.metrics.processAdherence.unknown,1));
test('WATCH with reported entry has no preplanned caps or implicit authorization',()=>{const j=full();j.receipts[0].event=decision('WATCH');const m=good(j).state.metrics;assert.equal(m.preplannedReportedEntries.numerator,0);assert.equal(m.capAdherence.unknown,1);assert.equal(m.processAdherence.breached,1);});
for(const mode of ['paper','simulated','user_reported'])test('mode '+mode+' never becomes independently verified',()=>{const r=good(full({mode}));assert.equal(r.state.metrics.executionVerified,false);assert.equal(r.state.journal.receipts[1].event.mode,mode);assert.equal(r.state.metrics.reportedEntryModes[mode],1);});
test('review edits append supersession, preserve originals',()=>{const j=full();append(j,review({id:'v2',recordedAt:'2026-10-27T12:05:00.000Z',outcome:'flat'}),{executionId:'x1',supersedesReviewId:'v1',editReason:'Owner corrected unknown outcome'});const m=good(j).state.metrics;assert.equal(m.outcomes.knownOwnerReported,1);assert.equal(j.receipts[2].event.outcome,'unknown');});
test('decision edit preserves old receipt and deduplicates chain denominator',()=>{const j=append(journal(),decision());const d=copy(decision());d.id='d2';d.recordedAt='2026-10-27T12:02:00.000Z';append(j,d,{supersedesDecisionId:'d1',editReason:'Changed chosen assumptions'});const s=good(j).state;assert.deepEqual(s.activeDecisionIds,['d2']);assert.equal(s.metrics.decisionChains,1);assert.equal(s.metrics.decisionEdits,1);assert.equal(s.metrics.outcomes.missingOrUnknown,1);});
test('post-entry edit never rewrites original cap assessment',()=>{const j=full({units:'11'}),d=copy(decision());d.id='d2';d.recordedAt='2026-10-27T12:05:00.000Z';d.plan.assumptions.proposedUnits='10';append(j,d,{supersedesDecisionId:'d1',editReason:'Later edit cannot cure earlier breach'});assert.equal(good(j).state.metrics.capAdherence.breached,1);});
test('override declaration never changes original caps or authorizes entry',()=>{const j=append(full({units:'11'}),override());const m=good(j).state.metrics;assert.equal(m.capAdherence.breached,1);assert.equal(m.overrides.records,1);assert.equal(m.overrides.rate.percentBps,10000);});
test('multiple override declarations do not inflate chain frequency',()=>{const j=append(append(full(),override()),override({id:'o2',recordedAt:'2026-10-27T12:05:00.000Z',rule:'other'}));const m=good(j).state.metrics;assert.equal(m.overrides.records,2);assert.equal(m.overrides.decisionChains,1);});
test('restoring identical known copy is idempotent',()=>assert.equal(engine.replay(full(),context,full()).status,'valid'));
test('valid append preserves trusted prefix',()=>{const prior=full(),next=append(copy(prior),override());assert.equal(engine.replay(next,context,prior).status,'valid');});
test('old restore cannot erase known suffix',()=>{const old=full(),latest=append(copy(old),override());assert.equal(engine.replay(old,context,latest).issues[0].code,'restore_rewrites_or_truncates_trusted_prefix');});
test('same-ID historical text rewrite fails against trusted copy',()=>{const old=full(),next=copy(old);next.receipts[0].event.plan.reason='Rewritten later';assert.equal(engine.replay(next,context,old).status,'invalid');});
test('without prior trusted copy, consistent complete rewrite is honestly undetectable',()=>{const j=full();j.receipts[0].event.plan.reason='Entire copy changed';assert.ok(good(j).state.warnings.includes('without_trusted_previous_copy_rollback_or_complete_rewrite_is_undetectable'));});
test('old receipt reappearing as append fails duplicate event identity',()=>{const j=append(full(),decision());bad(j);});
test('no-entry then later entry does not erase original no-entry claim',()=>{const j=append(append(journal(),decision()),review({outcome:'no_entry'}));append(j,execution({occurredAt:'2026-10-27T12:04:00.000Z',recordedAt:'2026-10-27T12:05:00.000Z'}));const s=good(j).state;assert.equal(s.metrics.outcomes.missingOrUnknown,1);assert.equal(s.metrics.outcomes.noEntryReported,0);assert.ok(s.warnings.some(x=>x.startsWith('earlier_no_entry')));});
test('opaque evidence IDs retained, not licensed source bodies or verification',()=>{const j=full();j.receipts[0].event.plan.evidenceRef={version:'unfarmd-evidence/1',assetKey:null,evidenceIds:['opaque-source-1']};const s=good(j).state;assert.deepEqual(s.journal.receipts[0].event.plan.evidenceRef.evidenceIds,['opaque-source-1']);assert.ok(s.warnings.some(x=>x.startsWith('evidence_links')));});
test('aggregate-only redaction has no names, clocks, capital, prices or evidence',()=>{const j=full(),s=engine.summary(j,context),raw=JSON.stringify(s);for(const privateValue of ['INVENTED','Synthetic','2026-','d1','"10000"','unfarmd-evidence'])assert.equal(raw.includes(privateValue),false,privateValue);assert.equal(s.status,'valid');assert.equal('capital' in s.metrics,false);});
test('invalid journal has no partial/redacted success metrics',()=>{const j=full();j.receipts[1].event.units='-1';const s=engine.summary(j,context);assert.deepEqual(s,{status:'invalid',metrics:null,storage:'none'});});

const mutations={
 'wrong version':j=>j.version='unfarmd-journal/2',
 'wrong owner journal':j=>j.journalId='other-journal',
 'unknown root field':j=>j.secret='no',
 'fake trusted clocks':j=>j.clockBasis='provider_verified',
 'tail sequence mismatch':j=>j.tail.sequence=1,
 'tail ID mismatch':j=>j.tail.receiptId='missing',
 'truncated suffix':j=>j.receipts.pop(),
 'sequence gap':j=>j.receipts[1].sequence=3,
 'wrong previous receipt':j=>j.receipts[1].previousReceiptId='elsewhere',
 'duplicate receipt ID':j=>j.receipts[1].receiptId='r1',
 'duplicate event ID':j=>j.receipts[1].event.id='d1',
 'unknown receipt field':j=>j.receipts[0].signature='not-proof',
 'event future':j=>j.receipts[0].event.recordedAt='2026-10-28T12:00:00.000Z',
 'receipt future':j=>j.receipts[2].receivedAt='2026-10-28T12:00:00.000Z',
 'receipt clock reversal':j=>j.receipts[1].receivedAt='2026-10-27T11:59:00.000Z',
 'invalid calendar':j=>j.receipts[0].event.recordedAt='2026-02-30T12:00:00.000Z',
 'clock offset not UTC':j=>j.receipts[0].event.recordedAt='2026-10-27T07:00:00.000-05:00',
 'clock no milliseconds':j=>j.receipts[0].event.recordedAt='2026-10-27T12:00:00Z',
 'clock newline':j=>j.receipts[0].event.recordedAt=AT+'\n',
 'ID trailing newline':j=>j.receipts[0].event.id='d1\n',
 'unknown risk version':j=>j.receipts[0].event.version='unfarmd-risk/2',
 'type kind mismatch':j=>j.receipts[0].event.kind='review',
 'PLAN no affirmation':j=>delete j.receipts[0].event.plan.affirmation,
 'PLAN missing numeric value':j=>delete j.receipts[0].event.plan.assumptions.capital.availableCash,
 'PLAN stale at original recording':j=>j.receipts[0].event.plan.assumptions.entry.validForSeconds=1,
 'PLAN costs not acknowledged':j=>j.receipts[0].event.plan.assumptions.costsAcknowledged=false,
 'PLAN over cap':j=>j.receipts[0].event.plan.assumptions.proposedUnits='100',
 'unsupported leverage':j=>j.receipts[0].event.plan.assumptions.instrument='perpetual',
 'USD is not USDC':j=>j.receipts[1].event.currency='USDC',
 'execution instrument wrong':j=>j.receipts[1].event.instrument='margin',
 'execution claim onchain':j=>j.receipts[1].event.mode='provider_verified',
 'execution before occurred clock':j=>j.receipts[1].event.recordedAt='2026-10-27T12:00:30.000Z',
 'orphan execution':j=>j.receipts[1].event.decisionId='missing',
 'orphan review':j=>j.receipts[2].event.decisionId='missing',
 'review wrong execution link':j=>j.receipts[2].executionId='missing',
 'review omits known entry':j=>j.receipts[2].executionId=null,
 'review before entry receipt':j=>j.receipts[2].event.recordedAt='2026-10-27T12:01:30.000Z',
 'no entry with reported entry':j=>j.receipts[2].event.outcome='no_entry',
 'fabricated outcome':j=>j.receipts[2].event.outcome='guaranteed_profit',
 'review absent lessons':j=>j.receipts[2].event.lessons=[],
 'source body injected':j=>j.receipts[0].event.plan.evidenceRef={version:'unfarmd-evidence/1',assetKey:null,evidenceIds:['e1'],body:'restricted provider content'},
 'nonopaque evidence URL':j=>j.receipts[0].event.plan.evidenceRef={version:'unfarmd-evidence/1',assetKey:null,evidenceIds:['https://invalid.example/item']},
 'plaintext credential':j=>j.receipts[0].event.plan.notes='api_key=synthetic_sensitive_value',
 'bank account text':j=>j.receipts[0].event.plan.notes='account number: 123456789012',
 'private key text':j=>j.receipts[0].event.plan.notes='-----BEGIN PRIVATE KEY-----',
 'authenticated URL':j=>j.receipts[0].event.plan.notes='https://user:password@invalid.example',
 'oversized prose':j=>j.receipts[0].event.plan.reason='x'.repeat(2001),
 'sparse receipts':j=>delete j.receipts[1],
 'accessor input':j=>Object.defineProperty(j,'tail',{enumerable:true,get(){throw Error('sensitive getter');}}),
 'cyclic input':j=>j.receipts[0].event.plan.notes=j,
 'symbol input':j=>j[Symbol('hidden')]='private',
 'nonenumerable hidden input':j=>Object.defineProperty(j,'hidden',{value:'private'}),
 'exotic prototype':j=>Object.setPrototypeOf(j,new Date()),
 'unsafe integer':j=>j.receipts[0].sequence=Number.MAX_SAFE_INTEGER+1,
 'nonfinite number':j=>j.receipts[0].sequence=Infinity,
};
for(const [name,change] of Object.entries(mutations))test('fail closed: '+name,()=>{const j=full();change(j);bad(j);});
for(const value of ['0','-1','1e3','1.0000000001','1000000000',' 1','1\n',NaN,null,{},'01'])test('invalid units '+JSON.stringify(value),()=>{const j=full();j.receipts[1].event.units=value;bad(j);});
test('more than 128 receipts rejected',()=>{const j=journal();for(let i=0;i<129;i++)append(j,decision('PASS','p'+i));bad(j);});
test('maximum 128 minimal decisions accepted',()=>{const j=journal();for(let i=0;i<128;i++)append(j,decision('PASS','p'+i));assert.equal(good(j).state.metrics.decisionChains,128);});
test('duplicate same-timestamp entries cannot evade original cap through fills',()=>{const j=full();append(j,execution({id:'x2',recordedAt:'2026-10-27T12:04:00.000Z'}));bad(j);});
test('new decision version cannot create a second entry in same chain',()=>{const j=full(),d=copy(decision());d.id='d2';d.recordedAt='2026-10-27T12:04:00.000Z';append(j,d,{supersedesDecisionId:'d1',editReason:'Later edit'});append(j,execution({id:'x2',decisionId:'d2',recordedAt:'2026-10-27T12:05:00.000Z'}));bad(j,'multiple_entries_unsupported');});
test('execution cannot attach to superseded decision',()=>{const j=append(journal(),decision()),d=copy(decision());d.id='d2';d.recordedAt='2026-10-27T12:00:30.000Z';append(j,d,{supersedesDecisionId:'d1',editReason:'Edit before entry'});append(j,execution());bad(j);});
test('superseding unknown or already superseded target fails',()=>{const j=append(journal(),decision()),d=copy(decision());d.id='d2';append(j,d,{supersedesDecisionId:'missing',editReason:'Unknown target'});bad(j);});
test('asset switches require new independent decision chain',()=>{const j=append(journal(),decision()),d=copy(decision());d.id='d2';d.plan.asset.label='OTHER';append(j,d,{supersedesDecisionId:'d1',editReason:'Wrong asset'});bad(j);});
test('review replacement without explicit supersession fails',()=>{const j=full();append(j,review({id:'v2',recordedAt:'2026-10-27T12:04:00.000Z'}),{executionId:'x1'});bad(j);});
test('review cannot silently cross decision references',()=>{const j=full();append(j,decision('WATCH','d2','2026-10-27T12:04:00.000Z'));append(j,review({id:'v2',decisionId:'d2',recordedAt:'2026-10-27T12:05:00.000Z'}),{executionId:'x1'});bad(j);});
test('override unknown rule/reference rejected',()=>{const j=append(full(),override({rule:'authorized_to_trade'}));bad(j);});
test('failed engine never produces partial state or leaks error content',()=>{const broken=api.createJournalEngine({...risk,recordDecision(){throw Error('password=SENSITIVE_CANARY');}});const r=broken.replay(full(),context);assert.equal(r.status,'invalid');assert.equal(r.state,null);assert.equal(JSON.stringify(r).includes('SENSITIVE'),false);});
test('getter is rejected without invocation',()=>{let called=0;const j=full();Object.defineProperty(j.receipts[0].event.plan,'notes',{enumerable:true,get(){called++;return 'private';}});bad(j);assert.equal(called,0);});
test('revoked proxy cannot throw outside engine',()=>{const p=Proxy.revocable({},{});p.revoke();assert.equal(engine.replay(p.proxy,context).status,'invalid');});
test('hostile thrown proxy cannot break categorical redaction',()=>{const x=Proxy.revocable({},{});x.revoke();const p=new Proxy({},{ownKeys(){throw x.proxy;}});const r=engine.replay(p,context);assert.equal(r.status,'invalid');assert.equal(r.state,null);});
test('hostile forged error object cannot smuggle private text',()=>{const p=new Proxy({},{ownKeys(){throw {journalError:'SENSITIVE_CANARY'};}});const r=engine.replay(p,context);assert.equal(r.status,'invalid');assert.equal(JSON.stringify(r).includes('SENSITIVE'),false);});
for(const raw of ['{','[]','null','{} trailing','{"a":1,"a":2}','{"a":1,"\\u0061":2}','[1,]','{"a":NaN}','{"a":undefined}','{"a":1,}','{"__proto__":{}}'])test('strict JSON rejects '+raw,()=>assert.equal(engine.parse(raw,context).status,'invalid'));
test('oversized serialized import fails before semantic validation',()=>assert.equal(engine.parse(' '.repeat(api.LIMITS.bytes+1),context).status,'invalid'));
test('JSON huge nested string/depth and invalid UTF input fail bounded',()=>{assert.equal(engine.parse('['.repeat(30)+'null'+']'.repeat(30),context).status,'invalid');});
test('context must be explicit, exact and UTC',()=>{for(const ctx of [null,{}, {...context,extra:true},{...context,evaluatedAt:'invalid'}])assert.equal(engine.replay(full(),ctx).status,'invalid');});
test('valid Unicode prose including paired emoji survives unchanged',()=>{const j=full();j.receipts[0].event.plan.notes='考慮せずに参加しない 🧭';assert.equal(good(j).state.journal.receipts[0].event.plan.notes,j.receipts[0].event.plan.notes);});
for(const unit of ['\ud800','\udc00'])test('unpaired surrogate rejected '+JSON.stringify(unit),()=>{const j=full();j.receipts[0].event.plan.notes=unit;bad(j);});
test('unknown outcomes and explicit no-entry remain separate in mixed journal',()=>{const j=full();append(j,decision('PASS','d2','2026-10-27T12:04:00.000Z'));append(j,review({id:'v2',decisionId:'d2',recordedAt:'2026-10-27T12:05:00.000Z',outcome:'no_entry'}));append(j,decision('WATCH','d3','2026-10-27T12:06:00.000Z'));const m=good(j).state.metrics;assert.equal(m.decisionChains,3);assert.equal(m.outcomes.missingOrUnknown,2);assert.equal(m.outcomes.noEntryReported,1);assert.equal(m.preplannedReportedEntries.denominator,1);});
test('per-event byte limit is enforced separately from Unicode character limit',()=>{const j=append(journal(),decision());for(const field of ['reason','thesis','counterThesis','horizon','notes'])j.receipts[0].event.plan[field]='界'.repeat(2000);assert.equal(risk.recordDecision(j.receipts[0].event.plan,{id:'d1',recordedAt:AT}).ok,true);bad(j,'invalid_event_identity_clock_or_size');});
test('total UTF-8 bytes bounded even with short valid events and fewer than 128 receipts',()=>{const j=journal();for(let i=0;i<100;i++){const d=copy(decision('PASS','d'+i));d.plan.reason='界'.repeat(2000);append(j,d);}assert.ok(JSON.stringify(j).length<api.LIMITS.bytes);bad(j,'input_bounds');});
test('no ambient clock, fetch, storage or randomness is used during replay',()=>{const names=['fetch','localStorage','sessionStorage','indexedDB'],saved=Object.fromEntries(names.map(n=>[n,Object.getOwnPropertyDescriptor(globalThis,n)])),now=Date.now,random=Math.random;let accesses=0;try{for(const n of names)Object.defineProperty(globalThis,n,{configurable:true,get(){accesses++;throw Error('ambient access');}});Date.now=()=>{throw Error('ambient clock');};Math.random=()=>{throw Error('ambient randomness');};good(full());assert.equal(accesses,0);}finally{Date.now=now;Math.random=random;for(const n of names){if(saved[n])Object.defineProperty(globalThis,n,saved[n]);else delete globalThis[n];}}});
test('original evidence token syntax with dots and colons retained exactly',()=>{const j=full();j.receipts[0].event.plan.evidenceRef={version:'unfarmd-evidence/1',assetKey:null,evidenceIds:['source:filing.1']};assert.deepEqual(good(j).state.journal.receipts[0].event.plan.evidenceRef.evidenceIds,['source:filing.1']);});
for(const key of ['journalId','\\u006aournalId'])test('duplicate valid journal field is rejected before JSON overwrite '+key,()=>{const raw=JSON.stringify(full()).replace('"journalId":"synthetic-journal"','"journalId":"synthetic-journal","'+key+'":"synthetic-journal"');assert.equal(engine.parse(raw,context).issues[0].code,'duplicate_json_key');});
test('duplicate nested valid risk field cannot overwrite earlier history',()=>{const raw=JSON.stringify(full()).replace('"decision":"PLAN"','"decision":"PLAN","decision":"PLAN"');assert.equal(engine.parse(raw,context).issues[0].code,'duplicate_json_key');});
test('late-imported previously recorded entry keeps its original predecision clock',()=>{const j=append(journal(),decision());append(j,execution({occurredAt:'2026-10-27T11:55:00.000Z',recordedAt:'2026-10-27T11:56:00.000Z'}),{receivedAt:'2026-10-27T12:02:00.000Z'});append(j,review(),{executionId:'x1'});const s=good(j).state;assert.equal(s.journal.receipts[1].event.recordedAt,'2026-10-27T11:56:00.000Z');assert.equal(s.metrics.preplannedReportedEntries.numerator,0);assert.equal(s.metrics.processAdherence.breached,1);});
