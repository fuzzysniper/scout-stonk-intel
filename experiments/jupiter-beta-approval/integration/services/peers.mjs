// Exact-origin private service RPC; no ambient credential, fallback, retry or redirect.
import {randomUUID} from 'node:crypto';
import {json,need} from '../json.mjs';
export function peer(origin,dispatch,timeoutMs=40000){need(Number.isInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=40000);const u=new URL(origin);need(u.origin===origin&&u.protocol==='https:'&&!u.username&&!u.port);return async(path,body)=>{
 need(['/submit','/stop','/anchor/read','/anchor/append','/reserve'].includes(path));const abort=new AbortController();let timer;try{return await Promise.race([(async()=>{
  const r=await dispatch(origin+path,{method:'POST',redirect:'error',credentials:'omit',cache:'no-store',headers:{'content-type':'application/json','origin':origin,'x-owner-intent':'review'},body:JSON.stringify(body),signal:abort.signal});need(r.status===200&&!r.redirected);let size=0;const parts=[],reader=r.body.getReader();try{for(;;){const x=await reader.read();if(x.done)break;size+=x.value.length;need(size<=65536);parts.push(x.value);}}finally{await reader.cancel().catch(()=>{});}return json(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(parts)));})(),new Promise((_,no)=>{timer=setTimeout(()=>{abort.abort();no(Error('beta_peer_timeout'));},timeoutMs);})]);
 }catch{throw Error('beta_peer_held');}finally{clearTimeout(timer);}
};}
export function remoteAnchor(call,auth,clock=Date.now){const run=async(path,data={})=>{const request={path,operationId:randomUUID(),timestamp:clock(),...data};const r=await call(path,{request,stamp:auth.stamp(request)});need(r.value);return r.value;};return Object.freeze({current:()=>run('/anchor/read'),advance:(expected,next)=>run('/anchor/append',{expected,next})});}
