// Explicit SYNTHETIC offline manifests/signatures. No real owner key, credentials, storage or provider calls.
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {recoveryManifestV2} from '../../ops/v4-journal/recovery-v2.mjs';
export const H='a'.repeat(64),I='b'.repeat(64),NOW=1793491200000;
export const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
export const sha=v=>createHash('sha256').update(v).digest('hex');
export const clone=v=>JSON.parse(JSON.stringify(v));
export function extraction(){return {database:'unfarmd_v4_pilot',readOnly:true,isolation:'repeatable read',atMs:String(NOW),lsn:'0/12ABC',readSnapshot:'1:2:',
 legacy:{authHash:H,journal:[{id:I,revision:2,head:H,metadataHash:H}],tombstones:[{id:I,head:H,metadataHash:H}],owners:[{id:I,journals:2,events:3}],rates:[{id:I,windowAt:100,lastAt:110,reads:3,writes:4}],pilot:{policyHash:H,reads:3,attempts:2,credits:4,stopped:true,fence:H,leaseHash:H,historyHash:H}},
 ca:{policy:{policyHash:H,recordSha256:H,rowSha256:H,ownerSha256:H,originSha256:H,releaseHash:H,runtimeKind:'local_fixture',startsMs:String(NOW-1000),expiresMs:String(NOW+600000),maxLookups:3,maxAttempts:3,maxCredits:6,debitJupiter:1,debitHelius:2},
 state:{lookups:1,attempts:1,credits:2,stopped:true,fenceSha256:H,leaseSha256:I,lastClientMs:String(NOW),lastServerMs:String(NOW),nextJupiterMs:'0',nextHeliusMs:String(NOW+2500),rowSha256:H},
 lookups:[{idSha256:H,mintSha256:I,rowSha256:H}],history:[{seq:'1',serverMs:String(NOW),kind:'admit',receiptSha256:H,rowSha256:H},{seq:'3',serverMs:String(NOW),kind:'reserve',receiptSha256:I,rowSha256:I},{seq:'4',serverMs:String(NOW),kind:'stop',receiptSha256:H,rowSha256:H}],sequence:{lastValue:'5',isCalled:true}}};}
export function manifest(x=extraction()){const r=recoveryManifestV2(JSON.stringify(x),{databaseId:H,generation:1});if(r.status!=='manifest_offline_only')throw Error('SYNTHETIC_MANIFEST_REJECTED');return JSON.parse(r.manifestJson);}
export function signed(m=manifest(),{sequence=3,quiescenceId=I,pair=generateKeyPairSync('ed25519')}={}){
 const record={version:'unfarmd-recovery-anchor/2',sequence,quiescenceId,manifest:m};const envelope={record,signature:sign(null,Buffer.from(canonical(record)),pair.privateKey).toString('base64url')};
 const trust={publicKey:pair.publicKey,current:{anchorSha256:sha(canonical(envelope)),databaseId:H,generation:1,sequence,quiescenceId,capturedAtMs:m.capture.atMs,checkedAtMs:m.capture.atMs,caPolicyHash:m.ca.policy?.policyHash??null},nowMs:m.capture.atMs+100,maxAgeMs:300000};
 return {envelope,trust,pair};
}
