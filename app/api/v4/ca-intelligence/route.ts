import {internalMarketPreview} from '../../../../lib/v4-ca-intelligence/private-development-gate';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
const headers={
  'Cache-Control':'private, no-store',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
};
const off=()=>Response.json({error:'private_development_off'},{status:503,headers});
const unavailable=(stage:'source_module'|'source_execution'|'oracle_module'|'oracle_execution')=>
  Response.json({error:'inspection_unavailable'},{status:503,headers:{...headers,'X-UNFARMD-INSPECT-STAGE':stage}});
/**
 * The parent private Preview eagerly loads source + Oracle native/holder modules
 * when Vercel initializes its function. Dynamically importing each fixed code
 * module at request time lets the handler return a safe stage code rather than
 * an uncaught 500 if the serverless runtime cannot initialize a dependency.
 * The existing exact Vercel deployment admission precedes all these imports.
 * No user-controlled module name, URL, credential, retry, fallback or new source.
 */
export async function POST(request:Request):Promise<Response>{
 if(!internalMarketPreview())return off();
 let inspect:typeof import('../../../../lib/v4-ca-intelligence/private-development').inspectPrivateDevelopment;
 try{({inspectPrivateDevelopment:inspect}=await import('../../../../lib/v4-ca-intelligence/private-development'));}
 catch{return unavailable('source_module');}
 let result:Response;
 try{result=await inspect(request);}catch{return unavailable('source_execution');}
 if(!result.ok)return result;
 let compose:typeof import('./compose-preview').composePreviewResponse;
 try{({composePreviewResponse:compose}=await import('./compose-preview'));}
 catch{return unavailable('oracle_module');}
 try{return await compose(result);}catch{return unavailable('oracle_execution');}
}
export const GET=off;
