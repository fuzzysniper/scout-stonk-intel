// Real optimized Next cold-start/API execution, with invented local source responses and egress blocked.
// This is NOT a real Jupiter call, authenticated Vercel POST, or proof that a hosted stack trace was obtained.
import http from 'node:http';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {spawn} from 'node:child_process';import {createServer,createConnection} from 'node:net';import {createHash} from 'node:crypto';
import {HOST,SOL,USDC,MISSING,previewEnvironment} from './fixtures.mjs';
const require=createRequire(import.meta.url),{isLensResponse}=require(path.join(process.env.ORACLE_265_BUILD,'app/lens/intelligence-model.js'));
const tracePath='.next/server/app/api/v4/ca-intelligence/route.js.nft.json',trace=fs.readFileSync(tracePath,'utf8'),files=JSON.parse(trace).files;
assert.ok(Array.isArray(files)&&files.length>0);const denied=/node_modules\/(?:pg(?:-[^/]+)?|better-auth|@better-auth)(?:\/|$)|native-tls\.mjs|v4-oracle\/native-mint\/producer/;
for(const f of files)assert.doesNotMatch(f.replaceAll('\\','/'),denied,'inactive producer/SQL/auth dependency in active route trace');
process.stdout.write(JSON.stringify({traceFiles:files.length,traceSha256:createHash('sha256').update(trace).digest('hex'),inactiveDependencies:0})+'\n');
async function app(admitted){const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));let output='';const child=spawn(process.execPath,['--import',path.resolve('tests/oracle-regression-265/preload.mjs'),'node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,...previewEnvironment(),VERCEL_ENV:admitted?'preview':'production',NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',ORACLE_265_LOCAL_FIXTURE:'1'},stdio:['ignore','pipe','pipe']});
 for(const p of [child.stdout,child.stderr])p.on('data',b=>{output=(output+b.toString()).slice(-64000);});
 const stop=async()=>{child.kill('SIGTERM');await new Promise(r=>{child.once('exit',r);setTimeout(()=>{child.kill('SIGKILL');r();},2000).unref();});};
 try{let ready=false;for(let i=0;i<120;i++){if(child.exitCode!==null)throw Error('LOCAL_NEXT_START_FAILED');try{await new Promise((res,rej)=>{const s=createConnection({host:'127.0.0.1',port},()=>{s.end();res();});s.on('error',rej);});ready=true;break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,'optimized app listening');
 const headers={host:HOST,origin:'https://'+HOST,'x-forwarded-host':HOST,'x-forwarded-proto':'https','sec-fetch-site':'same-origin','content-type':'application/json','x-unfarmd-ca-intent':'inspect'};
 const localRequest=(method,extra={},body)=>new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path:'/api/v4/ca-intelligence',method,headers:{...headers,...extra}},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));});req.on('error',reject);if(body)req.write(body);req.end();});
 const send=(mint=USDC,extra={})=>localRequest('POST',extra,JSON.stringify({action:'inspect',mint}));
 if(admitted){for(const mint of [USDC,SOL,MISSING]){const r=await send(mint),v=await r.json();assert.equal(r.status,200,'SYNTHETIC optimized '+mint);assert.ok(isLensResponse(v,mint));assert.equal(v.riskFindings.length,24);assert.equal(v.oracleEvidence.nativeMint.state,'unavailable');assert.equal(v.oracleEvidence.holders.state,'unavailable');assert.ok(v.riskFindings.filter(f=>f.id.startsWith('onchain-')||f.id.startsWith('farming-')).every(f=>f.tone==='gray'));if(mint===MISSING)assert.ok(v.riskFindings.every(f=>f.tone==='gray'));else assert.match(v.name,/SYNTHETIC/);assert.equal(r.headers.get('set-cookie'),null);}
  for(const bad of [{origin:'https://evil.invalid'},{host:'evil.invalid'},{'x-forwarded-host':'evil.invalid'},{'x-forwarded-proto':'http'},{'sec-fetch-site':'cross-site'}])assert.equal((await send(USDC,bad)).status,403);
  assert.equal((await localRequest('GET')).status,503);
  assert.equal((output.match(/SYNTHETIC_PROVIDER_FIXTURE_CALL/g)??[]).length,3,'one injected response per deliberate valid action only');
 }else{const r=await send();assert.equal(r.status,503);assert.equal(r.headers.get('x-unfarmd-inspect-stage'),null);assert.deepEqual(await r.json(),{error:'private_development_off'});assert.equal((output.match(/SYNTHETIC_PROVIDER_FIXTURE_CALL/g)??[]).length,0);}
 assert.doesNotMatch(output,/FORBIDDEN_INACTIVE_STACK|NONLOCAL_TEST_REQUEST_BLOCKED/);
 }finally{await stop();}}
await app(true);await app(false);
process.stdout.write('SYNTHETIC optimized cold-start PASS: SOL/USDC/unindexed24 + GET/OFF/Host/Origin denials; zero native/PG imports; zero real source calls. Hosted authenticated POST remains UNPROVEN.\n');
