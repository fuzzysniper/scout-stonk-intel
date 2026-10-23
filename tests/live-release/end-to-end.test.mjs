// All credentials, account observations, source callbacks and hosting identity below are
// SYNTHETIC OFFLINE fixtures. Real native PostgreSQL/TLS and actual A/B/C code, no hosted proof.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {mkdtempSync,readFileSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {Readable} from 'node:stream';
import {localPostgres} from '../onchain-api/postgres-harness.mjs';
import {postgresPort,databaseConfig,NEON_HOST} from '../../lib/live-ledger/database.mjs';
import {liveHandler,PROJECT} from '../../lib/live-ledger/http.mjs';
import {adaptStore} from '../../experiments/live-stream/store-adapter.mjs';
import {Worker,OfflineSource,fixture,ack,grant,MINT} from '../../experiments/live-stream/tests/fixtures.mjs';
const require=createRequire(import.meta.url);
const {readLiveFeed,stopLiveFeed}=require(process.env.LIVE_FEED_TEST_BUILD+'/app/consumer/live-client.js');
const {NextRequestAdapter}=require('next/dist/server/web/spec-extension/adapters/next-request.js');
const password='SYNTHETIC_RELEASE_167_PASSWORD',token='SYNTHETIC_RELEASE_OWNER_'+ 'x'.repeat(32);
const origin='https://scout-stonk-intel-synthetic.vercel.app';
let db,dir,ca,port;const pools=new Set();
before(async()=>{
 dir=mkdtempSync(join(tmpdir(),'scout-release-tls-'));const key=join(dir,'test.key'),cert=join(dir,'test.crt');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN='+NEON_HOST,'-addext','subjectAltName=DNS:'+NEON_HOST,'-keyout',key,'-out',cert],{stdio:'ignore'});
 chmodSync(key,0o600);ca=readFileSync(cert,'utf8');const listener=createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));port=listener.address().port;await new Promise(r=>listener.close(r));
 db=await localPostgres({tls:{port,cert,key},database:'neondb',runtimeRole:'scout_mint_app'});
 await db.owner.query(readFileSync('lib/onchain-mint/server/postgres/lookup.sql','utf8'));
 await db.owner.query(readFileSync('lib/live-ledger/postgres/schema.sql','utf8'));
 for(const kind of ['worker','reader','stop'])await db.owner.query(`ALTER ROLE scout_live_${kind} PASSWORD '${password}'`);
});
after(async()=>{await Promise.all([...pools].map(p=>p.end()));await db?.close();if(dir)rmSync(dir,{recursive:true,force:true});});
function store(kind){
 const cfg=databaseConfig(`postgresql://scout_live_${kind}:${password}@${NEON_HOST}/neondb?sslmode=require`,kind);
 const pool=new Pool({...cfg,host:'127.0.0.1',port,ssl:{...cfg.ssl,ca}});pool.on('error',()=>{});pools.add(pool);
 const native=postgresPort(pool,{kind,host:NEON_HOST});
 return {...native,async close(){pools.delete(pool);await native.close();}};
}
for(const quote of ['11111111111111111111111111111111','EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'])test('actual A worker -> B authenticated SQL API -> C decoder/STOP: '+quote,async()=>{
 await db.owner.query('TRUNCATE scout_live.events,scout_live.control');
 const approval={...grant(),notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString()};
 await db.owner.query(`INSERT INTO scout_live.control(id,approved,session,head,starts_at,expires_at,connection_credits,rpc_credits,credit_limit,terms_approved,quota_approved) VALUES(true,true,$1,$2,$3,$4,100,1,140,true,true)`,[approval.runId,approval.head,approval.notBefore,approval.expiresAt]);
 const env={SCOUT_LIVE_API_ENABLED:'true',SCOUT_LIVE_OWNER_TOKEN:token,VERCEL:'1',VERCEL_ENV:'production',VERCEL_PROJECT_ID:PROJECT,VERCEL_GIT_COMMIT_SHA:approval.head,VERCEL_URL:new URL(origin).host};
 let readerCalls=0,stopCalls=0;
 const read=liveHandler('reader',{env:()=>env,storeFactory:()=>{readerCalls++;return store('reader');}});
 const stop=liveHandler('stop',{env:()=>env,storeFactory:()=>{stopCalls++;return store('stop');}});
 // Emulate only browser/Next ingress, not deployment protection or a real Vercel identity.
 const fetcher=async(path,options)=>{
  const headers={...options.headers,'sec-fetch-site':'same-origin'};
  if(options.method==='POST'){
   headers.origin=origin;headers['content-length']='0';
   const request=NextRequestAdapter.fromNodeNextRequest({method:'POST',url:origin+path,headers,body:Readable.from([])},options.signal);
   return stop(request);
  }
  return read(new Request(origin+path,{...options,headers}));
 };
 const signal=new AbortController().signal;
 assert.equal((await readLiveFeed('x'.repeat(43),signal,fetcher)).reason,'denied');assert.equal(readerCalls,0);
 const source=new OfflineSource({connections:100,rpc:100},h=>{h.frame(ack);h.frame(source.fixture.raw);});
 source.fixture=fixture({quote,fields:{timestamp:String(Math.floor(Date.now()/1000))}});source.fixture.tx.result.blockTime=Math.floor(Date.now()/1000);
 const mapped=adaptStore(store('worker'),approval);let completed;
 const promoted=new Promise(r=>completed=r),transact=mapped.transact.bind(mapped);
 mapped.transact=async(c,o)=>{const reply=await transact(c,o);if(c.op==='append'&&c.record.finality==='finalized'&&reply.ok)completed();return reply;};
 const clock={now:()=>Date.now(),mono:()=>performance.now(),sleep:(ms,s)=>new Promise((r,j)=>{const t=setTimeout(r,ms);s.addEventListener('abort',()=>{clearTimeout(t);j(Error('STOP'));},{once:true});})};
 const worker=new Worker(approval,mapped,source,clock),running=worker.run();
 let timer;try{
  await Promise.race([promoted,new Promise((_,j)=>{timer=setTimeout(()=>j(Error('local_promotion_timeout')),5000);})]);clearTimeout(timer);
  const result=await readLiveFeed(token,signal,fetcher);assert.equal(result.ok,true);
  const event=result.value.events[0];assert.equal(event.finality,'rpc_reported_finalized');assert.equal(event.mint,MINT);assert.equal(event.quoteMint,quote);assert.equal(result.value.budget.rpcUsed,2);
  assert.equal(result.value.health.stopped,false);assert.equal(source.reads.length,2);
  const stopped=await stopLiveFeed(token,signal,fetcher);assert.equal(stopped.ok,true);assert.equal(stopped.value.status,'stopped');assert.equal(stopCalls,1);
  const end=await Promise.race([running,new Promise((_,j)=>{timer=setTimeout(()=>j(Error('local_closure_timeout')),5000);})]);clearTimeout(timer);
  assert.equal(end.finalized,1);assert.equal(source.opens,1);assert.equal(source.reads.length,2);
  const final=await readLiveFeed(token,signal,fetcher);assert.equal(final.ok,true);assert.equal(final.value.status,'stopped');assert.equal(final.value.health.sourceState,'closed');assert.equal(final.value.health.leaseUntil,null);
  assert.deepEqual(final.value.events,[event]);assert.equal(final.value.budget.creditsReserved,102);assert.equal(final.value.budget.connectionsUsed,1);
  assert.equal((await stopLiveFeed(token,signal,fetcher)).ok,true); // Idempotent STOP, never reset/resume.
  assert.equal((await readLiveFeed(token,signal,fetcher)).value.budget.creditsReserved,102);
 }finally{clearTimeout(timer);worker.stop('OFFLINE_RELEASE_TEST_DONE');await running;}
});
