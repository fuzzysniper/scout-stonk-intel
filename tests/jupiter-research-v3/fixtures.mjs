// LOCAL/SYNTHETIC ONLY: ephemeral Node TEST keys, no SDK/account/HTTP/signer.
import {generateKeyPairSync,sign,randomUUID} from 'node:crypto';
import {context,VERSION,policyBinding,rawBody,message} from '../../experiments/jupiter-beta-approval/integration/contract.mjs';
import {canonical,hash} from '../../experiments/jupiter-beta-approval/integration/json.mjs';
export const BRANCH='feat/280-lens-v3-public',HOST='scout-stonk-intel-synthetic-v3-riskledgerapp.vercel.app';
export const MINTS=['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v','So11111111111111111111111111111111111111112','11111111111111111111111111111111','TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'].sort();
export const identity=()=>({repository:'fuzzysniper/scout-stonk-intel',branch:BRANCH,commit:'a'.repeat(40),tree:'b'.repeat(40),project:'prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q',deployment:'dpl_SYNTHETICV3ONLY',origin:'https://'+HOST,environment:'preview'});
export const env=()=>({VERCEL_ENV:'preview',VERCEL_PROJECT_ID:identity().project,VERCEL_GIT_COMMIT_REF:BRANCH,VERCEL_GIT_COMMIT_SHA:identity().commit,VERCEL_DEPLOYMENT_ID:identity().deployment,VERCEL_URL:HOST,VERCEL_GIT_PROVIDER:'github',VERCEL_GIT_REPO_OWNER:'fuzzysniper',VERCEL_GIT_REPO_SLUG:'scout-stonk-intel',UNFARMD_OWNER_RELEASE:''});
const ec=()=>generateKeyPairSync('ec',{namedCurve:'prime256v1'}),pub=k=>{const j=k.export({format:'jwk'});return '04'+Buffer.from(j.x,'base64url').toString('hex')+Buffer.from(j.y,'base64url').toString('hex');};
export function fixture({count=2,now=Date.now(),mutate=()=>{}}={}){
 const owner=ec(),validator=ec(),beta=generateKeyPairSync('ed25519');
 const t=context({organizationId:randomUUID(),owner:{userId:randomUUID(),authenticatorId:randomUUID(),credentialId:Buffer.from('LOCAL SYNTHETIC credential').toString('base64url'),publicKey:pub(owner.publicKey),root:false},validator:{userId:randomUUID(),apiKeyId:randomUUID(),publicKey:pub(validator.publicKey),root:false},beta:{keyId:randomUUID(),epoch:1,publicKey:beta.publicKey.export({type:'spki',format:'der'}).toString('base64url')},policyId:randomUUID(),ownerOrigin:'https://owner.fixture.invalid',identity:identity(),rights:{evidenceHash:hash('LOCAL SYNTHETIC rights'),reviewedAt:now-1000,expiresAt:now+600000},edge:{evidenceHash:hash('LOCAL SYNTHETIC edge'),reviewedAt:now-1000,expiresAt:now+600000},allowedMints:MINTS});
 const r={version:VERSION,grantId:randomUUID(),nonce:hash('LOCAL SYNTHETIC nonce '+randomUUID()),organizationId:t.organizationId,keyId:t.beta.keyId,epoch:1,policyHash:policyBinding(t),identity:t.identity,rights:t.rights,edge:t.edge,scope:{provider:'jupiter-tokens-v2',mints:MINTS.slice(0,count),maxUses:count,perMintLimit:1,retries:0,native:false,holders:false,save:false,publicDisplay:false},issuedAt:now,startsAt:now,expiresAt:now+60000};
 // Valid positive payload is produced first; negative cases change it and re-sign,
 // so a test does not pass due only to an unrelated malformed signature.
 const raw=JSON.stringify(rawBody(canonical(r),t,now)),q=JSON.parse(raw),id=randomUUID(),fp=hash('LOCAL SYNTHETIC activity '+id);
 mutate(r);const rawRecord=canonical(r);q.parameters.payload=message(rawRecord).toString('hex');const body=JSON.stringify(q);
 const auth=Buffer.alloc(37);Buffer.from(hash('owner.fixture.invalid'),'hex').copy(auth);auth[32]=5;
 const client=Buffer.from(JSON.stringify({type:'webauthn.get',challenge:Buffer.from(hash(body)).toString('base64url'),origin:t.ownerOrigin,crossOrigin:false}));
 const ownerStamp={stampHeaderName:'X-Stamp-Webauthn',stampHeaderValue:JSON.stringify({authenticatorData:auth.toString('base64url'),clientDataJson:client.toString('base64url'),credentialId:t.owner.credentialId,signature:sign('sha256',Buffer.concat([auth,Buffer.from(hash(client),'hex')]),owner.privateKey).toString('base64url')})};
 const approval=JSON.stringify({type:'ACTIVITY_TYPE_APPROVE_ACTIVITY',timestampMs:String(now),organizationId:t.organizationId,parameters:{fingerprint:fp}});
 const validatorStamp={stampHeaderName:'X-Stamp',stampHeaderValue:Buffer.from(JSON.stringify({publicKey:t.validator.publicKey,scheme:'SIGNATURE_SCHEME_TK_API_P256',signature:sign('sha256',Buffer.from(approval),validator.privateKey).toString('hex')})).toString('base64url')};
 const sig=sign(null,message(rawRecord),beta.privateKey).toString('hex');
 const e={version:'unfarmd-turnkey-beta-envelope/1',raw:body,ownerStamp,approval,validatorStamp,receipt:{activity:{id,organizationId:t.organizationId,status:'ACTIVITY_STATUS_COMPLETED',type:'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2',intent:{signRawPayloadIntentV2:q.parameters},result:{signRawPayloadResult:{r:sig.slice(0,64),s:sig.slice(64),v:''}},votes:[t.owner.userId,t.validator.userId].map(userId=>({id:randomUUID(),userId,activityId:id,selection:'VOTE_SELECTION_APPROVED'})),fingerprint:fp},sourceClocks:{createdAt:null,updatedAt:null,receivedAt:now},rawResponseSha256:hash('LOCAL SYNTHETIC receipt')}};
 const text=JSON.stringify(e);return {t,r,e,text,encoded:Buffer.from(text).toString('base64url'),now};
}
export const request=(f,headers={},body=JSON.stringify({action:'inspect',mint:f.r.scope.mints[0],authorization:f.e}))=>new Request('https://'+HOST+'/api/v4/ca-intelligence',{method:'POST',headers:{host:HOST,origin:'https://'+HOST,'sec-fetch-site':'same-origin','x-unfarmd-ca-intent':'inspect','content-type':'application/json','x-unfarmd-jupiter-research':'3',...headers},body});
export async function scopedEnv(patch,run){const before=process.env;process.env={...before,...env(),...patch};try{return await run();}finally{process.env=before;}}
