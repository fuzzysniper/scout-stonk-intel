// Bounded JSON parser: duplicate keys, unsafe numbers and excessive structure deny.
import {canonical,hash,need,fields,integer,mint,freeze,bytes,publicHash} from '../protocol.mjs';
export {canonical,hash,need,fields,integer,mint,freeze,bytes,publicHash};
export function json(text){
 need(typeof text==='string'&&Buffer.byteLength(text)<=65536);let i=0,nodes=0;
 const ws=()=>{while(/[\x20\t\r\n]/.test(text[i]??'!'))i++;};
 function value(depth){
  ws();need(depth<=12&&++nodes<=2048);const ch=text[i];
  if(ch==='"'){let j=i+1;for(;j<text.length;j++){if(text[j]==='\\'){j++;continue;}if(text[j]==='"')break;}need(j<text.length);const s=JSON.parse(text.slice(i,j+1));need(s.length<=32768);i=j+1;return s;}
  if(ch==='{'||ch==='['){i++;const object=ch==='{',out=object?{}:[],seen=new Set(),end=object?'}':']';ws();if(text[i]===end){i++;return out;}for(;;){need(seen.size<=64&&(!Array.isArray(out)||out.length<64));let key;if(object){need(text[i]==='"');key=value(depth+1);need(typeof key==='string'&&!['__proto__','constructor','prototype'].includes(key)&&!seen.has(key));seen.add(key);ws();need(text[i++]===':');}const v=value(depth+1);if(object)out[key]=v;else out.push(v);ws();if(text[i]===end){i++;return out;}need(text[i++ ]===',');ws();}}
  const token=/^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(text.slice(i));need(token);i+=token[0].length;const v=JSON.parse(token[0]);need(typeof v!=='number'||Number.isSafeInteger(v));return v;
 }
 const out=value(0);ws();need(i===text.length);return out;
}
export const snapshot=x=>json(canonical(x));
export const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
export const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)&&x!=='0'.repeat(64);
export const denied=()=>Object.freeze({status:'held',activate:false,sourceCalls:false});
