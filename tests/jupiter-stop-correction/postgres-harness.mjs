// Actual PostgreSQL18.6, fresh mktemp cluster per case. NO inherited PG*/DSN/env.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileAnchor} from '../../experiments/jupiter-beta-approval/integration/durable/anchor.mjs';
import {configuration,StrictBetaClient} from '../../experiments/jupiter-beta-approval/integration/durable/tls.mjs';
import {postgresLedger} from '../../experiments/jupiter-beta-approval/integration/durable/postgres.mjs';
import {policyBinding} from '../../experiments/jupiter-beta-approval/integration/contract.mjs';
import {canonical} from '../../experiments/jupiter-beta-approval/integration/json.mjs';
import {serial} from '../../experiments/jupiter-beta-approval/integration/durable/serial.mjs';
import {HOST} from './local-only.mjs';
const {Client}=createRequire(import.meta.url)('../../experiments/jupiter-beta-approval/integration/node_modules/pg');
export const PASSWORD='SYNTHETIC_LOCAL_BETA_TEST_ONLY';
export async function database({publicTrust,sql=fs.readFileSync('experiments/jupiter-beta-approval/integration/durable/schema.sql','utf8')}={}){
 assert.equal(process.env.NODE_ENV,'test');assert.equal(process.env.UNFARMD_BETA_LOCAL_PG,'isolated-synthetic-only');assert.notEqual(process.getuid(),0);
 const bin=process.env.SCOUT_TEST_PG_BIN;assert.ok(bin?.startsWith('/tmp/')||bin?.startsWith('/usr/lib/postgresql/18/'));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'unfarmd-beta-pg18-')),data=path.join(dir,'data'),offset=path.join(dir,'clock-offset'),anchorDir=path.join(dir,'anchor');
 const env={PATH:process.env.PATH,LANG:'C',LD_PRELOAD:path.join(dir,'clock.so'),UNFARMD_TEST_CLOCK_FILE:offset};
 const run=(name,args)=>execFileSync(path.join(bin,name),args,{env,encoding:'utf8',timeout:20000,stdio:['ignore','pipe','pipe']});
 fs.writeFileSync(offset,'0');fs.mkdirSync(anchorDir,{mode:0o700});
 execFileSync('gcc',['-shared','-fPIC','-o',env.LD_PRELOAD,'tests/jupiter-stop-correction/clock.c','-ldl'],{stdio:'pipe'});
 const cert=path.join(dir,'test.crt'),key=path.join(dir,'test.key');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN='+HOST,'-addext','subjectAltName=DNS:'+HOST,'-keyout',key,'-out',cert],{stdio:'ignore'});fs.chmodSync(key,0o600);const ca=fs.readFileSync(cert,'utf8');
 let running=false;const clients=new Set();
 const start=()=>{run('pg_ctl',['-D',data,'-l',path.join(dir,'server.log'),'-o',`-k ${dir} -h 127.0.0.1 -p 5432 -c ssl=on -c ssl_cert_file=${cert} -c ssl_key_file=${key} -c fsync=on -c synchronous_commit=on -c max_connections=40 -c shared_buffers=16MB`,'-w','start']);running=true;};
 const stop=()=>{if(running){run('pg_ctl',['-D',data,'-m','immediate','-w','stop']);running=false;}};
 const client=async(user='fixture_root',db='unfarmd_beta_authority',password=PASSWORD)=>{const c=new Client({host:dir,port:5432,user,password,database:db,connectionTimeoutMillis:1000,query_timeout:2000});c.on('error',()=>{});await c.connect();clients.add(c);return c;};
 const close=async()=>{await Promise.allSettled([...clients].map(c=>c.end()));clients.clear();stop();fs.rmSync(dir,{recursive:true,force:true});};
 try{
  assert.equal(run('postgres',['--version']).trim(),'postgres (PostgreSQL) 18.6');
  run('initdb',['-D',data,'-U','fixture_root','--auth=trust','--no-locale','-E','UTF8']);
  fs.writeFileSync(path.join(data,'pg_hba.conf'),'local all fixture_root trust\nlocal all fixture_installer scram-sha-256\nlocal all all reject\nhostssl all all 127.0.0.1/32 scram-sha-256\nhost all all 0.0.0.0/0 reject\nhost all all ::/0 reject\n');start();
  const setup=await client('fixture_root','postgres');
  await setup.query(`CREATE ROLE fixture_installer LOGIN NOSUPERUSER CREATEDB CREATEROLE NOINHERIT PASSWORD '${PASSWORD}'`);
  await setup.query('CREATE DATABASE unfarmd_beta_authority OWNER fixture_installer');
  const installer=await client('fixture_installer');await installer.query(sql);await installer.end();clients.delete(installer);
  const admin=await client();
  for(const role of ['validator','consumer','stopper']){
   await admin.query(`CREATE ROLE unfarmd_beta_${role}_login LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS INHERIT PASSWORD '${PASSWORD}'`);
   await admin.query(`GRANT unfarmd_beta_${role} TO unfarmd_beta_${role}_login`);
  }
  await admin.query('INSERT INTO unfarmd_beta.policy(epoch,policy_hash,armed,state_hash) VALUES($1,$2,true,$3)',[publicTrust.beta.epoch,policyBinding(publicTrust),'0'.repeat(64)]);
  await admin.query('UPDATE unfarmd_beta.policy SET state_hash=unfarmd_beta.state_digest()');
  const p=(await admin.query('SELECT * FROM unfarmd_beta.policy')).rows[0];
  const bootstrap={seq:'0',head:'0'.repeat(64),policyHash:p.policy_hash,stateHash:p.state_hash};
  fs.writeFileSync(path.join(anchorDir,'beta-anchor.jsonl'),canonical(bootstrap)+'\n',{mode:0o600});
  const anchor=fileAnchor({directory:anchorDir,bootstrap}),withLock=serial();
  const native=async(role='validator',change={})=>{
   const config=configuration(`postgresql://unfarmd_beta_${role}_login:${PASSWORD}@${HOST}/unfarmd_beta_authority?sslmode=verify-full&channel_binding=require`,HOST,ca);
   const c=new StrictBetaClient({...config,...change});c.on('error',()=>{});await c.connect();clients.add(c);return c;
  };
  const ledger=(role='validator',change={})=>postgresLedger({publicTrust,role,anchor,withLock,open:()=>native(role),...change});
  return {dir,anchorDir,anchor,bootstrap,admin,client,native,ledger,ca,offset,
   async state(){return (await admin.query('SELECT * FROM unfarmd_beta.policy')).rows[0];},
   clock(seconds){assert.ok([0,30].includes(seconds));fs.writeFileSync(offset,String(seconds));},
   async outage(){await Promise.allSettled([...clients].map(c=>c.end()));clients.clear();stop();},
   async restart(){stop();start();},
   hba(method){assert.ok(['password','scram-sha-256'].includes(method));fs.writeFileSync(path.join(data,'pg_hba.conf'),`local all fixture_root trust\nlocal all fixture_installer scram-sha-256\nlocal all all reject\nhostssl all all 127.0.0.1/32 ${method}\nhost all all 0.0.0.0/0 reject\nhost all all ::/0 reject\n`);run('pg_ctl',['-D',data,'reload']);},
   async root(){return client();},close};
 }catch(e){await close();throw e;}
}
