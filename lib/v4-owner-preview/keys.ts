import 'server-only';
import {unwrapOwnerKey,type WrappedOwnerKey} from '../../ops/v4-journal/envelope.mjs';
import {parsePacket} from '../trader-pulse/validation';
import type {OwnerKeys} from '../v4-private-journal/crypto';
/** Existing J envelope format, owner-bound versions; supplied approved server materials only. No generation/fallback. */
export function envelopeKeys(text:string,owner:string):OwnerKeys{
 if(typeof text!=='string'||Buffer.byteLength(text)>32768)throw Error('owner_keys_unavailable');
 const p=parsePacket(text) as {current?:unknown;keys?:unknown;keks?:unknown};if(!p||Object.keys(p).sort().join(',')!=='current,keks,keys'||typeof p.current!=='string'||!Array.isArray(p.keys)||!Array.isArray(p.keks)||p.keys.length<1||p.keys.length>16||p.keks.length<1||p.keks.length>16)throw Error('owner_keys_unavailable');
 const current=p.current,records=p.keys as WrappedOwnerKey[],keks=new Map<string,Uint8Array>();
 for(const item of p.keks as {id:string;key:string}[]){if(!item||Object.keys(item).sort().join(',')!=='id,key'||!/^[A-Za-z0-9_-]{1,32}$/.test(item.id)||keks.has(item.id)||typeof item.key!=='string')throw Error('owner_keys_unavailable');const key=Buffer.from(item.key,'base64url');if(key.length!==32||key.toString('base64url')!==item.key)throw Error('owner_keys_unavailable');keks.set(item.id,key);}
 if(!records.some(k=>k.ownerId===owner&&k.dekId===current)||new Set(records.map(k=>k.dekId)).size!==records.length)throw Error('owner_keys_unavailable');
 // Authenticate EVERY envelope now: malformed/unavailable old versions cannot masquerade as usable rotation.
 for(const record of records){const key=keks.get(record?.kekId);if(!key||record.ownerId!==owner)throw Error('owner_keys_unavailable');const material=unwrapOwnerKey(owner,record,{id:record.kekId,key});material.key.fill(0);}
 return async(id:string,keyId=current)=>{if(id!==owner)throw Error('owner_keys_unavailable');const record=records.find(k=>k.dekId===keyId),key=record&&keks.get(record.kekId);if(!record||!key)throw Error('owner_keys_unavailable');return unwrapOwnerKey(id,record,{id:record.kekId,key});};
}
