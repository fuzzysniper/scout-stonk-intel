// C integration cases REGISTERED by B's approved PG harness. No SQL installer,
// connection/proof implementation, fake database, filesystem ledger or mock analytics.
// B retains cluster/roles/TLS/proof/transaction/checkpoint setup and cleanup ownership.
export async function registerNativeUnionPg18({scenario}){
 const {requireLocalPg18Approval}=await import('../native-postgres/pg18-approval.mjs');requireLocalPg18Approval();
 await import('../native-postgres/namespace-only.mjs');
 const {default:test}=await import('node:test'),{default:assert}=await import('node:assert/strict');
 const fs=await import('node:fs'),{createRequire}=await import('node:module'),{execFile}=await import('node:child_process'),{promisify}=await import('node:util'),{createHash}=await import('node:crypto');
 assert.equal(typeof scenario,'function');const root=process.env.REMOTE_BUILD;assert.ok(root);
 for(const f of ['lib/native-pilot/engine.js','lib/native-evidence/index.js','lib/native-lens/boundary.js','app/lens/native-lens.js','tests/native-lens/browser-entry.js'])assert.ok(fs.existsSync(root+'/'+f),'REQUIRED current C compilation: '+f);
 process.env.NATIVE_LENS_BUILD=root;process.env.NATIVE_BUILD=root;
 const {session,MINT,model,nativeTake,nativeClaim,b}=await import('./session.mjs');
 const require=createRequire(import.meta.url),{postgresProtocol}=require(root+'/lib/native-pilot/postgres/protocol.js');
 const {StrictJournalClient,strictBindingEstablished}=require(root+'/ops/v4-journal/native-tls.mjs');
 const run=promisify(execFile),sqlStates=[],completedMobileWidths=[];let pgVersion=null;
 async function actualScenario(overrides){
  const x=await scenario(overrides),client=await x.pool.connect();
  try{assert.equal(strictBindingEstablished(client),true,'actual native TLS/SCRAM-PLUS required');assert.equal(client instanceof StrictJournalClient,true);const version=(await client.query('SHOW server_version_num')).rows[0].server_version_num;assert.equal(String(version).slice(0,2),'18');if(pgVersion!==null)assert.equal(String(version),pgVersion);pgVersion=String(version);}finally{client.release();}
  return x;
 }
 async function actualSession(mode='sample',x){const s=await session(mode,{pgScenario:x??await actualScenario()});assert.equal(s.storage.kind,'actual-postgres-18');assert.equal('file'in s.storage,false,'filesystem ledger forbidden in required PG path');return s;}
 function verify(r,s,credits=3){
  assert.equal(r.status,'candidate');const e=r.evidence;assert.equal(s.calls,3);assert.equal(s.intakes,1);assert.equal(s.analyses,1);assert.equal(e.origin.label,'SYNTHETIC OFFLINE');assert.equal(e.origin.providerAuthenticated,false);assert.equal(r.providerAuthenticated,false);assert.equal(r.activate,false);
  assert.equal(e.controls.rawSupply,'1000000');assert.equal(e.controls.decimals,6);assert.equal(e.controls.freezeAuthority,null);assert.deepEqual(e.concentration.selectedTotal,{numeratorRaw:'200000',denominatorRaw:'1000000',basisPointsFloor:'2000'});assert.equal(e.concentration.ownerGroups.length,20);assert.equal(e.concentration.fullHolderCoverage,false);assert.equal(e.concentration.beneficialOwnership,'unknown');
  assert.deepEqual(s.receipts.map(x=>x.method),['getTokenLargestAccounts','getMultipleAccounts','getBlockTime']);for(const ref of e.references){assert.equal(ref.providerHost,'mainnet.helius-rpc.com');assert.equal(ref.kind,'synthetic_fixture');const capture=s.receipts.find(x=>x.method===ref.method);assert.ok(capture);for(const k of ['requestSha256','responseSha256','requestStartedAt','receivedAt'])assert.equal(ref[k],capture[k]);}
  const mint=e.references.find(x=>x.id===e.mintSnapshot.evidenceId);assert.equal(mint.method,'getMultipleAccounts');assert.equal(mint.fieldPath,'$.result.value[0].data');assert.match(mint.accountDataSha256,/^[a-f0-9]{64}$/);assert.equal(model.isNativeEvidence(e,MINT),true);const view=model.nativeCandidateView(e);assert.equal(view.riskFindings.length,24);assert.ok(view.facts.every(x=>x.value===null));assert.equal(nativeClaim(e,'organic',s.time).outcome,'NOT ESTABLISHED');return {e,credits};
 }
 test('CURRENT UNION actual PG18 transaction -> B acquire -> A Helius -> existing lens;3 reads/commits/debits, original clocks/hashes',{timeout:30000},async()=>{
  const s=await actualSession();try{const r=await s.run();verify(r,s);const state=await s.state();assert.deepEqual({attempts:state.attempts,credits:state.credits,completed:state.completed,lease:state.lease,stopped:state.stopped},{attempts:3,credits:3,completed:3,lease:null,stopped:false});assert.equal(await b.verifiedNativeObservation(r),null);sqlStates.push({case:'golden',attempts:state.attempts,credits:state.credits,completed:state.completed});}finally{await s.close();}
 });
 test('CURRENT UNION actual PG18 configured nonunit method debit is preserved, no fourth read/refund/replay',{timeout:30000},async()=>{
  const ordinary=await actualScenario(),x=await actualScenario({debit:{...ordinary.policy.debit,getTokenLargestAccounts:2},credits:4}),s=await actualSession('sample',x);
  try{verify(await s.run(),s,4);let state=await s.state();assert.equal(state.credits,4);assert.equal(state.attempts,3);assert.equal((await s.run()).status,'held');state=await s.state();assert.equal(state.stopped,true);assert.equal(state.attempts,3);assert.equal(state.credits,4);assert.equal(s.calls,3);}finally{await s.close();}
 });
 test('CURRENT UNION actual PG18 warning bytes preserve red-first controls,79% sample, exact evidence and expiry',{timeout:30000},async()=>{
  const s=await actualSession('warning');try{const r=await s.run();assert.equal(r.status,'candidate');const e=r.evidence;assert.ok(e.controls.mintAuthority);assert.equal(e.concentration.selectedTotal.numeratorRaw,'790000');assert.equal(e.concentration.selectedTotal.basisPointsFloor,'7900');assert.equal(nativeTake(e,s.time).take.tone,'red');assert.equal(nativeClaim(e,'mint-authority',s.time).outcome,'CONTRADICTED');const hashes=e.references.map(x=>x.responseSha256),late=Math.max(...e.references.map(x=>Date.parse(x.receivedAt)))+60001;assert.equal(nativeTake(e,late).take.text,'No defensible thesis established.');assert.equal(nativeClaim(e,'mint-authority',late).outcome,'NOT ESTABLISHED');assert.deepEqual(e.references.map(x=>x.responseSha256),hashes);assert.equal(s.calls,3);}finally{await s.close();}
 });
 for(const mode of ['wrong-mint','mixed-host','malformed','partial','null-blocktime','stale-blocktime','clock-rollback','rights-missing','copied-capability','post-qualification-corruption'])test('CURRENT UNION actual PG18 '+mode+' remains spent/stopped/GRAY; no retry',{timeout:30000},async()=>{
  const s=await actualSession(mode);try{assert.equal((await s.run()).status,'held');const state=await s.state();assert.equal(state.stopped,true);assert.ok(state.attempts>=1&&state.attempts<=3);assert.equal(state.credits,state.attempts);const calls=s.calls;await s.run();assert.equal(s.calls,calls);assert.equal((await s.state()).attempts,state.attempts);assert.ok(model.nativeUnavailableView(MINT).riskFindings.every(x=>x.tone==='gray'&&x.value===null));}finally{await s.close();}
 });
 test('CURRENT UNION actual PG18 unsupported semantics withhold sample metric and demand conclusion',{timeout:30000},async()=>{
  const s=await actualSession('unsupported');try{const r=await s.run();assert.equal(s.calls,3);if(r.status==='candidate'){assert.equal(r.evidence.concentration.selectedTotal,null);assert.equal(r.evidence.concentration.state,'not_established');assert.equal(nativeClaim(r.evidence,'organic',s.time).outcome,'NOT ESTABLISHED');}else assert.equal(r.status,'held');}finally{await s.close();}
 });
 for(const phase of ['commit','checkpoint'])test('CURRENT UNION actual PG18 lost '+phase+' ACK with real transaction retains spend and cannot authorize a send',{timeout:30000},async()=>{
  const x=await actualScenario();let ledger;
  if(phase==='commit')ledger=postgresProtocol(x.policy,async(op,input)=>{const r=await x.tx(op,{...input,durability:{mode:'local-fsync'}});if(op==='reserve')throw Error('SYNTHETIC LOST COMMIT ACK');return r;},x.anchor);
  else ledger=postgresProtocol(x.policy,(op,input)=>x.tx(op,{...input,durability:{mode:'local-fsync'}}),{current:()=>x.anchor.current(),async advance(a,b){await x.anchor.advance(a,b);throw Error('SYNTHETIC LOST CHECKPOINT ACK');}});
  const s=await actualSession('sample',{...x,ledger:()=>ledger});try{assert.equal((await s.run()).status,'held');assert.equal(s.calls,0);assert.equal(s.analyses,0);const state=await s.state();assert.equal(state.attempts,1);assert.equal(state.credits,1);assert.equal(state.stopped,true);await s.run();assert.equal(s.calls,0);assert.equal((await s.state()).attempts,1);}finally{await s.close();}
 });
 for(const mode of ['owner-denied','identity-denied'])test('CURRENT UNION actual PG18 '+mode+' produces no wire/data and keeps gray',{timeout:30000},async()=>{
  const s=await actualSession(mode);try{assert.equal((await s.run()).status,'held');assert.equal(s.calls,0);assert.equal(s.analyses,0);const state=await s.state();assert.equal(state.attempts,0);assert.equal(state.credits,0);assert.equal(state.stopped,true);assert.ok(model.nativeUnavailableView(MINT).riskFindings.every(x=>x.tone==='gray'));}finally{await s.close();}
 });
 test('CURRENT UNION actual PG18 completion COMMIT ACK lost retains receipt/spend and cannot publish a candidate',{timeout:30000},async()=>{
  const x=await actualScenario(),ledger=postgresProtocol(x.policy,async(op,input)=>{const r=await x.tx(op,{...input,durability:{mode:'local-fsync'}});if(op==='finish')throw Error('SYNTHETIC FINISH COMMIT ACK LOST');return r;},x.anchor),s=await actualSession('sample',{...x,ledger:()=>ledger});
  try{assert.equal((await s.run()).status,'held');assert.equal(s.calls,1);assert.equal(s.analyses,0);const state=await s.state();assert.equal(state.attempts,1);assert.equal(state.credits,1);assert.equal(state.completed,1);assert.equal(state.stopped,true);await s.run();assert.equal(s.calls,1);}finally{await s.close();}
 });
 test('CURRENT UNION actual PG18 concurrent/replayed B state machines cannot double-send or reopen state',{timeout:30000},async()=>{
  const x=await actualScenario(),s=await actualSession('sample',x),second=await actualSession('sample',x);let enter,release;const entered=new Promise(r=>enter=r),resume=new Promise(r=>release=r);let first;
  try{const wire=s.ports.wire;s.ports.wire=async(...a)=>{enter();await resume;return wire(...a);};first=s.run();await entered;assert.equal((await second.run()).status,'held');release();assert.equal((await first).status,'held');assert.ok(s.calls+second.calls<=1);const state=await s.state();assert.equal(state.attempts,1);assert.equal(state.credits,1);assert.equal(state.stopped,true);}finally{release();await first?.catch(()=>{});await s.close();await second.close();}
 });
 for(const project of ['320','390','1280'])test('CURRENT UNION actual PG18 -> existing /lens browser '+project+' source/controls/claim/STOP/expiry/Clear/privacy/axe',{timeout:300000},async()=>{
  const {startBrowserHarness}=await import('./browser-server.mjs');const server=await startBrowserHarness({storageKind:'actual-postgres-18',makeSession:async mode=>actualSession(mode)});
  try{const chrome=['/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));const {stdout,stderr}=await run(process.execPath,['experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js','test','-c','tests/native-union-284/pg18-browser.config.mjs','--project',project],{env:{...process.env,NATIVE_UNION_REQUIRE_PG:'1',...(chrome?{CONSUMER_CHROMIUM_PATH:chrome}:{})},maxBuffer:16*1024*1024});process.stdout.write(stdout);if(stderr)process.stderr.write(stderr);assert.match(stdout,/19 passed/);completedMobileWidths.push(Number(project));}catch(error){if(error.stdout)process.stdout.write(error.stdout);if(error.stderr)process.stderr.write(error.stderr);throw error;}finally{await server.close();}
 });
 test('CURRENT UNION database evidence is bound to actual checked-out SHA/tree and current C cases',async()=>{
  const {stdout:commit}=await run('git',['rev-parse','HEAD']),{stdout:tree}=await run('git',['rev-parse','HEAD^{tree}']);const digest=createHash('sha256').update(fs.readFileSync('tests/native-union-284/pg18-cases.mjs')).digest('hex');assert.equal(sqlStates.length,1);assert.deepEqual(completedMobileWidths,[320,390,1280],'No current-PG evidence marker before ALL57 browser cases succeed');console.log(JSON.stringify({kind:'CURRENT_UNION_ACTUAL_PG18_B_A_C',commit:commit.trim(),tree:tree.trim(),cCasesSha256:digest,installerSha256:createHash('sha256').update(fs.readFileSync('lib/native-pilot/postgres/schema.sql')).digest('hex'),postgresVersionNum:pgVersion,mobileCases:57,storage:'actual native PostgreSQL transaction/protocol',wire:'SYNTHETIC IN MEMORY',ownerIdentity:'SYNTHETIC',golden:sqlStates[0],mobileWidths:completedMobileWidths,hostedAcceptance:false,sourceCalls:false}));
 });
}
