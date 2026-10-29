// SYNTHETIC ONLY. Fresh local cluster/TLS/passwords/owner keys; no hosted URL/env secrets.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomBytes} from 'node:crypto';import {execFileSync} from 'node:child_process';import {createServer} from 'node:net';import dns from 'node:dns';import {Pool} from 'pg';
import {localPostgres} from '../onchain-api/postgres-harness.mjs';
import {render} from '../../ops/v4-journal/package.mjs';
import {StrictJournalClient} from '../../ops/v4-journal/native-tls.mjs';
dns.setDefaultResultOrder('ipv4first');
export async function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'journal233-local-')),cert=path.join(dir,'local.crt'),key=path.join(dir,'local.key');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost','-keyout',key,'-out',cert],{stdio:'ignore'});fs.chmodSync(key,0o600);
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 let raw;const pools=[],cache=new Map();const pass=randomBytes(32).toString('hex'),ca=fs.readFileSync(cert,'utf8');
 try{
  raw=await localPostgres({tls:{port,cert,key}});await raw.owner.query(`ALTER ROLE scout_test_owner PASSWORD '${pass}'`);await raw.owner.query('CREATE DATABASE unfarmd_v4_pilot');
  let owner=raw.pool('scout_test_owner',pass,'unfarmd_v4_pilot');
  const config=user=>({host:'localhost',port,database:'unfarmd_v4_pilot',user,password:pass,max:4,connectionTimeoutMillis:900,query_timeout:1200,statement_timeout:800,ssl:{ca,servername:'localhost',rejectUnauthorized:true,minVersion:'TLSv1.2'},enableChannelBinding:true,Client:StrictJournalClient});
  const pool=user=>{if(cache.has(user))return cache.get(user);const p=new Pool(config(user));p.on('error',()=>{});pools.push(p);cache.set(user,p);return p;};
  const bin=[process.env.SCOUT_TEST_PG_BIN,...[18,17,16,15].map(v=>'/usr/lib/postgresql/'+v+'/bin')].find(p=>p&&fs.existsSync(path.join(p,'initdb'))&&fs.existsSync(path.join(p,'psql')));if(!bin)throw Error('local_pg_tools_required');
  const tool=(name,args=[])=>{try{return execFileSync(path.join(bin,name),args,{encoding:'utf8',timeout:20000,env:{PATH:'/usr/bin:/bin',LANG:'C',LD_LIBRARY_PATH:path.resolve(bin,'../../../x86_64-linux-gnu'),PGHOST:'localhost',PGPORT:String(port),PGDATABASE:'unfarmd_v4_pilot',PGUSER:'scout_test_owner',PGPASSWORD:pass,PGSSLMODE:'verify-full',PGSSLROOTCERT:cert,PGCHANNELBINDING:'require'},stdio:['pipe','pipe','pipe']});}catch(e){const error=Error('local_backup_rejected');error.localDiagnostic=String(e.stderr??'').replaceAll(pass,'[REDACTED]');throw error;}};
  const migrate=(database='unfarmd_v4_pilot',text=render())=>{
   try{return execFileSync(path.join(bin,'psql'),['-X','-q','--no-password'],{input:text,encoding:'utf8',timeout:20000,env:{PATH:'/usr/bin:/bin',LANG:'C',LD_LIBRARY_PATH:path.resolve(bin,'../../../x86_64-linux-gnu'),PGHOST:'localhost',PGPORT:String(port),PGDATABASE:database,PGUSER:'scout_test_owner',PGPASSWORD:pass,PGSSLMODE:'verify-full',PGSSLROOTCERT:cert,PGCHANNELBINDING:'require'},stdio:['pipe','pipe','pipe']});}
   catch(e){const failure=Error('local_install_rejected');failure.localDiagnostic=String(e.stderr??'').replaceAll(pass,'[REDACTED]');throw failure;}
  };
  return {dir,port,cert,key,ca,raw,tool,pool,config,migrate,get owner(){return owner;},async enable(){for(const name of ['journal','auth','pilot','erasure','stopper'])await owner.query(`ALTER ROLE unfarmd_v4_${name}_login LOGIN PASSWORD '${pass}'`);},async restart(){await Promise.all(pools.splice(0).map(p=>p.end()));cache.clear();await raw.crashRestart();owner=raw.pool('scout_test_owner',pass,'unfarmd_v4_pilot');},async close(){await Promise.all(pools.map(p=>p.end()));await raw.close();fs.rmSync(dir,{recursive:true,force:true});}};
 }catch(e){await raw?.close();fs.rmSync(dir,{recursive:true,force:true});throw e;}
}
