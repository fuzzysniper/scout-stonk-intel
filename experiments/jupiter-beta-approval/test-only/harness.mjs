// TEST-ONLY actors and simulated Turnkey. Ephemeral keys; no owner/provider credential.
// Never imported by app/, lib/, or any production handler. Not a managed signer.
import {generateKeyPairSync,sign} from 'node:crypto';
import {canonical,parse,hash,freeze,trust,message,request,ownerProof,validatorProof,approval,activityFingerprint,approvalPolicyHash,need,fields,USDC,SOL,MODE} from '../protocol.mjs';
import {localLedger} from '../local-ledger.mjs';
import {independentValidator,researchConsumer} from '../validator.mjs';
import {policyIntent,matchesPolicy} from '../policy.mjs';
export const NOW=1793491200000;
const ec=()=>generateKeyPairSync('ec',{namedCurve:'prime256v1'});
export function syntheticMint(label){const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',b=Buffer.from(hash('SYNTHETIC MINT KEY '+label),'hex');let n=BigInt('0x'+b.toString('hex')),s='';while(n){s=alphabet[Number(n%58n)]+s;n/=58n;}for(const v of b){if(v!==0)break;s='1'+s;}return s;}
export function simulation(options={}){
 const owner=ec(),validator=ec(),beta=generateKeyPairSync('ed25519'),ledger=localLedger();let now=options.now??NOW,counter=0;
 const context=trust({mode:MODE,
  owner:{userId:'test_owner',credentialId:'test_owner_credential',role:'owner',root:false,publicKey:owner.publicKey},
  validator:{userId:'test_validator',credentialId:'test_validator_credential',role:'validator',root:false,publicKey:validator.publicKey},
  beta:{keyId:'test_beta',epoch:1,publicKey:beta.publicKey},
  identity:{repository:'test/scout',branch:'test/jupiter-approval',commit:'a'.repeat(40),tree:'b'.repeat(40),project:'prj_TEST_SCOUT',deployment:'dpl_TEST_SCOUT',origin:'https://scout-synthetic.invalid',environment:MODE},
  rights:{mode:MODE,decision:'TEST_ONLY',agreementHash:hash('TEST agreement'),interpretationHash:hash('TEST interpretation'),attributionHash:hash('TEST attribution'),receiptHash:hash('TEST receipt'),reviewedAt:now-1000},
  edge:{mode:MODE,founderOnly:'SIMULATED',evidenceHash:hash('TEST edge'),exceptionsHash:hash('TEST exceptions'),reviewedAt:now-1000},
  policy:{allowedMints:options.allowedMints??[USDC,SOL],maxUses:4,maxLifetimeMs:600000},
 });
 const makeRecord=(patch={})=>({version:'unfarmd-jupiter-beta-authorization/2',mode:MODE,activate:false,grantId:'test_grant_'+(++counter),nonce:hash('TEST nonce '+counter),keyId:context.beta.keyId,epoch:1,approvers:{ownerId:context.owner.userId,ownerCredential:context.owner.credentialId,validatorId:context.validator.userId,validatorCredential:context.validator.credentialId,policyHash:approvalPolicyHash(context)},identity:{...context.identity},rights:{...context.rights},edge:{...context.edge},scope:{provider:'jupiter-tokens-v2',audience:MODE,mints:[USDC],maxUses:1,perMintLimit:1,retries:0,native:false,holders:false,save:false,publicDisplay:false,sourceCalls:false},issuedAt:now,startsAt:now,expiresAt:now+120000,...patch});
 const rawFor=r=>canonical({type:'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2',timestampMs:String(now),organizationId:'org_TEST_ONLY',parameters:{signWith:r.keyId,payload:message(canonical(r)).toString('hex'),encoding:'PAYLOAD_ENCODING_HEXADECIMAL',hashFunction:'HASH_FUNCTION_NOT_APPLICABLE'}});
 const stampOwner=(text,opts={})=>{
  const a=Buffer.alloc(37);Buffer.from(hash(opts.rpId??'owner-approval.invalid'),'hex').copy(a);a[32]=opts.flags??5;a.writeUInt32BE(opts.counter??0,33);
  const c=Buffer.from(canonical({type:'webauthn.get',challenge:Buffer.from(hash(text),'utf8').toString('base64url'),origin:opts.origin??'https://owner-approval.invalid',crossOrigin:opts.crossOrigin??false}));
  return {kind:'TEST_WEBAUTHN',credentialId:context.owner.credentialId,authenticatorData:a.toString('base64url'),clientDataJSON:c.toString('base64url'),signature:sign('sha256',Buffer.concat([a,Buffer.from(hash(c),'hex')]),owner.privateKey).toString('base64url')};
 };
 const stampValidator=text=>({kind:'TEST_API_KEY',credentialId:context.validator.credentialId,signature:sign('sha256',Buffer.from(text),validator.privateKey).toString('base64url')});
 const activities=new Map(),calls={submit:0,read:0,complete:0,validatorApprovals:0,source:0};
 const provider=Object.freeze({mode:MODE,
  submit(raw,stamp){calls.submit++;need(ownerProof(stamp,raw,context));const fp=activityFingerprint(raw);need(!activities.has(fp));activities.set(fp,{request:raw,ownerStamp:parse(canonical(stamp)),completed:false});return fp;},
  async read(fp){calls.read++;const a=activities.get(fp);need(a&&!a.completed);return canonical({mode:MODE,status:'PENDING',fingerprint:fp,request:a.request,ownerStamp:a.ownerStamp});},
  async complete(fp,body,stamp){calls.complete++;const a=activities.get(fp);need(matchesPolicy(options.policyIntent??policyIntent(context),context));need(a&&!a.completed&&ownerProof(a.ownerStamp,a.request,context)&&validatorProof(stamp,body,context));approval(body,a.request,context,now);
   // Raw signer policy does NOT parse arbitrary Jupiter authorization semantics.
   // Only the independent validator/consumer can enforce record meaning.
   const q=parse(a.request),p=q.parameters;need(fields(q,['type','timestampMs','organizationId','parameters'])&&q.type==='ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2'&&q.organizationId==='org_TEST_ONLY'&&Number.isSafeInteger(Number(q.timestampMs))&&Number(q.timestampMs)<=now&&now-Number(q.timestampMs)<=30000&&fields(p,['signWith','payload','encoding','hashFunction'])&&p.signWith===context.beta.keyId&&p.encoding==='PAYLOAD_ENCODING_HEXADECIMAL'&&p.hashFunction==='HASH_FUNCTION_NOT_APPLICABLE'&&typeof p.payload==='string'&&p.payload.length<=16384&&/^(?:[a-f0-9]{2})+$/.test(p.payload));a.completed=true;
   return canonical({mode:MODE,status:'COMPLETED',request:a.request,ownerStamp:a.ownerStamp,approval:body,validatorStamp:parse(canonical(stamp)),signature:sign(null,Buffer.from(p.payload,'hex'),beta.privateKey).toString('base64url')});
  },
 });
 const credential=Object.freeze({mode:MODE,async approve(body){calls.validatorApprovals++;return stampValidator(body);}});
 const createValidator=(overrides={})=>independentValidator({context,provider,credential,ledger:ledger.issuer,clock:()=>now,timeoutMs:30,...overrides});
 const verifier=researchConsumer({context,ledger:ledger.consumer,clock:()=>now});
 const prepare=(r=makeRecord(),opts={})=>{const raw=rawFor(r),stamp=stampOwner(raw,opts),fingerprint=provider.submit(raw,stamp);return {request:raw,ownerStamp:stamp,fingerprint};};
 const approve=p=>createValidator().approve(p);
 const issue=async(r=makeRecord())=>approve(prepare(r));
 // Test-only signing helpers exist only here, never in consumer/validator interfaces.
 const signEnvelope=e=>{const d=request(e.request,context,now);return {...e,signature:sign(null,message(d.recordText),beta.privateKey).toString('base64url')};};
 const adversarialEnvelope=(r,patch={})=>{const raw=rawFor(r),body=canonical({type:'ACTIVITY_TYPE_APPROVE_ACTIVITY',timestampMs:String(now),organizationId:'org_TEST_ONLY',parameters:{fingerprint:activityFingerprint(raw)}});return canonical({version:'unfarmd-jupiter-beta-prototype-envelope/1',mode:MODE,request:raw,ownerStamp:stampOwner(raw),approval:body,validatorStamp:stampValidator(body),signature:sign(null,message(canonical(r)),beta.privateKey).toString('base64url'),...patch});};
 return Object.freeze({context,ledger,provider,credential,calls,makeRecord,rawFor,stampOwner,stampValidator,prepare,approve,issue,createValidator,verifier,signEnvelope,adversarialEnvelope,setNow:n=>{now=n;},clock:()=>now,
  describe:r=>freeze({mode:MODE,activate:false,sourceCalls:false,grantId:r.grantId,identity:r.identity,scope:r.scope,rights:r.rights,edge:r.edge,startsAt:r.startsAt,expiresAt:r.expiresAt,recordHash:hash(canonical(r))}),
 });
}
