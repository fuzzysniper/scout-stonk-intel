// SYNTHETIC private plan/password. No owner, credential, provider or SQL access.
import test from 'node:test';import assert from 'node:assert/strict';
import {synthetic,canonical,hash,require} from './fixture.mjs';
const {privateEnrollment}=require(process.env.ADMISSION_BUILD+'/ops/native-beta-release/enrollment-packet.js');
function fixture(){const f=synthetic(),configuration={authSecretSha256:hash(f.values.secret),caSha256:hash(f.values.ca),expiresAt:f.now+60000,ownerEmail:'synthetic-owner@example.invalid',policy:f.p};
 return {now:f.now,packet:{configuration,password:'SYNTHETIC_PASSWORD_000_NEVER_USE'},selection:{version:'native-owner-enrollment/1',mode:'installed',sourceGo:false,configuration:{planSha256:hash(canonical(configuration))}}};}
test('private enrollment binds exact owner and single-mint policy without publishing them or reading credentials',()=>{
 const f=fixture(),old=process.env;process.env=new Proxy(old,{get(t,k){if(String(k).startsWith('UNFARMD_NATIVE_'))throw Error('FORBIDDEN_CREDENTIAL_ACCESS');return Reflect.get(t,k);}});
 try{assert.deepEqual(privateEnrollment(f.selection,JSON.stringify(f.packet),f.now),f.packet);const publicText=JSON.stringify(f.selection);for(const value of [f.packet.configuration.ownerEmail,f.packet.configuration.policy.ownerSubject,f.packet.configuration.policy.mint,f.packet.password])assert.ok(!publicText.includes(value));}finally{process.env=old;}
});
test('changed scope, owner, fingerprints, window, unbounded/ambiguous packet and source GO fail before enrollment',()=>{
 const good=fixture();
 for(const change of [f=>f.selection.mode='off',f=>f.selection.sourceGo=true,f=>f.selection.configuration.extra='unreviewed',f=>f.selection.configuration.planSha256='0'.repeat(64),f=>f.packet.configuration.ownerEmail='other@example.invalid',f=>f.packet.configuration.policy.mint='1'.repeat(32),f=>f.packet.configuration.caSha256='a'.repeat(64),f=>f.packet.configuration.expiresAt++,f=>f.packet.password='short',f=>f.packet.extra=true]){const f=structuredClone(good);change(f);assert.throws(()=>privateEnrollment(f.selection,JSON.stringify(f.packet),f.now));}
 for(const change of [c=>c.expiresAt=good.now,c=>c.expiresAt=good.now+900001,c=>c.ownerEmail='Upper@example.invalid',c=>c.policy.mints=[c.policy.mint],c=>c.policy.expiresAt=c.policy.startsAt+900001,c=>c.authSecretSha256='0'.repeat(64)]){const f=structuredClone(good);change(f.packet.configuration);f.selection.configuration.planSha256=hash(canonical(f.packet.configuration));assert.throws(()=>privateEnrollment(f.selection,JSON.stringify(f.packet),f.now));}
 assert.throws(()=>privateEnrollment(good.selection,' '.repeat(8193),good.now));
 assert.throws(()=>privateEnrollment(good.selection,JSON.stringify(good.packet).replace('"password":','"password":"DUPLICATE","password":'),good.now));
});
