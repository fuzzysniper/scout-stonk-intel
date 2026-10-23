// INVENTED OFFLINE TEST TRANSACTIONS ONLY. Not a captured observation or runtime feed.
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),dir=process.env.LIVE_STREAM_BUILD;
export const policy=require(path.join(dir,'policy.js'));
export const {Worker}=require(path.join(dir,'worker.js'));
export const {notice,corroborate}=require(path.join(dir,'creation.js'));
export const d=require(path.join(dir,'../launch-intel/decode.js'));
export const {base58,bytes58}=require(path.join(dir,'../launch-intel/identity.js'));
const contract=require(path.join(dir,'../launch-intel/contract.json'));
export const AT='2026-10-22T12:00:10.000Z',MINT=base58(Buffer.alloc(32,7));
export const UUID='11111111-1111-4111-8111-111111111111',FENCE='22222222-2222-4222-8222-222222222222';
export function grant(){return {version:policy.SCOPE.version,head:'a'.repeat(40),runId:UUID,scopeHash:policy.SCOPE_HASH,workerPolicyHash:policy.WORKER_POLICY_HASH,
  renderServiceId:'srv-offlineonly',notBefore:AT,expiresAt:'2026-10-22T13:00:10.000Z',rightsEvidenceHash:'b'.repeat(64),accountEvidenceHash:'c'.repeat(64),
  sourceGo:true,deploymentGo:true,planVerified:true,rightsConfirmed:true,retentionApproved:true,dedicatedDataKey:true,overageDisabled:true,retentionSeconds:3600};}
export function fixture({seed=1,quote=d.ZERO,fields={},instruction='create_v2',hint='CreateV2',finality='finalized'}={}){
  const types=contract.types;
  function defaults(name,type){
    if(typeof type==='object')return [];
    if(type==='pubkey')return ({mint:MINT,bonding_curve:d.curve(MINT),token_program:instruction==='create'?d.TOKEN:d.TOKEN2022,quote_mint:quote})[name]??d.ZERO;
    if(type==='bool')return false;if(type==='string')return 'SYNTHETIC OFFLINE';if(type==='i64')return '1792670400';return '1000000';
  }
  function encode(type,v){
    if(typeof type==='object'){const len=Buffer.alloc(4);len.writeUInt32LE(v.length);return Buffer.concat([len,...v.map(x=>Buffer.concat(types[type.vec.defined.name].map(f=>encode(f.type,x[f.name]))))]);}
    if(type==='pubkey')return bytes58(v,32);if(type==='bool')return Buffer.from([v?1:0]);
    if(type==='string'){const b=Buffer.from(v),len=Buffer.alloc(4);len.writeUInt32LE(b.length);return Buffer.concat([len,b]);}
    if(type==='u8')return Buffer.from([Number(v)%256]);if(type==='u16'){const b=Buffer.alloc(2);b.writeUInt16LE(Number(v));return b;}
    const b=Buffer.alloc(8);if(type==='i64')b.writeBigInt64LE(BigInt(v));else b.writeBigUInt64LE(BigInt(v));return b;
  }
  const event=Buffer.concat([Buffer.from(contract.events.CreateEvent),...types.CreateEvent.map(f=>encode(f.type,fields[f.name]??defaults(f.name,f.type)))]);
  const spec=contract.instructions[instruction],accounts=spec.accounts.map(n=>({mint:MINT,base_mint:MINT,bonding_curve:d.curve(MINT),event_authority:d.eventAuthority,program:d.PROGRAM,token_program:instruction==='create'?d.TOKEN:d.TOKEN2022,base_token_program:d.TOKEN2022})[n]??d.ZERO);
  if(instruction==='create_v2'&&quote!==d.ZERO)accounts.push(quote,d.ZERO,d.TOKEN);
  const keys=[d.PROGRAM,...accounts],signature=base58(Buffer.alloc(64,seed)),slot=100;
  const tx={jsonrpc:'2.0',id:10,result:{slot,blockTime:1792670400,transaction:{signatures:[signature],message:{accountKeys:keys,instructions:[{programIdIndex:0,accounts:accounts.map((_,i)=>i+1),data:base58(Buffer.from(spec.discriminator))}]}},meta:{err:null,innerInstructions:[{index:0,instructions:[{programIdIndex:0,accounts:[keys.indexOf(d.eventAuthority)],stackHeight:2,data:base58(Buffer.concat([d.EVENT_CPI,event]))}]}]}}};
  const status={jsonrpc:'2.0',id:11,result:{context:{slot:101},value:[{slot,err:null,confirmationStatus:finality,confirmations:finality==='finalized'?null:1}]}};
  const notification={jsonrpc:'2.0',method:'logsNotification',params:{subscription:9,result:{context:{slot},value:{signature,err:null,logs:[`Program ${d.PROGRAM} invoke [1]`,`Program log: Instruction: ${hint}`,`Program ${d.PROGRAM} success`]}}}};
  return {signature,slot,tx,status,raw:JSON.stringify(notification),notification};
}
export const ack=JSON.stringify({jsonrpc:'2.0',id:1,result:9});
export function testClock(){
  const start=performance.now();let delta=0,wallDelta=0;
  return {now:()=>Date.parse(AT)+performance.now()-start+delta+wallDelta,mono:()=>performance.now()-start+delta,
    jump:n=>{delta+=n;},wall:n=>{wallDelta+=n;},delays:[],
    sleep(ms,signal){this.delays.push(ms);return new Promise((resolve,reject)=>{
      if(signal.aborted){reject(Error('ABORTED'));return;}const t=setTimeout(done,ms===1000?10:0);
      const onAbort=()=>{clearTimeout(t);signal.removeEventListener('abort',onAbort);reject(Error('ABORTED'));};
      function done(){signal.removeEventListener('abort',onAbort);resolve();}
      signal.addEventListener('abort',onAbort,{once:true});
    });}};
}
export class OfflineStore {
  constructor(clock,approval=grant()){this.clock=clock;this.grant=approval;this.commands=[];this.records=new Map();this.connections=0;this.rpc=0;this.stopped=false;this.leased=false;this.fail=null;this.edit=null;this.after=null;}
  async transact(c){
    this.commands.push(c);if(this.fail)return this.fail(c);let inserted;
    if(c.op==='claim'){if(this.stopped||this.leased)return {ok:false,reason:'STOP_OR_BUSY'};this.leased=true;}
    if(c.op==='reserve'){if(c.kind==='connection')this.connections++;else this.rpc++;if(this.connections>3||this.rpc>40)return {ok:false,reason:'BUDGET'};}
    if(c.op==='append'){const old=this.records.get(c.record.signature);inserted=!old||JSON.stringify(old)!==JSON.stringify(c.record);this.records.set(c.record.signature,c.record);}
    if(c.op==='stop')this.stopped=true;if(c.op==='release')this.leased=false;
    // One logical server instant, like SQL's captured now_at. Sampling twice can
    // invent a >12s lease under preemption and correctly trip the real guard.
    const serverNowMs=Math.floor(this.clock.now());
    const state={runId:this.grant.runId,head:this.grant.head,scopeHash:policy.SCOPE_HASH,leaseId:UUID,fence:FENCE,
      serverNowMs,leaseUntilMs:serverNowMs+12000,
      sessionUntilMs:Date.parse(this.grant.expiresAt),stop:this.stopped};
    const r={ok:true,state,ticketId:`ticket-${this.commands.length}`,inserted};this.edit?.(r,c);this.after?.(c);return r;
  }
  async close(){this.closed=true;}
}
export class OfflineSource {
  constructor(store,onOpen){this.store=store;this.onOpen=onOpen;this.opens=0;this.reads=[];this.fixture=fixture();}
  open(h,signal,allowed){
    if(!allowed()||this.store.connections<=this.opens)throw Error('NO_DURABLE_RESERVATION');this.opens++;
    let done;const closed=new Promise(resolve=>{done=resolve;});let ended=false;
    const close=()=>{if(!ended){ended=true;h.close('SOURCE_DISCONNECTED');done();}};
    signal.addEventListener('abort',close,{once:true});this.h=h;this.closeConnection=close;
    queueMicrotask(()=>{h.open();this.onOpen?.(h,this,close);});return {closed,close};
  }
  async read(body,signal,allowed){
    if(!allowed()||signal.aborted||this.store.rpc<=this.reads.length)throw Error('NO_DURABLE_RPC_RESERVATION');this.reads.push(JSON.parse(body));
    return JSON.stringify(JSON.parse(body).id===10?this.fixture.tx:this.fixture.status);
  }
}
export function stopSoon(worker,reason='OFFLINE_TEST_COMPLETE'){setTimeout(()=>worker.stop(reason),0);}
