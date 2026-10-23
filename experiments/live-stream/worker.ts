import {notice,corroborate,type Creation} from './creation';
import {SCOPE,SCOPE_HASH,UUID,millis,rpcRequest,type Approval} from './policy';
import {strictJson} from '../consumer-mvp/evidence/strict-json';
import type {Clock,Health,LeaseState,Source,SourceConnection,Store,StoreCommand,StoreReply} from './ports';

export class Worker {
  readonly health:Health={state:'STARTING',reason:'WAIT_DURABLE_CLAIM',frames:0,bytes:0,ignored:0,duplicates:0,
    provisional:0,finalized:0,withheld:0,rpcAttempts:0,rpcBytes:0,connections:0,lastFrameAt:null,lastPongAt:null,lastRpcRoundTripMs:null};
  private lease:LeaseState|null=null; private leaseDeadline=-1; private stopped=false;
  private readonly abort=new AbortController(); private connection:SourceConnection|null=null;
  private queue=Promise.resolve();private queued=0;private sequence=0;private records=0;private selected=0;
  private verification=Promise.resolve();private verifying=false;
  private lastSample=-Infinity;private lastReceipt=-Infinity;private lastMono=-Infinity;
  private readonly seen=new Map<string,string>();
  private readonly tickets=new Set<string>();
  constructor(readonly grant:Approval,readonly store:Store,readonly source:Source,readonly clock:Clock){}
  private at(){return new Date(this.clock.now()).toISOString();}
  private identity(){if(!this.lease)throw Error('NO_LEASE');return {runId:this.grant.runId,scopeHash:SCOPE_HASH,leaseId:this.lease.leaseId,fence:this.lease.fence};}
  private valid(){const m=this.clock.mono();const good=!this.stopped&&!!this.lease&&m>=this.lastMono&&m<this.leaseDeadline&&this.clock.now()<millis(this.grant.expiresAt);this.lastMono=m;return good;}
  private requireLease(){if(!this.valid())throw Error('LEASE_OR_TIME_INVALID');}
  private async timed<T>(action:(signal:AbortSignal)=>Promise<T>,cleanup=false):Promise<T>{
    if(!cleanup&&this.abort.signal.aborted)throw Error('STOPPED');
    const a=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
    const abort=()=>a.abort();if(!cleanup)this.abort.signal.addEventListener('abort',abort,{once:true});
    try{return await Promise.race([action(a.signal),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{a.abort();reject(Error('STORE_TIMEOUT'));},SCOPE.storeTimeoutMs);})]);}
    finally{clearTimeout(timer);this.abort.signal.removeEventListener('abort',abort);}
  }
  private async call(command:StoreCommand):Promise<Extract<StoreReply,{ok:true}>>{
    if(command.op!=='claim')this.requireLease();const start=this.clock.mono();
    const r=await this.timed(signal=>this.store.transact(command,{signal}));
    if(!r||r.ok!==true)throw Error('STORE_DENIED');const s=r.state;
    if(!s||s.runId!==this.grant.runId||s.head!==this.grant.head||s.scopeHash!==SCOPE_HASH||s.stop!==false||
      typeof s.leaseId!=='string'||!(/^[a-zA-Z0-9_-]{8,128}$/).test(s.leaseId)||
      !UUID.test(s.fence)||![s.serverNowMs,s.leaseUntilMs,s.sessionUntilMs].every(n=>Number.isSafeInteger(n)&&n>0)||
      s.sessionUntilMs!==millis(this.grant.expiresAt)||s.leaseUntilMs>s.sessionUntilMs||
      s.leaseUntilMs<=s.serverNowMs||s.leaseUntilMs-s.serverNowMs>SCOPE.leaseMs||Math.abs(s.serverNowMs-this.clock.now())>10000||
      (this.lease&&(s.leaseId!==this.lease.leaseId||s.fence!==this.lease.fence)))throw Error('STORE_ATTESTATION');
    this.lease=s;this.leaseDeadline=start+(s.leaseUntilMs-s.serverNowMs);this.requireLease();return r;
  }
  private async reserve(kind:'connection'|'rpc'){
    const r=await this.call({...this.identity(),op:'reserve',kind,requestId:`${this.lease!.fence}-${++this.sequence}`});
    if(typeof r.ticketId!=='string'||!r.ticketId.length||r.ticketId.length>128||this.tickets.has(r.ticketId))throw Error('RESERVATION_UNCONFIRMED');
    this.tickets.add(r.ticketId);
    this.requireLease(); // A lost/late acknowledgement never permits source I/O.
  }
  stop(reason='OWNER_SIGNAL'){
    if(this.stopped)return;this.stopped=true;this.health.state='STOPPED';this.health.reason=reason;
    this.abort.abort();this.connection?.close();
  }
  private enqueue(job:()=>Promise<void>){
    if(this.queued>=SCOPE.maxQueue){this.stop('QUEUE_CAP');return;}
    this.queued++;
    this.queue=this.queue.then(async()=>{if(!this.valid())return;await job();}).catch(()=>this.stop('STORE_OR_VERIFICATION_FAILURE')).finally(()=>{this.queued--;});
  }
  private async persist(row:Creation){
    const r=await this.call({...this.identity(),op:'append',record:row});
    if(typeof r.inserted!=='boolean')throw Error('APPEND_UNCONFIRMED');return r.inserted;
  }
  private async read(signature:string,kind:'transaction'|'status'){
    if(this.health.rpcAttempts>=SCOPE.maxRpcAttempts)throw Error('RPC_CAP');
    await this.reserve('rpc');this.requireLease();this.health.rpcAttempts++;
    const start=this.clock.mono(),raw=await this.source.read(rpcRequest(signature,kind),this.abort.signal,()=>this.valid());
    this.requireLease();const elapsed=this.clock.mono()-start;
    if(elapsed<0||elapsed>SCOPE.rpcTimeoutMs)throw Error('RPC_CLOCK_OR_TIMEOUT');
    this.health.lastRpcRoundTripMs=Math.floor(elapsed);this.health.rpcBytes+=Buffer.byteLength(raw);
    if(Buffer.byteLength(raw)>SCOPE.maxRpcResponseBytes)throw Error('RPC_BYTES');
    const b=strictJson(raw) as Record<string,unknown>;
    if(!b||b.jsonrpc!=='2.0'||b.id!==(kind==='transaction'?10:11)||b.error!==undefined||!Object.hasOwn(b,'result'))throw Error('RPC_PROVIDER_ERROR');
    return raw;
  }
  private async candidate(row:Creation){
    const inserted=await this.persist(row);if(!inserted){this.health.duplicates++;return;}
    this.health.provisional++;
    if(this.verifying||this.selected>=SCOPE.maxRpcAttempts/2||this.clock.mono()-this.lastSample<SCOPE.sampleSpacingMs)return;
    this.selected++;this.lastSample=this.clock.mono();
    // HTTP latency must not block persistence of subsequent original creations.
    // Exactly one corroboration is active; skipped samples remain provisional.
    this.verifying=true;
    this.verification=this.verify(row).catch(()=>this.stop('STORE_OR_VERIFICATION_FAILURE')).finally(()=>{this.verifying=false;});
  }
  private async verify(row:Creation){
    const tx=await this.read(row.signature,'transaction'),status=await this.read(row.signature,'status');
    let final:Creation;
    try{final=corroborate(row,tx,status,this.at());}
    catch{this.health.withheld++;await this.persist({...row,reason:'WAIT_INVALID_UNAVAILABLE_STALE_OR_UNSUPPORTED_CORROBORATION'});return;}
    if(!await this.persist(final))throw Error('PROMOTION_UNCONFIRMED');this.health.finalized++;
  }
  private async heartbeat(){
    while(!this.stopped){
      try{await this.clock.sleep(SCOPE.heartbeatMs,this.abort.signal);if(this.stopped)return;
        await this.call({...this.identity(),op:'heartbeat',health:{...this.health}});
      }catch{if(!this.stopped)this.stop('STOP_LEASE_OR_STORE_UNAVAILABLE');}
    }
  }
  async run():Promise<Health>{
    let beat:Promise<void>|undefined,closed=true;
    try{
      const claim=await this.call({op:'claim',approval:this.grant});
      if(claim.committedCounters){this.health.frames=claim.committedCounters.frames;this.health.bytes=claim.committedCounters.bytes;}
      beat=this.heartbeat();
      for(let attempt=0;attempt<SCOPE.maxConnectionAttempts&&!this.stopped;attempt++){
        if(attempt)await this.clock.sleep(SCOPE.reconnectDelaysMs[attempt-1],this.abort.signal);
        this.requireLease();
        await this.call({...this.identity(),op:'gap',at:this.at(),boundary:'begin',reason:attempt?'DISCONNECT_NO_REPLAY':'BEFORE_START_HISTORY_NOT_OBSERVED'});
        await this.reserve('connection');this.requireLease();
        let subscription:number|null=null,frames=0,bytes=0,reason='SOURCE_DISCONNECTED';
        this.health.state='CONNECTING';this.health.reason='WAIT_SUBSCRIPTION';this.health.connections++;
        closed=false;
        this.connection=this.source.open({
          open:()=>{if(!this.valid())this.stop('LEASE_INVALID_AT_OPEN');},
          pong:()=>{if(!this.valid()){this.stop('LEASE_INVALID_AT_PONG');return;}this.health.lastPongAt=this.at();},
          frame:raw=>{
            if(!this.valid()){this.stop('LEASE_INVALID_AT_FRAME');return;}
            const n=Buffer.byteLength(raw);if(++frames>SCOPE.maxFramesPerConnection||(bytes+=n)>SCOPE.maxBytesPerConnection){this.stop('SOURCE_RECEIVE_CAP');return;}
            this.health.frames++;this.health.bytes+=n;const now=this.clock.now();
            if(now<this.lastReceipt){this.stop('CLOCK_REGRESSED');return;}this.lastReceipt=now;this.health.lastFrameAt=this.at();
            try{const event=notice(raw,this.at(),subscription);
              if(event.kind==='ack'){subscription=event.subscription;this.health.state='SUBSCRIBED';this.health.reason='PARTIAL_CREATIONS_ONLY';
                this.enqueue(async()=>{await this.call({...this.identity(),op:'gap',at:this.at(),boundary:'end',reason:'SUBSCRIBED_NO_BACKFILL'});});return;}
              if(event.kind==='ignored'){this.health.ignored++;return;}
              const row=event.row,prior=this.seen.get(row.signature);
              if(prior){if(prior!==row.identityHash){this.stop('SOURCE_REVISION');return;}this.health.duplicates++;return;}
              if(++this.records>SCOPE.maxRecords||this.seen.size>=SCOPE.maxSeen){this.stop('RECORD_CAP');return;}
              this.seen.set(row.signature,row.identityHash);this.enqueue(()=>this.candidate(row));
            }catch{this.stop('SOURCE_SCHEMA_INVALID');}
          },
          close:r=>{reason=r;if(!this.stopped){this.health.state='DISCONNECTED';this.health.reason=r;}},
          fatal:r=>this.stop(r),
        },this.abort.signal,()=>this.valid());
        // Native close confirmation is mandatory before another connection or release.
        let closeTimer:ReturnType<typeof setTimeout>|undefined;
        let cancelClose=()=>{};
        try{await Promise.race([this.connection.closed,new Promise<never>((_,reject)=>{
          cancelClose=()=>{closeTimer=setTimeout(()=>reject(Error('CLOSE_UNCONFIRMED')),SCOPE.closeTimeoutMs);};
          if(this.abort.signal.aborted)cancelClose();else this.abort.signal.addEventListener('abort',cancelClose,{once:true});
        })]);}finally{clearTimeout(closeTimer);this.abort.signal.removeEventListener('abort',cancelClose);}
        closed=true;this.connection=null;
        if(!this.stopped)await this.call({...this.identity(),op:'connectionClosed',at:this.at()});
        if(!this.stopped)await this.call({...this.identity(),op:'gap',at:this.at(),boundary:'begin',reason});
      }
      if(!this.stopped)this.stop('CONNECTION_BUDGET_EXHAUSTED');
    }catch{this.stop('CLAIM_STORE_SOURCE_OR_TIME_FAILURE');}
    finally{
      this.stop(this.health.reason);await Promise.allSettled([this.queue,this.verification,beat]);
      if(this.lease){
        // Fresh cleanup signal: STOP must be attempted even when source I/O is aborted.
        await this.timed(signal=>this.store.transact({...this.identity(),op:'heartbeat',health:{...this.health}},{signal}),true).catch(()=>{});
        await this.timed(signal=>this.store.transact({...this.identity(),op:'gap',at:this.at(),boundary:'begin',reason:'AFTER_STOP_NO_HISTORY'},{signal}),true).catch(()=>{});
        await this.timed(signal=>this.store.transact({...this.identity(),op:'stop',at:this.at(),reason:this.health.reason},{signal}),true).catch(()=>{});
        if(closed)await this.timed(signal=>this.store.transact({...this.identity(),op:'release',at:this.at()},{signal}),true).catch(()=>{});
        // If close is uncertain, leave the durable lease quarantined for owner recovery.
      }
      await this.timed(()=>this.store.close(),true).catch(()=>{});
    }
    return {...this.health};
  }
}
