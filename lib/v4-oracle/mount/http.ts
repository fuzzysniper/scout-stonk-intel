import 'server-only';
export const nativeHeaders={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Vary':'Cookie, Origin'};
export const nativeError=(error:string,status=503)=>Response.json({error},{status,headers:nativeHeaders});
/** External path/host/intent admission before the heavy native/issuer stack. */
export function safeNativeRequest(request:Request,origin:string,owner=false):boolean{
 try{const u=new URL(request.url),host=new URL(origin).host,status=owner&&u.pathname==='/api/v4/native-owner/status';
  if(u.search||u.hash||u.username||u.password||request.signal.aborted||request.headers.get('host')!==host
   ||request.headers.has('x-forwarded-host')&&request.headers.get('x-forwarded-host')!==host
   ||request.headers.has('x-forwarded-proto')&&request.headers.get('x-forwarded-proto')!=='https'
   ||!(u.protocol==='https:'&&u.origin===origin||u.protocol==='http:'&&request.headers.get('x-forwarded-proto')==='https')
   ||request.headers.get('sec-fetch-site')!=='same-origin'||(status?request.headers.has('origin')&&request.headers.get('origin')!==origin:request.headers.get('origin')!==origin)
   ||['authorization','x-owner-id','x-owner-subject','x-owner-email','x-api-key','helius-api-key','x-rpc-url','purpose','sec-purpose','content-encoding'].some(k=>request.headers.has(k)))return false;
  let bytes=0;request.headers.forEach((v,k)=>bytes+=Buffer.byteLength(k+v)+4);if(bytes>16384)return false;
  const length=request.headers.get('content-length');if(length!==null&&(!/^\d{1,4}$/.test(length)||Number(length)>(owner?2048:256)))return false;
  if(owner){const paths=['/api/v4/native-owner/status','/api/v4/native-owner/sign-in/email','/api/v4/native-owner/sign-out'];return paths.includes(u.pathname)&&request.method===(status?'GET':'POST')&&request.headers.get('x-unfarmd-owner-intent')===(status?'status':u.pathname.endsWith('/sign-out')?'logout':'login');}
  return u.pathname==='/api/v4/native-mint'&&request.method==='POST'&&request.headers.get('x-unfarmd-ca-intent')==='inspect'&&request.headers.get('content-type')==='application/json';
 }catch{return false;}
}
export function canonicalRequest(request:Request,origin:string,path:string):Request{const headers=new Headers(request.headers);headers.delete('x-unfarmd-native-approval');return new Request(origin+path,{method:request.method,headers,signal:request.signal,...(request.body?{body:request.body,duplex:'half'}:{} )}as RequestInit);}
