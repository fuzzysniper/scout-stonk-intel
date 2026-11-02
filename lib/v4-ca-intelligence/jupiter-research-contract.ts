/** Public syntax and privacy only. None of these checks authenticates an approval. */
import {isExactPublicKey} from '../onchain-mint/validation';
export const RESEARCH_BRANCH='feat/280-lens-v3-public';
export const RESEARCH_FRAGMENT='jupiter-research';
export const RESEARCH_HEADER='x-unfarmd-jupiter-research';
export const RESEARCH_MAX_BYTES=65536;
export const RESEARCH_MAX_BODY=RESEARCH_MAX_BYTES+256;
export const RESEARCH_DOMAIN='UNFARMD:JUPITER-BETA:AUTHORIZATION:3\0';
export type ResearchCarrier=Readonly<{text:string;expiresAt:number}>;
type Data=Record<string,unknown>;
const fields=(x:unknown,keys:readonly string[]):x is Data=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const time=(x:unknown):x is number=>Number.isSafeInteger(x)&&Number(x)>=0;
/** Minimal JSON spelling rejects duplicate/escaped duplicate keys. Bound structure
 * before stringifying; authorization strings themselves are never logged. */
export function researchJson(text:string,max=RESEARCH_MAX_BYTES):unknown{
 if(typeof text!=='string'||new TextEncoder().encode(text).length>max)throw Error('research_unavailable');
 const value:unknown=JSON.parse(text);let nodes=0;
 const walk=(x:unknown,depth:number)=>{if(depth>12||++nodes>2048)throw Error('research_unavailable');
  if(typeof x==='string'&&x.length>32768)throw Error('research_unavailable');
  if(typeof x==='number'&&(!Number.isSafeInteger(x)||Object.is(x,-0)))throw Error('research_unavailable');
  if(x&&typeof x==='object'){const keys=Object.keys(x);if(keys.length>64||keys.some(k=>['__proto__','constructor','prototype'].includes(k)))throw Error('research_unavailable');for(const v of Object.values(x))walk(v,depth+1);}
 };walk(value,0);if(JSON.stringify(value)!==text)throw Error('research_unavailable');return value;
}
/** Unverified display lifetime only; B's public verifier remains authoritative. */
export function researchEnvelope(text:string,now=Date.now()):ResearchCarrier|null{try{
 const e=researchJson(text);if(!fields(e,['version','raw','ownerStamp','approval','validatorStamp','receipt'])||e.version!=='unfarmd-turnkey-beta-envelope/1'||typeof e.raw!=='string'||typeof e.approval!=='string')return null;
 for(const stamp of [e.ownerStamp,e.validatorStamp])if(!fields(stamp,['stampHeaderName','stampHeaderValue'])||typeof stamp.stampHeaderValue!=='string')return null;
 if((e.ownerStamp as Data).stampHeaderName!=='X-Stamp-Webauthn'||(e.validatorStamp as Data).stampHeaderName!=='X-Stamp')return null;
 const raw=researchJson(e.raw);if(!fields(raw,['type','timestampMs','organizationId','parameters'])||raw.type!=='ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2'||!fields(raw.parameters,['signWith','payload','encoding','hashFunction']))return null;
 const p=raw.parameters;if(p.encoding!=='PAYLOAD_ENCODING_HEXADECIMAL'||p.hashFunction!=='HASH_FUNCTION_NOT_APPLICABLE'||typeof p.payload!=='string'||! /^(?:[a-f0-9]{2}){1,8400}$/.test(p.payload))return null;
 const bytes=Uint8Array.from(p.payload.match(/../g)!,b=>parseInt(b,16)),payload=new TextDecoder('utf8',{fatal:true}).decode(bytes);
 if(!payload.startsWith(RESEARCH_DOMAIN))return null;
 const r=researchJson(payload.slice(RESEARCH_DOMAIN.length),8192);
 if(!fields(r,['version','grantId','nonce','organizationId','keyId','epoch','policyHash','identity','rights','edge','scope','issuedAt','startsAt','expiresAt'])||r.version!=='unfarmd-jupiter-beta-authorization/3')return null;
 if(!fields(r.identity,['repository','branch','commit','tree','project','deployment','origin','environment'])||!fields(r.scope,['provider','mints','maxUses','perMintLimit','retries','native','holders','save','publicDisplay']))return null;
 const s=r.scope;if(s.provider!=='jupiter-tokens-v2'||s.retries!==0||s.native!==false||s.holders!==false||s.save!==false||s.publicDisplay!==false||!Array.isArray(s.mints)||s.mints.length<1||s.mints.length>4||!s.mints.every(isExactPublicKey)||JSON.stringify(s.mints)!==JSON.stringify([...new Set(s.mints)].sort())||!time(s.maxUses)||s.maxUses<1||s.maxUses>4||!time(s.perMintLimit)||s.perMintLimit<1||s.perMintLimit>s.maxUses)return null;
 if(!time(now)||!time(r.issuedAt)||!time(r.startsAt)||!time(r.expiresAt)||r.issuedAt>r.startsAt||r.startsAt>now||now>=r.expiresAt||r.expiresAt-r.issuedAt>600000)return null;
 for(const v of [r.rights,r.edge])if(!fields(v,['evidenceHash','reviewedAt','expiresAt'])||!time(v.reviewedAt)||!time(v.expiresAt)||v.reviewedAt>r.issuedAt||now>=v.expiresAt||r.expiresAt>v.expiresAt)return null;
 return Object.freeze({text,expiresAt:r.expiresAt});
}catch{return null;}}
export function decodeResearchCarrier(encoded:unknown,now=Date.now()):ResearchCarrier|null{try{
 if(typeof encoded!=='string'||encoded.length>87382||!/^[A-Za-z0-9_-]+$/.test(encoded))return null;
 const b=atob(encoded.replaceAll('-','+').replaceAll('_','/'));
 if(b.length>RESEARCH_MAX_BYTES||btoa(b).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')!==encoded)return null;
 return researchEnvelope(new TextDecoder('utf8',{fatal:true}).decode(Uint8Array.from(b,c=>c.charCodeAt(0))),now);
}catch{return null;}}
