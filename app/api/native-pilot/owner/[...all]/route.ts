import {NATIVE_SETUP_RUNTIME_ENABLED} from '../../../../../lib/native-pilot/admission/gates';
export const runtime='nodejs';export const dynamic='force-dynamic';export const revalidate=0;
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
async function owner(request:Request){
 if(!NATIVE_SETUP_RUNTIME_ENABLED)return Response.json({error:'native_pilot_off'},{status:503,headers});
 const {nativeRequestAllowed}=await import('../../../../../lib/native-pilot/runtime/request');
 if(!nativeRequestAllowed(request,true))return Response.json({error:'native_request_denied'},{status:403,headers});
 const {loadApprovedNativeOwnerAccess}=await import('../../../../../lib/native-pilot/admission/configuration'),access=await loadApprovedNativeOwnerAccess();
 if(!access)return Response.json({error:'native_owner_unavailable'},{status:503,headers});
 try{return await access.handler(request);}finally{await access.close().catch(()=>{});}
}
export const GET=owner;export const POST=owner;
