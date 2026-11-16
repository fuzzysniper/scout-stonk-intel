// Actual native HTTPS/SNI/CA test on loopback ONLY. Synthetic ephemeral TLS key.
// Run under the existing OS namespace + no-database guards, never against a provider.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import https from 'node:https';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {getReader,paths} from '../../ops/native-beta-output/preflight.mjs';import {context} from '../native-beta-output/fixtures.mjs';
assert.deepEqual(Object.keys(os.networkInterfaces()),['lo']);
const dir=fs.mkdtempSync('/tmp/SYNTHETIC-preview-tls-'),key=path.join(dir,'key.pem'),cert=path.join(dir,'cert.pem');
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=api.github.com','-addext','subjectAltName=DNS:api.github.com','-keyout',key,'-out',cert],{stdio:'ignore'});
let seen=0,sni=false;const server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{seen++;assert.equal(req.method,'GET');res.setHeader('Content-Type','application/json');res.end('{"synthetic":true}');});server.on('secureConnection',s=>{sni=s.servername==='api.github.com'});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const original=https.request;
https.request=(opts,cb)=>{assert.equal(opts.hostname,'api.github.com');assert.equal(opts.servername,'api.github.com');assert.equal(opts.rejectUnauthorized,true);assert.equal(opts.minVersion,'TLSv1.2');return original({...opts,hostname:'127.0.0.1',port:server.address().port,ca:fs.readFileSync(cert)},cb);};
try{const p=paths(context()).run,read=getReader('api.github.com','SYNTHETIC_TOKEN_123456789',new Set([p]));assert.deepEqual(await read(p),{synthetic:true});assert.equal(seen,1);assert.equal(sni,true);console.log(JSON.stringify({kind:'ACTUAL_LOOPBACK_TLS_SYNTHETIC_CA',strictCertificateAndHostname:true,nativeClientSniProperty:true,requests:seen,externalRoutes:0,providerCalls:0,sourceGo:false}));}finally{https.request=original;await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
