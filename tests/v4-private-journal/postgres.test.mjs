// REAL disposable LOCAL PostgreSQL/TLS. All identities, text, assertions and keys are SYNTHETIC.
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdtempSync,readFileSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {execFileSync} from 'node:child_process';
import {localPostgres} from '../onchain-api/postgres-harness.mjs';
import {auth,keyring,command,created,revised,updated,MINT,OTHER,PostgresJournalRepository} from './fixtures.mjs';
let db,dir,port,ca,password,authority,ring;const pools=new Set();
const OWNER=randomUUID(),INTRUDER=randomUUID();
before(async()=>{
 dir=mkdtempSync(join(tmpdir(),'unfarmd-j222-tls-'));const key=join(dir,'ephemeral.key'),cert=join(dir,'ephemeral.crt');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=journal.synthetic.invalid','-addext','subjectAltName=DNS:journal.synthetic.invalid','-keyout',key,'-out',cert],{stdio:'ignore'});chmodSync(key,0o600);ca=readFileSync(cert,'utf8');
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));port=probe.address().port;await new Promise(r=>probe.close(r));
 db=await localPostgres({tls:{port,cert,key}});
 await db.owner.query(readFileSync('lib/v4-private-journal/schema.sql','utf8'));
 password=randomBytes(24).toString('hex');
 // Generated local-only role password, never exported or logged.
 await db.owner.query(`CREATE ROLE j222_app LOGIN PASSWORD '${password}'; GRANT unfarmd_journal_app TO j222_app; CREATE ROLE j222_erase LOGIN PASSWORD '${password}'; GRANT unfarmd_journal_erasure TO j222_erase`);
});
after(async()=>{await Promise.all([...pools].map(p=>p.end()));await db?.close();if(dir)rmSync(dir,{recursive:true,force:true});});
beforeEach(async()=>{
 await Promise.all([...pools].map(p=>p.end()));pools.clear();
 await db.owner.query('TRUNCATE unfarmd_journal.owners CASCADE');authority=auth();ring=keyring();
});
function pool(role='j222_app',overrides={}){
 const p=new Pool({host:'127.0.0.1',port,user:role,password,database:'postgres',max:4,connectionTimeoutMillis:800,query_timeout:2200,
  ssl:{ca,servername:'journal.synthetic.invalid',rejectUnauthorized:true},enableChannelBinding:true,...overrides});p.on('error',()=>{});pools.add(p);return p;
}
function repository(p=pool(),keys=ring.keys,clock=Date.now){return new PostgresJournalRepository(p,keys,authority.authority,clock);}
const cap=(owner=OWNER)=>authority.principal(owner);
async function first(repo=repository(),c=command()){const r=await repo.append(cap(),c);return {repo,c,r};}
const counts=async()=> (await db.owner.query('SELECT (SELECT count(*) FROM unfarmd_journal.events)::int AS events,(SELECT count(*) FROM unfarmd_journal.journals)::int AS journals,(SELECT coalesce(sum(lifetime_events),0)::int FROM unfarmd_journal.owners) AS charges')).rows[0];
test('fresh schema is isolated, no source schema modified, roles non-superuser/NOBYPASSRLS and app cannot DDL',async()=>{
 const roles=(await db.owner.query("SELECT rolname,rolsuper,rolbypassrls,rolcanlogin FROM pg_roles WHERE rolname LIKE 'unfarmd_journal_%'")).rows;assert.equal(roles.length,3);assert.ok(roles.every(r=>!r.rolsuper&&!r.rolbypassrls&&!r.rolcanlogin));
 assert.equal((await db.owner.query("SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='unfarmd_journal' AND c.relkind='r' AND c.relforcerowsecurity AND c.relrowsecurity")).rows[0].n,3);
 await assert.rejects(pool().query('CREATE TABLE unfarmd_journal.bad(id int)'),e=>e.code==='42501');
 assert.deepEqual(await counts(),{events:0,journals:0,charges:0});
});
test('native TLS verifies SNI/CA and SCRAM; wrong host, CA, password or plaintext cannot authenticate',async()=>{
 assert.equal((await pool().query('SELECT current_user')).rows[0].current_user,'j222_app');
 for(const override of [{ssl:{ca,servername:'wrong.synthetic.invalid',rejectUnauthorized:true}},{ssl:{servername:'journal.synthetic.invalid',rejectUnauthorized:true}},{password:'SYNTHETIC_WRONG'},{ssl:false}])await assert.rejects(pool('j222_app',override).query('SELECT 1'));
});
test('actual B append/replay persisted encrypted, exact original preserved across revision and counter-evidence',async()=>{
 const {repo,c,r}=await first();assert.equal(r.receipt.revision,1);
 const next=await repo.append(cap(),{...c,requestId:randomUUID(),expectedHead:r.receipt.storageHead,change:revised()});
 await repo.append(cap(),{...c,requestId:randomUUID(),expectedHead:next.receipt.storageHead,change:updated()});
 const read=await repo.read(cap(),c.journalId,MINT);assert.equal(read.events.length,3);assert.deepEqual(read.events[0].change,c.change);assert.equal(read.events[1].supersedes,read.events[0].hash);assert.equal(read.events[2].supersedes,null);
 assert.equal(read.authentication,'verified_owner_session');assert.equal(read.factReferences,'references_only_not_verified_evidence');
 assert.deepEqual(await counts(),{events:3,journals:1,charges:3});
 const stored=JSON.stringify((await db.owner.query('TABLE unfarmd_journal.events')).rows);assert.doesNotMatch(stored,/SYNTHETIC ONLY|hypothesis|counter-evidence|unfarmd-intelligence/);
});
test('same mint/journal UUID under different verified owners never shares rows, keys or notes',async()=>{
 const {repo,c}=await first();await assert.rejects(repo.read(cap(INTRUDER),c.journalId,MINT),e=>e.code==='not_available');assert.deepEqual(await repo.list(cap(INTRUDER)),[]);
 await repo.append(cap(INTRUDER),{...c,requestId:randomUUID(),change:created('SYNTHETIC ONLY unrelated owner')});
 assert.equal((await repo.read(cap(),c.journalId,MINT)).events[0].change.content.thesis,c.change.content.thesis);
 assert.equal((await repo.read(cap(INTRUDER),c.journalId,MINT)).events[0].change.content.thesis,'SYNTHETIC ONLY unrelated owner');
});
test('missing transaction owner sees no rows; RLS independently prevents an omitted owner predicate',async()=>{
 const {c}=await first(),p=pool();assert.deepEqual((await p.query('TABLE unfarmd_journal.events')).rows,[]);
 const client=await p.connect();try{await client.query('BEGIN');await client.query("SELECT set_config('unfarmd.owner_id',$1,true)",[INTRUDER]);assert.deepEqual((await client.query('TABLE unfarmd_journal.events')).rows,[]);await assert.rejects(client.query('SELECT * FROM unfarmd_journal.lock_journal($1,$2,$3)',[OWNER,c.journalId,MINT]),e=>e.message==='journal_invalid');await client.query('ROLLBACK');}finally{client.release();}
});
test('twelve independent TLS connections race same CAS: exactly one append, contiguous durable revision and charge',async()=>{
 const {c,r}=await first();const answers=await Promise.allSettled(Array.from({length:12},()=>repository().append(cap(),{...c,expectedHead:r.receipt.storageHead,requestId:randomUUID(),change:updated()})));
 assert.equal(answers.filter(r=>r.status==='fulfilled').length,1);assert.ok(answers.filter(r=>r.status==='rejected').every(r=>r.reason.code==='conflict'));assert.deepEqual(await counts(),{events:2,journals:1,charges:2});
});
test('eight concurrent identical idempotency keys produce one encrypted event and stable receipt',async()=>{
 const c=command(),replies=await Promise.all(Array.from({length:8},()=>repository().append(cap(),c)));
 assert.equal(new Set(replies.map(r=>r.receipt.storageHead)).size,1);assert.equal(replies.filter(r=>!r.replayed).length,1);assert.deepEqual(await counts(),{events:1,journals:1,charges:1});
});
test('idempotency collision on different content or journal fails without partial new journal/quota',async()=>{
 const {repo,c}=await first();await assert.rejects(repo.append(cap(),{...c,change:created('SYNTHETIC ONLY conflicting text')}),e=>e.code==='conflict');
 await assert.rejects(repo.append(cap(),{...c,journalId:randomUUID()}),e=>e.code==='conflict');assert.deepEqual(await counts(),{events:1,journals:1,charges:1});
});
test('invalid B change, first event update, XSS/control text, oversized note and wrong exact mint roll back atomically',async()=>{
 const repo=repository();for(const change of [updated(),created('x'.repeat(2001)),created('SYNTHETIC\u0000CONTROL'),{...created(),content:{thesis:'SYNTHETIC',invalidation:null,contradictions:null,extra:true}}])await assert.rejects(repo.append(cap(),command({change})));
 const {c}=await first(repo);await assert.rejects(repo.read(cap(),c.journalId,OTHER),e=>e.code==='not_available');await assert.rejects(repo.append(cap(),{...c,mint:OTHER}),e=>e.code==='conflict');assert.deepEqual(await counts(),{events:1,journals:1,charges:1});
});
test('DB failure after append but before commit rolls back event, head and lifetime charges',async()=>{
 const p=pool(),wrapped={async connect(){const c=await p.connect();return {query:async(...args)=>{if(args[0]==='COMMIT')throw Error('SYNTHETIC_SQL_PRIVATE_DETAIL');return c.query(...args);},release:x=>c.release(x)};}};
 await assert.rejects(repository(wrapped).append(cap(),command()),e=>e.message==='private_journal_unavailable');assert.deepEqual(await counts(),{events:0,journals:0,charges:0});
});
test('lost commit reply is uncertain, never auto-retried; explicit same-key recovery cannot duplicate',async()=>{
 const p=pool();let commits=0;const wrapped={async connect(){const c=await p.connect();return {query:async(...args)=>{const r=await c.query(...args);if(args[0]==='COMMIT'){commits++;throw Error('SYNTHETIC_LOST_REPLY');}return r;},release:x=>c.release(x)};}};
 const c=command();await assert.rejects(repository(wrapped).append(cap(),c),e=>e.code==='unavailable');assert.equal(commits,1);assert.deepEqual(await counts(),{events:1,journals:1,charges:1});assert.equal((await repository().append(cap(),c)).replayed,true);
});
test('principal expiry during key access cannot commit a persistent event',async()=>{
 const principal=cap();let now=Date.now(),calls=0;const keys=async(...args)=>{calls++;const key=await ring.keys(...args);now+=300001;return key;};await assert.rejects(repository(pool(),keys,()=>now).append(principal,command()),e=>e.code==='unauthenticated');assert.equal(calls,1);assert.deepEqual(await counts(),{events:0,journals:0,charges:0});
});
test('missing key/secret error never prints plaintext, SQL, token or credential details',async()=>{
 const keys=async()=>{throw Error('SYNTHETIC_KEY_AND_PASSWORD_DO_NOT_LOG');};await assert.rejects(repository(pool(),keys).append(cap(),command()),e=>e.message==='private_journal_unavailable');assert.deepEqual(await counts(),{events:0,journals:0,charges:0});
});
test('hanging key resolver is bounded and cannot leave a committed empty journal or charge',async()=>{
 await assert.rejects(repository(pool(),()=>new Promise(()=>{})).append(cap(),command()),e=>e.code==='unavailable');assert.deepEqual(await counts(),{events:0,journals:0,charges:0});
});
test('real owner-lock timeout fails closed, without retry, event or counter reset',async()=>{
 const {c,r}=await first(),block=await db.owner.connect();try{
  await block.query('BEGIN');await block.query('SELECT * FROM unfarmd_journal.owners FOR UPDATE');
  await assert.rejects(repository().append(cap(),{...c,expectedHead:r.receipt.storageHead,requestId:randomUUID(),change:updated()}),e=>e.code==='unavailable');
 }finally{await block.query('ROLLBACK');block.release();}assert.deepEqual(await counts(),{events:1,journals:1,charges:1});
});
test('bit flip or ciphertext transplant fails integrity, even after administrator recomputes outer storage hash',async()=>{
 const {repo,c,r}=await first();const row=(await db.owner.query('TABLE unfarmd_journal.events')).rows[0],body=JSON.parse(row.payload);body.tag=randomBytes(16).toString('base64url');const text=JSON.stringify(body);
 await db.owner.query("UPDATE unfarmd_journal.events SET payload=$1,head=encode(sha256(convert_to($1,'UTF8')),'hex')",[text]);await db.owner.query('UPDATE unfarmd_journal.journals SET head=(SELECT head FROM unfarmd_journal.events LIMIT 1)');
 await assert.rejects(repo.read(cap(),c.journalId,MINT),e=>e.code==='integrity');assert.equal(r.receipt.revision,1);
});
test('truncation/reordered storage rows fail chain checks; external trusted anchor detects valid-prefix rollback',async()=>{
 const {repo,c,r}=await first(),n=await repo.append(cap(),{...c,expectedHead:r.receipt.storageHead,requestId:randomUUID(),change:revised()});
 const last=(await repo.read(cap(),c.journalId,MINT)).events.at(-1);
 await db.owner.query('DELETE FROM unfarmd_journal.events WHERE sequence=2');await assert.rejects(repo.read(cap(),c.journalId,MINT),e=>e.code==='integrity');
 await db.owner.query('UPDATE unfarmd_journal.journals SET revision=1,head=$1',[r.receipt.storageHead]);
 assert.equal((await repo.read(cap(),c.journalId,MINT)).events.length,1); // No dishonest rollback-attestation claim without external anchor.
 await assert.rejects(repo.read(cap(),c.journalId,MINT,{length:2,head:last.hash}),e=>e.code==='integrity');assert.equal(n.receipt.revision,2);
});
test('versioned per-owner key rotation appends new ciphertext without overwriting old envelopes',async()=>{
 const {repo,c,r}=await first(),original=(await db.owner.query('SELECT payload FROM unfarmd_journal.events')).rows[0].payload;ring.rotate();await repo.append(cap(),{...c,expectedHead:r.receipt.storageHead,requestId:randomUUID(),change:revised()});
 const rows=(await db.owner.query('SELECT payload FROM unfarmd_journal.events ORDER BY sequence')).rows;assert.equal(rows[0].payload,original);assert.equal(JSON.parse(rows[1].payload).keyId,'ephemeral-v2');assert.equal((await repo.read(cap(),c.journalId,MINT)).events.length,2);
});
test('deletion appends terminal request and atomically revokes all reads/append/list; no deleted claim',async()=>{
 const {repo,c,r}=await first();const d=await repo.append(cap(),{...c,requestId:randomUUID(),expectedHead:r.receipt.storageHead,change:{kind:'deletion_requested',content:{reason:'SYNTHETIC ONLY erase request'},fact_snapshot_refs:[]}});
 assert.equal(d.state,'access_revoked_erasure_queued');assert.equal(d.receipt.revision,2);assert.deepEqual(await repo.list(cap()),[]);await assert.rejects(repo.read(cap(),c.journalId,MINT),e=>e.code==='not_available');await assert.rejects(repo.append(cap(),{...c,expectedHead:d.receipt.storageHead,requestId:randomUUID(),change:updated()}),e=>e.code==='not_available');assert.equal((await counts()).events,2);
 const metadata=(await db.owner.query('SELECT revoked_at,erase_after FROM unfarmd_journal.journals')).rows[0];assert.ok(metadata.erase_after-metadata.revoked_at>=86400000);
});
test('redaction request conservatively revokes entire journal pending erasure; does not rewrite originals',async()=>{
 const {repo,c,r}=await first();const d=await repo.append(cap(),{...c,requestId:randomUUID(),expectedHead:r.receipt.storageHead,change:{kind:'redaction_requested',content:{targets:[r.receipt.eventHash],reason:'SYNTHETIC ONLY privacy request'},fact_snapshot_refs:[]}});
 assert.equal(d.state,'access_revoked_erasure_queued');await assert.rejects(repo.read(cap(),c.journalId,MINT),e=>e.code==='not_available');assert.equal((await counts()).events,2);
});
test('privacy request racing an update has one CAS winner and never falsely acknowledges a failed revoke',async()=>{
 const {repo,c,r}=await first(),base={...c,expectedHead:r.receipt.storageHead};
 const replies=await Promise.allSettled([
  repository().append(cap(),{...base,requestId:randomUUID(),change:updated()}),
  repository().append(cap(),{...base,requestId:randomUUID(),change:{kind:'deletion_requested',content:{reason:'SYNTHETIC ONLY'},fact_snapshot_refs:[]}})
 ]);assert.equal(replies.filter(r=>r.status==='fulfilled').length,1);assert.deepEqual(await counts(),{events:2,journals:1,charges:2});
 if(replies[1].status==='fulfilled')await assert.rejects(repo.read(cap(),c.journalId,MINT),e=>e.code==='not_available');
 else assert.equal((await repo.read(cap(),c.journalId,MINT)).events.length,2);
});
test('existing mint-runtime identity receives no journal privileges or function execution',async()=>{
 await assert.rejects(db.pool().query('SELECT unfarmd_journal.purge(1)'),e=>e.code==='42501');
 await assert.rejects(db.pool().query('SELECT * FROM unfarmd_journal.journals'),e=>e.code==='42501');
});
test('writer cannot purge, overwrite, delete events, mutate heads or reset owner counters',async()=>{
 await first();const p=pool();for(const sql of ['DELETE FROM unfarmd_journal.events','UPDATE unfarmd_journal.events SET payload=payload','UPDATE unfarmd_journal.journals SET head=NULL','UPDATE unfarmd_journal.owners SET lifetime_events=0','SELECT unfarmd_journal.purge(20)'])await assert.rejects(p.query(sql),e=>e.code==='42501');
 assert.deepEqual(await counts(),{events:1,journals:1,charges:1});
});
test('erasure capability cannot append, reset counters or delete active data, including direct SQL',async()=>{
 const {c}=await first(),p=pool('j222_erase');assert.equal((await p.query('SELECT unfarmd_journal.purge(20) AS n')).rows[0].n,0);assert.equal((await p.query('DELETE FROM unfarmd_journal.journals RETURNING journal_id')).rows.length,0);
 for(const sql of ['DELETE FROM unfarmd_journal.events','UPDATE unfarmd_journal.owners SET lifetime_events=0'])await assert.rejects(p.query(sql),e=>e.code==='42501');
 await assert.rejects(p.query('SELECT unfarmd_journal.lock_journal($1,$2,$3)',[OWNER,c.journalId,MINT]),e=>e.code==='42501');assert.equal((await counts()).events,1);
});
test('expired data hidden before purge; bounded erasure cascades rows and preserves lifetime quotas',async()=>{
 const {repo,c}=await first();await db.owner.query("UPDATE unfarmd_journal.journals SET created_at=clock_timestamp()-interval '31 days',expires_at=clock_timestamp()-interval '1 day'");await assert.rejects(repo.read(cap(),c.journalId,MINT),e=>e.code==='not_available');assert.equal((await counts()).events,1);
 const p=pool('j222_erase');assert.equal((await p.query('SELECT unfarmd_journal.purge(1) AS n')).rows[0].n,1);assert.deepEqual(await counts(),{events:0,journals:0,charges:1});
 for(const n of [0,21,null])await assert.rejects(p.query('SELECT unfarmd_journal.purge($1)',[n]),e=>e.message==='journal_invalid');
});
test('erasure after outage is bounded and does not resurrect revoked data or reset quotas',async()=>{
 const {repo,c,r}=await first();await repo.append(cap(),{...c,requestId:randomUUID(),expectedHead:r.receipt.storageHead,change:{kind:'deletion_requested',content:{reason:'SYNTHETIC ONLY'},fact_snapshot_refs:[]}});
 await db.owner.query("UPDATE unfarmd_journal.journals SET revoked_at=clock_timestamp()-interval '25 hours',erase_after=clock_timestamp()-interval '1 hour'");
 await Promise.all([...pools].map(p=>p.end()));pools.clear();await db.crashRestart();
 assert.equal((await pool('j222_erase').query('SELECT unfarmd_journal.purge(20) AS n')).rows[0].n,1);assert.deepEqual(await counts(),{events:0,journals:0,charges:2});
});
test('owner lifetime event limit fails atomically without refund; no read-limit bypass',async()=>{
 const {repo,c,r}=await first();await db.owner.query('UPDATE unfarmd_journal.owners SET lifetime_events=2048');await assert.rejects(repo.append(cap(),{...c,requestId:randomUUID(),expectedHead:r.receipt.storageHead,change:updated()}),e=>e.code==='limit');assert.deepEqual(await counts(),{events:1,journals:1,charges:2048});for(const n of [0,21,1000000,NaN])await assert.rejects(repo.list(cap(),n),e=>e.code==='invalid_request');
});
test('journal count limit and terminal 64th revision are enforced durably, no partial charge',async()=>{
 const {repo,c,r}=await first();let head=r.receipt.storageHead;
 for(let i=1;i<64;i++)head=(await repo.append(cap(),{...c,requestId:randomUUID(),expectedHead:head,change:updated()})).receipt.storageHead;
 await assert.rejects(repo.append(cap(),{...c,requestId:randomUUID(),expectedHead:head,change:updated()}));assert.equal((await counts()).events,64);
 await db.owner.query('UPDATE unfarmd_journal.owners SET journals=32');await assert.rejects(repo.append(cap(),command()),e=>e.code==='limit');assert.equal((await counts()).journals,1);
});
test('committed history survives actual immediate PostgreSQL restart and new repository instance',async()=>{
 const {c,r}=await first();await Promise.all([...pools].map(p=>p.end()));pools.clear();await db.crashRestart();const read=await repository().read(cap(),c.journalId,MINT);assert.equal(read.receipt.storageHead,r.receipt.storageHead);assert.deepEqual(read.events[0].change,c.change);assert.deepEqual(await counts(),{events:1,journals:1,charges:1});
});
test('outage is categorical and produces no fallback/in-memory persistence or automatic retry',async()=>{
 const {c}=await first();await Promise.all([...pools].map(p=>p.end()));pools.clear();await db.outage();try{await assert.rejects(repository().read(cap(),c.journalId,MINT),e=>e.message==='private_journal_unavailable');}finally{await Promise.all([...pools].map(p=>p.end()));pools.clear();await db.restore();}assert.equal((await counts()).events,1);
});
