import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {stagingConfig,assertInactiveConfig} from '../staging-policy.mjs';
export const proposal={...structuredClone(stagingConfig),main:'c2/hosted-entry.mjs',
 vars:{...stagingConfig.vars,C2_ARMED:'false',C2_GATE_DISABLED_ATTESTED:'false',C2_APP_ACTOR_ID:'UNAPPROVED',C2_INSTANCE_ID:'UNAPPROVED',C2_NOT_BEFORE:'UNAPPROVED',C2_EXPIRES_AT:'UNAPPROVED'},
 durable_objects:{bindings:[...stagingConfig.durable_objects.bindings,{name:'C2_ONCE',class_name:'StageC2ProofOnce'}]},
 exports:{...stagingConfig.exports,StageC2ProofOnce:{type:'durable-object',storage:'sqlite'},StageC2AuthProof:{type:'workflow',name:'scout-stage-c2-auth-only'}}};
export function assertProposal(value){assert.ok(isDeepStrictEqual(value,proposal),'C2 proposal changed; stop for security review');}
export function assertUnchangedStaging(value){assertInactiveConfig(value);}
