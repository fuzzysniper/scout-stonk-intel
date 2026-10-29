import 'server-only';
import {createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto';
import {canonical} from '../unfarmd-intelligence/internal';
import {parsePacket} from '../trader-pulse/validation';
import {fields,plain,fail} from './validation';
export type KeyMaterial=Readonly<{id:string;key:Uint8Array}>;
/** Separately managed, per-owner versioned key resolver; no env/file/KMS implementation or activation. */
export type OwnerKeys=(ownerId:string,keyId?:string)=>Promise<KeyMaterial>;
export type Context=Readonly<{ownerId:string;journalId:string;mint:string;sequence:number;previousHead:string|null;requestId:string}>;
const keyId=(s:unknown):s is string=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,32}$/.test(s);
export const storageHash=(payload:string)=>createHash('sha256').update(payload,'utf8').digest('hex');
async function material(keys:OwnerKeys,owner:string,id?:string){
 let timer:ReturnType<typeof setTimeout>|undefined;
 const k=await Promise.race([Promise.resolve().then(()=>keys(owner,id)),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('key_unavailable')),1000);})]).finally(()=>clearTimeout(timer));if(!keyId(k.id)||(id!==undefined&&k.id!==id)||!(k.key instanceof Uint8Array)||k.key.byteLength!==32)return fail('unavailable');
 return {id:k.id,key:Buffer.from(k.key)};
}
export async function seal(value:unknown,context:Context,keys:OwnerKeys):Promise<string>{
 const k=await material(keys,context.ownerId);try{
  const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',k.key,nonce);
  cipher.setAAD(Buffer.from(canonical({version:1,keyId:k.id,...context})));
  const ciphertext=Buffer.concat([cipher.update(canonical(value),'utf8'),cipher.final()]);
  return canonical({version:1,keyId:k.id,nonce:nonce.toString('base64url'),ciphertext:ciphertext.toString('base64url'),tag:cipher.getAuthTag().toString('base64url')});
 }finally{k.key.fill(0);}
}
export async function open(payload:string,context:Context,keys:OwnerKeys):Promise<unknown>{
 try{
  if(typeof payload!=='string'||Buffer.byteLength(payload)>32768)return fail('integrity');
  const p=fields(parsePacket(payload),['version','keyId','nonce','ciphertext','tag']);if(p.version!==1||!keyId(p.keyId))return fail('integrity');
  const decode=(v:unknown,length?:number)=>{if(typeof v!=='string'||!/^[A-Za-z0-9_-]+$/.test(v))return fail('integrity');const b=Buffer.from(v,'base64url');if(b.toString('base64url')!==v||(length!==undefined&&b.length!==length))return fail('integrity');return b;};
  const nonce=decode(p.nonce,12),tag=decode(p.tag,16),ciphertext=decode(p.ciphertext),k=await material(keys,context.ownerId,p.keyId);
  try{
   const d=createDecipheriv('aes-256-gcm',k.key,nonce);d.setAAD(Buffer.from(canonical({version:1,keyId:k.id,...context})));d.setAuthTag(tag);
   return plain(parsePacket(Buffer.concat([d.update(ciphertext),d.final()]).toString('utf8')));
  }finally{k.key.fill(0);}
 }catch{return fail('integrity');}
}
