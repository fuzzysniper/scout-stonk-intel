// Server/owner-PC only. Fixed provider hosts/methods, no URL overrides, retries or redirects.
import https from 'node:https';
import {createHash} from 'node:crypto';
import {uuid,reason,digest} from './policy.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function boundedRequest({host,path,method,headers={},body='',signal},request=https.request){
 return new Promise((resolve,reject)=>{
  let settled=false,timer;const fail=()=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);req?.destroy();reject(Error('ops_transport_unavailable'));};let req;
  const abort=()=>fail();
  if(signal?.aborted)return reject(Error('ops_transport_unavailable'));
  try{
   req=request({hostname:host,port:443,path,method,headers:{accept:'application/json',...headers,...(body?{'content-length':Buffer.byteLength(body)}:{})},rejectUnauthorized:true,minVersion:'TLSv1.2',servername:host,agent:false},res=>{
    if(res.statusCode<200||res.statusCode>=300||Number(res.headers['content-length'])>32768){res.destroy();return fail();}
    const chunks=[];let size=0;res.on('data',chunk=>{size+=chunk.length;if(size>32768){res.destroy();fail();}else chunks.push(chunk);});res.on('error',fail);res.on('aborted',fail);res.on('end',()=>{
     if(settled)return;try{const raw=Buffer.concat(chunks),json=raw.length?JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw)):null;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);resolve({status:res.statusCode,json,rawHash:sha(raw)});}catch{fail();}
    });
   });req.on('error',fail);timer=setTimeout(fail,5000);signal?.addEventListener('abort',abort,{once:true});req.end(body);
  }catch{fail();}
 });
}
export function notificationChannel({enabled=false,token,chatId,send=boundedRequest,now=()=>new Date().toISOString()}){
 // No token getter/call happens unless the caller explicitly constructs an enabled channel.
 if(!enabled)return Object.freeze({async deliver(){return {status:'disabled'};}});
 if(!/^\d{5,20}:[A-Za-z0-9_-]{30,100}$/.test(token??'')||!/^-[1-9]\d{0,19}$|^[1-9]\d{0,19}$/.test(chatId??''))throw Error('invalid_notification_configuration');
 return Object.freeze({async deliver(notice,{signal}={}){
  if(!uuid(notice?.parent)||!uuid(notice.id)||!reason(notice.reason))throw Error('invalid_notice');
  const started=Date.parse(now()),text=`UNFARMD ${notice.reason}\nParent ${notice.parent}\nNotice ${notice.id}\nCheck protected dashboard; STOP may require Render suspension.`;
  try{
   const r=await send({host:'api.telegram.org',path:'/bot'+token+'/sendMessage',method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chatId,text,protect_content:true,disable_notification:false}),signal});
   const m=r.json?.result;if(r.status!==200||r.json?.ok!==true||!digest(r.rawHash)||!Number.isSafeInteger(m?.message_id)||m.message_id<=0||String(m.chat?.id)!==chatId||!Number.isSafeInteger(m.date)||m.date*1000<started-30000||m.date*1000>Date.parse(now())+1000)throw 0;
   // API date is whole seconds; don't backdate the local acceptance clock and
   // falsely fail a SQL notice created in the same second. Keep BOTH clocks.
   return {status:'provider_accepted',deliveredAt:now(),providerAt:new Date(m.date*1000).toISOString(),receiptHash:r.rawHash,deviceDeliveryProven:false};
  }catch{throw Error('notification_delivery_uncertain');}
 }});
}
export function renderStop({enabled=false,service,token,send=boundedRequest}){
 if(!enabled)return Object.freeze({async suspend(){return {status:'disabled'};}});
 if(!/^srv-[a-z0-9]+$/.test(service??'')||!/^rnd_[A-Za-z0-9_-]{16,200}$/.test(token??''))throw Error('invalid_shutdown_configuration');
 return Object.freeze({async suspend({signal}={}){
  // Verify exact existing SCOUT worker BEFORE one POST, then one status read.
  // No discovery, credential/billing/deploy/resume APIs. Never touch an old bot.
  try{
   const args={host:'api.render.com',headers:{authorization:'Bearer '+token},signal};
   const before=await send({...args,path:'/v1/services/'+service,method:'GET'});
   const target=s=>s?.id===service&&s.type==='background_worker'&&s.repo==='https://github.com/fuzzysniper/scout-stonk-intel';
   if(before.status!==200||!target(before.json))throw 0;
   const accepted=await send({...args,path:'/v1/services/'+service+'/suspend',method:'POST'});
   if(accepted.status!==202)throw 0;
   const state=await send({...args,path:'/v1/services/'+service,method:'GET'});
   if(state.status!==200||!target(state.json)||state.json.suspended!=='suspended')throw 0;
   return {status:'suspended',service,receiptHash:sha(accepted.rawHash+state.rawHash),nativeSocketClosureProven:false};
  }catch{throw Error('shutdown_unconfirmed');}
 }});
}
