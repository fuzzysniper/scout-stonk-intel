// Integration TEST SETUP only. B owns the approved native-only PG fixture,
// installer, TLS/PLUS proof, transaction/protocol and independent anchor code.
// No implementation, SQL function, connection verifier or database is simulated.
import {requireLocalPg18Approval} from '../native-postgres/pg18-approval.mjs';requireLocalPg18Approval();
await import('../native-postgres/namespace-only.mjs');
export async function createOwnerPgContext(){
 const {fixture}=await import('../native-postgres/pg18-fixture.mjs');
 const {createRequire}=await import('node:module'),{randomBytes}=await import('node:crypto'),fs=await import('node:fs/promises'),path=await import('node:path');
 const require=createRequire(import.meta.url),root=process.env.REMOTE_BUILD;
 const {Pool}=require('pg'),{StrictJournalClient,strictBindingEstablished}=require(root+'/ops/v4-journal/native-tls.mjs');
 const {transaction,PROOF,checkProof}=require(root+'/lib/native-pilot/postgres/connection.js'),{postgresProtocol,seed,canonical}=require(root+'/lib/native-pilot/postgres/protocol.js'),{bootstrapSql}=require(root+'/lib/native-pilot/postgres/package.js');
 const {policy}=await import('../native-pilot/fixtures.mjs'),{fileAnchor}=await import('../../experiments/jupiter-beta-approval/integration/durable/anchor.mjs');
 const db=await fixture(),secret=randomBytes(32).toString('hex'),pools=new Set();let counter=0,installer;
 const makePool=(user,max=1)=>{const pool=new Pool({...db.config(user),Client:StrictJournalClient,password:secret,max});pool.on('error',()=>{});pools.add(pool);return pool;};
 try{
  await db.owner.query(`CREATE ROLE native_test_installer LOGIN NOSUPERUSER CREATEROLE NOCREATEDB NOBYPASSRLS PASSWORD '${secret}'`);
  await db.owner.query('ALTER DATABASE unfarmd_v4_pilot OWNER TO native_test_installer');installer=makePool('native_test_installer');
  if((await installer.query('SELECT rolsuper FROM pg_roles WHERE rolname=current_user')).rows[0].rolsuper!==false)throw Error('NON_SUPERUSER_INSTALLER_REQUIRED');
  await installer.query(await fs.readFile('lib/native-pilot/postgres/schema.sql','utf8'));
  for(const user of ['unfarmd_native_login','unfarmd_native_stopper_login'])await installer.query(`CREATE ROLE ${user} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '${secret}'`);
  await installer.query('GRANT CONNECT ON DATABASE unfarmd_v4_pilot TO unfarmd_native_login,unfarmd_native_stopper_login; REVOKE ALL ON DATABASE unfarmd_v4_pilot FROM PUBLIC; REVOKE CREATE ON SCHEMA public FROM PUBLIC');
  await installer.query('GRANT unfarmd_native_app TO unfarmd_native_login WITH INHERIT TRUE, SET FALSE; GRANT unfarmd_native_stopper TO unfarmd_native_stopper_login WITH INHERIT TRUE, SET FALSE');
 }catch(error){await Promise.all([...pools].map(p=>p.end()));await db.close();throw error;}
 async function scenario(overrides={}){
  const at=Date.now(),p={...policy(),id:'current-union-'+(++counter),startsAt:at-1000,expiresAt:at+120000,...overrides};
  await installer.query(bootstrapSql(p,{mode:'local-fsync'}));const initial=seed(p),directory=path.join(db.dir,'independent-current-union-'+counter);
  await fs.mkdir(directory,{mode:0o700});await fs.writeFile(path.join(directory,'beta-anchor.jsonl'),canonical(initial.checkpoint)+'\n',{mode:0o600});
  const checkpoint=fileAnchor({directory,bootstrap:initial.checkpoint}),anchor={current:()=>checkpoint.current(),async advance(old,next){await checkpoint.advance(old,next);return checkpoint.current();}};
  const pool=makePool('unfarmd_native_login'),proof=async client=>{if(!strictBindingEstablished(client))throw Error('ACTUAL_NATIVE_PLUS_REQUIRED');checkProof((await client.query(PROOF)).rows[0]);};
  const tx=transaction(pool,initial.checkpoint.policyHash,proof),ledger=()=>postgresProtocol(p,(op,input)=>tx(op,{...input,durability:{mode:'local-fsync'}}),anchor);
  // Protected test observation of the ACTUAL row; never an application table grant.
  const read=async()=>{await installer.query('GRANT unfarmd_native_owner TO CURRENT_USER WITH SET TRUE, INHERIT FALSE');const client=await installer.connect();try{await client.query('SET ROLE unfarmd_native_owner');return (await client.query('SELECT state FROM unfarmd_native.policies WHERE policy_hash=$1',[initial.checkpoint.policyHash])).rows[0].state;}finally{await client.query('RESET ROLE');client.release();}};
  return {policy:p,pool,tx,ledger,anchor,read,async close(){if(pools.delete(pool))await pool.end();}};
 }
 return {scenario,db,installer,makePool,async close(){await Promise.all([...pools].map(p=>p.end()));pools.clear();await db.close();}};
}
