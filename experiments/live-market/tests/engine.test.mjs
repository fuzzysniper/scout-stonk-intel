import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require=createRequire(import.meta.url),build=process.env.LIVE_MARKET_BUILD;
const {Engine}=require(path.join(build,'engine.js')),{startPilot}=require(path.join(build,'controller.js')),{approve,SCOPE,SCOPE_HASH}=require(path.join(build,'policy.js'));
const {fixture,AT,SYNTHETIC_MINT}=require(path.join(build,'../launch-intel/fixtures.js'));
const {PROGRAM,ZERO}=require(path.join(build,'../launch-intel/decode.js'));
function engine(){const records=[];const e=new Engine('SYNTHETIC_OFFLINE',(kind,data)=>records.push({kind,data:structuredClone(data)}));e.start(AT);e.notice(JSON.stringify({jsonrpc:'2.0',id:1,result:7}),AT);return {e,records};}
function notice(f=fixture(),stage='CreateV2'){
 return JSON.stringify({jsonrpc:'2.0',method:'logsNotification',params:{subscription:7,result:{context:{slot:JSON.parse(f.transactionJson).result.slot},value:{signature:f.signature,err:null,logs:[`Program ${PROGRAM} invoke [1]`,`Program log: Instruction: ${stage}`,`Program ${PROGRAM} success`]}}}});
}
function responses(f=fixture()){const tx=JSON.parse(f.transactionJson),s=JSON.parse(f.statusJson);tx.id=10;s.id=11;return [JSON.stringify(tx),JSON.stringify(s)];}
test('default status is NOT RUN, not fake zero observations',()=>{
 const e=new Engine('SYNTHETIC_OFFLINE',()=>{});assert.equal(e.snapshot(AT).counts,null);assert.throws(()=>e.notice(notice(),AT),/not_started/);
});
test('notification remains provisional and unknown exact mint until raw finalized validation',()=>{
 const {e}=engine(),r=e.notice(notice(),AT);assert.equal(r.mint,null);assert.equal(r.finality,'PROVISIONAL_RPC_NOTIFICATION');
 e.verify(r,...responses(),'2026-10-22T12:00:11Z');assert.equal(r.mint,SYNTHETIC_MINT);assert.equal(r.finality,'RPC_REPORTED_FINALIZED_SAME_PROVIDER');
 const s=e.snapshot('2026-10-22T12:00:11Z');assert.equal(s.counts.finalizedRpcCorroborated,1);assert.equal(s.counts.independentlyFinalized,0);assert.equal(s.mode,'SYNTHETIC_OFFLINE');assert.equal(s.prices,null);
 assert.equal(s.rows[0].activity1m.volume,null);assert.equal(s.rows[0].sourceClockVerified,false);
 e.verify(r,...responses(),'2026-10-22T12:00:12Z');assert.equal(e.finalized,1);
});
test('duplicates count once; revised slot/status is a reorg failure',()=>{
 const {e}=engine(),n=notice();e.notice(n,AT);assert.equal(e.notice(n,AT),null);assert.equal(e.duplicates,1);assert.equal(e.rows.length,1);
 const b=JSON.parse(n);b.params.result.context.slot++;assert.throws(()=>e.notice(JSON.stringify(b),AT),/revision_or_reorg/);
});
test('failed transaction stays rejected; spoofed CPI instruction cannot select candidate',()=>{
 const {e}=engine(),b=JSON.parse(notice());b.params.result.value.err={InstructionError:[0,'Custom']};assert.equal(e.notice(JSON.stringify(b),AT),null);assert.equal(e.rejected,1);
 const other=JSON.parse(notice(fixture({seed:2})));other.params.result.value.logs=[`Program ${ZERO} invoke [1]`,`Program ${PROGRAM} invoke [2]`,'Program log: Instruction: CreateV2',`Program ${PROGRAM} success`,`Program ${ZERO} success`];assert.equal(e.notice(JSON.stringify(other),AT),null);
});
test('unbound, malformed, binary-equivalent, oversized, incomplete and wrong-subscription messages fail closed',()=>{
 for(const mutate of [b=>{b.params.subscription=8;},b=>{b.params.result.value.signature='PUMP';},b=>{b.params.result.value.logs.pop();},b=>{b.jsonrpc='1.0';}]){const {e}=engine(),b=JSON.parse(notice());mutate(b);assert.throws(()=>e.notice(JSON.stringify(b),AT));}
 const {e}=engine();assert.throws(()=>e.notice('x'.repeat(SCOPE.maxFrameBytes+1),AT));assert.throws(()=>e.notice('{"jsonrpc":"2.0","jsonrpc":"1.0"}',AT));
});
for(const [name,mutate] of Object.entries({
 'wrong finality':(t,s)=>{s.result.value[0].confirmationStatus='confirmed';},
 'reorg slot':(t,s)=>{s.result.value[0].slot++;},
 'wrong signature':t=>{t.result.transaction.signatures[0]=fixture({seed:9}).signature;},
 'wrong program':t=>{t.result.transaction.message.accountKeys[0]=ZERO;},
 'failed transaction':t=>{t.result.meta.err={InstructionError:[0,'Custom']};},
 'null transaction':t=>{t.result=null;},
 'missing status':(t,s)=>{s.result.value=[null];},
 'wrong request id':t=>{t.id=9;},
 'unsupported layout':t=>{t.result.meta.innerInstructions=[];},
 'future source clock':t=>{t.result.slot=101;},
}))test('withhold '+name+' without partial verified identity',()=>{
 const {e}=engine(),r=e.notice(notice(),AT),[tx,s]=responses().map(JSON.parse);mutate(tx,s);e.verify(r,JSON.stringify(tx),JSON.stringify(s),AT);
 assert.equal(r.mint,null);assert.equal(r.finality,'PROVISIONAL_RPC_NOTIFICATION');assert.equal(e.finalized,0);assert.equal(e.rejected,1);
});
test('receipt clocks and stale observations never imply fresh source time',()=>{
 const {e}=engine();e.notice(notice(),AT);assert.throws(()=>e.notice(notice(fixture({seed:2})),'2026-10-22T11:59:00Z'),/clock_regressed/);
 assert.equal(e.snapshot('2026-10-22T12:02:00Z').rows[0].freshness,'STALE');assert.equal(e.snapshot('2026-10-22T11:59:00Z').rows[0].observedAgeSeconds,null);
});
test('a replayed old creation cannot masquerade as a new launch despite a fresh RPC capture',()=>{
 const {e}=engine(),f=fixture({fields:{timestamp:'1792660400'}}),r=e.notice(notice(f),AT);e.verify(r,...responses(f),AT);
 assert.equal(r.mint,null);assert.match(r.reason,/SOURCE_EVENT_OLDER_THAN_120S/);assert.equal(e.finalized,0);
});
test('frame, byte, candidate and RPC caps are enforced before additional IO',()=>{
 const {e}=engine();e.frames=SCOPE.maxFrames;assert.throws(()=>e.notice(notice(),AT),/cap/);
 const {e:b}=engine();b.bytes=SCOPE.maxStreamBytes;assert.throws(()=>b.notice(notice(),AT),/cap/);
 const {e:c}=engine();c.rows.length=SCOPE.maxCandidates;assert.throws(()=>c.notice(notice(),AT),/candidate_cap/);
 const {e:d}=engine();for(let i=0;i<SCOPE.maxRpcReads;i++)d.reserve('{}',AT);assert.throws(()=>d.reserve('{}',AT),/rpc_cap/);assert.equal(d.rpcReads,6);
});
test('rolling windows expose only exact sampled amounts, never full volume/holder claims',()=>{
 const {e}=engine(),r=e.notice(notice(),AT);r.sampledTrades=[{eventUtc:'2026-10-22T12:00:00Z',buy:true,quoteAtomic:'9007199254740993',quoteMint:ZERO}];
 const a=e.snapshot('2026-10-22T12:00:30Z').rows[0];assert.equal(a.activity1m.sampledQuoteAtomicSum,'9007199254740993');assert.equal(a.activity1m.volume,null);assert.equal(a.activity1m.buyCount,null);
 const b=e.snapshot('2026-10-22T12:02:00Z').rows[0];assert.equal(b.activity1m.sampledQuoteAtomicSum,null);assert.equal(b.activity5m.sampledTradeCount,1);
 assert.equal(e.snapshot('2026-10-22T12:06:00Z').rows[0].activity5m.sampledTradeCount,0);
});
test('controller sends one subscription; six RPC attempts at most, selected chronologically, no reconnect',async()=>{
 const e=new Engine('SYNTHETIC_OFFLINE',()=>{});let handlers,sent=[],reads=[],closed=0;const fixtures=[1,2,3,4].map(seed=>fixture({seed}));
 const p=startPilot(e,{now:()=>AT,later:()=>()=>{},open(h){handlers=h;return {send:s=>sent.push(JSON.parse(s)),close:()=>closed++};},async read(body){reads.push(JSON.parse(body));const f=fixtures.find(f=>body.includes(f.signature));return responses(f)[JSON.parse(body).id===10?0:1];}});
 handlers.open();handlers.data(JSON.stringify({jsonrpc:'2.0',id:1,result:7}));for(const f of fixtures)handlers.data(notice(f));await p.settled();
 assert.equal(sent.length,1);assert.equal(sent[0].method,'logsSubscribe');assert.equal(reads.length,6);assert.equal(e.finalized,3);assert.match(e.rows[3].reason,/BUDGET_NOT_SELECTED/);
 p.stop('OWNER_KILL_SWITCH');handlers.data(notice(fixture({seed:5})));await p.settled();assert.equal(reads.length,6);assert.equal(closed,1);assert.equal(p.signal.aborted,true);
});
test('kill, timeout, disconnect and RPC failure stop pending work, no retry/reset',async()=>{
 for(const failure of ['kill','timeout','disconnect','rpc']){
  const e=new Engine('SYNTHETIC_OFFLINE',()=>{});let h,timer,reads=0,closed=0;
  const p=startPilot(e,{now:()=>AT,later:(ms,fn)=>{timer=fn;return ()=>{};},open(handlers){h=handlers;return {send(){},close(){closed++;}};},async read(){reads++;throw Error('offline failure');}});
  h.open();h.data(JSON.stringify({jsonrpc:'2.0',id:1,result:7}));
  if(failure==='kill')p.stop('OWNER_KILL_SWITCH');else if(failure==='timeout')timer();else if(failure==='disconnect')h.close();else h.data(notice());
  await p.settled();h.data(notice());assert.equal(p.signal.aborted,true);assert.ok(reads<=1);assert.equal(closed,1);assert.equal(e.phase,'STOPPED');
 }
});
test('journal failures close sockets and abort before any verification requests',async()=>{
 let h,reads=0,closed=0;const e=new Engine('SYNTHETIC_OFFLINE',()=>{throw Error('disk full');});
 const p=startPilot(e,{now:()=>AT,later:()=>()=>{},open(handlers){h=handlers;return {send(){},close(){closed++;}};},async read(){reads++;return '';}});
 h.data(JSON.stringify({jsonrpc:'2.0',id:1,result:7}));await p.settled();assert.equal(reads,0);assert.equal(closed,1);assert.equal(p.signal.aborted,true);
});
const approval={version:SCOPE.version,head:'a'.repeat(40),scopeHash:SCOPE_HASH,pilotId:'pilot-offline-test-12345',notBefore:'2026-10-22T12:00:00Z',expiresAt:'2026-10-22T12:05:00Z',sourceGo:true,rpcGo:true,privateResearchPermitted:true,termsEvidence:'a'.repeat(64),retentionHours:24,publicOrCommercialPublication:false,maxCostUsd:0,approval:'OWNER APPROVES THIS EXACT HEAD AND ONE PRIVATE ZERO-COST PILOT'};
test('approval requires explicit exact-head source, rights, RPC and fresh independent budget',()=>{
 assert.equal(approve(approval,approval.head,AT).pilotId,approval.pilotId);
 for(const field of ['sourceGo','rpcGo','privateResearchPermitted'])assert.throws(()=>approve({...approval,[field]:false},approval.head,AT));
 for(const extra of [{head:'b'.repeat(40)},{scopeHash:'bad'},{maxCostUsd:1},{termsEvidence:'0'.repeat(64)},{retentionHours:90},{publicOrCommercialPublication:true},{expiresAt:'2026-10-22T12:00:11Z'},{pilotId:'../../escape'},{unexpected:true}])assert.throws(()=>approve({...approval,...extra},approval.head,AT));
 assert.throws(()=>approve(JSON.stringify(approval).replace('"sourceGo":true','"sourceGo":false,"sourceGo":true'),approval.head,AT));
});
test('native runtime has pinned zero-credential destinations and bounded WS options',()=>{
 const native=fs.readFileSync(new URL('../native.mjs',import.meta.url),'utf8'),run=fs.readFileSync(new URL('../run.mjs',import.meta.url),'utf8');
 assert.match(native,/maxPayload:scope.maxFrameBytes/);assert.match(native,/perMessageDeflate:false/);assert.match(native,/followRedirects:false/);assert.match(native,/rejectUnauthorized:true/);
 assert.doesNotMatch(native,/helius|pumpportal|api-key|sendTransaction|sendRawTransaction|signTransaction/);
 assert.ok(run.indexOf('approve(approvalFile')<run.indexOf("import('./native.mjs')"));assert.ok(run.indexOf('claim(root')<run.indexOf("import('./native.mjs')"));
});
