// Actual TLS on a loopback-only OS namespace. All certificates and messages SYNTHETIC.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import https from 'node:https';import tls from 'node:tls';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';
assert.deepEqual(Object.keys(os.networkInterfaces()),['lo']);
const root=path.resolve('ops/native-beta-output/toolchain'),dir=fs.mkdtempSync('/tmp/SYNTHETIC-uploader-tls-');
const openssl=args=>execFileSync('openssl',args,{cwd:dir,stdio:'ignore'});
openssl(['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost','-keyout','key.pem','-out','cert.pem']);
const key=fs.readFileSync(path.join(dir,'key.pem')),cert=fs.readFileSync(path.join(dir,'cert.pem'));
let requests=0;const server=https.createServer({key,cert},(q,r)=>{requests++;assert.equal(q.headers['x-synthetic'],'1');r.setHeader('content-type','application/json');r.end('{"kind":"SYNTHETIC_LOCAL_TLS"}');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port,origin='https://localhost:'+port,lookup=(_h,o,cb)=>o.all?cb(null,[{address:'127.0.0.1',family:4}]):cb(null,'127.0.0.1',4);
try{
 const copies=['node_modules/undici','node_modules/@vercel/sandbox/node_modules/undici'];
 for(const copy of copies){
  const req=createRequire(path.join(root,copy,'package.json')),{Agent,request,Headers,fetch}=req(path.join(root,copy)),version=req(path.join(root,copy,'package.json')).version;
  const positive=new Agent({connect:{ca:cert,lookup,rejectUnauthorized:true,checkServerIdentity:tls.checkServerIdentity}});
  const before=requests;try{const a=await request(origin,{dispatcher:positive,headers:{'x-synthetic':'1'}});assert.equal(a.statusCode,200);assert.deepEqual(await a.body.json(),{kind:'SYNTHETIC_LOCAL_TLS'});const b=await fetch(origin,{dispatcher:positive,headers:new Headers({'x-synthetic':'1'})});assert.equal(b.status,200);await b.arrayBuffer();assert.equal(requests,before+2);}finally{await positive.close();}
  // Advisory-specific positive control: same trusted peer, custom TLS callback.
  let calls=0;const rejected=new Agent({connect:{ca:cert,lookup},tls:{checkServerIdentity(){calls++;return Error('SYNTHETIC_CUSTOM_CERT_REJECT');}}});
  const n=requests;try{await assert.rejects(()=>request(origin,{dispatcher:rejected,headers:{'x-synthetic':'1'}}));assert.ok(calls>0,'custom tls verifier must run, not an earlier unrelated denial');assert.equal(requests,n);}finally{await rejected.close();}
  const unknown=new Agent({connect:{lookup,rejectUnauthorized:true}});try{await assert.rejects(()=>request(origin,{dispatcher:unknown,headers:{'x-synthetic':'1'}}));assert.equal(requests,n);}finally{await unknown.close();}
  const wrong=new Agent({connect:{ca:cert,lookup,rejectUnauthorized:true}});try{await assert.rejects(()=>request('https://127.0.0.1:'+port,{dispatcher:wrong,headers:{'x-synthetic':'1'}}));assert.equal(requests,n);}finally{await wrong.close();}
  console.log(JSON.stringify({kind:'ACTUAL_UNDICI_LOOPBACK_TLS_SYNTHETIC',copy,version,positiveRequestAndFetch:true,customVerifierExecutedAndRejected:true,untrustedCARejected:true,wrongHostnameRejected:true,externalRoutes:0,sourceCalls:false}));
 }
}finally{server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
