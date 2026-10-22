// REAL loopback PostgreSQL 15+ / verified TLS / SCRAM-PLUS handshakes.
// Ephemeral synthetic hosts, keys, passwords and fixture state ONLY. No hosted/provider traffic.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash,X509Certificate} from 'node:crypto';
import {createServer,connect as netConnect} from 'node:net';
import {TLSSocket,createSecureContext,connect as tlsConnect} from 'node:tls';
import {mkdtempSync,readFileSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {localPostgres} from './postgres-harness.mjs';
import {root} from './fixtures.mjs';
const require=createRequire(import.meta.url),{Pool,Client}=require('pg');
const {RequiredChannelBindingClient:StrictClient,hasVerifiedChannelBinding:verified}=require(root+'/lib/onchain-mint/server/required-channel-binding.js');
const {prepareDatabase,databaseParameters}=require(root+'/lib/onchain-mint/server/production-config.js');
const {postgresStore,nativePostgresStore}=require(root+'/lib/onchain-mint/server/postgres-store.js');
const {LOOKUP_POLICY,LOOKUP_PROOF,LOOKUP_APPROVAL}=require(root+'/lib/onchain-mint/server/lookup-policy.js');
const {PREFLIGHT_APPROVAL}=require(root+'/lib/onchain-mint/server/config-preflight.js');
const {LOOKUP_COMPATIBILITY_SQL,LOOKUP_STEP_BODY_SHA256}=require(root+'/lib/onchain-mint/server/postgres-compatibility.js');
const HOST='ep-synthetic-binding.c-7.us-east-2.aws.neon.tech',PASSWORD='SYNTHETIC_LOCAL_TEST_PASSWORD_111';
const DSN=`postgresql://scout_mint_app:${PASSWORD}@${HOST}/neondb`,IDENTITY={role:'scout_mint_app',database:'neondb'};
let dir,db,port,backendCert,frontCert,frontContext;const pools=[],servers=[],sockets=new Set();
const track=s=>{sockets.add(s);s.on('error',()=>{});s.once('close',()=>sockets.delete(s));return s};
async function listen(server){servers.push(server);await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});return server.address().port}
function cert(name){
 const key=join(dir,name+'.key'),path=join(dir,name+'.crt');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN='+HOST,'-addext','subjectAltName=DNS:'+HOST,'-keyout',key,'-out',path],{stdio:'ignore',timeout:10000});
 chmodSync(key,0o600);return{path,key,cert:readFileSync(path,'utf8'),privateKey:readFileSync(key)};
}
before(async()=>{
 dir=mkdtempSync(join(tmpdir(),'scout-binding-'));backendCert=cert('backend');frontCert=cert('frontend');
 frontContext=createSecureContext({key:frontCert.privateKey,cert:frontCert.cert,minVersion:'TLSv1.2'});
 const probe=createServer();await new Promise((r,j)=>{probe.once('error',j);probe.listen(0,'127.0.0.1',r)});
 port=probe.address().port;await new Promise(r=>probe.close(r));
 db=await localPostgres({tls:{port,cert:backendCert.path,key:backendCert.key},database:'neondb',runtimeRole:'scout_mint_app'});
 // This migration is executed ONLY in the disposable local fixture; never reinstalled in Neon.
 await db.owner.query(readFileSync('lib/onchain-mint/server/postgres/lookup.sql','utf8'));
});
after(async()=>{
 await Promise.all(pools.map(p=>p.end()));for(const s of sockets)s.destroy();
 await Promise.all(servers.map(s=>new Promise(r=>s.close(r))));await db?.close();
 if(dir)rmSync(dir,{recursive:true,force:true});
});
function parameters(search='?sslmode=require&channel_binding=require'){
 const h=prepareDatabase(DSN+search,HOST,IDENTITY);assert.ok(h);
 return databaseParameters(h,StrictClient);
}
function pool(options={}){
 const p=parameters(),instance=new Pool({...p,host:'127.0.0.1',port,ssl:{...p.ssl,ca:backendCert.cert},...options});
 instance.on('error',()=>{});pools.push(instance);return instance;
}
function wireTrace(client){
 const trace={mechanisms:[],binding:null,queries:0},c=client.connection;
 const initial=c.sendSASLInitialResponseMessage,final=c.sendSCRAMClientFinalMessage,query=c.query,parse=c.parse;
 c.sendSASLInitialResponseMessage=function(m,r){trace.mechanisms.push(m);return initial.call(this,m,r)};
 c.sendSCRAMClientFinalMessage=function(r){trace.binding=Buffer.from(r.split(',')[0].slice(2),'base64');return final.call(this,r)};
 c.query=function(...args){trace.queries++;return query.apply(this,args)};
 c.parse=function(...args){trace.queries++;return parse.apply(this,args)};
 return trace;
}
test('locked pg only prefers binding: non-PLUS is selected when PLUS is absent',()=>{
 assert.equal(require('pg/package.json').version,'8.23.1');
 const sasl=require('pg/lib/crypto/sasl.js');
 assert.equal(sasl.startSession(['SCRAM-SHA-256'],{}).mechanism,'SCRAM-SHA-256');
});
for(const search of ['?channel_binding=require','?sslmode=require&channel_binding=require','?channel_binding=require&sslmode=require'])test('required DSN retains a mandatory adapter, never a silently weakened config: '+search,()=>{
 const h=prepareDatabase(DSN+search,HOST,IDENTITY);assert.ok(h);
 assert.throws(()=>databaseParameters(h),e=>e.message==='upstream_unavailable');
 const p=databaseParameters(h,StrictClient);assert.equal(p.Client,StrictClient);assert.equal(p.ssl.rejectUnauthorized,true);assert.equal(p.enableChannelBinding,true);
 assert.deepEqual(Object.keys(h),['host','provider']);assert.ok(!JSON.stringify(h).includes(PASSWORD));
});
test('real PG verifies PLUS and tls-server-end-point binding to the actual TLS certificate before SQL',async()=>{
 const p=parameters(),client=new StrictClient({...p,host:'127.0.0.1',port,ssl:{...p.ssl,ca:backendCert.cert}}),trace=wireTrace(client);
 assert.equal(verified(client,HOST),false);
 try{
  await client.connect();assert.deepEqual(trace.mechanisms,['SCRAM-SHA-256-PLUS']);
  const expected=Buffer.concat([Buffer.from('p=tls-server-end-point,,'),createHash('sha256').update(new X509Certificate(backendCert.cert).raw).digest()]);
  assert.deepEqual(trace.binding,expected);assert.equal(trace.queries,0);assert.equal(client.saslSession,null);
  assert.equal(verified(client,HOST),true);assert.equal(verified(client,'wrong.synthetic.invalid'),false);
  assert.equal((await client.query('SELECT current_user')).rows[0].current_user,'scout_mint_app');
 }finally{await client.end()}
 assert.equal(verified(client,HOST),false);
});
test('real PLUS pool reuse retains per-socket proof and the unchanged restricted lookup fingerprint',async()=>{
 const p=pool();let pid;
 for(let n=0;n<2;n++){
  const c=await p.connect();try{
   assert.equal(verified(c,HOST),true);pid??=c.processID;assert.equal(c.processID,pid);
   await c.query('BEGIN; SET LOCAL synchronous_commit=on; SET LOCAL search_path=pg_catalog');
   assert.deepEqual((await c.query(LOOKUP_COMPATIBILITY_SQL,[LOOKUP_STEP_BODY_SHA256])).rows,[{compatible:true}]);
   await c.query('ROLLBACK');
   for(const sql of ['SELECT * FROM scout_lookup.policy','UPDATE scout_lookup.policy SET seq=0','SELECT * FROM scout_mint.policy','SET ROLE scout_test_owner','CREATE SCHEMA forbidden'])
    await assert.rejects(c.query(sql),e=>e.code==='42501');
  }finally{c.release()}
 }
});
test('strict transport cannot bypass disabled SQL phase; no old canary or lookup state is consumed',async()=>{
 const before=(await db.owner.query('SELECT seq,circuit,mode FROM scout_lookup.policy')).rows;
 const old=(await db.owner.query('SELECT seq,circuit FROM scout_mint.policy')).rows;
 const p=pool(),now=Date.now();
 const reply=await postgresStore(p,{host:HOST,requireChannelBinding:true},'lookup').transact({kind:'admit',policy:LOOKUP_POLICY,mint:LOOKUP_PROOF.mint,client:'a'.repeat(64),authorization:{purpose:'proof',notBeforeMs:now-1000,expiresAtMs:now+60000}});
 assert.equal(reply.reason,'disabled');assert.deepEqual((await db.owner.query('SELECT seq,circuit,mode FROM scout_lookup.policy')).rows,before);
 assert.deepEqual((await db.owner.query('SELECT seq,circuit FROM scout_mint.policy')).rows,old);
});
test('actual native store construction selects the mandatory client and completes local catalog proof',async()=>{
 const original=Pool.prototype.connect;let connections=0;
 Pool.prototype.connect=function(...args){
  // Redirect ONLY this exact synthetic fixture handle to loopback before the first socket.
  assert.equal(this.options.host,HOST);assert.equal(this.options.Client,StrictClient);connections++;
  this.options.host='127.0.0.1';this.options.port=port;this.options.ssl={...this.options.ssl,ca:backendCert.cert};
  pools.push(this);return original.apply(this,args);
 };
 try{
  const store=nativePostgresStore(prepareDatabase(DSN+'?channel_binding=require',HOST,IDENTITY),'lookup'),now=Date.now();
  const reply=await store.transact({kind:'admit',policy:LOOKUP_POLICY,mint:LOOKUP_PROOF.mint,client:'b'.repeat(64),authorization:{purpose:'proof',notBeforeMs:now-1000,expiresAtMs:now+60000}});
  assert.equal(reply.reason,'disabled');assert.equal(connections,1);
 }finally{Pool.prototype.connect=original}
});
test('plain pg pooled client cannot forge strict attestation, even after a real preferred PLUS handshake',async()=>{
 const p=pool({Client}),c=await p.connect(),trace=wireTrace(c);c.release();
 await assert.rejects(postgresStore(p,{host:HOST,requireChannelBinding:true},'lookup').transact({kind:'admit',policy:LOOKUP_POLICY}),e=>e.message==='upstream_unavailable');
 assert.equal(trace.queries,0);assert.equal(verified(c,HOST),false);
});

// These local PostgreSQL wire peers are intentionally hostile synthetic test servers.
const i32=n=>{const b=Buffer.alloc(4);b.writeInt32BE(n);return b};
const packet=(type,body)=>Buffer.concat([Buffer.from(type),i32(body.length+4),body]);
const auth=(type,body=Buffer.alloc(0))=>packet('R',Buffer.concat([i32(type),body]));
const ready=packet('Z',Buffer.from('I')),ok=auth(0);
async function tlsPeer(onStartup){
 return listen(createServer(raw=>{
  track(raw);raw.once('data',first=>{
   if(first.length!==8 || first.readInt32BE(4)!==80877103){raw.destroy();return}
   raw.write('S');const front=track(new TLSSocket(raw,{isServer:true,secureContext:frontContext}));
   let buffer=Buffer.alloc(0),startup=true;
   front.on('data',part=>{
    buffer=Buffer.concat([buffer,part]);
    if(startup){if(buffer.length<4 || buffer.length<buffer.readInt32BE(0))return;
     const length=buffer.readInt32BE(0);buffer=buffer.subarray(length);startup=false;onStartup(front);
    }
    while(buffer.length>=5){const length=buffer.readInt32BE(1)+1;if(buffer.length<length)return;
     const message={type:String.fromCharCode(buffer[0]),body:buffer.subarray(5,length)};buffer=buffer.subarray(length);front.emit('frontendMessage',message);
    }
   });
  });
 }));
}
for(const mode of ['no_plus','cleartext','md5','trust','ready_without_auth','missing_final','invalid_signature','final_before_continue','duplicate_start','excessive_iterations'])test('hostile verified-TLS peer fails closed before SQL: '+mode,async()=>{
 const counts={password:0,queries:0,initial:0,final:0};
 const target=await tlsPeer(front=>{
  front.on('frontendMessage',m=>{
   if(['Q','P','B','E'].includes(m.type))counts.queries++;
   if(m.type!=='p')return;
   counts.password++;
   if(counts.password===1){
    counts.initial++;
    const zero=m.body.indexOf(0),mechanism=m.body.subarray(0,zero).toString();assert.equal(mechanism,'SCRAM-SHA-256-PLUS');
    const first=m.body.subarray(zero+5).toString(),nonce=first.split('r=')[1];assert.ok(first.startsWith('p=tls-server-end-point,,'));
    if(mode==='duplicate_start'){front.write(auth(10,Buffer.from('SCRAM-SHA-256-PLUS\0\0')));return}
    if(mode==='final_before_continue'){front.write(Buffer.concat([auth(12,Buffer.from('v='+Buffer.alloc(32).toString('base64'))),ok,ready]));return}
    front.write(auth(11,Buffer.from(`r=${nonce}SYNTHETIC_SERVER_NONCE,s=${Buffer.from('SYNTHETIC_SALT').toString('base64')},i=${mode==='excessive_iterations'?100001:4096}`)));
   }else{
    counts.final++;
    front.write(Buffer.concat([...(mode==='missing_final'?[]:[auth(12,Buffer.from('v='+Buffer.alloc(32).toString('base64')))]),ok,ready]));
   }
  });
  if(mode==='cleartext')front.write(auth(3));
  else if(mode==='md5')front.write(auth(5,Buffer.alloc(4)));
  else if(mode==='trust')front.write(Buffer.concat([ok,ready]));
  else if(mode==='ready_without_auth')front.write(ready);
  else front.write(auth(10,Buffer.from(mode==='no_plus'?'SCRAM-SHA-256\0\0':'SCRAM-SHA-256\0SCRAM-SHA-256-PLUS\0\0')));
 });
 const p=pool({port:target,ssl:{...parameters().ssl,ca:frontCert.cert}}),start=performance.now();
 await assert.rejects(p.query('SELECT 1'),e=>e.message==='upstream_unavailable');
 assert.ok(performance.now()-start<1500);assert.equal(counts.queries,0);assert.equal(p.totalCount,0);
 if(['no_plus','cleartext','md5','trust','ready_without_auth'].includes(mode))assert.equal(counts.password,0);
 if(['invalid_signature','missing_final'].includes(mode))assert.equal(counts.final,1);
 if(mode==='excessive_iterations')assert.equal(counts.final,0);
});

test('real TLS-terminating proxy to a non-PLUS PostgreSQL backend cannot downgrade strict binding',async()=>{
 let initial=0;
 const target=await tlsPeer(front=>{
  const back=track(netConnect({path:join(db.owner.options.host,'.s.PGSQL.'+db.owner.options.port)}));
  // Recreate the consumed startup message with only this disposable fixture's explicit identity.
  const startup=Buffer.concat([i32(196608),Buffer.from('user\0scout_mint_app\0database\0neondb\0\0')]);back.write(Buffer.concat([i32(startup.length+4),startup]));
  front.on('frontendMessage',m=>{if(m.type==='p')initial++;back.write(packet(m.type,m.body))});back.pipe(front);
  front.once('close',()=>back.destroy());back.once('close',()=>front.destroy());
 });
 const p=pool({port:target,ssl:{...parameters().ssl,ca:frontCert.cert}});
 await assert.rejects(p.query('SELECT 1'),e=>e.message==='upstream_unavailable');assert.equal(initial,0);
});
test('real PG rejects PLUS bound to a different TLS terminator certificate',async()=>{
 let serverError='',initial=0;
 const target=await tlsPeer(front=>{
  const raw=track(netConnect({host:'127.0.0.1',port}));
  raw.once('connect',()=>raw.write(Buffer.concat([i32(8),i32(80877103)])));
  raw.once('data',part=>{
   assert.equal(part.toString(),'S');
   const back=track(tlsConnect({socket:raw,ca:backendCert.cert,servername:HOST,rejectUnauthorized:true,minVersion:'TLSv1.2'}));
   back.once('secureConnect',()=>{
    const startup=Buffer.concat([i32(196608),Buffer.from('user\0scout_mint_app\0database\0neondb\0\0')]);back.write(Buffer.concat([i32(startup.length+4),startup]));
    front.on('frontendMessage',m=>{if(m.type==='p')initial++;back.write(packet(m.type,m.body))});
    back.on('data',part=>{if(part[0]===69)serverError+=part.toString();front.write(part)});
   });
   front.once('close',()=>back.destroy());back.once('close',()=>front.destroy());
  });
 });
 const p=pool({port:target,ssl:{...parameters().ssl,ca:frontCert.cert}});
 await assert.rejects(p.query('SELECT 1'),e=>e.message==='upstream_unavailable');
 assert.equal(initial,2);assert.match(serverError,/channel binding check failed/i);
});
for(const [label,options] of [
 ['untrusted CA',{ssl:{rejectUnauthorized:true,servername:HOST,minVersion:'TLSv1.2'}}],
 ['wrong verified hostname',{ssl:{rejectUnauthorized:true,servername:'wrong.synthetic.invalid',minVersion:'TLSv1.2',ca:null}}],
 ['wrong password',{password:'SYNTHETIC_WRONG_PASSWORD'}],
])test('strict client rejects '+label+' without exposing credentials',async()=>{
 if(label==='wrong verified hostname')options.ssl.ca=backendCert.cert;
 await assert.rejects(pool(options).query('SELECT 1'),e=>e.message==='upstream_unavailable'&&!JSON.stringify(e).includes(PASSWORD));
});
for(const options of [{enableChannelBinding:false},{ssl:false},{ssl:{rejectUnauthorized:false,servername:HOST,minVersion:'TLSv1.2'}},{connectionString:DSN},{password:undefined},{password:async()=>PASSWORD},{pipeline:true},{stream:()=>null},{connection:{}},
 {ssl:{rejectUnauthorized:true,servername:HOST,minVersion:'TLSv1.2',checkServerIdentity:()=>undefined}}])test('strict constructor rejects unsafe override before any connection',()=>{
 assert.throws(()=>new StrictClient({...parameters(),...options}),e=>e.message==='upstream_unavailable');
});
test('new physical connection after local PG restart must independently verify PLUS',async()=>{
 const p=pool(),first=await p.connect();assert.equal(verified(first,HOST),true);first.release(true);
 await db.crashRestart();const next=await p.connect();try{assert.notEqual(first,next);assert.equal(verified(first,HOST),false);assert.equal(verified(next,HOST),true)}finally{next.release()}
});
for(const change of ['version','internal_handler'])test('unsupported driver '+change+' is rejected before socket creation',()=>{
 const adapterPath=root+'/lib/onchain-mint/server/required-channel-binding.js';
 const config={user:'scout_mint_app',database:'neondb',host:HOST,password:PASSWORD,enableChannelBinding:true,ssl:{rejectUnauthorized:true,servername:HOST,minVersion:'TLSv1.2'}};
 const code=`const assert=require('node:assert/strict');const pg=require('pg');${change==='version'?"require('pg/package.json').version='0.0.0-SYNTHETIC_UNSUPPORTED'":"pg.Client.prototype._handleAuthSASLFinal=undefined"};let io=0;require('node:net').connect=()=>{io++;throw Error('FORBIDDEN_SOCKET')};const {RequiredChannelBindingClient:C}=require(${JSON.stringify(adapterPath)});assert.throws(()=>new C(${JSON.stringify(config)}),e=>e.message==='upstream_unavailable');assert.equal(io,0);`;
 const r=spawnSync(process.execPath,['--conditions=react-server','-e',code],{env:{NODE_ENV:'test',NODE_PATH:process.env.NODE_PATH},encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);
});
test('lookup/preflight approvals stay disabled/null; SQL bodies and least-privilege assertions stay untouched',()=>{
 assert.equal(LOOKUP_APPROVAL.phase,'disabled');assert.equal(LOOKUP_APPROVAL.notBeforeMs,null);assert.equal(LOOKUP_APPROVAL.expiresAtMs,null);
 assert.deepEqual(PREFLIGHT_APPROVAL,{enabled:false,notBeforeMs:null,expiresAtMs:null});
 const sql=readFileSync('lib/onchain-mint/server/postgres/lookup.sql','utf8');
 assert.equal(createHash('sha256').update(sql.split('$function$')[1]).digest('hex'),LOOKUP_STEP_BODY_SHA256);
 assert.equal(LOOKUP_STEP_BODY_SHA256,'c5aedb841dc23f6012bd1ef2935262f2a3899e6b11b62c0386d7f45fc436e0c0');
});
