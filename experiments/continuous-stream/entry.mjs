import fs from 'node:fs';
import {createRequire} from 'node:module';
import {nativeSource} from '../live-stream/native.mjs';
export function requireExtension(module){
  if(!module||typeof module.createContinuousStore!=='function')throw Error('CONTINUOUS_LEDGER_EXTENSION_REQUIRED');
  return module.createContinuousStore;
}
export async function main(){
  if(process.env.UNFARMD_CONTINUOUS_ACTIVATION!=='enabled')return {state:'DISABLED',sourceConnected:false,reason:'SEPARATE_CONTINUOUS_GO_REQUIRED'};
  // Does not mutate/enable the original ten-minute source. Only one mode may exist.
  if(process.versions.node.split('.')[0]!=='24'||process.env.RENDER!=='true'||process.env.UNFARMD_DATA_ACTIVATION!=='disabled'||process.env.CI||process.env.VERCEL||process.env.HTTP_PROXY||process.env.HTTPS_PROXY||process.env.ALL_PROXY||process.env.http_proxy||process.env.https_proxy||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')throw Error('HOST_DENIED');
  const require=createRequire(import.meta.url),{parseGrant}=require('../../out/continuous-stream/experiments/continuous-stream/policy.js');
  const {head}=JSON.parse(fs.readFileSync(new URL('../../out/continuous-stream/head.json',import.meta.url),'utf8'));
  if(head!==process.env.RENDER_GIT_COMMIT)throw Error('EXACT_HEAD_REQUIRED');
  const grant=parseGrant(process.env.UNFARMD_CONTINUOUS_APPROVAL_JSON??'',head,process.env.RENDER_SERVICE_ID??'',Date.now());
  // Fixed B-owned port. No v1 fallback, arbitrary module URL, HTTP meter or notification endpoint.
  const create=requireExtension(await import('../../lib/scout-live/continuous-store.mjs'));
  const port=await create();
  const {Continuous}=require('../../out/continuous-stream/experiments/continuous-stream/controller.js');
  const {SCOPE}=require('../../out/continuous-stream/experiments/live-stream/policy.js');
  const clock={now:()=>Date.now(),mono:()=>performance.now(),sleep:(ms,signal)=>new Promise((resolve,reject)=>{
    if(signal.aborted){reject(Error('STOP'));return;}
    const stop=()=>{clearTimeout(t);signal.removeEventListener('abort',stop);reject(Error('STOP'));};
    const t=setTimeout(()=>{signal.removeEventListener('abort',stop);resolve();},ms);signal.addEventListener('abort',stop,{once:true});
  })};
  const runtime=new Continuous(grant,port,()=>nativeSource(SCOPE,()=>process.env.UNFARMD_HELIUS_DATA_KEY),clock);
  const stop=()=>runtime.stop('OWNER_PROCESS_SIGNAL');process.once('SIGTERM',stop);process.once('SIGINT',stop);
  try{return await runtime.run();}finally{process.removeListener('SIGTERM',stop);process.removeListener('SIGINT',stop);}
}
