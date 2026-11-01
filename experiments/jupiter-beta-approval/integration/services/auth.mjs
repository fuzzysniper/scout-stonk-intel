import {createHmac,timingSafeEqual} from 'node:crypto';
import {canonical,need,uuid} from '../json.mjs';
export function serviceAuth(key,role){
 need(Buffer.isBuffer(key)&&key.length===32&&['consumer','anchor'].includes(role));
 const mac=body=>createHmac('sha256',key).update('UNFARMD:BETA:SERVICE:1\0'+role+'\0'+canonical(body)).digest('hex');
 return Object.freeze({stamp:body=>({role,mac:mac(body)}),verify(body,stamp,now){try{need(stamp?.role===role&&/^[a-f0-9]{64}$/.test(stamp.mac)&&uuid(body.operationId)&&Number.isSafeInteger(body.timestamp)&&body.timestamp<=now&&now-body.timestamp<=60000);return timingSafeEqual(Buffer.from(stamp.mac,'hex'),Buffer.from(mac(body),'hex'));}catch{return false;}}});
}
