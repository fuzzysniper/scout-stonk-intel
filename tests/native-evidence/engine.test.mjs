import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {api,analyze,fixture,balances,mintCapture,mintBytes,ASOF,MINT,T22,at,key,bytes,withExtensions,mutateResponse,mutateAccount,token2022,transfers} from './fixtures.mjs';
const find=(v,id)=>v.findings.find(f=>f.id==='native-'+id);
test('SYNTHETIC complete slice retains exact refs/clock and independent ownership limits',async()=>{
 const v=await analyze();assert.equal(v.state,'candidate');assert.equal(v.origin.label,'SYNTHETIC OFFLINE');assert.equal(v.origin.providerAuthenticated,false);assert.equal(v.consistency,'same_mint_snapshot');
 assert.equal(v.concentration.selectedTotal.numeratorRaw,'200000');assert.equal(v.concentration.largestObserved10Accounts.basisPointsFloor,'1000');assert.equal(v.concentration.ownerGroups.length,20);
 assert.equal(v.coverage.beneficialOwnership,'unknown');assert.equal(v.coverage.suspectedRelationships,'not_established');assert.equal(v.coverage.price,'not_established');
 assert.equal(find(v,'mint-authority').tone,'green');assert.equal(find(v,'top10-share').tone,'yellow');
 const ids=new Set(v.references.map(r=>r.id));assert.equal(ids.size,v.references.length);assert.ok(v.findings.every(f=>f.evidenceIds.every(id=>ids.has(id))));
 const m=v.references.find(r=>r.id==='mint-account'),c=mintCapture();assert.equal(m.responseSha256,createHash('sha256').update(c.text).digest('hex'));assert.equal(m.accountDataSha256,createHash('sha256').update(mintBytes()).digest('hex'));assert.equal(m.requestSha256,null);
 const b=v.references.find(r=>r.id==='holder-mint');assert.equal(b.accountDataSha256,m.accountDataSha256);assert.equal(b.contextSlot,'100');
 const clock=v.references.find(r=>r.method==='getBlockTime');assert.equal(clock.contextSlot,null);assert.equal(clock.commitmentRequested,null);assert.equal(clock.blockTime.slot,'100');assert.notEqual(clock.blockTime.utc,clock.receivedAt);
 assert.ok(Object.isFrozen(v));assert.ok(Object.isFrozen(v.concentration.ownerGroups));assert.doesNotThrow(()=>JSON.stringify(v));
});
test('raw u64 >2^53 exact ratio and same-owner grouping; custody is not a human',async()=>{
 const f=balances(fixture(3),[9007199254740993n,9007199254740991n,1n],{supply:18446744073709551615n,owners:[bytes(100),bytes(100),bytes(101)]});
 const v=await analyze({holders:f,capture:mintCapture(mintBytes(18446744073709551615n))});
 assert.equal(v.concentration.selectedTotal.numeratorRaw,'18014398509481985');assert.equal(v.concentration.ownerGroups[0].amountRaw,'18014398509481984');assert.equal(v.concentration.ownerGroups[0].shareOfSupply.denominatorRaw,'18446744073709551615');
 assert.equal(v.concentration.ownerGroups.length,2);assert.equal(v.concentration.fullHolderCoverage,false);assert.deepEqual(v.concentration.exclusions,[]);
});
test('sampled owner threshold exact at boundary; fragmented same authority is aggregated',async()=>{
 const v=await analyze({holders:balances(fixture(2),[300000n,200000n],{owners:[bytes(100),bytes(100)]})});
 assert.equal(find(v,'owner-share').tone,'red');assert.equal(find(v,'owner-share').state,'candidate');assert.equal(v.concentration.ownerGroups[0].shareOfSupply.basisPointsFloor,'5000');
});
test('large denominator rational floor never rounds up to a threshold',()=>{const r=api.ratio(499999999999999999n,1000000000000000000n);assert.equal(r.basisPointsFloor,'4999');});
test('unknown/zero supply and empty selection withhold ratio, never zero-distribution clearance',async()=>{
 for(const count of [0,1]){const f=balances(fixture(count),count?[0n]:[],{supply:0n});const v=await analyze({holders:f,capture:mintCapture(mintBytes(0n))});assert.equal(v.concentration.state,'not_established');assert.equal(v.concentration.selectedTotal,null);assert.equal(find(v,'owner-share').tone,'gray');}
});
test('later balance snapshot uses SAME BATCH supply, not earlier independent mint supply',async()=>{
 const f=balances(fixture(2),[200000n,100000n],{supply:2000000n});
 mutateResponse(f,'snapshot',r=>r.result.context.slot=101);f.clock.requestBody=JSON.stringify({jsonrpc:'2.0',id:260003,method:'getBlockTime',params:[101]});
 const v=await analyze({holders:f});assert.equal(v.consistency,'different_context');assert.equal(v.concentration.selectedTotal.denominatorRaw,'2000000');assert.equal(v.mintSnapshot.supplyRaw,'1000000');assert.equal(v.concentration.minContextSlotIsLowerBoundOnly,true);
});
test('selection changes and reordered balances cannot become a current top-holder ranking',async()=>{
 const f=balances(fixture(3),[10000n,9000n,8000n]);mutateResponse(f,'snapshot',r=>{r.result.context.slot=101;const b=Buffer.from(r.result.value[3].data[0],'base64');b.writeBigUInt64LE(20000n,64);r.result.value[3].data[0]=b.toString('base64');});f.clock.requestBody=JSON.stringify({jsonrpc:'2.0',id:260003,method:'getBlockTime',params:[101]});
 const v=await analyze({holders:f});assert.equal(v.concentration.selectionAmountsChanged,1);assert.equal(v.concentration.accounts[0].account,key(12));assert.equal(v.concentration.reason,'balances_changed_not_current_top_ranking');
});
test('same-slot conflicting mint bytes are preserved and findings withheld GRAY',async()=>{
 const v=await analyze({capture:mintCapture(mintBytes(2000000n))});assert.equal(v.consistency,'conflict');assert.equal(v.controls,null);assert.equal(v.concentration.state,'not_established');assert.equal(find(v,'mint-authority').tone,'gray');assert.equal(find(v,'conflict').tone,'gray');assert.equal(find(v,'conflict').evidenceIds.length,2);
});
test('different-context immutable decimal/program disagreement is still a conflict',async()=>{const v=await analyze({capture:mintCapture(mintBytes(1000000n,8))});assert.equal(v.consistency,'conflict');assert.equal(v.concentration.state,'not_established');});
for(const [name,change]of [
 ['duplicate accounts',f=>mutateResponse(f,'selection',r=>r.result.value[1].address=r.result.value[0].address)],
 ['null account',f=>mutateResponse(f,'snapshot',r=>r.result.value[1]=null)],
 ['wrong account mint',f=>mutateAccount(f,1,b=>{bytes(5).copy(b,0);})],
 ['decimals mismatch',f=>mutateResponse(f,'selection',r=>r.result.value[0].decimals=9)],
 ['slot before selection',f=>mutateResponse(f,'snapshot',r=>r.result.context.slot=99)],
 ['excessive slot advance',f=>mutateResponse(f,'snapshot',r=>r.result.context.slot=229)],
 ['same slot changed amount',f=>mutateAccount(f,1,b=>{b.writeBigUInt64LE(10001n,64);})],
 ['sample exceeds supply',f=>mutateAccount(f,0,b=>{b.writeBigUInt64LE(1n,36);})],
 ['unsupported host',f=>f.selection.endpointHost='mainnet.helius-rpc.com'],
 ['rights unavailable',f=>f.rights.analysis='unreviewed'],
 ['extra provenance flag',f=>f.providerAuthenticated=true],
 ['unknown capture kind',f=>f.kind='native_https'],
 ['malformed byte buffer',f=>f.snapshot.responseBytes=Buffer.from('{')],
])test('original holder qualification unchanged: '+name,async()=>{const f=fixture();change(f);const v=await analyze({holders:f});assert.equal(v.concentration.state,'not_established');assert.equal(v.concentration.selectedTotal,null);});
test('old sealed captures cannot be freshened with evaluatedAt, and future evaluation reversal fails',async()=>{
 const mintEvidence=await api.qualifyMintCapture(mintCapture()),holderEvidence=api.qualifyHolderCapture(fixture());
 for(const time of [at(70001),at(0)]){const v=api.analyzeNativeEvidence({mint:MINT,evaluatedAt:time,mintEvidence,holderEvidence});assert.equal(v.controls,null);assert.equal(v.concentration.state,'not_established');assert.equal(find(v,'selected-share').tone,'gray');}
});
for(const cap of [{providerAuthenticated:true,kind:'native_https',responseSha256:'a'.repeat(64)}, {},null])
 test('plain caller flags/URL/hash are never decoder evidence '+JSON.stringify(cap),()=>{const v=api.analyzeNativeEvidence({mint:MINT,evaluatedAt:ASOF,mintEvidence:cap,holderEvidence:cap});assert.equal(v.state,'unavailable');assert.equal(v.origin.providerAuthenticated,false);});
test('copied/serialized sealed records are not capabilities',async()=>{const m=await api.qualifyMintCapture(mintCapture()),h=api.qualifyHolderCapture(fixture());for(const clone of [x=>({...x}),x=>JSON.parse(JSON.stringify(x))])assert.equal(api.analyzeNativeEvidence({mint:MINT,evaluatedAt:ASOF,mintEvidence:clone(m),holderEvidence:clone(h)}).state,'unavailable');});
test('all missing and invalid identity cases return finite GRAY',()=>{for(const input of [null,{}, {mint:'USDC',evaluatedAt:ASOF},{mint:MINT,evaluatedAt:'bad'}, {mint:MINT,evaluatedAt:ASOF,native:true}]){const v=api.analyzeNativeEvidence(input);assert.ok(v.findings.every(f=>f.tone==='gray'));assert.equal(v.state,'unavailable');}});
test('getter does not run as caller authentication shortcut',()=>{let n=0;const v=api.analyzeNativeEvidence({mint:MINT,evaluatedAt:ASOF,get mintEvidence(){n++;throw Error();}});assert.equal(n,0);assert.equal(v.state,'unavailable');});
test('recorded and mixed inputs keep provenance unverified, do not silently promote',async()=>{
 const c=mintCapture(undefined,undefined,{kind:'recorded_response'}),v=await analyze({capture:c});assert.equal(v.origin.label,'MIXED OFFLINE CANDIDATES');assert.equal(v.origin.providerAuthenticated,false);
 const f=fixture();f.kind='recorded_response';const r=await analyze({capture:c,holders:f});assert.equal(r.origin.label,'RECORDED / ORIGIN UNVERIFIED');
});
test('unsupported Token2022 mint extensions withhold absence clearance and concentration',async()=>{
 const b=withExtensions(mintBytes(),1,[[65500,Buffer.alloc(0)]]),v=await analyze({capture:mintCapture(b,T22),holders:null});assert.equal(v.controls.extensionCoverage,'incomplete_or_unsupported');for(const id of ['mint-authority','freeze-authority','permanent-delegate','transfer-hook','transfer-fees','transfer-restrictions'])assert.equal(find(v,id).tone,'gray');
 const f=fixture();token2022(f,[[65500,Buffer.alloc(0)]]);assert.equal((await analyze({capture:null,holders:f})).concentration.state,'not_established');
});
test('known Token2022 delegate/hook/freeze authority and transfer restrictions remain individual controls',async()=>{
 const delegate=bytes(9),b=withExtensions(mintBytes(),1,[[12,delegate],[14,Buffer.concat([bytes(8),bytes(7)])],[9,Buffer.alloc(0)]]);
 const v=await analyze({capture:mintCapture(b,T22),holders:null});assert.equal(find(v,'permanent-delegate').tone,'red');assert.equal(find(v,'transfer-hook').tone,'yellow');assert.equal(find(v,'transfer-restrictions').tone,'red');assert.equal(v.coverage.exitCapacity,'not_established');
});
test('authority-present base permission remains RED even with unknown extensions',async()=>{
 const b=mintBytes();b.writeUInt32LE(1,0);bytes(9).copy(b,4);b.writeUInt32LE(1,46);bytes(8).copy(b,50);
 const v=await analyze({capture:mintCapture(withExtensions(b,1,[[65500,Buffer.alloc(0)]]),T22),holders:null});assert.equal(find(v,'mint-authority').tone,'red');assert.equal(find(v,'freeze-authority').tone,'red');
});
for(const b of [Buffer.alloc(81),Buffer.alloc(355),Buffer.alloc(8193)])test('existing decoder rejects malformed mint length '+b.length,async()=>{const v=await analyze({capture:mintCapture(b),holders:null});assert.equal(v.controls,null);});
test('read-only calculation does not mutate callers or remembered first evidence',async()=>{const f=fixture(),before=Buffer.from(f.snapshot.responseBytes),cap=api.qualifyHolderCapture(f);f.snapshot.responseBytes.fill(0);const v=api.analyzeNativeEvidence({mint:MINT,evaluatedAt:ASOF,holderEvidence:cap});assert.equal(v.concentration.state,'candidate');assert.notEqual(v.references[1].responseSha256,'0'.repeat(64));assert.ok(before.length);assert.throws(()=>{v.concentration.ownerGroups[0].amountRaw='0';});});
test('SPL transfer candidates sum instruction quantities exactly without ownership/history inference',async()=>{
 const w=transfers(),v=await analyze({capture:null,holders:null,transfers:w});assert.equal(v.transfers.state,'candidate');assert.equal(v.transfers.instructionAmountRaw,'9007199254740993');assert.equal(v.transfers.completeWalletHistory,false);assert.equal(v.origin.providerAuthenticated,false);assert.equal(v.references[0].responseSha256,w.events[0].reference.responseSha256);
});
for(const [name,mutate]of [
 ['partial enumeration',w=>w.enumeration='partial'],['unknown enumeration',w=>w.enumeration='unknown'],['unsupported parser',w=>w.parser='unsupported'],['empty history',w=>w.events=[]],
 ['duplicate instructions',w=>w.events.push(structuredClone(w.events[0]))],['oversized history',w=>w.events=Array.from({length:65},()=>w.events[0])],
 ['wrong mint',w=>w.events[0].mint=key(4)],['Token2022 semantics',w=>w.events[0].program=T22],['failed tx',w=>w.events[0].succeeded=false],
 ['future tx',w=>w.events[0].blockTime=at(8000)],['future window',w=>w.toUtc=at(8000)],['stale window',w=>{w.fromUtc=at(-100000);w.toUtc=at(-90000);}],
 ['missing original hash',w=>w.events[0].reference.responseSha256=null],['invalid quote denomination instead of token amount',w=>w.events[0].instructionAmountRaw='1.1'],
 ['weak commitment',w=>w.events[0].reference.commitmentRequested='processed'],['slot mismatch',w=>w.events[0].reference.contextSlot='101'],
 ['native label injection',w=>w.kind='native_https'],['borrowed clock',w=>w.events[0].reference.blockTime.slot='101']
])test('transfer candidates withheld: '+name,async()=>{const w=transfers();mutate(w);const v=await analyze({capture:null,holders:null,transfers:w});assert.equal(v.transfers.state,'not_established');assert.equal(v.transfers.instructionAmountRaw,null);assert.equal(v.references.length,0);});
test('empty history and mint-only evidence do not fabricate momentum or wallet relationships',async()=>{const v=await analyze({holders:null});assert.equal(v.transfers.state,'not_established');assert.equal(v.coverage.momentum,'not_established');assert.equal(v.coverage.walletHistory,'not_established');});
test('unsigned ratio rejects negative or Number inputs; zero denominator remains explicitly undefined',()=>{assert.throws(()=>api.ratio(-1n,1n));assert.throws(()=>api.ratio(1,2));assert.equal(api.ratio(0n,0n).basisPointsFloor,null);});
test('throwing root proxy fails GRAY rather than running evidence code',()=>{const v=api.analyzeNativeEvidence(new Proxy({},{getPrototypeOf(){throw Error('untrusted');}}));assert.equal(v.state,'unavailable');});
test('same signature cannot supply conflicting transaction contexts across instructions',async()=>{
 const w=transfers(),a=structuredClone(w.events[0]);a.instructionIndex=1;a.slot='101';a.reference.fieldPath='$.result.transaction.message.instructions[1]';a.reference.contextSlot='101';a.reference.blockTime.slot='101';w.events.push(a);
 assert.equal((await analyze({capture:null,holders:null,transfers:w})).transfers.state,'not_established');
});
test('reviewed Token2022 base and immutable-owner accounts use original supported balance semantics',async()=>{const f=fixture();token2022(f,[[7,Buffer.alloc(0)]]);const v=await analyze({capture:null,holders:f});assert.equal(v.concentration.state,'candidate');assert.equal(v.concentration.ownerGroups.length,20);});
test('fixture marker cannot be changed after capability sealing and no native success exists in result',async()=>{const c=mintCapture(),m=await api.qualifyMintCapture(c);c.kind='recorded_response';const v=api.analyzeNativeEvidence({mint:MINT,evaluatedAt:ASOF,mintEvidence:m});assert.equal(v.origin.label,'SYNTHETIC OFFLINE');assert.equal(v.origin.status,'candidate_only');assert.ok(!JSON.stringify(v).includes('"providerAuthenticated":true'));});
test('native transfer window can have multiple instructions but counts volumes as instructions, not unique capital',async()=>{
 const w=transfers(),a=structuredClone(w.events[0]);a.instructionIndex=1;a.reference.fieldPath='$.result.transaction.message.instructions[1]';w.events.push(a);
 const v=await analyze({capture:null,holders:null,transfers:w});assert.equal(v.transfers.instructionCount,2);assert.equal(v.transfers.instructionAmountRaw,'18014398509481986');
});
test('exact fee u64 schedules retained without guessed active tax',async()=>{
 const b=Buffer.alloc(108);b.writeBigUInt64LE(18446744073709551615n,64);b.writeBigUInt64LE(1n,72);b.writeBigUInt64LE(18446744073709551615n,80);b.writeUInt16LE(100,88);b.writeBigUInt64LE(2n,90);b.writeBigUInt64LE(18446744073709551614n,98);b.writeUInt16LE(200,106);
 const v=await analyze({capture:mintCapture(withExtensions(mintBytes(),1,[[1,b]]),T22),holders:null});assert.equal(v.controls.transferFee.withheldRaw,'18446744073709551615');assert.equal(v.controls.transferFee.newer.maximumFeeRaw,'18446744073709551614');assert.equal(find(v,'transfer-fees').tone,'yellow');assert.match(find(v,'transfer-fees').summary,/active epoch\/rate unknown/);
});
test('three-read holder recipe supplies controls from its own mint bytes with no fourth RPC/capture',async()=>{
 const v=await analyze({capture:null});assert.equal(v.controls.rawSupply,'1000000');assert.equal(v.mintSnapshot.evidenceId,'holder-mint');assert.equal(v.consistency,'same_mint_snapshot');
 assert.equal(v.references.filter(r=>r.method==='getAccountInfo').length,0);assert.ok(find(v,'mint-authority').evidenceIds.includes('holder-mint'));assert.equal(v.references.find(r=>r.id==='holder-mint').method,'getMultipleAccounts');
});
test('batch mint with unknown extensions still exposes narrow positive permissions without concentration clearance',async()=>{
 const f=fixture();token2022(f,[[7,Buffer.alloc(0)]]);mutateAccount(f,0,()=>withExtensions(mintBytes(),1,[[65500,Buffer.alloc(0)]]));
 const v=await analyze({capture:null,holders:f});assert.equal(v.controls.extensionCoverage,'incomplete_or_unsupported');assert.equal(v.concentration.state,'not_established');assert.equal(find(v,'permanent-delegate').tone,'gray');
});
test('parsed capture with absent account hash is not a fabricated same-slot byte conflict',async()=>{
 const c=mintCapture(),r=JSON.parse(c.text);r.result.value.data={program:'spl-token',space:82,parsed:{type:'mint',info:{mintAuthority:null,freezeAuthority:null,supply:'1000000',decimals:6,isInitialized:true}}};delete r.result.value.space;c.encoding='jsonParsed';c.text=JSON.stringify(r);
 const v=await analyze({capture:c});assert.equal(v.consistency,'not_compared');assert.equal(v.concentration.state,'candidate');assert.equal(v.mintSnapshot.evidenceId,'holder-mint');assert.equal(v.references.find(r=>r.id==='mint-account').accountDataSha256,null);
});
test('current but differently timed contradictory authorities are not silently reconciled',async()=>{
 const b=mintBytes();b.writeUInt32LE(1,0);bytes(8).copy(b,4);const f=fixture();mutateResponse(f,'snapshot',r=>r.result.context.slot=101);f.clock.requestBody=JSON.stringify({jsonrpc:'2.0',id:260003,method:'getBlockTime',params:[101]});
 const v=await analyze({capture:mintCapture(b),holders:f});assert.equal(v.consistency,'conflict');assert.equal(v.controls,null);assert.equal(find(v,'mint-authority').tone,'gray');
});
