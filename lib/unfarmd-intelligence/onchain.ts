import {decodeResponse,type CapturedMintResponse} from '../onchain-mint/decoder';
import type {FactCard,FactValue,SourceEvidence,SourceProjection} from './contract';
import {admit,asset,hash,receiptFields} from './internal';
import {sourceFailure} from './source-off';

/** Offline bridge for A's ORIGINAL captured RPC bytes, not a transport or reader.
 * Fixed source designation is an UNATTESTED capture assertion; this entry cannot
 * label any receipt production_rpc or establish authentic Helius connectivity. */
export async function projectHeliusCapture(input:CapturedMintResponse):Promise<SourceProjection> {
  receiptFields(input,['mint','requestId','text','requestStartedAt','responseReceivedAt','evaluatedAt','captureKind'],['httpDate']);
  input=Object.freeze({...input}); // caller mutation across WebCrypto await cannot relabel capture/source
  const identity=asset(input.mint);
  if (!['recorded_response','synthetic_fixture'].includes(input.captureKind)) throw Error('invalid_acquisition');
  const decoded=await decodeResponse({...input,acquisition:input.captureKind,endpointHost:'mainnet.helius-rpc.com'});
  if (!decoded.source||!decoded.facts) {
    const reason=decoded.status==='not_a_supported_mint_account'?'unsupported':
      ['timeout','stale_source','invalid_clock'].includes(decoded.reason)?decoded.reason as 'timeout'|'stale_source'|'invalid_clock':'invalid_response';
    return sourceFailure('helius-solana-rpc',identity.mint,reason);
  }
  const f=decoded.facts,s=decoded.source,unsupported=decoded.status==='unsupported_extensions';
  const baseEvidence={asset:identity,provider:'helius-solana-rpc' as const,acquisition:input.captureKind,
    originVerification:'capture_origin_not_independently_attested' as const,
    assurance:s.assurance,endpoint:'https://mainnet.helius-rpc.com/',evidenceUrl:`https://explorer.solana.com/address/${identity.mint}`,
    responseSha256:s.responseSha256,requestStartedAt:s.requestStartedAt,fetchedAt:s.responseReceivedAt,
    observedAt:null,observationTime:'unknown' as const,contextSlot:s.contextSlot,commitment:s.commitment};
  const evidence:SourceEvidence={id:'evidence:'+hash(baseEvidence),...baseEvidence,retrievalFreshness:'recent'};
  const card=(id:FactCard['id'],fact:FactValue,color:FactCard['assessment']['color'],reason:string):FactCard=>({
    id,provider:'helius-solana-rpc',state:'observed',fact,evidenceRef:evidence.id,
    assessment:{color:unsupported?'grey':color,rule:'rpc_reported_mint_field_v1',reason:unsupported?'extension_review_required':reason}});
  return admit({version:'unfarmd-source-projection/1',asset:identity,provider:'helius-solana-rpc',evidence,pool:null,
    facts:[card('mint_authority',{kind:'authority',...f.mintAuthority},f.mintAuthority.state==='present'?'red':'green',f.mintAuthority.state==='present'?'active_base_mint_authority':'base_mint_authority_absent_not_safety_clearance'),
      card('freeze_authority',{kind:'authority',...f.freezeAuthority},f.freezeAuthority.state==='present'?'red':'green',f.freezeAuthority.state==='present'?'active_base_freeze_authority':'base_freeze_authority_absent_not_safety_clearance'),
      card('program',{kind:'program',program:f.program,address:f.ownerProgram},f.program==='token_2022'?'yellow':'green',f.program==='token_2022'?'token_2022_requires_extension_context':'original_spl_mint_program'),
      card('supply',{kind:'integer_supply',...f.supply},'grey','raw_mint_supply_not_circulating_supply')]});
}
