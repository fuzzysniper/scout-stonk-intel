// OFFLINE PROTOTYPE ONLY. Verification over synthetic records; no signer or transport.
import {createHash,KeyObject,verify} from 'node:crypto';
export const VERSION='unfarmd-jupiter-beta-authorization/2';
export const ENVELOPE='unfarmd-jupiter-beta-prototype-envelope/1';
export const MODE='synthetic-only';
export const DOMAIN='UNFARMD:JUPITER-BETA:PROTOTYPE:2\0';
export const LIVE_SIGNING_CONNECTED=false;
export const ACQUISITION_CONNECTED=false;
export const USDC='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const SOL='So11111111111111111111111111111111111111112';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export const hash=b=>createHash('sha256').update(b).digest('hex');
export const need=x=>{if(!x)throw Error('prototype_denied');};
export const integer=x=>Number.isSafeInteger(x)&&x>=0;
export const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)&&x!=='0'.repeat(64);
export const fields=(x,keys)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k)&&Object.hasOwn(Object.getOwnPropertyDescriptor(x,k),'value'));
export function canonical(input){
 // Bound aggregate work BEFORE snapshotting structured adapter input. A shared DAG
 // must not expand exponentially despite individually bounded strings/depth/arrays.
 let nodes=0,total=0;const emit=s=>{total+=Buffer.byteLength(s);need(total<=32768);return s;};
 function walk(x,depth){
  need(depth<=12&&++nodes<=1024);
  if(x===null||typeof x==='boolean')return emit(JSON.stringify(x));
  if(typeof x==='number'){need(integer(x));return emit(String(x));}
  if(typeof x==='string'){need(x.length<=16384&&!/[\u0000-\u001f\u007f]/.test(x));return emit(JSON.stringify(x));}
  if(Array.isArray(x)){
   need(Object.getPrototypeOf(x)===Array.prototype&&x.length<=64&&Reflect.ownKeys(x).length===x.length+1);
   const values=[];for(let i=0;i<x.length;i++){const d=Object.getOwnPropertyDescriptor(x,String(i));need(d&&Object.hasOwn(d,'value'));values.push(walk(d.value,depth+1));}
   emit('['+','.repeat(Math.max(0,x.length-1))+']');return '['+values.join(',')+']';
  }
  need(x&&Object.getPrototypeOf(x)===Object.prototype);
  const keys=Reflect.ownKeys(x);need(keys.length<=32&&keys.every(k=>typeof k==='string'&&/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(k)&&Object.hasOwn(Object.getOwnPropertyDescriptor(x,k),'value')));
  const parts=keys.sort().map(k=>emit(JSON.stringify(k)+':')+walk(Object.getOwnPropertyDescriptor(x,k).value,depth+1));emit('{'+','.repeat(Math.max(0,keys.length-1))+'}');return '{'+parts.join(',')+'}';
 }
 return walk(input,0);
}
export function parse(text,max=16384){need(typeof text==='string'&&Buffer.byteLength(text)<=max);const x=JSON.parse(text);need(canonical(x)===text);return x;}
export const freeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
export function bytes(s,max){need(typeof s==='string'&&s.length>0&&s.length<=Math.ceil(max*4/3)&&/^[A-Za-z0-9_-]+$/.test(s));const b=Buffer.from(s,'base64url');need(b.length<=max&&b.toString('base64url')===s);return b;}
export function mint(s){
 if(typeof s!=='string'||s.length<32||s.length>44)return false;
 let n=0n;for(const c of s){const i=alphabet.indexOf(c);if(i<0)return false;n=n*58n+BigInt(i);}
 let out=0;for(let p=n;p>0n;p>>=8n)out++;let zero=0;while(s[zero]==='1')zero++;
 return zero+out===32;
}
const p256=k=>k instanceof KeyObject&&k.type==='public'&&k.asymmetricKeyType==='ec'&&k.asymmetricKeyDetails?.namedCurve==='prime256v1';
const ed25519=k=>k instanceof KeyObject&&k.type==='public'&&k.asymmetricKeyType==='ed25519';
export const publicHash=k=>hash(k.export({type:'spki',format:'der'}));
export const approvalPolicyHash=t=>hash(canonical({mode:MODE,owner:{id:t.owner.userId,credential:t.owner.credentialId,key:publicHash(t.owner.publicKey),root:false},validator:{id:t.validator.userId,credential:t.validator.credentialId,key:publicHash(t.validator.publicKey),root:false},beta:{id:t.beta.keyId,epoch:t.beta.epoch,key:publicHash(t.beta.publicKey)},limits:t.policy}));
export function trust(input){
 need(fields(input,['mode','owner','validator','beta','identity','rights','edge','policy']));need(input.mode===MODE);
 const actor=(a,role)=>{need(fields(a,['userId','credentialId','role','root','publicKey']));need(a.role===role&&a.root===false&&/^test_[a-z0-9_-]{1,60}$/.test(a.userId)&&/^test_[a-z0-9_-]{1,60}$/.test(a.credentialId)&&p256(a.publicKey));return Object.freeze({...a});};
 const owner=actor(input.owner,'owner'),validator=actor(input.validator,'validator');
 need(owner.userId!==validator.userId&&owner.credentialId!==validator.credentialId&&publicHash(owner.publicKey)!==publicHash(validator.publicKey));
 const b=input.beta;need(fields(b,['keyId','epoch','publicKey'])&&/^test_[a-z0-9_-]{1,60}$/.test(b.keyId)&&integer(b.epoch)&&b.epoch>0&&ed25519(b.publicKey));
 const identity=JSON.parse(canonical(input.identity));checkIdentity(identity);
 const policy=JSON.parse(canonical(input.policy));need(fields(policy,['allowedMints','maxUses','maxLifetimeMs']));
 need(Array.isArray(policy.allowedMints)&&policy.allowedMints.length>0&&policy.allowedMints.length<=4&&policy.allowedMints.every(mint)&&new Set(policy.allowedMints).size===policy.allowedMints.length);
 need(integer(policy.maxUses)&&policy.maxUses>0&&policy.maxUses<=4&&integer(policy.maxLifetimeMs)&&policy.maxLifetimeMs>0&&policy.maxLifetimeMs<=600000);
 return Object.freeze({mode:MODE,owner,validator,beta:Object.freeze({...b}),identity:freeze(identity),rights:freeze(JSON.parse(canonical(input.rights))),edge:freeze(JSON.parse(canonical(input.edge))),policy:freeze(policy)});
}
function checkIdentity(i){
 need(fields(i,['repository','branch','commit','tree','project','deployment','origin','environment']));
 need(i.environment===MODE&&i.repository==='test/scout'&&i.branch==='test/jupiter-approval'&&/^[a-f0-9]{40}$/.test(i.commit)&&i.commit!=='0'.repeat(40)&&/^[a-f0-9]{40}$/.test(i.tree));
 need(/^prj_TEST_[A-Z0-9]+$/.test(i.project)&&/^dpl_TEST_[A-Z0-9]+$/.test(i.deployment));
 const u=new URL(i.origin);need(u.protocol==='https:'&&u.origin===i.origin&&u.hostname.endsWith('.invalid')&&!u.hostname.startsWith('git-')&&!u.username&&!u.password&&!u.port);
}
export function record(text,t,now){
 need(integer(now));const r=parse(text,8192);
 need(fields(r,['version','mode','activate','grantId','nonce','keyId','epoch','approvers','identity','rights','edge','scope','issuedAt','startsAt','expiresAt']));
 need(r.version===VERSION&&r.mode===MODE&&r.activate===false&&/^test_[a-z0-9_-]{1,60}$/.test(r.grantId)&&digest(r.nonce)&&r.keyId===t.beta.keyId&&r.epoch===t.beta.epoch);
 const a=r.approvers;need(fields(a,['ownerId','ownerCredential','validatorId','validatorCredential','policyHash'])&&a.ownerId===t.owner.userId&&a.ownerCredential===t.owner.credentialId&&a.validatorId===t.validator.userId&&a.validatorCredential===t.validator.credentialId&&a.policyHash===approvalPolicyHash(t));
 checkIdentity(r.identity);need(canonical(r.identity)===canonical(t.identity));
 for(const k of ['issuedAt','startsAt','expiresAt'])need(integer(r[k]));
 need(r.issuedAt<=r.startsAt&&r.startsAt<=now&&now<r.expiresAt&&r.expiresAt>r.issuedAt&&r.expiresAt-r.issuedAt<=t.policy.maxLifetimeMs);
 const rights=r.rights;need(fields(rights,['mode','decision','agreementHash','interpretationHash','attributionHash','receiptHash','reviewedAt']));need(rights.mode===MODE&&rights.decision==='TEST_ONLY');
 for(const k of ['agreementHash','interpretationHash','attributionHash','receiptHash'])need(digest(rights[k]));need(integer(rights.reviewedAt)&&rights.reviewedAt<=r.issuedAt&&r.issuedAt-rights.reviewedAt<=86400000&&canonical(rights)===canonical(t.rights));
 const edge=r.edge;need(fields(edge,['mode','founderOnly','evidenceHash','exceptionsHash','reviewedAt']));need(edge.mode===MODE&&edge.founderOnly==='SIMULATED'&&digest(edge.evidenceHash)&&digest(edge.exceptionsHash)&&integer(edge.reviewedAt)&&edge.reviewedAt<=r.issuedAt&&r.issuedAt-edge.reviewedAt<=600000&&canonical(edge)===canonical(t.edge));
 const s=r.scope;need(fields(s,['provider','audience','mints','maxUses','perMintLimit','retries','native','holders','save','publicDisplay','sourceCalls']));
 need(s.provider==='jupiter-tokens-v2'&&s.audience===MODE&&s.retries===0&&s.native===false&&s.holders===false&&s.save===false&&s.publicDisplay===false&&s.sourceCalls===false);
 need(Array.isArray(s.mints)&&s.mints.length>0&&s.mints.length<=4&&s.mints.every(mint)&&s.mints.every(m=>t.policy.allowedMints.includes(m))&&canonical(s.mints)===canonical([...new Set(s.mints)].sort()));
 need(integer(s.maxUses)&&s.maxUses>0&&s.maxUses<=t.policy.maxUses&&integer(s.perMintLimit)&&s.perMintLimit>0&&s.perMintLimit<=s.maxUses);
 return freeze(r);
}
export const message=text=>Buffer.concat([Buffer.from(DOMAIN,'utf8'),Buffer.from(text,'utf8')]);
export function request(text,t,now,issuing=false){
 const q=parse(text);need(fields(q,['type','timestampMs','organizationId','parameters']));need(q.type==='ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2'&&q.organizationId==='org_TEST_ONLY'&&/^[1-9][0-9]{0,15}$/.test(q.timestampMs));
 const p=q.parameters;need(fields(p,['signWith','payload','encoding','hashFunction']));need(p.signWith===t.beta.keyId&&p.encoding==='PAYLOAD_ENCODING_HEXADECIMAL'&&p.hashFunction==='HASH_FUNCTION_NOT_APPLICABLE'&&typeof p.payload==='string'&&p.payload.length<=16384&&/^(?:[a-f0-9]{2})+$/.test(p.payload));
 const raw=Buffer.from(p.payload,'hex'),prefix=Buffer.from(DOMAIN);need(raw.subarray(0,prefix.length).equals(prefix));
 const recordText=new TextDecoder('utf8',{fatal:true}).decode(raw.subarray(prefix.length)),r=record(recordText,t,now);
 const at=Number(q.timestampMs);need(integer(at)&&at>=r.issuedAt&&at<=now&&(!issuing||now-at<=30000));
 return {q,r,recordText,requestHash:hash(text)};
}
// A simulator identifier, NOT Turnkey's undocumented fingerprint calculation.
export const activityFingerprint=text=>'sim_'+hash('SIMULATED_TURNKEY_ACTIVITY/1\0'+text);
export function ownerProof(stamp,text,t){
 try{
  need(fields(stamp,['kind','credentialId','authenticatorData','clientDataJSON','signature']));need(stamp.kind==='TEST_WEBAUTHN'&&stamp.credentialId===t.owner.credentialId);
  const a=bytes(stamp.authenticatorData,37);need(a.length===37&&a.subarray(0,32).equals(Buffer.from(hash('owner-approval.invalid'),'hex'))&&(a[32]&5)===5&&(a[32]&0xc0)===0);
  const raw=bytes(stamp.clientDataJSON,2048),c=parse(new TextDecoder('utf8',{fatal:true}).decode(raw),2048);
  need(fields(c,['type','challenge','origin','crossOrigin'])&&c.type==='webauthn.get'&&c.origin==='https://owner-approval.invalid'&&c.crossOrigin===false&&c.challenge===Buffer.from(hash(text),'utf8').toString('base64url'));
  return verify('sha256',Buffer.concat([a,Buffer.from(hash(raw),'hex')]),t.owner.publicKey,bytes(stamp.signature,80));
 }catch{return false;}
}
export function validatorProof(stamp,text,t){try{need(fields(stamp,['kind','credentialId','signature'])&&stamp.kind==='TEST_API_KEY'&&stamp.credentialId===t.validator.credentialId);return verify('sha256',Buffer.from(text),t.validator.publicKey,bytes(stamp.signature,80));}catch{return false;}}
export function approval(text,rawRequest,t,now){
 const a=parse(text,2048),issued=Number(parse(rawRequest).timestampMs);need(fields(a,['type','timestampMs','organizationId','parameters'])&&a.type==='ACTIVITY_TYPE_APPROVE_ACTIVITY'&&a.organizationId==='org_TEST_ONLY'&&/^[1-9][0-9]{0,15}$/.test(a.timestampMs)&&Number(a.timestampMs)>=issued&&Number(a.timestampMs)<=now&&Number(a.timestampMs)-issued<=30000);
 need(fields(a.parameters,['fingerprint'])&&a.parameters.fingerprint===activityFingerprint(rawRequest));return a;
}
export function verifyEnvelope(text,input,now){
 try{
  const t=trust(input),e=parse(text);need(fields(e,['version','mode','request','ownerStamp','approval','validatorStamp','signature']));need(e.version===ENVELOPE&&e.mode===MODE);
  const r=request(e.request,t,now);need(ownerProof(e.ownerStamp,e.request,t));approval(e.approval,e.request,t,now);need(validatorProof(e.validatorStamp,e.approval,t));
  const sig=bytes(e.signature,64);need(sig.length===64&&verify(null,message(r.recordText),t.beta.publicKey,sig));
  return Object.freeze({status:'verified_simulation_only',activate:false,sourceCalls:false,record:r.r,requestHash:r.requestHash,envelopeHash:hash(text)});
 }catch{return Object.freeze({status:'denied',activate:false,sourceCalls:false});}
}
