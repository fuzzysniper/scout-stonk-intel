import {sign,verify} from 'node:crypto';
// Pure offline comparison. NOT a backup service, trusted-anchor store or runtime gate.
// Caller must obtain the latest anchor independently of the database being restored.
const hash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const num=n=>Number.isSafeInteger(n)&&n>=0;
const fields=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const keys=['authHash','version','databaseId','generation','journal','tombstones','owners','rates','pilot'];
export function validateRecovery(anchor,restored){
 const blocked=()=>Object.freeze({status:'blocked',activate:false});
 try{
  for(const v of [anchor,restored]){
   if(!fields(v,keys)||v.version!=='unfarmd-v4-recovery/1'||!hash(v.databaseId)||!num(v.generation)||!hash(v.authHash))return blocked();
   for(const name of ['journal','tombstones','owners','rates'])if(!Array.isArray(v[name])||v[name].length>2048)return blocked();
   const specs={journal:['id','revision','head','metadataHash'],tombstones:['id','head','metadataHash'],owners:['id','journals','events'],rates:['id','windowAt','lastAt','reads','writes']};
   for(const [name,f] of Object.entries(specs)){const seen=new Set();for(const row of v[name]){if(!fields(row,f)||!hash(row.id)||seen.has(row.id))return blocked();seen.add(row.id);for(const k of f.filter(k=>k!=='id'))if((k==='head'||k==='metadataHash')?!hash(row[k]):!num(row[k]))return blocked();}}
   if(v.pilot!==null&&(!fields(v.pilot,['policyHash','reads','attempts','credits','stopped','fence','leaseHash','historyHash'])||!hash(v.pilot.policyHash)||!['reads','attempts','credits'].every(k=>num(v.pilot[k]))||typeof v.pilot.stopped!=='boolean'||![v.pilot.fence,v.pilot.leaseHash].every(x=>x===null||hash(x))||!hash(v.pilot.historyHash)))return blocked();
  }
  if(anchor.databaseId!==restored.databaseId||anchor.generation!==restored.generation)return blocked();
  // EXACT comparison is deliberate: a greater counter alone cannot prove a valid history.
  const normalize=v=>JSON.stringify({...v,...Object.fromEntries(['journal','tombstones','owners','rates'].map(n=>[n,[...v[n]].sort((a,b)=>a.id.localeCompare(b.id))]))});
  if(normalize(anchor)!==normalize(restored))return blocked();
  return Object.freeze({status:'anchor_equal_offline_only',activate:false});
 }catch{return blocked();}
}

const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
export function signRecoveryAnchor(snapshot,privateKey,capturedAtMs){
 if(validateRecovery(snapshot,snapshot).status!=='anchor_equal_offline_only'||!num(capturedAtMs)||privateKey?.asymmetricKeyType!=='ed25519'||privateKey.type!=='private')throw Error('journal_anchor_unavailable');
 const record={version:'unfarmd-signed-anchor/1',capturedAtMs,snapshot};const bytes=canonical(record);if(Buffer.byteLength(bytes)>1048576)throw Error('journal_anchor_unavailable');
 return Object.freeze({record,signature:sign(null,Buffer.from(bytes),privateKey).toString('base64url')});
}
export function checkSignedRecovery(envelope,restored,{publicKey,expectedGeneration,nowMs}={}){
 const blocked=()=>Object.freeze({status:'blocked',activate:false});
 try{
  if(!fields(envelope,['record','signature'])||!fields(envelope.record,['version','capturedAtMs','snapshot'])||envelope.record.version!=='unfarmd-signed-anchor/1'||!num(nowMs)||!num(expectedGeneration)||envelope.record.snapshot?.generation!==expectedGeneration||publicKey?.type!=='public'||publicKey.asymmetricKeyType!=='ed25519'||!num(envelope.record.capturedAtMs)||nowMs<envelope.record.capturedAtMs||nowMs-envelope.record.capturedAtMs>300000||typeof envelope.signature!=='string')return blocked();
  const signature=Buffer.from(envelope.signature,'base64url'),bytes=canonical(envelope.record);if(signature.length!==64||signature.toString('base64url')!==envelope.signature||Buffer.byteLength(bytes)>1048576||!verify(null,Buffer.from(bytes),publicKey,signature))return blocked();
  return validateRecovery(envelope.record.snapshot,restored);
 }catch{return blocked();}
}
