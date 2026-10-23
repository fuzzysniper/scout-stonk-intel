import {randomUUID} from 'node:crypto';
import {Worker} from '../live-stream/worker';
import {SCOPE,SCOPE_HASH,millis,type Approval} from '../live-stream/policy';
import type {Clock,Health,Source,Store,StoreCommand,StoreReply} from '../live-stream/ports';
import {Client,Fault} from './client';
import {POLICY} from './policy';
import type {Child,Grant,Port,Reply} from './contract';
const emptyHealth=():Health=>({state:'STARTING',sourceState:'closed',reason:'WAIT',frames:0,bytes:0,ignored:0,duplicates:0,provisional:0,finalized:0,withheld:0,rpcAttempts:0,rpcBytes:0,connections:0,lastFrameAt:null,lastPongAt:null,lastRpcRoundTripMs:null});

/** Reuses the unchanged bounded #170 source worker. This bridge never speaks v1 SQL. */
class ChildBridge implements Store {
  closed=false;rollover=false;count=0;failure:string|null=null;worker:Worker|null=null;lastHealth=emptyHealth();lastPersistedAt:string|null=null;
  constructor(readonly client:Client,readonly child:Child,readonly clock:Clock){}
  private local(r:Reply):Extract<StoreReply,{ok:true}>{
    if(!r.fence||!r.leaseUntil)throw new Fault('PARENT_FENCE_MISSING');
    return {ok:true,state:{runId:this.child.id,head:r.head,scopeHash:SCOPE_HASH,leaseId:this.client.base.worker,fence:r.fence,
      serverNowMs:millis(r.serverTime),leaseUntilMs:millis(r.leaseUntil),sessionUntilMs:millis(this.child.endsAt),stop:r.stopped},
      committedCounters:{frames:r.usage.framesReceived,bytes:r.usage.bytesReceived}};
  }
  roll(){this.rollover=true;this.worker?.stop('CHILD_ROLLOVER');}
  async transact(c:StoreCommand,options:{signal:AbortSignal}):Promise<StoreReply>{
    if(options.signal.aborted)throw new Fault('CHILD_ABORTED');const common={child:this.child.id};let r:Reply;
    try{switch(c.op){
      case 'claim':if(!this.client.valid()||this.client.reply?.child?.id!==this.child.id)throw new Fault('CHILD_NOT_ADMITTED');return this.local(this.client.reply);
      case 'reserve':r=await this.client.command({...common,op:'reserve',resource:c.kind});return {...this.local(r),ticketId:`parent-${r.ticket}`};
      case 'append':{
        r=await this.client.command({...common,op:'append',record:c.record});
        if(!['inserted','duplicate','promoted'].includes(r.disposition??'')||!r.firstReceivedAt||!r.firstNotificationHash||!(/^[a-f0-9]{64}$/).test(r.firstNotificationHash)||millis(r.firstReceivedAt)>millis(c.record.receivedAt))throw new Fault('FIRST_EVIDENCE_UNCONFIRMED');
        const duplicate=r.disposition==='duplicate';
        if(!duplicate&&(r.firstReceivedAt!==c.record.receivedAt||r.firstNotificationHash!==c.record.notificationHash))throw new Fault('FIRST_EVIDENCE_CHANGED');
        if(!duplicate&&(!this.lastPersistedAt||millis(r.firstReceivedAt)>millis(this.lastPersistedAt)))this.lastPersistedAt=r.firstReceivedAt;
        if(r.disposition==='inserted'&&++this.count>=POLICY.rolloverRecords)this.roll();
        return {...this.local(r),inserted:!duplicate};
      }
      case 'heartbeat':
        this.lastHealth=c.health;
        if(c.health.sourceState==='open'){
          const last=Math.max(c.health.lastFrameAt?millis(c.health.lastFrameAt):0,c.health.lastPongAt?millis(c.health.lastPongAt):0);
          if(this.clock.now()-last>45000)throw new Fault('SOURCE_STALE');
        }
        r=await this.client.command({...common,op:'heartbeat',health:c.health},c.health.state==='STOPPED');return this.local(r);
      case 'gap':r=await this.client.command({...common,op:'gap',phase:c.boundary,reason:c.reason,observedAt:c.at,lastPersistedAt:this.lastPersistedAt},c.reason.includes('STOP'));return this.local(r);
      case 'connectionClosed':
        // B's new connection-release command keeps this child/fence but sets connected=false.
        r=await this.client.command({...common,op:'connectionClosed',connectionClosed:true});return this.local(r);
      case 'stop':
        if(this.rollover&&c.reason==='CHILD_ROLLOVER'){
          r=await this.client.command({...common,op:'heartbeat',health:this.lastHealth},true);return this.local(r);
        }
        r=await this.client.command({op:'stop',reason:c.reason},true);return this.local(r);
      case 'release':
        r=await this.client.command({...common,op:'closeChild',connectionClosed:true},true);this.closed=true;
        // The old core only awaits this cleanup acknowledgment; no lease reuse.
        return {ok:true,state:{runId:this.child.id,head:r.head,scopeHash:SCOPE_HASH,leaseId:this.client.base.worker,fence:r.fence??'',serverNowMs:millis(r.serverTime),leaseUntilMs:millis(r.serverTime),sessionUntilMs:millis(this.child.endsAt),stop:r.stopped}};
    }}catch(e){this.failure=e instanceof Fault?e.code:'CHILD_STORE_UNAVAILABLE';throw e;}
  }
  async close(){} // Parent owns/retains the single durable store connection between children.
}
export type Result={state:'STOPPED';reason:string;completedChildren:number;sourceConnected:false|null;durableStopConfirmed:boolean;renewalAllowed:false};
export class Continuous {
  readonly client:Client;private core:Worker|null=null;private stopped=false;private reason='NOT_STARTED';
  constructor(readonly grant:Grant,port:Port,readonly sourceFactory:()=>Source,readonly clock:Clock){this.client=new Client(grant,port,clock);}
  stop(reason='OWNER_STOP'){if(this.stopped)return;this.stopped=true;this.reason=reason;this.core?.stop(reason);}
  private approval(child:Child):Approval{return {version:SCOPE.version,head:this.grant.head,runId:child.id,scopeHash:SCOPE_HASH,
    workerPolicyHash:this.grant.sourcePolicyHash,renderServiceId:this.grant.service,notBefore:child.startsAt,expiresAt:child.endsAt,
    rightsEvidenceHash:this.grant.rightsHash,accountEvidenceHash:this.grant.accountHash,sourceGo:true,deploymentGo:true,planVerified:true,rightsConfirmed:true,retentionApproved:true,dedicatedDataKey:true,overageDisabled:true,retentionSeconds:3600};}
  async run():Promise<Result>{
    let completedChildren=0,closureConfirmed=true,durableStopConfirmed=false;
    try{
      await this.client.command({op:'claim'});
      await this.client.command({op:'notify',reason:'PARENT_STARTED'});
      while(!this.stopped){
        const remaining=millis(this.grant.endsAt)-this.clock.now();
        if(remaining<POLICY.minChildMs){this.stop('PARENT_EXPIRED');break;}
        const endsAt=new Date(Math.min(this.clock.now()+POLICY.maxChildMs,millis(this.grant.endsAt))).toISOString();
        const admitted=await this.client.command({op:'beginChild',child:randomUUID(),endsAt});
        const child=admitted.child;if(!child)throw new Fault('CHILD_MISSING');
        const bridge=new ChildBridge(this.client,child,this.clock);
        // No key lookup/source construction until the durable parent+child are confirmed.
        this.core=new Worker(this.approval(child),bridge,this.sourceFactory(),this.clock);bridge.worker=this.core;
        closureConfirmed=false;const timerAbort=new AbortController();
        const roll=this.clock.sleep(Math.max(1,millis(child.endsAt)-this.clock.now()-POLICY.rolloverMarginMs),timerAbort.signal).then(()=>bridge.roll(),()=>{});
        let health:Health;
        try{health=await this.core.run();}finally{timerAbort.abort();await roll;}
        closureConfirmed=bridge.closed&&health.sourceState==='closed'&&this.client.reply?.connected===false;
        if(!closureConfirmed)throw new Fault('SOURCE_CLOSURE_UNCONFIRMED');
        this.core=null;
        if(health.reason!=='CHILD_ROLLOVER'||!bridge.rollover)throw new Fault('CHILD_FAILED_OR_OWNER_STOP');
        if(bridge.failure&&bridge.failure!=='CHILD_ABORTED')throw new Fault(bridge.failure);
        completedChildren++;
        // No reset/reclaim. Parent counters, fence, STOP and meter/purge/outbox checks persist.
        await this.client.command({op:'notify',reason:'CHILD_CLOSED_GAP_NO_REPLAY'});
      }
    }catch(e){this.stop(e instanceof Fault?e.code:'CONTINUOUS_ADMISSION_SOURCE_OR_ASSURANCE_FAILURE');}
    finally{
      this.core?.stop(this.reason);
      if(this.client.reply?.fence){
        const stopped=await this.client.command({op:'stop',reason:this.reason},true).catch(()=>null);durableStopConfirmed=stopped?.stopped===true;
        await this.client.command({op:'notify',reason:this.reason},true).catch(()=>{});
        if(closureConfirmed&&durableStopConfirmed)await this.client.command({op:'release',connectionClosed:true},true).catch(()=>{});
      }
      await Promise.race([this.client.close().catch(()=>{}),new Promise(r=>setTimeout(r,POLICY.storeTimeoutMs))]);
    }
    return {state:'STOPPED',reason:this.reason,completedChildren,sourceConnected:closureConfirmed?false:null,durableStopConfirmed,renewalAllowed:false};
  }
}
