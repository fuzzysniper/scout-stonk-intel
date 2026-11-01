import type {PublicTrust,Identity,Held,Verified} from './contract.mjs';
export declare function verifyV3(text:string,t:PublicTrust,now:number,actualIdentity:Identity):Held|Verified;
