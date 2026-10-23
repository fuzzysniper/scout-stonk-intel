// Native server-only PostgreSQL; new roles/DSNs only, no old-store or in-memory fallback.
import {Pool} from 'pg';
import {createHash} from 'node:crypto';
import {NEON_HOST,LedgerError} from '../live-ledger/database.mjs';
import fingerprints from './fingerprints.json' with {type:'json'};
import {validCommand,validMaintenance,validRecord,clock,integer,USAGE_KEYS,VERSION,POLICY_HASH,uuid,digest,keys} from './policy.mjs';
export {NEON_HOST,LedgerError};
const roles=Object.freeze({worker:'scout_continuous_worker',reader:'scout_continuous_reader',stop:'scout_continuous_stop',maintenance:'scout_continuous_maintenance'});
const handledClients=new WeakSet();
export function databaseConfig(value,kind){
 try{
  if(!roles[kind]||typeof value!=='string'||value.length>2048||/[\s\x00-\x1f\x7f]/.test(value))throw 0;
  const u=new URL(value);
  if(u.searchParams.has('channel_binding')){if(u.searchParams.get('channel_binding')==='require')throw new LedgerError('blocked_required_channel_binding');throw 0;}
  if(u.protocol!=='postgresql:'||u.hostname!==NEON_HOST||!['', '5432'].includes(u.port)||u.hash||u.pathname!=='/neondb'||decodeURIComponent(u.username)!==roles[kind]||!/^.{16,256}$/.test(decodeURIComponent(u.password))||/[\x00-\x20\x7f]/.test(decodeURIComponent(u.password))||!['','?sslmode=require'].includes(u.search))throw 0;
  return {host:NEON_HOST,port:5432,database:'neondb',user:roles[kind],password:decodeURIComponent(u.password),ssl:{rejectUnauthorized:true,servername:NEON_HOST,minVersion:'TLSv1.2'},enableChannelBinding:true,max:1,connectionTimeoutMillis:700,idleTimeoutMillis:1000,query_timeout:1000,statement_timeout:500,lock_timeout:150,idle_in_transaction_session_timeout:1000,application_name:'scout_continuous_'+kind,options:'-c synchronous_commit=on',allowExitOnIdle:true};
 }catch(e){if(e instanceof LedgerError)throw e;throw new LedgerError('invalid_database_configuration');}
}
const roleSql=`SELECT r.rolname=$1 AND NOT r.rolsuper AND NOT r.rolcreatedb AND NOT r.rolcreaterole AND NOT r.rolinherit AND NOT r.rolreplication AND NOT r.rolbypassrls AND r.rolconnlimit=2 AND current_database()='neondb'
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members WHERE member=r.oid)
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname IN ('scout_continuous','scout_live','scout_lookup','scout_mint') AND t.relkind IN ('r','p') AND (pg_catalog.has_table_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR pg_catalog.pg_has_role(r.oid,t.relowner,'MEMBER')))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspname IN ('scout_live','scout_mint','scout_lookup') AND pg_catalog.has_schema_privilege(r.oid,n.oid,'USAGE,CREATE'))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND pg_catalog.has_schema_privilege(r.oid,n.oid,'CREATE')) AS compatible FROM pg_catalog.pg_roles r WHERE r.rolname=session_user`;
const fnSql=`SELECT p.proname,pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex') AS hash,p.prosecdef,p.proconfig,pg_catalog.has_function_privilege(session_user,p.oid,'EXECUTE') AS allowed,
 NOT EXISTS(SELECT 1 FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee<>p.proowner AND (a.grantee=0 OR a.grantee<>CASE p.proname WHEN 'step' THEN pg_catalog.to_regrole('scout_continuous_worker')::oid WHEN 'snapshot' THEN pg_catalog.to_regrole('scout_continuous_reader')::oid WHEN 'stop' THEN pg_catalog.to_regrole('scout_continuous_stop')::oid WHEN 'maintain' THEN pg_catalog.to_regrole('scout_continuous_maintenance')::oid ELSE 0 END OR a.is_grantable)) AS private
 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='scout_continuous'`;
function validReply(r,kind){
 if(kind==='worker')return r?.v===2&&typeof r.ok==='boolean'&&uuid(r.parent)&&/^[a-f0-9]{40}$/.test(r.head)&&r.scope===POLICY_HASH&&digest(r.grantHash)&&typeof r.stopped==='boolean'&&typeof r.connected==='boolean'&&clock(r.serverTime)&&clock(r.parentEndsAt)&&keys(r.usage,USAGE_KEYS)&&Object.values(r.usage).every(integer)&&(r.worker===null&&r.fence===null&&r.leaseUntil===null||uuid(r.worker)&&uuid(r.fence)&&clock(r.leaseUntil));
 if(kind==='reader')return r?.version==='unfarmd-continuous-feed/1'&&clock(r.observedAt)&&typeof r.stopped==='boolean'&&Array.isArray(r.events)&&r.events.length<=20&&r.events.every(validRecord)&&keys(r.usage,USAGE_KEYS)&&Object.values(r.usage).every(integer);
 if(kind==='stop')return r?.version==='unfarmd-continuous-stop/1'&&r.status==='stopped'&&uuid(r.parent)&&digest(r.grantHash)&&clock(r.observedAt)&&typeof r.closureAcknowledged==='boolean';
 return r?.version==='unfarmd-continuous-maintenance/1'&&['checked','stopped','leased'].includes(r.status);
}
export function postgresPort(pool,{kind,host}){
 if(!roles[kind]||host!==NEON_HOST)throw new LedgerError('invalid_database_configuration');let closed=false;
 return Object.freeze({version:VERSION,
 async transact(command,{signal}={}){
  if(closed||signal?.aborted||pool.waitingCount>0)throw new LedgerError();
  if(kind==='worker'&&!validCommand(command)||kind==='reader'&&command!==null||kind==='maintenance'&&!validMaintenance(command)||kind==='stop'&&(!keys(command,['parent','grantHash'])||!uuid(command.parent)||!digest(command.grantHash)))throw new LedgerError('invalid_command');
  let client,committed=false,timer;const until=Date.now()+1400;
  try{
   client=await pool.connect();
   // pg emits an active-client error as well as rejecting the query when an
   // abort destroys TLS. Keep exactly one listener for that client's lifetime;
   // the query still rejects/redacts and the uncertain connection is discarded.
   if(!handledClients.has(client)){client.on('error',()=>{});handledClients.add(client);}
   if(signal?.aborted||Date.now()>=until)throw 0;
   const socket=client.connection?.stream;
   if(!socket?.encrypted||socket.authorized!==true||socket.servername!==host||!['TLSv1.2','TLSv1.3'].includes(socket.getProtocol?.()))throw 0;
   const cancel=()=>client?.connection?.stream?.destroy();timer=setTimeout(cancel,Math.max(1,until-Date.now()));signal?.addEventListener('abort',cancel,{once:true});
   try{
    await client.query(kind==='reader'?'BEGIN READ ONLY':'BEGIN');await client.query("SET LOCAL synchronous_commit=on;SET LOCAL statement_timeout='500ms';SET LOCAL lock_timeout='150ms';SET LOCAL search_path=pg_catalog");
    const role=await client.query(roleSql,[roles[kind]]);if(role.rowCount!==1||role.rows[0].compatible!==true)throw 0;
    const fns=await client.query(fnSql);if(fns.rowCount!==Object.keys(fingerprints).length)throw 0;
    const expected={worker:'step',reader:'snapshot',stop:'stop',maintenance:'maintain'}[kind];
    for(const f of fns.rows)if(f.hash!==fingerprints[f.proname]||!f.private||f.allowed!==(f.proname===expected)||f.prosecdef!==['step','snapshot','stop','maintain'].includes(f.proname)||JSON.stringify(f.proconfig)!=='["search_path=pg_catalog"]')throw 0;
    const sql={worker:'SELECT scout_continuous.step($1::jsonb) reply',reader:'SELECT scout_continuous.snapshot() reply',stop:'SELECT scout_continuous.stop($1::text,$2::text) reply',maintenance:'SELECT scout_continuous.maintain($1::jsonb) reply'}[kind];
    const params=kind==='reader'?[]:kind==='stop'?[command.parent,command.grantHash]:[JSON.stringify(command)];const result=await client.query(sql,params),reply=result.rows[0]?.reply;
    if(result.rowCount!==1||!validReply(reply,kind))throw 0;
    await client.query('COMMIT');committed=true;if(signal?.aborted||Date.now()>=until)throw 0;return reply;
   }finally{signal?.removeEventListener('abort',cancel);}
  }catch{throw new LedgerError();}finally{clearTimeout(timer);client?.release(!committed);}
 },async close(){closed=true;await pool.end();}});
}
export function nativeStore(kind,env=process.env){
 const key={worker:'SCOUT_CONTINUOUS_WORKER_DATABASE_URL',reader:'SCOUT_CONTINUOUS_READER_DATABASE_URL',stop:'SCOUT_CONTINUOUS_STOP_DATABASE_URL',maintenance:'SCOUT_CONTINUOUS_MAINTENANCE_DATABASE_URL'}[kind];
 const pool=new Pool(databaseConfig(env[key],kind));pool.on('error',()=>{});return postgresPort(pool,{kind,host:NEON_HOST});
}
export function fingerprintSource(sql){return Object.fromEntries([...sql.matchAll(/CREATE FUNCTION scout_continuous\.(\w+)[\s\S]*?AS \$fn\$([\s\S]*?)\$fn\$;/g)].map(m=>[m[1],createHash('sha256').update(m[2]).digest('hex')]));}
