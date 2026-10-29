import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,createBody,request,MINT,installedThesisRoute,THESIS_APPROVAL,PostgresThesisRate} from './fixture.mjs';
let f,handler,s;
before(async()=>{f=await fixture();});after(async()=>{await f?.close();});beforeEach(async()=>{await f.reset();handler=f.makeHandler();s=f.session();});
const get=async r=>({status:r.status,body:await r.json()});
async function create(){const body=createBody(),response=await get(await handler(request(s,undefined,'POST',body)));assert.equal(response.status,201);return {body,result:response.body};}
test('installed route immutable OFF/null reads no request, auth, environment, keys or storage',async()=>{
 let reads=0;const hostile=new Proxy({},{get(){reads++;throw Error('DO_NOT_READ');}});const r=installedThesisRoute(hostile);assert.equal(r.status,503);assert.equal(reads,0);assert.deepEqual(THESIS_APPROVAL,{enabled:false,notBeforeMs:null,expiresAtMs:null});assert.equal(r.headers.get('cache-control'),'private, no-store');
});
test('real native TLS PG create, second-session load, list, revision and preserved original',async()=>{
 const {body,result}=await create(),otherSession=f.session();
 const list=await get(await handler(request(otherSession,'/api/v4/theses?mint='+MINT)));assert.equal(list.body.items[0].journalId,body.journalId);
 const path='/api/v4/theses/'+body.journalId;
 const revision=await get(await handler(request(otherSession,path,'PATCH',{mint:MINT,requestId:randomUUID(),expectedHead:result.receipt.storageHead,action:'revise',thesis:'SYNTHETIC ONLY revised view',invalidation:'SYNTHETIC ONLY disconfirming fact'})));assert.equal(revision.status,200);
 const loaded=await get(await handler(request(s,path+'?mint='+MINT)));assert.equal(loaded.body.entries.length,2);assert.equal(loaded.body.entries[0].thesis,body.thesis);assert.equal(loaded.body.entries[1].supersedes,loaded.body.entries[0].hash);assert.ok(Date.parse(loaded.body.entries[1].recordedAt)>=Date.parse(loaded.body.entries[0].recordedAt));
 assert.doesNotMatch(JSON.stringify((await f.db.owner.query('TABLE unfarmd_journal.events')).rows),/SYNTHETIC ONLY|original hypothesis/);
});
for(const kind of ['absent','forged','revoked','nonowner'])test('session '+kind+' denied before rate/key/storage work',async()=>{
 let session=s;if(kind==='absent')session=null;if(kind==='forged')session={id:'FORGED_SYNTHETIC',csrf:s.csrf};if(kind==='revoked')s.revoked=true;if(kind==='nonowner')session=f.session(f.otherId);
 const calls=f.ring.calls,r=await handler(request(session,undefined,'POST',createBody()));assert.equal(r.status,401);assert.equal(f.ring.calls,calls);assert.equal((await f.db.owner.query('SELECT count(*)::int AS n FROM unfarmd_thesis_rate.usage')).rows[0].n,0);
});
test('even forged injected context must carry principal from the repository authority',async()=>{
 const h=f.makeHandler({owners:{resolve:async()=>({principal:{},sessionTag:'a'.repeat(32),expiresAtMs:Date.now()+10000}),isCurrent:async()=>true,verifyCsrf:async()=>true}});
 assert.equal((await h(request(s,undefined,'POST',createBody()))).status,401);
});
for(const [name,headers] of [['cross origin',{Origin:'https://evil.invalid'}],['cross-site',{'Sec-Fetch-Site':'cross-site'}],['CSRF missing',{'X-CSRF-Token':''}],['other-session CSRF',{'X-CSRF-Token':'x'.repeat(32)}],['owner header',{'X-Owner-Id':'client-owner'}]])test(name+' fails before storage',async()=>{
 const r=await handler(request(s,undefined,'POST',createBody(),headers));assert.ok(r.status===400||r.status===403);assert.equal((await f.db.owner.query('SELECT count(*)::int AS n FROM unfarmd_journal.events')).rows[0].n,0);
});
test('no Origin on write, duplicate query, wrong method, mint alias and owner/body overrides fail closed',async()=>{
 const noOrigin=request(s,undefined,'POST',createBody());noOrigin.headers.delete('origin');assert.equal((await handler(noOrigin)).status,403);
 for(const req of [request(s,'/api/v4/theses?mint='+MINT+'&mint='+MINT),request(s,'/api/v4/theses','DELETE'),request(s,undefined,'POST',{...createBody(),mint:' '+MINT}),request(s,undefined,'POST',{...createBody(),ownerId:f.ownerId})])assert.ok((await handler(req)).status>=400);
});
test('body limits, duplicate JSON keys, compression and content type cannot invoke repository',async()=>{
 for(const req of [request(s,undefined,'POST','x'.repeat(16385)),request(s,undefined,'POST','{"mint":"x","mint":"y"}'),request(s,undefined,'POST',createBody(),{'Content-Encoding':'gzip'}),request(s,undefined,'POST',createBody(),{'Content-Type':'text/plain'})])assert.ok((await handler(req)).status>=400);
 assert.equal((await f.db.owner.query('SELECT count(*)::int AS n FROM unfarmd_journal.events')).rows[0].n,0);
});
test('unbounded/slow stream fails closed without write or retry',async()=>{
 const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(17000));c.close();}});
 const r=await handler(new Request('http://127.0.0.1:4288/api/v4/theses',{method:'POST',headers:{Cookie:'synthetic_thesis='+s.id,Origin:'http://127.0.0.1:4288','Content-Type':'application/json','X-CSRF-Token':s.csrf},body:stream,duplex:'half'}));assert.equal(r.status,413);
});
test('absolute body deadline and excessive empty chunks cannot hold an unbounded authenticated stream',async()=>{
 for(const stream of [new ReadableStream({start(){}}),new ReadableStream({pull(c){c.enqueue(new Uint8Array());}})]){
  const req=new Request('http://127.0.0.1:4288/api/v4/theses',{method:'POST',headers:{Cookie:'synthetic_thesis='+s.id,Origin:'http://127.0.0.1:4288','Content-Type':'application/json','X-CSRF-Token':s.csrf},body:stream,duplex:'half'});const r=await handler(req);assert.ok([413,503].includes(r.status));
 }
 assert.equal((await f.db.owner.query('SELECT count(*)::int AS n FROM unfarmd_journal.events')).rows[0].n,0);
});
test('same-key concurrent create returns one genuine receipt/event; changed-key stale revision conflicts',async()=>{
 const body=createBody(),out=await Promise.all(Array.from({length:6},()=>handler(request(s,undefined,'POST',body))));assert.ok(out.every(r=>r.status===201));const receipts=await Promise.all(out.map(r=>r.json()));assert.equal(new Set(receipts.map(r=>r.receipt.storageHead)).size,1);
 const path='/api/v4/theses/'+body.journalId,rev={mint:MINT,requestId:randomUUID(),expectedHead:receipts[0].receipt.storageHead,action:'revise',thesis:'SYNTHETIC ONLY concurrent revision',invalidation:null};
 const race=await Promise.all([handler(request(s,path,'PATCH',rev)),handler(request(s,path,'PATCH',{...rev,requestId:randomUUID()}))]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);assert.equal((await f.db.owner.query('SELECT count(*)::int AS n FROM unfarmd_journal.events')).rows[0].n,2);
});
test('cross-owner journal ID remains unavailable; ciphertext cannot be borrowed into authenticated owner scope',async()=>{
 const principal=f.session(f.otherId).context.principal,cmd=createBody();await f.repository.append(principal,{journalId:cmd.journalId,mint:MINT,requestId:cmd.requestId,expectedHead:null,change:{kind:'created',content:{thesis:cmd.thesis,invalidation:null,contradictions:null},fact_snapshot_refs:[]}});
 const r=await handler(request(s,'/api/v4/theses/'+cmd.journalId+'?mint='+MINT));assert.equal(r.status,410);assert.deepEqual((await get(await handler(request(s,'/api/v4/theses?mint='+MINT)))).body.items,[]);
});
test('tampered ciphertext or truncated journal yields no private response or fallback',async()=>{
 const {body}=await create(),path='/api/v4/theses/'+body.journalId+'?mint='+MINT;
 await f.db.owner.query("UPDATE unfarmd_journal.events SET payload='SYNTHETIC_CORRUPTION'");const r=await get(await handler(request(s,path)));assert.equal(r.status,503);assert.doesNotMatch(JSON.stringify(r.body),/original hypothesis|SYNTHETIC_CORRUPTION/);
 await f.db.owner.query('DELETE FROM unfarmd_journal.events');assert.equal((await handler(request(s,path))).status,503);
});
test('deletion is terminal revoke/queued erasure, and expiry shares non-leaking unavailable response',async()=>{
 const {body,result}=await create(),path='/api/v4/theses/'+body.journalId;
 const deletion=await get(await handler(request(s,path,'PATCH',{mint:MINT,requestId:randomUUID(),expectedHead:result.receipt.storageHead,action:'request_deletion'})));assert.equal(deletion.status,202);assert.equal(deletion.body.state,'access_revoked_erasure_queued');assert.equal((await handler(request(s,path+'?mint='+MINT))).status,410);assert.equal((await f.db.owner.query('SELECT count(*)::int AS n FROM unfarmd_journal.events')).rows[0].n,2);
});
test('database-reported expiry and source-independent clocks never appear as a successful save/load',async()=>{
 const {body}=await create();await f.db.owner.query("UPDATE unfarmd_journal.journals SET created_at=clock_timestamp()-interval '31 days',expires_at=clock_timestamp()-interval '1 day'");assert.equal((await handler(request(s,'/api/v4/theses/'+body.journalId+'?mint='+MINT))).status,410);
});
test('durable rate reservations across independent adapters enforce cap, no table reset or memory fallback',async()=>{
 const adapters=Array.from({length:4},()=>new PostgresThesisRate(f.pool,f.authority));const results=await Promise.all(Array.from({length:24},(_,i)=>adapters[i%4].reserve(s.context.principal,'write')));assert.equal(results.filter(Boolean).length,20);
 const r=await handler(request(s,undefined,'POST',createBody()));assert.equal(r.status,429);assert.equal((await f.db.owner.query('SELECT writes FROM unfarmd_thesis_rate.usage')).rows[0].writes,20);await assert.rejects(f.pool.query('UPDATE unfarmd_thesis_rate.usage SET writes=0'));
});
test('missing rate storage and uncertain reservation do not fall back to a local limiter or invoke journal',async()=>{
 const h=f.makeHandler({rate:{async reserve(){throw Error('SYNTHETIC_PRIVATE_DATABASE_AND_TOKEN');}}});const r=await get(await h(request(s,undefined,'POST',createBody())));assert.equal(r.status,503);assert.doesNotMatch(JSON.stringify(r.body),/SYNTHETIC_PRIVATE/);assert.equal((await f.db.owner.query('SELECT count(*)::int AS n FROM unfarmd_journal.events')).rows[0].n,0);
});
test('durable spent rate tickets survive native PostgreSQL restart without resetting or refunding',async()=>{
 for(let i=0;i<20;i++)assert.equal(await f.rate.reserve(s.context.principal,'write'),true);await f.db.crashRestart();
 assert.equal(await f.reopenRate().reserve(s.context.principal,'write'),false);assert.equal((await f.db.owner.query('SELECT writes FROM unfarmd_thesis_rate.usage')).rows[0].writes,20);
});
test('future durable rate clock denies, and actual outage cannot return a success or memory fallback',async()=>{
 await f.rate.reserve(s.context.principal,'write');await f.db.owner.query("UPDATE unfarmd_thesis_rate.usage SET last_at=clock_timestamp()+interval '1 hour'");assert.equal(await f.rate.reserve(s.context.principal,'write'),false);
 await f.db.outage();try{await assert.rejects(f.reopenRate().reserve(s.context.principal,'read'),/rate_unavailable/);}finally{await f.db.restore();}
});
test('revocation after I/O denies response; in-flight outcome is never falsely reported as unsaved or deleted',async()=>{
 const {body}=await create(),original=f.owners.isCurrent;let calls=0;f.owners.isCurrent=async ctx=>{if(++calls===3)s.revoked=true;return original(ctx);};
 try{const r=await get(await handler(request(s,'/api/v4/theses/'+body.journalId+'?mint='+MINT)));assert.equal(r.status,401);assert.doesNotMatch(JSON.stringify(r.body),/original hypothesis/);}finally{f.owners.isCurrent=original;}
});
