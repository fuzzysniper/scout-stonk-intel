// Framework-neutral Node handlers; no app/ route, automatic source or credential load.
import fs from 'node:fs';
import {record,rawBody,context} from '../contract.mjs';
import {json,need,fields,denied} from '../json.mjs';
export function handlers({role,origin,publicTrust,validator,consumer,anchor,anchorAuth,consumerAuth,forward,clock=Date.now,ready=()=>false}){
 need(['owner','validator','authority'].includes(role));let active=0;
 return async(req,res)=>{
  let admitted=false;const headers={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"};
  const reply=(status,value)=>{if(!res.destroyed&&!res.headersSent){res.writeHead(status,headers);res.end(JSON.stringify(value));}};
  try{
   need(req.headers.host===new URL(origin).host&&!req.headers.authorization&&!req.headers['x-api-key']);const u=new URL(req.url,origin);need(!u.search&&!u.hash);
   if(role==='owner'&&req.method==='GET'&&['/','/owner.js','/owner.css'].includes(u.pathname)){const name=u.pathname==='/'?'index.html':u.pathname.slice(1),type=name.endsWith('html')?'text/html':name.endsWith('js')?'text/javascript':'text/css';res.writeHead(200,{...headers,'content-type':type+'; charset=utf-8'});return res.end(fs.readFileSync(new URL('../node_modules/.cache/owner/'+name,import.meta.url)));}
   if(req.method==='GET'&&u.pathname==='/health')return reply(200,{status:ready()?'configured_not_activated':'setup_held',activate:false,sourceCalls:false});
   if(role==='owner'&&req.method==='GET'&&u.pathname==='/public'){if(!ready())return reply(503,denied());return reply(200,{context:context(publicTrust),activate:false,sourceCalls:false});}
   // Hold BEFORE reading request body, keys, provider adapters, database or disk.
   if(!ready())return reply(503,denied());need(req.method==='POST'&&req.headers['content-type']==='application/json'&&active<4);active++;admitted=true;
   let body;try{const parts=[];let size=0,count=0;const timer=setTimeout(()=>req.destroy(),1000);try{for await(const chunk of req){size+=chunk.length;need(size<=65536&&++count<=256);parts.push(chunk);}}finally{clearTimeout(timer);}body=json(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(parts)));}finally{}
   if(role==='owner'){
    need(req.headers.origin===origin&&req.headers['x-owner-intent']==='review'&&req.headers['sec-fetch-site']!=='cross-site');
    if(u.pathname==='/prepare'){need(fields(body,['record']));const t=context(publicTrust);record(body.record,t,clock());return reply(200,{body:rawBody(body.record,t,clock()),activate:false,sourceCalls:false});}
    if(u.pathname==='/submit'||u.pathname==='/stop'){need(fields(body,['signed']));return reply(200,await forward(u.pathname,body.signed));}
    if(u.pathname==='/anchor/read'||u.pathname==='/anchor/append'){need(fields(body,['request','stamp'])&&anchorAuth.verify(body.request,body.stamp,clock()));need(body.request.path===u.pathname);const value=u.pathname==='/anchor/read'?await anchor.current():await anchor.advance(body.request.expected,body.request.next);return reply(200,{value,activate:false,sourceCalls:false});}
   }
   if(role==='validator'&&u.pathname==='/submit'){need(fields(body,['signed']));return reply(200,await validator.submit(body.signed));}
   if(role==='authority'&&u.pathname==='/reserve'){need(fields(body,['request','stamp'])&&body.request.path==='/reserve'&&consumerAuth.verify(body.request,body.stamp,clock()));return reply(200,await consumer.reserve(body.request));}
   if(role==='authority'&&u.pathname==='/stop'){need(fields(body,['signed']));return reply(200,await consumer.stop(body.signed));}
   return reply(400,denied());
  }catch{return reply(400,denied());}finally{if(admitted)active--;}
 };
}
