import {assertComposition} from '../v4-private-integration/review.mjs';
// Finite dependent review, never a directory allowance or source/base rebaseline.
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
export const PARENT='b56475c681311d35f95ee9879d9969b868a1724e';
export const PILOT_MODIFIED=['lib/v4-solana-facts/projection.ts','tests/v4-integration/assertions.mjs','tests/v4-integration/exceptions.json','tests/v4-integration/scope.test.mjs'];
export const PILOT_ADDED=[
 'lib/v4-helius-pilot/server/contract.ts','lib/v4-helius-pilot/server/policy.ts','lib/v4-helius-pilot/server/result.ts','lib/v4-helius-pilot/server/index.ts',
 'lib/v4-helius-pilot/server/transport.ts','lib/v4-helius-pilot/server/profile.ts','lib/v4-helius-pilot/server/engine.ts','lib/v4-helius-pilot/server/testing.ts',
 'tests/v4-helius-pilot/fixtures.mjs','tests/v4-helius-pilot/run.sh','tests/v4-helius-pilot/capture.test.mjs','tests/v4-helius-pilot/pilot.test.mjs',
 'tests/v4-helius-pilot/security.test.mjs','tests/v4-helius-pilot/scope.test.mjs','tests/v4-helius-pilot/review.mjs','tests/v4-helius-pilot/review-patches.json',
 'tests/v4-helius-pilot/__init__.py','tests/v4-helius-pilot/engine_test.py','docs/v4/helius-pilot-221.md','.github/workflows/v4-helius-pilot-offline.yml',
];
const sha=v=>createHash('sha256').update(v).digest('hex');
const REVIEW_DIGEST='8bf0aebe5bc5ae42cd3052162496b7112ae0e1201afd115a6ee6bf12b05b864f';
export function assertPilotReview(root=process.cwd()){
 assertComposition(root);
 const bytes=fs.readFileSync(path.join(root,'tests/v4-helius-pilot/review-patches.json'));
 assert.equal(sha(bytes),REVIEW_DIGEST,'original independent finite review pin');
 return JSON.parse(bytes);
}
