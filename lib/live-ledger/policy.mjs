import { createHash } from 'node:crypto';
export const POLICY = Object.freeze({
  version: 'scout-live/1', program: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  maxSessionSeconds: 3600, leaseSeconds: 12, connections: 3, rpc: 40,
  framesPerConnection: 20000, bytesPerConnection: 16777216,
  rpcResponseBytes: 1048576, retentionSeconds: 3600, maxRecords: 200,
});
export const SCOPE = createHash('sha256').update(JSON.stringify(POLICY)).digest('hex');
export const PROGRAMS = Object.freeze(['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb']);
export const QUOTES = Object.freeze(['So11111111111111111111111111111111111111112','EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v']);
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function exactBase58(s, bytes) {
  if (typeof s !== 'string' || s.length > 88 || !s.length) return false;
  let n = 0n;
  for (const c of s) { const d=alphabet.indexOf(c); if(d<0)return false; n=n*58n+BigInt(d); }
  let count=0; for(let p=n;p>0n;p>>=8n)count++;
  for(const c of s){if(c!=='1')break;count++;}
  return count===bytes;
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const hash=/^[a-f0-9]{64}$/;
const clock=v=>typeof v==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v)&&Number.isFinite(Date.parse(v));
const keys=(v,want)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===want.split(',').sort().join(',');
export function validEvent(e) {
  if(!keys(e,'signature,slot,receivedAt,source,program,notificationHash,finality,mint,quoteMint,tokenProgram,transactionHash,verificationHash,checkedAt,blockTime'))return false;
  if(!exactBase58(e.signature,64)||!Number.isSafeInteger(e.slot)||e.slot<1||!clock(e.receivedAt)||e.source!=='helius_standard'||e.program!==POLICY.program||!hash.test(e.notificationHash))return false;
  if(e.finality==='provisional')return ['mint','quoteMint','tokenProgram','transactionHash','verificationHash','checkedAt','blockTime'].every(k=>e[k]===null);
  return e.finality==='rpc_reported_finalized'&&exactBase58(e.mint,32)&&QUOTES.includes(e.quoteMint)&&e.mint!==e.quoteMint&&PROGRAMS.includes(e.tokenProgram)&&hash.test(e.transactionHash)&&hash.test(e.verificationHash)&&clock(e.checkedAt)&&(e.blockTime===null||clock(e.blockTime))&&Date.parse(e.checkedAt)>=Date.parse(e.receivedAt)&&(e.blockTime===null||Date.parse(e.blockTime)<=Date.parse(e.checkedAt));
}
export function validCommand(c) {
  if(!c||c.v!==1||!uuid.test(c.session)||c.scope!==SCOPE||!/^[0-9a-f]{40}$/.test(c.head)||!uuid.test(c.worker))return false;
  const base='v,op,session,scope,head,worker';
  if(c.op==='claim')return keys(c,base);
  if(!uuid.test(c.fence))return false;
  const b=base+',fence';
  switch(c.op){
    case 'reserve':return keys(c,b+',resource')&&['connection','rpc'].includes(c.resource);
    case 'append':return keys(c,b+',event')&&validEvent(c.event);
    case 'heartbeat':return keys(c,b+',framesReceived,bytesReceived')&&['framesReceived','bytesReceived'].every(k=>Number.isSafeInteger(c[k])&&c[k]>=0);
    case 'gap':return keys(c,b+',reason')&&['disconnect','verification_failed','invalid_message','transport_error'].includes(c.reason);
    case 'release':return keys(c,b+',connectionClosed,terminal')&&c.connectionClosed===true&&typeof c.terminal==='boolean';
    case 'stop':return keys(c,b+',reason')&&['owner','budget','storage','shutdown','uncertain'].includes(c.reason);
    default:return false;
  }
}
