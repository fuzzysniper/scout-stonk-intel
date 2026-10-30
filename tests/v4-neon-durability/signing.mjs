// SYNTHETIC signatures only, with the nonsecret #241 target string. No connection or real approval.
import {createRequire} from 'node:module';import {generateKeyPairSync,sign} from 'node:crypto';
const require=createRequire(import.meta.url),d=require(process.env.V4_OWNER_BUILD+'/lib/v4-owner-ledger/neon-durability.js');
export {d};
export const record=()=>({version:'unfarmd-neon-durability/1',mode:'neon-safekeeper-quorum/v1',projectId:'twilight-hall-57571802',branchId:'br-sweet-voice-b4x4et5q',database:'unfarmd_v4_pilot',host:d.NEON_DIRECT_HOST,postgresMajor:18,tenantId:'1'.repeat(32),timelineId:'2'.repeat(32),evidenceSha256:d.NEON_EVIDENCE_SHA,migrationSqlSha256:d.NEON_MIGRATION_SHA,nativeAcceptanceSha256:'3'.repeat(64),recoveryAnchorPolicySha256:'4'.repeat(64),ownerApprovalId:'owner-go-'+'a'.repeat(16)});
const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
export function signed(p=record(),pair=generateKeyPairSync('ed25519')){const payload=typeof p==='string'?p:canonical(p);return {pair,envelope:{payload,signature:sign(null,Buffer.from(payload),pair.privateKey).toString('base64url')}};}
