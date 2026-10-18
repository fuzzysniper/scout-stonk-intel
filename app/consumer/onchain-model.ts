import type {MintFactsV1,MintFailure} from '../../lib/onchain-mint/contract';
import {isExactSolanaMint,utcMicros} from '../../experiments/consumer-mvp/evidence/guards';
export type {MintFactsV1} from '../../lib/onchain-mint/contract';
export type DisplayContext='production'|'synthetic-offline';
export type MintView={kind:'unavailable'|'unsupported';reason:string;retryMs?:number}|{kind:'facts';value:Extract<MintFactsV1,{facts:object}>;supply:string;expiresAt:number;offline:boolean};
export const SOURCE_MAX_AGE_MS=60_000;
const TOKEN='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',TOKEN2022='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const reasons:readonly MintFailure[]=['disabled','server_only','invalid_mint','admission_limited','development_budget','circuit_open','timeout','access_denied','rate_limited','upstream_unavailable','network_unavailable','invalid_response','response_too_large','rpc_error','stale_source','invalid_clock','not_found','wrong_owner','not_mint','uninitialized','unparsed_account'];
export function addressQuery(mint:string){if(!isExactSolanaMint(mint))throw Error('invalid_exact_address');return '/?mint='+encodeURIComponent(mint);}
export function explorerAddress(mint:string){if(!isExactSolanaMint(mint))throw Error('invalid_exact_address');return 'https://explorer.solana.com/address/'+encodeURIComponent(mint)+'?cluster=mainnet-beta';}
export function unavailableMintFacts(mint:unknown){return isExactSolanaMint(mint)?{state:'source_unavailable' as const,mint,checkedSlot:null,checkedAt:null}:null;}
/** Exact decimal arithmetic. Long fractional representations use an exact coefficient/exponent, never rounding. */
export function exactSupply(raw:string,decimals:number):{decimal:string;summary:string}{
 if(!/^(0|[1-9][0-9]{0,19})$/.test(raw)||BigInt(raw)>18446744073709551615n||!Number.isInteger(decimals)||decimals<0||decimals>255)throw Error('invalid_supply');
 const padded=raw.padStart(decimals+1,'0'),decimal=decimals?padded.slice(0,-decimals)+'.'+padded.slice(-decimals):raw;
 const [whole,fraction]=decimal.split('.');
 const summary=decimal.length>48?(raw==='0'?'0':raw+' × 10^−'+decimals):whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(fraction?'.'+fraction:'');
 return {decimal,summary};
}
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const decimalSlot=(v:unknown)=>typeof v==='string'&&/^[1-9][0-9]{0,15}$/.test(v)&&BigInt(v)<=BigInt(Number.MAX_SAFE_INTEGER);
const authority=(v:unknown)=>object(v)&&((v.state==='absent'&&v.address===null)||(v.state==='present'&&isExactSolanaMint(v.address)));
const failure=(reason='invalid_response'):MintView=>({kind:'unavailable',reason});
/** Presentation boundary for the ONE imported wire contract; no RPC decoding or alternate wire schema.
 * Reconstruct only displayed contract fields so untrusted metadata/messages cannot reach React state.
 */
export function projectMintFacts(input:unknown,mint:string,now:number,context:DisplayContext='production',httpStatus=200):MintView{
 if(!isExactSolanaMint(mint)||!Number.isFinite(now)||!object(input)||input.version!=='mint-facts/1')return failure();
 if(input.status==='unavailable'||input.status==='not_a_supported_mint_account'){
  if(input.facts!==null||input.source!==null||(input.mint!==mint&&input.mint!==null)||!reasons.includes(input.reason as MintFailure))return failure();
  if(input.status==='not_a_supported_mint_account'&&(!['not_found','wrong_owner','not_mint','uninitialized'].includes(String(input.reason))||input.mint!==mint))return failure();
  return {kind:input.status==='unavailable'?'unavailable':'unsupported',reason:String(input.reason)};
 }
 if(httpStatus!==200||!['verified_onchain_mint_at_slot','unsupported_extensions'].includes(String(input.status))||input.mint!==mint||!object(input.facts)||!object(input.source))return failure();
 const f=input.facts,s=input.source;
 if(f.network!=='solana-mainnet'||f.mint!==mint||f.initialized!==true||!['spl_token','token_2022'].includes(String(f.program))||f.ownerProgram!==(f.program==='spl_token'?TOKEN:TOKEN2022)||!object(f.supply)||!authority(f.mintAuthority)||!authority(f.freezeAuthority)||!object(f.extensions)||!object(f.interpretation))return failure();
 let supply;try{if(typeof f.supply.raw!=='string'||typeof f.supply.decimals!=='number')return failure();supply=exactSupply(f.supply.raw,f.supply.decimals);if(supply.decimal!==f.supply.decimalAmount)return failure();}catch{return failure();}
 const ext=f.extensions;
 if(!['none','reviewed_metadata_pointer','unreviewed'].includes(String(ext.assessment))||!Array.isArray(ext.names)||ext.names.length>32||ext.names.some(n=>typeof n!=='string'||!(/^[A-Za-z][A-Za-z0-9_]{0,63}$/).test(n))||new Set(ext.names).size!==ext.names.length)return failure();
 const unreviewed=ext.assessment==='unreviewed';
 if((input.status==='unsupported_extensions')!==unreviewed||f.program==='spl_token'&&(ext.assessment!=='none'||ext.names.length!==0)||ext.assessment==='none'&&ext.names.length!==0)return failure();
 if(ext.assessment==='reviewed_metadata_pointer'&&(f.program!=='token_2022'||ext.names.length!==1||ext.names[0]!=='metadataPointer'||ext.metadataPointer===null))return failure();
 if(ext.metadataPointer!==null&&(!object(ext.metadataPointer)||!(ext.metadataPointer.authority===null||isExactSolanaMint(ext.metadataPointer.authority))||!(ext.metadataPointer.metadataAddress===null||isExactSolanaMint(ext.metadataPointer.metadataAddress))))return failure();
 const ma=f.mintAuthority as {state:string;address:string|null},fa=f.freezeAuthority as {state:string;address:string|null};
 if(f.interpretation.minting!==(unreviewed?'extension_review_required':ma.state==='present'?'authority_present':'authority_absent')||f.interpretation.freezing!==(unreviewed?'extension_review_required':fa.state==='present'?'authority_present':'authority_absent'))return failure();
 if(s.method!=='getAccountInfo'||s.encoding!=='jsonParsed'||s.commitment!=='finalized'||s.assurance!=='rpc_reported_not_independently_replayed'||!decimalSlot(s.contextSlot)||s.slotTime!==null||typeof s.endpointHost!=='string'||!['api.mainnet-beta.solana.com','mainnet.helius-rpc.com'].includes(s.endpointHost)||s.endpointHost.length>253||!(/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/).test(s.endpointHost)||!(/^[a-f0-9]{64}$/).test(String(s.responseSha256)))return failure();
 // The merged contract has only development/recorded/synthetic acquisition profiles.
 // None is an operator-approved production source; adding one needs the later approval PR.
 if(context==='production')return failure('unapproved_source');
 if(context==='synthetic-offline'&&s.acquisition!=='synthetic_fixture')return failure('unapproved_source');
 const times=[s.requestStartedAt,s.responseReceivedAt,s.checkedAt,s.evaluatedAt].map(utcMicros);
 if(times.some(t=>t===null))return failure('invalid_clock');
 const [start,received,checked,evaluated]=times as bigint[],wall=BigInt(Math.floor(now))*1000n;
 if(start>received||received!==checked||received>evaluated||received-start>5_000_000n||evaluated>wall+1_000_000n||checked>wall+1_000_000n)return failure('invalid_clock');
 if(s.freshness!=='fresh'||wall-checked>BigInt(SOURCE_MAX_AGE_MS)*1000n)return failure('stale_source');
 if(s.httpDate!==null&&(typeof s.httpDate!=='string'||!Number.isFinite(Date.parse(s.httpDate))||Date.parse(s.httpDate)>Number(checked/1000n)||now-Date.parse(s.httpDate)>SOURCE_MAX_AGE_MS))return failure('invalid_clock');
 const value={version:'mint-facts/1',status:input.status,mint,facts:{network:f.network,mint,program:f.program,ownerProgram:f.ownerProgram,initialized:true,supply:{raw:f.supply.raw,decimals:f.supply.decimals,decimalAmount:supply.decimal},mintAuthority:{state:ma.state,address:ma.address},freezeAuthority:{state:fa.state,address:fa.address},extensions:{assessment:ext.assessment,names:[...ext.names],metadataPointer:ext.metadataPointer?{authority:ext.metadataPointer.authority,metadataAddress:ext.metadataPointer.metadataAddress}:null},interpretation:{minting:f.interpretation.minting,freezing:f.interpretation.freezing}},source:{endpointHost:s.endpointHost,method:s.method,encoding:s.encoding,commitment:s.commitment,assurance:s.assurance,contextSlot:s.contextSlot,slotTime:null,requestStartedAt:s.requestStartedAt,responseReceivedAt:s.responseReceivedAt,checkedAt:s.checkedAt,evaluatedAt:s.evaluatedAt,httpDate:s.httpDate,responseSha256:s.responseSha256,freshness:'fresh',acquisition:s.acquisition},warnings:[]} as Extract<MintFactsV1,{facts:object}>;
 return {kind:'facts',value,supply:supply.summary,expiresAt:Number(checked/1000n)+SOURCE_MAX_AGE_MS,offline:context==='synthetic-offline'};
}
export function failureCopy(view:Extract<MintView,{kind:'unavailable'|'unsupported'}>):readonly [string,string]{
 if(view.kind==='unsupported')return ['Not a supported mint account','The source did not establish an initialized Token Program or Token-2022 mint at this address. This is not a judgment about the project.'];
 if(view.reason==='disabled'||view.reason==='missing_api')return ['Source not connected','No onchain facts are available. Supply, authorities and account type have not been verified.'];
 if(view.reason==='stale_source')return ['Observation expired','The source observation is too old to display. Supply and authorities are withheld until another check completes.'];
 if(['rate_limited','admission_limited','circuit_open'].includes(view.reason))return ['Check paused','The source is limiting requests. No token facts are available; wait before trying again.'];
 if(view.reason==='timeout'||view.reason==='network_unavailable'||view.reason==='upstream_unavailable')return ['Check could not complete','The source did not respond in time or is unavailable. This does not establish whether the address is a token mint.'];
 return ['Could not verify this response','The response or its source evidence could not be accepted. No token facts are shown.'];
}
