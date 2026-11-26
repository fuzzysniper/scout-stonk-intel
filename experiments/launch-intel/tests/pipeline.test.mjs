import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url),root=process.env.LAUNCH_INTEL_BUILD;
const {replay,socialDraft,attachResearch}=require(path.join(root,'pipeline.js'));
const {fixture,demo,AT,SYNTHETIC_MINT}=require(path.join(root,'fixtures.js'));
const {PROGRAM,ZERO,USDC,TOKEN,TOKEN2022,EVENT_CPI}=require(path.join(root,'decode.js'));
const {bytes58,base58,pda}=require(path.join(root,'identity.js'));
const run=(rs,at=AT)=>replay(rs,at);
function edit(r,fn){const b=JSON.parse(r.transactionJson);fn(b);return {...r,transactionJson:JSON.stringify(b)};}
const status=(r,fn)=>{const s=JSON.parse(r.statusJson);fn(s);return {...r,statusJson:JSON.stringify(s)};};
const eventData=(r,fn)=>edit(r,b=>{const i=b.result.meta.innerInstructions[0].instructions[0];i.data=base58(fn(bytes58(i.data)));});
const c=r=>r.candidates[0];
const disclosure={holdings:'NONE_DECLARED',compensation:'NONE_DECLARED',associatedToken:'NONE_DECLARED'};

test('creation is a WAIT observation, never money eligibility or authentic alert',()=>{
 const r=run([fixture()]);assert.equal(c(r).state,'OBSERVE');assert.equal(c(r).tokenProgram,TOKEN2022);assert.equal(c(r).quoteMint,ZERO);
 assert.equal(c(r).quoteUnit,'native SOL lamports');assert.equal(c(r).creationTimeUtc,'2026-10-22T12:00:00.000Z');
 assert.deepEqual(c(r).history.map(x=>x.state),['NEW','IDENTITY_VERIFIED','OBSERVE']);
 assert.equal(c(r).claims[0].finality,'RPC_REPORTED_FINALIZED');assert.equal(c(r).claims[0].sourceClock,'UNVERIFIED');
 assert.match(r.assurance,/NOT_AN_AUTHENTIC/);assert.equal(r.eligibleRealMoneyCandidates,0);assert.equal(r.returns,null);assert.ok(Object.isFrozen(c(r)));
});
for(const finality of ['processed','confirmed'])test(finality+' never authenticates identity or enables draft',()=>{
 const r=run([fixture({finality})]);assert.equal(c(r).state,'INSUFFICIENT');assert.equal(c(r).curve,null);assert.equal(c(r).activity.sampledBuys,0);assert.equal(socialDraft(r,SYNTHETIC_MINT,disclosure).state,'WITHHELD');
});
test('null/missing status is provisional; failed and reorged status invalidate',()=>{
 for(const statusJson of [null,JSON.stringify({jsonrpc:'2.0',id:2,result:{value:[null]}})])assert.equal(c(run([{...fixture(),statusJson}])).state,'INSUFFICIENT');
 const r=status(fixture(),b=>b.result.value[0].err={InstructionError:[0,'Custom']});assert.equal(c(run([r])).state,'REJECT');
});
test('provisional to final upgrade retains original receipt and immutable trail',()=>{
 const r=run([fixture({finality:'processed'}),fixture({at:'2026-10-22T12:00:12.000Z'})],'2026-10-22T12:00:12Z');
 assert.equal(c(r).state,'OBSERVE');assert.equal(c(r).firstReceivedAt,AT);assert.equal(c(r).claims.length,2);assert.equal(c(r).claims[0].finality,'PROVISIONAL');
});
test('duplicate replays do not count activity twice; actual u64 is never Number-rounded',()=>{
 const d=demo().slice(0,3),r=run([...d,d[2]],'2026-10-22T12:00:21Z');assert.equal(c(r).activity.sampledBuys,1);assert.equal(c(r).activity.tokenAtomicSum,'9007199254740993');assert.equal(r.audit.at(-1).result,'DUPLICATE_NO_CHANGE');
});
test('revised payload and reorged slot invalidate rather than replace earlier evidence',()=>{
 for(const second of [fixture({fields:{token_total_supply:'42'}}),fixture({slot:101})]){
  const r=run([fixture({finality:'processed'}),second]);assert.equal(c(r).state,'REJECT');assert.equal(c(r).claims.length,1);assert.equal(r.audit[1].result,'conflicting_transaction_identity');
 }
});
test('exact non-native quote supported without assumed decimals; arbitrary quote not accepted',()=>{
 const r=run([fixture({quote:USDC})]);assert.equal(c(r).state,'OBSERVE');assert.equal(c(r).quoteMint,USDC);assert.match(c(r).quoteUnit,/NOT OBSERVED/);
 const q=base58(Buffer.alloc(32,9));assert.equal(c(run([fixture({quote:q})])).state,'REJECT');
});
test('classic Token and Token-2022 remain distinct',()=>{
 assert.equal(c(run([fixture({instruction:'create'})])).tokenProgram,TOKEN);
 assert.equal(c(run([fixture()])).tokenProgram,TOKEN2022);
 assert.match(c(run([fixture()])).unknowns.join(' '),/extension controls NOT OBSERVED/);
});
test('unapproved captures can be decoded but never called authentic or social-exported',()=>{
 const r=run([{...fixture(),origin:'UNVERIFIED_OFFLINE'}]);assert.match(r.assurance,/OFFLINE_ONLY/);assert.equal(socialDraft(r,SYNTHETIC_MINT,disclosure).text,null);
});
test('all rejects, malformed identities and unpriced outcomes stay in cohort/audit',()=>{
 const r=run(demo(),'2026-10-22T12:00:21Z');assert.equal(r.candidates.length,2);assert.equal(r.candidates[1].state,'REJECT');assert.equal(r.audit.length,4);assert.equal(r.prices,null);
});
test('causal replay excludes future availability; does not rewrite previous frozen result',()=>{
 const d=demo(),earlier=run(d,AT),before=JSON.stringify(earlier);assert.equal(c(earlier).activity.sampledBuys,0);assert.equal(earlier.candidates.length,1);
 const later=run(d,'2026-10-22T12:00:21Z');assert.equal(c(later).activity.sampledBuys,1);assert.equal(JSON.stringify(earlier),before);
});
test('late, stale, future-clock and out-of-order receipts do not qualify momentum',()=>{
 const stale=run([fixture()],'2026-10-22T12:02:00Z');assert.equal(c(stale).state,'INSUFFICIENT');
 assert.equal(c(run([fixture({fields:{timestamp:'1792670500'}})])).state,'INSUFFICIENT');
 assert.equal(c(run([fixture({at:'2026-10-22T12:00:12Z'}),fixture()],'2026-10-22T12:00:13Z')).state,'REJECT');
 const older=fixture({kind:'TradeEvent',seed:2,slot:99});assert.equal(c(run([fixture(),older])).state,'REJECT');
});
test('finalized trade without observed creation is insufficient, not invented launch time',()=>{
 const r=run([fixture({kind:'TradeEvent'})]);assert.equal(c(r).state,'INSUFFICIENT');assert.equal(c(r).creationTimeUtc,null);assert.equal(c(r).activity.sampledBuys,0);
});
test('null blockTime stays unknown, never copied from receipt/event clock',()=>{
 const r=run([edit(fixture(),b=>b.result.blockTime=null)]);assert.equal(c(r).claims[0].blockTime,null);
});
test('completion stops pre-migration observation and later activity cannot recover it',()=>{
 const complete=fixture({kind:'CompleteEvent',seed:2,slot:101});const trade=fixture({kind:'TradeEvent',seed:3,slot:102});
 const r=run([fixture(),complete,trade]);assert.equal(c(r).stage,'COMPLETE_OR_MIGRATED');assert.equal(c(r).state,'REJECT');assert.equal(c(r).activity.sampledBuys,0);assert.equal(c(r).claims.length,3);
});
test('provisional trades never increment finalized sample counts',()=>{
 const r=run([fixture(),fixture({kind:'TradeEvent',seed:2,slot:101,finality:'confirmed'})]);assert.equal(c(r).activity.sampledBuys,0);assert.equal(c(r).state,'INSUFFICIENT');
});
const mutations={
 'wrong PumpSwap/other program':r=>edit(r,b=>b.result.transaction.message.accountKeys[0]=ZERO),
 'wrong signature':r=>({...r,signature:base58(Buffer.alloc(64,99))}),
 'ticker instead of mint':r=>({...r,mintHint:'PUMP'}),
 'alias whitespace mint':r=>({...r,mintHint:r.mintHint+' '}),
 'invalid calendar':r=>({...r,availableAt:'2026-02-30T12:00:10Z'}),
 'availability precedes receipt':r=>({...r,availableAt:'2026-10-22T12:00:09Z'}),
 'wrong network':r=>({...r,network:'devnet'}),
 'failed transaction':r=>edit(r,b=>b.result.meta.err={InstructionError:[0,'Custom']}),
 'wrong curve PDA':r=>edit(r,b=>b.result.transaction.message.accountKeys[3]=ZERO),
 'wrong token program':r=>edit(r,b=>b.result.transaction.message.accountKeys[8]=TOKEN),
 'wrong event authority':r=>edit(r,b=>b.result.meta.innerInstructions[0].instructions[0].accounts=[0]),
 'nested/router event CPI':r=>edit(r,b=>b.result.meta.innerInstructions[0].instructions[0].stackHeight=3),
 'unframed forged log':r=>edit(r,b=>{b.result.meta.innerInstructions=[];b.result.meta.logMessages=['Program data: fake'];}),
 'unknown event discriminator':r=>eventData(r,b=>{b[EVENT_CPI.length]=0;return b;}),
 'truncated event':r=>eventData(r,b=>b.subarray(0,b.length-1)),
 'unknown appended revision':r=>eventData(r,b=>Buffer.concat([b,Buffer.from([0])])),
 'duplicate inner group':r=>edit(r,b=>b.result.meta.innerInstructions.push(b.result.meta.innerInstructions[0])),
 'wrong finalized slot':r=>status(r,b=>b.result.value[0].slot++),
 'finality response for different request':r=>status(r,b=>b.id=55),
 'unbound status signature':r=>({...r,statusRequestJson:r.statusRequestJson.replace(r.signature,base58(Buffer.alloc(64,98)))}),
 'unbound transaction request':r=>({...r,transactionRequestJson:r.transactionRequestJson.replace(r.signature,base58(Buffer.alloc(64,98)))}),
 'unrecognized finality':r=>status(r,b=>b.result.value[0].confirmationStatus='safe'),
 'unsafe JSON slot':r=>edit(r,b=>b.result.slot=9007199254740992),
 'duplicate JSON keys':r=>({...r,transactionJson:r.transactionJson.replace('"slot":100','"slot":100,"slot":101')}),
 'untrusted provider JSON alias':r=>({...r,transactionJson:JSON.stringify({mint:r.mintHint,txType:'create'})}),
};
for(const [name,mutation] of Object.entries(mutations))test('reject '+name,()=>{
 const r=run([mutation(fixture())]);assert.equal(r.eligibleRealMoneyCandidates,0);assert.ok(!r.candidates.length||c(r).state==='REJECT');assert.notEqual(r.audit[0].result,'OFFLINE_EVIDENCE_RECORDED');
});
test('trade quote mismatch, sell binding and zero amounts are rejected',()=>{
 for(const fields of [{quote_mint:USDC},{is_buy:false},{token_amount:'0'}])assert.equal(c(run([fixture(),fixture({kind:'TradeEvent',seed:2,slot:101,fields})])).state,'REJECT');
});
test('socialDraft is conspicuous synthetic text with no private positions or action claims',()=>{
 const r=run([fixture()]);const draft=socialDraft(r,SYNTHETIC_MINT,{holdings:'PRESENT',compensation:'PRESENT',associatedToken:'PRESENT'});
 assert.equal(draft.state,'FOUNDER_REVIEW_ONLY');assert.match(draft.text,/SYNTHETIC OFFLINE EXAMPLE/);assert.match(draft.text,/no validated trade thesis/);assert.match(draft.text,/holdings: present/);assert.doesNotMatch(draft.text,/APE|BUY|5x|10x|guaranteed/);
 for(const d of [{...disclosure,holdings:'UNKNOWN'},{...disclosure,compensation:'UNKNOWN'},{}, {...disclosure,privateWallet:'SECRET'}])assert.equal(socialDraft(r,SYNTHETIC_MINT,d).state,'WITHHELD');
});
test('read-only seam preserves seven insufficient tracked mints and journal reference',()=>{
 const existing={mode:'recorded',candidates:Array.from({length:7},()=>({qualification:{state:'INSUFFICIENT EVIDENCE'}})),policy:{liveAllocationCents:0},performance:{eligibleCandidates:0,nav:null,netReturn:null,pricedGenuineOutcomes:0}},before=JSON.stringify(existing);
 const a=attachResearch(existing,run([fixture()]));assert.equal(a.existing,existing);assert.equal(JSON.stringify(existing),before);assert.deepEqual(a.journalCommands,[]);
 assert.throws(()=>attachResearch({...existing,policy:{liveAllocationCents:100}},a.research));
});
test('identity math has a published independent PDA vector and exact base58 round trips',()=>{
 assert.equal(pda([Buffer.from('global')],PROGRAM),'4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');
 for(const n of [32,64])assert.deepEqual(bytes58(base58(Buffer.alloc(n,8)),n),Buffer.alloc(n,8));
 assert.throws(()=>bytes58('0'.repeat(32),32));
});
test('deterministic replay, no default RPC, network, clocks, autopost or wallet dependencies',()=>{
 const old=globalThis.fetch;let calls=0;globalThis.fetch=()=>{calls++;throw Error('UNAUTHORIZED');};
 try{assert.deepEqual(run(demo(),'2026-10-22T12:00:21Z'),run(demo(),'2026-10-22T12:00:21Z'));assert.equal(calls,0);}finally{globalThis.fetch=old;}
 const sources=['pipeline.ts','identity.ts','decode.ts','fixtures.ts'].map(f=>readFileSync(new URL('../'+f,import.meta.url),'utf8')).join('\n');
 assert.doesNotMatch(sources,/\bfetch\s*\(|WebSocket|https?:\/\/|process\.env|Date\.now|setInterval|setTimeout|node:(?:https?|net|tls|fs)|\.sendTransaction\b/);
 assert.ok(readdirSync(new URL('../',import.meta.url)).every(f=>!['package.json','server.ts','adapter.ts'].includes(f)));
});
