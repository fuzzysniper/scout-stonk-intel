// SYNTHETIC OFFLINE RPC DATA ONLY, including production_rpc classification tests.
// SQL, native client, SCRAM authentication, transactions and crash recovery use REAL local PostgreSQL.
import assert from "node:assert/strict";
import { test, before, beforeEach, after } from "node:test";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { localPostgres } from "./postgres-harness.mjs";
import { root, MINT, OTHER, ORIGIN, HELIUS_HOST, SYNTHETIC_KEY, SYNTHETIC_HMAC, envelope, token2022, response } from "./fixtures.mjs";
const require = createRequire(import.meta.url);
const { postgresStore } = require(`${root}/lib/onchain-mint/server/postgres-store.js`);
const { productionRuntime } = require(`${root}/lib/onchain-mint/server/production.js`);
const { LIVE_APPROVAL, PRODUCTION_PROFILE: P, prepareDatabase, databaseParameters, loadProductionConfig } = require(`${root}/lib/onchain-mint/server/production-config.js`);
const { vercelIdentity } = require(`${root}/lib/onchain-mint/server/hosting-identity.js`);
const { projectMintFacts } = require(`${root}/app/consumer/onchain-model.js`);
const HOST = "ep-synthetic-only.us-east-2.aws.neon.tech", PROJECT = "prj_SYNTHETICOFFLINE111";
const SYNTHETIC_DB_PASSWORD = "SYNTHETIC_NOT_A_HOSTED_PASSWORD_111";
const DB_URL = `postgresql://scout_test:${SYNTHETIC_DB_PASSWORD}@${HOST}/scout`;
const context = { vercel: "1", environment: "production", projectId: PROJECT };
const approval = Object.freeze({ enabled: true, storeHost: HOST, vercelProjectId: PROJECT });
let db;
before(async () => { db = await localPostgres(); });
beforeEach(async () => { await db.reset(); });
after(async () => { await db?.close(); });
const client = n => n.toString(16).padStart(64, "0");
const command = (n = 1, mint = MINT) => ({ kind: "admit", policy: P.policy, mint, client: client(n) });
const complete = (lease, extra = {}) => ({ kind: "complete", policy: P.policy, lease, slot: "400000001", cache: null, ...extra });
const store = () => postgresStore(db.pool());
const policy = async () => (await db.owner.query("SELECT * FROM scout_mint.policy")).rows[0];
const sqlNow = "floor(extract(epoch FROM clock_timestamp())*1000)::bigint";
const seed = text => db.owner.query(`WITH t AS MATERIALIZED (SELECT ${sqlNow} AS n) UPDATE scout_mint.policy SET ${text.replaceAll(sqlNow,"t.n")} FROM t`);
const request = (mint = MINT, headers = {}) => new Request(`${ORIGIN}/api/mint-facts?mint=${mint}`, { headers: {
  origin: ORIGIN, "sec-fetch-site": "same-origin", "x-vercel-forwarded-for": "203.0.113.8", "x-forwarded-for": "203.0.113.8",
  "x-forwarded-host": "scout.storkcoin.xyz", "x-forwarded-proto": "https", ...headers,
} });
function runtime(options = {}) {
  const calls = { secrets: [], store: 0, rpc: 0, hosting: 0, requests: [] };
  const secrets = { SCOUT_MINT_HELIUS_API_KEY: SYNTHETIC_KEY, SCOUT_MINT_ADMISSION_HMAC_KEY: SYNTHETIC_HMAC, SCOUT_MINT_STORE_DATABASE_URL: DB_URL, ...options.secrets };
  const transport = options.rpc ?? ((_url, init) => { const e = envelope(); e.id = JSON.parse(init.body).id; return response(e); });
  const handler = productionRuntime(options.approval ?? approval, {
    hosting: () => { calls.hosting++; return options.context ?? context; },
    readSecret: key => { calls.secrets.push(key); return secrets[key]; },
    store: async () => { calls.store++; return options.store ?? store(); },
    transport: async (url, init) => { calls.rpc++; calls.requests.push({ url, init }); return transport(url, init); },
    clock: { now: () => Date.now(), monotonic: () => performance.now() },
  });
  return { handler, calls };
}
async function read(s, req = request()) { const r = await s.handler(req); return { r, body: await r.json() }; }

test("SYNTHETIC production composition: actual SQL/native client/fake Helius/merged consumer", async () => {
  const s = runtime(), a = await read(s), b = await read(runtime());
  assert.equal(a.r.status, 200); assert.equal(b.r.status, 200); assert.equal(s.calls.rpc, 1);
  assert.equal(a.body.source.acquisition, "production_rpc"); assert.equal(a.body.source.endpointHost, HELIUS_HOST);
  for (const field of ["requestStartedAt", "responseReceivedAt", "checkedAt", "contextSlot", "responseSha256"]) assert.equal(b.body.source[field], a.body.source[field]);
  assert.equal(projectMintFacts(a.body, MINT, Date.now(), "production").kind, "facts");
  assert.equal(projectMintFacts(a.body, MINT, Date.parse(a.body.source.checkedAt)+60001, "production").kind, "unavailable");
  const synthetic = structuredClone(a.body); synthetic.source.acquisition = "synthetic_fixture";
  assert.equal(projectMintFacts(synthetic, MINT, Date.now(), "production").kind, "unavailable");
  const { url, init } = s.calls.requests[0]; assert.equal(new URL(url).hostname, HELIUS_HOST);
  assert.deepEqual(JSON.parse(init.body), { jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [MINT, { encoding: "jsonParsed", commitment: "finalized" }] });
  assert.equal(init.redirect, "error"); assert.equal(init.credentials, "omit"); assert.equal(init.cache, "no-store");
  assert.match(a.r.headers.get("cache-control"), /no-store/);
  const retained = JSON.stringify((await db.owner.query("SELECT * FROM scout_mint.clients")).rows)+JSON.stringify(a.body)+JSON.stringify(b.body);
  for (const secret of [SYNTHETIC_KEY,SYNTHETIC_HMAC,SYNTHETIC_DB_PASSWORD,"203.0.113.8","api-key="]) assert.ok(!retained.includes(secret));
  assert.equal((await policy()).rpc_day, 1);
});
test("independent pools racing admission receive ONE globally charged lease", async () => {
  const results = await Promise.all([store(),store(),store(),store()].map((s,i) => s.transact(command(i+1))));
  assert.equal(results.filter(r => r.kind === "lease").length, 1);
  assert.ok(results.filter(r => r.kind !== "lease").every(r => r.reason === "admission_limited"));
  const p = await policy(); assert.equal(p.rpc_day, 1); assert.equal(p.seq, "1"); assert.equal(p.reads, 4);
});
test("parallel first HTTP requests initialize one store and authorize one source call", async () => {
  const s = runtime(), results = await Promise.all([read(s),read(s)]);
  assert.equal(s.calls.store, 1); assert.equal(s.calls.secrets.length, 3); assert.equal(s.calls.rpc, 1);
  assert.ok(results.some(x => x.r.status === 200));
});
test("uncommitted admission is invisible, lock times out, rollback restores quota/fence", async () => {
  const conn = await db.owner.connect();
  try {
    await conn.query("BEGIN");
    const first = (await conn.query("SELECT scout_mint.step($1::jsonb) AS r", [JSON.stringify(command())])).rows[0].r;
    assert.equal(first.kind, "lease");
    await assert.rejects(store().transact(command(2)), e => e.message === "upstream_unavailable");
    await conn.query("ROLLBACK");
  } finally { conn.release(); }
  assert.equal((await policy()).rpc_day, 0);
  const a = await store().transact(command()); assert.equal(a.lease.id, 1); assert.equal((await policy()).rpc_day, 1);
});
test("completion/high-water slot are published only after COMMIT", async () => {
  const s = store(), a = await s.transact(command()), conn = await db.owner.connect();
  try {
    await conn.query("BEGIN"); await conn.query("SELECT scout_mint.step($1::jsonb)", [JSON.stringify(complete(a.lease))]);
    const observer = db.pool("scout_test_owner"), p = (await observer.query("SELECT * FROM scout_mint.policy")).rows[0];
    assert.equal(p.highest_slot, "0"); assert.equal(p.lease_id, "1");
    await conn.query("ROLLBACK");
  } finally { conn.release(); }
  assert.equal((await policy()).lease_id, "1"); assert.equal((await s.transact(complete(a.lease))).kind, "committed");
  assert.equal((await policy()).lease_id, null); assert.equal((await policy()).highest_slot, "400000001");
});
for (const field of ["id", "mint", "expiresAt"]) test(`fencing rejects mismatched ${field}, closes circuit`, async () => {
  const s = store(), a = await s.transact(command());
  const lease = { ...a.lease, [field]: field === "mint" ? OTHER : a.lease[field]+1 };
  assert.equal((await s.transact(complete(lease))).reason, "invalid_response");
  assert.equal((await store().transact(command(2))).reason, "circuit_open"); assert.equal((await policy()).rpc_day, 1);
});
test("expired/ambiguous lease is terminal across replicas, never reclaimed", async () => {
  await store().transact(command()); await seed(`last_rpc=${sqlNow}-16000,lease_until=${sqlNow}-1000`);
  assert.equal((await store().transact(command(2))).reason, "circuit_open");
  assert.equal((await policy()).rpc_day, 1); assert.equal((await policy()).seq, "1");
});
test("replayed completion and regressing finalized slot cannot reset fencing/high-water", async () => {
  const s = store(), a = await s.transact(command()); await s.transact(complete(a.lease));
  assert.equal((await s.transact(complete(a.lease))).reason, "invalid_response");
  await db.reset(); const next = store(), b = await next.transact(command()); await seed("highest_slot=400000002");
  assert.equal((await next.transact(complete(b.lease))).reason, "stale_source"); assert.equal((await policy()).highest_slot, "400000002");
});
test("real crash/restart retains charged quota, fencing, slot and terminal circuit", async () => {
  const s = store(), a = await s.transact(command()); await s.transact(complete(a.lease));
  await s.transact({ kind: "stop", policy: P.policy, reason: "rate_limited" });
  await db.crashRestart(); const p = await policy();
  assert.equal(p.rpc_day, 1); assert.equal(p.seq, "1"); assert.equal(p.highest_slot, "400000001"); assert.equal(p.circuit, "rate_limited");
  assert.equal((await store().transact(command(2))).reason, "circuit_open"); assert.match(db.log(), /database system was interrupted/);
});
test("in-flight reservation survives crash and blocks a fresh replica", async () => {
  const a = await store().transact(command()); await db.crashRestart();
  const p = await policy(); assert.equal(p.lease_id, String(a.lease.id)); assert.equal(p.rpc_day, 1);
  assert.equal((await store().transact(command(2))).reason, "admission_limited");
});
test("database outage returns bounded redacted unavailable, zero RPC/no memory fallback", async () => {
  await db.outage();
  try { const s = runtime(), a = await read(s); assert.equal(a.r.status, 503); assert.equal(a.body.reason, "upstream_unavailable"); assert.equal(s.calls.rpc, 0); assert.equal(a.body.source, null); }
  finally { await db.restore(); }
});
test("SCRAM rejects wrong password; runtime role cannot read/change state, DDL or bootstrap", async () => {
  await assert.rejects(postgresStore(db.pool("scout_test_runtime","SYNTHETIC_WRONG_PASSWORD")).transact(command()), e => e.message === "upstream_unavailable");
  const role = db.pool();
  for (const sql of ["SELECT * FROM scout_mint.policy","UPDATE scout_mint.policy SET rpc_day=0","DELETE FROM scout_mint.cache","INSERT INTO scout_mint.policy(id) VALUES('scout-helius-mint/production-v1')","CREATE TABLE scout_mint.escape(id int)","DROP FUNCTION scout_mint.step(jsonb)"]) await assert.rejects(role.query(sql), e => e.code === "42501");
  assert.equal((await postgresStore(role).transact(command())).kind, "lease");
});
test("missing policy fails closed without automatic bootstrap/reset", async () => {
  await db.owner.query("TRUNCATE scout_mint.policy CASCADE");
  const s = runtime(), a = await read(s); assert.equal(a.body.reason,"upstream_unavailable"); assert.equal(s.calls.rpc,0);
  assert.equal((await db.owner.query("SELECT count(*) FROM scout_mint.policy")).rows[0].count,"0");
});
test("lost admission response remains charged, authorizes zero RPC and no replica lease", async () => {
  const native = store(), s = runtime({store:{async transact(c){await native.transact(c);throw Error("SYNTHETIC_SECRET_LOST_REPLY");}}});
  assert.equal((await read(s)).body.reason,"upstream_unavailable"); assert.equal(s.calls.rpc,0);
  assert.equal((await policy()).rpc_day,1); assert.equal((await store().transact(command(2))).reason,"admission_limited");
});
test("lost completion ACK returns no facts, charges once and closes circuit", async () => {
  const native = store(), s = runtime({store:{async transact(c){const r=await native.transact(c);if(c.kind==="complete")throw Error("SYNTHETIC_LOST_COMMIT_ACK");return r;}}});
  const a=await read(s);assert.equal(a.body.facts,null);assert.equal(a.body.source,null);assert.equal(s.calls.rpc,1);
  assert.equal((await store().transact(command(2))).reason,"circuit_open");assert.equal((await policy()).rpc_day,1);
});
for (const [sql,label] of [[`minute=${sqlNow}/60000,rpc_min=3`,"3 per UTC minute"],[`day=${sqlNow}/86400000,rpc_day=120`,"120 per UTC day"],[`last_rpc=${sqlNow}`,"10-second spacing"]]) test(`global source quota: ${label}`, async () => {
  await seed(sql);const s=runtime(),a=await read(s);assert.equal(a.r.status,429);assert.equal(a.body.reason,"admission_limited");assert.equal(s.calls.rpc,0);
});
test("global/per-client read quotas include cache hits across workers", async () => {
  assert.equal((await read(runtime())).r.status,200);
  for(let i=0;i<5;i++)assert.equal((await read(runtime())).r.status,200);
  const a=await read(runtime());assert.equal(a.r.status,429);assert.ok(Number(a.r.headers.get("retry-after"))>=1);
  await seed(`minute=${sqlNow}/60000,reads=30`);assert.equal((await store().transact(command(2))).reason,"admission_limited");assert.equal((await policy()).rpc_day,1);
});
test("UTC rollover resets only window counters, retains daily charge/sequence/slot", async () => {
  const s=store(),a=await s.transact(command());await s.transact(complete(a.lease));
  await seed(`minute=${sqlNow}/60000-1,reads=30,rpc_min=3,last_rpc=${sqlNow}-10001`);
  const b=await store().transact(command(2,OTHER));assert.equal(b.kind,"lease");assert.equal(b.lease.id,2);
  const p=await policy();assert.equal(p.rpc_min,1);assert.equal(p.rpc_day,2);assert.equal(p.highest_slot,"400000001");
});
test("cache expiry never renews source clocks; expired rows are pruned before fresh acquisition", async () => {
  await read(runtime());const original=(await db.owner.query("SELECT * FROM scout_mint.cache")).rows[0];
  assert.equal(original.expires,String(original.entry.checkedAt+30000));
  await db.owner.query(`UPDATE scout_mint.cache SET expires=${sqlNow}-1`);await seed(`last_rpc=${sqlNow}-10001`);
  const s=runtime();assert.equal((await read(s)).r.status,200);assert.equal(s.calls.rpc,1);
  assert.notEqual((await db.owner.query("SELECT entry FROM scout_mint.cache")).rows[0].entry.json,original.entry.json);
});
test("tampered cache MAC is never served and trips circuit before another RPC", async () => {
  await read(runtime());await db.owner.query("UPDATE scout_mint.cache SET entry=jsonb_set(entry,'{mac}',to_jsonb(repeat('0',64)))");
  const s=runtime(),a=await read(s);assert.equal(a.body.reason,"invalid_response");assert.equal(s.calls.rpc,0);assert.equal((await policy()).circuit,"invalid_response");
});
test("client retention/capacity are SQL bounded with HMAC-only identifiers", async () => {
  await db.owner.query(`INSERT INTO scout_mint.clients SELECT $1,lpad(to_hex(i),64,'0'),${sqlNow}/60000,0,${sqlNow}+120000 FROM generate_series(1,128) AS i`,[P.policy]);
  assert.equal((await store().transact(command(129))).reason,"admission_limited");
  await db.owner.query(`UPDATE scout_mint.clients SET expires=${sqlNow}-1`);assert.equal((await store().transact(command(129))).kind,"lease");
  assert.equal((await db.owner.query("SELECT count(*) FROM scout_mint.clients")).rows[0].count,"1");
});
test("SQL rejects asynchronous commits and clock regression", async () => {
  const role=db.pool();await role.query("SET synchronous_commit=off");
  await assert.rejects(role.query("SELECT scout_mint.step($1::jsonb)",[JSON.stringify(command())]),/durability_required/);
  await seed(`last_clock=${sqlNow}+10000`);assert.equal((await store().transact(command())).reason,"invalid_clock");
});
test("configuration is opaque, reads exactly three scoped names, pins host and verifies TLS", () => {
  const reads=[],c=loadProductionConfig(k=>{reads.push(k);return {SCOUT_MINT_HELIUS_API_KEY:SYNTHETIC_KEY,SCOUT_MINT_ADMISSION_HMAC_KEY:SYNTHETIC_HMAC,SCOUT_MINT_STORE_DATABASE_URL:DB_URL}[k];},HOST);
  assert.deepEqual(reads,["SCOUT_MINT_HELIUS_API_KEY","SCOUT_MINT_ADMISSION_HMAC_KEY","SCOUT_MINT_STORE_DATABASE_URL"]);
  for(const secret of [SYNTHETIC_KEY,SYNTHETIC_HMAC,SYNTHETIC_DB_PASSWORD])assert.ok(!JSON.stringify(c).includes(secret));
  assert.equal(c.hmacKey,SYNTHETIC_HMAC);const p=databaseParameters(c.database);
  assert.equal(p.ssl.rejectUnauthorized,true);assert.equal(p.ssl.servername,HOST);assert.equal(p.enableChannelBinding,true);assert.equal(p.connectionString,undefined);assert.equal(p.max,1);
  assert.throws(()=>databaseParameters({host:HOST,provider:"neon-postgres"}));
  for(const value of [DB_URL.replace(HOST,"evil.invalid"),DB_URL+"?sslmode=no-verify",DB_URL+"?sslmode=require&ssl=false",DB_URL+"#x",DB_URL.replace("postgresql:","http:"),DB_URL.replace(HOST,HOST+":80"),DB_URL.replace("scout_test:","postgres:")])assert.equal(prepareDatabase(value,HOST),null);
  for(const pin of ["localhost","127.0.0.1",HOST+".evil.invalid",HOST.replace("ep-synthetic-only.","ep-synthetic-only-ro.")])assert.equal(prepareDatabase(DB_URL,pin),null);
});
test("Neon legacy and c-N routed hosts keep exact pins, opaque credentials and verified native TLS",()=>{
  for(const host of [HOST,"ep-synthetic-only.c-7.us-east-2.aws.neon.tech","ep-synthetic-only.c-2.eastus2.azure.neon.tech"]){
    const handle=prepareDatabase(DB_URL.replace(HOST,host),host);assert.ok(handle);
    const params=databaseParameters(handle);
    assert.equal(params.host,host);assert.equal(params.ssl.servername,host);assert.equal(params.ssl.rejectUnauthorized,true);
    assert.equal(params.enableChannelBinding,true);assert.equal(params.connectionString,undefined);
    assert.ok(!JSON.stringify(handle).includes(SYNTHETIC_DB_PASSWORD));
    assert.equal(prepareDatabase(DB_URL.replace(HOST,host.replace('synthetic-only','another-synthetic')),host),null);
  }
});
test("Neon routing compatibility rejects forged suffixes, extra labels, read replicas and URL overrides",()=>{
  const good="ep-synthetic-only.c-7.us-east-2.aws.neon.tech";
  for(const host of [good+".evil.invalid",good.replace('.c-7.','.c-seven.'),good.replace('.c-7.','.c-7.c-8.'),good.replace('ep-synthetic-only.','ep-synthetic-only-ro.'),good.replace('.neon.tech','.neon.invalid'),"localhost"]){
    assert.equal(prepareDatabase(DB_URL.replace(HOST,host),host),null,host);
  }
  const url=DB_URL.replace(HOST,good);
  for(const value of [url+'?sslmode=no-verify',url+'?sslmode=require&ssl=false',url+'#fragment',url.replace(good,good+':80'),url.replace('scout_test:','neondb_owner:')])assert.equal(prepareDatabase(value,good),null);
});
test("Neon setup does not enable the production gate or install host/project pins",()=>{
  assert.deepEqual(LIVE_APPROVAL,{enabled:false,storeHost:null,vercelProjectId:null});
});
for(const missing of ["SCOUT_MINT_HELIUS_API_KEY","SCOUT_MINT_ADMISSION_HMAC_KEY","SCOUT_MINT_STORE_DATABASE_URL"])test(`missing ${missing} denies before store/RPC`,async()=>{
  const s=runtime({secrets:{[missing]:undefined}}),a=await read(s);assert.equal(a.body.reason,"upstream_unavailable");assert.equal(s.calls.store,0);assert.equal(s.calls.rpc,0);
  await read(s);assert.equal(s.calls.secrets.length,3);
});
test("direct-Vercel identity requires runtime/project/origin and overwritten single-IP profile",async()=>{
  assert.deepEqual(vercelIdentity(request(),context,PROJECT),{ip:"203.0.113.8"});
  for(const ctx of [{},{...context,vercel:"0"},{...context,environment:"preview"},{...context,projectId:"prj_WRONGPROJECT111"}])assert.equal(vercelIdentity(request(),ctx,PROJECT),null);
  for(const headers of [{"x-forwarded-for":"198.51.100.1"},{"x-vercel-forwarded-for":"203.0.113.8, 198.51.100.1"},{"x-vercel-forwarded-for":"unknown"},{"x-vercel-forwarded-for":"::1%eth0"},{"x-forwarded-host":"evil.invalid"},{"x-forwarded-proto":"http"}])assert.equal(vercelIdentity(request(MINT,headers),context,PROJECT),null);
  const s=runtime({context:{}}),a=await read(s);assert.equal(a.body.reason,"access_denied");assert.equal(s.calls.secrets.length,0);assert.equal(s.calls.store,0);
});
test("inactive native route cannot read hosting/SCOUT/PG credentials or fetch, including fresh import",()=>{
  const code=`const assert=require('node:assert/strict');process.env=new Proxy({NODE_ENV:'production'},{get(t,k){if(/SCOUT|HELIUS|PG|VERCEL|RPC|KEY|SECRET/.test(String(k)))throw Error('forbidden configuration read');return t[k]}});globalThis.fetch=()=>{throw Error('forbidden network')};const r=require(${JSON.stringify(root+"/app/api/mint-facts/route.js")});(async()=>{const x=await r.GET(new Request(${JSON.stringify(ORIGIN+"/api/mint-facts?mint="+MINT)}));assert.equal(x.status,503);assert.equal((await x.json()).reason,'disabled');assert.ok(!Object.keys(require.cache).some(x=>/node_modules\\/pg\\//.test(x)))})().catch(()=>process.exitCode=1);`;
  const r=spawnSync(process.execPath,["--conditions=react-server","-e",code],{encoding:"utf8",env:{NODE_ENV:"production",NODE_PATH:process.env.NODE_PATH},timeout:10000});
  assert.equal(r.status,0,r.stderr);assert.equal(LIVE_APPROVAL.enabled,false);assert.equal(Object.isFrozen(LIVE_APPROVAL),true);
});
test("OFF gate and invalid origin/query return before even fake platform config",async()=>{
  const off=runtime({approval:LIVE_APPROVAL});assert.equal((await read(off)).body.reason,"disabled");assert.equal(off.calls.hosting,0);assert.equal(off.calls.secrets.length,0);assert.equal(off.calls.rpc,0);
  const s=runtime();for(const url of [`https://evil.invalid/api/mint-facts?mint=${MINT}`,`${ORIGIN}/api/mint-facts?mint=${MINT}&enabled=true`,`${ORIGIN}/api/mint-facts?mint=SI`])assert.notEqual((await read(s,new Request(url))).r.status,200);
  assert.equal(s.calls.hosting,0);assert.equal(s.calls.secrets.length,0);assert.equal(s.calls.store,0);
});
for(const [status,reason] of [[401,"access_denied"],[403,"access_denied"],[429,"rate_limited"],[503,"upstream_unavailable"]])test(`SYNTHETIC upstream ${status} redacts and durably closes circuit`,async()=>{
  const s=runtime({rpc:()=>new Response(`SYNTHETIC_SECRET ${SYNTHETIC_KEY}`,{status})}),a=await read(s);
  assert.equal(a.body.reason,reason);assert.equal(a.body.facts,null);assert.ok(!JSON.stringify(a.body).includes(SYNTHETIC_KEY));assert.equal(s.calls.rpc,1);
  const b=runtime();assert.equal((await read(b)).body.reason,"circuit_open");assert.equal(b.calls.rpc,0);
});
test("SYNTHETIC Token-2022 response keeps unreviewed-extension state through SQL/HTTP/consumer",async()=>{
  const s=runtime({rpc:(_url,init)=>{const e=token2022();e.id=JSON.parse(init.body).id;e.result.value.data.space=500;e.result.value.data.parsed.info.extensions=[{extension:"transferHook"}];return response(e);}});
  const a=await read(s);assert.equal(a.r.status,200);assert.equal(a.body.status,"unsupported_extensions");assert.equal(a.body.facts.interpretation.freezing,"extension_review_required");assert.equal(projectMintFacts(a.body,MINT,Date.now(),"production").kind,"facts");
});
test("unavailable SQL function cannot authorize a provider request", async () => {
  await db.owner.query("ALTER FUNCTION scout_mint.step(jsonb) RENAME TO unavailable_step");
  try {const s=runtime(),a=await read(s);assert.equal(a.body.reason,"upstream_unavailable");assert.equal(s.calls.rpc,0);}
  finally {await db.owner.query("ALTER FUNCTION scout_mint.unavailable_step(jsonb) RENAME TO step");}
});
test("SYNTHETIC real production 5s deadline aborts stalled RPC and durably stops replicas", async () => {
  let signal;const s=runtime({rpc:(_url,init)=>{signal=init.signal;return new Promise(()=>{});}}),started=performance.now();
  const a=await read(s);assert.equal(a.r.status,504);assert.equal(a.body.reason,"timeout");assert.equal(a.body.facts,null);
  assert.ok(performance.now()-started<6500);assert.equal(signal.aborted,true);assert.equal((await policy()).rpc_day,1);
  const next=runtime();assert.equal((await read(next)).body.reason,"circuit_open");assert.equal(next.calls.rpc,0);
});
test("real SQL bounds cache entries to eight and evicts without extending remaining clocks", async () => {
  const s=store();let last;
  for(let i=1;i<=9;i++){
    const mint="1".repeat(31)+String(i),a=await s.transact(command(i,mint));assert.equal(a.kind,"lease");
    const cache={mint,json:"SYNTHETIC_STRUCTURAL_CACHE_ONLY",mac:"0".repeat(64),checkedAt:a.now,expiresAt:a.now+30000,slot:"400000001"};
    assert.equal((await s.transact(complete(a.lease,{cache}))).kind,"committed");last=cache;
    // Test owner seeds spacing/window state to avoid waiting; production role cannot do this.
    await seed(`last_rpc=${sqlNow}-10001,rpc_min=0`);
  }
  const rows=(await db.owner.query("SELECT * FROM scout_mint.cache")).rows;
  assert.equal(rows.length,8);assert.ok(!rows.some(x=>x.mint==="1".repeat(31)+"1"));
  assert.equal(rows.find(x=>x.mint===last.mint).entry.expiresAt,last.expiresAt);
});
test("future/inconsistent cache clocks are rejected before atomic publication", async () => {
  const s=store(),a=await s.transact(command());
  const cache={mint:MINT,json:"SYNTHETIC_INVALID_CLOCK",mac:"0".repeat(64),checkedAt:a.now+10000,expiresAt:a.now+40000,slot:"400000001"};
  assert.equal((await s.transact(complete(a.lease,{cache}))).reason,"stale_source");assert.equal((await policy()).highest_slot,"0");
  assert.equal((await db.owner.query("SELECT count(*) FROM scout_mint.cache")).rows[0].count,"0");
});
test("unknown policy and corrupt/future durable counters cannot refill source budget", async () => {
  await assert.rejects(seed("rpc_day=-1"),e=>e.code==="23514");
  await assert.rejects(seed("seq=9007199254740992"),e=>e.code==="23514");
  const s=store();assert.equal((await s.transact({...command(),policy:"scout-helius-mint/other-epoch"})).reason,"invalid_response");
  assert.equal((await policy()).rpc_day,0);
  await db.reset();await seed(`minute=${sqlNow}/60000+1`);
  assert.equal((await store().transact(command())).reason,"invalid_clock");assert.equal((await policy()).rpc_day,0);
});
test("pre-aborted request and valid zero supply do not become missing or invented evidence", async () => {
  const controller=new AbortController();controller.abort();const off=runtime();
  assert.equal((await read(off,new Request(request(),{signal:controller.signal}))).body.reason,"timeout");assert.equal(off.calls.rpc,0);
  const s=runtime({rpc:(_url,init)=>{const e=envelope();e.id=JSON.parse(init.body).id;e.result.value.data.parsed.info.supply="0";return response(e);}});
  const a=await read(s);assert.equal(a.r.status,200);assert.equal(a.body.facts.supply.raw,"0");assert.equal(projectMintFacts(a.body,MINT,Date.now(),"production").kind,"facts");
});
