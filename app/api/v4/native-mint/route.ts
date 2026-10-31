import {nativeDispatch} from '../../../../lib/v4-oracle/mount/dispatch';
import {nativeError} from '../../../../lib/v4-oracle/mount/http';
export const runtime='nodejs';export const dynamic='force-dynamic';export const revalidate=0;
export const POST=(request:Request)=>nativeDispatch(request);
export const GET=()=>nativeError('native_not_admitted');
