// Actual optimized Next endpoints, never a remote host.
import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
const port=4291,base='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:'ignore'});
try{let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/lens')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready);
 for(const path of ['/api/v4/theses','/api/v4/theses/11111111-1111-4111-8111-111111111111'])for(const method of ['GET',path.endsWith('theses')?'POST':'PATCH']){const r=await fetch(base+path,{method,headers:{Origin:'https://forged.invalid','X-Owner-Id':'forged'},...(method==='GET'?{}:{body:'SYNTHETIC_NOT_JSON'})});assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'storage_off',saved:false});assert.equal(r.headers.get('cache-control'),'private, no-store');}
 console.log('PASS: optimized installed thesis routes OFF before hostile body/owner/origin; no auth, keys or DB binding.');
}finally{child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}
