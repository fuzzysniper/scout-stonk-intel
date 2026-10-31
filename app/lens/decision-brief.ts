import type {RiskFinding} from '../../lib/v4-owner-preview/view-contract';
import {availableFindings,nextVerification,prioritize,riskDisplay,type LensView} from './intelligence-model';
import {observedMintFor} from './oracle-evidence';

/** Editorial navigation, not a token verdict, probability or financial calculation. */
export function decisionBrief(view:LensView) {
  const findings=prioritize(availableFindings(view)),reds=findings.filter(f=>f.tone==='red');
  const unknowns=findings.filter(f=>f.tone==='gray');
  const reported=view.facts.filter(f=>f.status==='reported'&&f.value!==null);
  const test=view.state==='offline_fixture'||view.state==='offline_replay'
    ||findings.some(f=>f.tone!=='gray'&&/synthetic|fixture|replay/i.test((f.source??'')+' '+f.title))
    ||reported.some(f=>f.captureKind==='synthetic_fixture'||f.captureKind==='recorded_response');
  const jupiter=findings.filter(f=>f.tone!=='gray'&&/jupiter/i.test(f.source??''));
  const native=test?null:observedMintFor(view.oracleEvidence);
  const identityMissing=['not_found','unsupported','unverified'].includes(view.identity)&&!native;
  const primary=(identityMissing?unknowns.find(f=>f.id==='onchain-mint-identity'||f.id==='ui-rug-unavailable'):undefined)??unknowns[0];
  const nativeControls=native?findings.filter(f=>f.tone!=='gray'&&['onchain-mint-authority','onchain-freeze-authority'].includes(f.id)&&observedMintFor(view.oracleEvidence,f)):[];
  const controls=native?nativeControls:jupiter.filter(f=>['mint-authority','freeze-authority'].includes(f.id));
  let known:string;
  if(controls.length)known=controls.map(f=>f.title+': '+riskDisplay(f)).join(' · ');
  else if(native)known='One supported mint account observed at an RPC-reported finalized context. Other controls need separate evidence.';
  else if(reported.length)known=`${reported.length} market ${reported.length===1?'fact':'facts'} returned. These reports do not establish token safety or continuing demand.`;
  else known='No usable token facts were returned. An address format alone does not establish token existence.';
  const source=test?'TEST / REPLAY · NOT LIVE':native?'Solana RPC OBSERVED · snapshot':jupiter.length||reported.some(f=>/jupiter/i.test(f.source??''))?'Jupiter REPORTED':'Source unavailable';
  const next=identityMissing?'Verify the exact token address and network. Missing from this source does not prove that a mint is invalid.':primary&&/lp-custody|lp-control/.test(primary.id)?'Establish who controls withdrawals from this pool. A liquidity total does not answer that question.':primary?nextVerification(primary):'Review source scope, freshness and every warning before relying on a narrow positive. No overall safety conclusion is available.';
  const knownFindings=controls.length?controls:native?findings.filter(f=>f.id==='onchain-mint-identity'):jupiter.slice(0,1);
  return {reds,primary,unknownCount:unknowns.length,known,source,next,identityMissing,test,native,knownFindings,knownFacts:native||controls.length?[]:reported.slice(0,1)};
}

export function identityCaption(view:LensView):string {
  if(observedMintFor(view.oracleEvidence))return 'Mint account observed; issuer/name unverified.';
  if(view.identity==='provider_reported')return 'Provider-reported identity.';
  if(view.identity==='rpc_reported_mint')return 'Source-reported mint identity.';
  if(view.identity==='not_found')return 'Not indexed here; identity unverified.';
  if(view.identity==='unsupported')return 'Unsupported account; facts withheld.';
  return 'Token identity not established.';
}

export function briefFindingTitle(f:RiskFinding):string {
  if(f.id==='onchain-lp-custody'||f.id==='lp-control')return 'Who can remove the liquidity?';
  if(f.id==='onchain-mint-identity'||f.id==='ui-rug-unavailable')return 'Token identity and controls are unverified';
  if(f.id==='onchain-exit-route')return 'An executable exit has not been checked';
  if(f.id==='farming-exits')return 'Early-wallet selling is not established';
  return f.title;
}
