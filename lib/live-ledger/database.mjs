// Node-only native pg. Never import from browser code. No ambient PG* defaults/retries/fallback.
import { Pool } from 'pg';
import { createHash } from 'node:crypto';
import fingerprints from './fingerprints.json' with { type: 'json' };
import { validCommand, validEvent, SCOPE } from './policy.mjs';
export const NEON_HOST='ep-flat-band-b5fp4ls8.c-7.us-east-2.aws.neon.tech';
export class LedgerError extends Error { constructor(code='store_unavailable'){super(code);this.code=code;} }
const roles={worker:'scout_live_worker',reader:'scout_live_reader',stop:'scout_live_stop'};
export function databaseConfig(value,kind) {
  try {
    if(typeof value!=='string'||value.length>2048||/[\s\x00-\x1f\x7f]/.test(value)||!roles[kind])throw 0;
    const u=new URL(value);
    // A mandatory channel_binding=require request is NEVER stripped or downgraded. Pinned pg only prefers PLUS.
    if(u.searchParams.has('channel_binding')){if(u.searchParams.get('channel_binding')==='require')throw new LedgerError('blocked_required_channel_binding');throw 0;}
    if(u.protocol!=='postgresql:'||u.hostname!==NEON_HOST||u.host!==NEON_HOST+':5432'&&u.host!==NEON_HOST||u.hash||u.pathname!=='/neondb'||decodeURIComponent(u.username)!==roles[kind]||!/^.{16,256}$/.test(decodeURIComponent(u.password))||/[\x00-\x20\x7f]/.test(decodeURIComponent(u.password))||!['','?sslmode=require'].includes(u.search))throw 0;
    return {host:NEON_HOST,port:5432,database:'neondb',user:roles[kind],password:decodeURIComponent(u.password),
      ssl:{rejectUnauthorized:true,servername:NEON_HOST,minVersion:'TLSv1.2'},enableChannelBinding:true,
      max:1,connectionTimeoutMillis:1000,idleTimeoutMillis:1000,query_timeout:1500,
      statement_timeout:700,lock_timeout:200,idle_in_transaction_session_timeout:1500,
      application_name:'scout_live_'+kind,options:'-c synchronous_commit=on',allowExitOnIdle:true};
  } catch(e) {if(e instanceof LedgerError)throw e;throw new LedgerError('invalid_database_configuration');}
}
const roleSql=`SELECT r.rolname=$1 AND NOT r.rolsuper AND NOT r.rolcreatedb AND NOT r.rolcreaterole AND NOT r.rolinherit AND NOT r.rolreplication AND NOT r.rolbypassrls AND r.rolconnlimit=2 AND current_database()='neondb'
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members WHERE member=r.oid)
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname IN ('scout_live','scout_lookup','scout_mint') AND t.relkind IN ('r','p') AND (pg_catalog.has_table_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR pg_catalog.pg_has_role(r.oid,t.relowner,'MEMBER')))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspname IN ('scout_mint','scout_lookup') AND pg_catalog.has_schema_privilege(r.oid,n.oid,'USAGE,CREATE'))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND pg_catalog.has_schema_privilege(r.oid,n.oid,'CREATE'))
 AS compatible FROM pg_catalog.pg_roles r WHERE r.rolname=session_user`;
const fnSql=`SELECT p.proname,pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex') AS hash,
 p.prosecdef,p.proconfig,pg_catalog.has_function_privilege(session_user,p.oid,'EXECUTE') AS allowed,
 NOT EXISTS(SELECT 1 FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee<>p.proowner AND (a.grantee=0 OR a.grantee<>CASE p.proname WHEN 'step' THEN pg_catalog.to_regrole('scout_live_worker')::oid WHEN 'snapshot' THEN pg_catalog.to_regrole('scout_live_reader')::oid WHEN 'stop' THEN pg_catalog.to_regrole('scout_live_stop')::oid ELSE 0 END OR a.is_grantable)) AS private
 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='scout_live'`;
function proof(socket,host) {
  if(!socket?.encrypted||socket.authorized!==true||socket.servername!==host||!['TLSv1.2','TLSv1.3'].includes(socket.getProtocol?.()))throw new LedgerError();
}
const iso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
export function validReply(r) {
  return r&&r.v===1&&typeof r.ok==='boolean'&&typeof r.stopped==='boolean'&&r.scope===SCOPE&&Number.isSafeInteger(r.framesReceived)&&Number.isSafeInteger(r.bytesReceived)&&iso(r.serverTime)&&
    (r.leaseUntil===null||iso(r.leaseUntil))&&(!r.ok||(r.session&&r.head&&(r.worker&&r.fence&&r.leaseUntil||r.worker===null&&r.fence===null&&r.leaseUntil===null)));
}
function validSnapshot(r) {
  return r?.version==='scout-live/1'&&['waiting','observing','stale','stopped'].includes(r.status)&&iso(r.observedAt)&&Array.isArray(r.events)&&r.events.length<=20&&r.events.every(validEvent)&&r.counts&&Number.isSafeInteger(r.counts.provisional)&&Number.isSafeInteger(r.counts.finalized)&&r.health&&typeof r.health.stopped==='boolean'&&r.retention?.seconds===3600&&r.retention?.maxRecords===200;
}
/** Injectable pool seam for real disposable local PostgreSQL/TLS tests; runtime always supplies verified native TLS. */
export function postgresPort(pool,{kind,host}) {
  if(!roles[kind]||typeof host!=='string')throw new LedgerError();
  let closed=false;
  return Object.freeze({
    async transact(command,{signal}={}) {
      if(closed||signal?.aborted||pool.waitingCount>0)throw new LedgerError();
      if(kind==='worker'&&!validCommand(command)||kind!=='worker'&&command!==null)throw new LedgerError('invalid_command');
      let client,committed=false,timer; const until=Date.now()+3000;
      try {
        client=await pool.connect();
        if(signal?.aborted||Date.now()>until)throw new LedgerError();
        proof(client.connection?.stream,host);
        // Cancels a stalled/aborted native connection, never returns an uncertain ticket for provider I/O.
        const destroy=()=>client?.connection?.stream?.destroy();
        timer=setTimeout(destroy,Math.max(1,until-Date.now()));
        signal?.addEventListener('abort',destroy,{once:true});
        try {
          await client.query(kind==='reader'?'BEGIN READ ONLY':'BEGIN');
          await client.query("SET LOCAL synchronous_commit=on; SET LOCAL statement_timeout='700ms'; SET LOCAL lock_timeout='200ms'; SET LOCAL search_path=pg_catalog");
          const rp=await client.query(roleSql,[roles[kind]]);
          if(rp.rowCount!==1||rp.rows[0].compatible!==true)throw new LedgerError('database_incompatible');
          const fp=await client.query(fnSql);
          const names=Object.keys(fingerprints).sort();
          if(fp.rows.length!==names.length||fp.rows.map(x=>x.proname).sort().join(',')!==names.join(','))throw new LedgerError('database_incompatible');
          for(const f of fp.rows){
            const allowed=f.proname===({worker:'step',reader:'snapshot',stop:'stop'}[kind]);
            if(f.hash!==fingerprints[f.proname]||!f.private||f.allowed!==allowed||JSON.stringify(f.proconfig)!=='["search_path=pg_catalog"]'||f.prosecdef!==['step','snapshot','stop'].includes(f.proname))throw new LedgerError('database_incompatible');
          }
          const sql={worker:'SELECT scout_live.step($1::jsonb) AS reply',reader:'SELECT scout_live.snapshot() AS reply',stop:'SELECT scout_live.stop() AS reply'}[kind];
          const r=await client.query(sql,kind==='worker'?[JSON.stringify(command)]:[]);
          const value=r.rows[0]?.reply;
          if(r.rowCount!==1||kind==='worker'&&!validReply(value)||kind==='reader'&&!validSnapshot(value)||kind==='stop'&&!(value?.version==='scout-live/1'&&value.status==='stopped'&&iso(value.observedAt)))throw new LedgerError();
          await client.query('COMMIT');committed=true;
          if(signal?.aborted||Date.now()>until)throw new LedgerError();
          return value;
        } finally {signal?.removeEventListener('abort',destroy);}
      } catch {throw new LedgerError();}
      finally {clearTimeout(timer);client?.release(!committed);}
    },
    async close(){closed=true;await pool.end();},
  });
}
export function nativeStore(kind,env=process.env) {
  const config=databaseConfig(env[{worker:'SCOUT_LIVE_WORKER_DATABASE_URL',reader:'SCOUT_LIVE_READER_DATABASE_URL',stop:'SCOUT_LIVE_STOP_DATABASE_URL'}[kind]],kind);
  const pool=new Pool(config);pool.on('error',()=>{});
  return postgresPort(pool,{kind,host:NEON_HOST});
}
export function fingerprintSource(sql) {
  return Object.fromEntries([...sql.matchAll(/CREATE FUNCTION scout_live\.(\w+)[\s\S]*?AS \$fn\$([\s\S]*?)\$fn\$;/g)].map(m=>[m[1],createHash('sha256').update(m[2]).digest('hex')]));
}
