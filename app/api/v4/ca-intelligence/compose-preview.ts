import 'server-only';
import {isExactPublicKey} from '../../../../lib/onchain-mint/validation';
import {isInspectView,type InspectView} from '../../../../lib/v4-owner-preview/view-contract';
import {unknownRiskFindings} from '../../../../lib/v4-ca-intelligence/risk-evidence';
import {projectOnchainRisk} from '../../../../lib/v4-oracle/onchain/project';
import {analyzeFarmEvidence,type FarmAnalysis} from '../../../../lib/v4-oracle/farming';
import type {OracleEvidence} from '../../../lens/oracle-evidence';

/**
 * The #265 Jupiter-only founder Preview has no native source producer or
 * holder receipt bridge selected. Compose its truthful market + 24 evidence
 * findings without importing the owner/source issuer, PostgreSQL, Better Auth,
 * native TLS or Helius producer into the Vercel read-only function.
 *
 * The fully qualified producer path stays intact at compose-oracle.ts, and can
 * only be mounted after separate reviewed source/admission/owner activation.
 */
type PreviewView=InspectView&Readonly<{farmEvidence:FarmAnalysis;oracleEvidence:OracleEvidence}>;
export function composePreview(view:InspectView,evaluatedAt:string):PreviewView{
 const farmEvidence=analyzeFarmEvidence({mint:view.mint,asOf:evaluatedAt});
 const onchain=projectOnchainRisk({mint:view.mint,evaluatedAt,onchain:null,jupiter:null});
 const oracleEvidence:OracleEvidence={
  version:'oracle-evidence/1',mint:view.mint,
  nativeMint:{state:'unavailable',reason:'not_selected'},
  holders:{state:'unavailable',reason:'receipt_bridge_not_admitted',
   maxAccounts:20,fullHolderCoverage:false,beneficialOwnership:'unknown',atomicAcrossCalls:false}
 };
 return {...view,riskFindings:[...(view.riskFindings??unknownRiskFindings()),...onchain,...farmEvidence.findings],
  farmEvidence,oracleEvidence};
}

/** Preserve denials and original security headers; no new source calls. */
export async function composePreviewResponse(response:Response,evaluatedAt=new Date().toISOString()):Promise<Response>{
 if(!response.ok)return response;
 try{
  const value:unknown=await response.clone().json();
  if(!value||typeof value!=='object'||!('mint'in value)||!isExactPublicKey(value.mint)||!isInspectView(value,value.mint))return response;
  const headers=new Headers(response.headers);headers.delete('Content-Length');
  return new Response(JSON.stringify(composePreview(value,evaluatedAt)),{
   status:response.status,statusText:response.statusText,headers});
 }catch{return response;}
}
