import 'server-only';
import {analyzeNativeEvidence,qualifyHolderCapture} from '../native-evidence/index';
import {inspectHolderEvidence} from '../v4-oracle/holders/decode';
import {createNativePilot,NATIVE_PILOT_ENABLED,NATIVE_PILOT_BUILD,verifiedNativeObservation,type Configuration} from '../native-pilot/index';
import type {RawBatch} from '../native-pilot/engine';
import type {NativeEvidenceInputV1} from '../native-evidence/contract';
/** Actual A intake; original host/method/bytes/clocks/rights are retained unchanged.
 * Helius currently fails A's inherited host check. No relabel, fourth read or stub. */
export function nativeIntake(raw:RawBatch):NativeEvidenceInputV1|null{
 const holderEvidence=qualifyHolderCapture({kind:raw.kind,network:'solana-mainnet-beta',mint:raw.mint,evaluatedAt:raw.evaluatedAt,
  rights:{analysis:'approved_private',reviewSha256:raw.rightsReviewSha256},selection:raw.selection,snapshot:raw.snapshot,clock:raw.clock});
 if(!inspectHolderEvidence(holderEvidence)?.sample)return null;
 return Object.freeze({mint:raw.mint,evaluatedAt:raw.evaluatedAt,holderEvidence});
}
export type NativeLensConfiguration=Omit<Configuration,'intake'|'analyze'>;
/** B retains all owner/identity/ledger/wire/STOP authority. OFF reads no config. */
export function createIntegratedNativePilot(config:NativeLensConfiguration){
 if(!NATIVE_PILOT_ENABLED||!NATIVE_PILOT_BUILD)return createNativePilot(config as Configuration);
 return createNativePilot({...config,intake:nativeIntake,analyze:analyzeNativeEvidence});
}
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
/** No configuration loader or credential/storage initializer exists in this draft.
 * The route is OFF before import. Even a later flag edit alone cannot activate it. */
export async function nativePilotResponse(request:Request,config?:NativeLensConfiguration):Promise<Response>{
 if(!config)return Response.json({error:'native_pilot_unconfigured'},{status:503,headers});
 const pilot=createIntegratedNativePilot(config),intent=request.headers.get('x-unfarmd-native-intent');
 if(request.method!=='POST'||!['inspect','stop'].includes(intent??''))return Response.json({error:'native_pilot_held'},{status:503,headers});
 if(intent==='stop'){
  const r=await pilot.stop(request);
  if(r.status==='stopped')return Response.json({status:'stopped',activate:false},{headers});
 }else{
  const r=await pilot.inspect(request);
  if(r.status==='observation'){
   const original=await verifiedNativeObservation(r.observation);
   // Candidates, copies, forged booleans and injected transports cannot reach this response.
   if(original)return Response.json(original.evidence,{headers});
  }
 }
 return Response.json({error:'native_pilot_held'},{status:503,headers});
}
