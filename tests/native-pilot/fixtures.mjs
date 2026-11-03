// Entirely invented offline fixtures. NO provider, wallet, owner, session or key observed.
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';
import {fixture,MINT,hash,at} from '../oracle-holders-260/fixtures.mjs';
export {fixture,MINT,hash,at};
const require=createRequire(import.meta.url);export const load=f=>require(process.env.NATIVE_BUILD+'/lib/native-pilot/'+f+'.js');
export const debit=()=>({version:'native-pilot-debit/1',reviewSha256:'b'.repeat(64),getTokenLargestAccounts:1,getMultipleAccounts:1,getBlockTime:1});
export const policy=()=>({version:'native-pilot-policy/1',id:'synthetic-one-mint',ownerSubject:'11111111-1111-4111-8111-111111111111',issuer:'SYNTHETIC_ISSUER',origin:'https://scout-stonk-intel-fixture-riskledgerapp.vercel.app',deployment:'dpl_SYNTHETICFIXTURE',project:'prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q',commit:'1'.repeat(40),tree:'2'.repeat(40),branch:'native-pilot/offline-fixture',startsAt:Date.parse(at(0)),expiresAt:Date.parse(at(0))+900000,mint:MINT,debit:debit(),credits:3,rightsReviewSha256:'c'.repeat(64),keySha256:'d'.repeat(64),retention:'raw_memory_60s_metadata_immutable'});
export async function setup(p=policy()){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'native-pilot-fixture-')),directory=path.join(root,'ledger'),anchorDirectory=path.join(root,'independent-anchor');
 await fs.mkdir(directory,{mode:0o700});await fs.mkdir(anchorDirectory,{mode:0o700});
 const {initialState,bootstrap,openLedger}=load('ledger'),state=initialState(p),boot=bootstrap(p),previous='0'.repeat(64);
 const record={state,previous,head:hash(JSON.stringify({state,previous}))};
 const file=path.join(directory,'native-pilot.jsonl'),anchor=path.join(anchorDirectory,'beta-anchor.jsonl');
 await fs.writeFile(file,JSON.stringify(record)+'\n',{mode:0o600});await fs.writeFile(anchor,JSON.stringify(boot)+'\n',{mode:0o600});
 const options={directory,anchorDirectory,policy:p,bootstrap:boot};return {root,directory,anchorDirectory,file,anchor,options,ledger:openLedger(options),cleanup:()=>fs.rm(root,{recursive:true,force:true})};
}
export function request(p=policy()){return new Request(p.origin+'/api/native-pilot',{method:'POST',headers:{origin:p.origin,'sec-fetch-site':'same-origin','content-type':'application/json','x-unfarmd-native-intent':'inspect'},body:JSON.stringify({mint:p.mint})});}
/** STUB of A's type boundary only; does not decode or establish evidence. A integration remains HOLD. */
export const stubEvidence=raw=>({version:'native-evidence/1',mint:MINT,evaluatedAt:at(7000),state:'candidate',origin:{status:'candidate_only',providerAuthenticated:false,label:'SYNTHETIC OFFLINE'},controls:null,concentration:null,transfers:null,findings:[],references:raw?[raw.selection,raw.snapshot,raw.clock].map(c=>({providerHost:c.endpointHost,method:JSON.parse(c.requestBody).method,requestSha256:hash(c.requestBody),responseSha256:hash(c.responseBytes),requestStartedAt:c.requestStartedAt,receivedAt:c.receivedAt})):[],coverage:{fullHolderCoverage:false}});
export function ports(f,p=policy()){
 const captures=fixture(20);let now=p.startsAt,calls=0;const input=[];
 return {get now(){return now;},set now(v){now=v;},get calls(){return calls;},input,
  ledger:f.ledger,authorize:async()=>true,identity:()=>true,clock:()=>now,wait:async ms=>{now+=ms;},intake:raw=>{input.push(raw);return {mint:MINT,evaluatedAt:raw.evaluatedAt};},analyze:()=>stubEvidence(input.at(-1)),
  wire:async body=>{const c=[captures.selection,captures.snapshot,captures.clock][calls++];const start=now;now+=100;
   return {...c,endpointHost:'mainnet.helius-rpc.com',requestBody:body,responseBytes:Buffer.from(c.responseBytes),requestStartedAt:new Date(start).toISOString(),receivedAt:new Date(now).toISOString()};}};
}
