import 'server-only';
import {isExactPublicKey} from '../onchain-mint/validation';
import {JournalError} from './contract';
export const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
export const hex=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function fail(code:ConstructorParameters<typeof JournalError>[0]):never{throw new JournalError(code);}
/** Copy data descriptors only; getters, prototypes, holes and oversized graphs never execute. */
export function plain(value:unknown,depth=0):unknown{
 if(depth>12)return fail('invalid_request');
 if(value===null||typeof value==='boolean')return value;
 if(typeof value==='string'){if(Buffer.byteLength(value)>16384)return fail('invalid_request');return value;}
 if(typeof value==='number'&&Number.isSafeInteger(value)&&!Object.is(value,-0))return value;
 if(!value||typeof value!=='object'||Object.getOwnPropertySymbols(value).length)return fail('invalid_request');
 if(Array.isArray(value)){
  if(value.length>64||Object.getOwnPropertyNames(value).length!==value.length+1)return fail('invalid_request');
  return Array.from({length:value.length},(_,i)=>{const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d||!('value'in d))return fail('invalid_request');return plain(d.value,depth+1);});
 }
 if((Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)||Object.getOwnPropertyNames(value).length>32)return fail('invalid_request');
 const out:Record<string,unknown>={};for(const k of Object.getOwnPropertyNames(value)){
  const d=Object.getOwnPropertyDescriptor(value,k)!;if(!d.enumerable||!('value'in d)||['__proto__','constructor','prototype'].includes(k))return fail('invalid_request');
  out[k]=plain(d.value,depth+1);
 }return out;
}
export function fields(value:unknown,keys:readonly string[]):Record<string,unknown>{
 const v=plain(value) as Record<string,unknown>;
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join('|')!==[...keys].sort().join('|'))return fail('invalid_request');return v;
}
export function identity(journalId:unknown,mint:unknown){if(!uuid(journalId)||!isExactPublicKey(mint))return fail('invalid_request');return {journalId,mint};}
