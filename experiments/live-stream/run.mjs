import fs from 'node:fs';
import {createRequire} from 'node:module';
import {adaptStore} from './store-adapter.mjs';
import {nativeSource} from './native.mjs';
const emit=value=>console.log(JSON.stringify(value)); // Only explicitly sanitized state, never caught errors.
let worker,startupStore,exitRequested=false,idle;
function stoppedIdle(){if(process.env.RENDER==='true'&&!exitRequested)idle=setInterval(()=>{},60000);}
function signal(){exitRequested=true;clearInterval(idle);worker?.stop('OWNER_SIGNAL');if(worker)setTimeout(()=>process.exit(1),10000).unref();}
process.once('SIGTERM',signal);process.once('SIGINT',signal);
async function main(){
  if(process.env.UNFARMD_DATA_ACTIVATION!=='enabled'){
    emit({state:'DISABLED',sourceConnected:false,counts:null,reason:'SEPARATE_OWNER_SOURCE_GO_REQUIRED'});stoppedIdle();return;
  }
  if(process.versions.node.split('.')[0]!=='24'||process.env.RENDER!=='true'||process.env.CI||process.env.VERCEL||process.env.HTTP_PROXY||process.env.HTTPS_PROXY||process.env.ALL_PROXY||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')throw Error('HOST_DENIED');
  const require=createRequire(import.meta.url),{SCOPE,approval}=require('../../out/live-stream/experiments/live-stream/policy.js'),{Worker}=require('../../out/live-stream/experiments/live-stream/worker.js');
  const {head}=JSON.parse(fs.readFileSync(new URL('../../out/live-stream/head.json',import.meta.url),'utf8'));
  if(head!==process.env.RENDER_GIT_COMMIT)throw Error('DEPLOYMENT_HEAD');
  const grant=approval(process.env.UNFARMD_DATA_APPROVAL_JSON??'',head,process.env.RENDER_SERVICE_ID??'',Date.now());
  // B owns this fixed module. No custom module URL/HTTP sink or in-memory fallback.
  const {createWorkerStore}=await import('../../lib/scout-live/worker-store.mjs');
  startupStore=await createWorkerStore();
  const store=adaptStore(startupStore,grant);
  const source=nativeSource(SCOPE,()=>process.env.UNFARMD_HELIUS_DATA_KEY);
  const clock={now:()=>Date.now(),mono:()=>performance.now(),sleep:(ms,abort)=>new Promise((resolve,reject)=>{
    if(abort.aborted){reject(Error('STOP'));return;}
    const stop=()=>{clearTimeout(timer);abort.removeEventListener('abort',stop);reject(Error('STOP'));};
    const timer=setTimeout(()=>{abort.removeEventListener('abort',stop);resolve();},ms);abort.addEventListener('abort',stop,{once:true});
  })};
  worker=new Worker(grant,store,source,clock);
  const health=await worker.run();emit({state:'STOPPED',sourceConnected:false,health});stoppedIdle();
}
main().catch(async()=>{worker?.stop('STARTUP_OR_INTEGRATION_REFUSED');
  if(!worker&&startupStore)await Promise.race([Promise.resolve().then(()=>startupStore.close()).catch(()=>{}),new Promise(r=>setTimeout(r,1500))]);
  emit({state:'STOPPED',sourceConnected:false,counts:null,reason:'STARTUP_OR_INTEGRATION_REFUSED'});stoppedIdle();process.exitCode=1;
});
