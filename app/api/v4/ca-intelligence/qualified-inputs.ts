import 'server-only';
import {verifiedNativeMintObservation,projectNativeMintRisk,type NativeMintObservation} from '../../../../lib/v4-oracle/native-mint';
import {inspectHolderEvidence,type HolderEvidence} from '../../../../lib/v4-oracle/holders';
import {projectOnchainRisk} from '../../../../lib/v4-oracle/onchain';
import type {OracleEvidence} from '../../../lens/oracle-evidence';

/** Server-only handoff. These process-local capabilities cannot arrive as HTTP JSON.
 * Acquisition is deliberately NOT selected here: no config, key, SQL or wire call.
 */
export type QualifiedInputs=Readonly<{nativeMint?:NativeMintObservation|null;holderSample?:HolderEvidence|null}>;
export function qualifiedInputs(mint:string,evaluatedAt:string,input:QualifiedInputs={}) {
 const native=verifiedNativeMintObservation(input.nativeMint);
 const match=native?.source.account===mint?native:null;
 const onchain=match?projectNativeMintRisk({mint,evaluatedAt,observation:input.nativeMint}):projectOnchainRisk({mint,evaluatedAt,onchain:null,jupiter:null});
 const captured=inspectHolderEvidence(input.holderSample);
 // B's sealed candidate explicitly has providerAuthenticated:false. Never forward
 // candidate.analysis or its fixture colors as real-source farming evidence.
 const oracleEvidence:OracleEvidence={version:'oracle-evidence/1',mint,
  nativeMint:match&&onchain.some(f=>f.tone!=='gray')?{
   state:'observed',account:match.source.account,program:match.controls.ownerProgram,host:match.source.host,
   method:match.source.method,encoding:match.source.encoding,commitment:match.source.commitment,
   contextSlot:match.source.contextSlot,slotTime:null,requestStartedAt:match.source.requestStartedAt,
   receivedAt:match.source.receivedAt,evaluatedAt:match.source.evaluatedAt,httpDate:match.source.httpDate,
   requestSha256:match.source.requestSha256,responseSha256:match.source.responseSha256,accountDataSha256:match.source.accountDataSha256,
   requestId:match.source.requestId,responseBytes:match.source.responseBytes,accountBytes:match.source.accountBytes,decoder:match.source.decoder
  }:{state:'unavailable',reason:input.nativeMint?'not_verified':'not_selected'},
  holders:{state:'unavailable',reason:captured?'candidate_not_authenticated':'receipt_bridge_not_admitted',maxAccounts:20,fullHolderCoverage:false,beneficialOwnership:'unknown',atomicAcrossCalls:false}};
 // Explicit field selection above excludes owner lookup/lease/policy capabilities.
 return {onchain,oracleEvidence};
}
