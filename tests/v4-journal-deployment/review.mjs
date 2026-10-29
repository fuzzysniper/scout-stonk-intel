import {assertFinal} from '../v4-final/review.mjs';
// Original #236 metadata retained; actual final tree has a finite umbrella review.
export const BASE='76dea8aab3f26eef39c2fcbc1b0b37d13180388f';
export const ADDITIONS=['ops/v4-journal/sources/owner-ledger.sql','ops/v4-journal/sources.json','ops/v4-journal/hardening.sql','ops/v4-journal/catalog.sql','ops/v4-journal/snapshot.sql','ops/v4-journal/package.mjs','ops/v4-journal/native-tls.mjs','ops/v4-journal/envelope.mjs','ops/v4-journal/recovery.mjs',
 'tests/v4-journal-deployment/fixture.mjs','tests/v4-journal-deployment/run.sh','tests/v4-journal-deployment/native.test.mjs','tests/v4-journal-deployment/operations.test.mjs','tests/v4-journal-deployment/protocol.test.mjs','tests/v4-journal-deployment/review.mjs','tests/v4-journal-deployment/scope.test.mjs','tests/v4-journal-deployment/parent-regression.sh',
 'docs/v4/journal-deployment-233.md','.github/workflows/journal-deployment-off.yml'];
export function review(root=process.cwd()){assertFinal(root);return {base:BASE,additions:ADDITIONS.length};}
