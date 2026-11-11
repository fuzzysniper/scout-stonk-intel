// Internal process admission, not authentication, rights or a persistence format.
import 'server-only';
import {createHash} from 'node:crypto';
import {deepFreeze, isExactMint, validTime} from '../trader-pulse/validation';
import type {Asset, SourceProjection} from './contract';
const admitted = new WeakSet<object>();
export function receiptFields(value:unknown,required:readonly string[],optional:readonly string[]=[]):void {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid_receipt');
  const keys=Object.keys(value),allowed=[...required,...optional];
  if(required.some(k=>!keys.includes(k))||keys.some(k=>!allowed.includes(k))||keys.some(k=>!('value' in Object.getOwnPropertyDescriptor(value,k)!)))throw Error('invalid_receipt');
}
export function asset(mint: unknown): Asset {
  if (!isExactMint(mint)) throw Error('invalid_exact_solana_mint');
  return Object.freeze({chain:'solana',mint});
}
export function time(ms: number): string {
  if (!validTime(ms) || ms > 253402300799999) throw Error('invalid_clock');
  return new Date(ms).toISOString();
}
export function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value,-0)) return JSON.stringify(value);
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical((value as Record<string,unknown>)[k])).join(',')+'}';
  }
  throw Error('invalid_canonical_value');
}
export const hash = (value: unknown): string => createHash('sha256').update(canonical(value),'utf8').digest('hex');
export function admit(projection: SourceProjection): SourceProjection {
  deepFreeze(projection); admitted.add(projection); return projection;
}
export const isAdmitted = (value: unknown): value is SourceProjection => !!value && typeof value === 'object' && admitted.has(value);
export {deepFreeze};
