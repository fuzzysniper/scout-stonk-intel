import 'server-only';
import {json} from '../../../experiments/jupiter-beta-approval/integration/json.mjs';
import {need} from '../plan';
/** Native-only specialization of the reviewed bounded peer. Never imports legacy beta endpoint selectors. */
export function checkpointPeer(origin:string,dispatch:typeof fetch){
 const u=new URL(origin);need(u.protocol==='https:'&&u.origin===origin&&!u.username&&!u.password&&!u.port);
 return async(path:string,body:unknown)=>{
  need(['/native-checkpoint/read','/native-checkpoint/advance'].includes(path));const abort=new AbortController();let timer:NodeJS.Timeout|undefined;
  try{return await Promise.race([(async()=>{
   const request=JSON.stringify(body);need(Buffer.byteLength(request)<=4096);
   const r=await dispatch(origin+path,{method:'POST',redirect:'error',credentials:'omit',cache:'no-store',headers:{'content-type':'application/json',origin},body:request,signal:abort.signal});
   need(r.status===200&&!r.redirected&&r.body);const reader=r.body.getReader(),parts:Uint8Array[]=[];let size=0,chunks=0;
   try{for(;;){const x=await reader.read();if(x.done)break;size+=x.value.length;need(size<=4096&&++chunks<=32);parts.push(x.value);}}finally{await reader.cancel().catch(()=>{});}
   return json(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)));
  })(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('native_checkpoint_held'));},750);})]);}
  catch{throw Error('native_checkpoint_held');}finally{clearTimeout(timer);}
 };
}
