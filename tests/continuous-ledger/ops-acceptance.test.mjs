// ISSUE176: SYNTHETIC OFFLINE ONLY. No SQL, network, real credentials or live proof.
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID,generateKeyPairSync,sign} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {RENDER_SERVICE,RENDER_REPOSITORY,renderStop,notificationChannel,boundedRequest} from '../../lib/scout-continuous/ops-transport.mjs';
import {initializeOpsJournal,openOpsJournal,openJournal} from '../../lib/scout-continuous/ops-journal.mjs';
import {checkPlacement,verifyPeerReceipt,WATCHDOG_INTERVAL_MS,CYCLE_DEADLINE_MS} from '../../lib/scout-continuous/ops-readiness.mjs';
import {runCadenced} from '../../lib/scout-continuous/ops-loop.mjs';
import {runWatchdog} from '../../scripts/ops/continuous-watchdog.mjs';
import {hash} from '../../lib/scout-continuous/policy.mjs';
import {grant} from './fixtures.mjs';
const root=fs.mkdtempSync(join(tmpdir(),'unfarmd176-OFFLINE-'));after(()=>fs.rmSync(root,{recursive:true,force:true}));
const sha='b'.repeat(64),stamp=new Date().toISOString();
const sourceTarget={id:RENDER_SERVICE,repo:RENDER_REPOSITORY,type:'background_worker',suspended:'not_suspended'};
const renderKey='rnd_SYNTHETIC_OFFLINE_NOT_A_CREDENTIAL';
const response=(status,json=null)=>({status,json,rawHash:sha});
function renderFixture(replies){const requests=[];return {requests,adapter:renderStop({enabled:true,service:RENDER_SERVICE,token:renderKey,send:async r=>{requests.push(r);const next=replies.shift();if(next instanceof Error)throw next;return next;}})};}
test('hard pin rejects another worker in same repository BEFORE any request',()=>{
 let calls=0;assert.throws(()=>renderStop({enabled:true,service:'srv-synthetic-other-scout',token:renderKey,send(){calls++;}}),/invalid_shutdown_configuration/);assert.equal(calls,0);assert.equal(RENDER_SERVICE,'srv-dbe1vc8m7kps73c2jju0');
});
for(const [name,patch] of [['wrong ID',{id:'srv-synthetic-other'}],['old bot',{repo:'https://github.com/example/SYNTHETIC_OLD_BOT'}],['wrong type',{type:'web_service'}],['missing repo',{repo:undefined}]])test('Render preflight '+name+' denies before POST',async()=>{
 const f=renderFixture([response(200,{...sourceTarget,...patch})]);await assert.rejects(f.adapter.suspend(),/shutdown_unconfirmed/);assert.deepEqual(f.requests.map(r=>r.method),['GET']);
});
test('Render real adapter: one verified POST, one acknowledgment read, no false socket closure',async()=>{
 const f=renderFixture([response(200,sourceTarget),response(202),response(200,{...sourceTarget,suspended:'suspended'})]);const r=await f.adapter.suspend();assert.equal(r.status,'suspended');assert.equal(r.nativeSocketClosureProven,false);
 assert.deepEqual(f.requests.map(r=>[r.host,r.method,r.path]),[['api.render.com','GET',`/v1/services/${RENDER_SERVICE}`],['api.render.com','POST',`/v1/services/${RENDER_SERVICE}/suspend`],['api.render.com','GET',`/v1/services/${RENDER_SERVICE}`]]);
});
test('Render adapter itself latches after uncertainty; a second call sends nothing',async()=>{
 const f=renderFixture([response(200,sourceTarget),Error('SYNTHETIC_LOST_ACK')]);await assert.rejects(f.adapter.suspend());await assert.rejects(f.adapter.suspend());assert.equal(f.requests.length,2);
});
test('Render preflight response hash is required before any mutation',async()=>{
 const f=renderFixture([{status:200,json:sourceTarget,rawHash:null}]);await assert.rejects(f.adapter.suspend());assert.deepEqual(f.requests.map(r=>r.method),['GET']);
});
for(const [name,result] of [['429',response(429)],['503',response(503)],['redirect',response(302)],['lost reply',Error('SYNTHETIC_SECRET_DO_NOT_ECHO')]])test('Render uncertain POST '+name+' makes no confirmation/retry',async()=>{
 const f=renderFixture([response(200,sourceTarget),result]);await assert.rejects(f.adapter.suspend(),e=>e.message==='shutdown_unconfirmed');assert.equal(f.requests.length,2);assert.equal(f.requests.filter(r=>r.method==='POST').length,1);
});
for(const [name,result] of [['still running',response(200,sourceTarget)],['wrong worker',response(200,{...sourceTarget,id:'srv-other',suspended:'suspended'})],['outage',response(503)],['lost acknowledgment',Error('SYNTHETIC_SECRET')],['invalid hash',{status:200,json:{...sourceTarget,suspended:'suspended'},rawHash:null}]])test('Render acknowledgment '+name+' is uncertain after exactly one POST',async()=>{
 const f=renderFixture([response(200,sourceTarget),response(202),result]);await assert.rejects(f.adapter.suspend(),e=>e.message==='shutdown_unconfirmed');assert.equal(f.requests.length,3);assert.equal(f.requests.filter(r=>r.method==='POST').length,1);
});
const botKey='123456789:'+ 'SYNTHETIC_'.repeat(4),syntheticRecipient='123456789';
const notice={parent:randomUUID(),id:randomUUID(),reason:'OFFLINE_ACCEPTANCE'};
test('Telegram acceptance has separate original clocks and is never device push proof',async()=>{
 let request;const t=Date.parse(stamp),r=await notificationChannel({enabled:true,token:botKey,chatId:syntheticRecipient,now:()=>stamp,send:async q=>{request=q;return response(200,{ok:true,result:{message_id:1,chat:{id:Number(syntheticRecipient)},date:Math.floor(t/1000)}});}}).deliver(notice);
 assert.equal(r.status,'provider_accepted');assert.equal(r.deviceDeliveryProven,false);assert.equal(r.providerAt,new Date(Math.floor(t/1000)*1000).toISOString());assert.equal(r.deliveredAt,stamp);assert.equal(request.host,'api.telegram.org');assert.equal(request.method,'POST');assert.equal(JSON.parse(request.body).protect_content,true);assert.ok(!request.body.includes(botKey));
});
test('Telegram delayed reply or regressed observer clock cannot report acceptance',async()=>{
 for(const delta of [-1,5001]){let reads=0;const n=notificationChannel({enabled:true,token:botKey,chatId:syntheticRecipient,now:()=>new Date(Date.parse(stamp)+(reads++?delta:0)).toISOString(),send:async()=>response(200,{ok:true,result:{message_id:1,chat:{id:Number(syntheticRecipient)},date:Math.floor(Date.parse(stamp)/1000)}})});await assert.rejects(n.deliver(notice),/notification_delivery_uncertain/);}
});
for(const [name,patch] of [['different chat',{chat:{id:999}}],['missing date',{date:undefined}],['old date',{date:Math.floor(Date.parse(stamp)/1000)-60}],['future date',{date:Math.floor(Date.parse(stamp)/1000)+60}],['missing message',{message_id:0}]])test('Telegram '+name+' is uncertain/redacted without retry',async()=>{
 let calls=0;const n=notificationChannel({enabled:true,token:botKey,chatId:syntheticRecipient,now:()=>stamp,send:async()=>{calls++;return response(200,{ok:true,result:{message_id:1,chat:{id:Number(syntheticRecipient)},date:Math.floor(Date.parse(stamp)/1000),...patch}});}});await assert.rejects(n.deliver(notice),e=>e.message==='notification_delivery_uncertain');assert.equal(calls,1);
});
function journalFixture(){const directory=join(root,randomUUID()),scope={parent:randomUUID(),grantHash:sha},journalId=randomUUID();initializeOpsJournal({enabled:true,directory,scope,journalId});return {directory,scope,journalId,options:{journalId,floor:{ticket:0,credits:0}}};}
test('disabled journal initialization touches no filesystem',()=>{assert.deepEqual(initializeOpsJournal({directory:'/DO_NOT_TOUCH'}),{status:'disabled'});});
test('strict runtime journal never initializes missing history or accepts another identity',()=>{
 const f=journalFixture();assert.throws(()=>openOpsJournal(join(root,'MISSING'),f.scope,f.options),/uncertain/);assert.throws(()=>openOpsJournal(f.directory,f.scope,{...f.options,journalId:randomUUID()}),/uncertain/);assert.throws(()=>initializeOpsJournal({enabled:true,...f}),/already_initialized/);
});
test('single writer, clean restart, original clocks and irreversible effect claims',()=>{
 const f=journalFixture(),j=openOpsJournal(f.directory,f.scope,f.options);assert.throws(()=>openOpsJournal(f.directory,f.scope,f.options),/occupied/);
 assert.equal(j.claim('notice',notice.id),true);j.anchor({ticket:5,credits:100,observedAt:stamp});j.close();const next=openOpsJournal(f.directory,f.scope,{...f.options,floor:{ticket:5,credits:100}});assert.equal(next.claim('notice',notice.id),false);assert.equal(next.anchor({ticket:5,credits:100,observedAt:new Date(Date.parse(stamp)+1000).toISOString()}).observedAt,stamp);next.close();
});
test('crashed/uncertain writer lock is not automatically reclaimed',()=>{const f=journalFixture();openOpsJournal(f.directory,f.scope,f.options);assert.throws(()=>openOpsJournal(f.directory,f.scope,f.options),/occupied/);});
for(const stage of ['file','directory'])test('fsync '+stage+' failure prevents network and retains uncertain lock',()=>{
 const f=journalFixture();let fault=false,network=0;const fsFault={...fs,fsyncSync(fd){if(fault&&fs.fstatSync(fd)[stage==='directory'?'isDirectory':'isFile']())throw Error('SYNTHETIC_DISK_FAULT');return fs.fsyncSync(fd);}};
 const j=openOpsJournal(f.directory,f.scope,{...f.options,fileSystem:fsFault});fault=true;assert.throws(()=>{if(j.claim('suspend','parent'))network++;},/journal_unavailable/);assert.equal(network,0);assert.throws(()=>j.close(),/uncertain_lock/);assert.throws(()=>openOpsJournal(f.directory,f.scope,f.options),/occupied/);
});
test('record fsync and directory fsync happen BEFORE effect permission',()=>{
 const f=journalFixture(),trace=[],spy={...fs,fsyncSync(fd){trace.push(fs.fstatSync(fd).isDirectory()?'directory':'file');return fs.fsyncSync(fd);}};const j=openOpsJournal(f.directory,f.scope,{...f.options,fileSystem:spy});trace.length=0;if(j.claim('suspend','parent'))trace.push('network');assert.deepEqual(trace,['file','directory','network']);j.close();
});
test('write failure poisons journal; fresh process cannot silently resume uncertain effect',()=>{
 const f=journalFixture();let fault=false;const fsFault={...fs,writeFileSync(...args){if(fault)throw Error('SYNTHETIC_ENOSPC');return fs.writeFileSync(...args);}};const j=openOpsJournal(f.directory,f.scope,{...f.options,fileSystem:fsFault});fault=true;assert.throws(()=>j.claim('suspend','parent'),/journal_unavailable/);assert.throws(()=>j.claim('suspend','parent'),/journal_unavailable/);assert.throws(()=>j.close(),/uncertain_lock/);
});
test('restored pre-spend journal cannot pass a separately retained high-water floor',()=>{
 const f=journalFixture(),image=join(root,randomUUID());fs.cpSync(f.directory,image,{recursive:true});const j=openOpsJournal(f.directory,f.scope,f.options);j.anchor({ticket:5,credits:100,observedAt:stamp});j.close();fs.rmSync(f.directory,{recursive:true});fs.cpSync(image,f.directory,{recursive:true});assert.throws(()=>openOpsJournal(f.directory,f.scope,{...f.options,floor:{ticket:5,credits:100}}),/anchor_mismatch/);
});
test('malformed prior anchor cannot bypass numeric comparison or be repaired',()=>{
 const f=journalFixture(),j=openOpsJournal(f.directory,f.scope,f.options);j.anchor({ticket:5,credits:100,observedAt:stamp});j.close();const name=fs.readdirSync(f.directory).find(n=>n.includes('-anchor-'));fs.writeFileSync(join(f.directory,name),JSON.stringify({scope:f.scope,ticket:'NaN',credits:null,observedAt:stamp}));const k=openJournal(f.directory,f.scope);assert.throws(()=>k.anchor({ticket:6,credits:101,observedAt:stamp}),/mismatch/);
});
test('external I/O uncertainty remains one attempt across clean process restarts',async()=>{
 const f=journalFixture();let posts=0;const attempt=async j=>{if(j.claim('suspend','parent')){posts++;throw Error('SYNTHETIC_LOST_POST_RESPONSE');}};
 const a=openOpsJournal(f.directory,f.scope,f.options);await assert.rejects(attempt(a));a.close();const b=openOpsJournal(f.directory,f.scope,f.options);await attempt(b);b.close();assert.equal(posts,1);
});
const watchdogKeys=generateKeyPairSync('ed25519'),healthKeys=generateKeyPairSync('ed25519');
function configuration(){
 const g=grant({service:RENDER_SERVICE}),scope={parent:g.parent,grantHash:hash(g)},journal=journalFixture();
 const host=(id,domain,key)=>({id,failureDomain:domain,kind:'owner_pc',durableJournal:true,acceptanceHash:sha,peerEpoch:randomUUID(),publicKey:key.publicKey.export({type:'spki',format:'der'}).toString('base64')});
 const c={version:'unfarmd-watchdog/1',mode:'watchdog',scope,grant:g,monitorId:'owner-watchdog-test',sourceService:RENDER_SERVICE,notificationGo:true,shutdownGo:true,monitorGo:true,journalDirectory:journal.directory,journalId:journal.journalId,journalFloor:{ticket:0,credits:0},peerReceiptPath:'SYNTHETIC_PEER',evidenceFile:'SYNTHETIC_EVIDENCE',chatId:syntheticRecipient,approval:{independent:true,mobileDeliveryHash:sha,shutdownHash:sha,endsAt:g.endsAt,maintenanceUntil:new Date(Date.parse(g.endsAt)+3600000).toISOString()}};
 c.topology={watchdog:host(c.monitorId,'owner-home-test',watchdogKeys),health:host('owner-health-test','owner-other-test',healthKeys),approvalHash:sha,expiresAt:c.approval.maintenanceUntil};return c;
}
const runtimeEnv=c=>({UNFARMD_WATCHDOG_ACTIVATION:'owner-approved',UNFARMD_MONITOR_HOST_ID:c.monitorId});
const peerReceipt=(c,patch={},key)=>{const mode=c.mode==='watchdog'?'health':'watchdog';key??=mode==='health'?healthKeys.privateKey:watchdogKeys.privateKey;const body={version:'unfarmd-monitor-liveness/1',parent:c.scope.parent,grantHash:c.scope.grantHash,monitorId:c.topology[mode].id,mode,epoch:c.topology[mode].peerEpoch,sequence:1,observedAt:new Date().toISOString(),...patch};return {...body,signature:sign(null,Buffer.from(hash(body)),key).toString('base64url')};};
test('two approved distinct declared hosts validate, without proving actual deployment',()=>{const c=configuration();assert.equal(checkPlacement(c,runtimeEnv(c),new Date().toISOString()).peerMode,'health');});
for(const name of ['missing second','same host','same failure domain','ephemeral disk','minute cron','source worker','wrong native identity','unapproved placement'])test('placement rejects '+name,()=>{
 const c=configuration(),env=runtimeEnv(c);switch(name){case 'missing second':delete c.topology.health;break;case 'same host':c.topology.health.id=c.monitorId;break;case 'same failure domain':c.topology.health.failureDomain=c.topology.watchdog.failureDomain;break;case 'ephemeral disk':c.topology.health.durableJournal=false;break;case 'minute cron':env.VERCEL='1';break;case 'source worker':env.RENDER_SERVICE_ID=RENDER_SERVICE;break;case 'wrong native identity':env.UNFARMD_MONITOR_HOST_ID='owner-other-test';break;case 'unapproved placement':c.topology.approvalHash=null;break;}
 assert.throws(()=>checkPlacement(c,env,new Date().toISOString()));
});
test('signed original peer receipt validates; reading it never renews its clock',()=>{
 const c=configuration(),p=checkPlacement(c,runtimeEnv(c),new Date().toISOString()),r=peerReceipt(c),at=new Date(Date.parse(r.observedAt)+1000).toISOString();assert.equal(verifyPeerReceipt(r,c,p,at).observedAt,r.observedAt);assert.throws(()=>verifyPeerReceipt(r,c,p,new Date(Date.parse(r.observedAt)+20001).toISOString()),/unproven/);
});
for(const name of ['wrong parent','wrong epoch','wrong role','future clock','unknown fields','wrong signature'])test('peer liveness rejects '+name,()=>{
 const c=configuration(),p=checkPlacement(c,runtimeEnv(c),new Date().toISOString());let r;switch(name){case 'wrong parent':r=peerReceipt(c,{parent:randomUUID()});break;case 'wrong epoch':r=peerReceipt(c,{epoch:randomUUID()});break;case 'wrong role':r=peerReceipt(c,{mode:'watchdog'});break;case 'future clock':r=peerReceipt(c,{observedAt:new Date(Date.now()+1000).toISOString()});break;case 'unknown fields':r={...peerReceipt(c),ok:true};break;case 'wrong signature':r=peerReceipt(c,{},watchdogKeys.privateKey);break;}
 assert.throws(()=>verifyPeerReceipt(r,c,p,new Date().toISOString()),/unproven/);
});
test('peer sequence rollback and same-sequence changed receipt fail on durable journal',()=>{
 const f=journalFixture(),j=openOpsJournal(f.directory,f.scope,f.options),p={peerId:'owner-health-test',epoch:randomUUID(),sequence:2,observedAt:stamp,receiptHash:sha};j.peer(p);assert.deepEqual(j.peer(p),p);assert.throws(()=>j.peer({...p,sequence:1}),/peer_anchor_mismatch/);assert.throws(()=>j.close(),/uncertain_lock/);
});
test('10s means absolute start cadence, not cycle duration plus10s',async()=>{
 let mono=0;const starts=[],sleeps=[];const r=await runCadenced({loop:true,until:25000,now:()=>mono,mono:()=>mono,cycle:async()=>{starts.push(mono);mono+=2000;return {status:'checked'};},sleep:async ms=>{sleeps.push(ms);mono+=ms;}});assert.equal(r.status,'maintenance_expired');assert.deepEqual(starts,[0,10000,20000]);assert.deepEqual(sleeps,[8000,8000,8000]);assert.equal(WATCHDOG_INTERVAL_MS,10000);assert.equal(CYCLE_DEADLINE_MS,8000);
});
test('late wake-up stands down rather than catching up with a retry burst',async()=>{
 let mono=0,calls=0;const r=await runCadenced({loop:true,until:30000,now:()=>mono,mono:()=>mono,cycle:async()=>{calls++;mono+=1;return {status:'checked'};},sleep:async ms=>{mono+=ms+251;}});assert.equal(r.status,'cadence_missed');assert.equal(calls,1);
});
test('ignored DB/provider timeout cannot report checked or start another cycle',async()=>{
 let mono=0,late,calls=0,signal;const r=await runCadenced({loop:true,until:30000,now:()=>mono,mono:()=>mono,cycle:async s=>{signal=s;calls++;return new Promise(resolve=>{late=resolve;});},setTimer:fn=>setImmediate(()=>{mono=8000;fn();}),clearTimer:clearImmediate});assert.equal(r.status,'cycle_deadline_missed');assert.equal(signal.aborted,true);late({status:'checked'});await new Promise(r=>setImmediate(r));assert.equal(calls,1);
});
test('clock regression and over-budget completed cycle fail closed',async()=>{
 for(const end of [-1,8001]){let mono=0;const r=await runCadenced({until:30000,now:()=>0,mono:()=>mono,cycle:async()=>{mono=end;return {status:'checked'};}});assert.equal(r.status,'cycle_deadline_missed');}
});
function runnerFixture(c,{peerMissing=false,dbOutage=false}={}){
 const requests=[],effects=[],ops=[],fakeJournal={peer(){},anchor(v){return v;},claim(kind,id){const k=kind+id;if(effects.includes(k))return false;effects.push(k);return true;},close(){}};let secrets=0;
 const env={...runtimeEnv(c),get UNFARMD_WATCHDOG_TELEGRAM_TOKEN(){secrets++;return botKey;},get UNFARMD_WATCHDOG_RENDER_TOKEN(){secrets++;return renderKey;}};
 const runtime={readJson(path){if(path==='CONFIG')return c;if(path===c.peerReceiptPath){if(peerMissing)throw Error('MISSING_PEER');return peerReceipt(c);}return {previousMeter:{throughTicket:0,throughCredits:0}};},openJournal(){return fakeJournal;},nativeStore(){requests.push('store');return {async transact(command){ops.push(command.op);if(dbOutage)throw Error('SYNTHETIC_DSN_SECRET');return command.op==='leaseNotice'?{status:'checked'}:{version:'unfarmd-continuous-maintenance/1',status:'checked',observedAt:new Date().toISOString(),ticket:0,usage:{credits:0},stopped:command.op==='incident',assurance:{independentWatchdog:true,notificationHealthy:true}};},async close(){}};},notificationChannel(){return {async deliver(){requests.push('notify');return {status:'provider_accepted',deliveredAt:new Date().toISOString(),receiptHash:sha,deviceDeliveryProven:false};}};},renderStop(){return {async suspend(){requests.push('suspend');return {status:'suspended',nativeSocketClosureProven:false};}};}};
 return {env,runtime,requests,ops,get secrets(){return secrets;}};
}
test('actual runner default OFF reads no config/credentials/factories',async()=>{let reads=0;assert.deepEqual(await runWatchdog({env:{},runtime:{readJson(){reads++;throw 0;}}}),{status:'disabled'});assert.equal(reads,0);});
test('actual runner missing second host or peer receipt denies BEFORE credential reads',async()=>{
 for(const missing of ['host','receipt']){const c=configuration();if(missing==='host')delete c.topology.health;const f=runnerFixture(c,{peerMissing:missing==='receipt'});await assert.rejects(runWatchdog({configPath:'CONFIG',env:f.env,runtime:f.runtime}));assert.equal(f.secrets,0);assert.deepEqual(f.requests,[]);}
});
test('actual runner uses maintenance-only library path and distinct health role never renews assurances',async()=>{
 const c=configuration(),f=runnerFixture(c);assert.equal((await runWatchdog({configPath:'CONFIG',env:f.env,runtime:f.runtime})).status,'checked');assert.deepEqual(f.ops,['tick','watchdog','leaseNotice','tick']);assert.deepEqual(f.requests,['store']);
 const health=configuration();health.mode='health';health.monitorId=health.topology.health.id;const h=runnerFixture(health);assert.equal((await runWatchdog({configPath:'CONFIG',env:h.env,runtime:h.runtime})).status,'checked');assert.deepEqual(h.ops,['tick']);
});
test('actual runner database outage suspends/notifies through existing fail-closed cycle',async()=>{
 const c=configuration(),f=runnerFixture(c,{dbOutage:true});const r=await runWatchdog({configPath:'CONFIG',env:f.env,runtime:f.runtime});assert.equal(r.durableStopConfirmed,false);assert.deepEqual(f.requests,['store','suspend','notify']);assert.ok(!JSON.stringify(r).includes('SECRET'));
});
test('delayed Render does not prevent emergency Telegram from starting',async()=>{
 const c=configuration(),f=runnerFixture(c,{dbOutage:true});let release,notified=false;
 f.runtime.renderStop=()=>({suspend:()=>new Promise(resolve=>{release=resolve;})});f.runtime.notificationChannel=()=>({async deliver(){notified=true;return {status:'provider_accepted'};}});
 const running=runWatchdog({configPath:'CONFIG',env:f.env,runtime:f.runtime});await new Promise(r=>setImmediate(r));assert.equal(notified,true);release({status:'suspended'});const result=await running;assert.equal(result.durableStopConfirmed,false);
});
test('actual runner losing the peer after startup enters STOP, never a fresh assurance',async()=>{
 const c=configuration(),f=runnerFixture(c),read=f.runtime.readJson;let peerReads=0;f.runtime.readJson=path=>{if(path===c.peerReceiptPath&&++peerReads>1)throw Error('PEER_LOST');return read(path);};
 const r=await runWatchdog({configPath:'CONFIG',env:f.env,runtime:f.runtime});assert.equal(r.durableStopConfirmed,true);assert.deepEqual(f.ops,['tick','incident']);assert.deepEqual(f.requests,['store','suspend','notify']);
});
test('uncertain driver close retains journal ownership instead of authorizing restart',async()=>{
 const c=configuration(),f=runnerFixture(c),store=f.runtime.nativeStore,open=f.runtime.openJournal;let uncertain;
 f.runtime.nativeStore=()=>({...store(),async close(){throw Error('SYNTHETIC_CLOSE_FAILURE');}});f.runtime.openJournal=()=>({...open(),close(options){uncertain=options.uncertain;}});
 await assert.rejects(runWatchdog({configPath:'CONFIG',env:f.env,runtime:f.runtime}),/port_close_uncertain/);assert.equal(uncertain,true);
});
test('bounded native HTTPS callback rejects a delayed response after abort, without retries',async()=>{
 let callback,calls=0;const abort=new AbortController();const request=(opts,cb)=>{callback=cb;calls++;assert.equal(opts.rejectUnauthorized,true);assert.equal(opts.servername,'api.telegram.org');const req=new EventEmitter();req.destroy=()=>{};req.end=()=>{};return req;};
 const promise=boundedRequest({host:'api.telegram.org',path:'/SYNTHETIC_OFFLINE',method:'POST',signal:abort.signal},request);abort.abort();await assert.rejects(promise,e=>e.message==='ops_transport_unavailable');const res=new EventEmitter();res.statusCode=200;res.headers={};res.destroy=()=>{};callback(res);res.emit('data',Buffer.from('{}'));res.emit('end');assert.equal(calls,1);
});
