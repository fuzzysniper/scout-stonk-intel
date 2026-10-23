// INVENTED OFFLINE FAULT MODEL ONLY. Not a DB adapter, real meter, purge service or notification delivery.
import {createRequire} from 'node:module';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export {fixture,ack,AT,MINT} from '../../live-stream/tests/fixtures.mjs';
import {fixture,ack,AT} from '../../live-stream/tests/fixtures.mjs';
const require=createRequire(import.meta.url),dir=process.env.CONTINUOUS_BUILD;
export const {POLICY,POLICY_HASH,hash,parseGrant}=require(path.join(dir,'policy.js'));
export const {Continuous}=require(path.join(dir,'controller.js'));
export const {Client}=require(path.join(dir,'client.js'));
const source=require(path.join(dir,'../live-stream/policy.js'));
export function grant(){return {version:POLICY.version,parent:'11111111-1111-4111-8111-111111111111',head:'a'.repeat(40),service:'srv-offline',policyHash:POLICY_HASH,sourcePolicyHash:source.WORKER_POLICY_HASH,
  startsAt:AT,endsAt:'2026-10-22T14:00:10.000Z',resetAt:'2026-11-01T00:00:00.000Z',allowanceCredits:1000000,otherReserveCredits:1000,incidentReserveCredits:1000,
  limits:{credits:100000,bytes:POLICY.byteEnvelope*10,frames:POLICY.frameEnvelope*10,rpc:100,connections:10,children:10,auditRecords:1000},connectionCredits:100,rpcCredits:1,
  rightsHash:'b'.repeat(64),accountHash:'c'.repeat(64),retentionHash:'d'.repeat(64),notificationHash:'e'.repeat(64),mobileHash:'f'.repeat(64),sourceGo:true,hostingGo:true,rightsGo:true,spendGo:true,retentionGo:true,notificationGo:true,mobileGo:true};}
export function clock(){const t=performance.now();let advance=0;
  return {now:()=>Math.floor(Date.parse(AT)+performance.now()-t+advance),mono:()=>performance.now()-t+advance,jump:n=>{advance+=n;},
    sleep(ms,signal){return new Promise((resolve,reject)=>{if(signal.aborted){reject(Error('ABORT'));return;}
      const stop=()=>{clearTimeout(timer);signal.removeEventListener('abort',stop);reject(Error('ABORT'));};
      const timer=setTimeout(()=>{signal.removeEventListener('abort',stop);resolve();},ms===1000?10:ms);signal.addEventListener('abort',stop,{once:true});});}};
}
export class Model {
  version=POLICY.version;
  constructor(g=grant(),time=clock(),state){this.g=g;this.clock=time;this.commands=[];this.before=null;this.after=null;this.edit=null;
    this.state=state??{worker:null,fence:null,stopped:false,connected:false,child:null,leaseUntil:0,ticket:0,first:{},recent:{},journal:[],
      usage:{credits:0,bytes:0,frames:0,rpc:0,connections:0,children:0,auditRecords:0,framesReceived:0,bytesReceived:0}};
  }
  async transact(c,{signal}){
    if(signal.aborted)throw Error('ABORTED');this.commands.push(c);this.before?.(c);
    const original=this.state,s=structuredClone(original),now=this.clock.now();let ok=true,reason=null,extra={};
    const deny=r=>{ok=false;reason=r;};
    if(c.parent!==this.g.parent||c.head!==this.g.head||c.scope!==POLICY_HASH||c.grantHash!==hash(this.g))throw Error('WRONG_OWNER_SCOPE');
    if(c.op==='claim'){
      if(s.stopped||s.worker){if(s.worker&&now>=s.leaseUntil)s.stopped=true;deny('occupied_or_stopped');}
      else{s.worker=c.worker;s.fence=randomUUID();}
    }else if(c.worker!==s.worker||c.fence!==s.fence||!s.fence)deny('fenced');
    else if(s.stopped&&!['closeChild','connectionClosed','release','heartbeat','gap','notify','stop'].includes(c.op))deny('stopped');
    else if(now>=Date.parse(this.g.endsAt)&&!['stop','closeChild','release','notify','heartbeat','gap'].includes(c.op)){s.stopped=true;deny('expired');}
    else switch(c.op){
      case 'beginChild':if(s.child||s.connected)deny('overlap');else{s.child={id:c.child,startsAt:new Date(now).toISOString(),endsAt:c.endsAt};s.usage.children++;}break;
      case 'reserve':{
        if(!s.child||c.child!==s.child.id||c.resource==='connection'&&s.connected||c.resource==='rpc'&&!s.connected){deny('connection_state');break;}
        const next={...s.usage};next.credits+=c.resource==='connection'?this.g.connectionCredits:this.g.rpcCredits;
        if(c.resource==='connection'){next.connections++;next.bytes+=POLICY.byteEnvelope;next.frames+=POLICY.frameEnvelope;}else next.rpc++;
        if(Object.keys(this.g.limits).some(k=>next[k]>this.g.limits[k])){s.stopped=true;deny('budget');break;}
        s.usage=next;s.connected=true;extra.ticket=++s.ticket;break;
      }
      case 'append':{
        if(!s.connected||!s.child||c.child!==s.child.id){deny('no_child');break;}
        const r=c.record,old=s.first[r.signature];
        if(old){if(old.slot!==r.slot)throw Error('IDENTITY_REVISION');extra={disposition:r.finality==='finalized'&&s.recent[r.signature]?.finality==='provisional'?'promoted':'duplicate',firstReceivedAt:old.at,firstNotificationHash:old.hash};}
        else{if(s.usage.auditRecords>=this.g.limits.auditRecords){s.stopped=true;deny('audit_budget');break;}s.first[r.signature]={at:r.receivedAt,hash:r.notificationHash,slot:r.slot};s.usage.auditRecords++;extra={disposition:'inserted',firstReceivedAt:r.receivedAt,firstNotificationHash:r.notificationHash};}
        if(extra.disposition!=='duplicate')s.recent[r.signature]=r;
        while(Object.keys(s.recent).length>200)delete s.recent[Object.keys(s.recent)[0]];
        break;
      }
      case 'heartbeat':
        if(c.health.frames<s.usage.framesReceived||c.health.bytes<s.usage.bytesReceived)throw Error('COUNTER_RESET');
        s.usage.framesReceived=c.health.frames;s.usage.bytesReceived=c.health.bytes;break;
      case 'gap':break;
      case 'notify':break; // A model outbox event, NEVER a delivered real notification.
      case 'connectionClosed':s.connected=false;break;
      case 'closeChild':s.connected=false;s.child=null;break;
      case 'stop':s.stopped=true;break;
      case 'release':if(s.connected||s.child)throw Error('UNCERTAIN_CLOSE');s.worker=null;s.fence=null;break;
      default:throw Error('UNKNOWN_OP');
    }
    s.leaseUntil=s.worker?Math.min(now+12000,Date.parse(s.child?.endsAt??this.g.endsAt)):0;
    s.journal.push({op:c.op,at:now,usage:{...s.usage},stopped:s.stopped});this.state=s;
    const reply={v:2,ok,reason,parent:this.g.parent,head:this.g.head,scope:POLICY_HASH,grantHash:hash(this.g),worker:s.worker,fence:s.fence,stopped:s.stopped,connected:s.connected,
      serverTime:new Date(now).toISOString(),leaseUntil:s.worker?new Date(s.leaseUntil).toISOString():null,parentEndsAt:this.g.endsAt,child:s.child,usage:{...s.usage},
      assurance:{meterAt:new Date(now).toISOString(),meterBalance:900000,meterAttributed:true,meterMismatch:false,hardCapUntil:this.g.endsAt,purgeThrough:new Date(now).toISOString(),purgeHealthy:true,backupsExcluded:true,notificationAt:new Date(now).toISOString(),notificationHealthy:true,independentWatchdog:true,legacyRetired:true},...extra};
    this.edit?.(reply,c);this.after?.(c,reply);return reply;
  }
  async close(){this.closed=true;}
}
export function feedFactory(model,{count=1,onCount=()=>{},uncertain=false,disconnect=false}={}){
  let emitted=0;const stats={factories:0,opens:0,reads:0,active:0,maxActive:0};const fixtures=new Map();
  const factory=()=>{stats.factories++;return {
    open(h,signal,allowed){
      if(!allowed()||!model.state.connected)throw Error('UNCHARGED_SOCKET');stats.opens++;stats.maxActive=Math.max(stats.maxActive,++stats.active);
      let done,closed=false;const promise=new Promise(r=>{done=r;});
      const close=()=>{if(closed)return;closed=true;if(!uncertain){stats.active--;h.close('SOURCE_DISCONNECTED');done();}};
      signal.addEventListener('abort',close,{once:true});
      queueMicrotask(()=>{h.open();h.frame(ack);if(disconnect){setTimeout(close,0);return;}
        const next=()=>{if(closed||signal.aborted||emitted>=count)return;const f=fixture({seed:++emitted});fixtures.set(f.signature,f);h.frame(f.raw);onCount(emitted);setImmediate(next);};setImmediate(next);
      });return {closed:promise,close};
    },
    async read(body,signal,allowed){if(!allowed()||signal.aborted||model.state.usage.rpc<=stats.reads)throw Error('UNCHARGED_RPC');stats.reads++;const b=JSON.parse(body),sig=b.id===10?b.params[0]:b.params[0][0],f=fixtures.get(sig);return JSON.stringify(b.id===10?f.tx:f.status);},
  };};return {factory,stats};
}
