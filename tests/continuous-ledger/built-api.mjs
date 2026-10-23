// Actual optimized local Node endpoints with all new gates OFF. No credentials/source/hosted SQL.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {readFileSync} from 'node:fs';
const trace=JSON.parse(readFileSync('.next/server/app/api/live-events/continuous/control/route.js.nft.json','utf8'));
assert.ok(trace.files.some(p=>p.endsWith('/scripts/ops/continuous-mobile-console.js')),'control script must be in real function file trace');
const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:'ignore',env:{PATH:process.env.PATH,NODE_ENV:'production',SCOUT_CONTINUOUS_API_ENABLED:'false',SCOUT_CONTINUOUS_STORE_ENABLED:'false',SCOUT_CONTINUOUS_MAINTENANCE_ENABLED:'false',NODE_OPTIONS:'--import='+process.cwd()+'/tests/security114/local-only.mjs'}});
const root='http://127.0.0.1:'+port+'/api/live-events/continuous';
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(root)).status===503){ready=true;break;}}catch{}await delay(100);}assert.ok(ready);
 for(const [path,method,status] of [['','GET',503],['/stop','POST',503],['/maintenance','POST',503],['/control','GET',503],['/stop','GET',405],['','POST',405]]){
  const r=await fetch(root+path,{method});assert.equal(r.status,status);if(status===503){if(path!=='/control'){const v=await r.json();assert.equal(v.status,'disabled');assert.equal(v.parent,null);assert.equal(v.feed,null);}assert.match(r.headers.get('cache-control'),/no-store/);}
 }
 console.log('PASS: actual optimized parent GET/STOP/maintenance disabled; methods405; no source/SQL credentials.');
}finally{child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}
