// UNINSTALLED strict native-pg review utility. Caller supplies secrets; never reads env.
// pg8.23.1 hooks are source-pinned. This successor tests offline failure transcripts;
// real TLS/SCRAM negotiation and PostgreSQL execution still require separate approval.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {checkServerIdentity,TLSSocket} from 'node:tls';
const require=createRequire(import.meta.url),{Client}=require('pg');
const fail=()=>new Error('beta_native_unavailable');
export const isPoolerHost=host=>typeof host==='string'&&host.split('.')[0].toLowerCase().endsWith('-pooler');
const proof=new WeakSet();
let driverChecked=false;
function checkDriver(){if(driverChecked)return;const m=JSON.parse(fs.readFileSync(new URL('./driver-pins.json',import.meta.url),'utf8'));if(require('pg/package.json').version!==m.driver.version)throw fail();for(const [file,hash] of Object.entries(m.driver.files))if(createHash('sha256').update(fs.readFileSync(require.resolve(file))).digest('hex')!==hash)throw fail();driverChecked=true;}
export function tlsVerified(c){const s=c.connection?.stream;return !!(s instanceof TLSSocket&&s.encrypted&&s.authorized&&s.servername===c.__betaHost&&['TLSv1.2','TLSv1.3'].includes(s.getProtocol?.()??''));}
export class StrictBetaClient extends Client{
 constructor(config){
  let host;try{const h=Object.getOwnPropertyDescriptor(config,'host');if(!h||!('value'in h)||typeof h.value!=='string'||isPoolerHost(h.value))throw fail();host=h.value;}catch{throw fail();}
  checkDriver();if(!config||config.connection!==undefined||config.stream!==undefined||config.ssl?.checkServerIdentity!==undefined&&config.ssl.checkServerIdentity!==checkServerIdentity||config.connectionString!==undefined||config.database!=='unfarmd_beta_authority'||config.ssl?.rejectUnauthorized!==true||!config.ssl?.servername||config.ssl.servername!==host||config.enableChannelBinding!==true||!Number.isInteger(config.connectionTimeoutMillis)||config.connectionTimeoutMillis<1||config.connectionTimeoutMillis>1000)throw fail();
  // pg-pool makes passwords non-enumerable. Preserve descriptors while fixing the host once.
  const descriptors=Object.getOwnPropertyDescriptors(config);descriptors.host={value:host,enumerable:true};
  super(Object.create(Object.getPrototypeOf(config),descriptors));Object.defineProperty(this,'__betaHost',{value:host});
 }
 _deny(){this.connection?.stream?.destroy();this._handleErrorWhileConnecting(fail());}
 _handleAuthCleartextPassword(){this._deny();}
 _handleAuthMD5Password(){this._deny();}
 _handleAuthSASL(msg){if(!tlsVerified(this)||!Array.isArray(msg.mechanisms)||!msg.mechanisms.includes('SCRAM-SHA-256-PLUS'))return this._deny();super._handleAuthSASL(msg);}
 _handleAuthSASLFinal(msg){const plus=this.saslSession?.mechanism==='SCRAM-SHA-256-PLUS';super._handleAuthSASLFinal(msg);if(plus&&this.saslSession===null&&tlsVerified(this))proof.add(this);else this._deny();}
 _handleReadyForQuery(msg){if(!proof.has(this)||!tlsVerified(this))return this._deny();super._handleReadyForQuery(msg);}
 connect(callback){const attempt=(async()=>{try{await super.connect();if(!proof.has(this)||!tlsVerified(this))throw fail();}catch{this.connection?.stream?.destroy();throw fail();}})();if(callback){attempt.then(()=>callback(null,this),e=>callback(e));return;}return attempt;}
}
export const strictBindingEstablished=c=>proof.has(c)&&tlsVerified(c);
export function configuration(dsn,approvedHost,ca){
 try{
  if(typeof dsn!=='string'||dsn.length>4096||!/^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(approvedHost)||isPoolerHost(approvedHost)||typeof ca!=='string'||!ca.includes('BEGIN CERTIFICATE'))throw fail();
  const u=new URL(dsn);if(!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!==approvedHost||u.pathname!=='/unfarmd_beta_authority'||u.hash||u.port&&u.port!=='5432')throw fail();
  if(u.searchParams.get('sslmode')!=='verify-full'||u.searchParams.get('channel_binding')!=='require'||[...u.searchParams].length!==2)throw fail();
  const user=decodeURIComponent(u.username),password=decodeURIComponent(u.password);
  if(!/^unfarmd_beta_(validator|consumer|stopper)_login$/.test(user)||!password||password.length>1024||/[\x00-\x1f\x7f]/.test(user+password))throw fail();
  return {host:approvedHost,port:5432,database:'unfarmd_beta_authority',user,password,ssl:{ca,servername:approvedHost,rejectUnauthorized:true,minVersion:'TLSv1.2',checkServerIdentity},enableChannelBinding:true,connectionTimeoutMillis:1000,query_timeout:1200,statement_timeout:800,application_name:'unfarmd-beta-authority',options:'-c search_path=pg_catalog'};
 }catch{throw fail();}
}

export async function handshake(c,role){
 const expected=JSON.parse(fs.readFileSync(new URL('./function-pins.json',import.meta.url),'utf8'));
 const r=await c.query(`SELECT current_database() AS db,current_user AS login,
  (SELECT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls FROM pg_roles WHERE rolname=current_user) AS restricted,
  pg_has_role(current_user,'unfarmd_beta_owner','MEMBER') AS owner_member,
  has_database_privilege(current_user,current_database(),'CREATE') AS db_create,
  has_schema_privilege(current_user,'unfarmd_beta','CREATE') AS schema_create,
  (SELECT coalesce(bool_or(has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')),false) FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='unfarmd_beta' AND c.relkind IN ('r','p')) AS table_access,
  (SELECT jsonb_object_agg(p.proname,jsonb_build_object('hash',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'config',p.proconfig,'execute',has_function_privilege(current_user,p.oid,'EXECUTE'))) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='unfarmd_beta') AS functions`);
 const x=r.rows?.[0];if(r.rows?.length!==1||x.db!=='unfarmd_beta_authority'||x.login!=='unfarmd_beta_'+role+'_login'||x.restricted!==true||x.owner_member!==false||x.db_create!==false||x.schema_create!==false||x.table_access!==false)throw fail();
 const names=Object.keys(expected).sort();if(JSON.stringify(Object.keys(x.functions??{}).sort())!==JSON.stringify(names))throw fail();
 for(const name of names){const f=x.functions[name];if(f.hash!==expected[name]||f.owner!=='unfarmd_beta_owner'||f.definer!==true||JSON.stringify(f.config)!==JSON.stringify(['search_path=pg_catalog'])||f.execute!==(name===(role==='validator'?'issue':role==='consumer'?'consume':'stop')))throw fail();}
}
