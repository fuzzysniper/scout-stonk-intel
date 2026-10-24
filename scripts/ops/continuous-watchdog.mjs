// Prepared owner-PC/approved independent-host executor. NEVER run enabled in CI/build.
import {readFileSync,lstatSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {nativeStore} from '../../lib/scout-continuous/database.mjs';
import {openOpsJournal} from '../../lib/scout-continuous/ops-journal.mjs';
import {notificationChannel,renderStop} from '../../lib/scout-continuous/ops-transport.mjs';
import {checkPlacement,verifyPeerReceipt} from '../../lib/scout-continuous/ops-readiness.mjs';
import {runCadenced} from '../../lib/scout-continuous/ops-loop.mjs';
import {watchdogCycle,validWatchdogApproval} from '../../lib/scout-continuous/watchdog.mjs';
import {clock,digest,uuid,validGrant,hash} from '../../lib/scout-continuous/policy.mjs';
function privateJson(path){const s=lstatSync(path);if(!s.isFile()||s.isSymbolicLink()||(s.mode&0o077)!==0||s.size>32768)throw Error('unsafe_configuration');return JSON.parse(readFileSync(path,'utf8'));}
// Injection exists only as a direct module argument for offline tests; no config,
// environment variable, URL or command-line option can select a replacement port.
export async function runWatchdog({env=process.env,configPath,loop=false,runtime={}}={}){
 if(env.UNFARMD_WATCHDOG_ACTIVATION!=='owner-approved')return {status:'disabled'};
 const read=runtime.readJson??privateJson,now=runtime.now??(()=>new Date().toISOString());
 const c=read(configPath);
 if(c.version!=='unfarmd-watchdog/1'||!['watchdog','health'].includes(c.mode)||!uuid(c.scope?.parent)||!digest(c.scope.grantHash)||!clock(c.approval?.endsAt)||c.notificationGo!==true||c.shutdownGo!==true||c.monitorGo!==true||c.monitorId===c.sourceService||!/^owner-[a-z0-9-]{4,80}$/.test(c.monitorId??''))throw Error('independent_owner_approval_required');
 if(!validGrant(c.grant)||hash(c.grant)!==c.scope.grantHash||c.grant.parent!==c.scope.parent||c.grant.service!==c.sourceService||c.grant.endsAt!==c.approval.endsAt)throw Error('exact_grant_required');
 if(!validWatchdogApproval(c.scope,c.approval,now()))throw Error('watchdog_approval_required');
 const placement=checkPlacement(c,env,now());
 const journal=(runtime.openJournal??openOpsJournal)(c.journalDirectory,c.scope,{journalId:c.journalId,floor:c.journalFloor});
 const peer=()=>{const r=verifyPeerReceipt(read(c.peerReceiptPath),c,placement,now());journal.peer({...r,peerId:placement.peer.id,epoch:placement.peer.peerEpoch});};
 let port;
 const abort=new AbortController(),stop=()=>abort.abort();process.once('SIGINT',stop);process.once('SIGTERM',stop);
 try{
  // Configuration and actual signed peer liveness must pass before credentials.
  // A signature proves possession of the approved peer key, not host placement.
  peer();
  const notify=(runtime.notificationChannel??notificationChannel)({enabled:true,token:env.UNFARMD_WATCHDOG_TELEGRAM_TOKEN,chatId:c.chatId});
  const suspend=(runtime.renderStop??renderStop)({enabled:true,service:c.sourceService,token:env.UNFARMD_WATCHDOG_RENDER_TOKEN});
  port=(runtime.nativeStore??nativeStore)('maintenance',env);
  const cycle=async signal=>{
   const active=()=>{if(signal.aborted)throw Error('cycle_expired');};
   let evidence;try{peer();evidence=read(c.evidenceFile);}catch{evidence={previousMeter:null};}
   const checkedPort={transact(command){active();return port.transact(command,{signal});}};
   const checkedJournal={anchor(value){active();return journal.anchor(value);},claim(...args){active();return journal.claim(...args);}};
   const checkedNotify={deliver(notice){active();return notify.deliver(notice,{signal});}};
   const checkedSuspend={suspend(){active();return suspend.suspend({signal});}};
   return watchdogCycle({enabled:true,healthOnly:c.mode==='health',port:checkedPort,scope:c.scope,journal:checkedJournal,notify:checkedNotify,suspend:checkedSuspend,approval:c.approval,observations:evidence.observations,previousMeter:evidence.previousMeter,signal,now});
  };
  return await runCadenced({cycle,until:Date.parse(c.approval.maintenanceUntil),signal:abort.signal,loop,now:()=>Date.parse(now()),...runtime.timing});
 }finally{
  process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
  // Never await a wedged driver indefinitely after a missed cycle deadline.
  // No new cycle/effect is started, and a process restart cannot reuse its lock.
  let uncertain=false,timer;
  try{if(port)await Promise.race([port.close(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('port_close_uncertain')),1500);})]);}catch{uncertain=true;throw Error('port_close_uncertain');}finally{clearTimeout(timer);journal.close({uncertain});}
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const r=await runWatchdog({configPath:process.argv[2],loop:process.argv[3]==='--loop'});console.log(JSON.stringify(r));if(!['disabled','checked'].includes(r.status))process.exitCode=1;}
 catch{console.log('{"status":"blocked","reason":"configuration_or_runtime_unproven"}');process.exitCode=1;}
}
