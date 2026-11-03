// INVENTED LOCAL FIXTURES ONLY. No real account, owner, provider rights or RPC receipt.
import {createRequire} from 'node:module';
export * from '../oracle-holders-260/fixtures.mjs';
import {fixture,account,mintBytes,mutateResponse,ASOF,MINT,SPL,at,hash,key} from '../oracle-holders-260/fixtures.mjs';
const require=createRequire(import.meta.url);
export const api=require(process.env.NATIVE_EVIDENCE_BUILD+'/lib/native-evidence/index.js');
export function mintCapture(bytes=mintBytes(),program=SPL,extra={}){
 return {kind:'synthetic_fixture',network:'solana-mainnet',endpointHost:'mainnet.helius-rpc.com',method:'getAccountInfo',encoding:'base64',commitment:'finalized',mint:MINT,id:1,requestStartedAt:at(2500),receivedAt:at(3500),evaluatedAt:ASOF,httpDate:null,httpStatus:200,text:JSON.stringify({jsonrpc:'2.0',id:1,result:{context:{slot:100},value:account(bytes,program)}}),...extra};
}
export async function analyze({capture=mintCapture(),holders=fixture(),now=ASOF,transfers}={}){
 const input={mint:MINT,evaluatedAt:now,...(capture?{mintEvidence:await api.qualifyMintCapture(capture)}:{}),...(holders?{holderEvidence:api.qualifyHolderCapture(holders)}:{}),...(transfers?{transfers}:{})};
 return api.analyzeNativeEvidence(input);
}
export function balances(f,amounts,{supply=1000000n,owners}={}){
 mutateResponse(f,'selection',r=>{r.result.value.forEach((a,i)=>a.amount=String(amounts[i]));});
 mutateResponse(f,'snapshot',r=>{
  r.result.value[0]=account(mintBytes(supply));
  for(let i=0;i<amounts.length;i++){const a=r.result.value[i+1],b=Buffer.from(a.data[0],'base64');b.writeBigUInt64LE(amounts[i],64);if(owners)Buffer.from(owners[i]).copy(b,32);a.data[0]=b.toString('base64');}
 });return f;
}
export function transfers(extra={}){
 const r={id:'untrusted-candidate-ref',kind:'synthetic_fixture',providerHost:'api.mainnet.solana.com',method:'getTransaction',requestSha256:hash('SYNTHETIC request'),responseSha256:hash('SYNTHETIC response'),accountDataSha256:null,fieldPath:'$.result.transaction.message.instructions[0]',requestStartedAt:at(0),receivedAt:at(1000),contextSlot:'100',commitmentRequested:'finalized',commitmentEvidence:'request_only_not_independent_finality_proof',blockTime:{slot:'100',utc:at(0),assurance:'rpc_block_time_estimate'}};
 return {kind:'synthetic_fixture',mint:MINT,fromUtc:at(-1000),toUtc:at(1000),scope:'supplied_transactions_only',enumeration:'complete_declared_scope',parser:'reviewed_spl_transfer_candidate_v1',events:[{signature:'2'.repeat(87),instructionIndex:0,slot:'100',blockTime:at(0),mint:MINT,program:SPL,fromTokenAccount:key(11),toTokenAccount:key(12),instructionAmountRaw:'9007199254740993',succeeded:true,reference:r}],...extra};
}
