// SYNTHETIC OFFLINE receipts/transports/config only. No provider/hosted requests.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtempSync,rmSync,chmodSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {requestOrigin} from '../../lib/scout-continuous/origin.mjs';
import {retentionReview} from '../../lib/scout-continuous/retention-review.mjs';
import {reconcileMeter} from '../../lib/scout-continuous/meter-reconciliation.mjs';
import {boundedRequest,notificationChannel,renderStop} from '../../lib/scout-continuous/ops-transport.mjs';
import {openJournal} from '../../lib/scout-continuous/ops-journal.mjs';
import {watchdogCycle} from '../../lib/scout-continuous/watchdog.mjs';
import {runWatchdog} from '../../scripts/ops/continuous-watchdog.mjs';
import {controlHandler} from '../../lib/scout-continuous/control-document.mjs';
import {PROJECT} from '../../lib/live-ledger/http.mjs';
import {grant,now} from './fixtures.mjs';
import {hash} from '../../lib/scout-continuous/policy.mjs';
const g=grant(),scope={parent:g.parent,grantHash:hash(g)},sha='b'.repeat(64),host='scout-stonk-intel-synthetic.vercel.app';
const env={VERCEL:'1',VERCEL_ENV:'production',VERCEL_PROJECT_ID:PROJECT,VERCEL_GIT_COMMIT_SHA:g.head,VERCEL_URL:host,SCOUT_CONTINUOUS_CANONICAL_ENABLED:'true',SCOUT_CONTINUOUS_PROTECTION_REVIEW_SHA:g.head};
test('mobile control is separately OFF, protected-review bound, script-hashed, no secret/private bootstrap',async()=>{
 const req=new Request('https://unfarmd.com/api/live-events/continuous/control',{headers:{'sec-fetch-site':'none','sec-fetch-mode':'navigate'}});
 assert.equal(controlHandler({env:()=>env})(req).status,503);const e={...env,SCOUT_CONTINUOUS_CONTROL_ENABLED:'true',SCOUT_CONTINUOUS_API_ENABLED:'true'};
 const r=controlHandler({env:()=>e})(req);assert.equal(r.status,200);assert.match(r.headers.get('content-security-policy'),/script-src 'sha256-/);assert.ok(!r.headers.get('content-security-policy').includes("script-src 'unsafe-inline'"));assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('x-frame-options'),'DENY');assert.equal((await r.text()).includes('SYNTHETIC'),false);
 assert.equal(controlHandler({env:()=>({...e,SCOUT_CONTINUOUS_PROTECTION_REVIEW_SHA:''})})(req).status,403);
 assert.equal(controlHandler({env:()=>e})(new Request(req.url,{headers:{'sec-fetch-site':'cross-site','sec-fetch-mode':'navigate'}})).status,403);
});
function browser(url,kind='stop',headers={}){return new Request(url+'/api/live-events/continuous'+(kind==='reader'?'':'/'+kind),{method:kind==='reader'?'GET':'POST',headers:{origin:url,'sec-fetch-site':'same-origin',...headers}});}
test('canonical is independently OFF unless exact reviewed runtime SHA matches; immutable still supported',()=>{
 const req=browser('https://unfarmd.com');assert.equal(requestOrigin(req,env,'stop'),'https://unfarmd.com');
 for(const change of [{SCOUT_CONTINUOUS_CANONICAL_ENABLED:'false'},{SCOUT_CONTINUOUS_PROTECTION_REVIEW_SHA:'f'.repeat(40)},{VERCEL_ENV:'preview'},{VERCEL_PROJECT_ID:'other'},{VERCEL_URL:'evil.invalid'},{VERCEL_GIT_COMMIT_SHA:''}])assert.equal(requestOrigin(req,{...env,...change},'stop'),null);
 assert.equal(requestOrigin(browser('https://'+host),env,'stop'),'https://'+host);
});
test('canonical exact host/CSRF: www, suffixes, http, cross-host origin and forwarded headers never authorize',()=>{
 for(const url of ['https://www.unfarmd.com','https://unfarmd.com.evil.invalid','http://unfarmd.com','https://unfarmd.com:444','https://scout-stonk-intel.vercel.app'])assert.equal(requestOrigin(browser(url),env,'stop'),null);
 for(const headers of [{origin:'https://'+host},{origin:'null'},{origin:''},{'sec-fetch-site':'same-site'},{'sec-fetch-site':'cross-site'}])assert.equal(requestOrigin(browser('https://unfarmd.com','stop',headers),env,'stop'),null);
 assert.equal(requestOrigin(browser('https://evil.invalid','stop',{'x-forwarded-host':'unfarmd.com','x-vercel-id':'anything'}),env,'stop'),null);
 assert.equal(requestOrigin(browser('https://unfarmd.com','maintenance'),env,'maintenance'),null);
});
test('six-hour PITR/no snapshots never becomes backup exclusion or immediate physical erasure',()=>{
 const settings={project:'snowy-haze-83201847',branch:'br-long-fog-b54099ej',historySeconds:21600,snapshots:0,schedules:0};const r=retentionReview(settings);assert.equal(r.sourceGo,false);assert.equal(r.backupsExcluded,false);assert.equal(r.physicalErasureProven,false);
 const reviewed=retentionReview(settings,{rightsApproved:true,rightsHash:sha,logicalSeconds:3600,recoverySeconds:25200,auditRetentionApproved:true,providerDeletionRecoveryApproved:true,downstreamCopiesApproved:true});assert.equal(reviewed.status,'requires_versioned_contract_review');assert.equal(reviewed.currentControllerCompatible,false);assert.equal(reviewed.sourceGo,false);assert.throws(()=>retentionReview({...settings,project:'other'}));
});
const at='2026-10-23T18:00:00.000Z',periodStart='2026-10-01T00:00:00.000Z',periodEnd='2026-11-01T00:00:00.000Z';
const meter={version:'unfarmd-meter-observation/1',source:'provider_export',keyFingerprint:sha,observedAt:at,settledThrough:at,periodStart,periodEnd,usedCredits:110,remainingCredits:99890,attribution:'data_key',rawHash:sha,hardCapUntil:periodEnd,hardCapHash:sha,weightsHash:sha,throughTicket:2,throughCredits:200};
const prior={...meter,observedAt:'2026-10-23T17:59:00.000Z',usedCredits:100,throughTicket:1,throughCredits:100};
const options={now:at,scope,snapshot:{observedAt:at,anchorObservedAt:at,ticket:2,usage:{credits:200}},previous:prior,keyFingerprint:sha,endsAt:periodEnd,weightsHash:sha,hardCapHash:sha};
test('meter reconciles real-observer shape against external baseline and exact reservations, keeps original clock',()=>{
 const r=reconcileMeter(meter,options);assert.equal(r.ok,true);assert.equal(r.command.observedAt,at);assert.equal(r.command.balance,99890);assert.equal(r.command.throughCredits,200);assert.notEqual(r.command.balance,r.command.throughCredits);
});
for(const [name,patch,extra] of [
 ['project totals',{attribution:'project'}],['wrong key',{keyFingerprint:'c'.repeat(64)}],['lagging settlement',{settledThrough:'2026-10-23T17:59:59.000Z'}],['stale',{observedAt:'2026-10-23T17:50:00.000Z'}],['future',{observedAt:'2026-10-23T18:00:01.000Z'}],['rollback',{usedCredits:99}],['unreserved cost',{usedCredits:201}],['wrong ticket',{throughTicket:3}],['wrong credits',{throughCredits:201}],['cap too short',{hardCapUntil:at}],['period reset',{periodStart:'2026-10-22T00:00:00.000Z'}],['raw data',{raw:'NO_KEYS'}],['missing baseline',{}, {previous:null}]
])test('meter fails closed on '+name,()=>{assert.equal(reconcileMeter({...meter,...patch},{...options,...extra}).ok,false);});
test('external fsynced journal survives reopen, denies replay/changed/rolled-back anchors and unsafe directory',()=>{
 const dir=mkdtempSync(join(tmpdir(),'unfarmd-journal-'));try{let j=openJournal(dir,scope);assert.equal(j.claim('notice',g.parent),true);j.anchor({ticket:5,credits:100,observedAt:at});j=openJournal(dir,scope);assert.equal(j.claim('notice',g.parent),false);assert.throws(()=>j.anchor({ticket:4,credits:90,observedAt:at}),/mismatch/);assert.throws(()=>j.anchor({ticket:5,credits:101,observedAt:at}),/mismatch/);assert.throws(()=>j.claim('notice','https://SECRET'),/invalid/);chmodSync(dir,0o755);assert.throws(()=>openJournal(dir,scope),/unsafe/);}finally{rmSync(dir,{recursive:true,force:true});}
});
const bot='123456789:'+ 'SYNTHETIC_'.repeat(4),chatId='123456789',renderToken='rnd_SYNTHETIC_NOT_A_REAL_CREDENTIAL';
test('notification sends minimal content to fixed Telegram TLS host; preserves second-resolution source clock',async()=>{
 let sent;const time=now(),result=await notificationChannel({enabled:true,token:bot,chatId,now:()=>time,send:async r=>{sent=r;return {status:200,rawHash:sha,json:{ok:true,result:{message_id:12,date:Math.floor(Date.parse(time)/1000),chat:{id:Number(chatId)}}}};}}).deliver({parent:g.parent,id:g.parent,reason:'OWNER_STOP'});
 assert.equal(sent.host,'api.telegram.org');assert.equal(sent.method,'POST');assert.ok(!sent.body.includes(bot));assert.equal(result.status,'provider_accepted');assert.equal(result.deliveredAt,time);assert.equal(result.deviceDeliveryProven,false);
});
for(const [name,result] of [['429',{status:429}],['redirect',{status:302}],['wrong chat',{status:200,json:{ok:true,result:{message_id:1,date:Math.floor(Date.now()/1000),chat:{id:2}}}}],['provider false',{status:200,json:{ok:false}}]])test('notification '+name+' is uncertain, no retry and no raw error',async()=>{
 let calls=0;const notify=notificationChannel({enabled:true,token:bot,chatId,send:async()=>{calls++;return {...result,rawHash:sha};}});await assert.rejects(notify.deliver({parent:g.parent,id:g.parent,reason:'OWNER_STOP'}),e=>e.message==='notification_delivery_uncertain');assert.equal(calls,1);
});
test('Render shutdown verifies SCOUT before exact suspend POST plus status GET; no old-bot mutation',async()=>{
 const calls=[],target={id:'srv-synthetic',type:'background_worker',repo:'https://github.com/fuzzysniper/scout-stonk-intel',suspended:'suspended'},s=renderStop({enabled:true,service:'srv-synthetic',token:renderToken,send:async r=>{calls.push(r);return r.method==='POST'?{status:202,rawHash:sha}:{status:200,rawHash:sha,json:target};}});assert.equal((await s.suspend()).status,'suspended');assert.deepEqual(calls.map(r=>[r.method,r.path]),[['GET','/v1/services/srv-synthetic'],['POST','/v1/services/srv-synthetic/suspend'],['GET','/v1/services/srv-synthetic']]);assert.ok(calls.every(r=>r.host==='api.render.com'));
 let n=0;await assert.rejects(renderStop({enabled:true,service:'srv-synthetic',token:renderToken,send:async()=>{n++;return {status:200,json:{...target,repo:'https://github.com/other/old-bot'}};}}).suspend(),/shutdown_unconfirmed/);assert.equal(n,1);
});
function fakeRequest(response){return (config,cb)=>{assert.equal(config.rejectUnauthorized,true);assert.equal(config.servername,config.hostname);assert.equal(config.minVersion,'TLSv1.2');const req=new EventEmitter();req.destroy=()=>{};req.end=()=>{queueMicrotask(()=>{const res=new EventEmitter();res.statusCode=response.status;res.headers={};res.destroy=()=>{};cb(res);if(response.body)res.emit('data',Buffer.from(response.body));res.emit('end');});};return req;};}
test('native bounded transport hashes raw bytes; rejects redirects, oversize, invalid JSON and raw secret errors',async()=>{
 const args={host:'api.telegram.org',path:'/SYNTHETIC',method:'POST'};assert.equal((await boundedRequest(args,fakeRequest({status:200,body:'{}'}))).json.constructor,Object);
 for(const r of [{status:302},{status:429},{status:503},{status:200,body:'x'.repeat(32769)},{status:200,body:'not JSON'}])await assert.rejects(boundedRequest(args,fakeRequest(r)),e=>e.message==='ops_transport_unavailable');
 await assert.rejects(boundedRequest(args,()=>{throw Error('SYNTHETIC_SECRET');}),e=>e.message==='ops_transport_unavailable');
});
test('all OFF paths perform zero config/credential/observer/transport reads',async()=>{
 let calls=0;assert.equal((await watchdogCycle({port:{transact(){calls++;}}})).status,'disabled');assert.equal((await runWatchdog({env:{},configPath:'/DO_NOT_READ'})).status,'disabled');assert.equal(calls,0);assert.equal((await notificationChannel({}).deliver()).status,'disabled');assert.equal((await renderStop({}).suspend()).status,'disabled');
});
test('expired maintenance approval is rejected BEFORE any credential getter or pool construction',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'unfarmd-expired-monitor-'));try{
  const old=grant({startsAt:new Date(Date.now()-10800000).toISOString(),endsAt:new Date(Date.now()-7200000).toISOString()}),path=join(dir,'config.json');
  const c={version:'unfarmd-watchdog/1',mode:'watchdog',scope:{parent:old.parent,grantHash:hash(old)},grant:old,monitorId:'owner-synthetic',sourceService:old.service,notificationGo:true,shutdownGo:true,monitorGo:true,approval:{independent:true,mobileDeliveryHash:sha,shutdownHash:sha,endsAt:old.endsAt,maintenanceUntil:new Date(Date.parse(old.endsAt)+3600000).toISOString()}};writeFileSync(path,JSON.stringify(c),{mode:0o600});let secrets=0;
  const env={UNFARMD_WATCHDOG_ACTIVATION:'owner-approved',get UNFARMD_WATCHDOG_TELEGRAM_TOKEN(){secrets++;throw Error('NO_READ');}};
  await assert.rejects(runWatchdog({env,configPath:path}),/watchdog_approval_required/);assert.equal(secrets,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('database outage uses independent STOP-only suspension/notification once across process restarts',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'unfarmd-watchdog-'));try{let sends=0,stops=0;const args={enabled:true,port:{async transact(){throw Error('DSN_SECRET');}},scope,approval:{independent:true,mobileDeliveryHash:sha,shutdownHash:sha,endsAt:g.endsAt,maintenanceUntil:new Date(Date.parse(g.endsAt)+3600000).toISOString()},notify:{async deliver(){sends++;throw Error('TOKEN_SECRET');}},suspend:{async suspend(){stops++;return {status:'suspended'};}}};
 const a=await watchdogCycle({...args,journal:openJournal(dir,scope)}),b=await watchdogCycle({...args,journal:openJournal(dir,scope)});assert.equal(a.durableStopConfirmed,false);assert.equal(b.durableStopConfirmed,false);assert.equal(sends,1);assert.equal(stops,1);assert.ok(!JSON.stringify([a,b]).includes('SECRET'));}finally{rmSync(dir,{recursive:true,force:true});}
});
test('independent health check never refreshes the failed primary watchdog or notices',async()=>{
 let delivered=0;const ops=[],state={observedAt:now(),ticket:0,usage:{credits:0},stopped:false,assurance:{independentWatchdog:false,notificationHealthy:true}};
 const r=await watchdogCycle({enabled:true,healthOnly:true,port:{async transact(c){ops.push(c.op);return c.op==='incident'?{stopped:true}:state;}},scope,journal:{anchor(){},claim(){return true;}},approval:{independent:true,mobileDeliveryHash:sha,shutdownHash:sha,endsAt:g.endsAt,maintenanceUntil:new Date(Date.parse(g.endsAt)+3600000).toISOString()},previousMeter:{throughTicket:0,throughCredits:0},notify:{async deliver(){delivered++;return {status:'provider_accepted'};}},suspend:{async suspend(){return {status:'suspended'};}}});
 assert.equal(r.durableStopConfirmed,true);assert.equal(delivered,1);assert.deepEqual(ops,['tick','incident']);
});
