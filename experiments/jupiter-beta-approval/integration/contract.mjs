// Public-only successor contract. No production pin enrolled, signer or source import.
import {createPublicKey,verify,ECDH} from 'node:crypto';
import {canonical,hash,need,fields,integer,mint,freeze,snapshot,uuid,digest,bytes,publicHash,json} from './json.mjs';
export const VERSION='unfarmd-jupiter-beta-authorization/3';
export const DOMAIN='UNFARMD:JUPITER-BETA:AUTHORIZATION:3\0';
export const ENVELOPE='unfarmd-turnkey-beta-envelope/1';
export const ACTIVATION=false;
export const message=text=>Buffer.concat([Buffer.from(DOMAIN),Buffer.from(text)]);
export function context(input){
 const t=snapshot(input);need(fields(t,['organizationId','owner','validator','beta','policyId','identity','ownerOrigin','rights','edge','allowedMints']));
 for(const id of [t.organizationId,t.owner.userId,t.owner.authenticatorId,t.validator.userId,t.validator.apiKeyId,t.beta.keyId,t.policyId])need(uuid(id));
 need(fields(t.owner,['userId','authenticatorId','credentialId','publicKey','root'])&&fields(t.validator,['userId','apiKeyId','publicKey','root'])&&fields(t.beta,['keyId','epoch','publicKey']));
 need(t.owner.root===false&&t.validator.root===false&&t.owner.userId!==t.validator.userId&&t.owner.authenticatorId!==t.validator.apiKeyId&&t.owner.publicKey!==t.validator.publicKey);
 for(const a of [t.owner,t.validator]){need(/^(?:02|03)[a-f0-9]{64}$|^04[a-f0-9]{128}$/.test(a.publicKey));ecKey(a.publicKey);}need(publicHash(ecKey(t.owner.publicKey))!==publicHash(ecKey(t.validator.publicKey)));bytes(t.owner.credentialId,1024);
 const beta=createPublicKey({key:Buffer.from(t.beta.publicKey,'base64url'),type:'spki',format:'der'});need(beta.asymmetricKeyType==='ed25519'&&publicHash(beta)===hash(Buffer.from(t.beta.publicKey,'base64url'))&&integer(t.beta.epoch)&&t.beta.epoch>0);
 const o=new URL(t.ownerOrigin);need(o.origin===t.ownerOrigin&&o.protocol==='https:'&&!o.username&&!o.port);identity(t.identity);need(Array.isArray(t.allowedMints)&&t.allowedMints.length>0&&t.allowedMints.length<=4&&t.allowedMints.every(mint)&&new Set(t.allowedMints).size===t.allowedMints.length);
 return freeze(t);
}
export function ecKey(hex){
 const p=Buffer.from(ECDH.convertKey(Buffer.from(hex,'hex'),'prime256v1',undefined,undefined,'uncompressed'));need(p.length===65&&p[0]===4);return createPublicKey({key:{kty:'EC',crv:'P-256',x:p.subarray(1,33).toString('base64url'),y:p.subarray(33).toString('base64url')},format:'jwk'});
}
export function identity(i){
 need(fields(i,['repository','branch','commit','tree','project','deployment','origin','environment'])&&i.repository==='fuzzysniper/scout-stonk-intel'&&i.environment==='preview');
 need(typeof i.branch==='string'&&/^[A-Za-z0-9/_-]{1,100}$/.test(i.branch)&&/^[a-f0-9]{40}$/.test(i.commit)&&/^[a-f0-9]{40}$/.test(i.tree)&&i.commit!=='0'.repeat(40));
 need(/^prj_[A-Za-z0-9]+$/.test(i.project)&&/^dpl_[A-Za-z0-9]+$/.test(i.deployment));const o=new URL(i.origin);need(o.origin===i.origin&&o.protocol==='https:'&&!o.username&&!o.port&&!o.hostname.includes('-git-'));
}
export const policyBinding=t=>hash(canonical({organizationId:t.organizationId,owner:t.owner,validator:t.validator,beta:t.beta,policyId:t.policyId,allowedMints:t.allowedMints}));
export function record(text,input,now,actualIdentity=input.identity){
 need(typeof text==='string'&&Buffer.byteLength(text)<=8192);const t=context(input),r=snapshot(json(text));need(canonical(r)===text&&integer(now));
 need(fields(r,['version','grantId','nonce','organizationId','keyId','epoch','policyHash','identity','rights','edge','scope','issuedAt','startsAt','expiresAt']));
 need(r.version===VERSION&&uuid(r.grantId)&&digest(r.nonce)&&r.organizationId===t.organizationId&&r.keyId===t.beta.keyId&&r.epoch===t.beta.epoch&&r.policyHash===policyBinding(t));
 identity(r.identity);need(canonical(r.identity)===canonical(t.identity)&&canonical(r.identity)===canonical(actualIdentity));
 for(const k of ['issuedAt','startsAt','expiresAt'])need(integer(r[k]));need(r.issuedAt<=r.startsAt&&r.startsAt<=now&&now<r.expiresAt&&r.expiresAt-r.issuedAt<=600000);
 for(const kind of ['rights','edge']){const e=r[kind];need(fields(e,['evidenceHash','reviewedAt','expiresAt'])&&digest(e.evidenceHash)&&integer(e.reviewedAt)&&integer(e.expiresAt)&&e.reviewedAt<=r.issuedAt&&now<e.expiresAt&&r.expiresAt<=e.expiresAt&&canonical(e)===canonical(t[kind]));}
 const s=r.scope;need(fields(s,['provider','mints','maxUses','perMintLimit','retries','native','holders','save','publicDisplay'])&&s.provider==='jupiter-tokens-v2'&&s.retries===0&&s.native===false&&s.holders===false&&s.save===false&&s.publicDisplay===false);
 need(Array.isArray(s.mints)&&s.mints.length>0&&s.mints.length<=4&&s.mints.every(mint)&&s.mints.every(m=>t.allowedMints.includes(m))&&canonical(s.mints)===canonical([...new Set(s.mints)].sort()));
 need(integer(s.maxUses)&&s.maxUses>0&&s.maxUses<=4&&integer(s.perMintLimit)&&s.perMintLimit>0&&s.perMintLimit<=s.maxUses);return freeze(r);
}
export function rawBody(text,t,now){const r=record(text,t,now);return {type:'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2',timestampMs:String(now),organizationId:t.organizationId,parameters:{signWith:r.keyId,payload:message(text).toString('hex'),encoding:'PAYLOAD_ENCODING_HEXADECIMAL',hashFunction:'HASH_FUNCTION_NOT_APPLICABLE'}};}
export function readRaw(body,t,now){const q=snapshot(body);need(fields(q,['type','timestampMs','organizationId','parameters'])&&q.type==='ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2'&&q.organizationId===t.organizationId);const p=q.parameters;need(fields(p,['signWith','payload','encoding','hashFunction'])&&p.signWith===t.beta.keyId&&p.encoding==='PAYLOAD_ENCODING_HEXADECIMAL'&&p.hashFunction==='HASH_FUNCTION_NOT_APPLICABLE'&&/^(?:[a-f0-9]{2}){1,8400}$/.test(p.payload));const b=Buffer.from(p.payload,'hex'),prefix=Buffer.from(DOMAIN);need(b.subarray(0,prefix.length).equals(prefix));const text=new TextDecoder('utf8',{fatal:true}).decode(b.subarray(prefix.length));const r=record(text,t,now);need(/^[1-9][0-9]{0,15}$/.test(q.timestampMs)&&Number(q.timestampMs)>=r.issuedAt&&Number(q.timestampMs)<=now);return {q,r,text};}
export function ownerStamp(signed,t){
 try{need(fields(signed.stamp,['stampHeaderName','stampHeaderValue'])&&signed.stamp.stampHeaderName==='X-Stamp-Webauthn');const a=json(signed.stamp.stampHeaderValue);need(fields(a,['authenticatorData','clientDataJson','credentialId','signature'])&&a.credentialId===t.owner.credentialId);const auth=bytes(a.authenticatorData,256),client=bytes(a.clientDataJson,2048);need(auth.length>=37&&auth.subarray(0,32).equals(Buffer.from(hash(new URL(t.ownerOrigin).hostname),'hex'))&&(auth[32]&5)===5);const c=json(new TextDecoder('utf8',{fatal:true}).decode(client));need(c.type==='webauthn.get'&&c.origin===t.ownerOrigin&&c.crossOrigin!==true&&c.challenge===Buffer.from(hash(signed.body)).toString('base64url'));return verify('sha256',Buffer.concat([auth,Buffer.from(hash(client),'hex')]),ecKey(t.owner.publicKey),bytes(a.signature,80));}catch{return false;}
}
export function validatorStamp(signed,t){try{need(signed.stamp.stampHeaderName==='X-Stamp');const a=json(Buffer.from(signed.stamp.stampHeaderValue,'base64url').toString('utf8'));need(fields(a,['publicKey','scheme','signature'])&&a.publicKey===t.validator.publicKey&&a.scheme==='SIGNATURE_SCHEME_TK_API_P256'&&/^(?:[a-f0-9]{2}){8,80}$/.test(a.signature));return verify('sha256',Buffer.from(signed.body),ecKey(t.validator.publicKey),Buffer.from(a.signature,'hex'));}catch{return false;}}
