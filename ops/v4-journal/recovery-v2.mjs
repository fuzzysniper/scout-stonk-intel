// Pure offline preservation review. No I/O, key loading, signing, restore or activation.
import {createHash,verify,KeyObject} from 'node:crypto';
import {validateRecovery} from './recovery.mjs';
const LIMIT=1048576,AGE=300000,MAX64=9223372036854775807n;
const digest=v=>createHash('sha256').update(v).digest('hex');
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const integer=v=>Number.isSafeInteger(v)&&v>=0;
const decimal=v=>typeof v==='string'&&/^(0|[1-9][0-9]{0,18})$/.test(v)&&BigInt(v)<=MAX64;
const fields=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const need=v=>{if(!v)throw Error('recovery_v2_unavailable');};
const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
const parse=s=>{need(typeof s==='string'&&Buffer.byteLength(s)<=LIMIT);return JSON.parse(s);};
function caValid(c){
 need(fields(c,['policy','state','lookups','history','sequence']));need(Array.isArray(c.lookups)&&c.lookups.length<=3&&Array.isArray(c.history)&&c.history.length<=64);
 need(fields(c.sequence,['lastValue','isCalled'])&&decimal(c.sequence.lastValue)&&BigInt(c.sequence.lastValue)>0n&&typeof c.sequence.isCalled==='boolean');
 if(c.policy===null||c.state===null){need(c.policy===null&&c.state===null&&c.lookups.length===0&&c.history.length===0&&c.sequence.lastValue==='1'&&!c.sequence.isCalled);return;}
 const p=c.policy,s=c.state;
 need(fields(p,['policyHash','recordSha256','rowSha256','ownerSha256','originSha256','releaseHash','runtimeKind','startsMs','expiresMs','maxLookups','maxAttempts','maxCredits','debitJupiter','debitHelius']));
 for(const k of ['policyHash','recordSha256','rowSha256','ownerSha256','originSha256','releaseHash'])need(hash(p[k]));need(p.policyHash===p.recordSha256&&['private_preview','local_fixture'].includes(p.runtimeKind));
 need(decimal(p.startsMs)&&decimal(p.expiresMs)&&BigInt(p.expiresMs)>BigInt(p.startsMs)&&BigInt(p.expiresMs)-BigInt(p.startsMs)<=900000n);
 for(const[k,max]of [['maxLookups',3],['maxAttempts',6],['maxCredits',6000000],['debitJupiter',1000000],['debitHelius',1000000]])need(integer(p[k])&&p[k]>=1&&p[k]<=max);
 need(fields(s,['lookups','attempts','credits','stopped','fenceSha256','leaseSha256','lastClientMs','lastServerMs','nextJupiterMs','nextHeliusMs','rowSha256']));
 for(const k of ['lookups','attempts','credits'])need(integer(s[k])&&s[k]<=p['max'+k[0].toUpperCase()+k.slice(1)]);
 need(typeof s.stopped==='boolean'&&hash(s.rowSha256));for(const k of ['fenceSha256','leaseSha256'])need(s[k]===null||hash(s[k]));for(const k of ['lastClientMs','lastServerMs','nextJupiterMs','nextHeliusMs'])need(decimal(s[k]));
 need((s.attempts===0)===(s.credits===0));need(c.lookups.length===s.lookups);
 let previous='';for(const row of c.lookups){need(fields(row,['idSha256','mintSha256','rowSha256']));for(const k of Object.keys(row))need(hash(row[k]));need(row.idSha256>previous);previous=row.idSha256;}
 let seq=0n,admit=0,reserve=0,finish=0;for(const row of c.history){need(fields(row,['seq','serverMs','kind','receiptSha256','rowSha256']));need(decimal(row.seq)&&BigInt(row.seq)>seq&&decimal(row.serverMs)&&['admit','reserve','finish','stop'].includes(row.kind)&&hash(row.receiptSha256)&&hash(row.rowSha256));seq=BigInt(row.seq);if(row.kind==='admit')admit++;if(row.kind==='reserve')reserve++;if(row.kind==='finish')finish++;}
 need(admit===s.lookups&&reserve===s.attempts&&finish<=reserve);need(seq<=BigInt(c.sequence.lastValue));need(!c.history.length||c.sequence.isCalled);
}
function manifestValid(m){
 need(fields(m,['version','databaseId','generation','capture','legacy','ca']));need(m.version==='unfarmd-v4-recovery/2'&&hash(m.databaseId)&&integer(m.generation));
 need(fields(m.capture,['atMs','lsn','readSnapshot']));need(integer(m.capture.atMs)&&typeof m.capture.lsn==='string'&&/^[0-9A-F]+\/[0-9A-F]+$/.test(m.capture.lsn)&&typeof m.capture.readSnapshot==='string'&&m.capture.readSnapshot.length<=1024&&/^[0-9]+:[0-9]+:(?:[0-9]+(?:,[0-9]+)*)?$/.test(m.capture.readSnapshot));
 need(m.legacy?.databaseId===m.databaseId&&m.legacy?.generation===m.generation&&validateRecovery(m.legacy,m.legacy).status==='anchor_equal_offline_only');caValid(m.ca);
 need(Buffer.byteLength(canonical(m))<=LIMIT);
}
/** Build only from the bounded SQL projection. Does not establish source trust or freshness. */
export function recoveryManifestV2(extractionJson,{databaseId,generation}={}){
 try{const x=parse(extractionJson);need(fields(x,['database','readOnly','isolation','atMs','lsn','readSnapshot','legacy','ca']));need(x.database==='unfarmd_v4_pilot'&&x.readOnly===true&&x.isolation==='repeatable read'&&decimal(x.atMs)&&BigInt(x.atMs)<=BigInt(Number.MAX_SAFE_INTEGER));
  const m={version:'unfarmd-v4-recovery/2',databaseId,generation,capture:{atMs:Number(x.atMs),lsn:x.lsn,readSnapshot:x.readSnapshot},legacy:{...x.legacy,version:'unfarmd-v4-recovery/1',databaseId,generation},ca:x.ca};
  need(fields(x.legacy,['authHash','journal','tombstones','owners','rates','pilot']));manifestValid(m);return Object.freeze({status:'manifest_offline_only',activate:false,manifestJson:canonical(m)});
 }catch{return Object.freeze({status:'blocked',activate:false});}
}
const logical=m=>({...m.legacy,...Object.fromEntries(['journal','tombstones','owners','rates'].map(k=>[k,[...m.legacy[k]].sort((a,b)=>a.id.localeCompare(b.id))])),ca:m.ca});
/**
 * trust.current is a LATEST checkpoint from an independently protected authority,
 * never from the restored DB, backup, envelope or caller-controlled request.
 * The code verifies its binding; it cannot create/attest that external authority.
 */
export function reviewRecoveryV2(envelopeJson,restoredManifestJson,trust){
 const blocked=()=>Object.freeze({status:'blocked',activate:false});
 try{
  need(fields(trust,['publicKey','current','nowMs','maxAgeMs']));const {publicKey,current:q,nowMs,maxAgeMs}=trust;
  need(publicKey instanceof KeyObject&&publicKey.type==='public'&&publicKey.asymmetricKeyType==='ed25519');need(integer(nowMs)&&integer(maxAgeMs)&&maxAgeMs>0&&maxAgeMs<=AGE);
  need(fields(q,['anchorSha256','databaseId','generation','sequence','quiescenceId','capturedAtMs','checkedAtMs','caPolicyHash']));need(hash(q.anchorSha256)&&hash(q.databaseId)&&hash(q.quiescenceId)&&integer(q.generation)&&integer(q.sequence)&&q.sequence>0&&integer(q.capturedAtMs)&&integer(q.checkedAtMs)&&(q.caPolicyHash===null||hash(q.caPolicyHash)));
  need(q.checkedAtMs>=q.capturedAtMs&&nowMs>=q.checkedAtMs&&nowMs-q.checkedAtMs<=maxAgeMs);
  const e=parse(envelopeJson),m=parse(restoredManifestJson);need(fields(e,['record','signature']));need(fields(e.record,['version','sequence','quiescenceId','manifest']));
  need(e.record.version==='unfarmd-recovery-anchor/2'&&e.record.sequence===q.sequence&&e.record.quiescenceId===q.quiescenceId&&digest(canonical(e))===q.anchorSha256);
  need(typeof e.signature==='string'&&/^[A-Za-z0-9_-]{86}$/.test(e.signature));const signature=Buffer.from(e.signature,'base64url');need(signature.length===64&&signature.toString('base64url')===e.signature&&verify(null,Buffer.from(canonical(e.record)),publicKey,signature));
  const a=e.record.manifest;manifestValid(a);manifestValid(m);
  need(a.databaseId===q.databaseId&&m.databaseId===q.databaseId&&a.generation===q.generation&&m.generation===q.generation&&a.capture.atMs===q.capturedAtMs);
  need((a.ca.policy?.policyHash??null)===q.caPolicyHash&&(m.ca.policy?.policyHash??null)===q.caPolicyHash);
  need(m.capture.atMs>=a.capture.atMs&&m.capture.atMs<=nowMs&&nowMs-m.capture.atMs<=maxAgeMs);
  need(canonical(logical(a))===canonical(logical(m)));
  return Object.freeze({status:'preserved_offline_only',activate:false});
 }catch{return blocked();}
}
