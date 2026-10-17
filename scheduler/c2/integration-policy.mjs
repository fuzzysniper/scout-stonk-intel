// Separate, unselected manifest. Never relax the original staging policy.
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {proposal} from './policy.mjs';
import {PUBLIC} from './app-proof.mjs';

export const unarmedIntegration={...structuredClone(proposal),
 $schema:'../node_modules/wrangler/config-schema.json',main:'hosted-entry.mjs',
 vars:{...proposal.vars,C2_APP_ACTOR_ID:String(PUBLIC.actor)}};
export function assertUnarmedIntegration(value){
 // Never interpolate rejected configuration: it might contain a secret.
 assert.ok(isDeepStrictEqual(value,unarmedIntegration),'Unarmed C2 integration changed; stop for owner review');
}
