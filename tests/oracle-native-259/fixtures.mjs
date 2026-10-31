// INVENTED account bytes/rights/account/order only; REAL local PG18 TLS/PLUS and uncached owner sessions.
import {fixture as ownerFixture,OWNER} from '../v4-owner-preview/fixture.mjs';
import {tlsFixture} from '../v4-ca-intelligence/fixtures.mjs';
import {base,extended,tlv,pubkey,fee,zero,rpc,MINT,OTHER,TOKEN,TOKEN2022} from '../v4-oracle-onchain/fixtures.mjs';
import {createRequire} from 'node:module';import {readFileSync} from 'node:fs';import {generateKeyPairSync,sign,createHash} from 'node:crypto';
export {base,extended,tlv,pubkey,fee,zero,rpc,MINT,OTHER,TOKEN,TOKEN2022,OWNER};
export const hash=b=>createHash('sha256').update(b).digest('hex');
const require=createRequire(import.meta.url),root=process.env.ORACLE_NATIVE_BUILD;
export const {prepareNativeMintSource,inspectNativeObservation,verifiedNativeMintObservation}=require(root+'/lib/v4-oracle/native-mint/producer.js');
export const {localNativeMintSource}=require(root+'/lib/v4-oracle/native-mint/testing.js');
export const {projectNativeMintRisk}=require(root+'/lib/v4-oracle/native-mint/project.js');
export const {qualify}=require(root+'/lib/v4-oracle/native-mint/qualification.js');
const {SourcePolicyAuthority}=require(root+'/lib/v4-owner-preview/source-policy.js');
const {createSourceLedger}=require(root+'/lib/v4-owner-preview/source-ledger.js');
export const finding=(rows,id)=>rows.find(f=>f.id==='onchain-'+id);
export async function fixture({reviewPatch={},policyPatch={},mode='normal',bytes=base({mintAuthority:null}),program=TOKEN,sourceClock}={}){
 const f=await ownerFixture();let tls;
 try{
  await f.issuer.enroll(f.email,f.passphrase);
  await f.db.owner.query(readFileSync('ops/v4-owner-auth/source-admission.sql','utf8'));
  for(const role of ['ca','ca_stopper'])await f.db.owner.query("ALTER ROLE unfarmd_v4_"+role+"_login LOGIN PASSWORD '"+f.rolePassword+"'");
  const now=Date.now(),review={version:'unfarmd-native-mint-review/1',source:'helius_standard_rpc',host:'mainnet.helius-rpc.com',method:'getAccountInfo',encoding:'base64',commitment:'finalized',
   ownerSubject:OWNER,origin:f.identity.origin,commit:f.identity.commit,branch:'feat/SYNTHETIC_LOCAL_259',reviewedAt:now,
   decision:'approved_protected_private_beta',termsUrl:'https://www.helius.dev/terms',termsSha256:'a'.repeat(64),accountEvidenceSha256:'b'.repeat(64),keySha256:hash('SYNTHETIC_LOCAL_259_NOT_A_PROVIDER_KEY'),
   privateDisplay:true,rawRetention:'request_memory_only',derivedRetention:'60_seconds',ledgerRetention:'owner_mint_provider_utc_hash_counters_immutable',publicRedistribution:false,
   verifiedDebit:1,includedAllowance:3,overageProtectionReviewed:true,...reviewPatch};
  const p={id:'SYNTHETIC_NATIVE_259_NO_PROVIDER_APPROVAL',ownerSubject:OWNER,origin:f.identity.origin,startsAt:now-1000,expiresAt:now+600000,providers:['helius'],jupiterAccess:'keyless',maxLookups:3,maxAttempts:3,maxCredits:3,debit:{jupiter:1,helius:1},rights:{jupiter:'d'.repeat(64),helius:hash(JSON.stringify(review)),combination:'e'.repeat(64)},...policyPatch};
  const pair=generateKeyPairSync('ed25519'),sqlSha=hash(readFileSync('ops/v4-owner-auth/source-admission.sql')),authority=new SourcePolicyAuthority(pair.publicKey,f.trust,f.release,sqlSha),releaseHash=hash(JSON.stringify(f.record));
  const payload=JSON.stringify({version:'unfarmd-ca-source-grant/1',policy:p,releaseHash,sqlSha256:sqlSha}),approval=authority.admit({payload,signature:sign(null,Buffer.from(payload),pair.privateKey).toString('base64url')});
  if(!approval)throw Error('SYNTHETIC source approval did not match original authority');const approved=authority.inspect(approval);
  await f.db.owner.query('INSERT INTO unfarmd_v4_ca_budget.policy VALUES(true,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[approved.recordText,approved.hash,OWNER,p.origin,releaseHash,'local_fixture',p.startsAt,p.expiresAt,p.maxLookups,p.maxAttempts,p.maxCredits,p.debit.jupiter,p.debit.helius]);
  await f.db.owner.query('INSERT INTO unfarmd_v4_ca_budget.state(singleton) VALUES(true)');
  const state={mode,keyReads:0,key:'SYNTHETIC_LOCAL_259_NOT_A_PROVIDER_KEY',body:null,bodyBytes:null,beforeReply:null,afterReply:null},pool=f.pool('ca');
  const config={ownerAuthority:f.trust,release:f.release,authority,approval,issuerPool:f.pool('issuer'),authSecret:f.secret,pool,tlsHost:'localhost',review,readKey(){state.keyReads++;return state.key;}};
  tls=await tlsFixture();
  tls.handler=async(req,res,text)=>{
   if(state.beforeReply)await state.beforeReply(req,res,text);
   if(state.mode==='hang')return;
   if(state.mode==='429'||state.mode==='503'||state.mode==='redirect'){res.writeHead(state.mode==='redirect'?302:Number(state.mode),{'location':'https://evil.invalid/'});res.end('{}');return;}
   const request=JSON.parse(text),body=rpc(bytes,program);body.id=request.id;
   if(state.body)state.body(body,request);
   if(state.mode==='wrong-id')body.id='provider-supplied-id';
   if(state.mode==='processed')body.result.context.commitment='processed';
   if(state.mode==='wrong-owner')body.result.value.owner=OTHER;
   if(state.mode==='null')body.result.value=null;
   let raw=state.mode==='oversize'?'x'.repeat(65537):' \r\n'+JSON.stringify(body,null,2)+'\n';
   if(state.mode==='duplicate')raw=raw.replace('"jsonrpc": "2.0"','"jsonrpc":"2.0","jsonrpc":"2.0"');
   res.setHeader('content-type','application/json');
   if(state.mode==='stale-date')res.setHeader('date','Wed, 01 Jan 2020 00:00:00 GMT');
   if(state.mode==='missing-date')res.sendDate=false;
   if(state.mode==='encoding')res.setHeader('content-encoding','gzip');
   if(state.mode==='age')res.setHeader('age','61');
   if(state.mode==='bad-utf8'){state.bodyBytes=Buffer.from([0xff,0xfe]);res.end(state.bodyBytes);return;}
   state.bodyBytes=Buffer.from(raw,'utf8');res.end(state.bodyBytes);if(state.afterReply)await state.afterReply();
  };
  const source=localNativeMintSource(config,tls.wire,sourceClock);
  const {cookie}=await f.login();
  const request=(mint=MINT,{cookie:cookieValue=cookie,headers={},url=f.identity.origin+'/api/v4/ca-intelligence',body={action:'inspect',mint},method='POST',signal}={})=>new Request(url,{method,headers:{host:'localhost',origin:f.identity.origin,'sec-fetch-site':'same-origin','x-unfarmd-ca-intent':'inspect','content-type':'application/json',...(cookieValue?{cookie:cookieValue}:{}),...headers},...(method==='POST'?{body:JSON.stringify(body)}:{}),...(signal?{signal}:{})});
  const stop=()=>createSourceLedger({authority,approval,pool:f.pool('ca_stopper'),tlsHost:'localhost',role:'unfarmd_v4_ca_stopper_login'}).ledger.transact({kind:'stop',policyHash:approved.hash,reason:'owner_stop',now:Date.now()});
  const stateRow=async()=> (await f.db.owner.query('SELECT stopped,attempts,credits,lookups,lease FROM unfarmd_v4_ca_budget.state')).rows[0];
  return {...f,ownerRequest:f.request,p,review,config,approved,pair,authority,approval,state,tls,source,cookie,request,stop,stateRow,async close(){await tls.close();await f.close();}};
 }catch(e){await tls?.close();await f.close();throw e;}
}
