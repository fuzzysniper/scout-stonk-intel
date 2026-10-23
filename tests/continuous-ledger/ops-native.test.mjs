// Actual LOCAL PostgreSQL/TLS and LOCAL HTTPS; external responses remain SYNTHETIC.
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fixture,base,record,now} from './fixtures.mjs';
import {hash} from '../../lib/scout-continuous/policy.mjs';
import {watchdogCycle} from '../../lib/scout-continuous/watchdog.mjs';
import {openJournal} from '../../lib/scout-continuous/ops-journal.mjs';
import {notificationChannel,boundedRequest} from '../../lib/scout-continuous/ops-transport.mjs';
let f,g,dir,server,ca,port,response;
before(async()=>{
 f=await fixture();dir=mkdtempSync(join(tmpdir(),'unfarmd-ops-native-'));const key=join(dir,'key'),cert=join(dir,'cert');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=api.telegram.org','-addext','subjectAltName=DNS:api.telegram.org','-keyout',key,'-out',cert],{stdio:'ignore'});ca=readFileSync(cert);
 server=https.createServer({key:readFileSync(key),cert:ca},(q,res)=>{q.resume();if(response==='timeout')return;res.writeHead(response.status,{'content-type':'application/json'});res.end(response.body);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port;
});
beforeEach(async()=>{g=await f.reset();await f.assure(g);});
after(async()=>{server?.closeAllConnections();if(server)await new Promise(r=>server.close(r));await f?.close();if(dir)rmSync(dir,{recursive:true,force:true});});
function args(){return {enabled:true,scope:{parent:g.parent,grantHash:hash(g)},port:f.store('maintenance'),journal:openJournal(join(dir,randomUUID()),{parent:g.parent,grantHash:hash(g)}),approval:{independent:true,mobileDeliveryHash:'a'.repeat(64),shutdownHash:'b'.repeat(64),endsAt:g.endsAt,maintenanceUntil:new Date(Date.parse(g.endsAt)+3600000).toISOString()},previousMeter:{throughTicket:0,throughCredits:0},notify:{async deliver(){return {status:'provider_accepted',deliveredAt:now(),receiptHash:'c'.repeat(64),deviceDeliveryProven:false};}},suspend:{async suspend(){return {status:'suspended',nativeSocketClosureProven:false};}}};}
async function connected(){const s=f.store(),b=base(g),r=await s.transact({...b,op:'claim'}),c={...b,fence:r.fence,child:randomUUID()};await s.transact({...c,op:'beginChild',endsAt:new Date(Date.now()+60000).toISOString()});await s.transact({...c,op:'reserve',resource:'connection'});return {s,c};}
test('actual janitor after STOP purges expired payload without resetting parent/tickets/usage',async()=>{
 const {s,c}=await connected();await s.transact({...c,op:'append',record:record()});await f.store('stop').transact({parent:g.parent,grantHash:hash(g)});await f.db.owner.query("UPDATE scout_continuous.events SET expires_at=clock_timestamp()-interval '1 second'");
 const r=await watchdogCycle(args());assert.equal(r.durableStopConfirmed,true);assert.equal(r.shutdown.status,'suspended');assert.equal((await f.db.owner.query('SELECT count(*) FROM scout_continuous.events')).rows[0].count,'0');const state=await f.store('reader').transact(null);assert.equal(state.usage.credits,100);assert.equal(state.stopped,true);assert.equal(state.connected,true,'no invented socket closure');
});
test('real independent tick detects source pause and leaves occupied fence/spend intact',async()=>{
 await connected();await f.db.owner.query("UPDATE scout_continuous.control SET lease_until=clock_timestamp()-interval '1 second'");const r=await watchdogCycle(args());assert.equal(r.durableStopConfirmed,true);const state=await f.store('reader').transact(null);assert.equal(state.reason,'unclean_lease');assert.equal(state.usage.connections,1);assert.ok(state.fence);
});
test('known PITR input cannot be reinterpreted as backup exclusion by new executor',async()=>{
 const r=await watchdogCycle({...args(),observations:{retention:{observedAt:now(),physicalThrough:now(),backupsExcluded:true,receiptHash:'d'.repeat(64)}}});assert.equal(r.durableStopConfirmed,true);assert.equal((await f.store('reader').transact(null)).reason,'retention_failed');
});
test('actual notification adapter acceptance commits fenced SQL receipt without rounding provider clock up',async()=>{
 const n=randomUUID();await f.db.owner.query("INSERT INTO scout_continuous.notices(id,kind,reason,created_at,status) VALUES($1,'native_test','SYNTHETIC_NOTICE',clock_timestamp(),'pending')",[n]);
 const notify=notificationChannel({enabled:true,token:'123456789:'+ 'SYNTHETIC_'.repeat(4),chatId:'1234',send:async()=>({status:200,rawHash:'e'.repeat(64),json:{ok:true,result:{message_id:1,date:Math.floor(Date.now()/1000),chat:{id:1234}}}})});
 const r=await watchdogCycle({...args(),notify});assert.equal(r.status,'checked');assert.equal(r.deviceDeliveryProven,false);assert.equal(r.notification.status,'provider_accepted');assert.equal((await f.store('reader').transact(null)).assurance.notificationHealthy,true);
});
const wire=options=>(config,cb)=>https.request({...config,hostname:'127.0.0.1',port,ca,...options},cb);
test('real local HTTPS validates certificate/SNI, hashes bytes and denies wrong hostname/untrusted CA',async()=>{
 response={status:200,body:'{"ok":true}'};const spec={host:'api.telegram.org',path:'/SYNTHETIC',method:'POST',body:'{}'};const r=await boundedRequest(spec,wire());assert.equal(r.status,200);assert.equal(r.rawHash.length,64);
 await assert.rejects(boundedRequest(spec,wire({servername:'wrong.invalid'})),e=>e.message==='ops_transport_unavailable');await assert.rejects(boundedRequest(spec,wire({ca:undefined})),e=>e.message==='ops_transport_unavailable');
});
test('real native HTTPS timeout is bounded, redacted and makes one request',async()=>{
 response='timeout';let requests=0;const start=Date.now();await assert.rejects(boundedRequest({host:'api.telegram.org',path:'/SYNTHETIC_SECRET',method:'POST'},(config,cb)=>{requests++;return wire()(config,cb);}),e=>e.message==='ops_transport_unavailable');assert.equal(requests,1);assert.ok(Date.now()-start<6500);
});
