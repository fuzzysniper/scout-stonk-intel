// REAL local Next production handler; no market/Helius/Neon traffic or runtime credentials.
// Run after npm run build. This is separate from the pre-build npm test suite.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {once} from 'node:events';
import {MINT} from './fixtures.mjs';
const port=4189,base=`http://127.0.0.1:${port}/api/trader-pulse`;
const guard=`--import=${process.cwd()}/tests/security114/local-only.mjs`;
let output='';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{
 cwd:process.cwd(),env:{PATH:process.env.PATH,NODE_ENV:'production',NODE_OPTIONS:guard,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe'],
});
child.stdout.on('data',b=>{output=(output+b.toString()).slice(-4000)});
child.stderr.on('data',b=>{output=(output+b.toString()).slice(-4000)});
try{
 let ready=false;
 for(let i=0;i<80;i++){
  if(child.exitCode!==null)throw Error('local Next server exited');
  try{const r=await fetch(base,{signal:AbortSignal.timeout(300),redirect:'error'});if(r.status===400){ready=true;break}}catch{}
  await delay(100);
 }
 assert.ok(ready,'local Next readiness deadline');
 const r=await fetch(`${base}?mint=${MINT}`,{signal:AbortSignal.timeout(2000),redirect:'error'});
 assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);
 const data=await r.json();assert.equal(data.mint,MINT);assert.equal(data.financial,null);assert.equal(data.signals,null);
 assert.equal(data.status,'source_review_required');assert.equal(data.identity.marketMatch,'not_queried');
 assert.deepEqual(data.policy,{sourceObservation:false,financialPublication:false});
 assert.equal((await fetch(`${base}?mint=USDC`,{signal:AbortSignal.timeout(2000)})).status,400);
 assert.equal((await fetch(`${base}?mint=${MINT}&live=1`,{signal:AbortSignal.timeout(2000)})).status,400);
 assert.equal((await fetch(`${base}?mint=${MINT}`,{method:'POST',signal:AbortSignal.timeout(2000)})).status,405);
 assert.doesNotMatch(output,/OFFLINE_QA_EXTERNAL_REQUEST_BLOCKED|ENOTFOUND|api\.dexscreener/);
 console.log('PASS real local Next production GET: neutral contract; invalid/override queries and POST rejected; no credentials or upstream requests.');
}finally{
 if(child.exitCode===null){
  const closed=once(child,'exit');child.kill('SIGTERM');
  await Promise.race([closed,delay(3000).then(()=>{if(child.exitCode===null)child.kill('SIGKILL')})]);
 }
}
