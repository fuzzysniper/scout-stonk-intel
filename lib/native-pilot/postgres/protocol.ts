import 'server-only';
import {canonical} from '../../../experiments/jupiter-beta-approval/integration/json.mjs';
import {freeze} from '../../onchain-mint/validation';
import {data} from '../../v4-helius-pilot/server/profile';
import {initialState,type State,type Ledger} from '../ledger';
import {hash,need,digest,policy,type Policy,type Method,METHODS} from '../plan';
export {canonical};
export type Checkpoint=Readonly<{policyHash:string;seq:string;head:string;stateHash:string;recordHash:string}>;
export type Checkpoints=Readonly<{current:()=>Promise<Checkpoint>;advance:(expected:Checkpoint,next:Checkpoint)=>Promise<Checkpoint>}>;
export function seed(p:Policy){const state=initialState(policy(p));return freeze({recordText:JSON.stringify(p),state,checkpoint:{policyHash:state.policyHash,seq:'0',head:'0'.repeat(64),stateHash:hash(canonical(state))}});}
export function checkpoint(x:unknown,binding:string):Checkpoint{
 need(data(x,['policyHash','seq','head','stateHash','recordHash']));const c=x as Checkpoint;
 need(c.policyHash===binding&&/^[0-8]$/.test(c.seq)&&/^[a-f0-9]{64}$/.test(c.head)&&digest(c.stateHash)&&digest(c.recordHash));return freeze({...c});
}
export function state(x:unknown,p:Policy):State{
 need(data(x,['seq','policyHash','stopped','attempts','credits','lastClock','lease','completed','receipts']));const s=x as State;
 need(s.policyHash===seed(p).checkpoint.policyHash&&Number.isInteger(s.seq)&&s.seq>=0&&s.seq<=8&&typeof s.stopped==='boolean'
  &&Number.isInteger(s.attempts)&&s.attempts>=0&&s.attempts<=3&&Number.isInteger(s.credits)&&s.credits>=0&&s.credits<=p.credits
  &&Number.isSafeInteger(s.lastClock)&&s.lastClock>=p.startsAt&&Number.isInteger(s.completed)&&s.completed>=0&&s.completed<=s.attempts
  &&Array.isArray(s.receipts)&&s.receipts.length===s.completed&&s.receipts.every(digest));
 if(s.lease){need(data(s.lease,['fence','method','requestHash','at'])&&s.lease.fence===s.attempts&&METHODS.includes(s.lease.method)&&digest(s.lease.requestHash)&&Number.isSafeInteger(s.lease.at)&&s.lease.at<=s.lastClock);}
 return freeze(JSON.parse(canonical(s))) as State;
}
type Reply=Readonly<{status:'held'|'committed'|'stopped';operation:string;state:State;head:string;stateHash:string}>;
export type Transaction=(op:string,input:Readonly<Record<string,unknown>>)=>Promise<unknown>;
/** Protocol boundary, NOT a DB simulator or authenticated-storage capability.
 * Transcript ports test ordering only. Real assembly supplies native-pg transaction and remote checkpoint. */
export function postgresProtocol(pInput:Policy,tx:Transaction,anchor:Checkpoints,now=Date.now):Ledger{
 const p=policy(pInput),binding=seed(p).checkpoint.policyHash;let failed=false;
 async function run(op:string,input:Record<string,unknown>={}){
  if(failed&&op!=='stop')throw Error('native_pilot_held');let previous:Checkpoint|undefined;
  try{
   try{previous=checkpoint(await anchor.current(),binding);}catch{if(op!=='stop')throw Error('native_pilot_held');}
   // All operands frozen before the first driver await; no mutable driver receipt or callback authorizes success.
   const command=freeze({at:now(),...input,anchorSeq:previous?.seq,anchorHead:previous?.head,anchorStateHash:previous?.stateHash});
   const raw=await tx(op,command);need(data(raw,['status','operation','state','head','stateHash']));
   const r=freeze(JSON.parse(canonical(raw))) as Reply,s=state(r.state,p);
   need(['held','committed','stopped'].includes(r.status)&&/^[a-f0-9]{64}$/.test(r.head)&&r.stateHash===hash(canonical(s)));
   const stopped=r.operation==='stop'&&r.status==='stopped'&&s.stopped;
   need(stopped||r.operation===op&&r.status!=='stopped');need(!s.stopped||r.status!=='committed');
   if(r.status==='committed'){
    need(op==='reserve'||op==='finish');
    if(op==='reserve')need(s.lease&&s.lease.method===input.method&&s.lease.requestHash===input.requestHash);
    if(op==='finish')need(s.lease===null&&s.completed===input.fence&&s.receipts.at(-1)===input.responseHash);
   }
   if(op==='stop')need(stopped);
   // STOP may have committed without witness availability. UNKNOWN is not ACK or a successful reservation.
   need(previous);
   const changed=s.seq!==Number(previous.seq);
   if(changed){
    need(s.seq===Number(previous.seq)+1);
    need(r.head===hash(previous.head+':'+s.seq+':'+r.operation+':'+r.stateHash));
    const next=freeze({policyHash:binding,seq:String(s.seq),head:r.head,stateHash:r.stateHash,recordHash:previous.recordHash});
    const ack=checkpoint(await anchor.advance(previous,next),binding);need(ack.seq===next.seq&&ack.head===next.head&&ack.stateHash===next.stateHash);
   }else need(r.head===previous.head&&r.stateHash===previous.stateHash&&r.status!=='committed');
   if(s.stopped)failed=true;
   return freeze({status:r.status,state:s});
  }catch{failed=true;throw Error('native_pilot_held');}
 }
 return Object.freeze({async inspect(){return (await run('inspect')).state;},
  reserve(method:Method,requestHash:string,at:number){need(METHODS.includes(method)&&digest(requestHash)&&Number.isSafeInteger(at));return run('reserve',{method,requestHash,at});},
  finish(fence:number,responseHash:string,at:number){need(Number.isInteger(fence)&&fence>=1&&fence<=3&&digest(responseHash)&&Number.isSafeInteger(at));return run('finish',{fence,responseHash,at});},
  stop(at:number){return run('stop',{at});}
 });
}
