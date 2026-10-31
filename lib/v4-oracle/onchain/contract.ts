import type {RiskFinding} from '../../v4-owner-preview/view-contract';
export type {RiskFinding};
export type CaptureKind='synthetic_fixture'|'recorded_response';
export type Capture=Readonly<{
 kind:CaptureKind; network:'solana-mainnet'; endpointHost:'mainnet.helius-rpc.com'|'api.mainnet-beta.solana.com';
 method:'getAccountInfo'; encoding:'jsonParsed'|'base64'; commitment:'finalized'; mint:string; id:number;
 requestStartedAt:string; receivedAt:string; evaluatedAt:string; httpDate:string|null; httpStatus:number; text:string;
}>;
export type Provenance=Readonly<{
 kind:CaptureKind; network:'solana-mainnet'; endpointHost:Capture['endpointHost']; method:'getAccountInfo'; encoding:Capture['encoding'];
 account:string; commitment:'finalized'; contextSlot:string; requestStartedAt:string; receivedAt:string; evaluatedAt:string; httpDate:string|null;
 responseSha256:string; accountDataSha256:string|null; assurance:'captured_rpc_report_not_independently_replayed';
 providerAuthenticated:false; identityBinding:'captured_request_not_echoed_by_account_response'; decoder:'oracle-onchain/1'; maxAccountBytes:8192;
}>;
export type TransferFee=Readonly<{epoch:string;maximumFeeRaw:string;basisPoints:number}>;
export type Controls=Readonly<{
 program:'spl_token'|'token_2022'; ownerProgram:string; initialized:true; decimals:number; rawSupply:string;
 mintAuthority:string|null; freezeAuthority:string|null;
 permanentDelegate:string|null; transferHook:Readonly<{authority:string|null;programId:string|null}>|null;
 transferFee:Readonly<{configAuthority:string|null;withdrawWithheldAuthority:string|null;withheldRaw:string;older:TransferFee;newer:TransferFee}>|null;
 defaultAccountState:'initialized'|'frozen'|null; nonTransferable:boolean; pausable:Readonly<{authority:string|null;paused:boolean}>|null;
 mintCloseAuthority:string|null; extensionTypes:readonly number[]; unsupported:readonly number[];
 extensionCoverage:'complete_reviewed'|'incomplete_or_unsupported';
}>;
declare const evidenceBrand:unique symbol;
/** Opaque immutable decoder result. JSON/casts/copies cannot create admitted evidence or claim native authenticity. */
export type OnchainEvidence=Readonly<{[evidenceBrand]:true}>;
export type JupiterReport=Readonly<{
 mint:string;sourceUpdatedAt:string;receivedAt:string;responseSha256:string;
 mintAuthorityDisabled?:boolean;freezeAuthorityDisabled?:boolean;tokenProgram?:string;decimals?:number;
}>;
export type RiskInput=Readonly<{mint:unknown;evaluatedAt:string;onchain?:OnchainEvidence|null;jupiter?:JupiterReport|null}>;
