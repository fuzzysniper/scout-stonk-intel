import 'server-only';
/** No factory, auth, env, key or storage imports: preview cannot be armed. */
export const THESIS_APPROVAL=Object.freeze({enabled:false,notBeforeMs:null,expiresAtMs:null} as const);
export function installedThesisRoute(){return Response.json({error:'storage_off',saved:false},{status:503,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Origin','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});}
