// ACTUAL disposable PostgreSQL18/TLS/PLUS. In-memory provider responses are TEST ONLY.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';
import {database,PASSWORD} from './postgres-harness.mjs';
import {HOST} from './local-only.mjs';
import {fixture} from '../../experiments/jupiter-beta-approval/integration/test/fixtures.mjs';
import {hash} from '../../experiments/jupiter-beta-approval/integration/json.mjs';
import {policyBinding} from '../../experiments/jupiter-beta-approval/integration/contract.mjs';
import {strictBindingEstablished,handshake} from '../../experiments/jupiter-beta-approval/integration/durable/tls.mjs';
import {validatorComponent} from '../../experiments/jupiter-beta-approval/integration/validator.mjs';
import {consumptionComponent} from '../../experiments/jupiter-beta-approval/integration/authority.mjs';
import {verifyV3} from '../../experiments/jupiter-beta-approval/integration/verifier.mjs';
const BASE='0ba7b2355acb72386f0d4f810f3601290cacb0cb';
const mint4=['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v','So11111111111111111111111111111111111111112','11111111111111111111111111111111','TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'];
// The last two are SYNTHETIC scope syntax examples, NOT verified SPL mint claims.
function sample(){const h=fixture({now:Math.floor(Date.now()/1000)*1000,allowedMints:mint4});h.r.scope.mints=[...mint4].sort();h.r.scope.maxUses=4;h.r.scope.perMintLimit=1;h.r.expiresAt=h.r.issuedAt+600000;return h;}
async function scenario(fn,options={}){const h=sample(),db=await database({publicTrust:h.t,...options});try{await fn(db,h);}finally{await db.close();}}
async function issue(db,h,change={}){
 const ledger=change.ledger??db.ledger('validator');
 const v=validatorComponent({publicTrust:h.t,sdk:await h.sdk(),transport:h.transport,ledger,clock:h.clock});
 const result=await v.submit(await h.signed());
 assert.equal(result.status,'approval_prepared_source_off',JSON.stringify({providerCalls:h.calls.map(c=>new URL(c.url).pathname),grants:(await db.admin.query('SELECT state,calls,uses FROM unfarmd_beta.grants')).rows}));
 const verified=verifyV3(result.envelope,h.t,h.clock(),h.t.identity);assert.equal(verified.status,'verified_source_off_contract');
 return {result,verified,ledger};
}
const noCounterReset=(a,b)=>{assert.equal(b.signatures,a.signatures);assert.equal(b.uses,a.uses);assert.equal(b.epoch,a.epoch);assert.equal(b.policy_hash,a.policy_hash);};

test('local/CI isolation is mandatory and external TCP is blocked before dispatch',()=>{
 assert.throws(()=>net.connect({host:'api.turnkey.com',port:443}),/test_external_tcp_forbidden/);
 assert.equal(process.env.DATABASE_URL,undefined);assert.equal(process.env.PGHOST,undefined);
});

test('actual PG18 non-superuser installer succeeds; runtime groups are NOLOGIN and function-only',()=>scenario(async(db)=>{
 const roles=(await db.admin.query("SELECT rolname,rolsuper,rolcanlogin,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname LIKE 'unfarmd_beta_%' ORDER BY rolname")).rows;
 assert.equal(roles.length,7);for(const r of roles){assert.equal(r.rolsuper,false);assert.equal(r.rolcreatedb,false);assert.equal(r.rolcreaterole,false);assert.equal(r.rolbypassrls,false);assert.equal(r.rolcanlogin,r.rolname.endsWith('_login'));}
 assert.equal((await db.admin.query("SELECT rolsuper FROM pg_roles WHERE rolname='fixture_installer'")).rows[0].rolsuper,false);
 // PG18 CREATEROLE retains automatic ADMIN membership; installer is deliberately
 // privileged. Explicit temporary SET/INHERIT was revoked; runtime has NONE.
 assert.equal((await db.admin.query("SELECT pg_has_role('fixture_installer','unfarmd_beta_owner','SET') AS member")).rows[0].member,false);
 assert.equal((await db.admin.query("SELECT pg_has_role('fixture_installer','unfarmd_beta_owner','USAGE') AS member")).rows[0].member,false);
 const operatorMembership=(await db.admin.query("SELECT m.admin_option,m.inherit_option,m.set_option FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member WHERE r.rolname='unfarmd_beta_owner' AND u.rolname='fixture_installer'")).rows;
 assert.ok(operatorMembership.some(m=>m.admin_option&&!m.inherit_option&&!m.set_option));
 for(const role of ['validator','consumer','stopper']){
  const c=await db.native(role);assert.equal(strictBindingEstablished(c),true);await handshake(c,role);
  assert.equal((await c.query('SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()')).rows[0].ssl,true);
  await assert.rejects(c.query('SELECT * FROM unfarmd_beta.policy'),/permission denied/);
  await assert.rejects(c.query('UPDATE unfarmd_beta.policy SET stopped=false'),/permission denied/);
  await assert.rejects(c.query('CREATE TABLE unfarmd_beta.forbidden(x int)'),/permission denied/);
  await assert.rejects(c.query('SET ROLE unfarmd_beta_owner'),/permission denied/);
  await assert.rejects(c.query("SELECT unfarmd_beta.transition('stop','{}')"),/permission denied/);
  await c.end();
 }
 const installer=await db.client('fixture_installer');
 await assert.rejects(installer.query(fs.readFileSync('experiments/jupiter-beta-approval/integration/durable/schema.sql','utf8')),/already exists/);await installer.query('ROLLBACK');
 assert.equal((await db.state()).seq,'0');
}));

test('real verified TLS PostgreSQL wire offering only SCRAM-SHA-256 is rejected before an authentication response',()=>scenario(async(db)=>{
 let authReplies=0,offered=false;const sockets=new Set(),secure=tls.createSecureContext({key:fs.readFileSync(db.dir+'/test.key'),cert:db.ca});
 const server=net.createServer(socket=>{sockets.add(socket);socket.on('error',()=>{});socket.once('data',ssl=>{
  assert.equal(ssl.readInt32BE(4),80877103);socket.write('S');
  const stream=new tls.TLSSocket(socket,{isServer:true,secureContext:secure});sockets.add(stream);stream.on('error',()=>{});
  stream.once('data',()=>{offered=true;const mechanism=Buffer.from('SCRAM-SHA-256\0\0'),message=Buffer.alloc(9+mechanism.length);message[0]=82;message.writeInt32BE(message.length-1,1);message.writeInt32BE(10,5);mechanism.copy(message,9);stream.on('data',()=>{authReplies++;});stream.write(message);});
 });});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));try{
  await assert.rejects(db.native('validator',{port:server.address().port}),e=>e.message==='beta_native_unavailable');assert.equal(offered,true,'must reach the post-TLS PostgreSQL SASL offer');assert.equal(authReplies,0);
 }finally{for(const s of sockets)s.destroy();await new Promise(ok=>server.close(ok));}
}));

test('actual verified TLS/PLUS rejects wrong CA, hostname, password and server cleartext auth',()=>scenario(async(db)=>{
 await assert.rejects(db.native('validator',{ssl:{ca:db.ca,rejectUnauthorized:true,servername:'wrong.fixture.invalid'}}),/beta_native_unavailable/);
 await assert.rejects(db.native('validator',{ssl:{rejectUnauthorized:true,servername:'ep-beta-local-test.c-6.us-east-2.aws.neon.tech'}}),/beta_native_unavailable/);
 await assert.rejects(db.native('validator',{password:'SYNTHETIC_WRONG'}),/beta_native_unavailable/);
 db.hba('password');await new Promise(ok=>setTimeout(ok,100));
 await assert.rejects(db.native(),/beta_native_unavailable/);
}));

for(const defect of ['function body','PUBLIC execute','owner membership'])test('real catalog admission rejects '+defect+' drift before any budget mutation',()=>scenario(async(db)=>{
 const before=await db.native();await handshake(before,'validator');await before.end();const spent=await db.state();
 if(defect==='function body')await db.admin.query("CREATE OR REPLACE FUNCTION unfarmd_beta.issue(op text,input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_DRIFT'; END $$");
 if(defect==='PUBLIC execute')await db.admin.query('GRANT EXECUTE ON FUNCTION unfarmd_beta.transition(text,jsonb) TO PUBLIC');
 if(defect==='owner membership')await db.admin.query('GRANT unfarmd_beta_owner TO unfarmd_beta_validator_login');
 const after=await db.native();await assert.rejects(handshake(after,'validator'),e=>e.message==='beta_native_unavailable');await after.end();
 assert.deepEqual(await db.state(),spent);
}));

test('reproduces exact279 defect: rollback STOP commits while SQL reports ok for call and reserve',async()=>{
 const sql=execFileSync('git',['show',BASE+':experiments/jupiter-beta-approval/integration/durable/schema.sql'],{encoding:'utf8'});
 for(const op of ['call','reserve'])await scenario(async(db,h)=>{
  db.clock(30);const prior=await db.anchor.current();
  const args={anchorSeq:prior.seq,anchorHead:prior.head,anchorStateHash:prior.stateHash,epoch:h.t.beta.epoch,policyHash:policyBinding(h.t),grantId:h.r.grantId,record:h.r,requestHash:hash('TEST')};
  await db.admin.query("SELECT unfarmd_beta.issue('prepare',$1::jsonb)",[JSON.stringify(args)]);
  const spent=await db.state();db.clock(0);
  const response=(await db.admin.query(op==='call'?"SELECT unfarmd_beta.issue('call',$1::jsonb) AS result":"SELECT unfarmd_beta.consume('reserve',$1::jsonb) AS result",[JSON.stringify(args)])).rows[0].result;
  assert.equal(response.status,'ok','old caller would treat committed STOP as success');assert.equal((await db.state()).stopped,true);noCounterReset(spent,await db.state());
 },{sql});
});

test('exact279 SQL+adapter+callers reproduce post-STOP provider dispatch and false reservation with only TEST transport',async()=>{
 const dir=fs.mkdtempSync(os.tmpdir()+'/jupiter-stop-original-');
 execFileSync('git',['worktree','add','--detach',dir,BASE],{stdio:'ignore'});
 try{
  const pkg=dir+'/experiments/jupiter-beta-approval/integration/';
  fs.symlinkSync(fs.realpathSync('experiments/jupiter-beta-approval/integration/node_modules'),pkg+'node_modules');
  const oldStore=await import(pathToFileURL(pkg+'durable/postgres.mjs'));
  const oldTLS=await import(pathToFileURL(pkg+'durable/tls.mjs'));
  const oldValidator=await import(pathToFileURL(pkg+'validator.mjs'));
  const oldAuthority=await import(pathToFileURL(pkg+'authority.mjs'));
  const sql=fs.readFileSync(pkg+'durable/schema.sql','utf8');
  const oldLedger=(db,h,role='validator')=>oldStore.postgresLedger({publicTrust:h.t,role,anchor:db.anchor,open:async()=>{
   const c=new oldTLS.StrictBetaClient(oldTLS.configuration(`postgresql://unfarmd_beta_${role}_login:${PASSWORD}@${HOST}/unfarmd_beta_authority?sslmode=verify-full&channel_binding=require`,HOST,db.ca));c.on('error',()=>{});await c.connect();return c;
  }});
  await scenario(async(db,h)=>{
   db.clock(30);const real=oldLedger(db,h),ledger={...real,async prepare(...a){const r=await real.prepare(...a);db.clock(0);return r;}};
   const transport={async send(...a){assert.equal((await db.state()).stopped,true,'actual STOP must have committed BEFORE mock dispatch');return h.transport.send(...a);}};
   const v=oldValidator.validatorComponent({publicTrust:h.t,sdk:await h.sdk(),transport,ledger,clock:h.clock});
   assert.equal((await v.submit(await h.signed())).status,'held');assert.equal(h.calls.length,5,'all five requests would be dispatched after STOP in exact279');assert.equal((await db.admin.query('SELECT calls FROM unfarmd_beta.grants')).rows[0].calls,0);
  },{sql});
  await scenario(async(db,h)=>{
   const fake=validatorComponent({publicTrust:h.t,sdk:await h.sdk(),transport:h.transport,ledger:h.ledger,clock:h.clock});const packet=await fake.submit(await h.signed());assert.equal(packet.status,'approval_prepared_source_off');
   db.clock(30);const ledger=oldLedger(db,h),p=await ledger.prepare(h.r,hash('TEST'));
   for(let i=0;i<5;i++)assert.equal(await ledger.beforeCall(h.r.grantId,p.fence),true);
   assert.equal((await ledger.publish(h.r.grantId,p.fence,packet.envelope)).status,'published');db.clock(0);
   const consumer=oldAuthority.consumptionComponent({publicTrust:h.t,clock:h.clock,ledger:oldLedger(db,h,'consumer'),stopper:{}});
   const reply=await consumer.reserve({envelope:packet.envelope,mint:h.r.scope.mints[0],operationId:randomUUID()});
   assert.equal(reply.status,'reservation_source_off');const stopped=await db.state();assert.equal(stopped.stopped,true);assert.equal(stopped.uses,0,'old caller reported a reservation that never committed');
  },{sql});
 }finally{execFileSync('git',['worktree','remove','--force',dir],{stdio:'ignore'});}
});

test('clock rollback between prepare and beforeCall commits+anchors STOP and dispatches ZERO provider requests',()=>scenario(async(db,h)=>{
 db.clock(30);const real=db.ledger(),ledger={...real,async prepare(...args){const r=await real.prepare(...args);db.clock(0);return r;}};
 const v=validatorComponent({publicTrust:h.t,sdk:await h.sdk(),transport:h.transport,ledger,clock:h.clock});
 const result=await v.submit(await h.signed());assert.equal(result.status,'held');assert.equal(h.calls.length,0);
 const p=await db.state();assert.equal(p.stopped,true);assert.equal(p.signatures,1);assert.equal(p.uses,0);assert.equal(p.seq,'2');assert.equal((await db.anchor.current()).head,p.head);
 assert.equal((await db.admin.query('SELECT calls FROM unfarmd_beta.grants')).rows[0].calls,0);
 assert.equal(await db.ledger().beforeCall(h.r.grantId,'1'),false);
}));

for(const phase of ['before append','after fsync'])test('clock-rollback STOP survives anchor failure '+phase+'; no call success escapes',()=>scenario(async(db,h)=>{
 db.clock(30);const anchor={current:()=>db.anchor.current(),advance:async(p,n)=>{if(n.stopped){if(phase==='after fsync')await db.anchor.advance(p,n);throw Error('SYNTHETIC_STOP_ANCHOR_OUTAGE');}return db.anchor.advance(p,n);}};
 const real=db.ledger('validator',{anchor}),ledger={...real,async prepare(...args){const r=await real.prepare(...args);db.clock(0);return r;}};
 const v=validatorComponent({publicTrust:h.t,sdk:await h.sdk(),transport:h.transport,ledger,clock:h.clock});
 assert.equal((await v.submit(await h.signed())).status,'held');assert.equal(h.calls.length,0);const p=await db.state();assert.equal(p.stopped,true);assert.equal(p.signatures,1);assert.equal(p.uses,0);assert.equal(p.seq,'2');assert.equal((await db.anchor.current()).seq,phase==='before append'?'1':'2');
 await assert.rejects(real.beforeCall(h.r.grantId,'1'),/held/);assert.equal(h.calls.length,0);
}));

for(const op of ['check','reserve'])test('clock rollback during '+op+' durably STOPs, preserves history and cannot report reservation success',()=>scenario(async(db,h)=>{
 db.clock(30);const {result,verified}=await issue(db,h);const spent=await db.state();db.clock(0);
 const ledger=db.ledger('consumer'),r=await ledger[op](verified,h.r.scope.mints[0],randomUUID());
 assert.equal(r.status,'stopped');assert.equal(r.operation,'stop');assert.equal(r.stopped,true);
 const p=await db.state();assert.equal(p.stopped,true);noCounterReset(spent,p);assert.equal(BigInt(p.seq),BigInt(spent.seq)+1n);assert.equal((await db.anchor.current()).head,p.head);
 const component=consumptionComponent({publicTrust:h.t,ledger:{reserve:async()=>r},stopper:{},clock:h.clock});
 assert.equal((await component.reserve({envelope:result.envelope,mint:h.r.scope.mints[0],operationId:randomUUID()})).status,'held');
 assert.equal((await db.admin.query('SELECT count(*)::int AS n FROM unfarmd_beta.events')).rows[0].n,Number(p.seq));
 assert.equal((await db.admin.query('SELECT count(*)::int AS n FROM unfarmd_beta.operations')).rows[0].n,0);
}));

test('async receipt alias cannot convert an already committed STOP into provider permission',()=>scenario(async(db,h)=>{
 let original;const anchor={current:()=>db.anchor.current(),async advance(p,n){await db.anchor.advance(p,n);if(n.operation==='stop'){original.status='ok';original.operation='call';original.stopped=false;}}};
 const open=async()=>{const c=await db.native(),query=c.query.bind(c);c.query=async(...a)=>{const r=await query(...a);if(String(a[0]).startsWith('SELECT unfarmd_beta.'))original=r.rows[0].result;return r;};return c;};
 const ledger=db.ledger('validator',{anchor,open});db.clock(30);const p=await ledger.prepare(h.r,hash('TEST'));
 db.clock(0);const allowed=await ledger.beforeCall(h.r.grantId,p.fence);assert.equal((await db.state()).stopped,true);assert.equal(allowed,false);assert.equal(h.calls.length,0);
}));

test('real concurrent reservations and replay never overspend finite multi-mint grant',()=>scenario(async(db,h)=>{
 const {verified}=await issue(db,h);const ledger=db.ledger('consumer'),id=randomUUID(),mint=h.r.scope.mints[0];
 const prior=await db.anchor.current();let readers=0,release;
 const gate=new Promise(ok=>{release=ok;});
 const simultaneous={current:async()=>{if(++readers===10)release();await gate;return prior;},advance:(p,n)=>db.anchor.advance(p,n)};
 // TEN real concurrent native connections; no shared JavaScript queue. Force
 // identical pre-state so PostgreSQL's row lock/anchor comparison decides.
 const replies=await Promise.allSettled(Array.from({length:10},()=>db.ledger('consumer',{anchor:simultaneous,withLock:fn=>fn()}).reserve(verified,mint,id)));
 assert.equal(replies.filter(x=>x.status==='fulfilled'&&x.value.status==='ok').length,1);
 for(const other of h.r.scope.mints.slice(1))assert.equal((await ledger.reserve(verified,other,randomUUID())).status,'ok');
 assert.equal((await db.state()).uses,4);assert.equal((await db.admin.query('SELECT count(*)::int AS n FROM unfarmd_beta.operations')).rows[0].n,4);
 await assert.rejects(db.ledger('consumer').reserve(verified,mint,randomUUID()),/held/);
}));

test('transaction rejection leaves counters/history unchanged; wrong fence, epoch, policy and nonce replay deny',()=>scenario(async(db,h)=>{
 const ledger=db.ledger();const prepared=await ledger.prepare(h.r,hash('TEST'));const prior=await db.anchor.current(),spent=await db.state();
 for(const data of [{fence:'999999'},{fence:prepared.fence,epoch:99},{fence:prepared.fence,policyHash:hash('WRONG')},{fence:prepared.fence,anchorStateHash:hash('WRONG')}]){
  const input={anchorSeq:prior.seq,anchorHead:prior.head,anchorStateHash:prior.stateHash,policyHash:policyBinding(h.t),epoch:h.t.beta.epoch,grantId:h.r.grantId,...data};
  const c=await db.native();await assert.rejects(c.query("SELECT unfarmd_beta.issue('call',$1::jsonb)",[JSON.stringify(input)]));await c.end();assert.deepEqual(await db.state(),spent);
 }
 await assert.rejects(db.ledger().prepare(h.r,hash('TEST')),/held/);assert.deepEqual(await db.state(),spent);
}));

test('unknown lease is retained and cannot be published or reclaimed',()=>scenario(async(db,h)=>{
 const ledger=db.ledger(),p=await ledger.prepare(h.r,hash('TEST'));await ledger.beforeCall(h.r.grantId,p.fence);await ledger.uncertain(h.r.grantId,p.fence);
 const spent=await db.state();await assert.rejects(db.ledger().publish(h.r.grantId,p.fence,'TEST'),/held/);assert.deepEqual(await db.state(),spent);
 const g=(await db.admin.query('SELECT * FROM unfarmd_beta.grants')).rows[0];assert.equal(g.state,'uncertain');assert.equal(g.calls,1);assert.equal(g.fence,p.fence);
}));

for(const phase of ['call','stop'])test('lost committed '+phase+' acknowledgment never authorizes, preserves spend/STOP and restart fails closed',()=>scenario(async(db,h)=>{
 const normal=db.ledger(),prepared=await normal.prepare(h.r,hash('TEST'));const spent=await db.state();let seen=false;
 const broken=db.ledger(phase==='stop'?'stopper':'validator',{open:async()=>{const c=await db.native(phase==='stop'?'stopper':'validator'),query=c.query.bind(c);c.query=async(...args)=>{const r=await query(...args);if(String(args[0]).startsWith('SELECT unfarmd_beta.')){seen=true;throw Error('SYNTHETIC_LOST_ACK');}return r;};return c;}});
 await assert.rejects(phase==='stop'?broken.stop():broken.beforeCall(h.r.grantId,prepared.fence),/beta_store_held/);assert.equal(seen,true);
 const committed=await db.state();assert.equal(committed.signatures,spent.signatures);assert.equal(committed.uses,spent.uses);assert.equal(committed.stopped,phase==='stop');
 assert.equal((await db.admin.query('SELECT calls FROM unfarmd_beta.grants')).rows[0].calls,phase==='call'?1:0);
 await db.restart();const root=await db.root();const after=(await root.query('SELECT * FROM unfarmd_beta.policy')).rows[0];assert.deepEqual(after,committed);
 await assert.rejects(db.ledger().beforeCall(h.r.grantId,prepared.fence),/held/);
}));

test('missing anchor before DB operation cannot spend; missing anchor during explicit STOP still commits STOP but reports UNKNOWN',()=>scenario(async(db,h)=>{
 const spent=await db.state();const missing={async current(){throw Error('TEST_ANCHOR_DOWN');},async advance(){throw Error('TEST_ANCHOR_DOWN');}};
 await assert.rejects(db.ledger('validator',{anchor:missing}).prepare(h.r,hash('TEST')),/held/);assert.deepEqual(await db.state(),spent);
 await assert.rejects(db.ledger('stopper',{anchor:missing}).stop(),/held/);const p=await db.state();assert.equal(p.stopped,true);noCounterReset(spent,p);
}));

test('anchor failure after DB commit preserves spend and permanently holds subsequent/new adapters',()=>scenario(async(db,h)=>{
 const a={current:()=>db.anchor.current(),async advance(){throw Error('TEST_DISK_FAILURE');}},ledger=db.ledger('validator',{anchor:a});
 await assert.rejects(ledger.prepare(h.r,hash('TEST')),/held/);const p=await db.state();assert.equal(p.signatures,1);assert.equal(p.seq,'1');assert.equal((await db.anchor.current()).seq,'0');
 await assert.rejects(ledger.prepare(h.r,hash('TEST')),/held/);await assert.rejects(db.ledger().prepare({...h.r,grantId:randomUUID()},hash('TEST')),/held/);assert.deepEqual(await db.state(),p);
}));

test('database outage cannot touch anchor or dispatch a provider request',()=>scenario(async(db,h)=>{
 const before=fs.readFileSync(db.anchorDir+'/beta-anchor.jsonl');await db.outage();
 const v=validatorComponent({publicTrust:h.t,sdk:await h.sdk(),transport:h.transport,ledger:db.ledger(),clock:h.clock});
 assert.equal((await v.submit(await h.signed())).status,'held');assert.equal(h.calls.length,0);assert.deepEqual(fs.readFileSync(db.anchorDir+'/beta-anchor.jsonl'),before);
}));

test('permanent STOP is idempotent across restart; prior attempts/uses/history stay spent',()=>scenario(async(db,h)=>{
 const {verified}=await issue(db,h);await db.ledger('consumer').reserve(verified,h.r.scope.mints[0],randomUUID());const spent=await db.state();
 const r=await db.ledger('stopper').stop();assert.equal(r.status,'stopped');assert.equal(r.operation,'stop');assert.equal(r.stopped,true);const stopped=await db.state();noCounterReset(spent,stopped);
 await db.restart();const root=await db.root();assert.deepEqual((await root.query('SELECT * FROM unfarmd_beta.policy')).rows[0],stopped);
 const ack=await db.ledger('stopper').stop();assert.equal(ack.status,'stopped');assert.equal(ack.head,r.head);assert.equal(ack.seq,r.seq);
 await assert.rejects(db.ledger('consumer').reserve(verified,h.r.scope.mints[1],randomUUID()),/held/);
}));

test('actual lifetime caps stop at25 attempts/100 uses with no credit refund or automatic epoch reset',()=>scenario(async(db,h)=>{
 for(let i=0;i<25;i++){
  h.r.grantId=randomUUID();h.r.nonce=hash(randomUUID());
  const {verified}=await issue(db,h);const ledger=db.ledger('consumer');
  for(const mint of h.r.scope.mints)assert.equal((await ledger.reserve(verified,mint,randomUUID())).status,'ok');
 }
 const spent=await db.state();assert.equal(spent.signatures,25);assert.equal(spent.uses,100);assert.equal(h.calls.length,125);
 await assert.rejects(db.ledger().prepare({...h.r,grantId:randomUUID(),nonce:hash(randomUUID())},hash('TEST')),/held/);
 assert.deepEqual(await db.state(),spent);assert.equal(h.calls.length,125);
}));
