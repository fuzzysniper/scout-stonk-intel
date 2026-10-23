// Opt-in OFFLINE integration with B's separately reviewed worktree. Local TLS PostgreSQL only.
// All event fixtures, credentials and source callbacks here are invented test data.
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:net';
import {execFileSync} from 'node:child_process';
import {Pool} from 'pg';
import {localPostgres} from '../../../tests/onchain-api/postgres-harness.mjs';
import {adaptStore} from '../store-adapter.mjs';
import {Worker,OfflineSource,fixture,ack,grant,policy,MINT} from './fixtures.mjs';
const root=process.env.SCOUT_LIVE_B_TREE;
if(!root||!resolve(root).startsWith('/tmp/'))throw Error('LOCAL_B_WORKTREE_REQUIRED');
const {postgresPort,databaseConfig,NEON_HOST}=await import(pathToFileURL(join(root,'lib/live-ledger/database.mjs')));
const {SCOPE,validCommand}=await import(pathToFileURL(join(root,'lib/live-ledger/policy.mjs')));
const password='SYNTHETIC_LOCAL_ONLY_LEDGER_167',pools=new Set();let db,dir,ca,port;
before(async()=>{
  dir=mkdtempSync(join(tmpdir(),'scout-A-B-local-'));const key=join(dir,'tls.key'),cert=join(dir,'tls.crt');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN='+NEON_HOST,'-addext','subjectAltName=DNS:'+NEON_HOST,'-keyout',key,'-out',cert],{stdio:'ignore'});chmodSync(key,0o600);ca=readFileSync(cert,'utf8');
  const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));port=probe.address().port;await new Promise(r=>probe.close(r));
  db=await localPostgres({tls:{port,cert,key},database:'neondb',runtimeRole:'scout_mint_app'});
  await db.owner.query(readFileSync('lib/onchain-mint/server/postgres/lookup.sql','utf8'));
  await db.owner.query(readFileSync(join(root,'lib/live-ledger/postgres/schema.sql'),'utf8'));
  for(const kind of ['worker','reader','stop'])await db.owner.query(`ALTER ROLE scout_live_${kind} PASSWORD '${password}'`);
});
after(async()=>{await Promise.all([...pools].map(p=>p.end()));await db?.close();if(dir)rmSync(dir,{recursive:true,force:true});});
beforeEach(async()=>{await db.owner.query('TRUNCATE scout_live.events,scout_live.control');});
function store(kind){
  const cfg=databaseConfig(`postgresql://scout_live_${kind}:${password}@${NEON_HOST}/neondb?sslmode=require`,kind);
  const pool=new Pool({...cfg,host:'127.0.0.1',port,ssl:{...cfg.ssl,ca}});pool.on('error',()=>{});pools.add(pool);
  const raw=postgresPort(pool,{kind,host:NEON_HOST});return {...raw,async close(){pools.delete(pool);await raw.close();}};
}
async function scenario(quote){
  assert.equal(SCOPE,policy.SCOPE_HASH);const a={...grant(),notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString()};
  await db.owner.query(`INSERT INTO scout_live.control(id,approved,session,head,starts_at,expires_at,connection_credits,rpc_credits,credit_limit,terms_approved,quota_approved) VALUES(true,true,$1,$2,$3,$4,100,1,10000,true,true)`,[a.runId,a.head,a.notBefore,a.expiresAt]);
  const f=fixture({quote,fields:{timestamp:String(Math.floor(Date.now()/1000))}});f.tx.result.blockTime=Math.floor(Date.now()/1000);
  const raw=store('worker'),commands=[],port={async transact(c,o){assert.ok(validCommand(c),'B canonical command accepts exact A envelope');commands.push(c);return raw.transact(c,o);},close:()=>raw.close()};
  const mapped=adaptStore(port,a),clock={now:()=>Date.now(),mono:()=>performance.now(),sleep:(ms,s)=>new Promise((r,j)=>{const t=setTimeout(r,ms);s.addEventListener('abort',()=>{clearTimeout(t);j(Error('STOP'));},{once:true});})};
  const source=new OfflineSource({connections:100,rpc:100},(h)=>{h.frame(ack);h.frame(f.raw);});source.fixture=f;
  let worker;const actual=mapped.transact.bind(mapped);mapped.transact=async(c,o)=>{const r=await actual(c,o);if(c.op==='append'&&c.record.finality==='finalized')setTimeout(()=>worker.stop('OFFLINE_TEST_DONE'),0);return r;};
  worker=new Worker(a,mapped,source,clock);const timeout=setTimeout(()=>worker.stop('TEST_TIMEOUT'),3000);let h;
  try{h=await worker.run();}finally{clearTimeout(timeout);}
  const reader=store('reader'),snapshot=await reader.transact(null);await reader.close();
  return {h,snapshot,commands,source};
}
test('actual B PostgreSQL port commits A creation, exact quote promotion, health, STOP and release',async()=>{
  const r=await scenario('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  assert.equal(r.h.finalized,1);assert.equal(r.source.reads.length,2);assert.equal(r.snapshot.health.stopped,true);
  assert.equal(r.snapshot.events[0].mint,MINT);assert.equal(r.snapshot.events[0].finality,'rpc_reported_finalized');
  assert.equal(r.snapshot.budget.rpcUsed,2);assert.equal(r.snapshot.budget.connectionsUsed,1);assert.equal(r.snapshot.health.leaseUntil,null);
});
test('native SOL is accepted unchanged by both B canonical validation and real SQL',async()=>{
  const r=await scenario('11111111111111111111111111111111');
  assert.equal(r.h.finalized,1,'native SOL contract/SQL mismatch must block activation');
  assert.equal(r.snapshot.events[0].quoteMint,'11111111111111111111111111111111');
});
