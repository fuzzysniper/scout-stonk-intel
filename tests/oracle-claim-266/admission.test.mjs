// LOCAL SYNTHETIC controls only. Ephemeral test signer, never the owner's key.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module,{createRequire} from 'node:module';
import crypto from 'node:crypto';
const require=createRequire(import.meta.url),build=process.env.ORACLE_CLAIM_BUILD;
const {OwnerReleaseAuthority,BASE_MIGRATION}=require(build+'/lib/v4-owner-preview/release.js');
const {SourcePolicyAuthority,sourceHash}=require(build+'/lib/v4-owner-preview/source-policy.js');
const {AUTH_SQL_SHA,SOURCE_SQL_SHA}=require(build+'/lib/v4-owner-preview/sql-pins.js');
const {OWNER_RELEASE_PUBLIC_KEY_PEM,VERCEL_PROJECT_ID}=require(build+'/lib/v4-owner-preview/trust.js');
const gate=require(build+'/lib/v4-oracle/mount/admission.js');
const {POST}=require(build+'/app/api/v4/native-mint/route.js');
const BRANCH='integration/271-oracle-native-source-reviewed';

test('integrated forged approval reaches original Ed25519 and rejects before bootstrap; same packet passes local original-authority controls',async()=>{
 const beforeEnv=process.env,originalVerify=crypto.verify,originalLoad=Module._load,calls=[],credentialReads=[],heavyAttempts=[];
 const signer=crypto.generateKeyPairSync('ed25519'); // discarded after this test; no installed trust/configuration.
 const now=Date.now(),identity={kind:'private_preview',commit:'a'.repeat(40),deployment:'dpl_LOCAL271CONTROL',project:VERCEL_PROJECT_ID,origin:'https://scout-stonk-intel-local-control-riskledgerapp.vercel.app'};
 const record={version:'unfarmd-owner-preview/1',identity,ownerSubject:'11111111-1111-4111-8111-111111111111',journalOwnerId:'33333333-3333-4333-8333-333333333333',issuer:'LOCAL_SYNTHETIC_OWNER',authSecretSha256:sourceHash('LOCAL synthetic auth hash, not a credential'),migrationSha256:BASE_MIGRATION,authSqlSha256:AUTH_SQL_SHA,issuedAt:now-1000,expiresAt:now+120000,protectionReviewed:true,sourceGo:false};
 const digest=sourceHash('LOCAL SYNTHETIC RIGHTS ONLY'),review={version:'unfarmd-native-mint-review/1',source:'helius_standard_rpc',host:'mainnet.helius-rpc.com',method:'getAccountInfo',encoding:'base64',commitment:'finalized',ownerSubject:record.ownerSubject,origin:identity.origin,commit:identity.commit,branch:BRANCH,mints:['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],reviewedAt:now,decision:'approved_protected_private_beta',termsUrl:'https://www.helius.dev/terms',termsSha256:digest,accountEvidenceSha256:digest,keySha256:digest,privateDisplay:true,rawRetention:'request_memory_only',derivedRetention:'60_seconds',ledgerRetention:'owner_mint_provider_utc_hash_counters_immutable',publicRedistribution:false,verifiedDebit:1,includedAllowance:3,overageProtectionReviewed:true};
 const policy={id:'LOCAL_SYNTHETIC_POLICY',ownerSubject:record.ownerSubject,origin:identity.origin,startsAt:now-500,expiresAt:now+60000,providers:['helius'],jupiterAccess:'keyless',maxLookups:3,maxAttempts:3,maxCredits:3,debit:{jupiter:1,helius:1},rights:{jupiter:digest,helius:sourceHash(JSON.stringify(review)),combination:digest}};
 const sign=value=>{const payload=JSON.stringify(value);return {payload,signature:crypto.sign(null,Buffer.from(payload),signer.privateKey).toString('base64url')};};
 const ownerRelease=sign(record);
 crypto.verify=function(...args){const result=originalVerify.apply(this,args);calls.push({result,key:args[2].export({type:'spki',format:'pem'}),payload:args[1].toString()});return result;};
 try{
  // Positive controls use ORIGINAL validators and the SAME envelopes/identity/SQL pins.
  // No production trust root, gate or verification result is substituted.
  const owner=new OwnerReleaseAuthority(signer.publicKey,identity,AUTH_SQL_SHA),release=owner.admit(ownerRelease);
  assert.ok(release,'locally signed exact original owner release must be admitted');
  assert.deepEqual(owner.inspect(release),record);
  const sourceGrant=sign({version:'unfarmd-ca-source-grant/1',policy,releaseHash:sourceHash(JSON.stringify(owner.inspect(release))),sqlSha256:SOURCE_SQL_SHA});
  const source=new SourcePolicyAuthority(signer.publicKey,owner,release,SOURCE_SQL_SHA),approval=source.admit(sourceGrant);
  assert.ok(approval,'same locally signed grant must pass original source policy validator');
  assert.deepEqual(source.inspect(approval).policy,policy);
  assert.equal(calls.length,2);assert.ok(calls.every(c=>c.result===true));
  assert.equal(gate.NATIVE_BRANCH,BRANCH);
  const env={...beforeEnv,VERCEL_ENV:'preview',VERCEL_PROJECT_ID:identity.project,VERCEL_GIT_COMMIT_REF:BRANCH,VERCEL_GIT_COMMIT_SHA:identity.commit,VERCEL_DEPLOYMENT_ID:identity.deployment,VERCEL_URL:new URL(identity.origin).host};
  for(const k of gate.PUBLIC_PACKETS)delete env[k];
  process.env=new Proxy(env,{get(t,k){if(String(k).startsWith('UNFARMD_ORACLE_')&&!gate.PUBLIC_PACKETS.includes(k)){credentialReads.push(k);throw Error('CREDENTIAL_ACCESS_FORBIDDEN');}return t[k];},getOwnPropertyDescriptor(t,k){if(String(k).startsWith('UNFARMD_ORACLE_')&&!gate.PUBLIC_PACKETS.includes(k)){credentialReads.push(k);throw Error('CREDENTIAL_ACCESS_FORBIDDEN');}return Object.getOwnPropertyDescriptor(t,k);}});
  Module._load=function(id,...args){if(/(?:mount\/|\.\/)(?:bootstrap|runtime)(?:\.js)?$|native-mint\/producer|^(?:pg|better-auth)(?:\/|$)/.test(id)){heavyAttempts.push(id);throw Error('HEAVY_BOOTSTRAP_FORBIDDEN');}return originalLoad.call(this,id,...args);};
  const packet={version:'oracle-native-approval/1',ownerRelease,sourceGrant,nativeReview:review},encoded=Buffer.from(JSON.stringify(packet)).toString('base64url');
  assert.ok(encoded.length<=12000&&Buffer.from(encoded,'base64url').length<=8192);
  const request=()=>new Request(identity.origin+'/api/v4/native-mint',{method:'POST',headers:{host:new URL(identity.origin).host,origin:identity.origin,'sec-fetch-site':'same-origin','content-type':'application/json','x-unfarmd-ca-intent':'inspect','x-unfarmd-native-approval':encoded},body:JSON.stringify({action:'inspect',mint:review.mints[0]})});
  const start=calls.length;
  assert.equal(gate.configuredMountPlan(false,request()),null);
  assert.equal(calls.length,start+1,'an earlier unrelated denial MUST NOT satisfy this regression');
  assert.equal(calls.at(-1).key,crypto.createPublicKey(OWNER_RELEASE_PUBLIC_KEY_PEM).export({type:'spki',format:'pem'}));
  assert.equal(calls.at(-1).payload,ownerRelease.payload);assert.equal(calls.at(-1).result,false);
  assert.equal((await POST(request())).status,503);
  assert.equal(calls.length,start+2);assert.equal(calls.at(-1).result,false);
  assert.deepEqual(credentialReads,[]);
  assert.deepEqual(heavyAttempts,[],'a failed heavy-module import must not look like pre-bootstrap rejection');
  assert.equal(Object.keys(require.cache).some(p=>/\/(?:mount\/(?:bootstrap|runtime)|native-mint\/producer)\.js$/.test(p)||p.includes('/node_modules/pg/')||p.includes('/node_modules/better-auth/')),false);
 }finally{crypto.verify=originalVerify;Module._load=originalLoad;process.env=beforeEnv;}
});
