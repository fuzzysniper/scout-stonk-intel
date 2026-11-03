import 'server-only';
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {freeze} from '../onchain-mint/validation';
import {data} from '../v4-helius-pilot/server/profile';
import {hash,need,policy as validatePolicy,METHODS,LIMITS,type Policy,type Method} from './plan';
// Reuse the reviewed independent fsync anchor, NOT its Jupiter policy/SQL/signing lane.
import {fileAnchor} from '../../experiments/jupiter-beta-approval/integration/durable/anchor.mjs';
type Lease=Readonly<{fence:number;method:Method;requestHash:string;at:number}>;
export type State=Readonly<{seq:number;policyHash:string;stopped:boolean;attempts:number;credits:number;lastClock:number;lease:Lease|null;completed:number;receipts:readonly string[]}>;
type Record=Readonly<{state:State;previous:string;head:string}>;
export type AnchorBootstrap=Readonly<{seq:'0';head:string;policyHash:string;stateHash:string}>;
const ZERO='0'.repeat(64),serialize=JSON.stringify;
export function initialState(p:Policy):State{return freeze({seq:0,policyHash:hash(serialize(validatePolicy(p))),stopped:false,attempts:0,credits:0,lastClock:p.startsAt,lease:null,completed:0,receipts:[]});}
export function bootstrap(p:Policy):AnchorBootstrap{const s=initialState(p);return freeze({seq:'0',head:ZERO,policyHash:s.policyHash,stateHash:hash(serialize(s))});}
/** NO creation/repair/reseed. Files + trusted seq0 bootstrap must be provisioned separately.
 * One fsynced journal + an independently retained current anchor. Neither belongs in Vercel /tmp.
 * Lock survives ambiguous writes; never auto-remove/reclaim it after crash or expiry. */
export function openLedger(input:{directory:string;anchorDirectory:string;policy:Policy;bootstrap:AnchorBootstrap}){
 const p=validatePolicy(input.policy),expectedBootstrap=bootstrap(p),directory=input.directory;
 need(path.isAbsolute(directory)&&path.isAbsolute(input.anchorDirectory)&&directory!==input.anchorDirectory);
 need(serialize(input.bootstrap)===serialize(expectedBootstrap));
 const anchor=fileAnchor({directory:input.anchorDirectory,bootstrap:expectedBootstrap});
 const file=path.join(directory,'native-pilot.jsonl'),lock=path.join(directory,'native-pilot.lock');
 async function read(){
  for(const d of [directory,input.anchorDirectory]){const st=await fs.lstat(d);need(st.isDirectory()&&!st.isSymbolicLink()&&(st.mode&0o077)===0);need(await fs.realpath(d)===d);}
  const h=await fs.open(file,constants.O_RDONLY|constants.O_NOFOLLOW);let text:string;
  try{const st=await h.stat();need(st.isFile()&&(st.mode&0o077)===0&&st.size>0&&st.size<=131072);text=await h.readFile('utf8');}finally{await h.close();}
  need(text.endsWith('\n'));const lines=text.trimEnd().split('\n');need(lines.length>=1&&lines.length<=10);
  let previous=ZERO,last:Record|undefined;
  for(let i=0;i<lines.length;i++){
   const r=JSON.parse(lines[i]) as Record;need(data(r,['state','previous','head'])&&serialize(r)===lines[i]);
   const s=r.state;need(data(s,['seq','policyHash','stopped','attempts','credits','lastClock','lease','completed','receipts']));
   need(s.seq===i&&s.policyHash===expectedBootstrap.policyHash&&r.previous===previous&&r.head===hash(serialize({state:s,previous})));
   if(i===0)need(serialize(s)===serialize(initialState(p)));else{
    const old=last!.state;need(Number.isSafeInteger(s.lastClock)&&s.lastClock>=old.lastClock&&typeof s.stopped==='boolean'&&(!old.stopped||s.stopped));
    need(s.attempts>=old.attempts&&s.attempts<=3&&s.credits>=old.credits&&s.credits<=p.credits&&s.completed>=old.completed&&s.completed<=s.attempts);
    need(Array.isArray(s.receipts)&&s.receipts.length===s.completed&&s.receipts.every(x=>/^[a-f0-9]{64}$/.test(x))&&serialize(s.receipts.slice(0,old.receipts.length))===serialize(old.receipts));
    if(s.lease)need(data(s.lease,['fence','method','requestHash','at'])&&s.lease.fence===s.attempts&&METHODS.includes(s.lease.method)&&/^[a-f0-9]{64}$/.test(s.lease.requestHash)&&Number.isSafeInteger(s.lease.at));
   }previous=r.head;last=r;
  }
  const a=await anchor.current(),r=last!;
  // Independent currentness, not counter maxima or self-consistent old snapshots.
  need(a.seq===String(r.state.seq)&&a.head===(r.state.seq===0?ZERO:r.head)&&a.stateHash===hash(serialize(r.state)));
  return {record:r,anchor:a};
 }
 async function change(fn:(s:State)=>State){
  const l=await fs.open(lock,'wx',0o600);let success=false;
  try{
   await l.sync();const current=await read(),old=current.record,changed=fn(freeze(old.state));
   if(changed===old.state){success=true;return freeze({status:'held' as const,state:old.state});}
   const s=freeze({...changed,seq:old.state.seq+1}),r={state:s,previous:old.head,head:hash(serialize({state:s,previous:old.head}))};
   const out=await fs.open(file,constants.O_WRONLY|constants.O_APPEND|constants.O_NOFOLLOW);
   try{await out.writeFile(serialize(r)+'\n');await out.sync();}finally{await out.close();}
   const d=await fs.open(directory,'r');try{await d.sync();}finally{await d.close();}
   await anchor.advance(current.anchor,{seq:String(s.seq),head:r.head,stateHash:hash(serialize(s))});
   success=true;return freeze({status:s.stopped?'stopped' as const:'committed' as const,state:s});
  }catch{throw Error('native_pilot_held');}finally{await l.close();if(success)await fs.unlink(lock);}
 }
 const stop=(at:number)=>change(s=>s.stopped?s:({...s,stopped:true,lastClock:Math.max(s.lastClock,Number.isSafeInteger(at)?at:s.lastClock)}));
 return Object.freeze({
  async inspect(){try{await fs.lstat(lock);throw Error('native_pilot_held');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw Error('native_pilot_held');}return freeze((await read()).record.state);},stop,
  async reserve(method:Method,requestHash:string,at:number){
   need(METHODS.includes(method)&&/^[a-f0-9]{64}$/.test(requestHash));
   return change(s=>{
    if(s.stopped)return s;
    if(!Number.isSafeInteger(at)||at<s.lastClock||at<p.startsAt||at>=p.expiresAt||s.lease)return {...s,stopped:true,lastClock:Math.max(s.lastClock,Number.isSafeInteger(at)?at:s.lastClock)};
    if(s.stopped||s.attempts>=LIMITS.attempts||method!==METHODS[s.completed]||s.attempts!==s.completed||s.credits+p.debit[method]>p.credits)return s;
    if(s.attempts>0&&at-s.lastClock<LIMITS.spacingMs)return s;
    return {...s,lastClock:at,attempts:s.attempts+1,credits:s.credits+p.debit[method],lease:{fence:s.attempts+1,method,requestHash,at}};
   });
  },
  async finish(fence:number,responseHash:string,at:number){
   need(/^[a-f0-9]{64}$/.test(responseHash));return change(s=>{
    if(s.stopped)return s;
    if(!s.lease||s.lease.fence!==fence||!Number.isSafeInteger(at)||at<s.lastClock||at>=p.expiresAt||at-s.lease.at>LIMITS.timeoutMs)return {...s,stopped:true,lastClock:Math.max(s.lastClock,Number.isSafeInteger(at)?at:s.lastClock)};
    return {...s,lease:null,completed:s.completed+1,receipts:[...s.receipts,responseHash],lastClock:at};
   });
  }
 });
}
export type Ledger=ReturnType<typeof openLedger>;
