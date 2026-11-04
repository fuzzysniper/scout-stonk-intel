// Synthetic driver/checkpoint TRANSCRIPTS, never PostgreSQL, concurrency or hosted proof.
import {createRequire} from 'node:module';import fs from 'node:fs';
import {policy as oldPolicy} from '../native-pilot/fixtures.mjs';
export const load=f=>createRequire(import.meta.url)(process.env.REMOTE_BUILD+'/lib/native-pilot/postgres/'+f+'.js');
export const p=()=>oldPolicy();
export const {canonical,seed,postgresProtocol}=load('protocol');
export const {hash}=createRequire(import.meta.url)(process.env.REMOTE_BUILD+'/lib/native-pilot/plan.js');
export const H=hash('SYNTHETIC REQUEST'),R=hash('SYNTHETIC RESPONSE');
export function transcript(){
 const policy=p(),initial=seed(policy);let state=structuredClone(initial.state),current={...initial.checkpoint,recordHash:hash('SYNTHETIC CHECKPOINT RECORD')},head=current.head;
 const calls=[];let clock=policy.startsAt;
 const f={policy,calls,get clock(){return clock;},set clock(v){clock=v;},get state(){return state;},get current(){return current;},
 anchor:{async current(){calls.push('checkpoint.read');return structuredClone(current);},async advance(expected,next){calls.push('checkpoint.advance');if(JSON.stringify(expected)!==JSON.stringify(current))throw Error('SYNTHETIC CAS LOSS');current={...next,recordHash:hash(canonical(next))};return structuredClone(current);}},
 async tx(op,input){
  calls.push('db.'+op);if(op!=='stop'&&(input.anchorSeq!==String(state.seq)||input.anchorHead!==head))throw Error('SYNTHETIC STALE ANCHOR');
  if(op==='reserve'){state={...state,seq:state.seq+1,attempts:state.attempts+1,credits:state.credits+1,lease:{fence:state.attempts+1,method:input.method,requestHash:input.requestHash,at:clock},lastClock:clock};}
  if(op==='finish'){state={...state,seq:state.seq+1,completed:state.completed+1,receipts:[...state.receipts,input.responseHash],lease:null,lastClock:clock};}
  if(op==='stop'&&!state.stopped)state={...state,seq:state.seq+1,stopped:true,lastClock:clock};
  const status=op==='inspect'?'held':op==='stop'?'stopped':'committed',stateHash=hash(canonical(state));if(op!=='inspect')head=hash(head+':'+state.seq+':'+op+':'+stateHash);
  return {status,operation:op,state:structuredClone(state),head,stateHash};
 }};f.ledger=()=>postgresProtocol(policy,(...a)=>f.tx(...a),f.anchor,()=>clock);return f;
}
export function proof(){const pins=JSON.parse(fs.readFileSync('lib/native-pilot/postgres/pins.json'));return {db:'unfarmd_v4_pilot',login:'unfarmd_native_login',direct:true,primary_ok:true,restricted:true,tables_ok:true,owner_ok:true,function_count:4,
 functions:Object.fromEntries(Object.entries(pins.functions).map(([name,sha])=>[name,{sha,owner:'unfarmd_native_owner',definer:['step','stop'].includes(name),config:['search_path=pg_catalog'],execute:['step','stop'].includes(name),public:false}]))};}
