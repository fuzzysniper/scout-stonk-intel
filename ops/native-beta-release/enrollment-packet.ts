/** Private operator input only. The public installation commits a digest, never
 * owner identity, mint scope, password or the complete research policy. */
import {canonical} from '../../experiments/jupiter-beta-approval/integration/json.mjs';
import {parsePacket} from '../../lib/trader-pulse/validation';
import {digest,hash,need,policy,type Policy} from '../../lib/native-pilot/plan';
type Configuration=Readonly<{authSecretSha256:string;caSha256:string;expiresAt:number;ownerEmail:string;policy:Policy}>;
export function privateEnrollment(selection:unknown,text:string,now=Date.now()):Readonly<{configuration:Configuration;password:string}>{
 const s=selection as {version:string;mode:string;sourceGo:boolean;configuration:{planSha256:string}};
 need(s&&Object.keys(s).sort().join(',')==='configuration,mode,sourceGo,version'&&s.version==='native-owner-enrollment/1'&&s.mode==='installed'&&s.sourceGo===false);
 need(s.configuration&&Object.keys(s.configuration).join(',')==='planSha256'&&digest(s.configuration.planSha256));
 need(typeof text==='string'&&Buffer.byteLength(text)<=8192);parsePacket(text);const packet=JSON.parse(text) as {configuration:Configuration;password:string};
 need(packet&&Object.keys(packet).sort().join(',')==='configuration,password');const c=packet.configuration;
 need(c&&Object.keys(c).sort().join(',')==='authSecretSha256,caSha256,expiresAt,ownerEmail,policy'&&hash(canonical(c))===s.configuration.planSha256);
 need(digest(c.authSecretSha256)&&digest(c.caSha256)&&Number.isSafeInteger(now)&&Number.isSafeInteger(c.expiresAt)&&c.expiresAt>now&&c.expiresAt-now<=900000);
 need(typeof c.ownerEmail==='string'&&c.ownerEmail===c.ownerEmail.toLowerCase()&&c.ownerEmail.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.ownerEmail));
 need(typeof packet.password==='string'&&packet.password.length>=16&&packet.password.length<=128);
 return {configuration:{...c,policy:policy(c.policy)},password:packet.password};
}
