import {installedRoute} from '../../../../lib/v4-owner-preview/installed';
import {installedOwnerPreview} from '../../../../lib/v4-owner-preview/installed';
import {inspectPrivateDevelopment,internalMarketPreview} from '../../../../lib/v4-ca-intelligence/private-development';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const POST=async(request:Request):Promise<Response>=>{
 // A successfully signed private-owner release takes precedence over this dev-only lane.
 if(installedOwnerPreview()||!internalMarketPreview())return installedRoute('source')(request);
 return inspectPrivateDevelopment(request);
};
export const GET=installedRoute('source');
