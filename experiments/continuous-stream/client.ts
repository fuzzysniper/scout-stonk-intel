import {randomUUID} from 'node:crypto';
import {millis,UUID} from '../live-stream/policy';
import {POLICY,POLICY_HASH,hash,integer} from './policy';
import type {Base,Command,Grant,Port,Reply,Usage} from './contract';
import type {Clock} from '../live-stream/ports';
export class Fault extends Error {constructor(readonly code:string){super(code);}}
const usageKeys=['credits','bytes','frames','rpc','connections','children','auditRecords','framesReceived','bytesReceived'] as const;
export class Client {
  readonly base:Base;private tail=Promise.resolve();private queued=0;private previous:Usage|null=null;
  reply:Reply|null=null;deadline=-1;private lastMono=-1;private ticket=0;private failed=false;
  constructor(readonly grant:Grant,readonly port:Port,readonly clock:Clock,worker=randomUUID()){
    if(port.version!==POLICY.version||!UUID.test(worker))throw new Fault('CONTINUOUS_EXTENSION_REQUIRED');
    this.base={v:2,parent:grant.parent,head:grant.head,scope:POLICY_HASH,grantHash:hash(grant),worker};
  }
  valid(){const m=this.clock.mono();const yes=!this.failed&&m>=this.lastMono&&m<this.deadline&&this.clock.now()<millis(this.grant.endsAt)&&this.reply?.stopped===false;this.lastMono=m;return yes;}
  command(body:Record<string,unknown>,cleanup=false):Promise<Reply>{
    if(this.queued>=POLICY.maxQueue){this.failed=true;this.deadline=-1;return Promise.reject(new Fault('STORE_QUEUE_CAP'));}this.queued++;
    const result=this.tail.then(()=>this.dispatch(body,cleanup)).catch(e=>{if(!cleanup){this.failed=true;this.deadline=-1;}throw e;});this.tail=result.then(()=>{},()=>{});
    return result.finally(()=>{this.queued--;});
  }
  private async dispatch(body:Record<string,unknown>,cleanup:boolean):Promise<Reply>{
    if(!cleanup&&(this.failed||body.op!=='claim'&&!this.valid()))throw new Fault('PARENT_LEASE_INVALID');
    if(body.op==='claim'&&this.reply)throw new Fault('CLAIM_REUSE');
    const start=this.clock.mono(),abort=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
    const command={...body,...this.base,...(body.op==='claim'?{}:{fence:this.reply?.fence})} as Command;
    let r:Reply;
    try{r=await Promise.race([this.port.transact(command,{signal:abort.signal}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(new Fault('STORE_TIMEOUT'));},POLICY.storeTimeoutMs);})]);}
    catch(e){if(e instanceof Fault)throw e;throw new Fault('STORE_UNAVAILABLE');}
    finally{clearTimeout(timer);}
    if(!r||r.v!==2||r.parent!==this.base.parent||r.head!==this.base.head||r.scope!==POLICY_HASH||r.grantHash!==this.base.grantHash||typeof r.ok!=='boolean'||typeof r.stopped!=='boolean'||typeof r.connected!=='boolean'||r.parentEndsAt!==this.grant.endsAt)throw new Fault('PARENT_ATTESTATION');
    if(!r.ok)throw new Fault('PARENT_DENIED');
    const releasing=body.op==='release';
    if(!releasing&&(r.worker!==this.base.worker||!UUID.test(r.fence??'')||(this.reply&&this.reply.fence!==r.fence)))throw new Fault('PARENT_FENCE');
    if(releasing&&(r.worker!==null||r.fence!==null||r.leaseUntil!==null||r.connected||r.child!==null))throw new Fault('RELEASE_ATTESTATION');
    if(!r.usage||Object.keys(r.usage).sort().join()!==[...usageKeys].sort().join())throw new Fault('USAGE_SHAPE');
    for(const key of usageKeys){const v=r.usage[key];if(!integer(v)||(this.previous&&v<this.previous[key]))throw new Fault('COUNTER_REGRESSION');
      const cap=key==='framesReceived'?this.grant.limits.frames:key==='bytesReceived'?this.grant.limits.bytes:this.grant.limits[key];if(v>cap)throw new Fault('PARENT_CAP');}
    if(r.usage.framesReceived>r.usage.frames||r.usage.bytesReceived>r.usage.bytes)throw new Fault('UNCHARGED_RECEIVE');
    if(r.child&&(!UUID.test(r.child.id)||millis(r.child.startsAt)>millis(r.serverTime)||millis(r.child.endsAt)-millis(r.child.startsAt)>POLICY.maxChildMs||millis(r.child.endsAt)>millis(this.grant.endsAt)))throw new Fault('CHILD_TIME');
    if(body.child&&body.op!=='closeChild'&&r.child?.id!==body.child)throw new Fault('CHILD_FENCE');
    if(body.op==='stop'&&r.stopped!==true)throw new Fault('STOP_UNCONFIRMED');
    if(body.op==='beginChild'&&(r.child?.id!==body.child||r.child?.endsAt!==body.endsAt||r.connected||r.usage.children!==(this.previous?.children??0)+1))throw new Fault('CHILD_ADMISSION');
    if(body.op==='closeChild'&&(r.child!==null||r.connected))throw new Fault('CLOSE_UNCONFIRMED');
    if(body.op==='reserve'){
      const p=this.previous,connection=body.resource==='connection';
      if(!p||!integer(r.ticket)||r.ticket<=this.ticket||r.usage.credits!==p.credits+(connection?this.grant.connectionCredits:this.grant.rpcCredits)||r.usage.rpc!==p.rpc+(connection?0:1)||r.usage.connections!==p.connections+(connection?1:0)||r.usage.bytes!==p.bytes+(connection?POLICY.byteEnvelope:0)||r.usage.frames!==p.frames+(connection?POLICY.frameEnvelope:0))throw new Fault('RESERVATION_UNCONFIRMED');
      this.ticket=r.ticket;
    }
    // Retain only a validated fence/counter snapshot for fail-closed cleanup even
    // if the subsequent assurance check refuses all source acquisition.
    this.reply=r;this.previous={...r.usage};
    if(!cleanup){
      if(r.stopped)throw new Fault('PERMANENT_STOP');const server=millis(r.serverTime),lease=millis(r.leaseUntil);
      if(lease<=server||lease-server>POLICY.leaseMs||lease>millis(this.grant.endsAt)||(r.child&&lease>millis(r.child.endsAt))||Math.abs(server-this.clock.now())>10000)throw new Fault('LEASE_CLOCK');
      const a=r.assurance;if(!a||a.meterAttributed!==true||a.meterMismatch!==false||a.purgeHealthy!==true||a.backupsExcluded!==true||a.notificationHealthy!==true||a.independentWatchdog!==true||a.legacyRetired!==true||!integer(a.meterBalance)||a.meterBalance<this.grant.limits.credits-r.usage.credits+this.grant.incidentReserveCredits||millis(a.hardCapUntil)<millis(this.grant.endsAt))throw new Fault('ASSURANCE_MISSING');
      for(const [at,age] of [[a.meterAt,POLICY.meterFreshMs],[a.purgeThrough,POLICY.purgeFreshMs],[a.notificationAt,POLICY.notificationFreshMs]] as const)if(millis(at)>server||server-millis(at)>age)throw new Fault('ASSURANCE_STALE');
      this.deadline=start+lease-server;
    }
    return r;
  }
  async close(){await this.port.close();}
}
