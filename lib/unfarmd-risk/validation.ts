// Bounded plain-data inputs only. Callers must supply their clocks; no hidden I/O/time.
export type RecordValue=Record<string,unknown>;
export function record(v:unknown):v is RecordValue {
 return v!==null&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
}
export function keys(v:unknown,required:string[],optional:string[]=[]):v is RecordValue {
 return record(v)&&required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
}
export const text=(v:unknown,max=2000):v is string=>typeof v==='string'&&v.length<=max&&v.trim().length>0&&!/[\u0000-\u001f\u007f]/.test(v);
export const id=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(v);
export const list=(v:unknown,max=20):v is string[]=>Array.isArray(v)&&v.length<=max&&v.every(s=>text(s,500));
export function clock(v:unknown):v is string {
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v))return false;
 const t=Date.parse(v);return Number.isFinite(t)&&new Date(t).toISOString()===v;
}
export const bps=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=10000;
export function plainData(value:unknown):boolean {
 let count=0,characters=0;const seen=new Set<object>();
 function visit(v:unknown,depth:number):boolean {
  if(++count>1024||depth>8)return false;
  if(v===null||typeof v==='boolean')return true;
  if(typeof v==='string'){characters+=v.length;return v.length<=2000&&characters<=16000;}
  if(typeof v==='number')return Number.isSafeInteger(v);
  if(typeof v!=='object'||seen.has(v)||(!Array.isArray(v)&&!record(v)))return false;
  seen.add(v);const descriptors=Object.getOwnPropertyDescriptors(v);
  if(Reflect.ownKeys(v).some(k=>typeof k==='symbol')||Object.keys(descriptors).length>81)return false;
  for(const [k,d] of Object.entries(descriptors)){
   if(Array.isArray(v)&&k==='length')continue;
   if(!d.enumerable||!('value' in d)||!visit(d.value,depth+1))return false;
  }
  // Sparse arrays are ambiguous; reject them without invoking getters.
  if(Array.isArray(v)&&(Object.keys(v).length!==v.length||Object.keys(v).some(k=>! /^(0|[1-9]\d*)$/.test(k))||Array.from({length:v.length},(_,i)=>i).some(i=>!Object.hasOwn(v,i))))return false;
  return true;
 }
 try{return visit(value,0);}catch{return false;}
}
export function asset(v:unknown):boolean {
 return keys(v,['label','assetKey'])&&text(v.label,160)&&(v.assetKey===null||text(v.assetKey,240));
}
