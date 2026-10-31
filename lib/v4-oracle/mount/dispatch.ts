import 'server-only';
import {configuredMountPlan,inspectMountPlan} from './admission';
import {safeNativeRequest,nativeError} from './http';
/** Isolated function only. Never imported by the reviewed Jupiter CA route. */
export async function nativeDispatch(request:Request,owner=false):Promise<Response>{
 const plan=configuredMountPlan(true,request),p=inspectMountPlan(plan,true);if(!plan||!p)return nativeError('native_not_admitted');
 if(!safeNativeRequest(request,p.record.identity.origin,owner))return nativeError('native_request_denied',403);
 try{const {bootstrapNativeMount}=await import('./bootstrap'),runtime=bootstrapNativeMount(plan);if(!runtime)return nativeError('native_installation_unavailable');return await(owner?runtime.owner(request):runtime.inspect(request));}
 catch{return nativeError('native_unavailable');}
}
