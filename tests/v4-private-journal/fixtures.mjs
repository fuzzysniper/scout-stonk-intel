// SYNTHETIC ONLY. Keys/passwords/assertions generated in memory or ephemeral /tmp; never user data.
import {createRequire} from 'node:module';
import {generateKeyPairSync,sign,randomUUID,randomBytes} from 'node:crypto';
import path from 'node:path';
const require=createRequire(import.meta.url),build=process.env.JOURNAL_BUILD;
export const {OwnerAuthority}=require(path.join(build,'lib/v4-private-journal/auth.js'));
export const {PostgresJournalRepository}=require(path.join(build,'lib/v4-private-journal/repository.js'));
export const crypto=require(path.join(build,'lib/v4-private-journal/crypto.js'));
export const {privateJournalStorage,PRIVATE_JOURNAL_APPROVAL}=require(path.join(build,'lib/v4-private-journal/index.js'));
export const MINT='So11111111111111111111111111111111111111112',OTHER='11111111111111111111111111111111';
export function auth(){
 const pair=generateKeyPairSync('ed25519'),issuer='https://synthetic.invalid/auth',kid='synthetic-ephemeral';
 const trust={issuer,audience:'unfarmd-private-journal',keys:new Map([[kid,pair.publicKey]])},authority=new OwnerAuthority(trust);
 const token=(owner,patch={},header={})=>{
  const sec=Math.floor(Date.now()/1000),h={alg:'EdDSA',typ:'JWT',kid,...header},p={iss:issuer,aud:trust.audience,sub:owner,iat:sec,nbf:sec,exp:sec+299,jti:randomUUID(),...patch};
  const wire=[h,p].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');return wire+'.'+sign(null,Buffer.from(wire),pair.privateKey).toString('base64url');
 };return {authority,token,trust,pair,principal:owner=>authority.verify(token(owner),Date.now())};
}
export function keyring(){
 const owners=new Map();let version='ephemeral-v1',calls=0;
 const keys=async(owner,id=version)=>{calls++;let ring=owners.get(owner);if(!ring){ring=new Map();owners.set(owner,ring);}if(!ring.has(id))ring.set(id,randomBytes(32));return {id,key:ring.get(id)};};
 return {keys,rotate(){version='ephemeral-v2';},get calls(){return calls;}};
}
export const created=(thesis='SYNTHETIC ONLY invented hypothesis')=>({kind:'created',content:{thesis,invalidation:null,contradictions:null},fact_snapshot_refs:[]});
export const revised=()=>({...created('SYNTHETIC ONLY revised hypothesis'),kind:'revised'});
export const updated=()=>({kind:'updated',content:{note:'SYNTHETIC ONLY new counter-evidence'},fact_snapshot_refs:[]});
export const command=(patch={})=>({journalId:randomUUID(),mint:MINT,requestId:randomUUID(),expectedHead:null,change:created(),...patch});
