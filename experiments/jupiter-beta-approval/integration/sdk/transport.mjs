// Prepared bounded HTTPS sender; the shipped construction path is irrevocably OFF.
import release from '../release.json' with {type:'json'};
import {API,PATHS} from './requests.mjs';
import {json,need,fields} from '../json.mjs';
export function disconnected(){return Object.freeze({async send(){throw Error('beta_external_calls_disabled');}});}
export const deployedTransport=()=>{if(release.externalCallsEnabled!==false)throw Error('unreviewed_release');return disconnected();};
export function boundedTransport(dispatch){
 // Dependency-injected dispatcher, no global fetch or SDK network method. Deployed
 // entrypoints NEVER provide one. Tests pass in-memory Response objects only.
 return Object.freeze({async send(signed,kind){
  need(Object.hasOwn(PATHS,kind)&&fields(signed,['url','body','stamp'])&&signed.url===API+PATHS[kind]&&typeof signed.body==='string'&&Buffer.byteLength(signed.body)<=20000);
  need(fields(signed.stamp,['stampHeaderName','stampHeaderValue'])&&['X-Stamp','X-Stamp-Webauthn'].includes(signed.stamp.stampHeaderName)&&signed.stamp.stampHeaderValue.length<8192);
  const controller=new AbortController();let timer;try{
   const timeout=new Promise((_,no)=>{timer=setTimeout(()=>{controller.abort();no(Error('beta_timeout'));},3000);});
   const work=(async()=>{const r=await dispatch(signed.url,{method:'POST',redirect:'error',credentials:'omit',cache:'no-store',headers:{'content-type':'application/json',[signed.stamp.stampHeaderName]:signed.stamp.stampHeaderValue},body:signed.body,signal:controller.signal});
    need(r.status===200&&!r.redirected&&r.headers.get('content-type')?.startsWith('application/json'));const reader=r.body?.getReader();need(reader);let length=0;const parts=[];try{for(;;){const x=await reader.read();if(x.done)break;length+=x.value.length;need(length<=65536);parts.push(x.value);}}finally{await reader.cancel().catch(()=>{});}return new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(parts));})();
   const raw=await Promise.race([work,timeout]);return {raw,value:json(raw)};
  }catch{controller.abort();throw Error('beta_provider_unavailable');}finally{clearTimeout(timer);}
 }});
}
