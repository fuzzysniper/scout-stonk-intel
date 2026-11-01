// Ephemeral TEST cryptography / provider data only. No actual enrollment or API call.
import test from 'node:test';import assert from 'node:assert/strict';
import {webcrypto,createPublicKey,verify} from 'node:crypto';
import {fixture,NOW} from '../../experiments/jupiter-beta-approval/integration/test/fixtures.mjs';
import {validatorComponent} from '../../experiments/jupiter-beta-approval/integration/validator.mjs';
import {consumptionComponent} from '../../experiments/jupiter-beta-approval/integration/authority.mjs';
import {researchBoundary} from '../../experiments/jupiter-beta-approval/integration/consumer.mjs';
import {iphoneBootstrap} from '../../experiments/jupiter-beta-approval/integration/owner/iphone-bootstrap.mjs';
import {enrollmentRequest} from '../../experiments/jupiter-beta-approval/integration/owner/enrollment.mjs';
import {hash} from '../../experiments/jupiter-beta-approval/integration/json.mjs';
for(const result of [false,null,{}, {status:'stopped',stopped:true},{status:'ok',stopped:true},1])test('validator rejects non-true call admission '+JSON.stringify(result)+' before provider dispatch',async()=>{
 const h=fixture(),ledger={...h.ledger,beforeCall:async()=>result};const v=validatorComponent({publicTrust:h.t,sdk:await h.sdk(),transport:h.transport,ledger,clock:h.clock});
 assert.equal((await v.submit(await h.signed())).status,'held');assert.equal(h.calls.length,0);
});
test('reservation and STOP callers reject contradictory or missing acknowledgment fields',async()=>{
 const h=fixture(),v=validatorComponent({publicTrust:h.t,sdk:await h.sdk(),transport:h.transport,ledger:h.ledger,clock:h.clock});const e=(await v.submit(await h.signed())).envelope;
 for(const r of [{status:'ok',stopped:true,operation:'stop'},{status:'ok'},{status:'ok',stopped:false,operation:'check'},{status:'stopped',stopped:true,operation:'stop'}]){
  const c=consumptionComponent({publicTrust:h.t,clock:h.clock,ledger:{reserve:async()=>r},stopper:{}});assert.equal((await c.reserve({envelope:e,mint:h.r.scope.mints[0]})).status,'held');
 }
 const boundary=researchBoundary({publicTrust:h.t,nativeIdentity:()=>h.t.identity,clock:h.clock,consumerAuth:{stamp:()=>({})},authority:async()=>({status:'reservation_source_off',stopped:true})});assert.equal((await boundary.reserve(e,h.r.scope.mints[0])).status,'held');
 const body=JSON.stringify({version:'unfarmd-beta-stop/1',action:'PERMANENT_STOP',organizationId:h.t.organizationId,epoch:h.t.beta.epoch,timestampMs:String(NOW),nonce:hash('TEST STOP')});const signed={body,stamp:await h.ownerStamper.stamp(body)};
 for(const ack of [undefined,{status:'ok'},{status:'stopped',operation:'stop',stopped:false}]){
  const c=consumptionComponent({publicTrust:h.t,clock:h.clock,ledger:{},stopper:{stop:async()=>ack}});assert.equal((await c.stop(signed)).status,'held');
 }
});
function enrollment(){const h=fixture(),origin=h.t.ownerOrigin,challenge=Buffer.alloc(32,9).toString('base64url');const attestation={credentialId:Buffer.from('TEST credential').toString('base64url'),clientDataJson:Buffer.from(JSON.stringify({type:'webauthn.create',origin,challenge,crossOrigin:false})).toString('base64url'),attestationObject:Buffer.from('TEST attestation NOT genuine').toString('base64url'),transports:['AUTHENTICATOR_TRANSPORT_INTERNAL']};
 const q=enrollmentRequest({organizationId:h.t.organizationId,userId:h.t.owner.userId,challenge,attestation,timestampMs:String(NOW)});return {h,q,args:{origin,actualOrigin:origin,organizationId:h.t.organizationId,userId:h.t.owner.userId,reviewedBody:JSON.stringify(q),expiresAt:NOW+600000,clock:h.clock,crypto:webcrypto}};}
test('iPhone bootstrap prepares ONE actual SDK enrollment request using a nonextractable TEST browser key; no dispatch/storage/root-key import',async()=>{
 const {h,args}=enrollment();const b=await iphoneBootstrap(args);assert.deepEqual(Object.keys(b).sort(),['discard','expiresAt','prepare','publicKey','publicKeySha256','review']);
 h.setNow(NOW+120000);const reviewed=b.review(),request=await b.prepare(reviewed);assert.equal(request.body,reviewed);assert.equal(request.url,'https://api.turnkey.com/public/v1/submit/create_authenticators');
 const stamp=JSON.parse(Buffer.from(request.stamp.stampHeaderValue,'base64url'));assert.equal(stamp.publicKey,b.publicKey);assert.equal(stamp.scheme,'SIGNATURE_SCHEME_TK_API_P256');
 const point=Buffer.from(b.publicKey,'hex'),key=createPublicKey({key:{kty:'EC',crv:'P-256',x:point.subarray(1,33).toString('base64url'),y:point.subarray(33).toString('base64url')},format:'jwk'});assert.equal(verify('sha256',Buffer.from(reviewed),key,Buffer.from(stamp.signature,'hex')),true);
 assert.equal(b.publicKeySha256,hash(point));await assert.rejects(b.prepare(reviewed),/held/);assert.equal(h.calls.length,0);
});
for(const change of ['origin','target','scope','expiry','rollback','discard'])test('iPhone bootstrap fails closed for '+change,async()=>{
 const {h,q,args}=enrollment();if(change==='origin'){await assert.rejects(iphoneBootstrap({...args,actualOrigin:'https://wrong.invalid'}),/held/);return;}
 if(change==='target'){await assert.rejects(iphoneBootstrap({...args,userId:'00000000-0000-4000-8000-000000000009'}),/held/);return;}
 const b=await iphoneBootstrap(args);let body=b.review();
 if(change==='scope')body=JSON.stringify({...q,type:'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2'});
 if(change==='expiry')h.setNow(NOW+600000);
 if(change==='rollback')h.setNow(NOW-1);
 if(change==='discard')b.discard();
 await assert.rejects(b.prepare(body),/held/);
});
