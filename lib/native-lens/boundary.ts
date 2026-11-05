import 'server-only';
import {NATIVE_SETUP_RUNTIME_ENABLED} from '../native-pilot/admission/gates';
import {analyzeNativeEvidence,intakeHeliusBatch} from '../native-evidence/index';
import {createNativePilot,createNativeStopper,NATIVE_PILOT_ENABLED,NATIVE_PILOT_BUILD,verifiedNativeObservation,type Configuration} from '../native-pilot/index';
import type {RawBatch} from '../native-pilot/engine';
import type {NativeEvidenceInputV1} from '../native-evidence/contract';
/** Direct exact A Helius intake. No relabel, decoder/capability duplication or fourth read. */
export function nativeIntake(raw:RawBatch):NativeEvidenceInputV1|null{return intakeHeliusBatch(raw);}
export type NativeLensConfiguration=Omit<Configuration,'intake'|'analyze'>;
/** B retains all owner/identity/ledger/wire/STOP authority. OFF reads no config. */
export function createIntegratedNativePilot(config:NativeLensConfiguration){
 if(!NATIVE_PILOT_ENABLED||!NATIVE_PILOT_BUILD)return createNativePilot(config as Configuration);
 return createNativePilot({...config,intake:nativeIntake,analyze:analyzeNativeEvidence});
}
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
/** Compiled admission pins are HARD-OFF. Native-only loader requires authentic setup AND source review. */
export async function nativePilotResponse(request:Request,provided?:NativeLensConfiguration):Promise<Response>{
 const intent=request.headers.get('x-unfarmd-native-intent');
 if(request.method!=='POST'||!['inspect','stop'].includes(intent??''))return Response.json({error:'native_pilot_held'},{status:503,headers});
 const owned=!provided,config=provided??(NATIVE_SETUP_RUNTIME_ENABLED?await import('../native-pilot/admission/configuration').then(m=>m.loadApprovedNativeConfiguration(intent!=='stop')):null);
 if(!config)return Response.json({error:'native_pilot_unconfigured'},{status:503,headers});
 try{
  if(intent==='stop'){
   const r=await createNativeStopper(config).stop(request);
   if(r.status==='stopped')return Response.json({status:'stopped',activate:false},{headers});
  }else if(config.sourceAdmission){
   const r=await createIntegratedNativePilot({...config,sourceAdmission:config.sourceAdmission}).inspect(request);
   if(r.status==='observation'){
    const original=await verifiedNativeObservation(r.observation);
    if(original)return Response.json(original.evidence,{headers});
   }
  }
  return Response.json({error:'native_pilot_held'},{status:503,headers});
 }catch{return Response.json({error:'native_pilot_held'},{status:503,headers});}finally{if(owned)await config.issuerPool.end().catch(()=>{});}
}
