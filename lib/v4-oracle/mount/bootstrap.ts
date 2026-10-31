import 'server-only';
import {Pool,type ClientConfig} from 'pg';
import {checkServerIdentity} from 'node:tls';
import {StrictJournalClient} from '../../../ops/v4-journal/native-tls.mjs';
import {TARGET} from '../../v4-owner-preview/release';
import {inspectMountPlan,type MountPlan} from './admission';
import {createNativeRuntime,type NativeRuntime} from './runtime';
/** Pure target/role parser. No connection, discovery, mutation or credential output. */
export function nativePoolConfiguration(dsn:string,ca:string,role:'unfarmd_v4_issuer_login'|'unfarmd_v4_ca_login'):ClientConfig{
 const u=new URL(dsn),password=decodeURIComponent(u.password);
 if(dsn.length>4096||!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!==TARGET.host||u.pathname!=='/'+TARGET.database||u.port&&u.port!=='5432'||u.hash||decodeURIComponent(u.username)!==role||!password||password.length>1024||/[\x00-\x1f\x7f]/.test(password)
  ||u.searchParams.get('sslmode')!=='verify-full'||u.searchParams.get('channel_binding')!=='require'||[...u.searchParams].length!==2||!ca.includes('BEGIN CERTIFICATE'))throw Error('native_configuration_denied');
 return {host:TARGET.host,port:5432,database:TARGET.database,user:role,password,ssl:{ca,servername:TARGET.host,rejectUnauthorized:true,minVersion:'TLSv1.2',checkServerIdentity},enableChannelBinding:true,max:1,connectionTimeoutMillis:1000,query_timeout:1200,statement_timeout:800,options:'-c search_path=pg_catalog'}as ClientConfig;
}
let installed:NativeRuntime|null=null,attempted=false;
/** Called only AFTER signed exact release + source grant + rights + HTTP admission.
 * Installation of these credentials requires a SEPARATE owner GO; no installer is included.
 */
export function bootstrapNativeMount(plan:MountPlan):NativeRuntime|null{
 if(!inspectMountPlan(plan,true))return null;if(attempted)return installed;attempted=true;
 const pools:Pool[]=[];try{
  const p=inspectMountPlan(plan);if(!p||!Object.hasOwn(process.env,'UNFARMD_ORACLE_HELIUS_DATA_KEY'))return null;
  const need=(k:string)=>{const v=process.env[k];if(!v)throw Error('native_configuration_unavailable');return v;};
  const ca=need('UNFARMD_ORACLE_PG_CA'),secret=need('UNFARMD_ORACLE_AUTH_SECRET');
  const issuer=nativePoolConfiguration(need('UNFARMD_ORACLE_ISSUER_DSN'),ca,'unfarmd_v4_issuer_login'),source=nativePoolConfiguration(need('UNFARMD_ORACLE_CA_DSN'),ca,'unfarmd_v4_ca_login');
  const pool=(c:ClientConfig)=>{const v=new Pool({...c,Client:StrictJournalClient});v.on('error',()=>{});pools.push(v);return v;};
  // Never reuse legacy production/proof key names. A reads this DATA key only
  // after actual owner verification and an irreversible durable reserve ACK.
  const readKey=()=>process.env.UNFARMD_ORACLE_HELIUS_DATA_KEY;
  installed=createNativeRuntime(plan,{ownerAuthority:p.ownerAuthority,release:p.release,authority:p.authority,approval:p.approval,issuerPool:pool(issuer),authSecret:secret,pool:pool(source),tlsHost:TARGET.host,review:p.review,readKey});return installed;
 }catch{for(const p of pools)void p.end().catch(()=>{});return null;}
}
