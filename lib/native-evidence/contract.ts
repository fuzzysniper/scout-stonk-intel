/** Shared A/B/C boundary. Analytics only: no caller field can authenticate origin. */
import type {Controls,OnchainEvidence} from '../v4-oracle/onchain/contract';
import type {HolderEvidence} from '../v4-oracle/holders/contract';
export type {Controls};
export type CandidateKind='synthetic_fixture'|'recorded_response';
export type RatioV1=Readonly<{numeratorRaw:string;denominatorRaw:string;basisPointsFloor:string|null}>;
export type EvidenceReferenceV1=Readonly<{
 id:string;kind:CandidateKind;providerHost:string;
 method:'getAccountInfo'|'getTokenLargestAccounts'|'getMultipleAccounts'|'getBlockTime'|'getTransaction';
 requestSha256:string|null;responseSha256:string;accountDataSha256:string|null;fieldPath:string;
 requestStartedAt:string;receivedAt:string;contextSlot:string|null;
 commitmentRequested:'finalized'|null;
 commitmentEvidence:'request_only_not_independent_finality_proof'|'not_in_method';
 blockTime:Readonly<{slot:string;utc:string;assurance:'rpc_block_time_estimate'}>|null;
}>;
export type NativeFindingV1=Readonly<{
 id:string;rule:'native-controls/1'|'native-concentration/1'|'native-transfers/1'|'native-coverage/1';
 state:'candidate'|'not_established';tone:'red'|'yellow'|'green'|'gray';title:string;summary:string;
 evidenceIds:readonly string[];limitations:readonly string[];
}>;
export type OwnerGroupV1=Readonly<{
 /** Token-account owner authority address, NOT token program, person, beneficial owner or cluster. */
 ownerAddress:string;accounts:readonly string[];amountRaw:string;shareOfSupply:RatioV1;evidenceIds:readonly string[];
}>;
export type ConcentrationV1=Readonly<{
 state:'candidate'|'not_established';reason:string;
 supplyRaw:string|null;decimals:number|null;selectionSlot:string|null;balanceSlot:string|null;
 selectionCount:number;observedAccountCount:number;selectionAmountsChanged:number;
 atomicAcrossCalls:false;minContextSlotIsLowerBoundOnly:true;fullHolderCoverage:false;beneficialOwnership:'unknown';
 population:'previously_selected_largest_token_accounts_only';exclusions:readonly never[];
 selectedTotal:RatioV1|null;largestObservedAccount:RatioV1|null;largestObserved10Accounts:RatioV1|null;
 accounts:readonly Readonly<{account:string;ownerAddress:string;amountRaw:string;selectionAmountRaw:string;state:'initialized'|'frozen';evidenceId:string}>[];
 ownerGroups:readonly OwnerGroupV1[];
}>;
/** B may eventually supply decoded transaction candidates. This is NOT a transaction parser or native attestation. */
export type DecodedTransferV1=Readonly<{
 signature:string;instructionIndex:number;slot:string;blockTime:string;
 mint:string;program:string;fromTokenAccount:string;toTokenAccount:string;instructionAmountRaw:string;
 succeeded:true;reference:EvidenceReferenceV1;
}>;
export type TransferWindowV1=Readonly<{
 kind:CandidateKind;mint:string;fromUtc:string;toUtc:string;
 scope:'supplied_transactions_only';enumeration:'complete_declared_scope'|'partial'|'unknown';
 parser:'reviewed_spl_transfer_candidate_v1'|'unsupported';events:readonly DecodedTransferV1[];
}>;
export type TransfersV1=Readonly<{
 state:'candidate'|'not_established';reason:string;fromUtc:string|null;toUtc:string|null;
 scope:'supplied_transactions_only';completeWalletHistory:false;beneficialOwnership:'unknown';
 instructionCount:number;instructionAmountRaw:string|null;
 edges:readonly Readonly<{fromTokenAccount:string;toTokenAccount:string;instructionAmountRaw:string;instructionCount:number;evidenceIds:readonly string[]}>[];
}>;
export type NativeEvidenceInputV1=Readonly<{
 mint:unknown;evaluatedAt:string;
 /** Only original process-local decoder capabilities accepted. JSON/plain copies are not evidence. */
 mintEvidence?:OnchainEvidence|unknown;holderEvidence?:HolderEvidence|unknown;transfers?:TransferWindowV1|unknown;
}>;
export type NativeEvidenceV1=Readonly<{
 version:'native-evidence/1';mint:string|null;evaluatedAt:string|null;state:'candidate'|'unavailable';
 origin:Readonly<{status:'candidate_only';providerAuthenticated:false;label:'SYNTHETIC OFFLINE'|'RECORDED / ORIGIN UNVERIFIED'|'MIXED OFFLINE CANDIDATES'|'NO QUALIFIED EVIDENCE'}>;
 controls:Controls|null;
 mintSnapshot:Readonly<{contextSlot:string;supplyRaw:string;decimals:number;evidenceId:string}>|null;
 consistency:'not_compared'|'same_mint_snapshot'|'different_context'|'conflict';
 concentration:ConcentrationV1;transfers:TransfersV1;
 findings:readonly NativeFindingV1[];references:readonly EvidenceReferenceV1[];
 coverage:Readonly<{
 fullHolderCoverage:false;beneficialOwnership:'unknown';suspectedRelationships:'not_established';
 accountClassifications:'not_supplied_no_exclusions';price:'not_established';momentum:'not_established';
 exitCapacity:'not_established';walletHistory:'not_established';
 }>;
}>;
/** Intended entry: analyzeNativeEvidence(input): NativeEvidenceV1 (synchronous, deterministic).
 * qualifyMintCapture = original decodeOnchainCapture; qualifyHolderCapture = original decodeHolderCapture.
 * Output is candidate_only FOREVER. B must establish acquisition/rights/admission separately,
 * binding original bytes/references; no source flag, hash, URL, JSON cast or timestamp upgrades this result.
 * C must retain origin/coverage labels even for green control findings. Missing/unsupported -> GRAY.
 * Ratios use BigInt raw quantities, no Number money arithmetic. Transfer input <=64 events/1h.
 */
