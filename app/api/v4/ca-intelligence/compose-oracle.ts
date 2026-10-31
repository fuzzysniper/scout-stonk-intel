import 'server-only';
import {isExactPublicKey} from '../../../../lib/onchain-mint/validation';
import {isInspectView,type InspectView} from '../../../../lib/v4-owner-preview/view-contract';
import {unknownRiskFindings} from '../../../../lib/v4-ca-intelligence/risk-evidence';
import {projectOnchainRisk} from '../../../../lib/v4-oracle/onchain';
import {analyzeFarmEvidence,type FarmAnalysis} from '../../../../lib/v4-oracle/farming';

export type OracleView=InspectView & Readonly<{farmEvidence:FarmAnalysis}>;

/** Compose the reviewed PURE projectors. No acquisition, transport or admission here.
 * Jupiter aggregates cannot supply independent mint bytes or wallet histories.
 * evaluatedAt is calculation time, NEVER a missing source timestamp.
 */
export function composeOracle(view:InspectView,evaluatedAt:string):OracleView {
  const farmEvidence=analyzeFarmEvidence({mint:view.mint,asOf:evaluatedAt});
  const onchain=projectOnchainRisk({mint:view.mint,evaluatedAt,onchain:null,jupiter:null});
  return {...view,riskFindings:[...(view.riskFindings??unknownRiskFindings()),...onchain,...farmEvidence.findings],farmEvidence};
}

/** Original response/denials stay intact; only a valid current source view is extended. */
export async function composeOracleResponse(response:Response,evaluatedAt=new Date().toISOString()):Promise<Response> {
  if(!response.ok)return response;
  try {
    const value:unknown=await response.clone().json();
    if(!value||typeof value!=='object'||!('mint' in value)||!isExactPublicKey(value.mint)||!isInspectView(value,value.mint))return response;
    const headers=new Headers(response.headers);headers.delete('Content-Length');
    return new Response(JSON.stringify(composeOracle(value,evaluatedAt)),{status:response.status,statusText:response.statusText,headers});
  } catch {return response;}
}
