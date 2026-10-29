// UNINSTALLED, owner-operated ONE connection / read-only transaction. No env/DSN/key input.
import {createHash} from 'node:crypto';
import {StrictJournalClient,strictBindingEstablished} from '../v4-journal/native-tls.mjs';
export const PURPOSE='READ_NEON_COMPATIBILITY_ONCE';
const out=(status,sqlExecuted=false)=>Object.freeze({version:'unfarmd-neon-native-preflight/1',status,sqlExecuted,durabilityProven:false,sourceGo:false,saveGo:false});
export const COMPATIBILITY_SQL=`SELECT
 current_setting('server_version_num')::int/10000=18 AS pg18,
 current_database()='unfarmd_v4_pilot' AND NOT pg_is_in_recovery() AS primary_database,
 current_setting('fsync')='off' AND current_setting('full_page_writes')='off'
 AND current_setting('synchronous_commit')='on' AND current_setting('synchronous_standby_names')='walproposer' AS neon_wal_shape,
 current_setting('neon.project_id',true)='twilight-hall-57571802'
 AND current_setting('neon.branch_id',true)='br-sweet-voice-b4x4et5q'
 AND current_setting('neon.tenant_id',true)=$1 AND current_setting('neon.timeline_id',true)=$2
 AND (SELECT count(*)=4 FROM pg_settings WHERE name IN ('neon.project_id','neon.branch_id','neon.tenant_id','neon.timeline_id') AND context='postmaster') AS provider_identity,
 EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolcanlogin AND NOT(rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls))
 AND current_user ~ '^unfarmd_v4_(journal|auth|pilot|erasure|stopper)_login$'
 AND NOT has_database_privilege(current_user,current_database(),'CREATE,TEMP')
 AND NOT has_schema_privilege(current_user,'public','CREATE')
 AND NOT pg_has_role(current_user,'unfarmd_v4_boundary_owner','MEMBER')
 AND NOT pg_has_role(current_user,'unfarmd_v4_deploy_owner','MEMBER')
 AND NOT pg_has_role(current_user,'unfarmd_journal_owner','MEMBER')
 AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE pg_has_role(current_user,r.oid,'MEMBER') AND r.rolname<>current_user AND r.rolname<>ALL(CASE current_user WHEN 'unfarmd_v4_journal_login' THEN ARRAY['unfarmd_journal_app','unfarmd_thesis_rate_app'] WHEN 'unfarmd_v4_auth_login' THEN ARRAY['unfarmd_v4_auth_reader'] WHEN 'unfarmd_v4_pilot_login' THEN ARRAY['unfarmd_v4_pilot_app'] WHEN 'unfarmd_v4_erasure_login' THEN ARRAY['unfarmd_journal_erasure'] ELSE ARRAY[]::text[] END))
 AND NOT EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.admin_option AND pg_has_role(current_user,m.member,'MEMBER')) AS restricted_role`;
/** No executable CLI or default connection: separate owner approval must precede any use. */
export async function runNativeAcceptance(client,approval){
 if(approval===undefined)return out('disabled');
 if(!approval||typeof approval!=='object'||Array.isArray(approval)||![null,Object.prototype].includes(Object.getPrototypeOf(approval))||Object.values(Object.getOwnPropertyDescriptors(approval)).some(d=>!('value' in d)))return out('invalid_target');
 if(approval.purpose!==PURPOSE)return out('disabled');
 if(!(client instanceof StrictJournalClient)||!approval||typeof approval.host!=='string'||client.__journalHost!==approval.host||typeof approval.tenantId!=='string'||!/^[a-f0-9]{32}$/.test(approval.tenantId)||typeof approval.timelineId!=='string'||!/^[a-f0-9]{32}$/.test(approval.timelineId))return out('invalid_target');
 const bindingSha256=createHash('sha256').update(JSON.stringify({purpose:PURPOSE,host:approval.host,tenantId:approval.tenantId,timelineId:approval.timelineId,projectId:'twilight-hall-57571802',branchId:'br-sweet-voice-b4x4et5q',database:'unfarmd_v4_pilot'})).digest('hex');
 const observed=status=>Object.freeze({...out(status,true),bindingSha256,observedAtMs:Date.now()});
 let sqlExecuted=false,timer;
 const work=async()=>{try{
  await client.connect();if(!strictBindingEstablished(client))return out('blocked_tls_or_plus');
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');sqlExecuted=true;
  await client.query("SET LOCAL search_path=pg_catalog; SET LOCAL statement_timeout='600ms'; SET LOCAL lock_timeout='100ms'; SET LOCAL idle_in_transaction_session_timeout='1500ms'");
  const r=await client.query(COMPATIBILITY_SQL,[approval.tenantId,approval.timelineId]);
  await client.query('ROLLBACK');
  if(r.rowCount!==1||r.rows[0]?.restricted_role!==true)return out('blocked_role',true);
  if(!['pg18','primary_database','neon_wal_shape','provider_identity'].every(k=>r.rows[0][k]===true))return out('blocked_provider_shape',true);
  return observed('native_plus_and_neon_shape_observed');
 }catch{return out('unavailable_uncertain',sqlExecuted);}finally{clearTimeout(timer);let closeTimer;await Promise.race([client.end().catch(()=>{}),new Promise(resolve=>{closeTimer=setTimeout(()=>{client.connection?.stream?.destroy();resolve();},100);})]);clearTimeout(closeTimer);}};
 const timeout=new Promise(resolve=>{timer=setTimeout(()=>{client.end().catch(()=>{});client.connection?.stream?.destroy();resolve(out('unavailable_uncertain',sqlExecuted));},2500);});
 return Promise.race([work(),timeout]);
}
