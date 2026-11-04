// Owner-approved disposable local/CI SQL only. Namespace/approval precede DB imports.
import {requireLocalPg18Approval} from './pg18-approval.mjs';requireLocalPg18Approval();
const {default:test}=await import('node:test'),{default:assert}=await import('node:assert/strict');
const {fixture}=await import('./pg18-fixture.mjs');
const {createRequire}=await import('node:module'),fs=await import('node:fs/promises'),path=await import('node:path');
const {randomBytes}=await import('node:crypto');const {load,p,H,R}=await import('./fixtures.mjs');
const {StrictJournalClient,strictBindingEstablished}=createRequire(import.meta.url)(process.env.REMOTE_BUILD+'/ops/v4-journal/native-tls.mjs');
const {transaction,PROOF,checkProof}=load('connection'),{postgresProtocol,seed,canonical}=load('protocol'),{bootstrapSql}=load('package');
const {fileAnchor}=await import('../../experiments/jupiter-beta-approval/integration/durable/anchor.mjs');
// Native-only fixture creates a brand-new private local cluster; no legacy schema is executed.
let db,installer,sql,pass,makePool;const pools=[];let counter=0;
test.before(async()=>{
 db=await fixture();assert.equal((await db.owner.query('SHOW server_version_num')).rows[0].server_version_num.slice(0,2),'18');
 pass=randomBytes(32).toString('hex');
 await db.owner.query(`CREATE ROLE native_test_installer LOGIN NOSUPERUSER CREATEROLE NOCREATEDB NOBYPASSRLS PASSWORD '${pass}'`);
 await db.owner.query('ALTER DATABASE unfarmd_v4_pilot OWNER TO native_test_installer');
 const {Pool}=createRequire(import.meta.url)('pg');
 const config=user=>({...db.config(user),Client:StrictJournalClient,password:pass,max:1});
 makePool=user=>{const pool=new Pool(config(user));pool.on('error',()=>{});pools.push(pool);return pool;};installer=makePool('native_test_installer');
 assert.equal((await installer.query('SELECT rolsuper FROM pg_roles WHERE rolname=current_user')).rows[0].rolsuper,false);
 sql=await fs.readFile('lib/native-pilot/postgres/schema.sql','utf8');
 // Real reproduction of original0LP01, then prove its transaction left no native objects/roles.
 const defective=sql.replace('GRANT unfarmd_native_owner TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;','GRANT unfarmd_native_owner TO CURRENT_USER WITH ADMIN TRUE, INHERIT FALSE, SET TRUE;');
 await assert.rejects(()=>installer.query(defective),e=>e.code==='0LP01');await installer.query('ROLLBACK');
 assert.equal((await installer.query("SELECT count(*)::int AS n FROM pg_namespace WHERE nspname='unfarmd_native'")).rows[0].n,0);
 assert.equal((await installer.query("SELECT count(*)::int AS n FROM pg_roles WHERE rolname IN ('unfarmd_native_owner','unfarmd_native_app','unfarmd_native_stopper')")).rows[0].n,0);
 await installer.query(sql);
 const membership=(await installer.query("SELECT bool_or(admin_option) AS admin, bool_and(NOT inherit_option AND NOT set_option) AS no_implicit_set FROM pg_auth_members WHERE roleid='unfarmd_native_owner'::regrole AND member=current_user::regrole")).rows[0];
 assert.equal(membership.admin,true);assert.equal(membership.no_implicit_set,true);
 await installer.query(`CREATE ROLE unfarmd_native_login LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '${pass}'`);
 await installer.query(`CREATE ROLE unfarmd_native_stopper_login LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '${pass}'`);
 await installer.query('GRANT CONNECT ON DATABASE unfarmd_v4_pilot TO unfarmd_native_login,unfarmd_native_stopper_login; REVOKE ALL ON DATABASE unfarmd_v4_pilot FROM PUBLIC; REVOKE CREATE ON SCHEMA public FROM PUBLIC');
 await installer.query('GRANT unfarmd_native_app TO unfarmd_native_login WITH INHERIT TRUE, SET FALSE; GRANT unfarmd_native_stopper TO unfarmd_native_stopper_login WITH INHERIT TRUE, SET FALSE');
 db.newPool=makePool;
});
test.afterEach(async()=>{const close=pools.filter(x=>x!==installer);for(const x of close)pools.splice(pools.indexOf(x),1);await Promise.all(close.map(x=>x.end()));});
test.after(async()=>{await Promise.all(pools.map(x=>x.end()));await db?.close();});
async function scenario(overrides={}){
 const at=Date.now(),policy={...p(),id:'local-approved-'+(++counter),startsAt:at-1000,expiresAt:at+120000,...overrides};
 await installer.query(bootstrapSql(policy,{mode:'local-fsync'}));const initial=seed(policy);
 const directory=path.join(db.dir,'independent-native-'+counter);await fs.mkdir(directory,{mode:0o700});await fs.writeFile(path.join(directory,'beta-anchor.jsonl'),canonical(initial.checkpoint)+'\n',{mode:0o600});
 const a=fileAnchor({directory,bootstrap:initial.checkpoint}),anchor={current:()=>a.current(),async advance(old,next){await a.advance(old,next);return a.current();}};
 let pool=db.newPool('unfarmd_native_login');const verify=async c=>{assert.equal(strictBindingEstablished(c),true);checkProof((await c.query(PROOF)).rows[0]);};
 const tx=transaction(pool,initial.checkpoint.policyHash,verify),ledger=()=>postgresProtocol(policy,(op,input)=>tx(op,{...input,durability:{mode:'local-fsync'}}),anchor);
 const read=async()=>{await installer.query('GRANT unfarmd_native_owner TO CURRENT_USER WITH SET TRUE, INHERIT FALSE');const c=await installer.connect();try{await c.query('SET ROLE unfarmd_native_owner');return (await c.query('SELECT state FROM unfarmd_native.policies WHERE policy_hash=$1',[initial.checkpoint.policyHash])).rows[0].state;}finally{await c.query('RESET ROLE');c.release();}};
 return {policy,initial,pool,anchor,directory,ledger,tx,read,async afterRestart(){pool=db.newPool('unfarmd_native_login');return postgresProtocol(policy,(op,input)=>transaction(pool,initial.checkpoint.policyHash,verify)(op,{...input,durability:{mode:'local-fsync'}}),anchor);}};
}
test('actual PG18 non-superuser install ownership, NOLOGIN roles, native TLS/SCRAM-PLUS and function-only grants',async()=>{
 const x=await scenario(),c=await x.pool.connect();try{assert.equal(strictBindingEstablished(c),true);await c.query('BEGIN');await c.query('SET LOCAL synchronous_commit=on');checkProof((await c.query(PROOF)).rows[0]);await c.query('ROLLBACK');await assert.rejects(()=>c.query('SELECT * FROM unfarmd_native.policies'));await assert.rejects(()=>c.query('TRUNCATE unfarmd_native.history'));}finally{c.release();}
 assert.equal((await x.ledger().inspect()).attempts,0);await assert.rejects(()=>installer.query(sql));await installer.query('ROLLBACK');
});
test('actual PG18 concurrent functions, one reservation, no overspend or implicit uncertain-lease replay',async()=>{const x=await scenario();const outcomes=await Promise.allSettled(Array.from({length:12},()=>x.ledger().reserve('getTokenLargestAccounts',H,Date.now())));assert.ok(outcomes.filter(r=>r.status==='fulfilled'&&r.value.status==='committed').length<=1);const s=await x.read();assert.equal(s.attempts,1);assert.equal(s.credits,1);assert.equal(s.lease.fence,1);});
test('actual PG18 ordered three-call budget, permanent STOP and restart preserve state/history',async()=>{const x=await scenario(),l=x.ledger();for(const method of ['getTokenLargestAccounts','getMultipleAccounts','getBlockTime']){const r=await l.reserve(method,H,Date.now());assert.equal(r.status,'committed');assert.equal((await l.finish(r.state.attempts,R,Date.now())).status,'committed');await new Promise(r=>setTimeout(r,2600));}assert.equal((await l.stop(Date.now())).state.stopped,true);const s=await x.read();assert.equal(s.attempts,3);assert.equal(s.credits,3);await Promise.all(pools.splice(0).map(p=>p.end()));await db.raw.crashRestart();installer=makePool('native_test_installer');assert.equal((await x.read()).stopped,true);const fresh=await x.afterRestart();assert.notEqual((await fresh.reserve('getTokenLargestAccounts',H,Date.now())).status,'committed');});
test('actual PG18 clock rollback commits STOP without authorization, fence mismatch and anchor outage preserve spend',async()=>{const x=await scenario();const first=await x.ledger().reserve('getTokenLargestAccounts',H,Date.now());assert.equal(first.status,'committed');const r=await x.ledger().finish(2,R,Date.now()-60000);assert.notEqual(r.status,'committed');assert.equal((await x.read()).stopped,true);assert.equal((await x.read()).attempts,1);});
test('actual local native TLS rejects untrusted certificate and disabled binding; STOP-only login cannot reserve',async()=>{const x=await scenario();assert.throws(()=>new StrictJournalClient({...db.config('unfarmd_native_login'),enableChannelBinding:false}));const bad=new StrictJournalClient({...db.config('unfarmd_native_login'),password:pass,ssl:{...db.config('unfarmd_native_login').ssl,ca:'SYNTHETIC_UNTRUSTED_CA'}});await assert.rejects(()=>bad.connect());await bad.end().catch(()=>{});const pool=makePool('unfarmd_native_stopper_login'),c=await pool.connect();try{assert.equal(strictBindingEstablished(c),true);await assert.rejects(()=>c.query("SELECT unfarmd_native.step('reserve',$1,'{}')",[x.initial.checkpoint.policyHash]));}finally{c.release();}const tx=transaction(pool,x.initial.checkpoint.policyHash,async c=>checkProof((await c.query(PROOF)).rows[0],true));const l=postgresProtocol(x.policy,(op,input)=>tx(op,{...input,durability:{mode:'local-fsync'}}),x.anchor);assert.equal((await l.stop(Date.now())).state.stopped,true);});
test('actual PostgreSQL completion fencing and replay cannot refund or reopen spent budget',async()=>{const x=await scenario(),l=x.ledger();await l.reserve('getTokenLargestAccounts',H,Date.now());const r=await l.finish(2,R,Date.now());assert.notEqual(r.status,'committed');const s=await x.read();assert.equal(s.stopped,true);assert.equal(s.attempts,1);assert.equal(s.lease.fence,1);assert.notEqual((await x.ledger().finish(1,R,Date.now())).status,'committed');});
test('actual DB reservation survives independent anchor failure; fresh process cannot repeat it',async()=>{const x=await scenario(),broken={current:()=>x.anchor.current(),advance:async()=>{throw Error('SYNTHETIC INDEPENDENT DISK OUTAGE');}};const l=postgresProtocol(x.policy,(op,input)=>x.tx(op,{...input,durability:{mode:'local-fsync'}}),broken);await assert.rejects(()=>l.reserve('getTokenLargestAccounts',H,Date.now()));assert.equal((await x.read()).attempts,1);await assert.rejects(()=>x.ledger().inspect());});
test('actual committed reservation followed by lost COMMIT ACK cannot be repeated or refunded',async()=>{const x=await scenario();
 // Use the genuine native client for real proof; inject only its post-COMMIT acknowledgement.
 const wrapper={connect:async()=>{const c=await x.pool.connect();assert.equal(strictBindingEstablished(c),true);const query=c.query.bind(c);c.query=async(...args)=>{const r=await query(...args);if(args[0]==='COMMIT')throw Error('SYNTHETIC LOST ACK');return r;};return c;}};
 const actual=transaction(wrapper,x.initial.checkpoint.policyHash,async c=>checkProof((await c.query(PROOF)).rows[0]));
 await assert.rejects(()=>postgresProtocol(x.policy,(op,input)=>actual(op,{...input,durability:{mode:'local-fsync'}}),x.anchor).reserve('getTokenLargestAccounts',H,Date.now()));assert.equal((await x.read()).attempts,1);await assert.rejects(()=>x.ledger().inspect());
});
test('actual six independent Node processes serialize durable reservation and allow at most one synthetic send',async()=>{
 const x=await scenario(),{fork}=await import('node:child_process'),workers=[];
 try{
  const config={...db.config('unfarmd_native_login'),password:pass};delete config.Client;
  const ready=Array.from({length:6},()=>new Promise((resolve,reject)=>{
   const c=fork('tests/native-postgres/pg18-worker.mjs',[],{env:{...process.env},stdio:['ignore','inherit','inherit','ipc']});workers.push(c);
   c.once('error',reject);c.once('message',msg=>msg.ready?resolve(c):reject(Error('worker_not_ready')));
  }));
  await Promise.all(ready);
  const results=await Promise.all(workers.map(c=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('worker_timeout')),10000);c.once('message',m=>{clearTimeout(timer);resolve(m);});c.send({config,policy:x.policy,directory:x.directory});})));
  assert.ok(results.filter(r=>r.status==='committed').length<=1);
  const s=await x.read();assert.equal(s.attempts,1);assert.equal(s.credits,1);assert.equal(s.lease.fence,1);
 }finally{for(const c of workers)if(c.connected)c.kill();}
});
test('actual attempt/debit exhaustion cannot reserve a fourth method or exceed reviewed nonunit credits',async()=>{
 const x=await scenario({debit:{...p().debit,getTokenLargestAccounts:2},credits:4}),l=x.ledger();
 for(const m of ['getTokenLargestAccounts','getMultipleAccounts','getBlockTime']){const r=await l.reserve(m,H,Date.now());assert.equal(r.status,'committed');await l.finish(r.state.attempts,R,Date.now());await new Promise(r=>setTimeout(r,2550));}
 assert.notEqual((await l.reserve('getTokenLargestAccounts',H,Date.now())).status,'committed');const s=await x.read();assert.equal(s.attempts,3);assert.equal(s.credits,4);assert.equal(s.completed,3);
});
test('actual out-of-order method spends nothing; underfunded policy is rejected before seeding',async()=>{
 const x=await scenario(),l=x.ledger();
 assert.notEqual((await l.reserve('getBlockTime',H,Date.now())).status,'committed');assert.equal((await x.read()).attempts,0);assert.equal((await x.read()).credits,0);assert.throws(()=>bootstrapSql({...p(),credits:2},{mode:'local-fsync'}));
});
test('actual checkpoint read outage prevents SQL reserve, but STOP persists without ACK',async()=>{
 const x=await scenario(),broken={current:async()=>{throw Error('SYNTHETIC CUSTODY OUTAGE');},advance:async()=>{throw Error('not_reached');}};let calls=0;
 const l=postgresProtocol(x.policy,(op,input)=>{calls++;return x.tx(op,{...input,durability:{mode:'local-fsync'}});},broken);
 await assert.rejects(()=>l.reserve('getTokenLargestAccounts',H,Date.now()));assert.equal(calls,0);await assert.rejects(()=>l.stop(Date.now()));assert.equal(calls,1);const s=await x.read();assert.equal(s.stopped,true);assert.equal(s.attempts,0);await assert.rejects(()=>x.ledger().inspect());
});
async function freshContender(x){
 const {fork}=await import('node:child_process'),config={...db.config('unfarmd_native_login'),password:pass};delete config.Client;
 return new Promise((resolve,reject)=>{
  const c=fork('tests/native-postgres/pg18-worker.mjs',[],{env:{...process.env},stdio:['ignore','inherit','inherit','ipc']});let result;
  const timer=setTimeout(()=>{c.kill();reject(Error('fresh_process_timeout'));},10000);
  c.on('message',m=>{if(m.ready)c.send({config,policy:x.policy,directory:x.directory});else result=m;});
  c.once('error',e=>{clearTimeout(timer);reject(e);});c.once('exit',code=>{clearTimeout(timer);if(code===0&&result)resolve(result);else reject(Error('fresh_process_failed'));});
 });
}
test('actual durable checkpoint advance followed by lost ACK survives restart without retry/refund',async()=>{
 const x=await scenario(),broken={current:()=>x.anchor.current(),async advance(a,b){await x.anchor.advance(a,b);throw Error('SYNTHETIC LOST CHECKPOINT ACK');}};
 await assert.rejects(()=>postgresProtocol(x.policy,(op,input)=>x.tx(op,{...input,durability:{mode:'local-fsync'}}),broken).reserve('getTokenLargestAccounts',H,Date.now()));
 assert.equal((await x.read()).attempts,1);const restarted=await freshContender(x);assert.equal(restarted.status,'stopped');const preserved=await x.read();assert.equal(preserved.stopped,true);assert.equal(preserved.attempts,1);assert.equal(preserved.credits,1);
});
test('actual database outage before COMMIT advances neither counters nor checkpoint; uncertain lease stays spent',async()=>{
 const x=await scenario();await x.ledger().reserve('getTokenLargestAccounts',H,Date.now());const before=await x.anchor.current();
 await Promise.all(pools.splice(0).map(p=>p.end()));await db.raw.outage();
 const dead=makePool('unfarmd_native_login');await assert.rejects(()=>postgresProtocol(x.policy,(op,input)=>transaction(dead,x.initial.checkpoint.policyHash,async()=>{})(op,{...input,durability:{mode:'local-fsync'}}),x.anchor).stop(Date.now()));
 assert.deepEqual(await x.anchor.current(),before);await Promise.all(pools.splice(0).map(p=>p.end()));await db.raw.restore();installer=makePool('native_test_installer');
 const s=await x.read();assert.equal(s.attempts,1);assert.equal(s.lease.fence,1);assert.equal(s.stopped,false);const resumed=await x.afterRestart();assert.equal((await resumed.reserve('getTokenLargestAccounts',H,Date.now())).status,'stopped');
});
test('actual rollback before COMMIT is atomic; history and counters cannot be rewritten or truncated',async()=>{
 const x=await scenario(),c=await x.pool.connect();try{await c.query('BEGIN');const a=await x.anchor.current();await c.query("SELECT unfarmd_native.step('reserve',$1,$2)",[x.initial.checkpoint.policyHash,JSON.stringify({at:Date.now(),method:'getTokenLargestAccounts',requestHash:H,anchorSeq:a.seq,anchorHead:a.head,anchorStateHash:a.stateHash,durability:{mode:'local-fsync'}})]);await c.query('ROLLBACK');}finally{c.release();}
 assert.equal((await x.read()).attempts,0);await x.ledger().reserve('getTokenLargestAccounts',H,Date.now());
 const owner=await installer.connect();try{await owner.query('SET ROLE unfarmd_native_owner');for(const sql of ["UPDATE unfarmd_native.policies SET state=jsonb_set(state,'{attempts}','0') WHERE policy_hash=$1","DELETE FROM unfarmd_native.history WHERE policy_hash=$1"]){await assert.rejects(()=>owner.query(sql,[x.initial.checkpoint.policyHash]));}await assert.rejects(()=>owner.query('TRUNCATE unfarmd_native.history'));}finally{await owner.query('RESET ROLE');owner.release();}
 assert.equal((await x.read()).attempts,1);
});
test('actual wrong password/hostname never establishes native PLUS and redacts synthetic secret',async()=>{
 for(const patch of [{password:'SYNTHETIC_INVALID_PASSWORD'},{host:'127.0.0.1',ssl:{...db.config('unfarmd_native_login').ssl,servername:'127.0.0.1'}}]){
  const c=new StrictJournalClient({...db.config('unfarmd_native_login'),password:pass,...patch});try{await assert.rejects(()=>c.connect(),e=>e.message==='journal_native_unavailable'&&!e.message.includes(pass));assert.equal(strictBindingEstablished(c),false);}finally{await c.end().catch(()=>{});}
 }
});
