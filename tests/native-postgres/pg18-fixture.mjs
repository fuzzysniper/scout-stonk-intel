// Native-only fresh disposable cluster. NO legacy schema/bootstrap/reset or existing database.
import './namespace-only.mjs';import {requireLocalPg18Approval} from './pg18-approval.mjs';requireLocalPg18Approval();
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomBytes} from 'node:crypto';import {execFileSync} from 'node:child_process';import net from 'node:net';import dns from 'node:dns';import {Pool} from 'pg';
import {StrictJournalClient} from '../../ops/v4-journal/native-tls.mjs';
dns.setDefaultResultOrder('ipv4first');
export async function fixture(){
 if(process.env.NODE_ENV!=='test'||process.getuid()===0)throw Error('disposable_nonroot_test_only');
 const bin=process.env.SCOUT_TEST_PG_BIN,share=process.env.SCOUT_TEST_PG_SHARE;
 if(!path.isAbsolute(bin??'')||!path.isAbsolute(share??''))throw Error('explicit_pg18_paths_required');
 const tool=(name,args)=>execFileSync(path.join(bin,name),args,{encoding:'utf8',timeout:20000,env:{PATH:'/usr/bin:/bin',LANG:'C'},stdio:['ignore','pipe','pipe']});
 if(tool('postgres',['--version']).trim()!=='postgres (PostgreSQL) 18.6')throw Error('exact_pg18_required');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'native-pg18-synthetic-')),data=path.join(dir,'data'),cert=path.join(dir,'local.crt'),key=path.join(dir,'local.key');
 fs.chmodSync(dir,0o700);
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost','-keyout',key,'-out',cert],{stdio:'ignore'});fs.chmodSync(key,0o600);
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const pass=randomBytes(32).toString('hex'),ca=fs.readFileSync(cert,'utf8'),pools=new Set();let running=false,owner;
 const config=user=>({host:'localhost',port,database:'unfarmd_v4_pilot',user,password:pass,max:1,connectionTimeoutMillis:900,query_timeout:1200,statement_timeout:800,ssl:{ca,servername:'localhost',rejectUnauthorized:true,minVersion:'TLSv1.2'},enableChannelBinding:true,Client:StrictJournalClient});
 const pool=(user='scout_test_owner',password=pass,database='unfarmd_v4_pilot')=>{const p=new Pool({...config(user),host:dir,password,database,ssl:false,Client:undefined});p.on('error',()=>{});pools.add(p);return p;};
 const closePools=async()=>{await Promise.all([...pools].map(p=>p.end()));pools.clear();};
 const start=()=>{tool('pg_ctl',['-D',data,'-l',path.join(dir,'server.log'),'-o',`-k ${dir} -h 127.0.0.1 -p ${port} -c shared_buffers=16MB -c max_connections=30 -c fsync=on -c synchronous_commit=on -c ssl=on -c ssl_cert_file=${cert} -c ssl_key_file=${key}`,'-w','start']);running=true;};
 const stop=()=>{if(running){tool('pg_ctl',['-D',data,'-m','immediate','-w','stop']);running=false;}};
 const close=async()=>{try{await closePools();stop();}finally{if(!running)fs.rmSync(dir,{recursive:true,force:true});}};
 try{
  tool('initdb',['-D',data,'-L',share,'-U','scout_test_owner','--auth=reject','--no-locale','-E','UTF8']);
  fs.writeFileSync(path.join(data,'pg_hba.conf'),'local all scout_test_owner trust\nlocal all all scram-sha-256\nhostssl all all 127.0.0.1/32 scram-sha-256\nhost all all 0.0.0.0/0 reject\nhost all all ::/0 reject\n');
  start();const setup=pool('scout_test_owner',pass,'postgres');await setup.query(`ALTER ROLE scout_test_owner PASSWORD '${pass}'`);await setup.query('CREATE DATABASE unfarmd_v4_pilot');await setup.end();pools.delete(setup);owner=pool();
  console.log(JSON.stringify({kind:'DISPOSABLE_LOCAL_PG18',version:tool('postgres',['--version']).trim(),interfaces:['lo'],externalRoutes:0,environment:'sanitized',schemaScope:'native-only',activate:false}));
  return {dir,config,get owner(){return owner;},async close(){await close();},raw:{async crashRestart(){await closePools();stop();start();owner=pool();},async outage(){await closePools();stop();},async restore(){start();owner=pool();}}};
 }catch(e){await close();throw e;}
}
