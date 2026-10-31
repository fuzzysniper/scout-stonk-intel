import {inspectPrivateDevelopment} from '../../../../lib/v4-ca-intelligence/private-development';
import {internalMarketPreview} from '../../../../lib/v4-ca-intelligence/private-development-gate';
import {composeOracleResponse} from './compose-oracle';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
const off=()=>Response.json({error:'private_development_off'},{status:503,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
// Source-only internal-development branch: no owner DB, auth issuer, or journal
// is mounted through this route. Do not reuse this branch for a signed Save release.
export const POST=(request:Request):Promise<Response>|Response=>internalMarketPreview()?inspectPrivateDevelopment(request).then(response=>composeOracleResponse(response)):off();
export const GET=off;
