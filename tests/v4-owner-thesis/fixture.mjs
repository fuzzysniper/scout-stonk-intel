// LOCAL ONLY: actual signed Better Auth cookie + native TLS PG, ephemeral J keys.
import {createRequire} from 'node:module';
import {generateKeyPairSync,randomBytes,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fixture as aFixture,cookie,SECRET,SESSION,TOKEN,OWNER,OTHER_OWNER,HOST,ORIGIN,MINTS} from '../v4-owner-ledger/fixtures.mjs';
import {keyring} from '../v4-private-journal/fixtures.mjs';
const load=createRequire(import.meta.url),build=process.env.JOURNAL_BUILD;
export const {OwnerAuthority}=load(build+'/lib/v4-private-journal/auth.js');
export const {PostgresJournalRepository}=load(build+'/lib/v4-private-journal/repository.js');
export const {PostgresThesisRate}=load(build+'/lib/v4-thesis-api/rate.js');
export const {createThesisHandler}=load(build+'/lib/v4-thesis-api/handler.js');
export const {createOwnerThesisBridge}=load(build+'/lib/v4-owner-thesis/bridge.js');
export {cookie,SECRET,SESSION,TOKEN,OWNER,OTHER_OWNER,HOST,ORIGIN};
export const MINT=MINTS[0],JOURNAL_OWNER='33333333-3333-4333-8333-333333333333';
export async function fixture(origin=ORIGIN){
 const a=await aFixture(),ring=keyring(),pair=generateKeyPairSync('ed25519'),csrfKey=randomBytes(32),issuer='https://journal-delegation.synthetic.invalid',kid='local-ephemeral';
 await a.db.owner.query(readFileSync('lib/v4-private-journal/schema.sql','utf8'));await a.db.owner.query(readFileSync('lib/v4-thesis-api/rate.sql','utf8'));
 const password=randomBytes(24).toString('hex');await a.db.owner.query(`CREATE ROLE c231_journal LOGIN PASSWORD '${password}';GRANT unfarmd_journal_app,unfarmd_thesis_rate_app TO c231_journal`);
 async function reset(){await a.reset();await a.db.owner.query('TRUNCATE unfarmd_journal.owners CASCADE;TRUNCATE unfarmd_thesis_rate.usage');await a.db.owner.query('UPDATE unfarmd_v4_owner.policy SET journal_owner_id=$1,audience=$2',[JOURNAL_OWNER,origin]);await a.db.owner.query('UPDATE public.v4_owner_session SET audience=$1',[origin]);}
 async function session(owner=OWNER){const id=randomBytes(18).toString('base64url'),token=randomBytes(24).toString('base64url');await a.db.owner.query('INSERT INTO public.v4_owner_session(id,token,"userId","expiresAt","createdAt","updatedAt",issuer,audience) VALUES($1,$2,$3,$4,$5,$5,$6,$7)',[id,token,owner,new Date(Date.now()+240000),new Date(Date.now()-100), 'unfarmd-v4-owner-issuer-227',origin]);return {id,token,cookie:cookie(token)};}
 function request(s,path='/api/v4/theses?mint='+MINT,method='GET',body,headers={}){return new Request(origin+path,{method,headers:{...(s?{cookie:typeof s==='string'?s:s.cookie}:{}),origin,'sec-fetch-site':'same-origin','x-unfarmd-v4-owner-intent':'journal',...(body===undefined?{}:{'content-type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});}
 function app(overrides={}){
  const authority=new OwnerAuthority({issuer,audience:'unfarmd-private-journal',keys:new Map([[kid,pair.publicKey]])});
  const repository=new PostgresJournalRepository(a.pool('c231_journal',{password,max:4}),ring.keys,authority),rate=new PostgresThesisRate(a.pool('c231_journal',{password,max:4}),authority);
  const boundary=a.boundary({journalOwnerId:JOURNAL_OWNER,audience:origin});
  const bridge=createOwnerThesisBridge({boundary,authority,delegationIssuer:issuer,kid,signingKey:pair.privateKey,csrfKey,csrfRate:rate,...overrides.bridge});
  const handler=createThesisHandler({origin,owners:bridge.owners,authority,repository,rate,...overrides.handler});
  return {authority,repository,rate,boundary,bridge,handler};
 }
 return {a,ring,pair,csrfKey,issuer,kid,origin,reset,session,request,app,close:a.close};
}
export const body=()=>({journalId:randomUUID(),mint:MINT,requestId:randomUUID(),thesis:'SYNTHETIC original idea',invalidation:'SYNTHETIC evidence against'});
