import {LIMITS} from './contract';
/** Bounded strict JSON ingress for a FUTURE importer. No file, crypto or storage I/O.
 * JSON.parse alone loses duplicate keys; reject those before semantic validation. */
export function decode(raw:unknown):unknown {
 if(typeof raw!=='string'||raw.length>LIMITS.bytes||new TextEncoder().encode(raw).length>LIMITS.bytes)throw Error('input_bounds');
 const text=raw;
 let i=0,nodes=0;
 const ws=()=>{while(/[\t\r\n ]/.test(text[i]??'x'))i++;};
 function string():string {
  const start=i++;let escaped=false;
  while(i<text.length){const c=text[i++];if(!escaped&&c==='"')return JSON.parse(text.slice(start,i));if(!escaped&&c==='\\')escaped=true;else escaped=false;}
  throw Error('invalid_json');
 }
 function value(depth:number):unknown {
  if(depth>LIMITS.depth||++nodes>LIMITS.nodes)throw Error('input_bounds');ws();
  const c=text[i];
  if(c==='"')return string();
  if(c==='{'||c==='['){
   const array=c==='[';i++;ws();const out:unknown[]|Record<string,unknown>=array?[]:Object.create(null) as Record<string,unknown>;
   const end=array?']':'}',seen=new Set<string>();if(text[i]===end){i++;return out;}
   for(;;){
    ws();let key=String((out as unknown[]).length);
    if(!array){if(text[i]!=='"')throw Error('invalid_json');key=string();if(seen.has(key))throw Error('duplicate_json_key');seen.add(key);ws();if(text[i++]!==':')throw Error('invalid_json');}
    const item=value(depth+1);
    if(array)(out as unknown[]).push(item);else (out as Record<string,unknown>)[key]=item;
    ws();if(text[i]===end){i++;return out;}if(text[i++]!==',')throw Error('invalid_json');
   }
  }
  const match=/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(i));
  if(!match)throw Error('invalid_json');i+=match[0].length;return JSON.parse(match[0]);
 }
 const out=value(0);ws();if(i!==text.length)throw Error('invalid_json');return out;
}
