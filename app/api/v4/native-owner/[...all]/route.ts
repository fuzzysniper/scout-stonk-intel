import {nativeDispatch} from '../../../../../lib/v4-oracle/mount/dispatch';
export const runtime='nodejs';export const dynamic='force-dynamic';export const revalidate=0;
export const GET=(request:Request)=>nativeDispatch(request,true);
export const POST=(request:Request)=>nativeDispatch(request,true);
