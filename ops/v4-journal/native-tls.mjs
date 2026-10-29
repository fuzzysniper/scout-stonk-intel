// UNINSTALLED strict native-pg review utility. Caller supplies secrets; never reads env.
// pg8.23.1 internal hooks are source-pinned and exercised with real TLS/SCRAM tests.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {checkServerIdentity,TLSSocket} from 'node:tls';
const require=createRequire(import.meta.url),{Client}=require('pg');
const fail=()=>new Error('journal_native_unavailable');
const proof=new WeakSet();
let driverChecked=false;
function checkDriver(){if(driverChecked)return;const m=JSON.parse(fs.readFileSync(new URL('./sources.json',import.meta.url),'utf8'));if(require('pg/package.json').version!==m.driver.version)throw fail();for(const [file,hash] of Object.entries(m.driver.files))if(createHash('sha256').update(fs.readFileSync(require.resolve(file))).digest('hex')!==hash)throw fail();driverChecked=true;}
export function tlsVerified(c){const s=c.connection?.stream;return !!(s instanceof TLSSocket&&s.encrypted&&s.authorized&&s.servername===c.__journalHost&&['TLSv1.2','TLSv1.3'].includes(s.getProtocol?.()??''));}
export class StrictJournalClient extends Client{
 constructor(config){
  checkDriver();if(!config||config.connection!==undefined||config.stream!==undefined||config.ssl?.checkServerIdentity!==undefined&&config.ssl.checkServerIdentity!==checkServerIdentity||config.connectionString!==undefined||config.database!=='unfarmd_v4_pilot'||config.ssl?.rejectUnauthorized!==true||!config.ssl?.servername||config.ssl.servername!==config.host||config.enableChannelBinding!==true||!Number.isInteger(config.connectionTimeoutMillis)||config.connectionTimeoutMillis<1||config.connectionTimeoutMillis>1000)throw fail();
  super(config);Object.defineProperty(this,'__journalHost',{value:config.host});
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
  if(typeof dsn!=='string'||dsn.length>4096||!/^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(approvedHost)||approvedHost.includes('-pooler.')||typeof ca!=='string'||!ca.includes('BEGIN CERTIFICATE'))throw fail();
  const u=new URL(dsn);if(!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!==approvedHost||u.pathname!=='/unfarmd_v4_pilot'||u.hash||u.port&&u.port!=='5432')throw fail();
  if(u.searchParams.get('sslmode')!=='verify-full'||u.searchParams.get('channel_binding')!=='require'||[...u.searchParams].length!==2)throw fail();
  const user=decodeURIComponent(u.username),password=decodeURIComponent(u.password);
  if(!/^unfarmd_v4_(journal|auth|pilot|erasure|stopper)_login$/.test(user)||!password||password.length>1024||/[\x00-\x1f\x7f]/.test(user+password))throw fail();
  return {host:approvedHost,port:5432,database:'unfarmd_v4_pilot',user,password,ssl:{ca,servername:approvedHost,rejectUnauthorized:true,minVersion:'TLSv1.2',checkServerIdentity},enableChannelBinding:true,connectionTimeoutMillis:1000,query_timeout:1200,statement_timeout:800,application_name:'unfarmd-v4-journal',options:'-c search_path=pg_catalog'};
 }catch{throw fail();}
}
