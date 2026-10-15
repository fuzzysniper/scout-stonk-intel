/** Exact provider-ledger parsing shared by the dated audit and live evidence. No I/O. */
import { parseHistoryTimestamp } from './history';
export type LedgerLifetime = {
 basis:'ledger'; distributedRaw:string; distributedTokens:string;
 payoutCount:number; walletsPaid:number; lastPayoutAt:string|null;
 startAt:null; endAt:null; interpretation:'provider_reported_lifetime_holder_distributions';
};
export type LedgerLifetimeRead = {state:'reported';value:LedgerLifetime} |
 {state:'unavailable';value:null;reason:'ledger_unavailable'|'payouts_unavailable'|'invalid_payouts'|'invalid_source'|'units_unverified'};
export const LIFETIME_RAW_DIGITS=78;
export function parseLedgerLifetime(data:unknown,decimals:number,generatedAt:string):LedgerLifetimeRead {
 const unavailable=(reason:Extract<LedgerLifetimeRead,{state:'unavailable'}>['reason']):LedgerLifetimeRead=>({state:'unavailable',value:null,reason});
 if(!Number.isInteger(decimals) || decimals<0 || decimals>18)return unavailable('units_unverified');
 if(!data || typeof data!=='object' || Array.isArray(data))return unavailable('invalid_source');
 const d=data as Record<string,unknown>;
 if(d.basis!=='ledger')return unavailable('ledger_unavailable');
 if(d.rewards==null)return unavailable('payouts_unavailable');
 if(typeof d.rewards!=='object' || Array.isArray(d.rewards))return unavailable('invalid_source');
 const r=d.rewards as Record<string,unknown>,raw=r.distributedRaw;
 if(typeof raw!=='string' || raw.length>LIFETIME_RAW_DIGITS || !/^(0|[1-9]\d*)$/.test(raw))return unavailable('invalid_payouts');
 const validCount=(v:unknown):v is number=>typeof v==='number' && Number.isSafeInteger(v) && v>=0;
 if(!validCount(r.payoutCount) || !validCount(r.walletsPaid) || r.walletsPaid>r.payoutCount ||
    (BigInt(raw)>0n && (!r.payoutCount || !r.walletsPaid)))return unavailable('invalid_payouts');
 const generated=parseHistoryTimestamp(generatedAt),last=r.lastPayoutAt===null?null:parseHistoryTimestamp(r.lastPayoutAt);
 if(generated===null || (r.lastPayoutAt!==null && last===null))return unavailable('invalid_source');
 if((last===null && r.payoutCount>0) || (last!==null && (!r.payoutCount || last>generated)))return unavailable('invalid_payouts');
 const digits=raw.padStart(decimals+1,'0'),tokens=decimals?digits.slice(0,-decimals)+'.'+digits.slice(-decimals):raw;
 return {state:'reported',value:{basis:'ledger',distributedRaw:raw,distributedTokens:tokens,payoutCount:r.payoutCount,walletsPaid:r.walletsPaid,
  lastPayoutAt:last===null?null:new Date(last).toISOString(),startAt:null,endAt:null,interpretation:'provider_reported_lifetime_holder_distributions'}};
}
