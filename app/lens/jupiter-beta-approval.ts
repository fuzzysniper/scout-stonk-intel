import {isJupiterBetaEnvelope,isJupiterBetaRecord,JUPITER_BETA_MAX_BYTES,type JupiterBetaRecord} from '../../lib/v4-ca-intelligence/jupiter-beta-contract';
export type UnverifiedJupiterCarrier=Readonly<{encoded:string;expiresAt:number}>;
/** Syntax/privacy only. NEVER calls the server, verifies a signature, or enables sources. */
export function parseJupiterCarrier(encoded:unknown,now=Date.now()):UnverifiedJupiterCarrier|null{
 try{if(typeof encoded!=='string'||encoded.length>11000||!/^[A-Za-z0-9_-]+$/.test(encoded))return null;
  const binary=atob(encoded.replaceAll('-','+').replaceAll('_','/'));if(binary.length>JUPITER_BETA_MAX_BYTES||btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')!==encoded)return null;
  const text=new TextDecoder('utf8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0))),e:unknown=JSON.parse(text);
  if(!isJupiterBetaEnvelope(e)||JSON.stringify(e)!==text)return null;
  const record:unknown=JSON.parse(e.payload);if(!isJupiterBetaRecord(record)||JSON.stringify(record)!==e.payload)return null;
  const r:JupiterBetaRecord=record;if(now<r.startsAt||now>=r.expiresAt)return null;
  return Object.freeze({encoded,expiresAt:r.expiresAt});
 }catch{return null;}
}
