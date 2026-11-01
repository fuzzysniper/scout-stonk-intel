// Integration boundary for C, server-only. Native runtime metadata is REQUIRED.
import {randomUUID} from 'node:crypto';
import {verifyV3} from './verifier.mjs';
import {denied,need} from './json.mjs';
export function researchBoundary({publicTrust,nativeIdentity,clock,authority,consumerAuth}){
 return Object.freeze({async reserve(envelope,mint){try{
  // C must provide the existing trusted platform getter, never request identity.
  const v=verifyV3(envelope,publicTrust,clock(),nativeIdentity());need(v.status==='verified_source_off_contract'&&v.record.scope.mints.includes(mint));
  const request={path:'/reserve',operationId:randomUUID(),timestamp:clock(),envelope,mint};const result=await authority('/reserve',{request,stamp:consumerAuth.stamp(request)});
  need(result.status==='reservation_source_off');need(verifyV3(envelope,publicTrust,clock(),nativeIdentity()).status==='verified_source_off_contract');return {...result,activate:false,sourceCalls:false};
 }catch{return denied();}}});
}
