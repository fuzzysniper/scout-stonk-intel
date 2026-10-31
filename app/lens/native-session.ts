import {isLensResponse,type LensView} from './intelligence-model';
import type {ObservedMint} from './oracle-evidence';
export type NativeAccountDetails=Readonly<{mint:string;responseSha256:string;accountDataSha256:string;contextSlot:string;rawSupply:string;decimals:number}>;
export type NativeReply=Readonly<{version:'oracle-native-session/1';outcome:'observed'|'unavailable'|'stopped'|'stop_unknown';view:LensView|null;details:NativeAccountDetails|null}>;
const exact=(x:unknown,keys:string[]):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===keys.sort().join(',');
export function validNativeDetails(x:unknown,n:ObservedMint):x is NativeAccountDetails{
 return exact(x,['mint','responseSha256','accountDataSha256','contextSlot','rawSupply','decimals'])&&x.mint===n.account&&x.responseSha256===n.responseSha256&&x.accountDataSha256===n.accountDataSha256&&x.contextSlot===n.contextSlot&&typeof x.rawSupply==='string'&&/^(?:0|[1-9]\d{0,19})$/.test(x.rawSupply)&&BigInt(x.rawSupply)<=18446744073709551615n&&Number.isInteger(x.decimals)&&Number(x.decimals)>=0&&Number(x.decimals)<=255;
}
export function isNativeReply(x:unknown,mint:string):x is NativeReply{
 if(!exact(x,['version','outcome','view','details'])||x.version!=='oracle-native-session/1'||typeof x.outcome!=='string'||!['observed','unavailable','stopped','stop_unknown'].includes(x.outcome))return false;
 if(x.view===null)return x.details===null&&x.outcome!=='observed';
 if(!isLensResponse(x.view,mint)||x.view.riskFindings?.length!==24)return false;
 const n=x.view.oracleEvidence?.nativeMint;
 return x.outcome==='observed'?n?.state==='observed'&&validNativeDetails(x.details,n):x.details===null&&n?.state==='unavailable'&&x.view.riskFindings.every(f=>f.tone==='gray');
}
/** Browser combines two same-origin responses, never sends facts/capabilities as producer input. */
export function mergeNativeView(market:LensView,native:NativeReply):LensView|null{
 if(native.outcome!=='observed'||!native.view||!isNativeReply(native,market.mint)||!isLensResponse(market,market.mint))return null;
 const a=market.riskFindings,b=native.view.riskFindings;if(!a||!b)return null;
 const marketRows=a.filter(f=>!f.id.startsWith('onchain-'));
 if(marketRows.length!==14||b.filter(f=>f.id.startsWith('onchain-')).length!==10)return null;
 const merged:LensView={...market,state:'partial',riskFindings:[...marketRows,...b.filter(f=>f.id.startsWith('onchain-'))],oracleEvidence:native.view.oracleEvidence};
 return isLensResponse(merged,market.mint)?merged:null;
}
