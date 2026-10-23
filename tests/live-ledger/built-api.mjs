// Actual local production Next route smoke, no UI/provider/hosted DB. Run AFTER npm run build.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:'ignore',env:{PATH:process.env.PATH,NODE_ENV:'production',SCOUT_LIVE_API_ENABLED:'false',SCOUT_LIVE_STORE_ENABLED:'false',NODE_OPTIONS:'--import='+process.cwd()+'/tests/security114/local-only.mjs'}});
const url='http://127.0.0.1:'+port;
try{
 let ready=false;for(let i=0;i<80;i++){try{const r=await fetch(url+'/api/live-events');if(r.status===503){ready=true;break;}}catch{}await delay(100);}
 assert.ok(ready,'local production route became ready');
 for(const [path,method,status] of [['/api/live-events','GET',503],['/api/live-events/stop','POST',503],['/api/live-events/stop','GET',405],['/api/live-events','POST',405]]){
  const r=await fetch(url+path,{method});assert.equal(r.status,status);if(status===503){const body=await r.json();assert.equal(body.status,'disabled');assert.equal(body.events,null);assert.match(r.headers.get('cache-control'),/no-store/);}
 }
 console.log('PASS: built Node GET and STOP routes default disabled; wrong methods 405; no source/DB credentials supplied.');
}finally{child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}
