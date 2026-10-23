// Prepared owner-PC/approved independent-host executor. NEVER run in CI/at build.
import {readFileSync,lstatSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {nativeStore} from '../../lib/scout-continuous/database.mjs';
import {openJournal} from '../../lib/scout-continuous/ops-journal.mjs';
import {notificationChannel,renderStop} from '../../lib/scout-continuous/ops-transport.mjs';
import {watchdogCycle} from '../../lib/scout-continuous/watchdog.mjs';
import {clock,digest,uuid,validGrant,hash} from '../../lib/scout-continuous/policy.mjs';
function privateJson(path){const s=lstatSync(path);if(!s.isFile()||s.isSymbolicLink()||(s.mode&0o077)!==0||s.size>32768)throw Error('unsafe_configuration');return JSON.parse(readFileSync(path,'utf8'));}
export async function runWatchdog({env=process.env,configPath,loop=false}={}){
 if(env.UNFARMD_WATCHDOG_ACTIVATION!=='owner-approved')return {status:'disabled'};
 // No DATA key lookup, no source factory, no automatic sourcing of .env files.
 const c=privateJson(configPath);
 if(c.version!=='unfarmd-watchdog/1'||!['watchdog','health'].includes(c.mode)||!uuid(c.scope?.parent)||!digest(c.scope.grantHash)||!clock(c.approval?.endsAt)||c.notificationGo!==true||c.shutdownGo!==true||c.monitorGo!==true||c.monitorId===c.sourceService||!/^owner-[a-z0-9-]{4,80}$/.test(c.monitorId??'')||!/^srv-[a-z0-9]+$/.test(c.sourceService??'')||env.RENDER_SERVICE_ID===c.sourceService)throw Error('independent_owner_approval_required');
 if(!validGrant(c.grant)||hash(c.grant)!==c.scope.grantHash||c.grant.parent!==c.scope.parent||c.grant.service!==c.sourceService||c.grant.endsAt!==c.approval.endsAt)throw Error('exact_grant_required');
 const journal=openJournal(c.journalDirectory,c.scope);
 const notify=notificationChannel({enabled:true,token:env.UNFARMD_WATCHDOG_TELEGRAM_TOKEN,chatId:c.chatId});
 const suspend=renderStop({enabled:true,service:c.sourceService,token:env.UNFARMD_WATCHDOG_RENDER_TOKEN});
 const port=nativeStore('maintenance',env);
 const abort=new AbortController(),stop=()=>abort.abort();process.once('SIGINT',stop);process.once('SIGTERM',stop);
 try{
  let result;
  do{
   const evidence=privateJson(c.evidenceFile);
   result=await watchdogCycle({enabled:true,healthOnly:c.mode==='health',port,scope:c.scope,journal,notify,suspend,approval:c.approval,observations:evidence.observations,previousMeter:evidence.previousMeter,signal:abort.signal});
   // Never print raw errors/config/provider responses or any credential.
   if(!loop)return {status:result.status,durableStopConfirmed:result.durableStopConfirmed===true};
   if(loop&&!abort.signal.aborted)await delay(10000,undefined,{signal:abort.signal});
  }while(loop&&!abort.signal.aborted&&Date.now()<Date.parse(c.approval.maintenanceUntil));
  return {status:result.status};
 }finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);await port.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const r=await runWatchdog({configPath:process.argv[2],loop:process.argv[3]==='--loop'});console.log(JSON.stringify(r));if(!['disabled','checked'].includes(r.status))process.exitCode=1;}
 catch{console.log('{"status":"blocked","reason":"configuration_or_runtime_unproven"}');process.exitCode=1;}
}
