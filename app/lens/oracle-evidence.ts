import {isExactPublicKey} from '../../lib/onchain-mint/validation';
import type {RiskFinding} from '../../lib/v4-owner-preview/view-contract';

/** Bounded DISPLAY contract, not a native constructor or a replacement for A's
 * opaque server capability. No HTTP request accepts this object as evidence.
 */
export type ObservedMint=Readonly<{
 state:'observed';account:string;program:string;host:'mainnet.helius-rpc.com';
 method:'getAccountInfo';encoding:'base64';commitment:'requested_finalized';
 contextSlot:string;slotTime:null;requestStartedAt:string;receivedAt:string;evaluatedAt:string;httpDate:string;
 requestSha256:string;responseSha256:string;accountDataSha256:string;requestId:string;
 responseBytes:number;accountBytes:number;decoder:'oracle-onchain/1';
}>;
export type OracleEvidence=Readonly<{
 version:'oracle-evidence/1';mint:string;
 nativeMint:ObservedMint|Readonly<{state:'unavailable';reason:'not_selected'|'not_verified'}>;
 holders:Readonly<{state:'unavailable';reason:'receipt_bridge_not_admitted'|'candidate_not_authenticated';maxAccounts:20;fullHolderCoverage:false;beneficialOwnership:'unknown';atomicAcrossCalls:false}>;
}>;
export const ORACLE_FINDING_IDS=Object.freeze([
 'mint-authority','freeze-authority','lp-control','concentration','suspicious','wallet-links','organic','verification','retention',
 'onchain-mint-identity','onchain-mint-authority','onchain-freeze-authority','onchain-permanent-delegate','onchain-transfer-hook','onchain-transfer-fees','onchain-transfer-restrictions','onchain-lp-custody','onchain-exit-route','onchain-jupiter-contradiction',
 'farming-concentration','farming-funding','farming-cohorts','farming-exits','farming-liquidity'
]);
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:unknown,keys:readonly string[]):v is Record<string,unknown>=>object(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const clock=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const nativeKeys=['state','account','program','host','method','encoding','commitment','contextSlot','slotTime','requestStartedAt','receivedAt','evaluatedAt','httpDate','requestSha256','responseSha256','accountDataSha256','requestId','responseBytes','accountBytes','decoder'];
export function isOracleEvidence(v:unknown,mint:string,findings:readonly RiskFinding[]):v is OracleEvidence {
 if(!Array.isArray(findings))return false;
 if(!exact(v,['version','mint','nativeMint','holders'])||v.version!=='oracle-evidence/1'||v.mint!==mint)return false;
 const h=v.holders;
 if(!exact(h,['state','reason','maxAccounts','fullHolderCoverage','beneficialOwnership','atomicAcrossCalls'])||h.state!=='unavailable'||typeof h.reason!=='string'||!['receipt_bridge_not_admitted','candidate_not_authenticated'].includes(h.reason)||h.maxAccounts!==20||h.fullHolderCoverage!==false||h.beneficialOwnership!=='unknown'||h.atomicAcrossCalls!==false)return false;
 const n=v.nativeMint;
 if(exact(n,['state','reason'])&&n.state==='unavailable'&&typeof n.reason==='string'&&['not_selected','not_verified'].includes(n.reason))return true;
 if(!exact(n,nativeKeys)||n.state!=='observed'||n.account!==mint||!isExactPublicKey(n.program)||!['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'].includes(String(n.program))||n.host!=='mainnet.helius-rpc.com'||n.method!=='getAccountInfo'||n.encoding!=='base64'||n.commitment!=='requested_finalized'||n.slotTime!==null||n.decoder!=='oracle-onchain/1')return false;
 if(typeof n.contextSlot!=='string'||!/^[1-9]\d{0,19}$/.test(n.contextSlot)||BigInt(n.contextSlot)>18446744073709551615n)return false;
 if(!clock(n.requestStartedAt)||!clock(n.receivedAt)||!clock(n.evaluatedAt)||n.requestStartedAt>n.receivedAt||n.receivedAt>n.evaluatedAt)return false;
 if(typeof n.httpDate!=='string'||n.httpDate.length>64||!Number.isFinite(Date.parse(n.httpDate))||new Date(n.httpDate).toUTCString()!==n.httpDate)return false;
 if(![n.requestSha256,n.responseSha256,n.accountDataSha256].every(hash)||typeof n.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(n.requestId))return false;
 if(!Number.isSafeInteger(n.responseBytes)||Number(n.responseBytes)<1||Number(n.responseBytes)>65536||!Number.isSafeInteger(n.accountBytes)||Number(n.accountBytes)<82||Number(n.accountBytes)>8192)return false;
 const rows=findings.filter(f=>f.id.startsWith('onchain-')&&f.tone!=='gray');
 const ids=['onchain-mint-identity','onchain-mint-authority','onchain-freeze-authority','onchain-permanent-delegate','onchain-transfer-hook','onchain-transfer-fees','onchain-transfer-restrictions'];
 return rows.some(f=>f.id==='onchain-mint-identity'&&f.tone==='green')&&rows.every(f=>ids.includes(f.id)&&f.pillar==='rug'&&f.responseSha256===n.responseSha256&&f.observedAt===n.receivedAt&&!/fixture|synthetic|replay/i.test((f.source??'')+' '+f.title));
}

export function observedMintFor(evidence:OracleEvidence|undefined,finding?:RiskFinding):ObservedMint|null {
 const n=evidence?.nativeMint;if(n?.state!=='observed')return null;
 return !finding||finding.id.startsWith('onchain-')&&finding.responseSha256===n.responseSha256&&finding.observedAt===n.receivedAt?n:null;
}
