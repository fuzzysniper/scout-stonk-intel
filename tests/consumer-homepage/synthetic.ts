// SYNTHETIC/OFFLINE TEST VALUES ONLY. Not captured account state, names or financial observations.
import type {MintFactsV1} from '../../lib/onchain-mint/contract';
export const TEST_MINT='So11111111111111111111111111111111111111112';
export const TEST_TIME='2026-10-18T12:00:00.000Z';
export function syntheticMint(mint=TEST_MINT,extensions=false):MintFactsV1{
 return {version:'mint-facts/1',status:extensions?'unsupported_extensions':'verified_onchain_mint_at_slot',mint,
 facts:{network:'solana-mainnet',mint,program:extensions?'token_2022':'spl_token',ownerProgram:extensions?'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb':'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',initialized:true,
 supply:{raw:'18446744073709551615',decimals:9,decimalAmount:'18446744073.709551615'},mintAuthority:{state:'present',address:'11111111111111111111111111111111'},freezeAuthority:{state:'absent',address:null},
 extensions:{assessment:extensions?'unreviewed':'none',names:extensions?['permanentDelegate']:[],metadataPointer:null},interpretation:{minting:extensions?'extension_review_required':'authority_present',freezing:extensions?'extension_review_required':'authority_absent'}},
 source:{endpointHost:'mainnet.helius-rpc.com',method:'getAccountInfo',encoding:'jsonParsed',commitment:'finalized',assurance:'rpc_reported_not_independently_replayed',contextSlot:'400000001',slotTime:null,requestStartedAt:TEST_TIME,responseReceivedAt:TEST_TIME,checkedAt:TEST_TIME,httpDate:null,responseSha256:'a'.repeat(64),evaluatedAt:TEST_TIME,freshness:'fresh',acquisition:'synthetic_fixture'},warnings:[]};
}
export function syntheticFailure(mint=TEST_MINT,reason='disabled',status='unavailable'){
 return {version:'mint-facts/1',status,mint,facts:null,source:null,reason,warnings:[]};
}
