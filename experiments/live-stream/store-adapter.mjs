// A-owned adapter to B's canonical worker envelope. No SQL, DSN parsing or auth implementation.
import {randomUUID} from 'node:crypto';
export function adaptStore(raw,grant,worker=randomUUID()){
  if(!raw||typeof raw.transact!=='function'||typeof raw.close!=='function')throw Error('STORE_PORT_MISSING');
  let fence=null,tail=Promise.resolve();
  const base={v:1,session:grant.runId,scope:grant.scopeHash,head:grant.head,worker};
  const counters={frames:0,bytes:0};
  const dispatch=async(command,options)=>{
      if(options.signal.aborted)throw Error('STORE_ABORTED');
      let c={...base,op:command.op};if(command.op!=='claim')c.fence=command.fence;
      switch(command.op){
        case 'claim':break;
        case 'reserve':c.resource=command.kind;break;
        case 'append':{
          const r=command.record,verified=r.finality==='finalized';
          c.event={signature:r.signature,slot:r.slot,receivedAt:r.receivedAt,source:'helius_standard',
            program:'6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',notificationHash:r.notificationHash,
            finality:verified?'rpc_reported_finalized':'provisional',mint:verified?r.mint:null,
            quoteMint:verified?r.quoteMint:null,tokenProgram:verified?r.tokenProgram:null,
            transactionHash:verified?r.transactionHash:null,verificationHash:verified?r.statusHash:null,
            checkedAt:verified?r.checkedAt:null,blockTime:verified?r.blockTime:null};
          break;
        }
        case 'heartbeat':{
          const h=command.health;
          if(h.frames<counters.frames||h.bytes<counters.bytes)throw Error('COUNTERS_REGRESSED');
          c.framesReceived=h.frames;c.bytesReceived=h.bytes;
          c.sourceState=h.sourceState;
          c.lastFrameAt=h.lastFrameAt;c.lastPongAt=h.lastPongAt;c.lastRpcElapsedMs=h.lastRpcRoundTripMs;
          counters.frames=h.frames;counters.bytes=h.bytes;break;
        }
        case 'gap':
          c.phase=command.boundary;
          c.reason=command.reason==='BEFORE_START_HISTORY_NOT_OBSERVED'?'startup':command.reason.includes('STOP')?'shutdown':command.reason.includes('TRANSPORT')?'transport_error':'disconnect';break;
        case 'stop':c.reason=command.reason.includes('OWNER')?'owner':command.reason.includes('CAP')||command.reason.includes('BUDGET')?'budget':command.reason.includes('STORE')?'storage':'shutdown';break;
        case 'connectionClosed':c.op='release';c.connectionClosed=true;c.terminal=false;break;
        case 'release':c.connectionClosed=true;c.terminal=true;break;
        default:throw Error('UNKNOWN_STORE_COMMAND');
      }
      const r=await raw.transact(c,options);
      const terminal=command.op==='release';
      if(!r||r.v!==1||r.scope!==base.scope||r.session!==base.session||r.head!==base.head||(r.worker!==base.worker&&!(terminal&&r.worker===null))||typeof r.ok!=='boolean'||typeof r.stopped!=='boolean'||![r.framesReceived,r.bytesReceived].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('STORE_ENVELOPE');
      if(!r.ok)return {ok:false,reason:'STORE_DENIED'};
      if(terminal&&r.fence===null&&fence){return {ok:true,state:{runId:base.session,head:base.head,scopeHash:base.scope,leaseId:worker,fence,serverNowMs:Date.parse(r.serverTime),leaseUntilMs:Date.parse(r.serverTime),sessionUntilMs:Date.parse(grant.expiresAt),stop:r.stopped}};}
      if(typeof r.fence!=='string'||(fence&&r.fence!==fence))throw Error('STORE_FENCE');fence=r.fence;
      const serverNowMs=Date.parse(r.serverTime),leaseUntilMs=Date.parse(r.leaseUntil);
      if(!Number.isSafeInteger(serverNowMs)||!Number.isSafeInteger(leaseUntilMs))throw Error('STORE_CLOCK');
      const result={ok:true,state:{runId:base.session,head:base.head,scopeHash:base.scope,leaseId:worker,fence,
        serverNowMs,leaseUntilMs,sessionUntilMs:Date.parse(grant.expiresAt),stop:r.stopped}};
      if(command.op==='reserve'){
        if(!Number.isSafeInteger(r.ticket)||r.ticket<1)throw Error('STORE_TICKET');
        result.ticketId=`${command.kind}-${r.ticket}`;
      }
      if(command.op==='append'){
        if(!['inserted','duplicate','promoted'].includes(r.reason))throw Error('STORE_APPEND');result.inserted=r.reason!=='duplicate';
      }
      if(command.op==='claim'){
        counters.frames=r.framesReceived;counters.bytes=r.bytesReceived;
        result.committedCounters={frames:r.framesReceived,bytes:r.bytesReceived};
      }
      return result;
  };
  return {
    transact(command,options){
      // B's single native PG connection intentionally rejects a second queued waiter.
      // Serialize the controller's heartbeat/append/reservation calls, recheck cancellation
      // before entering SQL, and never serialize provider latency behind this queue.
      const result=tail.then(()=>dispatch(command,options));tail=result.catch(()=>{});return result;
    },
    close:()=>raw.close(),
  };
}
