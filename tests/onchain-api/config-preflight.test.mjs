// SYNTHETIC OFFLINE configuration only. No production env/credentials, SQL or provider requests.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {root} from './fixtures.mjs';
const require=createRequire(import.meta.url);
const {databaseCompatibility,prepareDatabase,databaseParameters}=require(root+'/lib/onchain-mint/server/production-config.js');
const {configPreflight,PREFLIGHT_APPROVAL,PREFLIGHT_QUERY,PREFLIGHT_INTENT}=require(root+'/lib/onchain-mint/server/config-preflight.js');
const policy=require(root+'/lib/onchain-mint/server/lookup-policy.js'),A=policy.LOOKUP_APPROVAL;
const HOST='ep-synthetic-preflight.c-7.us-east-2.aws.neon.tech';
const PASSWORD='SYNTHETIC_OFFLINE_PREFLIGHT_PASSWORD',IDENTITY={role:'scout_mint_app',database:'neondb'};
const DSN=`postgresql://scout_mint_app:${PASSWORD}@${HOST}/neondb`;
const REAL_PIN_DSN=DSN.replace(HOST,A.storeHost); // Synthetic password, no network resolution.
const DEPLOYMENT='scout-stonk-intel-syntheticpreflight-riskledgerapp.vercel.app',ORIGIN='https://'+DEPLOYMENT,SHA='a'.repeat(40),NOW=Date.parse('2026-10-22T19:20:00Z');
const CONTEXT={vercel:'1',environment:'production',projectId:A.vercelProjectId,deploymentUrl:DEPLOYMENT,commitSha:SHA};
const CLASSIFICATIONS=['dsn_missing','dsn_invalid_or_unapproved','format_compatible_binding_unproven','blocked_required_channel_binding'];
const ALL=[...CLASSIFICATIONS,'disabled','access_denied','preflight_unavailable'];
const classify=v=>databaseCompatibility(v,HOST,IDENTITY);
const req=(options={})=>new Request(options.url??ORIGIN+'/api/mint-facts'+PREFLIGHT_QUERY,{method:options.method??'POST',signal:options.signal,headers:{
 origin:ORIGIN,'sec-fetch-site':'same-origin','sec-fetch-dest':'empty','x-scout-preflight-intent':PREFLIGHT_INTENT,'x-scout-preflight-commit':SHA,
 'x-forwarded-host':DEPLOYMENT,'x-forwarded-proto':'https','x-forwarded-for':'203.0.113.5','x-vercel-forwarded-for':'203.0.113.5',...options.headers,
 },...(options.body===undefined?{}:{body:options.body,duplex:'half'})});
function system(options={}){
 let now=NOW;const calls={hosting:0,dsn:0,clock:0};
 const handler=configPreflight(options.approval??{enabled:true,notBeforeMs:NOW-1000,expiresAtMs:NOW+60000},{
  hosting:()=>{calls.hosting++;if(options.hostingError)throw options.hostingError;return {...CONTEXT,...options.context}},
  readDsn:()=>{calls.dsn++;if(options.readError)throw options.readError;if(options.readAdvance)now+=options.readAdvance;return options.dsn===undefined?REAL_PIN_DSN:options.dsn},
  now:()=>{calls.clock++;return now},
 });return{handler,calls,advance:ms=>{now+=ms}};
}
async function read(s,r=req()){
 const res=await s.handler(r),text=await res.text(),body=JSON.parse(text);
 assert.deepEqual(Object.keys(body),['status']);assert.ok(ALL.includes(body.status));assert.ok(text.length<96);
 for(const v of [PASSWORD,DSN,HOST,A.storeHost,DEPLOYMENT,SHA,'postgresql:','api-key='])assert.ok(!text.includes(v));
 assert.equal(res.headers.get('cache-control'),'private, no-store, max-age=0');assert.equal(res.headers.get('vercel-cdn-cache-control'),'no-store');
 assert.equal(res.headers.get('x-scout-deployment-host'),null);return{res,body};
}

test('reviewed preflight window is immutable and exactly five minutes; mint lookup remains disabled/null',()=>{
 assert.deepEqual(PREFLIGHT_APPROVAL,{enabled:true,notBeforeMs:Date.parse('2026-10-22T19:20:00Z'),expiresAtMs:Date.parse('2026-10-22T19:25:00Z')});
 assert.equal(PREFLIGHT_APPROVAL.expiresAtMs-PREFLIGHT_APPROVAL.notBeforeMs,300000);assert.ok(Object.isFrozen(PREFLIGHT_APPROVAL));
 assert.equal(A.phase,'disabled');assert.equal(A.notBeforeMs,null);assert.equal(A.expiresAtMs,null);assert.ok(Object.isFrozen(A));
});
for(const value of [undefined,''])test('missing synthetic DSN gives only missing category',()=>assert.equal(classify(value),'dsn_missing'));
for(const search of ['', '?sslmode=require'])test(`supported format ${search||'without query'} cannot prove mandatory binding`,()=>{
 assert.equal(classify(DSN+search),'format_compatible_binding_unproven');const h=prepareDatabase(DSN+search,HOST,IDENTITY);assert.ok(h);
 const p=databaseParameters(h);assert.equal(p.ssl.rejectUnauthorized,true);assert.equal(p.ssl.minVersion,'TLSv1.2');assert.equal(p.ssl.servername,HOST);assert.equal(p.enableChannelBinding,true);
});
for(const search of ['?channel_binding=require','?sslmode=require&channel_binding=require','?channel_binding=require&sslmode=require'])test(`required binding ${search} is blocked, never rewritten or weakened`,()=>{
 assert.equal(classify(DSN+search),'blocked_required_channel_binding');assert.equal(prepareDatabase(DSN+search,HOST,IDENTITY),null);
});
const invalid=[null,123,{},'not-a-url',DSN.replace('postgresql:','http:'),DSN.replace(HOST,'evil.invalid'),DSN.replace('scout_mint_app:','postgres:'),DSN.replace('/neondb','/postgres'),
 DSN.replace(HOST,HOST+':80'),DSN+'#secret',DSN+'?sslmode=disable',DSN+'?sslmode=no-verify',DSN+'?channel_binding=disable',DSN+'?channel_binding=prefer',
 DSN+'?sslmode=require&channel_binding=require&channel_binding=disable',DSN+'?sslmode=require&sslmode=require',DSN+'?sslmode=require&options=secret',
 DSN+'?sslmode=require&channel_binding=require&x=secret',DSN+'?channel%5fbinding=require',DSN+'?sslmode=verify-full&channel_binding=require',DSN+'\n',DSN+'x'.repeat(2049),
 DSN.replace(PASSWORD,'short'),DSN.replace(PASSWORD,'SYNTHETIC%0ASECRET_PASSWORD')];
for(const [index,value] of invalid.entries())test(`unapproved synthetic input ${index} gives a generic category without input reflection`,()=>{
 assert.equal(classify(value),'dsn_invalid_or_unapproved');assert.equal(prepareDatabase(value,HOST,IDENTITY),null);
});
test('malicious object conversion/error content cannot enter categorical output',()=>{
 let conversions=0;assert.equal(classify({toString(){conversions++;throw Error(PASSWORD)}}),'dsn_invalid_or_unapproved');assert.equal(conversions,0);
});
test('explicit disabled gate returns before clock, hosting or scoped secret read',async()=>{
 const s=system({approval:{enabled:false,notBeforeMs:null,expiresAtMs:null}});assert.equal((await read(s)).body.status,'disabled');assert.deepEqual(s.calls,{hosting:0,dsn:0,clock:0});
});
test('exact proposed source window allows synthetic classification only from START inclusive to END exclusive',async()=>{
 for(const [now,expected] of [[PREFLIGHT_APPROVAL.notBeforeMs-1,'disabled'],[PREFLIGHT_APPROVAL.notBeforeMs,'format_compatible_binding_unproven'],
  [PREFLIGHT_APPROVAL.expiresAtMs-1,'format_compatible_binding_unproven'],[PREFLIGHT_APPROVAL.expiresAtMs,'disabled']]){
  const s=system({approval:PREFLIGHT_APPROVAL});s.advance(now-NOW);
  assert.equal((await read(s)).body.status,expected);assert.equal(s.calls.dsn,expected==='disabled'?0:1);
  if(expected==='disabled')assert.equal(s.calls.hosting,0);
 }
});
for(const approval of [{enabled:true,notBeforeMs:null,expiresAtMs:null},{enabled:true,notBeforeMs:NOW-1,expiresAtMs:NOW+300000},
 {enabled:true,notBeforeMs:-1,expiresAtMs:NOW+1},{enabled:true,notBeforeMs:NOW+1,expiresAtMs:NOW+2},{enabled:true,notBeforeMs:NOW-10,expiresAtMs:NOW},
 {enabled:true,notBeforeMs:1.5,expiresAtMs:NOW+1}])test('unapproved/expired/over-five-minute window cannot inspect hosting or DSN',async()=>{
 const s=system({approval});assert.equal((await read(s)).body.status,'disabled');assert.equal(s.calls.dsn,0);assert.equal(s.calls.hosting,0);
});
test('hypothetical authorized classification reads only one scoped synthetic DSN and returns no details',async()=>{
 for(const dsn of [REAL_PIN_DSN,REAL_PIN_DSN+'?sslmode=require&channel_binding=require','', 'SYNTHETIC_INVALID']){
  const s=system({dsn}),a=await read(s);assert.equal(a.res.status,200);assert.ok(CLASSIFICATIONS.includes(a.body.status));assert.equal(s.calls.dsn,1);
 }
});
for(const context of [{vercel:'0'},{environment:'preview'},{projectId:'prj_WRONGPROJECT'},{deploymentUrl:'scout-stonk-intel-riskledgerapp.vercel.app'},
 {deploymentUrl:'scout-stonk-intel-git-main-riskledgerapp.vercel.app'},{deploymentUrl:'evil.invalid'},{commitSha:undefined},{commitSha:'b'.repeat(40)},
 {insecureTls:'0'},{forceNativePg:'1'},{forceNativePg:'0'},{forceNativePg:''}])test(`untrusted runtime context ${Object.keys(context)[0]} cannot read DSN`,async()=>{
 const s=system({context});assert.equal((await read(s)).body.status,'access_denied');assert.equal(s.calls.dsn,0);
});
test('public alias, GET, overrides and noncanonical preflight query never read DSN',async()=>{
 const s=system();for(const r of [req({url:'https://scout.storkcoin.xyz/api/mint-facts'+PREFLIGHT_QUERY}),req({method:'GET'}),
  req({url:ORIGIN+'/api/mint-facts'+PREFLIGHT_QUERY+'&mint=USDC'}),req({url:ORIGIN+'/api/mint-facts?preflight=neon%2ddsn-v1'}),
  req({url:ORIGIN+'/api/mint-facts'+PREFLIGHT_QUERY+'&enabled=true'}),req({url:ORIGIN+'/api/other'+PREFLIGHT_QUERY}),
  req({headers:{'x-api-key':'SYNTHETIC_OVERRIDE'}}),req({headers:{'x-rpc-url':'https://evil.invalid'}})])assert.equal((await read(s,r)).body.status,'access_denied');
 assert.equal(s.calls.dsn,0);
});
for(const headers of [{origin:'https://evil.invalid'},{'sec-fetch-site':'cross-site'},{'sec-fetch-dest':'document'},{'x-scout-preflight-intent':'wrong'},
 {'x-scout-preflight-commit':'b'.repeat(40)},{'x-forwarded-for':'198.51.100.5'},{'x-vercel-forwarded-for':'203.0.113.5, 198.51.100.5'},
 {'x-forwarded-host':'evil.invalid'},{'x-forwarded-proto':'http'},{host:'evil.invalid'},{'content-length':'1'},{'content-encoding':'gzip'},
 {'transfer-encoding':'chunked'},{'x-large':'x'.repeat(16385)}])test(`invalid ingress/header ${Object.keys(headers)[0]} rejects before DSN read`,async()=>{
 const s=system();assert.equal((await read(s,req({headers}))).body.status,'access_denied');assert.equal(s.calls.dsn,0);
});
test('nonempty/stalled/aborted request bodies never read DSN',async()=>{
 for(const body of ['x',new ReadableStream({pull:()=>new Promise(()=>{})})]){
  const s=system(),start=performance.now();assert.equal((await read(s,req({body,headers:{'content-length':'0'}}))).body.status,'access_denied');assert.equal(s.calls.dsn,0);assert.ok(performance.now()-start<500);
 }
 const controller=new AbortController();controller.abort();const s=system();assert.equal((await read(s,req({signal:controller.signal}))).body.status,'access_denied');assert.equal(s.calls.dsn,0);
});
test('hosting and secret-reader failures are sanitized without logs or exception reflection',async()=>{
 for(const options of [{hostingError:Error(DSN)},{readError:Error(DSN)}]){
  const s=system(options),a=await read(s);assert.equal(a.body.status,'preflight_unavailable');assert.equal(a.res.status,503);
 }
});
test('expiry during configuration access withholds category without another secret read',async()=>{
 const s=system({readAdvance:60001});assert.equal((await read(s)).body.status,'disabled');assert.equal(s.calls.dsn,1);
});
test('preflight refuses all DSN access if the mint gate is no longer disabled/null',async()=>{
 try{for(const gate of [{...A,phase:'proof'},{...A,notBeforeMs:1},{...A,expiresAtMs:1}]){
  policy.LOOKUP_APPROVAL=gate;const s=system();assert.equal((await read(s)).body.status,'disabled');assert.deepEqual(s.calls,{hosting:0,dsn:0,clock:0});
 }}finally{policy.LOOKUP_APPROVAL=A}
});
test('outside the fixed window the native route has zero env/network effects and no pg driver in a fresh production process',()=>{
 const code=`const assert=require('node:assert/strict');let io=0;for(const name of ['node:http','node:https','node:net','node:tls']){const m=require(name);for(const k of ['request','get','connect','createConnection'])if(typeof m[k]==='function')m[k]=()=>{io++;throw Error('forbidden network')}};globalThis.fetch=()=>{io++;throw Error('forbidden fetch')};process.env=new Proxy({NODE_ENV:'production'},{get(t,k){if(/SCOUT|HELIUS|PG|VERCEL|RPC|KEY|SECRET/.test(String(k)))throw Error('forbidden config read');return t[k]}});const route=require(${JSON.stringify(root+'/app/api/mint-facts/route.js')});(async()=>{for(const now of [${PREFLIGHT_APPROVAL.notBeforeMs-1},${PREFLIGHT_APPROVAL.expiresAtMs}]){Date.now=()=>now;const r=await route.POST(new Request(${JSON.stringify(ORIGIN+'/api/mint-facts'+PREFLIGHT_QUERY)},{method:'POST'}));assert.equal(r.status,503);assert.deepEqual(await r.json(),{status:'disabled'})}assert.equal(io,0);assert.ok(!Object.keys(require.cache).some(x=>/node_modules\\/pg\\//.test(x)))})().catch(()=>process.exitCode=1)`;
 const p=spawnSync(process.execPath,['--conditions=react-server','-e',code],{env:{NODE_ENV:'production',NODE_PATH:process.env.NODE_PATH},encoding:'utf8',timeout:10000});assert.equal(p.status,0,p.stderr);
});
test('enabled synthetic preflight has zero SQL, socket, fetch or logging effects',async()=>{
 const io=[];const patches=[];
 for(const name of ['node:http','node:https','node:net','node:tls']){const m=require(name);for(const k of ['request','get','connect','createConnection'])if(typeof m[k]==='function'){
  patches.push([m,k,m[k]]);m[k]=()=>{io.push(name+'.'+k);throw Error('FORBIDDEN_SYNTHETIC_IO')};
 }}
 for(const k of ['log','warn','error','info','debug']){patches.push([console,k,console[k]]);console[k]=()=>{io.push('console.'+k)}}
 patches.push([globalThis,'fetch',globalThis.fetch]);globalThis.fetch=()=>{io.push('fetch');throw Error('FORBIDDEN_FETCH')};
 const {Pool,Client}=require('pg');for(const prototype of [Pool.prototype,Client.prototype])for(const k of ['connect','query'])if(typeof prototype[k]==='function'){
  patches.push([prototype,k,prototype[k]]);prototype[k]=()=>{io.push('pg.'+k);throw Error('FORBIDDEN_SQL')};
 }
 try{const s=system({dsn:REAL_PIN_DSN+'?sslmode=require&channel_binding=require'});assert.equal((await read(s)).body.status,'blocked_required_channel_binding');assert.equal(s.calls.dsn,1);assert.deepEqual(io,[])}
 finally{for(const [o,k,v] of patches.reverse())o[k]=v}
});
test('preflight native wiring reads only the DSN secret; no credential writer or store/transport import',()=>{
 const s=readFileSync('lib/onchain-mint/server/config-preflight.ts','utf8');
 assert.deepEqual([...s.matchAll(/process\.env\.(SCOUT_[A-Z_]+)/g)].map(m=>m[1]),['SCOUT_MINT_STORE_DATABASE_URL']);
 assert.ok(!/postgres-store|native-transport|loadProductionConfig|databaseParameters|console\.|SCOUT_MINT_HELIUS_API_KEY|SCOUT_MINT_ADMISSION_HMAC_KEY/.test(s));
 assert.ok(!/process\.env\.[A-Z_]+\s*=/.test(s));
});
