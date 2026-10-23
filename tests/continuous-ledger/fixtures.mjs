// Explicit SYNTHETIC LOCAL PostgreSQL/TLS, identities and source evidence. Never hosted.
import {Pool} from 'pg';
import {mkdtempSync,readFileSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {localPostgres} from '../onchain-api/postgres-harness.mjs';
import {databaseConfig,postgresPort,NEON_HOST} from '../../lib/scout-continuous/database.mjs';
import {VERSION,POLICY_HASH,SOURCE_HASH,hash} from '../../lib/scout-continuous/policy.mjs';
export const head='a'.repeat(40),PASSWORD='SYNTHETIC_CONTINUOUS_PASSWORD_167';
export const now=()=>new Date().toISOString();
export function grant(changes={}){return {version:VERSION,parent:randomUUID(),head,service:'srv-synthetic',policyHash:POLICY_HASH,sourcePolicyHash:SOURCE_HASH,startsAt:new Date(Date.now()-1000).toISOString(),endsAt:new Date(Date.now()+3600000).toISOString(),resetAt:new Date(Date.now()+86400000).toISOString(),allowanceCredits:1000000,otherReserveCredits:1000,incidentReserveCredits:1000,limits:{credits:10000,bytes:16777216*10,frames:20000*10,rpc:100,connections:10,children:10,auditRecords:1000},connectionCredits:100,rpcCredits:1,rightsHash:'b'.repeat(64),accountHash:'c'.repeat(64),retentionHash:'d'.repeat(64),notificationHash:'e'.repeat(64),mobileHash:'f'.repeat(64),sourceGo:true,hostingGo:true,rightsGo:true,spendGo:true,retentionGo:true,notificationGo:true,mobileGo:true,...changes};}
export const base=g=>({v:2,parent:g.parent,head:g.head,scope:POLICY_HASH,grantHash:hash(g),worker:randomUUID()});
export const health=(fields={})=>({state:'SUBSCRIBED',sourceState:'closed',reason:'OFFLINE_TEST',frames:0,bytes:0,ignored:0,duplicates:0,provisional:0,finalized:0,withheld:0,rpcAttempts:0,rpcBytes:0,connections:0,lastFrameAt:null,lastPongAt:null,lastRpcRoundTripMs:null,...fields});
export function record(i=1){
 let n=BigInt(i),s='';const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';while(n){s=alphabet[Number(n%58n)]+s;n/=58n;}s='1'.repeat(64-Buffer.from(BigInt(i).toString(16).padStart(2,'0'),'hex').length)+s;
 return {version:'scout-creation/1',signature:s,slot:100+i,receivedAt:now(),finality:'provisional',verification:'notification_only',mint:null,quoteMint:null,curve:null,tokenProgram:null,eventAt:null,blockTime:null,checkedAt:null,finalizedContextSlot:null,sourceClockVerified:false,notificationHash:'b'.repeat(64),identityHash:'d'.repeat(64),transactionHash:null,statusHash:null,reason:'WAIT_ORIGINAL_FINALIZED_TRANSACTION'};
}
export const finalized=r=>({...r,finality:'finalized',verification:'rpc_reported_finalized_same_provider',mint:'So11111111111111111111111111111111111111112',quoteMint:'11111111111111111111111111111111',curve:'11111111111111111111111111111111',tokenProgram:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',eventAt:r.receivedAt,checkedAt:now(),finalizedContextSlot:r.slot,transactionHash:'c'.repeat(64),statusHash:'e'.repeat(64),reason:'CREATION_IDENTITY_ONLY_NO_SAFETY_OR_MARKET_CLAIM'});
export async function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'scout-continuous-tls-')),key=join(dir,'test.key'),cert=join(dir,'test.crt');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN='+NEON_HOST,'-addext','subjectAltName=DNS:'+NEON_HOST,'-keyout',key,'-out',cert],{stdio:'ignore'});chmodSync(key,0o600);const ca=readFileSync(cert,'utf8');
 const listener=createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
 const db=await localPostgres({tls:{port,cert,key},database:'neondb',runtimeRole:'scout_mint_app'}),pools=new Set(),stores=new Map();
 try{await db.owner.query(readFileSync('lib/onchain-mint/server/postgres/lookup.sql','utf8'));await db.owner.query(readFileSync('lib/live-ledger/postgres/schema.sql','utf8'));await db.owner.query(readFileSync('lib/scout-continuous/postgres/schema.sql','utf8'));for(const kind of ['worker','reader','stop','maintenance'])await db.owner.query(`ALTER ROLE scout_continuous_${kind} PASSWORD '${PASSWORD}'`);}catch(e){await db.close();rmSync(dir,{recursive:true,force:true});throw e;}
 const pool=(kind,patch={})=>{const cfg=databaseConfig(`postgresql://scout_continuous_${kind}:${PASSWORD}@${NEON_HOST}/neondb?sslmode=require`,kind);const p=new Pool({...cfg,host:'127.0.0.1',port,ssl:{...cfg.ssl,ca},...patch});p.on('error',()=>{});pools.add(p);return p;};
 const store=(kind='worker',patch)=>{if(patch===undefined&&stores.has(kind))return stores.get(kind);const p=pool(kind,patch),raw=postgresPort(p,{kind,host:NEON_HOST});const result={...raw,async close(){pools.delete(p);if(stores.get(kind)===result)stores.delete(kind);await raw.close();}};if(patch===undefined)stores.set(kind,result);return result;};
 const closePools=async()=>{await Promise.all([...pools].map(p=>p.end()));pools.clear();stores.clear();};
 async function reset(g=grant()){
  await closePools();await db.owner.query('TRUNCATE scout_continuous.events,scout_continuous.first_seen,scout_continuous.tickets,scout_continuous.children,scout_continuous.deliveries,scout_continuous.notices,scout_continuous.control');
  await db.owner.query('INSERT INTO scout_continuous.control(id) VALUES(true)');
  // Fixture-only retired prior pilot, not an application recovery/installation command.
  await db.owner.query("UPDATE scout_live.control SET stopped=true,reason='owner',connected=false,source_state='closed',worker=NULL,fence=NULL,lease_until=NULL");
  const init=await db.owner.query('SELECT scout_continuous.initialize($1::jsonb) hash',[g]);if(init.rows[0].hash!==hash(g))throw Error('canonical_grant_hash_mismatch');return g;
 }
 async function assure(g){
  const m=store('maintenance'),scope={parent:g.parent,grantHash:hash(g)};
  const c=(await db.owner.query('SELECT ticket,usage FROM scout_continuous.control')).rows[0];const anchor={throughTicket:Number(c.ticket),throughCredits:c.usage.credits};
  await m.transact({...scope,op:'meter',observedAt:now(),balance:900000,attributed:true,mismatch:false,hardCapUntil:g.endsAt,receiptHash:'1'.repeat(64),...anchor});
  const retentionAt=now();await m.transact({...scope,op:'retention',observedAt:retentionAt,physicalThrough:retentionAt,backupsExcluded:true,receiptHash:'2'.repeat(64)});
  await m.transact({...scope,op:'watchdog',observedAt:now(),independent:true,shutdownCapable:true,receiptHash:'3'.repeat(64),...anchor});
  const n=await m.transact({...scope,op:'leaseNotice'});if(n.status==='leased')await m.transact({...scope,op:'ackNotice',id:n.id,lease:n.lease,deliveredAt:now(),receiptHash:'4'.repeat(64)});
  await m.close();
 }
 return {db,pool,store,reset,assure,async close(){await closePools();await db.close();rmSync(dir,{recursive:true,force:true});},async restart(){await closePools();await db.crashRestart();}};
}
