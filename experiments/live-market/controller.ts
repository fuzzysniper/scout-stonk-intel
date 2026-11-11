import {Engine,type Row} from './engine';
import {SCOPE,subscribe,utc} from './policy';
export type Ports={now:()=>string;later:(ms:number,fn:()=>void)=>()=>void;open:(handlers:{open:()=>void;data:(s:string)=>void;error:()=>void;close:()=>void},signal:AbortSignal)=>{send:(s:string)=>void;close:()=>void};read:(body:string,signal:AbortSignal)=>Promise<string>};
/** Explicit capabilities only: imports do not open sockets, timers or providers. */
export function startPilot(engine:Engine,ports:Ports,expiresAt?:string){
 const remaining=expiresAt?Number((utc(expiresAt)-utc(ports.now()))/1000n):SCOPE.seconds*1000;
 if(remaining<=0)throw Error('approval_expired');
 const abort=new AbortController();let socket:ReturnType<Ports['open']>|null=null,stopped=false,queue=Promise.resolve();
 const stop=(reason:string)=>{if(stopped)return;stopped=true;abort.abort();socket?.close();cancel();try{engine.stop(reason,ports.now());}catch{engine.phase='STOPPED';engine.reason='LOCAL_EVIDENCE_WRITE_FAILURE';}};
 engine.start(ports.now());const cancel=ports.later(Math.min(remaining,SCOPE.seconds*1000),()=>stop('DURATION_OR_APPROVAL_CAP'));
 async function once(body:string){
  if(expiresAt&&utc(ports.now())>=utc(expiresAt))stop('APPROVAL_EXPIRED');
  if(stopped)throw Error('stopped');engine.reserve(body,ports.now());const response=await ports.read(body,abort.signal);
  if(stopped)throw Error('stopped');engine.capture(body,response,ports.now());return response;
 }
 async function verify(row:Row){
  if(stopped)return;
  try{
   const tx=await once(JSON.stringify({jsonrpc:'2.0',id:10,method:'getTransaction',params:[row.signature,{encoding:'json',commitment:'finalized',maxSupportedTransactionVersion:0}]}));
   const status=await once(JSON.stringify({jsonrpc:'2.0',id:11,method:'getSignatureStatuses',params:[[row.signature],{searchTransactionHistory:true}]}));
   if(!stopped)engine.verify(row,tx,status,ports.now());
  }catch{if(!stopped){row.reason='WAIT_RPC_FAILED_OR_BUDGET_EXHAUSTED';engine.rejected++;stop('RPC_FAILURE_NO_RETRY');}}
 }
 try{socket=ports.open({
  open:()=>{if(!stopped)socket?.send(subscribe());},
  data:raw=>{if(stopped)return;try{const row=engine.notice(raw,ports.now());if(row){if(engine.select())queue=queue.then(()=>verify(row));else row.reason='WAIT_VERIFICATION_BUDGET_NOT_SELECTED';}}catch{stop('STREAM_INVALID_GAPPED_OR_CAP_REACHED');}},
  error:()=>stop('STREAM_ERROR_NO_RECONNECT'),close:()=>stop('STREAM_DISCONNECTED_NO_RECONNECT'),
 },abort.signal);}catch{stop('CONNECTION_FAILED_NO_RETRY');}
 return {stop,signal:abort.signal,settled:()=>queue};
}
