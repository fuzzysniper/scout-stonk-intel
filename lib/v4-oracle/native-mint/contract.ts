import type {Pool} from 'pg';
import type {OwnerReleaseAuthority,OwnerRelease} from '../../v4-owner-preview/release';
import type {SourcePolicyAuthority,SourceApproval} from '../../v4-owner-preview/source-policy';
import type {Controls,JupiterReport} from '../onchain/contract';
export type {Controls,JupiterReport};
export type Review=Readonly<{
 version:'unfarmd-native-mint-review/1';source:'helius_standard_rpc';host:'mainnet.helius-rpc.com';
 method:'getAccountInfo';encoding:'base64';commitment:'finalized';
 ownerSubject:string;origin:string;commit:string;branch:string;mints:readonly string[];reviewedAt:number;
 decision:'approved_protected_private_beta';termsUrl:'https://www.helius.dev/terms';termsSha256:string;accountEvidenceSha256:string;keySha256:string;
 privateDisplay:true;rawRetention:'request_memory_only';derivedRetention:'60_seconds';
 ledgerRetention:'owner_mint_provider_utc_hash_counters_immutable';publicRedistribution:false;
 verifiedDebit:number;includedAllowance:number;overageProtectionReviewed:true;
}>;
export type Config=Readonly<{
 ownerAuthority:OwnerReleaseAuthority;release:OwnerRelease;authority:SourcePolicyAuthority;approval:SourceApproval;
 issuerPool:Pool;authSecret:string;pool:Pool;tlsHost:string;review:unknown;readKey:()=>unknown;
}>;
export type Provenance=Readonly<{
 version:'oracle-native-mint/1';acquisition:'native_https'|'synthetic_fixture';
 transportAuthentication:'fixed_host_tls_validated'|'local_fixture_only';
 host:'mainnet.helius-rpc.com';network:'solana-mainnet';account:string;method:'getAccountInfo';encoding:'base64';
 commitment:'requested_finalized';contextSlot:string;slotTime:null;
 requestId:string;requestSha256:string;responseSha256:string;accountDataSha256:string;responseBytes:number;accountBytes:number;
 requestStartedAt:string;receivedAt:string;evaluatedAt:string;httpDate:string;
 policyHash:string;reviewHash:string;lookupId:string;leaseId:string;
 finalityAssurance:'rpc_reported_under_finalized_request_not_independent_replay';identityBinding:'server_request_account_not_echoed_by_response';
 admission:'owner_verified_global_reserve_and_finish';decoder:'oracle-onchain/1';maxResponseBytes:65536;maxAccountBytes:8192;maxTlvs:32;
}>;
declare const brand:unique symbol;
/** Only this producer, after original-byte validation + durable finish + owner reverify, can issue one. */
export type NativeMintObservation=Readonly<{[brand]:true}>;
export type Reason='sources_off'|'admission_denied'|'rate_limited'|'exhausted'|'stopped'|'stop_uncertain'|'timeout'|'invalid_response'|'unavailable'|'uncertain';
export type Result=Readonly<{state:'sources_off'|'gray'|'synthetic_fixture'|'observed';reason:Reason|null;observation:NativeMintObservation|null}>;
export type Source=Readonly<{inspect(request:Request,mint:unknown):Promise<Result>;stop(request:Request,mint:unknown):Promise<Result>}>;
export type ObservationView=Readonly<{controls:Controls;source:Provenance}>;
