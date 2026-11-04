import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {A,C,session,cloneRaw,mutateResponse,mutateAccount,token2022,bytes,key,MINT,T22,at} from './fixtures.mjs';
const find=(e,id)=>e.findings.find(f=>f.id==='native-'+id);
const digest=b=>createHash('sha256').update(b).digest('hex');
let raw;
test('actual B three-read recipe -> new real Helius qualifier -> real analytics -> original C projection',async()=>{
 const s=await session();raw=s.raw;
 assert.equal(s.result.status,'candidate');assert.equal(s.calls,3);assert.equal(s.intakes,1);assert.equal(s.analyses,1);
 assert.equal(s.state.attempts,3);assert.equal(s.state.completed,3);assert.equal(s.state.credits,3);assert.equal(s.state.stopped,false);
 const e=s.result.evidence;assert.equal(e.version,'native-evidence/1');assert.equal(e.origin.providerAuthenticated,false);assert.equal(e.origin.label,'SYNTHETIC OFFLINE');assert.equal(e.state,'candidate');
 assert.equal(e.controls.rawSupply,'1000000');assert.equal(e.mintSnapshot.evidenceId,'holder-mint');assert.equal(e.concentration.selectedTotal.numeratorRaw,'200000');assert.equal(e.concentration.selectedTotal.denominatorRaw,'1000000');
 assert.equal(e.concentration.ownerGroups.length,20);assert.equal(e.concentration.beneficialOwnership,'unknown');assert.equal(e.coverage.suspectedRelationships,'not_established');
 const methods=s.seen.map(c=>JSON.parse(c.requestBody).method);assert.deepEqual(methods,['getTokenLargestAccounts','getMultipleAccounts','getBlockTime']);
 assert.ok(e.references.length>=3);assert.ok(e.references.every(r=>r.providerHost==='mainnet.helius-rpc.com'));assert.ok(!e.references.some(r=>r.method==='getAccountInfo'));
 for(const ref of e.references){const c=s.seen.find(c=>digest(c.responseBytes)===ref.responseSha256);assert.ok(c);assert.equal(ref.requestSha256,digest(c.requestBody));assert.equal(ref.method,JSON.parse(c.requestBody).method);assert.equal(ref.requestStartedAt,c.requestStartedAt);assert.equal(ref.receivedAt,c.receivedAt);}
 const batch=JSON.parse(Buffer.from(s.raw.snapshot.responseBytes).toString()).result.value;
 assert.equal(e.references.find(r=>r.id==='holder-mint').accountDataSha256,digest(Buffer.from(batch[0].data[0],'base64')));
 assert.equal(e.references.find(r=>r.id==='holder-rpc-2').contextSlot,null);
 assert.equal(e.references.find(r=>r.id==='holder-rpc-2').blockTime.slot,e.concentration.balanceSlot);
 assert.ok(e.references.every(r=>r.commitmentEvidence!=='independent_consensus_verified'));
 assert.equal(C.isNativeEvidence(e,MINT),true);assert.equal(C.nativeCandidateView(e).riskFindings.length,24);
});
test('original public decoder still rejects actual B Helius RawBatch; new cap is NOT an old HolderEvidence',()=>{
 const cap=A.qualifyHeliusBatch(raw),r=A.inspectHeliusEvidence(cap);assert.equal(r.state,'candidate_sample');assert.equal(r.providerAuthenticated,false);assert.equal(r.sample.source[0].endpointHost,'mainnet.helius-rpc.com');
 const old={kind:raw.kind,network:'solana-mainnet-beta',mint:raw.mint,evaluatedAt:raw.evaluatedAt,rights:{analysis:'approved_private',reviewSha256:raw.rightsReviewSha256},selection:raw.selection,snapshot:raw.snapshot,clock:raw.clock};
 const oldCap=A.qualifyHolderCapture(old);assert.equal(A.analyzeNativeEvidence({mint:MINT,evaluatedAt:raw.evaluatedAt,holderEvidence:oldCap}).concentration.state,'not_established');
 assert.equal(A.inspectHeliusEvidence(oldCap),null);for(const v of [{...cap},JSON.parse(JSON.stringify(cap)),{providerAuthenticated:true},{sample:r.sample}])assert.equal(A.inspectHeliusEvidence(v),null);
});
const fail=r=>{assert.equal(A.intakeHeliusBatch(r),null);const x=A.inspectHeliusEvidence(A.qualifyHeliusBatch(r));assert.equal(x.state,'unavailable');assert.equal(x.providerAuthenticated,false);};
for(const [name,change]of [
 ['wrong Helius host',r=>r.selection.endpointHost='evil.invalid'],
 ['mixed public snapshot host',r=>r.snapshot.endpointHost='api.mainnet.solana.com'],
 ['mixed public clock host',r=>r.clock.endpointHost='api.mainnet-beta.solana.com'],
 ['credential-bearing URL host',r=>r.selection.endpointHost='https://mainnet.helius-rpc.com/?api-key=NOT_A_KEY'],
 ['caller native label',r=>r.kind='native_https'],['caller authentication flag',r=>r.providerAuthenticated=true],
 ['caller response hash',r=>r.selection.responseSha256='a'.repeat(64)],['caller request hash',r=>r.selection.requestSha256='b'.repeat(64)],
 ['missing rights digest',r=>r.rightsReviewSha256=''],['zero rights digest',r=>r.rightsReviewSha256='0'.repeat(64)],
 ['wrong root mint',r=>r.mint=key(8)],
 ['selection wrong RPC ID',r=>mutateResponse(r,'selection',v=>v.id=1)],
 ['snapshot wrong RPC ID',r=>mutateResponse(r,'snapshot',v=>v.id=260003)],
 ['clock wrong RPC ID',r=>mutateResponse(r,'clock',v=>v.id=260001)],
 ['request IDs are not interchangeable',r=>{const o=JSON.parse(r.snapshot.requestBody);o.id=260001;r.snapshot.requestBody=JSON.stringify(o);}],
 ['snapshot request address order',r=>{const o=JSON.parse(r.snapshot.requestBody);[o.params[0][1],o.params[0][2]]=[o.params[0][2],o.params[0][1]];r.snapshot.requestBody=JSON.stringify(o);}],
 ['incorrect lower bound',r=>{const o=JSON.parse(r.snapshot.requestBody);o.params[1].minContextSlot=99;r.snapshot.requestBody=JSON.stringify(o);}],
 ['weak requested commitment',r=>{const o=JSON.parse(r.selection.requestBody);o.params[1].commitment='processed';r.selection.requestBody=JSON.stringify(o);}],
 ['null account',r=>mutateResponse(r,'snapshot',v=>v.result.value[1]=null)],
 ['wrong mint program',r=>mutateResponse(r,'snapshot',v=>v.result.value[0].owner=key(9))],
 ['wrong token program',r=>mutateResponse(r,'snapshot',v=>v.result.value[1].owner=T22)],
 ['wrong account mint',r=>mutateAccount(r,1,b=>{bytes(8).copy(b,0);})],
 ['wrong decimals',r=>mutateResponse(r,'selection',v=>v.result.value[0].decimals=8)],
 ['duplicate account',r=>mutateResponse(r,'selection',v=>v.result.value[1].address=v.result.value[0].address)],
 ['skewed slot',r=>mutateResponse(r,'snapshot',v=>v.result.context.slot=229)],
 ['slot before lower bound',r=>mutateResponse(r,'snapshot',v=>v.result.context.slot=99)],
 ['null blockTime',r=>mutateResponse(r,'clock',v=>v.result=null)],
 ['blockTime request wrong slot',r=>{const o=JSON.parse(r.clock.requestBody);o.params=[101];r.clock.requestBody=JSON.stringify(o);}],
 ['future blockTime',r=>mutateResponse(r,'clock',v=>v.result=Math.floor(Date.parse(r.evaluatedAt)/1000)+10)],
 ['stale blockTime',r=>mutateResponse(r,'clock',v=>v.result=1)],
 ['stale batch',r=>r.evaluatedAt=at(70000)],
 ['future capture receipt',r=>r.snapshot.receivedAt=at(8000)],
 ['unordered capture clocks',r=>r.snapshot.requestStartedAt=at(0)],
 ['insufficient spacing',r=>r.snapshot.requestStartedAt=at(2400)],
 ['slow capture',r=>r.selection.requestStartedAt=at(-6000)],
 ['malformed JSON',r=>r.clock.responseBytes=Buffer.from('{')],
 ['unsafe response slot',r=>mutateResponse(r,'snapshot',v=>v.result.context.slot=9007199254740992)],
 ['invalid Base64',r=>mutateResponse(r,'snapshot',v=>v.result.value[0].data[0]='not bytes')],
 ['body too large',r=>r.selection.responseBytes=Buffer.alloc(131073)],
 ['non200',r=>r.selection.httpStatus=429]
])test('B-generated Helius byte candidate rejected: '+name,()=>{const r=cloneRaw(raw);change(r);fail(r);});
test('wrong response account order with different same-slot amounts is rejected rather than guessed',()=>{
 const r=cloneRaw(raw);mutateResponse(r,'selection',v=>{v.result.value[0].amount='20000';v.result.value[1].amount='10000';});mutateAccount(r,2,b=>{b.writeBigUInt64LE(20000n,64);});fail(r);
});
test('exact original byte hashes are recomputed without reserializing whitespace or accepting an injected digest',()=>{
 const r=cloneRaw(raw),before=Buffer.from(r.snapshot.responseBytes);r.snapshot.responseBytes=Buffer.from(' \n'+before.toString()+'\n');const input=A.intakeHeliusBatch(r);assert.ok(input);const e=A.analyzeNativeEvidence(input);
 assert.equal(e.references.find(r=>r.id==='holder-rpc-1').responseSha256,digest(r.snapshot.responseBytes));assert.notEqual(digest(before),digest(r.snapshot.responseBytes));assert.deepEqual(before,raw.snapshot.responseBytes);
});
test('capture primitives, original eval and bytes are sealed; later caller mutation/copy cannot freshen them',()=>{
 const r=cloneRaw(raw),before=Buffer.from(r.snapshot.responseBytes),cap=A.qualifyHeliusBatch(r),input=A.intakeHeliusBatch(r);r.snapshot.responseBytes.fill(0);r.evaluatedAt=at(80000);
 assert.ok(Object.isFrozen(A.inspectHeliusEvidence(cap)));assert.equal(input.evaluatedAt,raw.evaluatedAt);const e=A.analyzeNativeEvidence(input);assert.equal(e.concentration.state,'candidate');assert.equal(e.references.find(r=>r.id==='holder-rpc-1').responseSha256,digest(before));
 assert.equal(A.analyzeNativeEvidence({...input,evaluatedAt:at(80000)}).concentration.state,'not_established');
});
test('recorded captures and host/hash values never authenticate a provider',()=>{
 const r=cloneRaw(raw);r.kind='recorded_response';const e=A.analyzeNativeEvidence(A.intakeHeliusBatch(r));assert.equal(e.origin.label,'RECORDED / ORIGIN UNVERIFIED');assert.equal(e.origin.providerAuthenticated,false);
});
test('actual B-shaped unsupported extensions retain control unknowns and withhold concentration',()=>{
 const r=cloneRaw(raw);token2022(r,[[65500,Buffer.alloc(0)]]);const input=A.intakeHeliusBatch(r);assert.ok(input);const e=A.analyzeNativeEvidence(input);
 assert.equal(e.controls.program,'token_2022');assert.equal(e.concentration.state,'not_established');assert.equal(find(e,'selected-share').tone,'gray');
});
test('actual B-shaped unknown mint extension cannot create absence-based GREEN',()=>{
 const r=cloneRaw(raw);token2022(r);mutateAccount(r,0,b=>{const h=Buffer.alloc(4);h.writeUInt16LE(65500);return Buffer.concat([b,h]);});const input=A.intakeHeliusBatch(r);assert.ok(input);const e=A.analyzeNativeEvidence(input);
 assert.equal(find(e,'mint-authority').tone,'gray');assert.equal(find(e,'permanent-delegate').tone,'gray');assert.equal(e.concentration.state,'not_established');
});
test('actual B state rejects tampered post-analysis receipt hash and permanently spends/stops all3',async()=>{
 const s=await session({analyze:e=>({...e,references:e.references.map((r,i)=>i===0?{...r,responseSha256:'f'.repeat(64)}:r)})});
 assert.equal(s.result.status,'held');assert.equal(s.calls,3);assert.equal(s.state.attempts,3);assert.equal(s.state.completed,3);assert.equal(s.state.stopped,true);
});
test('actual B sequence with null clock fails new qualification then STOPs, no fourth read or analytics substitution',async()=>{
 const s=await session({wireMutate:(c,method)=>{if(method==='getBlockTime'){const v=JSON.parse(c.responseBytes);v.result=null;c.responseBytes=Buffer.from(JSON.stringify(v));}}});
 assert.equal(s.calls,3);assert.equal(s.intakes,1);assert.equal(s.analyses,0);assert.equal(s.result.status,'held');assert.equal(s.state.attempts,3);assert.equal(s.state.stopped,true);
});
test('actual B sequence produces exact >2^53 supply/shares and same authority groups through real analytics',async()=>{
 const amounts=Array.from({length:20},(_,i)=>i===0?9007199254740993n:i===1?9007199254740991n:0n);
 const s=await session({wireMutate:(c,method)=>{const v=JSON.parse(c.responseBytes);if(method==='getTokenLargestAccounts')v.result.value.forEach((a,i)=>a.amount=String(amounts[i]));if(method==='getMultipleAccounts'){let b=Buffer.from(v.result.value[0].data[0],'base64');b.writeBigUInt64LE(18446744073709551615n,36);v.result.value[0].data[0]=b.toString('base64');v.result.value.slice(1).forEach((a,i)=>{b=Buffer.from(a.data[0],'base64');b.writeBigUInt64LE(amounts[i],64);if(i<2)bytes(100).copy(b,32);a.data[0]=b.toString('base64');});}c.responseBytes=Buffer.from(JSON.stringify(v));}});
 assert.equal(s.result.status,'candidate');assert.equal(s.calls,3);const e=s.result.evidence;assert.equal(e.controls.rawSupply,'18446744073709551615');assert.equal(e.concentration.selectedTotal.numeratorRaw,'18014398509481984');assert.equal(e.concentration.ownerGroups[0].amountRaw,'18014398509481984');assert.equal(e.concentration.beneficialOwnership,'unknown');assert.deepEqual(e.concentration.exclusions,[]);
});
test('snapshot advance uses same-batch supply and keeps selected versus observed balances separate',()=>{
 const r=cloneRaw(raw);mutateResponse(r,'snapshot',v=>{v.result.context.slot=101;const b=Buffer.from(v.result.value[0].data[0],'base64');b.writeBigUInt64LE(2000000n,36);v.result.value[0].data[0]=b.toString('base64');});mutateAccount(r,1,b=>{b.writeBigUInt64LE(30000n,64);});r.clock.requestBody=JSON.stringify({jsonrpc:'2.0',id:260003,method:'getBlockTime',params:[101]});
 const e=A.analyzeNativeEvidence(A.intakeHeliusBatch(r));assert.equal(e.concentration.selectedTotal.denominatorRaw,'2000000');assert.equal(e.concentration.selectionSlot,'100');assert.equal(e.concentration.balanceSlot,'101');assert.equal(e.concentration.selectionAmountsChanged,1);assert.equal(e.concentration.minContextSlotIsLowerBoundOnly,true);
});
test('no public or sealed candidate can become an authenticated B NativeObservation',async()=>{
 const {createRequire}=await import('node:module'),require=createRequire(import.meta.url);const B=require(process.env.HELIUS_INTAKE_BUILD+'/lib/native-pilot/index.js');const input=A.intakeHeliusBatch(raw),e=A.analyzeNativeEvidence(input);
 for(const value of [input.holderEvidence,e,JSON.parse(JSON.stringify(e)),{providerAuthenticated:true}])assert.equal(await B.verifiedNativeObservation(value),null);
});
test('B rejects mismatched original request hash after real analytic execution; no retry/refund',async()=>{
 const s=await session({analyze:e=>({...e,references:e.references.map((r,i)=>i===1?{...r,requestSha256:'f'.repeat(64)}:r)})});
 assert.equal(s.result.status,'held');assert.equal(s.calls,3);assert.equal(s.state.credits,3);assert.equal(s.state.stopped,true);
});
test('unsupported extensions through actual B acquire preserve controls and qualified GRAY, not invented shares',async()=>{
 const s=await session({wireMutate:(c,method)=>{if(method==='getMultipleAccounts'){const f={snapshot:c};token2022(f,[[65500,Buffer.alloc(0)]]);}}});
 assert.equal(s.result.status,'candidate');assert.equal(s.calls,3);assert.equal(s.result.evidence.concentration.state,'not_established');assert.equal(find(s.result.evidence,'owner-share').tone,'gray');assert.equal(s.result.evidence.origin.providerAuthenticated,false);
});
test('new Helius capability cannot be read or forged in original public-RPC inspector',async()=>{
 const {createRequire}=await import('node:module'),require=createRequire(import.meta.url),old=require(process.env.HELIUS_INTAKE_BUILD+'/lib/v4-oracle/holders/decode.js');
 const cap=A.qualifyHeliusBatch(raw);assert.equal(old.inspectHolderEvidence(cap),null);const forged=Object.freeze({sample:A.inspectHeliusEvidence(cap).sample});assert.equal(A.inspectHeliusEvidence(forged),null);
});
test('no capture getter, accessor, cycle or non-JSON RPC body can create a positive native candidate',()=>{
 let reads=0;const r=cloneRaw(raw);Object.defineProperty(r,'selection',{get(){reads++;throw Error('not executed');}});
 assert.equal(A.intakeHeliusBatch(r),null);assert.equal(reads,0);
 const c=cloneRaw(raw);c.clock.responseBytes=Buffer.from('{"jsonrpc":"2.0","id":260003,"id":260003,"result":1}');fail(c);
});
test('zero supply and empty selection do not become a zero-concentration clearance',()=>{
 for(const count of [0,20]){
  const r=cloneRaw(raw);
  if(count===0){
   mutateResponse(r,'selection',v=>v.result.value=[]);
   const body=JSON.parse(r.snapshot.requestBody);body.params[0]=[MINT];r.snapshot.requestBody=JSON.stringify(body);
   mutateResponse(r,'snapshot',v=>v.result.value=v.result.value.slice(0,1));
  }else{mutateResponse(r,'selection',v=>v.result.value.forEach(a=>a.amount='0'));mutateResponse(r,'snapshot',v=>{for(const a of v.result.value.slice(1)){const b=Buffer.from(a.data[0],'base64');b.writeBigUInt64LE(0n,64);a.data[0]=b.toString('base64');}const b=Buffer.from(v.result.value[0].data[0],'base64');b.writeBigUInt64LE(0n,36);v.result.value[0].data[0]=b.toString('base64');});}
  const e=A.analyzeNativeEvidence(A.intakeHeliusBatch(r));assert.equal(e.concentration.state,'not_established');assert.equal(e.concentration.selectedTotal,null);assert.equal(find(e,'selected-share').tone,'gray');
 }
});
test('actual B Helius sequence retains present mint/freeze authority bytes and C RED questions from same batch',async()=>{
 const s=await session({wireMutate:(c,method)=>{if(method==='getMultipleAccounts'){const v=JSON.parse(c.responseBytes),b=Buffer.from(v.result.value[0].data[0],'base64');b.writeUInt32LE(1,0);bytes(9).copy(b,4);b.writeUInt32LE(1,46);bytes(8).copy(b,50);v.result.value[0].data[0]=b.toString('base64');c.responseBytes=Buffer.from(JSON.stringify(v));}}});
 assert.equal(s.result.status,'candidate');assert.equal(s.calls,3);const e=s.result.evidence;assert.equal(e.controls.mintAuthority,key(9));assert.equal(e.controls.freezeAuthority,key(8));assert.equal(e.controls.decimals,6);assert.equal(find(e,'mint-authority').tone,'red');assert.equal(find(e,'freeze-authority').tone,'red');assert.equal(e.references.find(r=>r.id===e.mintSnapshot.evidenceId).method,'getMultipleAccounts');assert.ok(C.nativeRiskFindings(e,Date.parse(e.evaluatedAt)).some(f=>f.tone==='red'));assert.ok(C.nativeRiskFindings(e,Date.parse(e.evaluatedAt)+60001).every(f=>f.tone==='gray'));assert.equal(e.origin.providerAuthenticated,false);
});
