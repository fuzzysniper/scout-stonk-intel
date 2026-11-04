// PREPARED ONLY. No top-level DB/harness import before the immutable default-deny guard.
import {requireLocalPg18Approval} from './pg18-approval.mjs';requireLocalPg18Approval();
const {default:test}=await import('node:test'),{default:assert}=await import('node:assert/strict');
const {fixture}=await import('../v4-journal-deployment/fixture.mjs');
const {createRequire}=await import('node:module'),fs=await import('node:fs/promises'),path=await import('node:path');
const {randomBytes}=await import('node:crypto');const {load,p,H,R}=await import('./fixtures.mjs');
const {StrictJournalClient,strictBindingEstablished}=createRequire(import.meta.url)(process.env.REMOTE_BUILD+'/ops/v4-journal/native-tls.mjs');
const {transaction,PROOF,checkProof}=load('connection'),{postgresProtocol,seed,canonical}=load('protocol'),{bootstrapSql}=load('package');
const {fileAnchor}=await import('../../experiments/jupiter-beta-approval/integration/durable/anchor.mjs');
// Existing fixture creates a brand-new private local cluster/TLS only. No installed schema renderer is run.
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
 sql=await fs.readFile('lib/native-pilot/postgres/schema.sql','utf8');await installer.query(sql);
 await installer.query(`CREATE ROLE unfarmd_native_login LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '${pass}'`);
 await installer.query(`CREATE ROLE unfarmd_native_stopper_login LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '${pass}'`);
 await installer.query('GRANT CONNECT ON DATABASE unfarmd_v4_pilot TO unfarmd_native_login,unfarmd_native_stopper_login; REVOKE ALL ON DATABASE unfarmd_v4_pilot FROM PUBLIC; REVOKE CREATE ON SCHEMA public FROM PUBLIC');
 await installer.query('GRANT unfarmd_native_app TO unfarmd_native_login WITH INHERIT TRUE, SET FALSE; GRANT unfarmd_native_stopper TO unfarmd_native_stopper_login WITH INHERIT TRUE, SET FALSE');
 db.newPool=makePool;
});
test.after(async()=>{await Promise.all(pools.map(x=>x.end()));await db?.close();});
async function scenario(){
 const at=Date.now(),policy={...p(),id:'local-approved-'+(++counter),startsAt:at-1000,expiresAt:at+120000};
 await installer.query(bootstrapSql(policy,{mode:'local-fsync'}));const initial=seed(policy);
 const directory=path.join(db.dir,'independent-native-'+counter);await fs.mkdir(directory,{mode:0o700});await fs.writeFile(path.join(directory,'beta-anchor.jsonl'),canonical(initial.checkpoint)+'\n',{mode:0o600});
 const a=fileAnchor({directory,bootstrap:initial.checkpoint}),anchor={current:()=>a.current(),async advance(old,next){await a.advance(old,next);return a.current();}};
 let pool=db.newPool('unfarmd_native_login');const verify=async c=>{assert.equal(strictBindingEstablished(c),true);checkProof((await c.query(PROOF)).rows[0]);};
 const tx=transaction(pool,initial.checkpoint.policyHash,verify),ledger=()=>postgresProtocol(policy,(op,input)=>tx(op,{...input,durability:{mode:'local-fsync'}}),anchor);
 const read=async()=>{await installer.query('GRANT unfarmd_native_owner TO CURRENT_USER WITH SET TRUE, INHERIT FALSE');const c=await installer.connect();try{await c.query('SET ROLE unfarmd_native_owner');return (await c.query('SELECT state FROM unfarmd_native.policies WHERE policy_hash=$1',[initial.checkpoint.policyHash])).rows[0].state;}finally{await c.query('RESET ROLE');c.release();}};
 return {policy,initial,pool,anchor,ledger,tx,read,async afterRestart(){pool=db.newPool('unfarmd_native_login');return postgresProtocol(policy,(op,input)=>transaction(pool,initial.checkpoint.policyHash,verify)(op,{...input,durability:{mode:'local-fsync'}}),anchor);}};
}
test('actual PG18 non-superuser install ownership, NOLOGIN roles, native TLS/SCRAM-PLUS and function-only grants',async()=>{
 const x=await scenario(),c=await x.pool.connect();try{assert.equal(strictBindingEstablished(c),true);await c.query('BEGIN');await c.query('SET LOCAL synchronous_commit=on');checkProof((await c.query(PROOF)).rows[0]);await c.query('ROLLBACK');await assert.rejects(()=>c.query('SELECT * FROM unfarmd_native.policies'));await assert.rejects(()=>c.query('TRUNCATE unfarmd_native.history'));}finally{c.release();}
 assert.equal((await x.ledger().inspect()).attempts,0);await assert.rejects(()=>installer.query(sql));
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
