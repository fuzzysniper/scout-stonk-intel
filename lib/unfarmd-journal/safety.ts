import {LIMITS} from './contract';
export type Data = Record<string,unknown>;
export function object(v:unknown):v is Data {
 return v!==null&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
}
export function keys(v:unknown,required:string[]):v is Data {
 return object(v)&&Object.keys(v).length===required.length&&required.every(k=>Object.hasOwn(v,k));
}
export function id(v:unknown):v is string {return typeof v==='string'&&v.length<=80&&/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(v)&&!/[\r\n\u2028\u2029]/.test(v);}
export function clock(v:unknown):v is string {
 if(typeof v!=='string'||v.length!==24||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v))return false;
 const t=Date.parse(v);return Number.isFinite(t)&&new Date(t).toISOString()===v;
}
export function text(v:unknown,max=2000):v is string {
 return typeof v==='string'&&v.length<=max&&v.trim().length>0&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v);
}
export function positiveDecimal(v:unknown):v is string {
 return typeof v==='string'&&v.length<=19&&v.trim()===v&&/^(0|[1-9]\d{0,8})(?:\.\d{1,9})?$/.test(v)&&!/[\r\n]/.test(v)&&/[1-9]/.test(v);
}
/** Reject obvious unsafe content; never silently rewrite an authoritative event.
 * This is a guardrail, NOT DLP or a promise that arbitrary prose contains no secrets. */
export function restrictedText(v:string):boolean {
 return /(?:https?|postgres(?:ql)?|wss?):\/\/|-----BEGIN[^\n]*PRIVATE KEY|\bBearer\s+\S+|\b(?:api[-_ ]?key|password|private[-_ ]?key|access[-_ ]?token|account[-_ ]?(?:number|no)|iban|routing[-_ ]?number|seed[-_ ]?phrase)\s*[:=]|\b(?:gh[pousr]_[A-Za-z0-9_]{12,}|sk_live_[A-Za-z0-9]+|AKIA[A-Z0-9]{16})\b|\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b|\b\d{12,19}\b/i.test(v);
}
/** Snapshot descriptor values before validation. No getters, cycles, exotic
 * prototypes, symbols, inherited fields, sparse arrays or non-finite numbers. */
export function snapshot(input:unknown):unknown {
 let nodes=0,characters=0;const seen=new Set<object>();
 function visit(v:unknown,depth:number):unknown {
  if(++nodes>LIMITS.nodes||depth>LIMITS.depth)throw Error('input_bounds');
  if(v===null||typeof v==='boolean')return v;
  if(typeof v==='string'){
   characters+=v.length;if(v.length>2000||characters>LIMITS.bytes)throw Error('input_bounds');
   if(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(v))throw Error('invalid_plain_data');
   if(restrictedText(v))throw Error('restricted_content');return v;
  }
  if(typeof v==='number'&&Number.isSafeInteger(v))return v;
  if(typeof v!=='object'||seen.has(v)||(!Array.isArray(v)&&!object(v)))throw Error('invalid_plain_data');
  seen.add(v);const descriptors=Object.getOwnPropertyDescriptors(v);
  if(Reflect.ownKeys(v).some(k=>typeof k==='symbol'))throw Error('invalid_plain_data');
  const names=Object.keys(descriptors);
  if(names.length>(Array.isArray(v)?LIMITS.receipts+1:80))throw Error('input_bounds');
  const out:unknown[]|Data=Array.isArray(v)?[]:Object.create(null) as Data;
  if(Array.isArray(v)){
   if(v.length>LIMITS.receipts||names.length!==v.length+1)throw Error('invalid_plain_data');
   for(let i=0;i<v.length;i++)if(!Object.hasOwn(descriptors,String(i)))throw Error('invalid_plain_data');
  }
  for(const k of names){
   if(Array.isArray(v)&&k==='length')continue;
   const d=descriptors[k];
   if(k.length>80||['__proto__','prototype','constructor'].includes(k)||!d.enumerable||!('value' in d))throw Error('invalid_plain_data');
   if(Array.isArray(v)&&(!/^(0|[1-9]\d*)$/.test(k)||Number(k)>=v.length))throw Error('invalid_plain_data');
   (out as Data)[k]=visit(d.value,depth+1);
  }
  return out;
 }
 const result=visit(input,0);
 if(bytes(result)>LIMITS.bytes)throw Error('input_bounds');return result;
}
export const bytes=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v)).length;
export function canonical(v:unknown):string {
 if(v===null||typeof v!=='object')return JSON.stringify(v);
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Data)[k])).join(',')+'}';
}
export function freeze<T>(v:T):T {
 if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;
}
