// A-owned local capability seam. B owns lib/live-ledger/** and the canonical DB/API contract.
// The integration wrapper must implement these semantics, not an in-memory production substitute.
import type {Approval} from './policy';
import type {Creation} from './creation';
export type LeaseState={runId:string;head:string;scopeHash:string;leaseId:string;fence:string;
  serverNowMs:number;leaseUntilMs:number;sessionUntilMs:number;stop:boolean};
export type Health={state:string;reason:string;frames:number;bytes:number;ignored:number;duplicates:number;
  provisional:number;finalized:number;withheld:number;rpcAttempts:number;rpcBytes:number;connections:number;
  lastFrameAt:string|null;lastPongAt:string|null;lastRpcRoundTripMs:number|null};
type Identity={runId:string;scopeHash:string;leaseId:string;fence:string};
export type StoreCommand={op:'claim';approval:Approval}|(Identity&(
  {op:'reserve';kind:'connection'|'rpc';requestId:string}|
  {op:'append';record:Creation}|{op:'heartbeat';health:Health}|
  {op:'gap';at:string;reason:string;boundary:'begin'|'end'}|{op:'stop';at:string;reason:string}|{op:'connectionClosed';at:string}|{op:'release';at:string}));
export type StoreReply={ok:false;reason:string}|{ok:true;state:LeaseState;ticketId?:string;inserted?:boolean;committedCounters?:{frames:number;bytes:number}};
export type Store={transact:(command:StoreCommand,options:{signal:AbortSignal})=>Promise<StoreReply>;close:()=>Promise<void>};
export type SourceConnection={closed:Promise<void>;close:()=>void};
export type Source={open:(handlers:{open:()=>void;frame:(raw:string)=>void;pong:()=>void;
  close:(reason:string)=>void;fatal:(reason:string)=>void},signal:AbortSignal,allowed:()=>boolean)=>SourceConnection;
  read:(body:string,signal:AbortSignal,allowed:()=>boolean)=>Promise<string>};
export type Clock={now:()=>number;mono:()=>number;sleep:(ms:number,signal:AbortSignal)=>Promise<void>};
