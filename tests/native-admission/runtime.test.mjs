// SYNTHETIC generated-code harness. No production gate is changed, no actual TLS/owner approval,
// database, provider or GitHub request. Exercise the private issuance path without exporting a test cap.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import https from 'node:https';import {EventEmitter} from 'node:events';
import {fixture,load,require} from './fixtures.mjs';
const {listingPath,configurationPath,evidencePaths}=load('github');
async function harness(source,breakSource=false){
 const f=fixture(),folder=fs.mkdtempSync(path.join(process.env.ADMISSION_BUILD,'lib/native-pilot/admission-synthetic-'));
 const input=path.join(process.env.ADMISSION_BUILD,'lib/native-pilot/admission');
 for(const file of fs.readdirSync(input))if(file.endsWith('.js'))fs.copyFileSync(path.join(input,file),path.join(folder,file));
 const installed=path.join(folder,'installed.js'),gates=path.join(folder,'gates.js');
 let code=fs.readFileSync(installed,'utf8');assert.match(code,/exports.NATIVE_ADMISSION_PLAN = null;/);assert.match(code,/exports.NATIVE_ADMISSION_BUILD = null;/);
 code=code.replace('exports.NATIVE_ADMISSION_PLAN = null;','exports.NATIVE_ADMISSION_PLAN = '+JSON.stringify(f.plan)+';').replace('exports.NATIVE_ADMISSION_BUILD = null;','exports.NATIVE_ADMISSION_BUILD = '+JSON.stringify({commit:f.p.commit,tree:f.p.tree})+';');fs.writeFileSync(installed,code);
 code=fs.readFileSync(gates,'utf8');assert.match(code,/exports.NATIVE_SETUP_RUNTIME_ENABLED = false;/);fs.writeFileSync(gates,code.replace('exports.NATIVE_SETUP_RUNTIME_ENABLED = false;','exports.NATIVE_SETUP_RUNTIME_ENABLED = true;'));
 const originalRequest=https.request,originalClock=Date.now,originalEnv=process.env;let now=f.now;const reads=[],responses=new Map();
 for(const stage of ['setup','source']){
  const record=f[stage],pub=f.publication(stage,record);if(stage==='source')pub.id++;
  responses.set(listingPath(stage,f.context),[pub]);responses.set(configurationPath(stage,f.context),f.configuration(stage,record));
  const evidence=structuredClone(f.evidence(stage,record));if(stage==='source'&&breakSource)evidence.reviews[0].user.id++;
  for(const [key,url]of Object.entries(evidencePaths(record,stage,pub)))responses.set(url,evidence[key]);
 }
 process.env={...originalEnv,VERCEL:'1',VERCEL_ENV:'preview',VERCEL_PROJECT_ID:f.p.project,VERCEL_GIT_PROVIDER:'github',VERCEL_GIT_REPO_OWNER:'fuzzysniper',VERCEL_GIT_REPO_SLUG:'scout-stonk-intel',VERCEL_GIT_COMMIT_SHA:f.p.commit,VERCEL_GIT_COMMIT_REF:f.p.branch,VERCEL_DEPLOYMENT_ID:f.p.deployment,VERCEL_URL:new URL(f.p.origin).hostname,UNFARMD_NATIVE_GITHUB_READ_TOKEN:'SYNTHETIC_READ_ONLY_GITHUB_TOKEN_000'};
 Date.now=()=>now;
 https.request=(options,callback)=>{
  assert.equal(options.hostname,'api.github.com');assert.equal(options.method,'GET');assert.ok(responses.has(options.path));reads.push(options.path);
  const q=new EventEmitter();q.destroy=()=>{q.destroyed=true;};q.end=()=>queueMicrotask(()=>{
   const socket=new EventEmitter();Object.assign(socket,{encrypted:true,authorized:true,servername:'api.github.com',getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:api.github.com',subject:{CN:'api.github.com'}})});q.emit('socket',socket);socket.emit('secureConnect');if(q.destroyed)return;
   const r=new EventEmitter();Object.assign(r,{statusCode:200,headers:{'content-type':'application/json'},complete:true,destroy(){this.destroyed=true;}});callback(r);if(!r.destroyed){r.emit('data',Buffer.from(JSON.stringify(responses.get(options.path))));r.emit('end');}
  });return q;
 };
 try{
  const runtime=require(installed),caps=await runtime.loadNativeAdmissions(source);assert.equal(reads.length,source?18:9);
  if(breakSource){assert.equal(caps,null);return;}
  assert.ok(caps?.setup);assert.equal(runtime.nativeSetupRecord(caps.setup,f.p).record.owner.subject,f.p.ownerSubject);assert.throws(()=>runtime.nativeSetupRecord({...caps.setup},f.p));
  if(source){
   assert.equal(runtime.nativeSourcePermitted(caps.source,caps.setup,f.p),true);
   now=f.now+30001;assert.equal(runtime.nativeSourcePermitted(caps.source,caps.setup,f.p),false);
   assert.ok(runtime.nativeSetupRecord(caps.setup,f.p)); // STOP's setup authority survives source-cap expiry.
   now=f.now;assert.equal(runtime.nativeSourcePermitted(caps.source,caps.setup,f.p),false);assert.throws(()=>runtime.nativeSetupRecord(caps.setup,f.p)); // rollback latches, never restores authority
  }else assert.equal(caps.source,null);
 }finally{https.request=originalRequest;Date.now=originalClock;process.env=originalEnv;fs.rmSync(folder,{recursive:true,force:true});}
}
test('SYNTHETIC private fixed-host issuance verifies 18 exact reads and opaque caps, expires and latches rollback',()=>harness(true));
test('SYNTHETIC setup-only issuance uses 9 reads and cannot grant acquisition',()=>harness(false));
test('SYNTHETIC source review failure returns no partial setup/source authority',()=>harness(true,true));
