// Optional UNINSTALLED envelope port. Supplied in-memory materials only; no KMS/env/files.
import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
const id=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,32}$/.test(s);
const owner=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(s);
const fail=()=>new Error('journal_key_unavailable');
const aad=(o,d,k)=>Buffer.from(JSON.stringify(['unfarmd-owner-envelope/1',o,d,k]));
export function wrapOwnerKey(ownerId,dek,kek){
 if(!owner(ownerId)||!id(dek?.id)||!id(kek?.id)||!(dek.key instanceof Uint8Array)||dek.key.length!==32||!(kek.key instanceof Uint8Array)||kek.key.length!==32)throw fail();
 const k=Buffer.from(kek.key),plain=Buffer.from(dek.key);
 try{const nonce=randomBytes(12),c=createCipheriv('aes-256-gcm',k,nonce);c.setAAD(aad(ownerId,dek.id,kek.id));return Object.freeze({version:'unfarmd-owner-envelope/1',ownerId,dekId:dek.id,kekId:kek.id,nonce:nonce.toString('base64url'),ciphertext:Buffer.concat([c.update(plain),c.final()]).toString('base64url'),tag:c.getAuthTag().toString('base64url')});}
 finally{k.fill(0);plain.fill(0);}
}
export function unwrapOwnerKey(ownerId,envelope,kek){
 let key;try{
  const e=envelope;if(!owner(ownerId)||e?.ownerId!==ownerId||e.version!=='unfarmd-owner-envelope/1'||!id(e.dekId)||!id(e.kekId)||kek?.id!==e.kekId||!(kek.key instanceof Uint8Array)||kek.key.length!==32||Object.keys(e).sort().join(',')!=='ciphertext,dekId,kekId,nonce,ownerId,tag,version')throw fail();
  const decode=(s,n)=>{if(typeof s!=='string')throw fail();const b=Buffer.from(s,'base64url');if(b.length!==n||b.toString('base64url')!==s)throw fail();return b;};
  key=Buffer.from(kek.key);const d=createDecipheriv('aes-256-gcm',key,decode(e.nonce,12));d.setAAD(aad(ownerId,e.dekId,e.kekId));d.setAuthTag(decode(e.tag,16));return {id:e.dekId,key:Buffer.concat([d.update(decode(e.ciphertext,32)),d.final()])};
 }catch{throw fail();}finally{key?.fill(0);}
}
