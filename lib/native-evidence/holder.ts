import 'server-only';
import {decodeHolderCapture,inspectHolderEvidence} from '../v4-oracle/holders/decode';
import {accountBytes,hash} from '../v4-oracle/holders/accounts';
import {decodeMintBytes} from '../v4-oracle/onchain/bytes';
import {numericJson} from '../v4-ca-intelligence/decimal';
import {data} from '../v4-helius-pilot/server/profile';
import {freeze} from '../onchain-mint/validation';
import type {HolderCapture,HolderEvidence,RpcCapture} from '../v4-oracle/holders/contract';
import type {Controls} from './contract';
const mintControls=new WeakMap<HolderEvidence,Controls>();
export const inspectBatchMint=(cap:unknown):Controls|null=>cap&&typeof cap==='object'?mintControls.get(cap as HolderEvidence)??null:null;
function copy(r:RpcCapture):RpcCapture{
 if(!data(r,['endpointHost','requestBody','responseBytes','httpStatus','requestStartedAt','receivedAt'])||!(r.responseBytes instanceof Uint8Array)||r.responseBytes.length>131072)throw Error('invalid_capture');
 return {...r,responseBytes:Buffer.from(r.responseBytes)};
}
/** Delegate ALL receipt/identity/slot/byte qualification to original #262.
 * Retain controls from its ALREADY-VALIDATED same-batch mint using the SAME pure binary readers.
 * This avoids a fourth RPC read. Never reinterpret a rejected capture or widen supported hosts.
 */
export function qualifyHolderCapture(input:unknown):HolderEvidence{
 try{
  if(!data(input,['kind','network','mint','evaluatedAt','rights','selection','snapshot','clock'])||!data(input.rights,['analysis','reviewSha256']))return decodeHolderCapture(null);
  const i=input as HolderCapture,c={...i,rights:{...i.rights},selection:copy(i.selection),snapshot:copy(i.snapshot),clock:copy(i.clock)};
  const cap=decodeHolderCapture(c),s=inspectHolderEvidence(cap)?.sample;
  if(s){
   const p=numericJson(new TextDecoder('utf-8',{fatal:true}).decode(c.snapshot.responseBytes));
   const value=(p.value as {result:{value:unknown[]}}).result.value[0],lexeme=(p.lexemes as {result:{value:unknown[]}}).result.value[0];
   const m=accountBytes(value,lexeme);if(hash(m.bytes)!==s.mintAccountDataSha256)throw Error('mint_binding');
   mintControls.set(cap,freeze(decodeMintBytes(m.bytes,m.program)));
  }
  return cap;
 }catch{return decodeHolderCapture(null);}
}
