import {record,array,integer,transactionEvents,PROGRAM,ZERO,USDC} from '../launch-intel/decode';
import {bytes58,hash} from '../launch-intel/identity';
import {strictJson} from '../consumer-mvp/evidence/strict-json';
import {millis,SCOPE} from './policy';

export type Creation={version:'scout-creation/1';signature:string;slot:number;receivedAt:string;
  finality:'provisional'|'finalized';verification:'notification_only'|'rpc_reported_finalized_same_provider';
  mint:string|null;quoteMint:string|null;curve:string|null;tokenProgram:string|null;
  eventAt:string|null;blockTime:string|null;checkedAt:string|null;finalizedContextSlot:number|null;sourceClockVerified:false;
  notificationHash:string;identityHash:string;transactionHash:string|null;statusHash:string|null;reason:string};
export type Notice={kind:'ack';subscription:number}|{kind:'ignored'}|{kind:'creation';row:Creation};
export function notice(raw:string,receivedAt:string,subscription:number|null):Notice {
  millis(receivedAt);if(Buffer.byteLength(raw)>SCOPE.maxFrameBytes)throw Error('FRAME_CAP');
  const b=record(strictJson(raw));if(b.jsonrpc!=='2.0'||b.error!==undefined)throw Error('SOURCE_RPC_ERROR');
  if(b.id===1){if(subscription!==null)throw Error('DUPLICATE_ACK');return {kind:'ack',subscription:integer(b.result)};}
  const p=record(b.params);if(b.method!=='logsNotification'||subscription===null||p.subscription!==subscription)throw Error('UNBOUND_NOTIFICATION');
  const r=record(p.result),v=record(r.value),slot=integer(record(r.context).slot);
  bytes58(v.signature,64);const logs=array(v.logs);if(logs.some(l=>typeof l!=='string'||l.length>8192))throw Error('INVALID_LOGS');
  if(v.err!==null)return {kind:'ignored'};
  const stack:string[]=[];let creation=false;
  for(const rawLine of logs){const line=rawLine as string,inv=/^Program ([1-9A-HJ-NP-Za-km-z]+) invoke \[(\d+)\]$/.exec(line);
    if(inv){if(Number(inv[2])!==stack.length+1)throw Error('LOG_STACK');stack.push(inv[1]);continue;}
    if(/^Program \S+ (?:success|failed:.*)$/.test(line)){if(stack.pop()!==line.split(' ')[1])throw Error('LOG_STACK');continue;}
    if(stack.length===1&&stack[0]===PROGRAM&&['Program log: Instruction: Create','Program log: Instruction: CreateV2'].includes(line))creation=true;
  }
  if(stack.length)throw Error('TRUNCATED_LOGS');if(!creation)return {kind:'ignored'};
  return {kind:'creation',row:{version:'scout-creation/1',signature:v.signature as string,slot,receivedAt,
    finality:'provisional',verification:'notification_only',mint:null,quoteMint:null,curve:null,tokenProgram:null,
    eventAt:null,blockTime:null,checkedAt:null,finalizedContextSlot:null,sourceClockVerified:false,
    notificationHash:hash(raw),identityHash:hash(JSON.stringify({slot,signature:v.signature,err:v.err,logs})),transactionHash:null,statusHash:null,
    reason:'WAIT_ORIGINAL_FINALIZED_TRANSACTION'}};
}
export function corroborate(row:Creation,txRaw:string,statusRaw:string,checkedAt:string):Creation {
  const tx=record(strictJson(txRaw)),status=record(strictJson(statusRaw));
  if(tx.jsonrpc!=='2.0'||tx.id!==10||status.jsonrpc!=='2.0'||status.id!==11||tx.error!==undefined||status.error!==undefined)throw Error('RPC_ENVELOPE');
  const decoded=transactionEvents(tx.result,row.signature),r=record(status.result),values=array(r.value);
  if(values.length!==1)throw Error('STATUS_SCOPE');const s=record(values[0]),ctx=integer(record(r.context).slot);
  if(decoded.slot!==row.slot||s.slot!==row.slot||ctx<row.slot||s.err!==null||s.confirmationStatus!=='finalized'||s.confirmations!==null)throw Error('FINALITY_MISMATCH');
  const creations=decoded.events.filter(e=>e.kind==='CreateEvent');if(creations.length!==1)throw Error('CREATION_COUNT');
  const f=creations[0].fields;if(decoded.events.some(e=>e.fields.mint!==f.mint))throw Error('MULTI_MINT');
  if(![ZERO,USDC].includes(f.quote_mint as string))throw Error('QUOTE_NOT_REVIEWED');
  const seconds=BigInt(f.timestamp as string);if(seconds<0n||seconds>253402300799n)throw Error('EVENT_CLOCK');
  const eventAt=new Date(Number(seconds*1000n)).toISOString(),lag=millis(row.receivedAt)-millis(eventAt);
  if(lag<0||lag>SCOPE.maxSourceAgeMs||millis(checkedAt)<millis(row.receivedAt))throw Error('SOURCE_FRESHNESS_WITHHELD');
  const blockTime=decoded.blockTime===null?null:new Date(decoded.blockTime*1000).toISOString();
  if(blockTime!==null&&(millis(blockTime)>millis(row.receivedAt)||millis(row.receivedAt)-millis(blockTime)>SCOPE.maxSourceAgeMs))throw Error('BLOCK_CLOCK_WITHHELD');
  return {...row,finality:'finalized',verification:'rpc_reported_finalized_same_provider',mint:f.mint as string,
    quoteMint:f.quote_mint as string,curve:f.bonding_curve as string,tokenProgram:f.token_program as string,
    eventAt,blockTime,checkedAt,finalizedContextSlot:ctx,transactionHash:hash(txRaw),statusHash:hash(statusRaw),
    reason:'CREATION_IDENTITY_ONLY_NO_SAFETY_OR_MARKET_CLAIM'};
}
