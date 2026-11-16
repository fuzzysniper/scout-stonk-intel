import {NATIVE_SETUP_RUNTIME_ENABLED} from '../../../lib/native-pilot/admission/gates';
import {NATIVE_LENS_SOURCE_ENABLED} from '../../../lib/native-lens/policy';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
/** OFF denial precedes all A/B/bootstrap/body/credential access.
 * B's exact owner-session path/intent contract is preserved, not proxied. */
export async function POST(request:Request):Promise<Response>{
 if(!NATIVE_LENS_SOURCE_ENABLED&&(!NATIVE_SETUP_RUNTIME_ENABLED||request.headers.get('x-unfarmd-native-intent')!=='stop'))return Response.json({error:'native_pilot_off'},{status:503,headers});
 const {nativeRequestAllowed}=await import('../../../lib/native-pilot/runtime/request');
 if(!nativeRequestAllowed(request))return Response.json({error:'native_request_denied'},{status:403,headers});
 const {nativePilotResponse}=await import('../../../lib/native-lens/boundary');
 return nativePilotResponse(request);
}
export async function GET():Promise<Response>{return Response.json({error:'native_pilot_off'},{status:503,headers});}
