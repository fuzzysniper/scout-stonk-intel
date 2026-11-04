// ALL bytes/owner/identity/wire/billing here are LOCAL/SYNTHETIC. Actual original B fsync state machine, NOT RPC/SQL.
import {createRequire} from 'node:module';
import {setup,policy,ports,request} from '../native-pilot/fixtures.mjs';
export {setup,policy,ports,request};
export {fixture,mutateResponse,mutateAccount,mintBytes,account,token2022,bytes,key,MINT,SPL,T22,hash,at} from '../oracle-holders-260/fixtures.mjs';
const require=createRequire(import.meta.url),root=process.env.HELIUS_INTAKE_BUILD;
export const A=require(root+'/lib/native-evidence/index.js');
export const {acquire}=require(root+'/lib/native-pilot/engine.js');
export const {openLedger}=require(root+'/lib/native-pilot/ledger.js');
export const C=require(root+'/app/lens/native-evidence-model.js');
export const cloneRaw=raw=>({...raw,selection:copy(raw.selection),snapshot:copy(raw.snapshot),clock:copy(raw.clock)});
const copy=c=>({...c,responseBytes:Buffer.from(c.responseBytes)});
export async function session({wireMutate,rawMutate,analyze}={}){
 const p=policy(),f=await setup(p),b=ports(f,p),seen=[];let raw=null,intakes=0,analyses=0;
 try{
  const result=await acquire(p,request(p),{...b,clock:()=>b.now,
   wire:async(body,method)=>{const capture=await b.wire(body,method);if(wireMutate)wireMutate(capture,method);seen.push(copy(capture));return capture;},
   intake:value=>{intakes++;raw=cloneRaw(value);if(rawMutate)rawMutate(value);return A.intakeHeliusBatch(value);},
   analyze:input=>{analyses++;const evidence=A.analyzeNativeEvidence(input);return analyze?analyze(evidence):evidence;}});
  return {result,raw,seen,intakes,analyses,calls:b.calls,state:await openLedger(f.options).inspect()};
 }finally{await f.cleanup();}
}
