// REAL local PostgreSQL/TLS/SCRAM; SYNTHETIC credentials/host/state only, never hosted Neon.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,readFileSync,rmSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {execFileSync} from 'node:child_process';
import {localPostgres} from './postgres-harness.mjs';
import {root,MINT} from './fixtures.mjs';
const require=createRequire(import.meta.url),{Pool}=require('pg');
const {prepareDatabase,databaseParameters}=require(root+'/lib/onchain-mint/server/production-config.js');
const {postgresStore}=require(root+'/lib/onchain-mint/server/postgres-store.js');
const HOST='ep-synthetic-only.c-7.us-east-2.aws.neon.tech',PASSWORD='SYNTHETIC_LOCAL_TEST_PASSWORD_111';
let db,dir,port,ca;const pools=[];
before(async()=>{
 dir=mkdtempSync(join(tmpdir(),'scout-pg-tls-'));
 const cert=join(dir,'local.crt'),key=join(dir,'local.key');
 // Ephemeral test key generated locally; no production trust store or credential changed.
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN='+HOST,'-addext','subjectAltName=DNS:'+HOST,'-keyout',key,'-out',cert],{stdio:'ignore',timeout:10000});
 chmodSync(key,0o600);
 ca=readFileSync(cert,'utf8');const probe=createServer();
 await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);});
 port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 db=await localPostgres({tls:{port,cert,key}});
});
after(async()=>{await Promise.all(pools.map(p=>p.end()));await db?.close();if(dir)rmSync(dir,{recursive:true,force:true});});
function pool(change={}){
 const handle=prepareDatabase(`postgresql://scout_test_runtime:${PASSWORD}@${HOST}/postgres`,HOST);
 assert.ok(handle);const params=databaseParameters(handle);
 // TEST ONLY: transport to loopback, trust this generated CA; retain exact routed-host SNI,
 // verified TLS, scoped credentials, channel binding, native driver and production deadlines.
 const p=new Pool({...params,host:'127.0.0.1',port,ssl:{...params.ssl,ca},...change});
 p.on('error',()=>{});pools.push(p);return p;
}
test('real pg TLS + SCRAM reaches the least-privilege SQL service using routed-host SNI',async()=>{
 const p=pool();assert.equal((await p.query('SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()')).rows[0].ssl,true);
 const reply=await postgresStore(p).transact({kind:'admit',policy:'scout-helius-mint/production-v1',mint:MINT,client:'a'.repeat(64)});
 assert.equal(reply.kind,'lease'); // Real atomic SQL admission only; no RPC follows it.
 await assert.rejects(p.query('SELECT * FROM scout_mint.policy'),/permission denied/);
});
test('real pg TLS refuses an untrusted CA',async()=>{
 await assert.rejects(pool({ssl:{rejectUnauthorized:true,servername:HOST}}).query('SELECT 1'),/self-signed|certificate|unable to verify/i);
});
test('real pg TLS refuses the wrong hostname even with the trusted local CA',async()=>{
 await assert.rejects(pool({ssl:{rejectUnauthorized:true,servername:'wrong.synthetic.invalid',ca}}).query('SELECT 1'),/hostname|altnames|certificate/i);
});
test('real pg SCRAM refuses a wrong synthetic password over verified TLS',async()=>{
 await assert.rejects(pool({password:'SYNTHETIC_WRONG_PASSWORD'}).query('SELECT 1'),/password authentication failed/);
});
test('local TLS-only PostgreSQL refuses plaintext instead of downgrading',async()=>{
 await assert.rejects(pool({ssl:false}).query('SELECT 1'),/pg_hba.conf.*reject|no encryption|no pg_hba.conf/i);
});
