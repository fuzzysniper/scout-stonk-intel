import 'server-only';
import type {Pool,PoolClient} from 'pg';
import {checkServerIdentity} from 'node:tls';
import {StrictJournalClient,strictBindingEstablished} from '../../../ops/v4-journal/native-tls.mjs';
import {nativeSetupRecord,type NativeSetupAdmission} from '../admission/installed';
import {TARGET} from '../../v4-owner-preview/release';
import pins from './pins';
import {need,policy,hash,type Policy} from '../plan';
import {postgresProtocol,canonical,seed,type Transaction} from './protocol';
import {remoteCheckpoint,type Custody} from './checkpoint';
export type NativePostgresConfiguration=Readonly<{dsn:string;ca:string;host:string;admission:NativeSetupAdmission;custody:Custody;checkpointKey:Buffer}>;
/** Pure parser; only the new login and exact reviewed DIRECT host are accepted. Never env/default DSN. */
export function nativeConfiguration(dsn:string,host:string,ca:string,stopper=false){
 try{
  need(host===TARGET.host&&!host.split('.')[0].endsWith('-pooler')&&typeof ca==='string'&&ca.includes('BEGIN CERTIFICATE')&&typeof dsn==='string'&&dsn.length<=4096);
  const u=new URL(dsn);need(['postgres:','postgresql:'].includes(u.protocol)&&u.hostname===host&&(!u.port||u.port==='5432')&&u.pathname==='/unfarmd_v4_pilot'&&!u.hash
   &&u.searchParams.get('sslmode')==='verify-full'&&u.searchParams.get('channel_binding')==='require'&&[...u.searchParams].length===2);
  const user=decodeURIComponent(u.username),password=decodeURIComponent(u.password);need(user===(stopper?'unfarmd_native_stopper_login':'unfarmd_native_login')&&password.length>=1&&password.length<=1024&&!/[\x00-\x1f\x7f]/.test(password));
  return {host,port:5432,database:'unfarmd_v4_pilot',user,password,ssl:{ca,servername:host,rejectUnauthorized:true,minVersion:'TLSv1.2' as const,checkServerIdentity},enableChannelBinding:true,
   connectionTimeoutMillis:1000,query_timeout:1200,statement_timeout:800,application_name:'unfarmd-native-pilot',options:'-c search_path=pg_catalog'};
 }catch{throw Error('native_pilot_held');}
}
export const PROOF=`SELECT current_database() AS db,current_user AS login,session_user=current_user AS direct,
 current_setting('server_version_num')::int/10000=18 AND current_setting('synchronous_commit')='on' AND NOT pg_is_in_recovery() AS primary_ok,
 NOT has_database_privilege(current_user,current_database(),'CREATE,TEMP') AND NOT has_schema_privilege(current_user,'public','CREATE') AND NOT has_schema_privilege(current_user,'unfarmd_native','CREATE')
 AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname NOT IN(current_user,'unfarmd_native_app','unfarmd_native_stopper') AND pg_has_role(current_user,oid,'MEMBER'))
 AND NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE admin_option AND pg_has_role(current_user,member,'MEMBER'))
 AND NOT EXISTS(SELECT 1 FROM pg_proc f JOIN pg_namespace n ON n.oid=f.pronamespace WHERE n.nspname<>'unfarmd_native' AND (n.nspname LIKE 'unfarmd_%' OR n.nspname LIKE 'scout_%') AND has_function_privilege(current_user,f.oid,'EXECUTE'))
 AND EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolcanlogin AND NOT(rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls OR rolreplication)) AS restricted,
 (SELECT count(*)=2 AND bool_and(c.relpersistence='p' AND NOT c.relrowsecurity AND pg_get_userbyid(c.relowner)='unfarmd_native_owner'
 AND NOT has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='unfarmd_native' AND c.relkind IN ('r','p')) AS tables_ok,
 (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='unfarmd_native') AS function_count,
 (SELECT jsonb_object_agg(p.proname,jsonb_build_object('sha',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'config',p.proconfig,'execute',has_function_privilege(current_user,p.oid,'EXECUTE'),
 'public',EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE'))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='unfarmd_native') AS functions,
 EXISTS(SELECT 1 FROM pg_roles WHERE rolname='unfarmd_native_owner' AND NOT(rolcanlogin OR rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)) AS owner_ok`;
export function checkProof(x:unknown,stopper=false){
 const r=x as {db?:string;login?:string;direct?:boolean;primary_ok?:boolean;restricted?:boolean;tables_ok?:boolean;owner_ok?:boolean;function_count?:number;functions?:Record<string,{sha:string;owner:string;definer:boolean;config:string[];execute:boolean;public:boolean}>};
 need(r?.db==='unfarmd_v4_pilot'&&r.login===(stopper?'unfarmd_native_stopper_login':'unfarmd_native_login')&&r.direct===true&&r.primary_ok===true&&r.restricted===true&&r.tables_ok===true&&r.owner_ok===true&&Number(r.function_count)===4);
 need(Object.keys(r.functions??{}).sort().join(',')===Object.keys(pins.functions).sort().join(','));
 for(const [name,sha]of Object.entries(pins.functions)){const f=r.functions![name];need(f.sha===sha&&f.owner==='unfarmd_native_owner'&&f.definer===['step','stop'].includes(name)&&JSON.stringify(f.config)==='["search_path=pg_catalog"]'&&f.public===false&&f.execute===(name==='stop'||!stopper&&name==='step'));}
}
/** Real transaction ordering shared with the transcript harness. No reconnect/retry/refund. */
export function transaction(pool:Pick<Pool,'connect'>,binding:string,proof:(c:PoolClient)=>Promise<void>):Transaction{
 return async(op,input)=>{
  let c:PoolClient|undefined,committed=false;
  try{
   c=await pool.connect();
   await c.query('BEGIN');await c.query("SET LOCAL synchronous_commit=on; SET LOCAL statement_timeout='800ms'; SET LOCAL lock_timeout='100ms'; SET LOCAL idle_in_transaction_session_timeout='1500ms'; SET LOCAL search_path=pg_catalog");
   await proof(c);
   const q=op==='stop'?'SELECT unfarmd_native.stop($1::text,$2::jsonb) AS result':'SELECT unfarmd_native.step($3::text,$1::text,$2::jsonb) AS result';
   const r=await c.query(q,op==='stop'?[binding,JSON.stringify(input)]:[binding,JSON.stringify(input),op]);need(r.rowCount===1);
   // Snapshot BEFORE COMMIT's await; a driver/caller mutation cannot turn STOP into success.
   const result=JSON.parse(canonical(r.rows[0].result));await c.query('COMMIT');committed=true;return result;
  }catch{throw Error('native_pilot_held');}finally{if(c)try{await c.release(!committed);}catch{throw Error('native_pilot_held');}}
 };
}
/** Concrete native-pg+authenticated remote witness. Nothing connects at construction. */
export function openPostgresLedger(pInput:Policy,config:NativePostgresConfiguration){
 const p=policy(pInput),binding=seed(p).checkpoint.policyHash;
 const admitted=nativeSetupRecord(config.admission,p),record=admitted.record.database,custody=admitted.record.checkpoint;
 need(hash(config.ca)===record.caSha256&&config.host===record.host&&config.custody.policyHash===binding&&config.custody.origin===custody.origin&&config.custody.keySha256===custody.keySha256&&config.custody.reviewSha256===custody.reviewSha256&&config.custody.origin!==p.origin);
 const connection=nativeConfiguration(config.dsn,config.host,config.ca);
 // Fresh bounded native client per transaction: no frozen Vercel idle-pool dependency.
 const pool={async connect(){const c=new StrictJournalClient(connection);await c.connect();
  return Object.assign(c,{async release(broken=false){const stream=(c as unknown as {connection:{stream:{destroy:()=>void}}}).connection.stream;if(broken)stream.destroy();let timer:NodeJS.Timeout|undefined;
   try{await Promise.race([c.end().catch(()=>{}),new Promise<void>(resolve=>{timer=setTimeout(()=>{stream.destroy();resolve();},250);})]);}finally{clearTimeout(timer);}
  }}) as PoolClient;
 }} as Pick<Pool,'connect'>;
 const anchor=remoteCheckpoint(config.custody,config.checkpointKey);
 const proof=async(c:PoolClient)=>{
  need(strictBindingEstablished(c));nativeSetupRecord(config.admission,p);checkProof((await c.query(PROOF)).rows[0]);
  checkPhysicalProof((await c.query(PHYSICAL_PROOF,[record.project,record.branch,record.tenantId,record.timelineId])).rows[0]);
 };
 const tx=transaction(pool,binding,proof),durability=Object.freeze({mode:'neon-safekeeper-quorum/v1',tenantId:record.tenantId,timelineId:record.timelineId,admissionSha256:admitted.sha256,custodySha256:config.custody.reviewSha256});
 return postgresProtocol(p,(op,input)=>tx(op,{...input,durability}),anchor);
}

/** Real Neon shape/registered postmaster identities, checked on EVERY native transaction.
 * A manifest hash or session-set custom GUC is not physical evidence. */
export const PHYSICAL_PROOF=`SELECT current_setting('fsync')='off' AND current_setting('full_page_writes')='off'
 AND current_setting('synchronous_commit')='on' AND current_setting('synchronous_standby_names')='walproposer' AND NOT pg_is_in_recovery()
 AND current_setting('neon.project_id',true)=$1 AND current_setting('neon.branch_id',true)=$2
 AND current_setting('neon.tenant_id',true)=$3 AND current_setting('neon.timeline_id',true)=$4
 AND (SELECT count(*)=4 FROM pg_settings WHERE name IN ('neon.project_id','neon.branch_id','neon.tenant_id','neon.timeline_id') AND context='postmaster') AS physical_ok`;
export function checkPhysicalProof(x:unknown){need(x&&typeof x==='object'&&(x as {physical_ok?:boolean}).physical_ok===true);}
