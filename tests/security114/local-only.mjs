// Test-process egress guard, inherited by the Next/Vite browser QA servers.
// No production import. Existing dated records and labeled offline fixtures only.
import http from 'node:http';
import https from 'node:https';
import {syncBuiltinESMExports} from 'node:module';
const allowed=new Set(['127.0.0.1','localhost','[::1]','::1']);
const check=host=>{if(!allowed.has(host))throw Error('OFFLINE_QA_EXTERNAL_REQUEST_BLOCKED');};
const nativeFetch=globalThis.fetch;
globalThis.fetch=(input,init)=>{
 const u=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 check(u.hostname);return nativeFetch(input,init);
};
for(const mod of [http,https]){
 const original=mod.request;
 mod.request=function(input,...args){
  const isUrl=typeof input==='string'||input instanceof URL;
  const url=isUrl?new URL(input):null;
  const options=isUrl?(typeof args[0]==='object'?args[0]:{}):input;
  check(options?.hostname||options?.host||url?.hostname||'localhost');
  return original.call(this,input,...args);
 };
 mod.get=function(...args){const req=mod.request(...args);req.end();return req;};
}
syncBuiltinESMExports();
