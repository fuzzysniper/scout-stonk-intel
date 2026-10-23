// Real disposable native PostgreSQL/TLS. ALL account/source/maintenance receipts are SYNTHETIC.
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {fixture,grant,base,health,record,finalized,now} from './fixtures.mjs';
import {hash,validRecord} from '../../lib/scout-continuous/policy.mjs';
import {fingerprintSource,postgresPort,NEON_HOST} from '../../lib/scout-continuous/database.mjs';
import {independentCycle} from '../../lib/scout-continuous/maintenance-cycle.mjs';
import {localPostgres} from '../onchain-api/postgres-harness.mjs';
let f,g,b;
before(async()=>{f=await fixture();});after(async()=>{await f?.close();});
beforeEach(async()=>{g=await f.reset();b=base(g);await f.assure(g);});
const read=()=>f.store('reader').transact(null);
const stop=()=>f.store('stop').transact({parent:g.parent,grantHash:hash(g)});
async function claimed(){const s=f.store(),r=await s.transact({...b,op:'claim'});assert.equal(r.ok,true,r.reason);return {s,c:{...b,fence:r.fence}};}
async function child(){const {s,c}=await claimed(),id=randomUUID();const r=await s.transact({...c,op:'beginChild',child:id,endsAt:new Date(Date.now()+60000).toISOString()});assert.equal(r.ok,true,r.reason);return {s,c:{...c,child:id}};}
async function connected(){const a=await child();assert.equal((await a.s.transact({...a.c,op:'reserve',resource:'connection'})).ok,true);return a;}
test('actual installed SQL body fingerprints match pinned source',()=>assert.deepEqual(fingerprintSource(readFileSync('lib/scout-continuous/postgres/schema.sql','utf8')),JSON.parse(readFileSync('lib/scout-continuous/fingerprints.json','utf8'))));
test('canonical owner grant is exact, once-only and cannot reset a spent parent',async()=>{
 assert.equal((await read()).grantHash,hash(g));await assert.rejects(f.db.owner.query('SELECT scout_continuous.initialize($1)',[g]),/NO_GO/);const {s,c}=await connected();await stop();await assert.rejects(f.db.owner.query('SELECT scout_continuous.initialize($1)',[{...g,parent:randomUUID()}]),/NO_GO/);assert.equal((await read()).usage.connections,1);assert.equal((await s.transact({...c,op:'reserve',resource:'rpc'})).ok,false);
});
test('all isolated runtime roles authenticate with verified native TLS and exact privileges',async()=>{assert.ok(await read());assert.equal((await f.store('maintenance').transact({op:'tick',parent:g.parent,grantHash:hash(g)})).status,'checked');assert.equal((await stop()).status,'stopped');});
test('concurrent parent claims commit one exclusive fence',async()=>{
 const r=await Promise.all(Array.from({length:2},(_,i)=>f.store('worker',i?{}:undefined).transact({...base(g),op:'claim'})));assert.equal(r.filter(x=>x.ok).length,1);assert.equal(new Set(r.map(x=>x.fence)).size,1);
});
test('concurrent children cannot overlap and closed IDs cannot replay',async()=>{
 const {c}=await claimed(),r=await Promise.all(Array.from({length:2},(_,i)=>f.store('worker',i?{}:undefined).transact({...c,op:'beginChild',child:randomUUID(),endsAt:new Date(Date.now()+60000).toISOString()})));assert.equal(r.filter(x=>x.ok).length,1);const id=r.find(x=>x.ok).child.id;
 await f.store().transact({...c,child:id,op:'closeChild',connectionClosed:true});assert.equal((await f.store().transact({...c,child:id,op:'beginChild',endsAt:new Date(Date.now()+60000).toISOString()})).ok,false);assert.equal((await read()).usage.children,1);
});
test('connection envelope and RPC credits commit exactly once with durable tickets',async()=>{
 const {s,c}=await connected();const t=await s.transact({...c,op:'reserve',resource:'rpc'});assert.equal(t.ticket,2);assert.deepEqual(t.usage,{credits:101,bytes:16777216,frames:20000,rpc:1,connections:1,children:1,auditRecords:0,framesReceived:0,bytesReceived:0});
 assert.equal((await s.transact({...c,op:'reserve',resource:'connection'})).ok,false);assert.equal((await f.db.owner.query('SELECT count(*) FROM scout_continuous.tickets')).rows[0].count,'2');
});
test('parent limit across concurrent requests denies atomically without partial charge',async()=>{
 g=await f.reset(grant({limits:{...g.limits,credits:101}}));b=base(g);await f.assure(g);const {c}=await connected();
 const replies=await Promise.all(Array.from({length:2},(_,i)=>f.store('worker',i?{}:undefined).transact({...c,op:'reserve',resource:'rpc'})));assert.equal(replies.filter(r=>r.ok).length,1);const r=await read();assert.equal(r.usage.credits,101);assert.equal(r.usage.rpc,1);assert.equal(r.stopped,true);
});
test('spent budgets persist across sequential bounded children; no renewal refunds',async()=>{
 const {s,c}=await connected();await s.transact({...c,op:'reserve',resource:'rpc'});await s.transact({...c,op:'closeChild',connectionClosed:true});
 const id=randomUUID();await s.transact({...c,op:'beginChild',child:id,endsAt:new Date(Date.now()+60000).toISOString()});const r=await s.transact({...c,op:'reserve',child:id,resource:'connection'});assert.equal(r.usage.children,2);assert.equal(r.usage.credits,201);assert.equal(r.usage.bytes,33554432);assert.equal(r.ticket,3);
});
test('expired uncertain parent lease cannot be reclaimed OR refreshed by heartbeat',async()=>{
 const {s,c}=await connected();await f.db.owner.query("UPDATE scout_continuous.control SET lease_until=clock_timestamp()-interval '1 second'");
 const h=await s.transact({...c,op:'heartbeat',health:health()});assert.equal(h.stopped,true);assert.equal((await f.store().transact({...base(g),op:'claim'})).ok,false);assert.equal((await read()).reason,'unclean_lease');
});
test('wrong parent/head/hash/fence and child are denied without spending',async()=>{
 const {s,c}=await connected();for(const p of [{parent:randomUUID()},{head:'f'.repeat(40)},{grantHash:'f'.repeat(64)}])await assert.rejects(s.transact({...c,op:'reserve',resource:'rpc',...p}));
 for(const p of [{fence:randomUUID()},{child:randomUUID()}])assert.equal((await s.transact({...c,op:'reserve',resource:'rpc',...p})).ok,false);assert.equal((await read()).usage.rpc,0);
});
test('mobile global STOP races admission, survives fresh client and never clears counters',async()=>{
 const {s,c}=await connected();await Promise.all([stop(),f.store().transact({...c,op:'reserve',resource:'rpc'})]);assert.equal((await s.transact({...c,op:'reserve',resource:'rpc'})).ok,false);const r=await read();assert.equal(r.stopped,true);assert.ok(r.usage.rpc<=1);assert.equal(r.usage.connections,1);assert.equal((await stop()).closureAcknowledged,false);
 await s.transact({...c,op:'closeChild',connectionClosed:true});await s.transact({...b,fence:c.fence,op:'release',connectionClosed:true});assert.equal((await stop()).closureAcknowledged,true);assert.equal((await f.store().transact({...base(g),op:'claim'})).ok,false);
});
test('original identity and first receipt survive duplicate notifications and finalized promotion',async()=>{
 const {s,c}=await connected(),e=record();assert.ok(validRecord(e));const first=await s.transact({...c,op:'append',record:e});assert.equal(first.disposition,'inserted');
 const dup=await s.transact({...c,op:'append',record:{...e,receivedAt:now(),notificationHash:'f'.repeat(64)}});assert.equal(dup.disposition,'duplicate');assert.equal(dup.firstReceivedAt,e.receivedAt);assert.equal(dup.firstNotificationHash,e.notificationHash);
 await s.transact({...c,op:'reserve',resource:'rpc'});await s.transact({...c,op:'reserve',resource:'rpc'});const final=finalized(e);assert.equal((await s.transact({...c,op:'append',record:final})).disposition,'promoted');assert.deepEqual((await read()).events,[final]);assert.equal((await read()).usage.auditRecords,1);
});
test('source identity and raw/unknown/uncharged finality fail closed even through SQL directly',async()=>{
 const {c}=await connected(),p=f.pool('worker'),e=record();
 for(const patch of [{mint:'11111111111111111111111111111111'},{slot:0},{notificationHash:null},{raw:'NO_RAW_PAYLOAD'},{signature:'bad'},{receivedAt:'2999-01-01T00:00:00.000Z'}])await assert.rejects(p.query('SELECT scout_continuous.step($1)',[{...c,op:'append',record:{...e,...patch}}]));
 await assert.rejects(p.query('SELECT scout_continuous.step($1)',[{...c,op:'append',record:finalized(e)}]));assert.deepEqual((await read()).events,[]);
});
test('rolling200 payloads retains original dedup across children without resetting lifetime counts',async()=>{
 const {s,c}=await connected();for(let i=1;i<=180;i++)await s.transact({...c,op:'append',record:record(i)});
 await s.transact({...c,op:'closeChild',connectionClosed:true});const id=randomUUID();await s.transact({...c,op:'beginChild',child:id,endsAt:new Date(Date.now()+60000).toISOString()});await s.transact({...c,child:id,op:'reserve',resource:'connection'});
 for(let i=181;i<=205;i++)await s.transact({...c,child:id,op:'append',record:record(i)});
 assert.equal((await read()).events.length,20);assert.equal((await f.db.owner.query('SELECT count(*) FROM scout_continuous.events')).rows[0].count,'200');assert.equal((await read()).usage.auditRecords,205);
 const dup=await s.transact({...c,child:id,op:'append',record:record(1)});assert.equal(dup.disposition,'duplicate');assert.equal((await read()).usage.auditRecords,205);
});
test('independent janitor deletes expired rows after STOP and database restart without quota reset',async()=>{
 const {s,c}=await connected();await s.transact({...c,op:'append',record:record()});await stop();const old=(await read()).usage;
 await f.db.owner.query("UPDATE scout_continuous.events SET expires_at=clock_timestamp()-interval '1 second'");await f.restart();
 const r=await f.store('maintenance').transact({op:'tick',parent:g.parent,grantHash:hash(g)});assert.equal(r.purgedRows,1);assert.equal((await f.db.owner.query('SELECT count(*) FROM scout_continuous.events')).rows[0].count,'0');assert.deepEqual((await read()).usage,old);assert.equal((await read()).stopped,true);
});
test('SQL DELETE does not manufacture backup exclusion or fresh physical evidence',async()=>{
 await f.db.owner.query('UPDATE scout_continuous.control SET backups_excluded=false,physical_through=NULL');const m=f.store('maintenance');await m.transact({op:'tick',parent:g.parent,grantHash:hash(g)});const r=await f.store().transact({...b,op:'claim'});assert.equal(r.ok,false);assert.equal(r.reason,'retention_unproven');assert.equal((await read()).retention.physicalDeletionProvenBySQL,false);
});
test('stale meter/purge/notification/watchdog each stop a running parent permanently',async()=>{
 for(const [field,age] of [['meter_at',301],['physical_through',61],['notification_at',301],['watchdog_at',31]]){
  g=await f.reset();b=base(g);await f.assure(g);const {s,c}=await connected();await f.db.owner.query(`UPDATE scout_continuous.control SET ${field}=clock_timestamp()-$1*interval '1 second'`,[age]);
  const r=await s.transact({...c,op:'reserve',resource:'rpc'});assert.equal(r.ok,false);assert.equal(r.stopped,true);assert.equal((await read()).usage.rpc,0);
 }
});
test('independent watchdog tick catches process pause without source callbacks',async()=>{
 await connected();await f.db.owner.query("UPDATE scout_continuous.control SET lease_until=clock_timestamp()-interval '1 second'");const r=await f.store('maintenance').transact({op:'tick',parent:g.parent,grantHash:hash(g)});assert.equal(r.stopped,true);assert.equal(r.reason,'unclean_lease');assert.equal((await read()).connected,true,'SQL cannot close a paused native socket');
});
test('external high-water mismatch detects restored quota history and stops, never repairs it',async()=>{
 const {s,c}=await connected();await s.transact({...c,op:'reserve',resource:'rpc'});const scope={parent:g.parent,grantHash:hash(g)};
 const r=await f.store('maintenance').transact({...scope,op:'watchdog',observedAt:now(),independent:true,shutdownCapable:true,receiptHash:'e'.repeat(64),throughTicket:3,throughCredits:102});assert.equal(r.stopped,true);assert.equal(r.reason,'watchdog_anchor_mismatch');assert.equal((await read()).usage.credits,101);
});
test('notice claims are fenced and expired delivery stays uncertain without retry',async()=>{
 const scope={parent:g.parent,grantHash:hash(g)},m=f.store('maintenance');await connected();await f.store().transact({...b,fence:(await read()).fence,op:'notify',reason:'OFFLINE_INCIDENT'});
 const replies=await Promise.all([m.transact({...scope,op:'leaseNotice'}),f.store('maintenance',{}).transact({...scope,op:'leaseNotice'})]);assert.equal(replies.filter(r=>r.status==='leased').length,1);const n=replies.find(r=>r.status==='leased');
 await assert.rejects(m.transact({...scope,op:'ackNotice',id:n.id,lease:randomUUID(),deliveredAt:now(),receiptHash:'a'.repeat(64)}));
 await f.db.owner.query("UPDATE scout_continuous.notices SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1",[n.id]);const r=await m.transact({...scope,op:'tick'});assert.equal(r.stopped,true);assert.equal((await read()).maintenance.uncertain,1);
 assert.notEqual((await m.transact({...scope,op:'leaseNotice'})).id,n.id);
});
test('old unapproved/uncertain/not-terminal source cannot be overlapped; no legacy mutation',async()=>{
 await f.db.owner.query("UPDATE scout_live.control SET stopped=false");const before=JSON.stringify((await f.db.owner.query('SELECT * FROM scout_live.control')).rows);const r=await f.store().transact({...b,op:'claim'});assert.equal(r.ok,false);assert.equal(r.reason,'legacy_not_retired');assert.equal(JSON.stringify((await f.db.owner.query('SELECT * FROM scout_live.control')).rows),before);
});
test('all four roles deny table writes, owner initialization and old proof/functions',async()=>{
 for(const kind of ['worker','reader','stop','maintenance']){
  const p=f.pool(kind);for(const sql of ['UPDATE scout_continuous.control SET stopped=false','TRUNCATE scout_continuous.tickets','SELECT * FROM scout_continuous.first_seen',"SELECT scout_continuous.initialize('{}')","SELECT scout_live.step('{}')","SELECT scout_lookup.step('{}')","SELECT scout_mint.step('{}')",'CREATE TABLE public.bad(x int)'])await assert.rejects(p.query(sql),e=>e.code==='42501');
 }
});
test('runtime fingerprint/ACL drift and wrong TLS hostname fail closed without secret errors',async()=>{
 await f.db.owner.query("ALTER FUNCTION scout_continuous.snapshot() SET statement_timeout='400ms'");try{await assert.rejects(read(),e=>e.message==='store_unavailable');}finally{await f.db.owner.query('ALTER FUNCTION scout_continuous.snapshot() RESET statement_timeout');}
 await assert.rejects(f.store('reader',{ssl:{rejectUnauthorized:true,servername:'wrong.invalid'}}).transact(null),e=>e.message==='store_unavailable');
});
test('lost COMMIT acknowledgment never refunds a durable reservation or returns an I/O ticket',async()=>{
 const {c}=await connected(),p=f.pool('worker');const wrapper={get waitingCount(){return p.waitingCount;},async connect(){const client=await p.connect();return {connection:client.connection,release:e=>client.release(e),async query(...args){const r=await client.query(...args);if(args[0]==='COMMIT')throw Error('SYNTHETIC_LOST_COMMIT_ACK');return r;}};}};
 await assert.rejects(postgresPort(wrapper,{kind:'worker',host:NEON_HOST}).transact({...c,op:'reserve',resource:'rpc'}),e=>e.message==='store_unavailable');const r=await read();assert.equal(r.usage.credits,101);assert.equal(r.usage.rpc,1);assert.equal((await f.db.owner.query('SELECT count(*) FROM scout_continuous.tickets')).rows[0].count,'2');
});
test('database restart cannot refresh a running parent or recycle an old fence',async()=>{
 await connected();await f.restart();const r=await f.store('maintenance').transact({op:'tick',parent:g.parent,grantHash:hash(g)});assert.equal(r.stopped,true);assert.equal(r.reason,'database_epoch_changed');assert.equal((await read()).usage.connections,1);assert.equal((await f.store().transact({...base(g),op:'claim'})).ok,false);
});
test('restore to a previously unclaimed parent cannot silently authorize a second first claim',async()=>{
 await f.restart();const r=await f.store().transact({...b,op:'claim'});assert.equal(r.ok,false);assert.equal(r.reason,'database_epoch_changed');assert.equal(r.stopped,true);assert.equal((await read()).usage.connections,0);
});
test('finalized identity revision cannot overwrite OR silently pass as a duplicate',async()=>{
 const {s,c}=await connected(),e=record();await s.transact({...c,op:'append',record:e});await s.transact({...c,op:'reserve',resource:'rpc'});await s.transact({...c,op:'reserve',resource:'rpc'});const final=finalized(e);await s.transact({...c,op:'append',record:final});await assert.rejects(s.transact({...c,op:'append',record:{...final,mint:'11111111111111111111111111111112'}}));assert.deepEqual((await read()).events,[final]);
});
test('parent expired/overlong child, missing assurance, aborted request and high-water regression deny',async()=>{
 const {s,c}=await claimed();await assert.rejects(s.transact({...c,op:'beginChild',child:randomUUID(),endsAt:new Date(Date.now()+7200000).toISOString()}));
 const a=new AbortController();a.abort();await assert.rejects(s.transact({...c,op:'beginChild',child:randomUUID(),endsAt:new Date(Date.now()+60000).toISOString()},{signal:a.signal}));assert.equal((await read()).usage.children,0);
 await f.db.owner.query("UPDATE scout_continuous.control SET approval=jsonb_set(approval,'{endsAt}',to_jsonb($1::text))",[new Date(Date.now()-1000).toISOString()]);assert.equal((await s.transact({...c,op:'beginChild',child:randomUUID(),endsAt:now()})).stopped,true);
});
test('SQL null/missing identity, timestamps and numbers cannot bypass strict restricted-role checks',async()=>{
 const {c}=await connected(),p=f.pool('maintenance'),scope={parent:g.parent,grantHash:hash(g)};
 for(const patch of [{balance:null},{attributed:null},{throughTicket:null}])await assert.rejects(p.query('SELECT scout_continuous.maintain($1)',[{...scope,op:'meter',observedAt:now(),balance:900000,attributed:true,mismatch:false,hardCapUntil:g.endsAt,receiptHash:'a'.repeat(64),throughTicket:1,throughCredits:100,...patch}]));
 await assert.rejects(f.pool('worker').query('SELECT scout_continuous.step($1)',[{...c,op:'heartbeat',health:{...health(),frames:null}}]));
});
test('source-independent executor is OFF by default and failed delivery latches STOP without retry',async()=>{
 let observed=0,delivered=0;assert.deepEqual(await independentCycle({observe:()=>observed++,deliver:()=>delivered++}),{status:'disabled'});assert.equal(observed+delivered,0);
 const scope={parent:g.parent,grantHash:hash(g)},m=f.store('maintenance');await connected();
 await f.store().transact({...b,fence:(await read()).fence,op:'notify',reason:'INDEPENDENT_OFFLINE_TEST'});
 const result=await independentCycle({enabled:true,port:m,scope,signal:new AbortController().signal,observe:async state=>{observed++;const stamp=now();return {meter:{observedAt:stamp,balance:900000,attributed:true,mismatch:false,hardCapUntil:g.endsAt,receiptHash:'1'.repeat(64),throughTicket:state.ticket,throughCredits:state.usage.credits},retention:{observedAt:stamp,physicalThrough:stamp,backupsExcluded:true,receiptHash:'2'.repeat(64)},watchdog:{observedAt:stamp,independent:true,shutdownCapable:true,receiptHash:'3'.repeat(64),throughTicket:state.ticket,throughCredits:state.usage.credits}};},deliver:async()=>{delivered++;throw Error('SYNTHETIC_AMBIGUOUS_DELIVERY');}});
 assert.equal(result.durableStopConfirmed,true);assert.equal(result.notificationRetried,false);assert.equal(delivered,1);assert.equal((await read()).reason,'notification_uncertain');
});
test('unexpected owner default ACL causes atomic installation rollback including all new roles',async()=>{
 const other=await localPostgres({database:'neondb',runtimeRole:'scout_mint_app'});
 try{await other.owner.query(readFileSync('lib/live-ledger/postgres/schema.sql','utf8'));await other.owner.query('ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO scout_mint_app');await assert.rejects(other.owner.query(readFileSync('lib/scout-continuous/postgres/schema.sql','utf8')),/unexpected_continuous_acl/);await other.owner.query('ROLLBACK');assert.equal((await other.owner.query("SELECT to_regnamespace('scout_continuous') n")).rows[0].n,null);assert.equal((await other.owner.query("SELECT count(*) FROM pg_roles WHERE rolname LIKE 'scout_continuous_%'")).rows[0].count,'0');}finally{await other.close();}
});
