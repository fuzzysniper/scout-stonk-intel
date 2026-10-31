import {freeze,isExactPublicKey} from '../../onchain-mint/validation';
/** Static, non-executable source plan. No key, URL, HTTP function, env, timer, credential or approval constructor. */
export function planMintRead(mint:unknown,encoding:'jsonParsed'|'base64'='jsonParsed'){
 if(!isExactPublicKey(mint)||!['jsonParsed','base64'].includes(encoding))return null;
 return freeze({state:'not_authorized',sourceGo:false,host:'mainnet.helius-rpc.com',protocol:'https:',port:443,method:'getAccountInfo',commitment:'finalized',encoding,mint,
  maxAccounts:1,maxResponseBytes:65536,maxAccountBytes:8192,timeoutMs:5000,retries:0,redirects:0,
  minimumIntervalMs:2500,maxProposedReads:3,maxWindowMs:900000,
  required:'independent_owner_source_rights_account_debit_dynamic_durable_admission_STOP_and_preview_GO',
  existingJsonParsedWireCompatible:encoding==='jsonParsed',
  rawBinaryWireRequiresSeparateReview:encoding==='base64'} as const);
}
