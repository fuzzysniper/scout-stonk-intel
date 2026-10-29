// LOCAL ONLY: exact #236 renderer/strict roles + #235 real owner/J bridge + #234 producer.
import {createRequire} from 'node:module';
import {createHash,generateKeyPairSync,randomBytes} from 'node:crypto';
import {Pool} from 'pg';
import {fixture as packageFixture} from '../v4-journal-deployment/fixture.mjs';
import {cookie,SECRET,OWNER,OTHER_OWNER,MINTS,createVerifiedOwnerBoundary,prepareProfile} from '../v4-owner-ledger/fixtures.mjs';
import {wrapOwnerKey,unwrapOwnerKey} from '../../ops/v4-journal/envelope.mjs';
export {cookie,OWNER,OTHER_OWNER,MINTS};
export const MINT=MINTS[0],JOURNAL_OWNER='33333333-3333-4333-8333-333333333333';
const load=createRequire(import.meta.url),build=process.env.JOURNAL_BUILD;
const {OwnerAuthority}=load(build+'/lib/v4-private-journal/auth.js');
const {PostgresJournalRepository}=load(build+'/lib/v4-private-journal/repository.js');
const {PostgresThesisRate}=load(build+'/lib/v4-thesis-api/rate.js');
const {createThesisHandler}=load(build+'/lib/v4-thesis-api/handler.js');
const {createOwnerThesisBridge}=load(build+'/lib/v4-owner-thesis/bridge.js');
const {createPostgresPilotLedger}=load(build+'/lib/v4-owner-ledger/ledger.js');
const {createHeliusNative}=load(build+'/lib/v4-helius-native/index.js');
const {createLocalFixtureProducer}=load(build+'/lib/v4-helius-native/testing.js');
export async function fixture(origin='https://localhost'){
 const db=await packageFixture(),pools=[],pair=generateKeyPairSync('ed25519'),csrfKey=randomBytes(32),issuer='https://delegation.synthetic.invalid',kid='local-final';
 const kek={id:'local-kek-237',key:randomBytes(32)},wrapped=new Map();let keyCalls=0;
 try{
  db.migrate();
  const initialRoles=(await db.owner.query("SELECT rolname,rolcanlogin FROM pg_roles WHERE rolname ~ '^unfarmd_v4_(journal|auth|pilot|erasure|stopper)_login$' ORDER BY rolname")).rows;
  if(initialRoles.length!==5||initialRoles.some(r=>r.rolcanlogin))throw Error('package_not_OFF');
  // Only disposable fixture roles and invented policies. No installed application selection.
  await db.enable();const t=Date.now(),identityIssuer='unfarmd-v4-owner-issuer-227';
  const prepared=prepareProfile({id:'synthetic-final-237',origin,ownerSubject:OWNER,identityIssuer,startsAt:t-1000,expiresAt:t+600000,mints:MINTS,creditsPerAttempt:2,maxCredits:20});
  const profile=prepared.profile,hash=prepared.hash;
  await db.owner.query('INSERT INTO unfarmd_v4_pilot.policy(profile_text,hash,owner_subject,starts_ms,expires_ms,mints,credit_debit,credit_limit) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8)',[JSON.stringify(profile),hash,OWNER,profile.startsAt,profile.expiresAt,JSON.stringify(MINTS),2,20]);
  await db.owner.query('INSERT INTO unfarmd_v4_pilot.state(singleton) VALUES(true)');
  await db.owner.query('INSERT INTO unfarmd_v4_owner.policy(owner_subject,journal_owner_id,issuer,audience,secret_sha256,enabled) VALUES($1,$2,$3,$4,$5,true)',[OWNER,JOURNAL_OWNER,identityIssuer,origin,createHash('sha256').update(SECRET).digest('hex')]);
  for(const id of [OWNER,OTHER_OWNER])await db.owner.query('INSERT INTO public.v4_owner_user(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,\'SYNTHETIC LOCAL ONLY\',$2,true,now(),now())',[id,id+'@synthetic.invalid']);
  const pool=role=>{const p=new Pool({...db.config('unfarmd_v4_'+role+'_login'),max:role==='journal'?2:1});p.on('error',()=>{});pools.push(p);return p;};
  const keys=async(owner,id='local-dek-237')=>{keyCalls++;const tag=owner+':'+id;if(!wrapped.has(tag))wrapped.set(tag,wrapOwnerKey(owner,{id,key:randomBytes(32)},kek));return unwrapOwnerKey(owner,wrapped.get(tag),kek);};
  async function session(owner=OWNER){const id=randomBytes(18).toString('base64url'),token=randomBytes(24).toString('base64url');await db.owner.query('INSERT INTO public.v4_owner_session(id,token,"userId","expiresAt","createdAt","updatedAt",issuer,audience) VALUES($1,$2,$3,$4,$5,$5,$6,$7)',[id,token,owner,new Date(Date.now()+240000),new Date(Date.now()-100),identityIssuer,origin]);return {id,token,cookie:cookie(token)};}
  function request(s,path='/api/v4/theses?mint='+MINT,method='GET',body,headers={}){return new Request(origin+path,{method,headers:{...(s?{cookie:s.cookie}:{}),origin,'sec-fetch-site':'same-origin','x-unfarmd-v4-owner-intent':'journal',...(body===undefined?{}:{'content-type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});}
  function app(){
   const authority=new OwnerAuthority({issuer,audience:'unfarmd-private-journal',keys:new Map([[kid,pair.publicKey]])});
   const boundary=createVerifiedOwnerBoundary({ownerSubject:OWNER,journalOwnerId:JOURNAL_OWNER,issuer:identityIssuer,audience:origin},SECRET,pool('auth'),'localhost');
   const repository=new PostgresJournalRepository(pool('journal'),keys,authority),rate=new PostgresThesisRate(pool('journal'),authority);
   const bridge=createOwnerThesisBridge({boundary,authority,delegationIssuer:issuer,kid,signingKey:pair.privateKey,csrfKey,csrfRate:rate});
   return {authority,boundary,repository,rate,bridge,handler:createThesisHandler({origin,owners:bridge.owners,authority,repository,rate})};
  }
  function producer(app,wire){return createLocalFixtureProducer(profile,{owner:app.boundary,ledger:createPostgresPilotLedger(pool('pilot'),'localhost',profile),readProviderKey:()=> 'SYNTHETIC_LOCAL_ONLY_237_NO_PROVIDER_KEY',now:Date.now,monotonic:()=>performance.now()},wire);}
  return {db,profile,hash,initialRoles,session,request,app,producer,publicProducer:createHeliusNative(),get keyCalls(){return keyCalls;},async state(){return (await db.owner.query('SELECT reads,attempts,credits::text,stopped,lease,fence FROM unfarmd_v4_pilot.state')).rows[0];},async close(){await Promise.all(pools.map(p=>p.end()));await db.close();}};
 }catch(e){await Promise.all(pools.map(p=>p.end()));await db.close();throw e;}
}
