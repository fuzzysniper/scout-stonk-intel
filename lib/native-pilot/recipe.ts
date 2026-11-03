import 'server-only';
import {numericJson,integer} from '../v4-ca-intelligence/decimal';
import {data} from '../v4-helius-pilot/server/profile';
import {isExactPublicKey} from '../onchain-mint/validation';
import {accountsRequest,clockRequest} from '../v4-oracle/holders/requests';
import {need,LIMITS} from './plan';
/** Only choose the next fixed request. Full account/extension/evidence validation belongs to A. */
export function nextRequest(body:Uint8Array,stage:0|1,mint:string,selected?:readonly string[],selectionSlot?:number){
 need(body.length>0&&body.length<=LIMITS.responseBytes);
 const p=numericJson(new TextDecoder('utf-8',{fatal:true}).decode(body));
 need(data(p.value,['jsonrpc','id','result'])&&data(p.lexemes,['jsonrpc','id','result']));
 const r=p.value as Record<string,unknown>,l=p.lexemes as Record<string,unknown>;
 need(r.jsonrpc==='2.0'&&r.id===260001+stage&&l.id===String(260001+stage)&&data(r.result,['context','value'])&&data(l.result,['context','value']));
 const result=r.result as Record<string,unknown>,lex=l.result as Record<string,unknown>;
 need(data(result.context,['slot'],['apiVersion'])&&data(lex.context,['slot'],['apiVersion']));
 const slot=(result.context as {slot:number}).slot;
 need(Number.isSafeInteger(slot)&&slot>0&&integer((lex.context as {slot:unknown}).slot)===String(slot)&&Array.isArray(result.value));
 if(stage===0){
  const addresses:string[]=[];let last=18446744073709551615n;let decimals:number|undefined;
  for(const item of result.value){
   need(data(item,['address','amount','decimals'],['uiAmount','uiAmountString']));const v=item as {address:string;amount:string;decimals:number};
   need(isExactPublicKey(v.address)&&v.address!==mint&&!addresses.includes(v.address)&&typeof v.amount==='string'&&/^(0|[1-9][0-9]{0,19})$/.test(v.amount)&&BigInt(v.amount)<=last
    &&Number.isInteger(v.decimals)&&v.decimals>=0&&v.decimals<=255&&(decimals===undefined||decimals===v.decimals));
   last=BigInt(v.amount);decimals=v.decimals;addresses.push(v.address);
  }
  need(addresses.length<=20);return {body:accountsRequest(mint,addresses,slot),addresses,slot};
 }
 need(selected&&selectionSlot&&slot>=selectionSlot&&slot-selectionSlot<=128&&result.value.length===selected.length+1&&result.value.every(v=>v!==null));
 return {body:clockRequest(slot),addresses:[...selected],slot};
}
