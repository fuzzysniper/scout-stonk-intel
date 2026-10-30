// LOCAL FIXTURE ONLY. Real enrollment/password/sign-in, native TLS/PLUS and J crypto/SQL.
import {createRequire} from 'node:module';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';
import {createHash,generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import {fixture as packageFixture} from '../v4-journal-deployment/fixture.mjs';
import {keyring} from '../v4-private-journal/fixtures.mjs';
const load=createRequire(import.meta.url),build=process.env.JOURNAL_BUILD;
const {OwnerReleaseAuthority,BASE_MIGRATION}=load(build+'/lib/v4-owner-preview/release.js');
const {createOwnerIssuer}=load(build+'/lib/v4-owner-preview/auth.js');
const {createVerifiedOwnerBoundary}=load(build+'/lib/v4-owner-ledger/auth.js');
const {createOwnerThesisBridge}=load(build+'/lib/v4-owner-thesis/bridge.js');
const {OwnerAuthority}=load(build+'/lib/v4-private-journal/auth.js');
const {PostgresJournalRepository}=load(build+'/lib/v4-private-journal/repository.js');
const {PostgresThesisRate}=load(build+'/lib/v4-thesis-api/rate.js');
const {createThesisHandler}=load(build+'/lib/v4-thesis-api/handler.js');
export {OwnerReleaseAuthority,createOwnerIssuer};
export const OWNER='11111111-1111-4111-8111-111111111111',JOWNER='33333333-3333-4333-8333-333333333333';
export const MINT='So11111111111111111111111111111111111111112';
export async function fixture(){
 const db=await packageFixture(),secret=randomBytes(48).toString('hex'),releasePair=generateKeyPairSync('ed25519'),jPair=generateKeyPairSync('ed25519'),ring=keyring();
 try{db.migrate();await db.owner.query(readFileSync('ops/v4-owner-auth/issuer.sql','utf8'));await db.enable();
  const password=randomBytes(32).toString('hex');for(const role of ['issuer','enroll'])await db.owner.query('ALTER ROLE unfarmd_v4_'+role+"_login LOGIN PASSWORD '"+password+"'");
  const identity={kind:'local_fixture',origin:'https://localhost',commit:execFileSync('git',['rev-parse','HEAD']).toString().trim(),project:'local-synthetic-project',deployment:'local-synthetic-deployment'};
  const sqlSha=createHash('sha256').update(readFileSync('ops/v4-owner-auth/issuer.sql')).digest('hex'),trust=new OwnerReleaseAuthority(releasePair.publicKey,identity,sqlSha),now=Date.now();
  const record={version:'unfarmd-owner-preview/1',identity,ownerSubject:OWNER,journalOwnerId:JOWNER,issuer:'unfarmd-owner-preview-243',authSecretSha256:createHash('sha256').update(secret).digest('hex'),migrationSha256:BASE_MIGRATION,authSqlSha256:sqlSha,issuedAt:now-1000,expiresAt:now+3600000,protectionReviewed:true,sourceGo:false};
  const signed=patch=>{const payload=JSON.stringify({...record,...patch});return {payload,signature:sign(null,Buffer.from(payload),releasePair.privateKey).toString('base64url')};};
  const release=trust.admit(signed());if(!release)throw Error('synthetic_release_failed');
  await db.owner.query('INSERT INTO unfarmd_v4_owner.policy(owner_subject,journal_owner_id,issuer,audience,secret_sha256,enabled) VALUES($1,$2,$3,$4,$5,true)',[OWNER,JOWNER,record.issuer,identity.origin,record.authSecretSha256]);
  const pools=[];const pool=role=>{const p=db.pool('unfarmd_v4_'+role+'_login');if(role==='issuer'||role==='enroll')p.options.password=password;pools.push(p);return p;};
  // Password is supplied to pg as a data value before first connect; no credentials fetched.
  const issuerPool=pool('issuer'),enrollPool=pool('enroll');
  const issuer=createOwnerIssuer({authority:trust,release,pool:issuerPool,enrollmentPool:enrollPool,tlsHost:'localhost',secret});
  const email='owner@synthetic.invalid',passphrase='LOCAL_ONLY_243_'+randomBytes(20).toString('hex');
  function request(path,method='GET',body,cookie='',extra={}){return new Request(identity.origin+path,{method,headers:{origin:identity.origin,'sec-fetch-site':'same-origin',...(cookie?{cookie}:{}),...(body===undefined?{}:{'content-type':'application/json'}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});}
  const login=async()=>{const response=await issuer.handler(request('/api/v4/owner/sign-in/email','POST',{email,password:passphrase},'',{'x-unfarmd-owner-intent':'login'}));return {response,cookie:response.headers.getSetCookie().find(c=>c.startsWith('__Host-unfarmd-v4-owner='))?.split(';')[0]};};
  function app(){const authority=new OwnerAuthority({issuer:'https://delegation.synthetic.invalid',audience:'unfarmd-private-journal',keys:new Map([['local',jPair.publicKey]])}),boundary=createVerifiedOwnerBoundary({ownerSubject:OWNER,journalOwnerId:JOWNER,issuer:record.issuer,audience:identity.origin},secret,pool('auth'),'localhost');const repository=new PostgresJournalRepository(pool('journal'),ring.keys,authority),rate=new PostgresThesisRate(pool('journal'),authority),bridge=createOwnerThesisBridge({boundary,authority,delegationIssuer:'https://delegation.synthetic.invalid',kid:'local',signingKey:jPair.privateKey,csrfKey:Buffer.from(secret.slice(0,64)),csrfRate:rate});return {authority,boundary,repository,bridge,handler:createThesisHandler({origin:identity.origin,authority,owners:bridge.owners,repository,rate})};}
  return {db,trust,release,record,identity,signed,issuer,request,login,app,email,passphrase,secret,sqlSha,releasePair,async close(){await db.close();}};
 }catch(e){await db.close();throw e;}
}
