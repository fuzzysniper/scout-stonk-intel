import {assertFinal} from './review.mjs';
// Actual optimized local routes and their complete Next function dependency traces.
import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
assertFinal();
const traces=files('.next/server/app/api').filter(f=>f.endsWith('route.js.nft.json'));assert.ok(traces.length>=20);
for(const f of traces){const trace=JSON.parse(fs.readFileSync(f));for(const dependency of trace.files)assert.doesNotMatch(dependency,/lib\/v4-owner-thesis\/bridge|lib\/v4-helius-native\/(?:producer|testing|transport)|ops\/v4-journal\//,f+' unselected private/native/package dependency');}
const port=4237,base='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:'ignore'});
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/lens')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready);
 // All installed public API function traces above exclude every new capability.
 // Actual hostile HTTP probes below cover every owner/source acquisition/control surface.
 const mint='So11111111111111111111111111111111111111112';
 for(const url of ['/api/v4/theses','/api/v4/theses/11111111-1111-4111-8111-111111111111'])for(const method of ['GET',url.endsWith('theses')?'POST':'PATCH']){const r=await fetch(base+url,{method,headers:{Origin:base,'X-UNFARMD-V4-OWNER-INTENT':'journal','X-CSRF-TOKEN':'SYNTHETIC','Cookie':'__Host-unfarmd-v4-owner=SYNTHETIC'},...(method==='GET'?{}:{body:'SYNTHETIC_NOT_JSON'})});assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'storage_off',saved:false});}
 for(const url of ['/api/mint-facts?mint='+mint,'/api/live-events','/api/live-events/continuous','/api/live-events/continuous/control']){const r=await fetch(base+url);assert.ok([401,403,503].includes(r.status),url+' cannot activate');}
 for(const url of ['/api/live-events/stop','/api/live-events/continuous/stop','/api/live-events/continuous/maintenance']){const r=await fetch(base+url,{method:'POST',headers:{Origin:base},body:'SYNTHETIC'});assert.ok([401,403,503].includes(r.status),url+' remains protected/OFF');}
 for(const url of ['/api/v4/helius-pilot','/api/v4/auth/get-session'])assert.equal((await fetch(base+url)).status,404,'no new installed issuer or native producer route');
 console.log('PASS: all '+traces.length+' installed API function traces exclude new capabilities; owner/source/control HTTP gates OFF, no issuer/native route.');
}finally{child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}
