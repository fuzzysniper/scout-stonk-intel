import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import http from 'node:http';
import {privateView} from '../ui.mjs';
import {privatePath,claim,latest} from '../storage.mjs';
const require=createRequire(import.meta.url),{Engine}=require(path.join(process.env.LIVE_MARKET_BUILD,'engine.js'));

test('private HTTP view has no source actions, rejects mutations/cross-origin/DNS rebinding, and escapes findings',async()=>{
 let snapshots=0;const ui=await privateView(()=>{snapshots++;return {phase:'NOT_RUN',counts:null,rows:[]};});
 try{
  const a=await fetch(ui.url+'/state');assert.equal(a.status,200);assert.equal((await a.json()).counts,null);
  assert.equal(a.headers.get('cache-control'),'no-store');assert.match(a.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  for(const [url,opts,status] of [['/state',{method:'POST'},403],['/state',{headers:{origin:'https://evil.example'}},403],['/state',{headers:{host:'evil.example'}},403],['/state',{headers:{'sec-fetch-site':'cross-site'}},403],['/start',{},404],['/stop',{method:'POST'},403]]){
   const actual=await new Promise((resolve,reject)=>{const r=http.request(ui.url+url,opts,s=>{s.resume();resolve(s.statusCode);});r.on('error',reject);r.end();});assert.equal(actual,status,JSON.stringify(opts));
  }
  const html=await (await fetch(ui.url)).text();assert.match(html,/Local viewing never opens a provider/);const js=await (await fetch(ui.url+'/view.js')).text();assert.doesNotMatch(js,/innerHTML|https:\/\/|wss:\/\//);assert.equal(snapshots,1);
 }finally{ui.close();}
});
test('outside-Git and symlink guards have no production bypass flag',()=>{
 assert.throws(()=>privatePath(process.cwd()),/OUTSIDE_GIT/);assert.throws(()=>privatePath('relative'),/ABSOLUTE/);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'scout-live-symlink-'));try{fs.symlinkSync(os.tmpdir(),path.join(temp,'link'));assert.throws(()=>privatePath(path.join(temp,'link')));}finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('durable singleton, spent-ID, append hash, crash lock and summary integrity',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'scout-live-store-'));
 // Harness-only /tmp/.git marker is hidden; actual per-test .git/symlink guards stay active.
 // There is no production allow-test, environment bypass or alternate live state root.
 const old=fs.existsSync;fs.existsSync=p=>String(p)==='/tmp/.git'?false:old(p);
 try{
  const id='pilot-offline-storage-12345',s=claim(temp,id);assert.throws(()=>claim(temp,'pilot-offline-other-12345'));
  s.retain('test',{notice:'SYNTHETIC OFFLINE, no provider'});s.finish({phase:'STOPPED',counts:null,rows:[]});
  assert.equal(latest(temp).phase,'STOPPED');assert.throws(()=>claim(temp,id),/ALREADY_SPENT/);assert.equal(old(path.join(temp,'connection.lock')),false);
  const summary=path.join(temp,id,'summary.json');fs.writeFileSync(summary,JSON.stringify({phase:'FAKE'}));assert.throws(()=>latest(temp),/INTEGRITY/);
  fs.rmSync(path.join(temp,id),{recursive:true});assert.throws(()=>claim(temp,id),/ALREADY_SPENT/);assert.equal(latest(temp).phase,'RAW_DATA_DELETED');
  fs.mkdirSync(path.join(temp,'.git'));assert.throws(()=>claim(temp,'pilot-offline-new-12345'),/OUTSIDE_GIT/);
 }finally{fs.existsSync=old;fs.rmSync(temp,{recursive:true,force:true});}
});
test('entry point without GO stays disabled and refuses native activation',()=>{
 const r=execFileSync(process.execPath,[new URL('../run.mjs',import.meta.url).pathname,'status'],{encoding:'utf8'});assert.equal(JSON.parse(r).phase,'NOT_RUN');
 assert.throws(()=>execFileSync(process.execPath,[new URL('../run.mjs',import.meta.url).pathname,'pilot'],{stdio:'pipe'}));
});
test('freshness and counts are real state only; engine can render disabled view without any acquisition',()=>{
 const e=new Engine('SYNTHETIC_OFFLINE',()=>{});const s=e.snapshot('2026-10-22T12:00:00Z');assert.equal(s.startedAt,null);assert.equal(s.counts,null);assert.equal(s.prices,null);
});
