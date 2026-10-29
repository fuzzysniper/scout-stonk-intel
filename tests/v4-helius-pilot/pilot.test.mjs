import {test} from 'node:test';import assert from 'node:assert/strict';
import {api,BASE,BOUNDS,KEY,MINT,OTHER,MockLedger,scenario,result,tick,envelope,Rejected} from './fixtures.mjs';
const stopped=async s=>{await tick();assert.equal(s.ledger.s.stopped,true);};
const ledgerPort=(base,change)=>({scope:'global_atomic_durable',async transact(c){return change(c,()=>base.transact(c));}});

test('SYNTHETIC full flow: fixed RPC, opaque key, original source clocks/hash, no forged genuine evidence',async()=>{
 const s=scenario(),h=s.make(),r=await h(s.request()),out=await result(r);
 assert.equal(out.status,200);assert.equal(out.body.mockOnly,true);assert.equal(out.body.sourceGo,false);
 assert.equal(out.body.observation.provenance.captureKind,'synthetic_fixture');assert.equal(out.body.observation.provenance.providerAuthentication,'not_verified_offline');
 assert.equal(out.body.observation.observations.supply.raw,'18446744073709551615');assert.equal(out.body.observation.checks.mintAuthority.color,'red');
 assert.equal(s.ledger.s.attempts,1);assert.equal(s.ledger.s.credits,1);assert.equal(s.ledger.s.lease,null);
 const q=s.calls.requests[0];assert.equal(q.mint,MINT);assert.equal(q.id,1);assert.equal(q.method,'getAccountInfo');assert.equal(q.commitment,'finalized');assert.equal(q.encoding,'jsonParsed');
 assert.equal(q.target.host,BOUNDS.host);assert.ok(!JSON.stringify(q).includes(KEY));assert.ok(!JSON.stringify(out).includes(KEY));
 assert.throws(()=>api.inspectSyntheticTarget(q)); // capability disposed after response
 assert.equal(r.headers.get('cache-control'),'private, no-store, max-age=0');assert.equal(r.headers.get('set-cookie'),null);
});
for(const port of ['identity','ledger'])test('absent '+port+' fails before key/transport',async()=>{
 const s=scenario(),r=await s.make({[port]:undefined})(s.request());assert.equal(r.status,port==='identity'?403:503);assert.equal(s.calls.keys,0);assert.equal(s.calls.rpc,0);
});
test('per-instance or unknown ledger scope cannot authorize a source',async()=>{
 const s=scenario();for(const scope of ['memory','per_process','redis_without_commit_proof'])assert.equal((await s.make({ledger:{...s.ledger,scope}})(s.request())).status,503);assert.equal(s.calls.keys,0);assert.equal(s.calls.rpc,0);
});
for(const [field,value] of [['subject','FORGED_OWNER'],['issuer','FORGED_ISSUER'],['audience','https://wrong.invalid'],['pilotId','old-one-shot-proof'],['sessionId','short'],['expiresAt',BASE],['authenticatedAt',BASE+1]])test('trusted identity binding rejects '+field,async()=>{
 const s=scenario(),native=s.ports.identity;
 const identity={async authenticate(req){return {...await native.authenticate(req),[field]:value};}};
 const r=await s.make({identity})(s.request(MINT,{headers:{'x-owner-id':s.p.ownerSubject,'x-forwarded-user':s.p.ownerSubject}}));
 assert.equal(r.status,403);assert.equal(s.calls.keys,0);assert.equal(s.ledger.s.reads,0);assert.equal(s.calls.rpc,0);
});
test('null identity cannot be replaced with Vercel/owner request headers',async()=>{
 const s=scenario(),r=await s.make({identity:{authenticate:async()=>null}})(s.request(MINT,{headers:{'x-vercel-user-email':'owner@example.invalid','x-owner-id':s.p.ownerSubject}}));assert.equal(r.status,403);assert.equal(s.calls.keys,0);
});
for(const mint of ['SOL',' '+MINT,MINT+' ','1'.repeat(31),'https://rpc.invalid/?key=hidden','11111111111111111111111111111111'])test('exact mint allowlist: '+mint.slice(0,15),async()=>{
 const s=scenario(),r=await s.make()(s.request(mint));assert.equal(r.status,400);assert.equal(s.calls.keys,0);assert.equal(s.calls.rpc,0);
});
for(const [name,headers] of [['cross origin',{origin:'https://wrong.invalid'}],['cross site',{'sec-fetch-site':'cross-site'}],['prefetch',{purpose:'prefetch'}],['sec-prefetch',{'sec-purpose':'prefetch'}],['navigation',{'sec-fetch-dest':'document'}],['host spoof',{host:'evil.invalid'}],['forwarded host',{'x-forwarded-host':'evil.invalid'}],['rpc override',{'x-rpc-url':'https://evil.invalid'}],['api key input',{'x-api-key':'SYNTHETIC_NOT_ALLOWED'}],['missing intent',{'x-unfarmd-v4-pilot-intent':''}],['bad content type',{'content-type':'text/plain'}]])test('request admission: '+name,async()=>{
 const s=scenario(),r=await s.make()(s.request(MINT,{headers}));assert.notEqual(r.status,200);assert.equal(s.calls.keys,0);assert.equal(s.calls.rpc,0);
});
for(const method of ['GET','HEAD','OPTIONS','PUT'])test(method+' never acquires or consumes provider budget',async()=>{
 const s=scenario(),req=new Request(s.p.origin+'/api/v4/helius-pilot',{method}),r=await s.make()(req);assert.equal(r.status,400);assert.equal(s.calls.keys,0);assert.equal(s.calls.rpc,0);assert.equal(s.ledger.s.attempts,0);
});
for(const raw of ['{"action":"read","mint":"'+MINT+'","mint":"'+OTHER+'"}','{"action":"read","mint":"'+MINT+'","url":"https://evil.invalid"}',JSON.stringify({action:'read',mint:MINT,owner:'forged'}),'null','[]','not json'])test('ambiguous/malformed request never acquires: '+raw.slice(0,20),async()=>{
 const s=scenario(),r=await s.make()(s.request(MINT,{body:raw}));assert.notEqual(r.status,200);assert.equal(s.calls.keys,0);assert.equal(s.calls.rpc,0);
});
test('stalled request body is bounded by the complete operation deadline before key access',async()=>{
 const s=scenario(),req=s.request(MINT,{body:new ReadableStream({start(){}}),duplex:'half'}),h=api.createMockPilot(s.p,s.ports,15);
 const r=await result(await h(req));assert.equal(r.body.reason,'timeout');assert.equal(s.calls.keys,0);assert.equal(s.calls.rpc,0);
});
test('oversized body and headers are bounded before source admission',async()=>{
 const s=scenario();assert.notEqual((await s.make()(s.request(MINT,{body:' '.repeat(257)}))).status,200);
 assert.notEqual((await s.make()(s.request(MINT,{headers:{'x-filler':'a'.repeat(17000)}}))).status,200);assert.equal(s.calls.keys,0);assert.equal(s.calls.rpc,0);
});
for(const key of [null,undefined,'','short',123,{},'https://evil.invalid/secret'])test('missing/malformed key is zero network and zero reserved attempts: '+String(key),async()=>{
 const s=scenario(),r=await result(await s.make({readProviderKey:()=>key})(s.request()));assert.equal(r.body.reason,'missing_key');assert.equal(s.ledger.s.attempts,0);assert.equal(s.calls.rpc,0);
});
test('missing or uncertain admission ACK is zero key reads and zero source calls',async()=>{
 const s=scenario(),ledger=ledgerPort(s.ledger,async(c,run)=>{if(c.kind==='admit'){await run();throw Error('SYNTHETIC_SECRET_ACK');}return run();});
 const r=await result(await s.make({ledger})(s.request()));assert.equal(r.body.reason,'uncertain');assert.equal(s.calls.keys,0);assert.equal(s.calls.rpc,0);await stopped(s);
});
test('lost reserve ACK remains charged, authorizes zero source and terminal STOP',async()=>{
 const s=scenario(),ledger=ledgerPort(s.ledger,async(c,run)=>{const r=await run();if(c.kind==='reserve')throw Error('LOST_RESERVE_ACK');return r;});
 await s.make({ledger})(s.request());assert.equal(s.ledger.s.attempts,1);assert.equal(s.calls.rpc,0);assert.notEqual(s.ledger.s.lease,null);await stopped(s);
 assert.notEqual((await s.make()(s.request())).status,200);assert.equal(s.calls.rpc,0);
});
test('lost completion ACK withholds facts, charges once, never resets parent state',async()=>{
 const s=scenario(),ledger=ledgerPort(s.ledger,async(c,run)=>{const r=await run();if(c.kind==='finish')throw Error('LOST_FINISH_ACK');return r;});
 const r=await result(await s.make({ledger})(s.request()));assert.equal(r.body.observation,null);assert.equal(s.ledger.s.attempts,1);assert.equal(s.calls.rpc,1);await stopped(s);
});
for(const [field,value] of [['id',0],['id',11],['attemptsReserved',0],['creditsReserved',0],['mint',OTHER],['permitId','read-30'],['policyHash','0'.repeat(64)],['expiresAt',BASE+6000]])test('reservation mismatch blocks transport: '+field,async()=>{
 const s=scenario(),ledger=ledgerPort(s.ledger,async(c,run)=>{const r=await run();if(c.kind==='reserve')r.lease[field]=value;return r;});
 assert.equal((await result(await s.make({ledger})(s.request()))).body.observation,null);assert.equal(s.calls.rpc,0);assert.equal(s.ledger.s.attempts,1);await stopped(s);
});
test('ten attempts across restored model state and recreated handlers; eleventh denied',async()=>{
 const s=scenario();for(let i=0;i<5;i++)assert.equal((await s.make()(s.request())).status,200);
 const restored=new MockLedger(s.p,JSON.parse(JSON.stringify(s.ledger.s)));for(let i=0;i<5;i++)assert.equal((await s.make({ledger:restored})(s.request())).status,200);
 assert.equal((await s.make({ledger:restored})(s.request())).status,429);assert.equal(restored.s.attempts,10);assert.equal(s.calls.rpc,10);
});
test('conservative credit ceiling is cumulative and can end before ten attempts',async()=>{
 const s=scenario();s.p.creditsPerAttempt=2;s.p.maxCredits=3;const ledger=new MockLedger(s.p);
 assert.equal((await s.make({ledger})(s.request())).status,200);assert.equal((await s.make({ledger})(s.request())).status,429);assert.equal(ledger.s.credits,2);assert.equal(s.calls.rpc,1);
});
test('20 competing handlers share one outstanding source lease',async()=>{
 const s=scenario();let release;const transport=()=>{s.calls.rpc++;return new Promise(resolve=>{release=resolve;});};
 const pending=Array.from({length:20},()=>s.make({transport})(s.request()));await tick();assert.equal(s.ledger.s.attempts,1);assert.equal(s.calls.rpc,1);
 release(Response.json(envelope()));const rs=await Promise.all(pending);assert.equal(rs.filter(r=>r.status===200).length,1);assert.equal(rs.filter(r=>r.status===429).length,19);
});
test('same-owner cache reads consume shared read quota, not provider attempts',async()=>{
 const s=scenario(),h=s.make();for(let i=0;i<30;i++)assert.equal((await h(s.request())).status,200);assert.equal((await s.make()(s.request())).status,429);assert.equal(s.calls.rpc,1);assert.equal(s.calls.keys,1);assert.equal(s.ledger.s.reads,30);
});
test('TTL retains original clocks/hash and cannot renew acquisition age',async()=>{
 const s=scenario(),h=s.make(),a=(await result(await h(s.request()))).body.observation;s.advance(1000);
 const b=(await result(await h(s.request()))).body.observation;assert.equal(s.calls.rpc,1);
 for(const field of ['requestStartedAt','responseReceivedAt','responseSha256','contextSlot'])assert.equal(b.provenance[field],a.provenance[field]);assert.notEqual(b.provenance.evaluatedAt,a.provenance.evaluatedAt);
 s.advance(30000);assert.equal((await h(s.request())).status,200);assert.equal(s.calls.rpc,2);
});
test('authenticated STOP is key-free and terminal across replicas and restored model state',async()=>{
 const s=scenario(),r=await result(await s.make()(s.request(MINT,{headers:{'x-unfarmd-v4-pilot-intent':'stop'},body:JSON.stringify({action:'stop'})})));
 assert.equal(r.body.reason,'stopped');assert.equal(s.calls.keys,0);assert.equal(s.calls.rpc,0);
 const restored=new MockLedger(s.p,JSON.parse(JSON.stringify(s.ledger.s)));assert.equal((await result(await s.make({ledger:restored})(s.request()))).body.observation,null);assert.equal(s.calls.keys,0);
});
test('STOP during pending RPC withholds eventual source response',async()=>{
 const s=scenario();let release;const h=s.make({transport:()=>new Promise(resolve=>{release=resolve;})}),pending=h(s.request());await tick();
 await s.make()(s.request(MINT,{headers:{'x-unfarmd-v4-pilot-intent':'stop'},body:JSON.stringify({action:'stop'})}));release(Response.json(envelope()));
 const r=await result(await pending);assert.equal(r.body.observation,null);assert.equal(r.body.reason,'stopped');assert.equal(s.ledger.s.attempts,1);
});
test('timeout and ignored abort never reclaim an uncertain lease; late response cannot publish',async()=>{
 const s=scenario();let release;const h=api.createMockPilot(s.p,{...s.ports,transport:()=>new Promise(resolve=>{release=resolve;})},10);
 const r=await result(await h(s.request()));assert.equal(r.body.reason,'timeout');assert.equal(r.body.observation,null);assert.equal(s.ledger.s.attempts,1);assert.notEqual(s.ledger.s.lease,null);
 release(Response.json(envelope()));await tick();await stopped(s);assert.notEqual((await s.make()(s.request())).status,200);assert.equal(s.ledger.s.events.some(e=>e.kind==='completed'),false);
});
test('unknown expired lease stays blocking even when STOP ACK is unavailable',async()=>{
 const s=scenario(),ledger=ledgerPort(s.ledger,async(c,run)=>{if(c.kind==='stop')throw Error('store unavailable');const r=await run();if(c.kind==='reserve')throw Error('lost reserve ACK');return r;});
 await s.make({ledger})(s.request());await tick();s.advance(6000);assert.notEqual((await s.make()(s.request())).status,200);assert.equal(s.ledger.s.attempts,1);assert.equal(s.calls.rpc,0);assert.equal(s.ledger.s.stopped,true);
});
for(const status of [401,403,429,500,503,302])test('provider HTTP '+status+' is charged, redacted, terminal and never retried',async()=>{
 const s=scenario(),transport=async()=>{s.calls.rpc++;return new Response('SECRET_UPSTREAM_URL_KEY',{status});};
 const r=await s.make({transport})(s.request()),text=await r.text();assert.ok(!text.includes('SECRET'));assert.equal(s.ledger.s.attempts,1);await stopped(s);
 await s.make()(s.request());assert.equal(s.calls.rpc,1);
});
for(const fault of ['redirect','wrong_url','oversized','content_type','no_slot','future_date','stale_date','age','duplicate_json','bad_utf8','malformed','uninitialized'])test('bounded source fault: '+fault,async()=>{
 const s=scenario(),e=envelope();let raw=JSON.stringify(e),headers={'content-type':'application/json'};
 if(fault==='oversized')raw='a'.repeat(65537);if(fault==='content_type')headers={'content-type':'text/html'};if(fault==='no_slot'){delete e.result.context.slot;raw=JSON.stringify(e);}
 if(fault==='future_date')headers.date='Sun, 18 Oct 2026 12:00:01 GMT';if(fault==='stale_date')headers.date='Sun, 18 Oct 2026 11:58:59 GMT';if(fault==='age')headers.age='61';
 if(fault==='duplicate_json')raw='{"jsonrpc":"2.0","id":1,"id":1}';if(fault==='malformed')raw='bad';if(fault==='uninitialized'){e.result.value.data.parsed.info.isInitialized=false;raw=JSON.stringify(e);}
 const r=await s.make({transport:async()=>{
  const response=new Response(fault==='bad_utf8'?new Uint8Array([255,254]):raw,{headers});
  if(fault==='redirect')Object.defineProperty(response,'redirected',{value:true});if(fault==='wrong_url')Object.defineProperty(response,'url',{value:'https://evil.invalid/?secret=hidden'});return response;
 }})(s.request());assert.equal((await r.json()).observation,null);assert.equal(s.ledger.s.attempts,1);await stopped(s);
});
for(const escaped of [false,true])test('provider key reflection rejected even in ignored extension JSON; escaped='+escaped,async()=>{
 const s=scenario(),e=envelope();e.result.value.owner='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';e.result.value.data.program='spl-token-2022';e.result.value.data.space=512;
 e.result.value.data.parsed.info.extensions=[{extension:'transferHook',state:{ignored:KEY}}];let raw=JSON.stringify(e);if(escaped)raw=raw.replaceAll('S','\\u0053');
 const r=await s.make({transport:async()=>new Response(raw,{headers:{'content-type':'application/json'}})})(s.request());const text=await r.text();assert.equal(r.status,503);assert.ok(!text.includes(KEY));assert.equal(s.ledger.s.attempts,1);await stopped(s);
});
test('a JS port cannot reflect a secret via a forged typed reason',async()=>{
 const s=scenario(),r=await s.make({transport:async()=>{throw new Rejected(KEY);}})(s.request());assert.ok(!(await r.text()).includes(KEY));await stopped(s);
});
test('stalled provider body obeys total deadline and keeps reservation charged',async()=>{
 const s=scenario(),h=api.createMockPilot(s.p,{...s.ports,transport:async()=>new Response(new ReadableStream({start(){}}),{headers:{'content-type':'application/json'}})},10);
 assert.equal((await result(await h(s.request()))).body.reason,'timeout');assert.equal(s.ledger.s.attempts,1);await stopped(s);
});
test('unsupported Token-2022 remains grey; exact supply is source data, not an assessment bypass',async()=>{
 const s=scenario(),e=envelope();e.result.value.owner='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';e.result.value.data.program='spl-token-2022';e.result.value.data.space=512;
 e.result.value.data.parsed.info.mintAuthority=null;e.result.value.data.parsed.info.extensions=[];
 const r=(await result(await s.make({transport:async()=>Response.json(e)})(s.request()))).body.observation;
 assert.equal(r.state,'unsupported');for(const c of Object.values(r.checks))assert.equal(c.color,'grey');assert.equal(r.observations.supply.raw,'18446744073709551615');
});
test('source slot rollback is terminal, and profile expiry cannot return cached facts',async()=>{
 const s=scenario();await s.make()(s.request());s.advance(31000);const e=envelope();e.id=2;e.result.context.slot--;
 assert.equal((await result(await s.make({transport:async()=>Response.json(e)})(s.request()))).body.observation,null);await stopped(s);
 const other=scenario(),h=other.make();await h(other.request());other.advance(BOUNDS.windowMs);assert.equal((await result(await h(other.request()))).body.reason,'expired');assert.equal(other.calls.rpc,1);
});
test('wall/elapsed divergence cannot refresh an admitted cache',async()=>{
 const s=scenario(),h=s.make();await h(s.request());const saved=s.ports.identity.authenticate;s.ports.identity.authenticate=async(req)=>{const owner=await saved(req);s.wall(BASE-1);return owner;};
 assert.equal((await result(await h(s.request()))).body.observation,null);assert.equal((await result(await h(s.request()))).body.reason,'stopped');assert.equal(s.calls.rpc,1);
});

test('global ledger rejects cross-handler clock rollback without resetting cache/budget',async()=>{
 const s=scenario();s.advance(5000);await s.make()(s.request());s.wall(BASE+1000);s.mono(1000);
 const r=await result(await s.make()(s.request()));assert.equal(r.body.observation,null);assert.equal(s.calls.rpc,1);await stopped(s);
});

test('invalid client JSON is recoverable without source reservation or terminal reset',async()=>{
 const s=scenario(),h=s.make();assert.equal((await result(await h(s.request(MINT,{body:'not json'})))).body.reason,'invalid_request');
 assert.equal(s.ledger.s.stopped,false);assert.equal(s.ledger.s.attempts,0);assert.equal(s.calls.keys,0);assert.equal((await h(s.request())).status,200);
});
test('replayed permit receipt cannot publish cached facts or issue a duplicate source attempt',async()=>{
 const s=scenario();let old;
 const ledger=ledgerPort(s.ledger,async(c,run)=>{const r=await run();if(c.kind==='admit'){if(old)return structuredClone(old);old=structuredClone(r);}return r;});
 const h=s.make({ledger});assert.equal((await h(s.request())).status,200);const r=await result(await h(s.request()));assert.equal(r.body.observation,null);assert.equal(s.calls.rpc,1);await stopped(s);
});
for(const field of ['policyHash','permitId','leaseId','report'])test('completion receipt mismatch withholds facts: '+field,async()=>{
 const s=scenario(),ledger=ledgerPort(s.ledger,async(c,run)=>{const r=await run();if(c.kind==='finish')r[field]=field==='report'?{...r.report,responseSha256:'0'.repeat(64)}:field==='leaseId'?null:'wrong';return r;});
 const r=await result(await s.make({ledger})(s.request()));assert.equal(r.body.observation,null);assert.equal(s.calls.rpc,1);assert.equal(s.ledger.s.attempts,1);await stopped(s);
});
test('original HTTP clock is copied before the response stream awaits',async()=>{
 const s=scenario();let push,response;
 const transport=async()=>{response=new Response(new ReadableStream({start(c){push=c;}}),{headers:{'content-type':'application/json',date:'Sun, 18 Oct 2026 11:58:59 GMT'}});return response;};
 const pending=s.make({transport})(s.request());await tick();response.headers.set('date','Sun, 18 Oct 2026 12:00:00 GMT');push.enqueue(new TextEncoder().encode(JSON.stringify(envelope())));push.close();
 const r=await result(await pending);assert.equal(r.body.reason,'stale_source');assert.equal(r.body.observation,null);await stopped(s);
});
test('cumulative monotonic deadline includes owner authentication before key access',async()=>{
 const s=scenario(),identity={async authenticate(req){const o=await s.ports.identity.authenticate(req);s.advance(5001);return o;}};
 const r=await result(await s.make({identity})(s.request()));assert.equal(r.body.reason,'timeout');assert.equal(s.calls.keys,0);assert.equal(s.calls.rpc,0);
});

test('pre-aborted owner request consumes zero identity/key/source/ledger work',async()=>{
 const s=scenario(),c=new AbortController();c.abort();const r=await result(await s.make()(s.request(MINT,{signal:c.signal})));
 assert.equal(r.body.reason,'invalid_request');assert.equal(s.calls.identity,0);assert.equal(s.calls.keys,0);assert.equal(s.calls.rpc,0);assert.equal(s.ledger.s.reads,0);assert.equal(s.ledger.s.attempts,0);
});
test('in-flight owner cancellation aborts the port, retains charge and sends terminal STOP once',async()=>{
 const s=scenario(),c=new AbortController();let sawAbort=false;
 const transport=(_read,signal)=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{sawAbort=true;reject(Error('synthetic cancelled'));},{once:true}));
 const pending=s.make({transport})(s.request(MINT,{signal:c.signal}));await tick();c.abort();const r=await result(await pending);await tick();
 assert.equal(sawAbort,true);assert.equal(r.body.observation,null);assert.equal(s.ledger.s.attempts,1);assert.equal(s.ledger.s.stopped,true);assert.equal(s.ledger.s.events.filter(e=>e.kind==='stop').length,1);
});
