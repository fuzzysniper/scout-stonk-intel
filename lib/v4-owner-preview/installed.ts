import 'server-only';
import {bootstrapOwnerPreview} from './bootstrap';
import type {OwnerPreview} from './runtime';
let attempted=false,runtime:OwnerPreview|null=null;
export function installedOwnerPreview(){if(!attempted){attempted=true;runtime=bootstrapOwnerPreview();}return runtime?.available()?runtime:null;}
export function installedRoute(kind:'journal'|'owner'|'source'){
 return async(request:Request)=>{const active=installedOwnerPreview();if(active)return active.handler(request);
  // OFF before even reading request/url/body/cookie or any credentials/database/source port.
  return Response.json(kind==='journal'?{error:'storage_off',saved:false}:{error:'private_preview_not_admitted'},{status:503,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
 };
}
