import {strictJson} from '../consumer-mvp/evidence/strict-json';
import {array,integer,PROGRAM,record,transactionEvents,ZERO,USDC,type Event} from '../launch-intel/decode';
import {bytes58,hash} from '../launch-intel/identity';
import {SCOPE,SCOPE_HASH,utc} from './policy';
import contract from '../launch-intel/contract.json';
export type Row={signature:string;mint:string|null;quoteMint:string|null;curve:string|null;pool:string|null;tokenProgram:string|null;stage:string;slot:number;firstReceivedAt:string;checkedAt:string|null;eventUtc:string|null;sourceHashes:{notification:string;transaction:string|null;status:string|null};finality:'PROVISIONAL_RPC_NOTIFICATION'|'RPC_REPORTED_FINALIZED_SAME_PROVIDER';reason:string;sampledTrades:{eventUtc:string;buy:boolean;quoteAtomic:string;quoteMint:string}[]};
export type Mode='OWNER_PC_APPROVED'|'SYNTHETIC_OFFLINE';
export class Engine{
 readonly rows:Row[]=[];readonly seen=new Map<string,string>();
 frames=0;bytes=0;duplicates=0;rejected=0;ignored=0;rpcReads=0;rpcBytes=0;finalized=0;subscription:number|null=null;selected=0;
 startedAt:string|null=null;endedAt:string|null=null;lastReceivedAt:string|null=null;phase='NOT_RUN';reason='SOURCE_DISABLED_APPROVAL_REQUIRED';
 readonly rpcRoundTripMs:(number|null)[]=[];private readonly rpcStarted=new Map<string,string>();
 readonly gaps:{at:string;reason:string}[]=[];
 constructor(readonly mode:Mode,readonly retain:(kind:string,data:unknown)=>void){}
 start(now:string){utc(now);this.startedAt=now;this.phase='CONNECTING';this.reason='WAIT_SUBSCRIPTION';this.gaps.push({at:now,reason:'BEFORE_START_NOT_OBSERVED_NO_BACKFILL'});}
 notice(raw:string,at:string):Row|null{
  utc(at);if(this.phase==='NOT_RUN')throw Error('not_started');if(this.phase==='STOPPED'||this.phase==='DRAINING')return null;
  if(this.lastReceivedAt&&utc(at)<utc(this.lastReceivedAt))throw Error('receipt_clock_regressed');
  const n=Buffer.byteLength(raw);if(n>SCOPE.maxFrameBytes||this.frames>=SCOPE.maxFrames||this.bytes+n>SCOPE.maxStreamBytes)throw Error('stream_cap');
  this.frames++;this.bytes+=n;this.lastReceivedAt=at;this.retain('websocket_frame',{at,sha256:hash(raw),raw});
  const b=record(strictJson(raw));if(b.jsonrpc!=='2.0'||b.error!==undefined)throw Error('subscription_error');
  if(b.id===1){if(this.subscription!==null)throw Error('duplicate_subscription_ack');this.subscription=integer(b.result);this.phase='COLLECTING';this.reason='PARTIAL_CONFIRMED_LOG_STREAM';return null;}
  const p=record(b.params);if(b.method!=='logsNotification'||this.subscription===null||p.subscription!==this.subscription)throw Error('unbound_notification');
  const r=record(p.result),v=record(r.value),slot=integer(record(r.context).slot);bytes58(v.signature,64);
  const logs=array(v.logs);if(logs.some(x=>typeof x!=='string'||x.length>8192))throw Error('invalid_logs');
  const signature=v.signature as string,identity=hash(JSON.stringify({slot,value:v})),prior=this.seen.get(signature);
  if(prior){if(prior!==identity)throw Error('notification_revision_or_reorg');this.duplicates++;return null;}
  this.seen.set(signature,identity);if(v.err!==null){this.rejected++;return null;}
  // Program log strings remain provisional even with a scoped invocation stack.
  const stack:string[]=[];let stage:string|null=null;
  for(const rawLine of logs){const line=rawLine as string,invoke=/^Program ([1-9A-HJ-NP-Za-km-z]+) invoke \[(\d+)\]$/.exec(line);
   if(invoke){if(Number(invoke[2])!==stack.length+1)throw Error('log_stack');stack.push(invoke[1]);continue;}
   if(/^Program \S+ (?:success|failed:.*)$/.test(line)){const id=line.split(' ')[1];if(stack.pop()!==id)throw Error('log_stack');continue;}
   if(stack.length===1&&stack[0]===PROGRAM){if(line==='Program log: Instruction: Create'||line==='Program log: Instruction: CreateV2')stage='CREATION_HINT';if(line==='Program log: Instruction: Migrate')stage='MIGRATION_HINT';}
  }
  if(stack.length)throw Error('truncated_log_stack');
  if(!stage){this.ignored++;return null;}
  if(this.rows.length>=SCOPE.maxCandidates)throw Error('candidate_cap');
  const row:Row={signature,mint:null,quoteMint:null,curve:null,pool:null,tokenProgram:null,stage,slot,firstReceivedAt:at,checkedAt:null,eventUtc:null,sourceHashes:{notification:hash(raw),transaction:null,status:null},finality:'PROVISIONAL_RPC_NOTIFICATION',reason:'MINT_QUOTE_AND_FINALITY_NOT_YET_VERIFIED',sampledTrades:[]};
  this.rows.push(row);return row;
 }
 select(){if(this.selected>=SCOPE.maxVerifications)return false;this.selected++;return true;}
 reserve(request:string,at:string){if(this.phase==='STOPPED'||this.rpcReads>=SCOPE.maxRpcReads)throw Error('rpc_cap_or_stopped');this.retain('rpc_reservation',{attempt:this.rpcReads+1,at,request});this.rpcReads++;this.rpcStarted.set(hash(request),at);}
 capture(request:string,body:string,at:string){this.rpcBytes+=Buffer.byteLength(body);if(Buffer.byteLength(body)>SCOPE.maxRpcResponseBytes)throw Error('rpc_body_cap');const start=this.rpcStarted.get(hash(request));const elapsed=start&&utc(at)>=utc(start)?Number((utc(at)-utc(start))/1000n):null;this.rpcRoundTripMs.push(elapsed);this.retain('rpc_response',{at,requestSha256:hash(request),sha256:hash(body),ownerClockRoundTripMs:elapsed,body});}
 verify(row:Row,txRaw:string,statusRaw:string,checkedAt:string){
  if(row.finality==='RPC_REPORTED_FINALIZED_SAME_PROVIDER')return;
  try{
   utc(checkedAt);const tx=record(strictJson(txRaw)),status=record(strictJson(statusRaw));
   if(tx.jsonrpc!=='2.0'||status.jsonrpc!=='2.0'||tx.id!==10||status.id!==11||tx.error!==undefined||status.error!==undefined)throw Error('rpc_envelope');
   const decoded=transactionEvents(tx.result,row.signature),result=record(status.result),values=array(result.value);
   if(values.length!==1)throw Error('status_scope');const s=record(values[0]);
   if(decoded.slot!==row.slot||s.slot!==row.slot||integer(record(result.context).slot)<row.slot||s.err!==null||s.confirmationStatus!=='finalized'||s.confirmations!==null)throw Error('not_finalized_or_reorg');
   const kind=row.stage==='CREATION_HINT'?'CreateEvent':'CompletePumpAmmMigrationEvent',e=decoded.events.find(e=>e.kind===kind);if(!e)throw Error('hint_event_mismatch');
   if(decoded.events.some(x=>x.fields.mint!==e.fields.mint))throw Error('ambiguous_multi_mint');
   if(kind==='CompletePumpAmmMigrationEvent'){
    const t=record(tx.result),msg=record(record(t.transaction).message),meta=record(t.meta),loaded=meta.loadedAddresses===undefined?{writable:[],readonly:[]}:record(meta.loadedAddresses);
    const keys=[...array(msg.accountKeys),...array(loaded.writable),...array(loaded.readonly)],ix=record(array(msg.instructions)[e.instruction]);
    const poolIndex=integer(array(ix.accounts)[contract.instructions.migrate.accounts.indexOf('pool')]);if(keys[poolIndex]!==e.fields.pool)throw Error('migration_pool_mismatch');
   }
   if(![ZERO,USDC].includes(e.fields.quote_mint as string))throw Error('quote_outside_reviewed_subset');
   const eventUtc=clock(e,checkedAt);
   const eventLag=utc(row.firstReceivedAt)-utc(eventUtc);if(eventLag<0n||eventLag>120000000n)throw Error('SOURCE_EVENT_FRESHNESS_WITHHELD');
   const trades=decoded.events.filter(e=>e.kind==='TradeEvent').map(x=>{if(x.fields.quote_mint!==e.fields.quote_mint)throw Error('trade_quote_mismatch');return {eventUtc:clock(x,checkedAt),buy:x.fields.is_buy as boolean,quoteAtomic:x.fields.quote_amount as string,quoteMint:e.fields.quote_mint as string};});
   const next:Row={...row,mint:e.fields.mint as string,quoteMint:e.fields.quote_mint as string,curve:e.fields.bonding_curve as string,pool:kind==='CompletePumpAmmMigrationEvent'?e.fields.pool as string:null,tokenProgram:typeof e.fields.token_program==='string'?e.fields.token_program:null,eventUtc,checkedAt,sourceHashes:{notification:row.sourceHashes.notification,transaction:hash(txRaw),status:hash(statusRaw)},finality:'RPC_REPORTED_FINALIZED_SAME_PROVIDER',stage:kind==='CreateEvent'?'BONDING_CURVE_CREATION':'MIGRATED',reason:'WAIT_CONTROLS_COVERAGE_AND_EXIT_CAPACITY_UNKNOWN',sampledTrades:trades};
   this.retain('rpc_finalized_corroboration',{checkedAt,row:next,independentProvider:false});Object.assign(row,next);this.finalized++;
  }catch(error){row.reason=error instanceof Error&&error.message==='SOURCE_EVENT_FRESHNESS_WITHHELD'?'WAIT_SOURCE_EVENT_OLDER_THAN_120S_OR_CLOCK_INCONSISTENT':'VERIFICATION_WITHHELD_INVALID_UNAVAILABLE_OR_UNSUPPORTED';this.rejected++;this.retain('verification_withheld',{at:checkedAt,signature:row.signature,reason:row.reason});}
 }
 stop(reason:string,at:string){if(this.phase==='STOPPED')return;this.phase='STOPPED';this.reason=reason;this.endedAt=at;this.gaps.push({at,reason:'AFTER_STOP_NOT_OBSERVED_NO_AUTOMATIC_RECOVERY'});this.retain('stop',{at,reason});}
 snapshot(at:string){
  utc(at);return {version:'private-market-pilot/1',mode:this.mode,phase:this.phase,reason:this.reason,at,source:'Solana public RPC finalized-requested logs + same-provider finalized HTTP',startedAt:this.startedAt,endedAt:this.endedAt,lastReceivedAt:this.lastReceivedAt,
   counts:this.startedAt?{frames:this.frames,streamBytes:this.bytes,rpcReads:this.rpcReads,rpcBytes:this.rpcBytes,candidates:this.rows.length,finalizedRpcCorroborated:this.finalized,independentlyFinalized:0,rejected:this.rejected,duplicates:this.duplicates,ignored:this.ignored}:null,
   scopeHash:SCOPE_HASH,limits:SCOPE,gaps:this.gaps,rpcOwnerClockRoundTripMs:this.rpcRoundTripMs,coverage:'PARTIAL_NO_BACKFILL_NO_COMPLETE_TOKEN_TRADE_FEED',prices:null,marketCap:null,liquidity:null,pnl:null,
   rows:this.rows.map(r=>({...r,freshness:utc(at)<utc(r.checkedAt??r.firstReceivedAt)?'CLOCK_INCONSISTENT':utc(at)-utc(r.eventUtc??r.checkedAt??r.firstReceivedAt)>60000000n?'STALE':'RECENT_RECEIPT_NOT_A_LIVE_PRICE',sourceClockVerified:false,observedAgeSeconds:utc(at)>=utc(r.firstReceivedAt)?Number((utc(at)-utc(r.firstReceivedAt))/1000000n):null,sourceClockLagMs:r.eventUtc&&utc(r.firstReceivedAt)>=utc(r.eventUtc)?Number((utc(r.firstReceivedAt)-utc(r.eventUtc))/1000n):null,
    activity1m:window(r,at,60),activity5m:window(r,at,300)}))};
 }
}
function clock(e:Event,checkedAt:string){const n=BigInt(e.fields.timestamp as string);if(n<0n||n>253402300799n)throw Error('event_clock');const at=new Date(Number(n*1000n)).toISOString();if(utc(at)>utc(checkedAt))throw Error('future_source_clock');return at;}
function window(row:Row,at:string,seconds:number){const points=row.sampledTrades.filter(t=>utc(t.eventUtc)<=utc(at)&&utc(at)-utc(t.eventUtc)<BigInt(seconds)*1000000n);return {state:'UNKNOWN_INCOMPLETE_COVERAGE',volume:null,buyCount:null,sellCount:null,sampledTradeCount:points.length,sampledQuoteAtomicSum:points.length?points.reduce((s,p)=>s+BigInt(p.quoteAtomic),0n).toString():null,quoteMint:row.quoteMint,quoteDecimals:null};}
