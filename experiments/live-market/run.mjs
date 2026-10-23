import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {approvalFile,claim,latest} from './storage.mjs';
import {privateView} from './ui.mjs';
const repo=fileURLToPath(new URL('../../',import.meta.url)),root=path.join(os.homedir(),'.unfarmd-market-pilot'),args=process.argv.slice(2);
const command=args[0]??'status';
const empty={mode:'NOT_RUN',phase:'NOT_RUN',reason:'SOURCE_DISABLED_APPROVAL_REQUIRED',counts:null,rows:[],gaps:[],coverage:'NOT_OBSERVED'};
async function main(){
 if(command==='scope'){if(args.length!==1)throw Error('UNKNOWN_ARGUMENT');console.log(fs.readFileSync(new URL('./scope.json',import.meta.url),'utf8'));return;}
 if(command==='status'){if(args.length>1)throw Error('UNKNOWN_ARGUMENT');console.log(JSON.stringify(latest(root)??empty,null,2));return;}
 if(command==='view'){
  if(args.length!==1)throw Error('UNKNOWN_ARGUMENT');const ui=await privateView(()=>latest(root)??empty);console.log(ui.url+' — local read-only view; closes in 10 minutes');const timer=setTimeout(()=>ui.close(),600000);process.once('SIGINT',()=>{clearTimeout(timer);ui.close();});return;
 }
 if(command!=='pilot'||args.length!==4||args[1]!=='--owner-go'||args[2]!=='--approval')throw Error('USAGE_STATUS_VIEW_OR_PILOT_OWNER_GO_APPROVAL');
 // No environment values or credentials printed. Never run acquisition in CI/cloud/Vercel.
 if(process.env.CI||process.env.VERCEL||process.env.HTTP_PROXY||process.env.HTTPS_PROXY||process.env.ALL_PROXY||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')throw Error('DIRECT_OWNER_PC_ONLY_NO_TLS_OR_PROXY_BYPASS');
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
 if(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:repo,encoding:'utf8'}).trim())throw Error('CLEAN_EXACT_HEAD_REQUIRED');
 const build=fs.mkdtempSync(path.join(os.tmpdir(),'unfarmd-pilot-build-'));
 try{
  execFileSync(process.execPath,[path.join(repo,'node_modules/typescript/bin/tsc'),path.join(repo,'experiments/live-market/controller.ts'),'--target','ES2023','--module','commonjs','--strict','--skipLibCheck','--resolveJsonModule','--esModuleInterop','--rootDir',repo,'--outDir',build],{stdio:'pipe'});
  const require=createRequire(import.meta.url),{approve,SCOPE,SCOPE_HASH}=require(path.join(build,'experiments/live-market/policy.js')),{Engine}=require(path.join(build,'experiments/live-market/engine.js')),{startPilot}=require(path.join(build,'experiments/live-market/controller.js'));
  const approval=approve(approvalFile(args[3]),head,new Date().toISOString());
  const previous=latest(root),store=claim(root,approval.pilotId);let pilot,ui,poll,finished=false;
  const engine=new Engine('OWNER_PC_APPROVED',store.retain);
  const finish=async reason=>{
   if(finished)return;finished=true;pilot?.stop(reason);clearInterval(poll);ui?.close();
   try{await pilot?.settled();const summary={...engine.snapshot(new Date().toISOString()),rawRetentionDeleteByUtc:new Date(Date.parse(engine.startedAt??new Date().toISOString())+86400000).toISOString()};store.finish(summary);console.log(JSON.stringify({phase:summary.phase,reason:summary.reason,counts:summary.counts,rpcOwnerClockRoundTripMs:summary.rpcOwnerClockRoundTripMs,gaps:summary.gaps,rawRetentionDeleteByUtc:summary.rawRetentionDeleteByUtc}));console.log('STOPPED — private summary saved. No restart/reconnect. Use view for local inspection.');}catch{console.error('LOCAL_PERSISTENCE_FAILURE — keep lock; manual recovery required.');process.exitCode=1;}
  };
  try{
   store.retain('approved_scope',{head,SCOPE,SCOPE_HASH,approval,previousEnd:previous?.endedAt??null,previousAssurance:'Restart gap unknown; no backfill or budget reset.'});
   const {nativePorts}=await import('./native.mjs');pilot=startPilot(engine,nativePorts(SCOPE),approval.expiresAt);
   ui=await privateView(()=>engine.snapshot(new Date().toISOString()));console.log(ui.url+' — approved bounded private pilot; Ctrl+C or private STOP file kills all source IO.');
   poll=setInterval(()=>{if(fs.existsSync(path.join(root,'STOP')))finish('OWNER_KILL_SWITCH');else if(Date.now()>=Date.parse(approval.expiresAt))finish('APPROVAL_EXPIRED');else if(pilot.signal.aborted)finish(engine.reason);},100);
   process.once('SIGINT',()=>finish('OWNER_SIGINT'));process.once('SIGTERM',()=>finish('OWNER_SIGTERM'));
  }catch{await finish('STARTUP_OR_STORAGE_FAILURE');process.exitCode=1;}
 }finally{fs.rmSync(build,{recursive:true,force:true});}
}
main().catch(()=>{console.error('REFUSED — owner approval, private storage, exact head, runtime or source prerequisites not satisfied. No retry.');process.exitCode=1;});
