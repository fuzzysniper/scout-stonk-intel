// Ephemeral TEST keys and SDK-shaped synthetic responses ONLY. No live evidence.
import {generateKeyPairSync,sign,randomUUID} from 'node:crypto';
import {context,VERSION,policyBinding,rawBody,message} from '../contract.mjs';
import {canonical,hash} from '../json.mjs';
import {ownerSdk,apiKeySdk,policyParameters} from '../sdk/requests.mjs';
import {ApiKeyStamper} from '@turnkey/api-key-stamper';
import {boundedTransport} from '../sdk/transport.mjs';
export const NOW=1793563200000,USDC='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',SOL='So11111111111111111111111111111111111111112';
const ec=()=>generateKeyPairSync('ec',{namedCurve:'prime256v1'}),pub=k=>{const j=k.export({format:'jwk'});return '04'+Buffer.from(j.x,'base64url').toString('hex')+Buffer.from(j.y,'base64url').toString('hex');};
export function fixture(options={}){
 const owner=ec(),validator=ec(),beta=generateKeyPairSync('ed25519');let now=NOW;
 const t=context({organizationId:randomUUID(),owner:{userId:randomUUID(),authenticatorId:randomUUID(),credentialId:Buffer.from('TEST credential').toString('base64url'),publicKey:pub(owner.publicKey),root:false},validator:{userId:randomUUID(),apiKeyId:randomUUID(),publicKey:pub(validator.publicKey),root:false},beta:{keyId:randomUUID(),epoch:1,publicKey:beta.publicKey.export({type:'spki',format:'der'}).toString('base64url')},policyId:randomUUID(),ownerOrigin:'https://owner.fixture.invalid',identity:{repository:'fuzzysniper/scout-stonk-intel',branch:'beta/test-fixture',commit:'a'.repeat(40),tree:'b'.repeat(40),project:'prj_TEST',deployment:'dpl_TEST',origin:'https://ca.fixture.invalid',environment:'preview'},rights:{evidenceHash:hash('TEST rights'),reviewedAt:NOW-1000,expiresAt:NOW+600000},edge:{evidenceHash:hash('TEST edge'),reviewedAt:NOW-1000,expiresAt:NOW+600000},allowedMints:options.allowedMints??[USDC,SOL]});
 const r={version:VERSION,grantId:randomUUID(),nonce:hash('TEST nonce '+randomUUID()),organizationId:t.organizationId,keyId:t.beta.keyId,epoch:1,policyHash:policyBinding(t),identity:t.identity,rights:t.rights,edge:t.edge,scope:{provider:'jupiter-tokens-v2',mints:[USDC,SOL].sort(),maxUses:2,perMintLimit:1,retries:0,native:false,holders:false,save:false,publicDisplay:false},issuedAt:NOW,startsAt:NOW,expiresAt:NOW+120000};
 const ownerStamper={async stamp(body){const auth=Buffer.alloc(37);Buffer.from(hash('owner.fixture.invalid'),'hex').copy(auth);auth[32]=5;const client=Buffer.from(JSON.stringify({type:'webauthn.get',challenge:Buffer.from(hash(body)).toString('base64url'),origin:t.ownerOrigin,crossOrigin:false}));return {stampHeaderName:'X-Stamp-Webauthn',stampHeaderValue:JSON.stringify({authenticatorData:auth.toString('base64url'),clientDataJson:client.toString('base64url'),credentialId:t.owner.credentialId,signature:sign('sha256',Buffer.concat([auth,Buffer.from(hash(client),'hex')]),owner.privateKey).toString('base64url')})};}};
 const sdk=()=>apiKeySdk(t,{publicKey:t.validator.publicKey,privateKey:Buffer.from(validator.privateKey.export({format:'jwk'}).d,'base64url').toString('hex')});
 const signed=()=>ownerSdk(t,ownerStamper).stamp(rawBody(canonical(r),t,now),now);
 const policy={...policyParameters(t),policyId:t.policyId,createdAt:{seconds:'0',nanos:'0'},updatedAt:{seconds:'0',nanos:'0'}};
 const org={organizationData:{organizationId:t.organizationId,rootQuorum:{threshold:1,userIds:[randomUUID()]},users:[{userId:t.owner.userId,authenticators:[{authenticatorId:t.owner.authenticatorId,credentialId:t.owner.credentialId,credential:{type:'CREDENTIAL_TYPE_WEBAUTHN_AUTHENTICATOR',publicKey:t.owner.publicKey}}],apiKeys:[],oauthProviders:[],mfaPolicies:[]},{userId:t.validator.userId,authenticators:[],apiKeys:[{apiKeyId:t.validator.apiKeyId,credential:{type:'CREDENTIAL_TYPE_API_KEY_P256',publicKey:t.validator.publicKey}}],oauthProviders:[],mfaPolicies:[]}],policies:[policy],privateKeys:[{privateKeyId:t.beta.keyId,publicKey:Buffer.from(t.beta.publicKey,'base64url').subarray(-32).toString('hex'),curve:'CURVE_ED25519',imported:false,exported:false}]}};
 const id=randomUUID(),fp=options.fingerprint??hash('TEST provider-issued fingerprint '+id),calls=[];let completed=false;
 const vote=userId=>({id:randomUUID(),userId,activityId:id,selection:'VOTE_SELECTION_APPROVED',message:'TEST provider metadata',publicKey:'TEST',signature:'TEST',scheme:'TEST_ONLY',user:{},createdAt:{seconds:String(NOW/1000),nanos:'0'}});
 const activity=status=>{const signature=sign(null,message(canonical(r)),beta.privateKey).toString('hex');return {id,organizationId:t.organizationId,type:'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2',status,intent:{signRawPayloadIntentV2:rawBody(canonical(r),t,NOW).parameters},result:status==='ACTIVITY_STATUS_COMPLETED'?{signRawPayloadResult:{r:signature.slice(0,64),s:signature.slice(64),v:''}}:{},votes:status==='ACTIVITY_STATUS_COMPLETED'?[vote(t.owner.userId),vote(t.validator.userId)]:[vote(t.owner.userId)],fingerprint:fp,createdAt:{seconds:String(NOW/1000),nanos:'0'},updatedAt:{seconds:String(NOW/1000),nanos:'0'},canApprove:true,canReject:true};};
 const dispatch=async(url,init)=>{calls.push({url,init});let result;
  if(url.endsWith('get_organization'))result=org;
  else if(url.endsWith('sign_raw_payload'))result={activity:activity('ACTIVITY_STATUS_CONSENSUS_NEEDED')};
  else if(url.endsWith('approve_activity')){completed=true;result={activity:{id:randomUUID(),organizationId:t.organizationId,type:'ACTIVITY_TYPE_APPROVE_ACTIVITY',status:'ACTIVITY_STATUS_COMPLETED',intent:{approveActivityIntent:{fingerprint:fp}}}};}
  else if(url.endsWith('get_activity'))result={activity:activity(completed?'ACTIVITY_STATUS_COMPLETED':'ACTIVITY_STATUS_CONSENSUS_NEEDED')};
  else throw Error('TEST unexpected request');return Response.json(result);
 };
 // Workflow port fixture, NOT a persistence implementation or PostgreSQL simulation.
 let prepared=false,published=false,uncertain=false,stopped=false,before=0;
 const ledger={async prepare(){if(prepared||stopped)return {status:'held'};prepared=true;return {status:'prepared',fence:'1'};},async beforeCall(){return !stopped&&++before<=5;},async publish(){if(stopped)return {status:'held'};published=true;return {status:'published'};},async uncertain(){uncertain=true;}};
 return {t,r,ownerStamper,validatorStamper:new ApiKeyStamper({apiPublicKey:t.validator.publicKey,apiPrivateKey:Buffer.from(validator.privateKey.export({format:'jwk'}).d,'base64url').toString('hex')}),sdk,signed,org,dispatch,calls,ledger,transport:boundedTransport(dispatch),activity,clock:()=>now,setNow:n=>now=n,flags:()=>({prepared,published,uncertain,before}),stop:()=>{stopped=true;}};
}
